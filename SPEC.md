# Specification

This is the canonical product and data contract. Intentional behavior changes must update this file in the same pull request.

## 1. Rider experience

- The homepage is the unified catalog and inline comparison.
- Category is a first-class filter; generic project copy must describe bicycles broadly.
- The category control groups catalog entries into broad road, gravel/all-road, MTB, e-road, folding, and triathlon families. Any category represented by a published product or a non-duplicate candidate is selectable; the control must not create dead-end filters.
- Brand names in catalog rows and model details lead to a shareable exact-brand catalog filter. The visible result status names the active brand.
- Search, category, capability, price, sort, brand, product type, frameset build allowance, and comparison selections are URL-addressable. Browser back/forward restores filter state, and model links preserve a safe return path to the filtered catalog.
- On desktop, the Bike, Full-bike price, and eligible category-fact table headings are keyboard-accessible sort controls. Repeated activation reverses direction, the active heading exposes its order, and the Sort control offers the same directional choices when headings are hidden.
- `Max price` is a strict ceiling on the full published range or estimate. A product whose upper bound exceeds the selected amount does not match. Incompatible capability options are disabled for the active category/type/brand context; stale capability or category-sort URL state is cleared and canonicalized.
- Complete bikes and compatible frameset builds may appear together on a comparable full-bike price basis.
- A published frameset estimate uses its latest relevant price plus the reviewed default allowance in `data/meta.json`. A buyer may edit that allowance locally to model their own build; the resulting URL and visible totals must make the selected allowance reproducible without changing the reviewed dataset default.
- Do not publish a frameset where that allowance would materially mislead buyers; keep it as a candidate until the methodology is updated.
- Candidates share the comparison table instead of appearing in a separate research queue. A candidate appears in the focused default view when it has a dated official price; a dated observed price attached to an identifiable model; high or medium research priority; or at least two named sources. Generic, model-unclear, and title-mismatch price leads do not qualify on price alone. All non-duplicate candidates remain searchable, and one quiet control may expose the complete set. A candidate that points to an existing published record must not create a duplicate row.
- Candidate rows render only available facts. Unknown drivetrain, weight, frame, price, or category-specific values use the same quiet em dash as other unavailable cells; do not repeat per-field missing-data warnings. Candidate prices retain their observed/official date and frameset basis, candidates do not receive recommendations, and missing publication evidence must not be inferred.
- Do not add landing-page marketing, catalog counts, status dashboards, standalone guides, or repeated summaries.

The main catalog shows a compact common core. Publication-ready rows provide the full core; candidate rows leave unavailable cells empty rather than inventing values:

- image when its exactness and rights are documented, plus the exact model/configuration or candidate name;
- category and comparable price;
- drivetrain and weight;
- the most decision-relevant compatibility or frame facts.

Category-specific facts should appear only when useful. Tire clearance, suspension travel, motor system, folded size, mounting points, or other fields must not be forced onto unrelated categories. Internal frame storage and triathlon-specific storage or boxes are distinct facts; an unknown triathlon system must remain unknown. The catalog may show one compact price-status and observation-date line when it prevents conditional, historical, approximate, and official prices from appearing equivalent. Full promotion conditions, evidence detail, thresholds, provenance, and caveats belong in accessible popovers or the model page. Popover content is created in one shared keyboard-accessible surface on demand rather than duplicated invisibly for every row. It opens predictably from hover, keyboard focus, or tap; remains hoverable without passing pointer input through to obscured controls; click or tap toggles it; and Escape, outside interaction, scroll, and resize dismiss it.

The supported category vocabulary includes road, road-aero, road-endurance, road-climbing, gravel families, MTB, e-road, folding, and triathlon/time trial. Gravel-family products may expose tire clearance; MTB products may expose suspension travel; e-road products may expose motor and battery facts; folding products may expose wheel or folded-size facts; and triathlon products may expose time-trial fit or storage facts. A category without a verified value must show an unknown or verification state rather than borrowing a field from another category.

Category-specific numeric sorting is available only when every visible product uses the same meaningful metric kind. Mixed-category comparison separates tire, suspension, motor, folding, and triathlon facts into distinct rows and explicitly warns that unlike categories should not be ranked against one another. The site never computes a universal category score.

The site remains static, fast, responsive, accessible, and usable without accounts, analytics, ads, or a backend.
Catalog thumbnails link to model details and must be large enough to identify a bicycle's silhouette at rest. On fine-pointer devices, the whole thumbnail link enlarges on hover so the preview remains stable as the pointer moves across it, without moving the table layout; touch layouts keep the larger stable thumbnail size.

Model pages may include a compact, curated video section when a video maps to the exact variant or physical platform. Videos are optional editorial context, not specification, price, BOM, recommendation, or publication authority. The shown build may differ from the published variant. Channel relationships, supplied-product context, and other material disclosures must be visible. A YouTube embed loads only after an explicit visitor action, never autoplays, and always retains a normal external-link fallback.

## 2. Catalog scope

Publish a full product record, model page, or recommendation only when it has:

- an exact brand, model, generation, product type, and category;
- for a complete bike, an exact drivetrain and enough BOM evidence to identify the published configuration rather than only a model-family listing;
- clear relevance to buyers in mainland China;
- evidence for the specifications that matter in its category;
- a China purchase route or clearly labelled direct-factory route;
- at least one dated price observation or reference range;
- sources for decision-relevant claims;
- explicit caveats and unknowns.

Use `data/candidates/` when a promising product lacks enough evidence. A candidate may have a sparse table preview under the focused-view rules above without becoming a published product record. Use `data/exclusions/` when a product is obsolete, too ambiguous, outside the useful comparison, or otherwise unsuitable.

## 3. Data model

- `brands/`: manufacturer relationship, support, aliases, and brand-level evidence.
- `platforms/`: category and facts shared by one physical product generation.
- `variants/`: exact complete-bike or frameset configurations.
- `prices/`: dated observations; never timeless product properties.
- `sources/`: source identity, date, reliability, and supported claims.
- `images/`: subject accuracy, source, rights status, credit, and fallback.
- `videos/`: exact model/platform or candidate mapping, channel provenance, editorial format, commercial context, and privacy-safe embed identity.
- `recommendations/`: compact buyer-facing labels, updated only when evidence changes the conclusion.
- `candidates/` and `exclusions/`: unresolved or rejected products with reasons.
- `research/`: dated import ledgers that reconcile source bundles, dispositions, priority targets, and research queues without becoming buyer-facing product records.

Do not duplicate platform facts across variants. A new component configuration on the same platform is normally a new variant, not a new platform. New categories may add category-specific fields, validation, and UI only as needed.

Published MTB platforms use MTB-appropriate flat-bar configuration data. The fixed frameset allowance is publication-eligible only for road and gravel/all-road families; MTB, e-road, folding, and triathlon framesets remain candidates unless the approved methodology is explicitly changed.

## 4. Evidence rules

Classify claims as:

- `measured`
- `official`
- `seller claim`
- `community report`
- `inferred`
- `unknown`

Prefer exact-model primary sources, current China-market listings, and credible independent measurements. Secondary summaries are mainly for discovery.

Editorial videos may identify research candidates and add build, ownership, or ride context. They cannot independently satisfy the publication gate or support a current price, exact BOM, specification, manufacturing relationship, or recommendation. Candidate leads discovered in videos must be deduplicated against published platforms, existing candidates, and exclusions.

Never infer specifications across generations, sizes, or similarly named models without evidence. Keep expected quality separate from confidence in that estimate. Do not create a universal score or imply that products from different categories serve the same use case.

## 5. Price rules

- Every price has a date, exact variant, market/channel, type, conditions, and source.
- Add a new observation; do not overwrite price history.
- Distinguish observed checkout, official list, reference range, historical promotion, and estimate.
- Record coupons, subsidies, memberships, trade-ins, size/color limits, shipping, and other conditions when known.
- `data/meta.json.snapshot_date` is the last catalog-wide review date, not the date of every small edit.
- The reviewed default frameset allowance changes only with explicit maintainer approval and a dated rationale. A buyer-side calculator override is not an evidence or methodology change.

## 6. Media and privacy

- Third-party images may be remotely embedded only with source, owner, exactness, rights status, alt text, and fallback metadata.
- Do not commit third-party image files without permission or a compatible license.
- Never present another configuration as exact.
- Scheduled image-health reporting may identify broken, blocked, or wrong-content-type remote embeds, but temporary host blocking is non-fatal because every image has a project-owned fallback.
- YouTube videos use a validated video ID and a click-to-load `youtube-nocookie.com` embed. Initial model-page rendering must not request a YouTube thumbnail, player, script, or iframe. The external YouTube link remains available without loading the embed.
- Do not publish names, accounts, contacts, addresses, order or tracking IDs, payment data, private messages, private permission correspondence, credentials, GPS, or EXIF metadata.

## 7. Acceptance criteria

Every change must preserve valid cross-references and pass:

```bash
npm run check
```

For UI changes, inspect desktop and mobile behavior, keyboard access, popovers, image and video fallbacks, filters, and GitHub Pages base-path routing. Add or update focused tests for behavior changes. Do not add dependencies or top-level pages without a clear need and maintainer sign-off.

The static build enforces a documented homepage HTML/DOM budget so catalog growth cannot silently degrade the primary route. The 2026-08-11 unified 204-row catalog baseline is capped at 650,000 HTML bytes and 5,500 elements after measuring the GitHub Pages base-path build at 633,916 bytes and 5,369 elements; desktop and mobile browser checks are required when this baseline changes. Budget changes require a measured browser rationale.

Research bundles are evidence inputs, not publication authority. A dated marketplace snapshot may support an exact price observation, but a price is attachable only to the exact variant it identifies. Split or ambiguous trims remain candidates; screenshots, seller identities, and copied third-party images are never public data assets.
