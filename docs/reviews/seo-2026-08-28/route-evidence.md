# SEO review evidence — 2026-08-28

Status: local browser review complete; prepared for maintainer review.

Environment: production-origin static build served only on `127.0.0.1`; isolated signed-out headless Chrome profile; all HTTPS requests blocked during capture. Screenshots are task-local review artifacts, intentionally omitted from this public repository under its binary-media policy.

| Surface | Route | Captures | Browser and markup evidence |
| --- | --- | --- | --- |
| Catalog | `/` | `catalog-{desktop,mobile}.png` | One H1; production canonical; `WebSite`; dataset/review dates; crawlable brand, type, price, and dataset links; filters remain visible. |
| Model detail | `/models/quick-gr-one-frameset/` | `model-detail-{desktop,mobile}.png` | Breadcrumb; source anchor; exact evidence date and estimate context; `Product`, `WebPage`, and `BreadcrumbList`; no `offers`. Failed remote image leaves a centered readable layout. |
| Dataset/methodology | `/methodology/` | `methodology-{desktop,mobile}.png` | Visible JSON/CSV/source downloads and separate dataset/catalog-review dates; matching `Dataset`, `DataDownload`, `WebPage`, and breadcrumb markup. |
| Brand hub | `/brands/` | `brands-hub-{desktop,mobile}.png` | Eight qualified brand destinations; visible two-record rule; crawlable links; `CollectionPage` and breadcrumb markup. |
| Brand landing | `/brands/twitter/` | `brand-twitter-{desktop,mobile}.png` | Six exact products; supported brand context and provenance; crawlable model links. |
| Frameset landing | `/framesets/` | `framesets-{desktop,mobile}.png` | 21 exact framesets; visible build-allowance caveat; dated price and evidence context. |
| Price landing | `/prices/under-5000/` | `price-under-5000-{desktop,mobile}.png` | Four current exact products; full-range rule visible; candidates, historical-only prices, and boundary-crossing ranges excluded. |

Desktop captures use 1440×1000; mobile captures use 390×844. Every reviewed route had one H1, `index,follow,max-image-preview:large`, its exact `https://china-bikes.p0s.eu/` canonical, zero horizontal overflow, and no placeholder/test copy. The collapsed mobile menu opened with `aria-expanded="true"`; keyboard behavior remains covered by the interaction regression suite.

The deterministic inventory is 15 pages: one brand hub, eight qualifying brand pages, two type pages, one price hub, and three non-overlapping price pages. Brand pages require at least two exact publication-ready records; price pages require at least three current exact records. Current price-band populations are 4, 8, and 20. All landing schema is non-commercial `CollectionPage`/`BreadcrumbList` markup with crawlable item URLs.

The production-origin build generated 255 HTML pages and 228 sitemap URLs. All 255 pages had one absolute production canonical; 254 indexable pages carried the public robots directive and the 404 remained `noindex`. `robots.txt` allows `/` and points to `https://china-bikes.p0s.eu/sitemap.xml`; no `example.invalid` references remained.

The task branch started at local `origin/main` commit `68b534aa3bc66e7a44199086cc723db5cee25cc8`, whose object is also present in the public GitHub repository. The production-origin repository gate passed privacy, schema/data validation, research-ledger validation, coverage protection, all 127 tests, and a 255-page build.

## Screenshot SHA-256

```text
ab6cb4c226c386f5154407ec0b40024f54135dec0450d251c65c55db35b00150  brand-twitter-desktop.png
24874721d3ae2dbf5f6741ef3c8e0cce1440fe6293e02a923fcae1936515ea5a  brand-twitter-mobile.png
2154529356121fb15243e7d735457b7dc8c06a1de27f5939938a4c926bf924a8  brands-hub-desktop.png
d2ab7c0bb825f1d360de23f049cfeda0407da1f21c9404196fb6d7bd8c623b3f  brands-hub-mobile.png
9648ed85b59c8569497da08e4d0419d61e536ffd88d9c03456c5d53e1a1ea7e7  catalog-desktop.png
ae415a62d5d5b86c761c646b452a89c93981508341ad1bda0e4bb7bea6ac77c1  catalog-mobile.png
6afdfc701b471ec4a9251bbfdf36b22c1784f20856614f1ac50bdcce12dd2062  framesets-desktop.png
594dc4023fb9c847fabfec44993b8db5b534a2efaa3704030e97df1e3992b8a5  framesets-mobile.png
3ebbddc88873345d622dd79d208e32d7448220a21df8a33a86e7f2e6d0bdf4a4  methodology-desktop.png
7e610470e6941109090e88029924ef30ac5a556d717f670cba0e889c04990b37  methodology-mobile.png
58958d3862389aae649c3352322bf5dc7990cd6ccb29dbc5f9d610fbffc9bf9e  model-detail-desktop.png
505f28f4bfc0bd8227920ffb44c7b46cab1c3bbcf3153c230d6b33364577c9c4  model-detail-mobile.png
fd2a902cff577cc6d87ac24b4b97dfce8d1e5787765daa05ca755e8d4340e2b9  price-under-5000-desktop.png
100d923d1fdb42b19a218b8b162b774f3d04280b39d8f36b04368c47c2966cbc  price-under-5000-mobile.png
```

## External boundary

The live public homepage was reachable read-only on 2026-08-28. Available safe readers did not return independently parseable live `robots.txt` or `sitemap.xml` bodies, so the generated-source checks above are local proof, not a claim that an unpublished build is live. No push, pull request, deployment, DNS/hosting change, or publication was performed.
