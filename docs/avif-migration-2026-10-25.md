# AVIF migration — 2026-10-25

Converted all 1,756 committed WebP browser assets from base
`f2f137137542dc743ca2cd5a1fda87fbc525e715` to AVIF. Dimensions, original-source
hashes, source URLs, attribution, image review dates and product facts are preserved.
No research evidence or publication rights were added by conversion.

| Asset group | Files | Before bytes | AVIF bytes |
| --- | ---: | ---: | ---: |
| Blog artwork | 239 | 28,200,500 | 17,028,235 |
| Header branding | 1 | 49,618 | 11,586 |
| Official-source derivatives | 1,080 | 22,956,994 | 17,052,424 |
| Retailer-source derivatives | 82 | 2,919,166 | 2,007,897 |
| Taobao-source derivatives | 10 | 315,752 | 239,906 |
| XHS-source derivatives | 344 | 14,336,216 | 13,050,016 |
| **Converted total** | **1,756** | **68,778,246** | **49,390,064** |

The conversion saves **19,388,182 bytes**, or **28.19%** of converted assets.
The complete image bundle falls from **94,501,418** to **75,113,236 bytes**,
a **20.52%** reduction. MB values use decimal units. Both source and Cloudflare
build copy the same asset set; this is bundle storage, not a per-page download.
Git history and retained provider deployment versions are not compacted.

Compatibility exceptions remain: 117 JPEG social previews (24,592,559 bytes),
three PNG icons/social assets (1,071,484 bytes), and three SVGs (59,129 bytes).
No duplicate WebP fallbacks remain. AVIF quality ranges from 45 to 60; two already
small official thumbnails grow by less than 1 KB to preserve the quality floor.

## Validation

- `npm run check`: 727 tests pass; privacy, data, research, coverage, build,
  generated links and SEO checks pass. The build contains 1,341 localized pages.
- `npm run build:cloudflare`: production-origin build and SEO checks pass.
- `npm run image:report`: zero remote image targets.
- Two real Python encoder/import integration tests pass: decoded format,
  dimensions, alpha, metadata removal, budgets, original hashes and immutable output.
- Independent comparison of 886 image/groupset records confirms that fields
  outside local hosting/derivative metadata are unchanged.
- Seven old/new visual comparisons cover artwork, alpha branding, product photos,
  Chinese text, specification/geometry graphics and the lowest-quality tall image.
- Desktop homepage: all 225 image elements decode as AVIF. Responsive gallery
  view, a 390-pixel mobile model page, gallery switching, simulated image failure
  and recovery, English/German guides and a Chinese model page pass. No horizontal
  overflow on the inspected 390-pixel pages. Three groupset image responses
  decode and return `image/avif`.

Use [AVIF authoring](avif-authoring.md) for future imports. The build's
`media:check` rejects unconverted browser rasters and invalid AVIF file types.
Production deployment and live verification are recorded in the delivery PR.
