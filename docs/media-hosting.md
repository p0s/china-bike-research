# Third-party media hosting

## Decision

Selected public XHS and marketplace images normally use the isolated project media origin.
When that route is unavailable or a durable specification quotation is materially useful,
the same bounded derivatives may be stored under `assets/images/sourced/xhs/` or
`assets/images/sourced/taobao/` and served by GitHub Pages. Raw captures stay outside Git.

This is an attributed evidence workflow, not an image mirror. A selected image may
identify an exact bicycle or expose decision-relevant geometry, size, clearance,
weight, package, compatibility, or aero information. Every image must contribute a
distinct fact or useful view. The identity-safe canonical source stays visibly linked,
copyright remains with its owner, no license is asserted, and a removal request can be
filed through the public issue tracker without posting personal data.

## Compression contract

| Use | Maximum width | Maximum bytes | Browser behavior |
| --- | ---: | ---: | --- |
| Catalog card | 480 px | 40,000 | Chosen for compact catalog and comparison views |
| Model detail | 1,200 px | 88,000 | Chosen only when a larger rendered image needs it |

`npm run media:optimize` uses WebP, strips metadata, starts at quality 72, and lowers
quality only until the byte target is met. If necessary it reduces dimensions without
upscaling. Output filenames include a SHA-256 prefix and receive one-year immutable
caching. A 400 KB original therefore becomes at least 10× smaller in card views; the
detail derivative favors useful component and silhouette detail and is at least 4.5×
smaller. Ratios vary when the source is already efficiently compressed.

A 615×625 PNG test crop measured 887,146 bytes. WebP quality 65 measured 34,596 bytes
with SSIM 0.9807, a 25.6× reduction. The test source and derivatives were temporary and
were not committed.

## Operator workflow

1. Confirm the exact public post or listing and select only useful exact-model images outside the repo.
2. Reject images containing visible faces, vehicle registration, account overlays, or
   location identifiers. Do not retain creator handles or account IDs in project data.
3. Optimize into an external staging directory for the media origin:

   ```bash
   npm run media:optimize -- \
     --input /private/tmp/source.webp \
     --output /private/tmp/china-bike-media/public/media/xhs \
     --slug exact-model-slug
   ```

   Or create the validated Git-hosted fallback directly:

   ```bash
   npm run media:optimize -- \
     --input /private/tmp/source.webp \
     --output assets/images/sourced/xhs \
     --slug exact-model-slug \
     --repository-local
   ```

4. Visually inspect both derivatives and confirm their manifest byte counts, hashes,
   dimensions, and metadata result.
5. For external hosting, deploy the staging copy and read back HTTPS headers and bytes.
   For Git hosting, add the generated immutable WebP files to the matching image record;
   the privacy and data validators reject unreferenced or out-of-contract binaries.

The optimizer always refuses repository-local sources. Repository-local output requires
the explicit `--repository-local` flag and is limited to the two sourced-image roots. It
refuses to overwrite an existing model directory.

## Source and rights boundary

This workflow records an editorial rationale; it is not a legal determination. It is
limited to the amount needed for model identification and commentary, keeps the quoted
work secondary to the project's analysis, and preserves a direct source link.

The operational safeguards track the limits described by [Article 24 of China's
Copyright Law](https://www.npc.gov.cn/c2/c30834/202011/t20201119_308796.html),
[section 51 of Germany's Copyright Act](https://www.gesetze-im-internet.de/englisch_urhg/englisch_urhg.html#p0273),
and the EU Court of Justice's quotation analysis in
[C-516/17](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=celex:62017CJ0516):
Each public image keeps a direct, identity-safe canonical source link and visible
attribution. This records provenance and supports removal or correction; it does not
assert ownership or grant a general license to redistribute the source image.

## Privacy and serving behavior

- `cwebp -metadata none` removes EXIF, XMP, ICC, and GPS-bearing metadata; the optimizer
  verifies the WebP container before accepting output.
- Image review is recorded only after faces, registration, account identifiers, and
  visible location identifiers are absent.
- Nginx access logging is disabled. The visitor still makes a normal HTTPS request to
  the VPS and its network providers, so the privacy page discloses that request.
- The server exposes only health and immutable WebP paths, disables directory listing,
  and returns 404 for every other route.
