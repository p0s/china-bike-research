# China Bikes site update decision — 2026-08-30

- Visual thesis: keep the catalog dense and calm, with bike-led identity, restrained surfaces, rigorous spacing, and one blue accent.
- Content plan: compact brand/header, criteria-led comparison starting points, working filters/catalog/comparison, and a factual footer.
- Interaction thesis: explicit column-move controls, quiet theme changes, and restrained hover/focus feedback across pointer, keyboard, and touch.
- Cheap carbon aero shortlist: CYCLETRACK Phantom, TWITTER CYCLONE Gen3.0 ET, and CAMP ACE QED. Criteria: three brands with dated complete-bike prices, named builds, and documented carbon aero platforms; research-stage labels remain visible.
- Gravel shortlist: TWITTER V3 WheelTop EDS, Pardus Super Sport Gen2 eGR, and Incolor Voyager. Criteria: dated electronic complete/build routes with recorded weight and at least 40 mm tire capacity; this is a comparison starting point, not a universal ranking.
- Wide-tire aero shortlist: Incolor Speedster SR, LightCarbon LCR018-D, and Tavelo ARDEN. Criteria: documented 38 mm road-frame clearance plus dated frame/build pricing.
- Magene QED has no attributable mainland consumer price in the dataset. WheelTop has shift/brake-kit observations but not the remaining complete-build parts. Both therefore become named manual-allowance plans; no total is inferred.
- GitHub Pages serves one prebuilt homepage regardless of query string. Query-specific Open Graph responses would need crawler-visible server or edge rendering, so dynamic comparison previews are out of scope rather than emulated client-side.
- The general Open Graph image will be a project-owned 1200×630 composition using existing original bicycle silhouettes and wordmark assets, with metadata and byte-level dimension validation.
- A short footer paragraph adds indexable context without marketing claims: the catalog compares Chinese road, gravel, and carbon-bike options using dated prices, documented specifications, and transparent frameset-build estimates.
- Affected paths: `data/meta.json`, `src/lib/data.mjs`, `src/lib/html.mjs`, `src/render.mjs`, `assets/`, `tests/`, `SPEC.md`, and user-facing project metadata.
