# Research methodology

The canonical buyer-facing methodology is published at `/methodology/`. This file summarizes the rules used by maintainers and CI.

- Model exact platforms, configurations, prices, sources, and images separately.
- Require exact IDs and dates.
- Attach evidence status to individual claims.
- Keep expected execution separate from evidence confidence.
- Treat unknown as uncertainty, not proof of poor quality.
- Label official list, observed, reference-range, historical-promo, and estimated prices distinctly.
- Keep old price records; add new observations.
- Put incomplete products in `data/candidates/` and document exclusions.
- Apply the single fixed frameset build allowance from `data/meta.json` so every frame is compared on the same basis.
- Never infer clearance between generations or configurations without evidence.
- Label every visual as exact configuration, exact platform, same platform, different color, different-market build, or illustrative.
- Store source, credit, rights status, alt text, and review date for every visual.
- Do not present a photograph of one build as an exact image of another build.
- Never publish private transaction, account, permission-correspondence, or image-metadata data.
