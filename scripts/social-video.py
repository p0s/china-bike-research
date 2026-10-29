#!/usr/bin/env python3
"""Offline authoring for the link-preview clips (og:video). Run through `npm run social-video:author`.

Each clip shows a page's existing preview still -- the exact reviewed product photo or
the project's article cover -- unaltered and uncropped beside the site's riding red-panda
mascot and the domain ChineseBikes.xyz. Only the mascot moves. Pages without a preview
still share one branded clip without any product photo.

The riding loop and the domain text come from one pre-rendered, hash-checked sprite sheet
(content/social-video/), so authoring needs no font file or rig. Requirements: Pillow with
AVIF support (requirements-media.txt) and FFmpeg/ffprobe with libx264 on PATH, or set
FFMPEG and FFPROBE. Encodes are serial and CPU-only; builds and visitors never encode.

The plan arrives on stdin as JSON ({"clips": [{"key", "kind", "source"}]}, written by
scripts/social-video.mjs). `encode` writes assets/social-video/<kind>-<sha256[:16]>.mp4;
`sample` writes review copies to another directory. Each prints one JSON result per clip.
"""
import argparse
import hashlib
import io
import json
import os
import struct
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageCms, ImageOps, features

ROOT = Path(__file__).resolve().parent.parent
KIT = ROOT / "content/social-video/riding-mascot-kit.json"
OUTPUT = ROOT / "assets/social-video"
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")
FFPROBE = os.environ.get("FFPROBE", "ffprobe")

DESIGN = {
    "version": 1,
    "width": 960, "height": 540, "fps": 24, "frames": 96,          # 4 s: the 2 s riding loop twice
    "background": "#f7f7f4",      # site --bg
    "image_surface": "#ffffff",   # site --image-surface, behind transparent photo pixels
    "margin": 28, "gap": 36, "text_gap": 10,
    # Chosen from three pilots (detailed photo, detailed cover, fallback): CRF 18 keeps the still and the
    # one-pixel spokes clean at 100%; a heavy still may step up to CRF 20 to stay near the target.
    "crf": 18, "max_crf": 20, "target_bytes": 300_000, "ceiling_bytes": 400_000,
}
# Flat-colour mascot over a static still: the animation tune is smaller and closer to the source here.
X264 = ["-c:v", "libx264", "-threads", "2", "-profile:v", "high", "-level:v", "3.1", "-preset", "veryslow",
        "-tune", "animation", "-g", "240", "-pix_fmt", "yuv420p", "-color_primaries", "bt709",
        "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv"]
# Bit-exact muxing and no SEI: no encoder strings, dates or other embedded metadata.
CLEAN = ["-bsf:v", "filter_units=remove_types=6", "-fflags", "+bitexact", "-flags:v", "+bitexact",
         "-map_metadata", "-1", "-map_chapters", "-1", "-metadata:s:v:0", "encoder=", "-movflags", "+faststart"]


def rgb(value):
    return tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


class Kit:
    """The shared riding loop and the domain text, cut from the hash-checked sprite sheet."""

    def __init__(self, descriptor=KIT):
        self.descriptor = json.loads(Path(descriptor).read_text())
        sheet_path = Path(descriptor).parent / self.descriptor["file"]
        if sha256(sheet_path) != self.descriptor["sha256"]:
            raise SystemExit(f"{sheet_path}: sprite sheet does not match its recorded SHA-256")
        with Image.open(sheet_path) as opened:
            sheet = opened.convert("RGBA")
        frames = self.descriptor["frames"]
        box, cols = frames["box"], frames["columns"]
        if frames["fps"] != DESIGN["fps"] or DESIGN["frames"] % frames["count"]:
            raise SystemExit("kit frame rate or loop length does not fit the clip")
        self.box = box
        self.frames = [sheet.crop(((i % cols) * box, (i // cols) * box, (i % cols + 1) * box, (i // cols + 1) * box))
                       for i in range(frames["count"])]
        x, y, w, h = self.descriptor["text"]["rect"]
        self.text = sheet.crop((x, y, x + w, y + h))


def load_still(path):
    """The preview still as sRGB pixels; transparent areas sit on the site's white image surface."""
    with Image.open(path) as opened:
        if getattr(opened, "n_frames", 1) != 1:
            raise SystemExit(f"{path}: animated stills are not supported")
        image = ImageOps.exif_transpose(opened)
        mode = "RGBA" if image.has_transparency_data else "RGB"
        if image.info.get("icc_profile"):
            image = ImageCms.profileToProfile(image, ImageCms.ImageCmsProfile(io.BytesIO(image.info["icc_profile"])),
                                              ImageCms.createProfile("sRGB"), outputMode=mode)
        else:
            image = image.convert(mode)
    if mode == "RGBA":
        surface = Image.new("RGBA", image.size, rgb(DESIGN["image_surface"]) + (255,))
        image = Image.alpha_composite(surface, image)
    return image.convert("RGB")


def layout(kit, still_size):
    """Integer rectangles: the still (contained, never upscaled), then the mascot above the domain."""
    W, H = DESIGN["width"], DESIGN["height"]
    m, gap, text_gap = DESIGN["margin"], DESIGN["gap"], DESIGN["text_gap"]
    col = max(kit.box, kit.text.width)
    block_h = kit.box + text_gap + kit.text.height
    if still_size:
        w, h = still_size
        scale = min(1.0, (W - 2 * m - gap - col) / w, (H - 2 * m) / h)
        dw, dh = max(1, round(w * scale)), max(1, round(h * scale))
        x0 = (W - (dw + gap + col)) // 2
        still = [x0, (H - dh) // 2, dw, dh]
        cx = x0 + dw + gap
    else:
        still, cx = None, (W - col) // 2
    my = (H - block_h) // 2
    return {"still": still, "mascot": [cx + (col - kit.box) // 2, my, kit.box, kit.box],
            "text": [cx + (col - kit.text.width) // 2, my + kit.box + text_gap, kit.text.width, kit.text.height]}


def compose(kit, source):
    still = load_still(ROOT / source["path"]) if source else None
    rects = layout(kit, still.size if still else None)
    if still:
        rects["source_size"] = list(still.size)
    base = Image.new("RGB", (DESIGN["width"], DESIGN["height"]), rgb(DESIGN["background"]))
    if still:
        x, y, w, h = rects["still"]
        base.paste(still if still.size == (w, h) else still.resize((w, h), Image.Resampling.LANCZOS), (x, y))
    x, y, _, _ = rects["text"]
    base.paste(kit.text.convert("RGB"), (x, y), kit.text.getchannel("A"))
    mx, my, _, _ = rects["mascot"]
    masks = [(f.convert("RGB"), f.getchannel("A")) for f in kit.frames]

    def frames():
        for n in range(DESIGN["frames"]):
            frame = base.copy()
            pose, alpha = masks[n % len(masks)]
            frame.paste(pose, (mx, my), alpha)
            yield frame.tobytes()
    return frames, rects


def encode(frames, out, crf):
    w, h = DESIGN["width"], DESIGN["height"]
    command = [FFMPEG, "-v", "error", "-nostdin", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
               "-r", str(DESIGN["fps"]), "-i", "-", "-filter_threads", "1", "-vf",
               "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,"
               "setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv",
               "-an", *X264, "-crf", str(crf), *CLEAN, str(out)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    for frame in frames():
        process.stdin.write(frame)
    process.stdin.close()
    error = process.stderr.read().decode()[:400]
    if process.wait() != 0:
        raise SystemExit(f"ffmpeg failed: {error}")


def top_level_boxes(path):
    boxes = []
    with open(path, "rb") as handle:
        while header := handle.read(8):
            size, kind = struct.unpack(">I4s", header)
            if size == 1:
                size = struct.unpack(">Q", handle.read(8))[0] - 8
            boxes.append(kind.decode("latin-1"))
            if size == 0:
                break
            handle.seek(size - 8, 1)
    return boxes


def validate(path):
    """Probe, decode and container checks; raises on any departure from the delivery contract."""
    probe = json.loads(subprocess.run([FFPROBE, "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
                                      check=True, capture_output=True, text=True).stdout)
    streams = probe["streams"]
    video = streams[0]
    decoded = subprocess.run([FFMPEG, "-v", "error", "-xerror", "-threads", "2", "-i", str(path), "-map", "0:v:0",
                              "-f", "framecrc", "-"], capture_output=True, text=True)
    frames = sum(1 for line in decoded.stdout.splitlines() if line and not line.startswith("#"))
    boxes = top_level_boxes(path)
    tags = {**probe["format"].get("tags", {}), **video.get("tags", {})}
    checks = {
        "one H.264 video stream and no audio": len(streams) == 1 and video["codec_name"] == "h264",
        "High profile, level 3.1, yuv420p": video.get("profile") == "High" and video.get("level") == 31 and video["pix_fmt"] == "yuv420p",
        "dimensions": (video["width"], video["height"]) == (DESIGN["width"], DESIGN["height"]),
        "frame rate": video["r_frame_rate"] == f"{DESIGN['fps']}/1",
        "frame count": int(video.get("nb_frames", 0)) == DESIGN["frames"] and frames == DESIGN["frames"],
        "decodes without errors": decoded.returncode == 0,
        "fast start": "moov" in boxes and "mdat" in boxes and boxes.index("moov") < boxes.index("mdat"),
        "no embedded metadata": not set(tags) - {"major_brand", "minor_version", "compatible_brands", "handler_name", "vendor_id", "language"},
        "BT.709 colour": (video.get("color_space"), video.get("color_primaries"), video.get("color_transfer")) == ("bt709",) * 3,
    }
    failed = [name for name, ok in checks.items() if not ok]
    if failed:
        raise SystemExit(f"{path}: failed {', '.join(failed)}")
    return {"duration_s": round(float(probe["format"]["duration"]), 3), "boxes": boxes}


def encoder_version():
    first = subprocess.run([FFMPEG, "-version"], check=True, capture_output=True, text=True).stdout.splitlines()[0]
    return " ".join(first.split()[:3])


def author(kit, clip, out_dir):
    frames, rects = compose(kit, clip.get("source"))
    source_size = rects.pop("source_size", None)
    temporary = out_dir / f".{clip['key'][:16]}.partial.mp4"
    tries = []
    for crf in range(DESIGN["crf"], DESIGN["max_crf"] + 1):
        encode(frames, temporary, crf)
        size = temporary.stat().st_size
        tries.append({"crf": crf, "bytes": size})
        if size <= DESIGN["target_bytes"]:
            break
    if size > DESIGN["ceiling_bytes"]:
        temporary.unlink()
        raise SystemExit(f"{clip['key']}: {size} bytes at CRF {crf} exceeds the {DESIGN['ceiling_bytes']}-byte ceiling")
    checked = validate(temporary)
    digest = sha256(temporary)
    final = out_dir / f"{clip['kind']}-{digest[:16]}.mp4"
    temporary.replace(final)
    return {"key": clip["key"], "file": final.relative_to(ROOT).as_posix() if final.is_relative_to(ROOT) else str(final),
            "sha256": digest, "bytes": size, "crf": crf, "tries": tries, "duration_s": checked["duration_s"],
            "layout": rects, "source_size": source_size}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=["encode", "sample", "design"])
    parser.add_argument("out_dir", nargs="?", help="review directory for `sample`")
    parser.add_argument("--kit", default=str(KIT), help="sprite-sheet descriptor (default: the committed kit)")
    args = parser.parse_args()
    if not features.check("avif"):
        raise SystemExit("Pillow must include AVIF support; install requirements-media.txt")
    if args.command == "design":
        print(json.dumps({**DESIGN, "ffmpeg_args": X264 + CLEAN}))
        return
    os.nice(10)   # long serial runs stay out of the way of interactive work
    kit = Kit(args.kit)
    out_dir = OUTPUT if args.command == "encode" else Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    plan = json.load(sys.stdin)
    version = encoder_version()
    for number, clip in enumerate(plan["clips"], 1):
        result = {**author(kit, clip, out_dir), "encoder": version}
        print(json.dumps(result), flush=True)
        print(f"[{number}/{len(plan['clips'])}] {result['file']} {result['bytes']:,} B (CRF {result['crf']})", file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()
