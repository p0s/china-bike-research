# Specification

This is the canonical product and data contract. Intentional behavior changes must update this file in the same pull request.

## 1. Rider experience

- The homepage is the unified catalog and inline comparison.
- Category is a first-class filter; generic project copy must describe bicycles broadly.
- The category control groups catalog entries into broad road, gravel/all-road, MTB, e-road, folding, and triathlon families. Any category represented by a published product or a non-duplicate candidate is selectable; the control must not create dead-end filters.
- Brand names in catalog rows and model details lead to a shareable exact-brand catalog filter. The visible result status names the active brand.
- Search, category, capability, price, sort, brand, product type, frameset build preset or custom allowance, and comparison selections are URL-addressable. Browser back/forward restores filter state, and model links preserve a safe return path to the filtered catalog.
- On desktop, the Bike, Full-bike price, Tire clearance, and eligible category-fact table headings are keyboard-accessible sort controls. Repeated activation reverses direction, the active heading exposes its order, and the Sort control offers the same directional choices when headings are hidden.
- `Max price` is a strict ceiling on the full published range or estimate. A product whose upper bound exceeds the selected amount does not match. Incompatible capability options are disabled for the active category/type/brand context; stale capability or category-sort URL state is cleared and canonicalized.
- Complete bikes and compatible frameset builds may appear together on a comparable full-bike price basis.
- A published frameset estimate uses its latest relevant price plus the reviewed default allowance in `data/meta.json`. A compact selector may offer evidence-informed total-build presets and a custom allowance, but it must describe these as planning estimates rather than exact package quotes. The resulting URL, catalog totals, comparison, and frameset detail page preserve the selected amount without changing the reviewed dataset default. Frameset drivetrain cells stay empty because the record is a frame, not a complete build.
- Do not publish a frameset where that allowance would materially mislead buyers; keep it as a candidate until the methodology is updated.
- Candidates share the comparison table instead of appearing in a separate research queue. A candidate appears in the focused default view when it has a dated official price; a dated observed price attached to an identifiable model; high or medium research priority; or at least two named sources. Generic, model-unclear, and title-mismatch price leads do not qualify on price alone. All non-duplicate candidates remain searchable, and one quiet control may expose the complete set. A candidate that points to an existing published record must not create a duplicate row unless `catalog_distinct_reason` documents a materially different configuration, such as an exact complete bike tracked alongside a frameset-only record.
- Candidate rows render only available facts. Unknown drivetrain, weight, frame, price, or category-specific values use the same quiet em dash as other unavailable cells; do not repeat per-field missing-data warnings. Candidate prices retain their observed/official date and frameset basis, candidates do not receive recommendations, and missing publication evidence must not be inferred.
- Do not add landing-page marketing, catalog counts, status dashboards, standalone guides, or repeated summaries.

The main catalog shows a compact common core. Publication-ready rows provide the full core; candidate rows leave unavailable cells empty rather than inventing values:

- image when its exactness and rights are documented, plus the exact model/configuration or candidate name; otherwise omit the image region instead of showing a generic bicycle placeholder;
- category and comparable price;
- drivetrain and weight;
- tire clearance, with a compact unknown state when it is not recorded;
- the most decision-relevant compatibility or frame facts.

Tire clearance is a dedicated comparison field because it is a primary fit and use constraint. Other category-specific facts should appear only when useful. Suspension travel, motor system, folded size, mounting points, or other fields must not be forced onto unrelated categories. Internal frame storage and triathlon-specific storage or boxes are distinct facts; an unknown triathlon system must remain unknown. The catalog may show one compact price-status and observation-date line when it prevents conditional, historical, approximate, and official prices from appearing equivalent. Full promotion conditions, evidence detail, thresholds, provenance, and caveats belong in accessible popovers or the model page. Popover content is created in one shared keyboard-accessible surface on demand rather than duplicated invisibly for every row. It opens predictably from hover, keyboard focus, or tap; remains hoverable without passing pointer input through to obscured controls; click or tap toggles it; and Escape, outside interaction, scroll, and resize dismiss it.

The supported category vocabulary includes road, road-aero, road-endurance, road-climbing, gravel families, MTB, e-road, folding, and triathlon/time trial. Gravel-family products may expose tire clearance; MTB products may expose suspension travel; e-road products may expose motor and battery facts; folding products may expose wheel or folded-size facts; and triathlon products may expose time-trial fit or storage facts. A category without a verified value must show an unknown or verification state rather than borrowing a field from another category.

Tire clearance has its own numeric sort across categories. Other category-specific numeric sorting is available only when every visible product uses the same meaningful metric kind. Mixed-category comparison separates suspension, motor, folding, and triathlon facts into distinct rows and explicitly warns that unlike categories should not be ranked against one another. The site never computes a universal category score.

The site remains static, fast, responsive, accessible, and usable without accounts, analytics, ads, or a backend.
Catalog thumbnails link to model details and must be large enough to identify a bicycle's silhouette at rest. On fine-pointer devices, the whole thumbnail link enlarges on hover so the preview remains stable as the pointer moves across it, without moving the table layout; touch layouts keep the larger stable thumbnail size.
If a remote product image fails, hide that image cleanly while keeping the bike facts and links usable. Do not replace missing or failed product photography with a generic placeholder SVG.

Model pages may include a compact, curated video section when a video maps to the exact variant or physical platform. Videos are optional editorial context, not specification, price, BOM, recommendation, or publication authority. The shown build may differ from the published variant. Channel relationships, supplied-product context, and other material disclosures must be visible. A YouTube embed loads only after an explicit visitor action, never autoplays, and always retains a normal external-link fallback.

A compact component reference may explain current road, all-road, and gravel electronic-shifting systems sold in or for China when it helps interpret bicycle specifications. It may include established benchmarks and Chinese alternatives, and is linked from relevant drivetrain facts and the footer rather than promoted as a primary header destination. It must distinguish normalized package scope, exact brake packages and fluid, wiring and battery architecture, cassette and freehub limits, hanger and frame requirements, the scope of quoted weights, and dated price status. Seller labels such as 小套, 中套, and 大套 are not standardized. A secondary dealer-market synthesis may be retained as such but is neither an official price nor verified checkout evidence. The reference does not turn a component family into proof of an exact bicycle build.

The component comparison keeps only decision-critical fields in its primary table and moves explanatory architecture, weight, battery, compatibility, and package detail below it. On narrow screens, each row becomes a labelled comparison block rather than requiring an undisclosed horizontal scroll; on intermediate screens, the system identity remains visible while the remaining columns scroll with an explicit cue.

Every distinct catalog entry has an internal detail page with a concise, always-visible buyer brief. Published products combine the editorial verdict with exact price context, intended use, important configuration/category facts, strengths, trade-offs, and meaningful unknowns. Candidates are clearly labelled as research-stage profiles and show only attributed known facts, price context, and unresolved gaps; they are not recommendations. Both should read like precise short reviews rather than data dumps or long articles. Key product/support facts must not be hidden behind disclosure controls. Seller-contact scripts and internal research prompts are not buyer-facing content; detailed evidence records may remain in a compact disclosure beneath the visible brief.

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
- `images/`: subject accuracy, source, rights status, credit, and compatibility metadata for historical fallbacks; buyer-facing failure behavior is omission.
- `videos/`: exact model/platform or candidate mapping, channel provenance, editorial format, commercial context, and privacy-safe embed identity.
- `groupsets/`: compact evidence-backed references for recurring drivetrain families, their variants, package boundaries, compatibility, weights, batteries, price status, and caveats.
- `recommendations/`: compact buyer-facing labels, updated only when evidence changes the conclusion.
- `candidates/` and `exclusions/`: unresolved or rejected products with reasons.
- `research/`: dated import ledgers that reconcile source bundles, dispositions, priority targets, and research queues without becoming buyer-facing product records.

Do not duplicate platform facts across variants. A new component configuration on the same platform is normally a new variant, not a new platform. New categories may add category-specific fields, validation, and UI only as needed.

Published MTB platforms use MTB-appropriate flat-bar configuration data. The fixed frameset allowance is publication-eligible only for road, gravel/all-road, and triathlon families whose recorded base price identifies the included frame package and whose allowance covers only the components and assembly still required. MTB, e-road, and folding framesets remain candidates unless the approved methodology is explicitly changed.

## 4. Evidence rules

Classify claims as:

- `measured`
- `official`
- `seller claim`
- `community report`
- `inferred`
- `unknown`

Prefer exact-model primary sources, current China-market listings, and credible independent measurements. Secondary summaries are mainly for discovery.

A single reasonably attributable source is normally sufficient for a routine specification. Show supported values plainly in comparison fields; preserve source type, confidence, and caveats in details rather than prefixing ordinary values with labels such as `claimed`. Prefer a sourced value over a blank unless the source is mismatched, contradictory, implausible, or too ambiguous to identify the exact model or field. Material inference and uncertainty must still be explicit.

Editorial videos may identify research candidates and add build, ownership, or ride context. They cannot independently satisfy the publication gate or support a current price, exact BOM, specification, manufacturing relationship, or recommendation. Candidate leads discovered in videos must be deduplicated against published platforms, existing candidates, and exclusions.

Never infer specifications across generations, sizes, or similarly named models without evidence. Keep expected quality separate from confidence in that estimate. Do not create a universal score or imply that products from different categories serve the same use case.

Research completion is tracked per exact target and missing field. High-priority gaps normally receive up to three distinct public-post attempts and three distinct web/official attempts. Stop early when exact attributable evidence is accepted. Mark a gap temporarily exhausted only after every required channel reaches its attempt limit; record queries, routes, rejection reasons, search date, and a retry date. A temporarily exhausted search remains an unknown, never negative evidence. See `docs/research-stopping-policy.md`.

## 5. Price rules

- Every price has a date, exact variant, market/channel, type, conditions, and source.
- A foreign-currency official complete-bike list price may appear on a candidate only as a dated CNY reference estimate with the original amount and currency, conversion rate/source/date, and checkout/import caveat. It is not a China-market price observation.
- Add a new observation; do not overwrite price history.
- Distinguish observed checkout, official list, reference range, historical promotion, and estimate.
- A marketplace screenshot is an option-level listed-price observation, not a checkout total. Preserve the exact readable seller option label, package basis, and any truncation; never collapse materially different packages into one headline price or apply an unspecified bundle discount.
- Record coupons, subsidies, memberships, trade-ins, size/color limits, shipping, and other conditions when known.
- `data/meta.json.snapshot_date` is the last catalog-wide review date, not the date of every small edit.
- The reviewed default frameset allowance changes only with explicit maintainer approval and a dated rationale. A buyer-side calculator override is not an evidence or methodology change.

## 6. Media and privacy

- Third-party images may be remotely embedded only with source, owner, exactness, rights status, alt text, and documented failure behavior.
- A public-post photo may use `public-post-embed` only as a remote reference with the original owner credited, no redistribution license asserted, and no personal identity retained. It must never be downloaded into the repository or outrank an exact official image.
- A public XHS photo may use `public-post-quotation` only as a bounded editorial quotation that identifies and supports commentary about the exact bicycle profile. Use at most one selected photo from a post, keep it secondary to the analysis, link the exact original post, credit the original owner at that source, assert no license, and provide a public removal route. Public availability and attribution alone do not establish permission or make every reuse a valid quotation; if the editorial link or scope is doubtful, omit the image.
- `public-post-quotation` files are served only from the approved project media origin, never from GitHub. The public repository stores derivative URLs and metadata but no original or optimized third-party binary. The origin must expose content-addressed HTTPS WebP paths, disable directory listing and application access logs, and serve no application or user data.
- Each quoted image has one card derivative no wider than 480 px or larger than 40,000 bytes and one detail derivative no wider than 1,200 px or larger than 88,000 bytes. The renderer uses responsive selection so a catalog card does not download the detail file. Derivatives must be content-addressed, must not be upscaled, and may only be resized, compressed, or minimally cropped to remove private material; do not aesthetically alter evidence.
- Before upload, strip EXIF, XMP, ICC, GPS, and other embedded metadata. Visually reject any image containing a face, vehicle registration, account identifier, or visible location identifier. Record the review date, variant dimensions, byte counts, SHA-256 digests, and WebP format in the image record.
- Every image record targets exactly one published platform or one candidate. A candidate image may identify the model without promoting the candidate or resolving its missing publication evidence.
- Never commit third-party image files. Historical project-owned placeholder assets may remain in Git for data compatibility, but buyer-facing pages do not render them; permission-granted or compatibly licensed media requires a separate explicit contract change before local storage.
- Never present another configuration as exact.
- Scheduled image-health reporting checks every responsive derivative and fails on confirmed broken or wrong-content-type resources. Temporary blocking and network unreachability at unrelated third-party hosts remain non-fatal because the interface hides failed images without losing product facts; project-operated quoted-media failures block delivery.
- YouTube videos use a validated video ID and a click-to-load `youtube-nocookie.com` embed. Initial model-page rendering must not request a YouTube thumbnail, player, script, or iframe. The external YouTube link remains available without loading the embed.
- Do not publish names, accounts, contacts, addresses, order or tracking IDs, payment data, private messages, private permission correspondence, credentials, GPS, or EXIF metadata.

## 7. Acceptance criteria

Every change must preserve valid cross-references and pass:

```bash
npm run check
```

For UI changes, inspect desktop and mobile behavior, keyboard access, popovers, image-failure handling, video fallbacks, filters, and GitHub Pages base-path routing. Add or update focused tests for behavior changes. Do not add dependencies or top-level pages without a clear need and maintainer sign-off.

The static build enforces a documented homepage HTML/DOM budget so catalog growth cannot silently degrade the primary route. The 2026-08-17 unified 226-row catalog with internal candidate links measures 789,207 HTML bytes and 6,500 elements; it is capped at 820,000 bytes and 6,750 elements. Desktop and mobile browser checks are required when this baseline changes. Budget changes require a measured browser rationale.

Research bundles are evidence inputs, not publication authority. A dated marketplace snapshot may support an exact price observation, but a price is attachable only to the exact variant it identifies. Split or ambiguous trims remain candidates; screenshots, seller identities, and copied third-party images are never public data assets.

## 8. Information-retention contract

- `data/coverage-baseline.json` is a monotonic, machine-generated inventory of accepted record identities, populated evidence fields, record relationships, price coverage, and image quality.
- Run `npm run coverage:accept` after adding catalog information. The command may add protection or raise its minimum quality, but it must never erase an accepted identity, field, relationship, price target, or image-quality level.
- `npm run coverage:check` fails when accepted information disappears, an image becomes less exact or loses its protected source or hosting quality, an active bike loses its primary image or price coverage, or new information has not yet been added to the baseline.
- Correct a materially wrong record by adding the supported replacement and documenting the old identity in `data/retired-records/`. Each retirement needs a reason, active evidence, review date, and an active replacement when one exists.
- Retirement records authorize only the named identity removal. They do not authorize an active bike to lose protected price, evidence, fact, or image coverage.
- CI publishes a before-and-after coverage report for review. Baseline, retirement, and guard changes require code-owner review on branches where GitHub branch protection enforces CODEOWNERS.
