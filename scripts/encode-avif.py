#!/usr/bin/env python3
"""Offline AVIF encoder. Install the pinned optional media-authoring requirements."""
import argparse
import hashlib
import io
import json
from pathlib import Path

from PIL import Image, ImageCms, ImageOps, features


def encode(source, *, width=None, max_bytes=None, quality_start=60, quality_minimum=45):
    if not features.check("avif"):
        raise ValueError("Pillow must include AVIF support; install requirements-media.txt")
    if not 1 <= quality_minimum <= quality_start <= 100:
        raise ValueError("invalid quality range")
    with Image.open(source) as opened:
        if getattr(opened, "n_frames", 1) != 1:
            raise ValueError("animated media requires a separate reviewed workflow")
        image = ImageOps.exif_transpose(opened)
        mode = "RGBA" if image.has_transparency_data else "RGB"
        if image.info.get("icc_profile"):
            image = ImageCms.profileToProfile(
                image, ImageCms.ImageCmsProfile(io.BytesIO(image.info["icc_profile"])),
                ImageCms.createProfile("sRGB"), outputMode=mode,
            )
        else:
            image = image.convert(mode)
        if width is not None:
            if width < 1:
                raise ValueError("width must be positive")
            if width < image.width:
                image = image.resize((width, max(1, round(image.height * width / image.width))), Image.Resampling.LANCZOS)
        # Construct fresh pixels so EXIF/XMP/ICC and other source info cannot survive.
        image = Image.frombytes(mode, image.size, image.tobytes())
        qualities = list(range(quality_start, quality_minimum - 1, -5))
        if qualities[-1] != quality_minimum:
            qualities.append(quality_minimum)
        for quality in qualities:
            output = io.BytesIO()
            image.save(output, format="AVIF", quality=quality, speed=6, max_threads=2)
            payload = output.getvalue()
            if max_bytes is not None and len(payload) > max_bytes:
                continue
            with Image.open(io.BytesIO(payload)) as check:
                check.load()
                if check.format != "AVIF" or check.size != image.size:
                    raise ValueError("AVIF verification failed")
                if any(check.info.get(key) for key in ("exif", "xmp", "icc_profile")):
                    raise ValueError("embedded source metadata remains")
            return payload, {"width": image.width, "height": image.height, "bytes": len(payload),
                             "sha256": hashlib.sha256(payload).hexdigest(), "format": "image/avif", "quality": quality}
    raise ValueError(f"cannot meet {max_bytes} bytes at quality {quality_minimum} or above")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output")
    parser.add_argument("--inspect", action="store_true")
    parser.add_argument("--width", type=int)
    parser.add_argument("--max-bytes", type=int)
    parser.add_argument("--quality-start", type=int, default=60)
    parser.add_argument("--quality-minimum", type=int, default=45)
    args = parser.parse_args()
    if args.inspect:
        with Image.open(args.input) as image:
            print(json.dumps({"width": image.width, "height": image.height}))
        return
    if not args.output:
        parser.error("--output is required unless --inspect is used")
    if Path(args.output).exists():
        parser.error("refusing to overwrite existing output")
    payload, metadata = encode(args.input, width=args.width, max_bytes=args.max_bytes,
                               quality_start=args.quality_start, quality_minimum=args.quality_minimum)
    with open(args.output, "xb") as output:
        output.write(payload)
    print(json.dumps(metadata))


if __name__ == "__main__":
    main()
