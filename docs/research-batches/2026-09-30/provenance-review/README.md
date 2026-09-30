# Additive provenance review — 2026-09-30

Base: `5cd38b9c8ce480e98c3c325e70f579d2c068d196` (merged PR #151).

The user authorized the preservation-first implementation: strengthen provenance and confirm suspected issues without losing existing data. This first batch has one writer and six targets: LightCarbon LCG071S Pro, PARDUS Super Sport Gen2, SPcycle G026, and the PARDUS, TRINX and XDS brand manufacturing descriptions. No catalog entry, price, image, source, research record, original fact, confidence label or review date is removed or replaced.

## Frozen steps and acceptance criteria

1. Freeze every tracked `data/` and `assets/` file against the immutable merged base, including its Git blob, SHA-256 and byte count.
2. Read the existing gap report and exact attributable source pages, one target at a time.
3. Add dated source records, source links and qualifications. Preserve original numeric geometry and every historical statement; do not calculate replacement specifications.
4. Add a value-preservation check that catches changed or removed nested values, array items, record files and assets. Reuse the existing monotonic guard for generated coverage metadata.
5. Run focused validation, the preservation comparison and the complete repository gate once. Inspect generated qualifications and source records for the three exact model pages.
6. Deliver the exact candidate through a signed feature-branch commit and PR, verify required checks and merge. This batch ends at delivery; remaining research is separately bounded.

Done requires zero losses in the preservation comparison, a passing coverage transition, passing repository checks, dated attributable evidence for every qualification and verified merged delivery.

## Evidence and outcomes

| Target | Result | Action |
| --- | --- | --- |
| LightCarbon LCG071S Pro | Stored table matches the live manufacturer chart. Front-center/chainstay/drop/wheelbase consistency remains unclear by about 5 mm under common definitions. | Retain all dimensions; append a fit caveat and dated evidence review. |
| PARDUS Super Sport Gen2 | Stored table matches the live SUPG2 SPORT—105 table, including XXS/S dimension discrepancies and XL seat tube 645 mm. | Retain all dimensions; append a size-specific confirmation caveat. Do not transfer the 105 branch's material/BOM to eGR. |
| SPcycle G026 | Stored values match the live attributed 2025 Bike Insights table. XL direct front-center 691 mm and derived horizontal front-center 700.7 mm conflict. The manufacturer page now presents 2026 branding; matching that revision to the old table is unproven. | Retain the attributed table and add a generation/dimension qualification. No replacement geometry inferred. |
| XDS | The Shenzhen government-hosted 2026-03-27 profile supports manufacturing, inspection and traceability disclosures. | Link the retained source and a dated recheck; distinguish company capabilities from exact-model test proof. |
| TRINX | The live company profile supports Trinity ownership, production and testing disclosures. The retained factory visit is dated 2020-05-27. | Link both existing sources and the dated company-page recheck; preserve the historical report's age. |
| PARDUS | The live company page supports group identity and descriptions of EPS+, EPS and HPT. It does not establish the old summary's comparative “strongest” wording. | Preserve the original summary; attach a qualification limiting its evidential scope and link the sources. |

The geometry consistency calculations are diagnostic leads, not published manufacturer specifications. No supplier was contacted. Raw pages and inspected manufacturer images stay local, outside Git; only sanitized summaries and page digests are committed. The inspected G026 page images did not provide a replacement geometry chart. No new image or price is published.

## Reproduce preservation proof

```sh
node scripts/check-data-preservation.mjs --base 5cd38b9c8ce480e98c3c325e70f579d2c068d196 --manifest docs/research-batches/2026-09-30/provenance-review/baseline-manifest.json
npm run coverage:check
```

`baseline-manifest.json` freezes 5,014 files, including all 4,506 data JSON records. The check verifies that this manifest still matches the immutable base. Unchanged files must retain their SHA-256; changed source JSON must retain every original value, including duplicate array entries, dates and unknowns. Existing assets and non-JSON data must remain byte-identical, except the shared translation dictionary may add lines only while retaining every original line in order. The three new caveats receive reviewed Chinese translations without rewriting old phrases. `data/coverage-baseline.json` is a generated inventory, so its counters and additive protection are verified separately by the repository's monotonic coverage gate; its original bytes remain hashed in the manifest and stored in the immutable base.

## Remaining audit work

This is not a claim that all remote source facts have been freshly certified. The remaining 25 unlinked brands, 60 latest conflicted fields, complete-bike BOM and other core gaps, recommendations, and visual/media provenance reviews remain separate bounded work. Preserve unknowns and all old records when addressing them. Reopen blocked or extended-campaign research only with the required new source lead and frozen route budget.
