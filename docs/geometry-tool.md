# Geometry comparison and similar-frame finder

## Frozen scope — 2026-10-11

1. Derive a size library from every published platform with numeric stack/reach and attributable geometry evidence. Keep all original records unchanged. Withhold unresolved geometry from calculations.
2. Add `/geometry/` in English, Chinese and German: exact model/size comparison, manual reference dimensions, common-scale diagram, measurement deltas and nearby size search.
3. Connect it to the existing catalog, model evidence and build workflow. Keep the homepage catalog and inline comparison intact.
4. Verify state sharing, history, keyboard use, mobile, dark appearance, localization and base paths. Run focused tests and the complete gate.
5. Deliver a signed feature branch and pull request, merge after checks, deploy the existing Cloudflare Worker and read back production behavior.

Done means all five steps are complete, all existing data files are byte-for-byte preserved, and live routes work. Organic traffic is an outcome to measure later, not a promised result.

## Design direction

Visual thesis: a quiet technical workspace, with one large measurement drawing, fine rules, generous spacing and the site's existing forest green. The reference is a drafting sheet, not a marketing landing page.

Content plan: concise introduction; two labeled size selectors; dominant shared-scale stack/reach plot and a compact measurement table; nearby sizes with explicit millimeter differences; expandable full sourced size library; brief explanation of measurement limits.

Interaction thesis: changing an exact size updates the drawing, deltas and nearby results together. A saved link restores the same inputs. Keyboard focus stays on the edited control. Results lead into the existing buying workflow.

References inspected: [Geometry Geeks](https://geometrygeeks.bike/) for explicit comparison controls; the existing [China Bikes](https://chinesebikes.xyz/) catalog for colors and navigation; the recent EveryPearl design direction for restrained hierarchy and spacing. No external design assets are copied.

## Data and calculation limits

Only stored numeric geometry is calculated. Text transcriptions are never parsed into invented measurements. Each platform is listed once, with its existing exact build links. Unresolved source consistency flags exclude that platform from the calculator and finder; all literal data remains on its model pages.

Similarity sorts by Euclidean distance between stack/reach in millimeters, inside a separate tolerance on each axis. It describes frame dimensions, not fit, handling, stock or purchase suitability. Manual inputs have no catalog provenance. No personal measurements are stored or sent by the tool. Existing analytics consent and collection rules remain unchanged.

## Release validation — 2026-10-11

- Full `npm run check`: 608 tests passed; privacy, outgoing privacy, data, research registry, coverage, build and SEO checks passed. Built 978 pages, including 780 indexable pages and all three geometry routes.
- Coverage preserves 737 images, 82 price observations, 1,609 sources and 236 protected candidate records. No `data/` or `content/` file differs from the current base.
- The complete published catalog content (excluding only its generated timestamp) matches the live pre-release catalog exactly: SHA-256 `404215ab781f74f37f1c62652da0ddee92022c3e2418a47f392ccdca48d422db`.
- Browser proof in dedicated research Chrome: desktop and 390 px mobile; English, Chinese and German; light/dark; reduced motion; menu and visible keyboard focus; exact size selection; use-result-as-B; manual input and blank preservation; reload, Back/Forward and language-switch restoration; shopping-context links.
- JavaScript-disabled readback: 178 library rows and the sourced plot remain available; editing stays disabled. Clipboard denial gives an explicit address-copy fallback.
- All 31 eligible models / 178 sizes are derived from existing records. Three unresolved tables remain linked and excluded from calculations. No dependencies, backend, analytics events or source observations were added.
