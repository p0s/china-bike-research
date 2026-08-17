# Catalog data-gap plan and completion record — 2026-08-17

## Objective

Make the catalog materially more useful without converting uncertain leads into facts. Every improvement must identify an exact model or platform, cite a current source, distinguish mainland prices from foreign references, preserve unresolved fields, and attach image provenance instead of copying third-party files.

## Prioritized execution plan

1. **Protect existing information first.** Keep the monotonic coverage baseline, protected-field checks, image counts, source counts, and explicit retirement records as the merge gate. Any future loss of a source, price, fact, image, or exactness level must fail validation unless it is intentionally retired with a reason.
2. **Resolve identity before filling fields.** Start with high- and medium-priority candidates, select one exact SKU where an official page supports it, and never merge sibling trims, generations, or markets. Generic family records may use exact-platform imagery only with a visible trim caveat.
3. **Prefer mainland primary evidence.** Capture official CNY list/suggested-retail prices, exact BOM, weight, BB, clearance, geometry, sizes, stock/dealer route, and warranty text. A price is catalog-visible only when it maps to the exact candidate. Dealer stock and checkout remain separate unresolved facts unless actually verified.
4. **Use global manufacturer evidence as reference, not China proof.** Global pages can fill identity, components, weight, standards, geometry, and official imagery. Foreign prices stay in source notes unless a dated, sourced conversion record satisfies the schema; they never masquerade as mainland checkout prices.
5. **Fill images with provenance.** Use exact official product images when possible, then exact-platform official images with a display caveat. Store remote URLs, official source page, copyright holder, credit, alt text, subject accuracy, rights status, and fallback behavior. Do not copy image files without documented reuse rights.
6. **Use public community evidence only for discovery and market context.** Retain sanitized public URLs and privacy-safe summaries for ownership, build, and price leads. Give these records low price/specification authority and require official or exact dealer confirmation before publishing claims.
7. **Re-run the queue after each batch.** Generate the gap report, prioritize high-impact exact models, and work in this order: missing exact image; missing source; missing mainland price; complete weight; frame weight; BB; clearance; BOM; geometry; purchase/warranty route.
8. **Validate the rendered product.** Run privacy, schema, monotonic coverage, tests, build, desktop/mobile inspection, and strict remote-image health. Reject broken, tiny, sibling-trim, inaccessible, or rights-unclear image candidates.

## Completed in this batch

- Added exact mainland prices for major Giant, Merida, Trek, Specialized, Quick Pro, PARDUS, SEKA, and Tavelo configurations. Frameset/package prices stay distinct from complete bikes, and older dated observations remain in place.
- Added dated official global reference prices and substantive specifications for Canyon, ELVES, SAVA, Tavelo, Winspace, Quick Pro, Specialized, and other exact builds without presenting them as mainland checkout quotes.
- Added 21 candidate records, including distinct Quick Pro framesets, Specialized Crux/Roubaix trims, new public-build leads, and separate LightCarbon Speed7 complete-bike and frameset records.
- Added 52 remote image records over the starting snapshot. Exact official imagery is preferred; five exact public-post images remain remote-only, credited, visibly caveated, and lower-ranked than official imagery.
- Added internal detail pages for every distinct candidate. Each page keeps its short version, price basis, hardware, strengths, trade-offs, unknowns, and key facts visible while collapsing only the raw source ledger.
- Rechecked all 100 exact-model screenshot-bundle records. Ninety-five already mapped to current records, LightCarbon Speed7 was split into two candidates, and two tenfold price transcription errors were corrected to ¥2,100 and ¥1,500.
- Strengthened monotonic coverage so record identities, facts, prices, sources, relationships, image quality, remote hosting, and frameset-price metadata cannot silently regress.
- Kept promotional, custom-build, foreign-market, secondary-report, and public-community observations visibly separate from authoritative mainland facts, preserving every remaining unknown instead of filling it by inference.

## Quantitative result

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| Source records | 121 | 229 | +108 |
| Primary image records | 61 | 113 | +52 |
| Candidate-targeted images | 26 | 78 | +52 |
| Distinct catalog candidates without a dedicated image | 151 | 111 | -40 despite 21 new candidate records |
| Candidate `source-missing` gaps | 126 | 88 | -38 |
| Candidate `price-missing` gaps | 30 | 23 | -7 |

## Remaining blockers

- 111 distinct catalog candidates still lack a dedicated image, while nine alias candidates intentionally use an existing published record's image.
- High-priority exact-image blockers now center on Quick Pro TR:ONE and TT ONE, LightCarbon Speed7, SAVA A4, SEKA Spear RDC, Tavelo Arden, and the separate Giant Propel Gen 4 lead. Verified official or directly attributable remote assets were not exposed for these exact records.
- Many popular global models still lack a verifiable mainland SKU, current CNY checkout, stock, duties/returns, or local warranty route.
- Published records still have 34 geometry gaps, 23 frame-weight gaps, 17 BB gaps, 11 complete-weight gaps, nine incomplete BOMs, and seven weak/non-exact primary-image relationships.
- Current manufacturer pages sometimes conflict on global price or components; these conflicts remain explicit until one exact market/variant explanation is verified.

## Next research queue

1. Exact official images for the remaining high-priority blockers above, then Voicevelo G Major, BIGROCK Sohtea, INCOLOR SSR, ELVES Mori-family and Tavelo Arow SL leads.
2. Official mainland price and purchase-route confirmation for the remaining 23 price-missing candidate groups.
3. Exact official BOM/weight/BB/geometry extraction for Trek Checkpoint and Domane, then Winspace G3 and other high-visibility complete bikes.
4. Published-variant cleanup for the seven weak images and the highest-priority geometry/weight/BOM gaps.
5. A fresh strict image-health run before every content merge and scheduled weekly health verification afterward.
