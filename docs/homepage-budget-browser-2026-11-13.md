# Homepage budget review, 2026-11-13

The production root build (`npm run build:cloudflare`) had reached 886,866 HTML bytes and 8,336 elements with 318 catalog rows, against caps of 890,000 bytes and 8,650 elements. That left about one row of byte headroom, and pull-request checks built only the project-path shape.

## Change

- Each row's search text moved from a `data-search` attribute into the cacheable catalog payload (`/data/home-catalog-<locale>.json`). Catalog search already needs that payload, so search works exactly as before.
- Pull-request validation now also runs `npm run build:cloudflare`.
- The caps are unchanged.

## Measurement (production root build)

| | HTML bytes | Elements | Rows |
|---|---:|---:|---:|
| Before | 886,866 | 8,336 | 318 |
| After | 831,843 | 8,339 | 318 |

Rows average about 2,480 bytes and 24 elements. Headroom is about 23 further rows by bytes and 12 by elements, so the element cap now binds. The English catalog payload grew from 595,209 to 661,284 bytes; it is cached separately from the page.

## Browser check

Local preview of the production build in Chrome, cache disabled. The homepage in English, Chinese, German, Spanish and Russian at 1,600, 390 and 320 px (15 cases) showed no horizontal document overflow, finished loading the catalog, and loaded only that language's dictionary (English loads none). Search for `twittr` found the Twitter rows from the payload's search text.
