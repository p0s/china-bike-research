# Specification

This is the canonical product and data contract. Intentional behavior changes must update this file in the same pull request.

## 1. Rider experience

- The homepage is the unified catalog and inline comparison.
- Category is a first-class filter; generic project copy must describe bicycles broadly.
- The category control groups published products into broad road, gravel/all-road, MTB, e-road, folding, and triathlon families. Published subcategories are selectable; supported categories with no publication-ready products are labelled as research queue context and must not create dead-end catalog filters.
- Brand names in catalog rows and model details lead to a shareable exact-brand catalog filter. The visible result status names the active brand.
- Search, category, capability, price, sort, brand, product type, and comparison selections are URL-addressable. Browser back/forward restores filter state, and model links preserve a safe return path to the filtered catalog.
- `Max price` is a strict ceiling on the full published range or estimate. A product whose upper bound exceeds the selected amount does not match. Incompatible capability options are disabled for the active category/type/brand context; stale capability or category-sort URL state is cleared and canonicalized.
- Complete bikes and compatible frameset builds may appear together on a comparable full-bike price basis.
- A published frameset estimate uses its latest relevant price plus the fixed allowance in `data/meta.json`.
- Do not publish a frameset where that allowance would materially mislead buyers; keep it as a candidate until the methodology is updated.
- Candidates appear only as compact secondary context.
- Do not add landing-page marketing, catalog counts, status dashboards, standalone guides, or repeated summaries.

The main catalog shows a compact common core:

- image and exact model/configuration;
- category and comparable price;
- drivetrain and weight;
- the most decision-relevant compatibility or frame facts.

Category-specific facts should appear only when useful. Tire clearance, suspension travel, motor system, folded size, mounting points, or other fields must not be forced onto unrelated categories. Internal frame storage and triathlon-specific storage or boxes are distinct facts; an unknown triathlon system must remain unknown. The catalog may show one compact price-status and observation-date line when it prevents conditional, historical, approximate, and official prices from appearing equivalent. Full promotion conditions, evidence detail, thresholds, provenance, and caveats belong in accessible popovers or the model page. Popover content is created in one shared keyboard-accessible surface on demand rather than duplicated invisibly for every row.

The supported category vocabulary includes road, road-aero, road-endurance, road-climbing, gravel families, MTB, e-road, folding, and triathlon/time trial. Gravel-family products may expose tire clearance; MTB products may expose suspension travel; e-road products may expose motor and battery facts; folding products may expose wheel or folded-size facts; and triathlon products may expose time-trial fit or storage facts. A category without a verified value must show an unknown or verification state rather than borrowing a field from another category.

Category-specific numeric sorting is available only when every visible product uses the same meaningful metric kind. Mixed-category comparison separates tire, suspension, motor, folding, and triathlon facts into distinct rows and explicitly warns that unlike categories should not be ranked against one another. The site never computes a universal category score.

The site remains static, fast, responsive, accessible, and usable without accounts, analytics, ads, or a backend.
Catalog thumbnails link to model details. On fine-pointer devices, a thumbnail may enlarge on hover without moving the table layout; touch layouts keep the stable thumbnail size.

## 2. Catalog scope

Publish a product in the main catalog only when it has:

- an exact brand, model, generation, product type, and category;
- for a complete bike, an exact drivetrain and enough BOM evidence to identify the published configuration rather than only a model-family listing;
- clear relevance to buyers in mainland China;
- evidence for the specifications that matter in its category;
- a China purchase route or clearly labelled direct-factory route;
- at least one dated price observation or reference range;
- sources for decision-relevant claims;
- explicit caveats and unknowns.

Use `data/candidates/` when a promising product lacks enough evidence. Use `data/exclusions/` when a product is obsolete, too ambiguous, outside the useful comparison, or otherwise unsuitable.

## 3. Data model

- `brands/`: manufacturer relationship, support, aliases, and brand-level evidence.
- `platforms/`: category and facts shared by one physical product generation.
- `variants/`: exact complete-bike or frameset configurations.
- `prices/`: dated observations; never timeless product properties.
- `sources/`: source identity, date, reliability, and supported claims.
- `images/`: subject accuracy, source, rights status, credit, and fallback.
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

Never infer specifications across generations, sizes, or similarly named models without evidence. Keep expected quality separate from confidence in that estimate. Do not create a universal score or imply that products from different categories serve the same use case.

## 5. Price rules

- Every price has a date, exact variant, market/channel, type, conditions, and source.
- Add a new observation; do not overwrite price history.
- Distinguish observed checkout, official list, reference range, historical promotion, and estimate.
- Record coupons, subsidies, memberships, trade-ins, size/color limits, shipping, and other conditions when known.
- `data/meta.json.snapshot_date` is the last catalog-wide review date, not the date of every small edit.
- The frameset allowance changes only with explicit maintainer approval and a dated rationale.

## 6. Images and privacy

- Third-party images may be remotely embedded only with source, owner, exactness, rights status, alt text, and fallback metadata.
- Do not commit third-party image files without permission or a compatible license.
- Never present another configuration as exact.
- Scheduled image-health reporting may identify broken, blocked, or wrong-content-type remote embeds, but temporary host blocking is non-fatal because every image has a project-owned fallback.
- Do not publish names, accounts, contacts, addresses, order or tracking IDs, payment data, private messages, private permission correspondence, credentials, GPS, or EXIF metadata.

## 7. Acceptance criteria

Every change must preserve valid cross-references and pass:

```bash
npm run check
```

For UI changes, inspect desktop and mobile behavior, keyboard access, popovers, image fallbacks, filters, and GitHub Pages base-path routing. Add or update focused tests for behavior changes. Do not add dependencies or top-level pages without a clear need and maintainer sign-off.

The static build enforces a documented homepage HTML/DOM budget so catalog growth cannot silently degrade the primary route. Budget changes require a measured browser rationale.

Research bundles are evidence inputs, not publication authority. A dated marketplace snapshot may support an exact price observation, but a price is attachable only to the exact variant it identifies. Split or ambiguous trims remain candidates; screenshots, seller identities, and copied third-party images are never public data assets.
