# AVIF image authoring

Browser raster images use AVIF before they enter the deployment bundle. Cloudflare
serves the committed files directly; there is no paid image-transformation service,
runtime conversion, or duplicate WebP fallback. SVG illustrations remain SVG. The
explicit JPEG social previews and PNG browser/touch icons remain for compatibility.

## Import a reviewed product photo

Use Python 3.10+ with the pinned offline authoring dependency:

```sh
python3 -m venv .research/media-venv
.research/media-venv/bin/python -m pip install -r requirements-media.txt
MEDIA_PYTHON=.research/media-venv/bin/python npm run media:optimize -- \
  --input /absolute/private-evidence/photo.png \
  --output assets/images/sourced/official --slug exact-model --repository-local
```

Keep the original outside Git. Copy the returned immutable filenames, dimensions,
byte counts, AVIF MIME type, quality, and SHA-256 digests into the image record's
card/detail variants. Preserve the original source URL/hash, source review dates,
credit, exactness, privacy review and removal route. Conversion is not a new source
review or permission to publish. The encoder corrects EXIF orientation, converts
embedded color profiles to sRGB, strips metadata, avoids upscaling, uses two CPU
threads, and selects the highest quality within the existing width/byte limits.

For generated blog artwork use `scripts/encode-avif.py` with explicit input,
output, width and byte budget, then update `content/blog-images.json` and the
project-owned exact-hash allowlist. Keep the dedicated `purpose: social` JPEG.
Inspect evidence diagrams and small text at their rendered size before publication.

## Enforced on every delivery

`npm run media:check` rejects unconverted browser raster files and invalid AVIF
containers. It is part of `npm run check`. The existing data, privacy and coverage
checks still enforce provenance, exact paths, digests, dimensions and byte budgets.
Ordinary builds and the deployed site require no Python dependency.

For an explicitly reviewed batch of existing WebP derivatives, run
`python scripts/convert-avif.py prepare`, review the staged results, then run
`python scripts/convert-avif.py apply` with the same media-authoring interpreter.
The command prepares everything under ignored `.research/avif-conversion/`, verifies
all input/output hashes before applying, updates active references and exact-hash
allowlists, and removes replaced WebP files. Preserve dated research evidence.
Use a fresh branch and an empty staging directory for each new conversion batch.
Keep the generated conversion report with the batch's delivery evidence.

Measure the final bundle, run the full gate and image report, and verify desktop,
mobile, gallery navigation, failure behavior, and live `image/avif` responses.
Git history retains prior assets; these savings apply to the current source tree,
Cloudflare deployment and browser transfers, not automatically to old Git objects.
