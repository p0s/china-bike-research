# Social video authoring

Every public page except the error page names one MP4 as `og:video` for link previews that play
direct video inline. The contract is in `SPEC.md` (Site-wide social video, 2026-10-29). Builds only
select files; clips are encoded offline and committed.

## When the build reports pending routes

A new or replaced model photo, article cover or blog banner first shares the branded fallback clip.
The build prints those routes. To give them their own clip:

```sh
MEDIA_PYTHON=/path/to/python-with-pillow-avif npm run social-video:author
```

This builds the site, plans from the rendered `og:image` values, encodes each still that has no clip,
validates every file, updates `assets/social-video/manifest.json` and freezes the route coverage in
`content/social-video/coverage.json`. Commit the new MP4 files and both JSON files, then rebuild.
Encoding needs Pillow with AVIF support (`requirements-media.txt`) and FFmpeg/ffprobe with libx264 on
`PATH` (or `FFMPEG`/`FFPROBE`). It runs serially at low priority; a clip takes a few seconds.

- `--limit N` encodes at most N new clips per run; the rest keep the fallback.
- `--prune` deletes clips that no page uses any more.
- `--rebuild` re-encodes everything after a deliberate design change in `scripts/social-video.py`
  or a new sprite sheet; the command refuses to mix designs otherwise.
- `npm run social-video:check` validates the committed clips and the last build.

## What a clip contains

The page's own preview still, unaltered and uncropped, scaled down to fit (never up), beside the
site's riding mascot and the domain ChineseBikes.xyz. Only the mascot moves. The riding loop and the
domain text come from the hash-checked sprite sheet in `content/social-video/`; its descriptor
records how the mascot animation was drawn from the approved logo. Product photos keep their image
records as the authority for source, credit, rights, removal route and review dates. A clip adds no
licence and is not a new source review; withhold a still whose source restricts this use.
