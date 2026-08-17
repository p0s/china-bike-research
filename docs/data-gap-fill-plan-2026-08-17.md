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
- Added 62 remote image records over the starting snapshot. The latest ten close the Giant Propel Gen 4, Quick Pro TR:ONE and TT ONE, SAVA A4, SEKA Spear RDC, Tavelo Arden and Arow SL, BIGROCK Sohtea, INCOLOR SSR, and Voicevelo G Major gaps. Exact official imagery is preferred; five exact public-post images remain remote-only, credited, visibly caveated, and lower-ranked than official imagery.
- Added internal detail pages for every distinct candidate. Each page keeps its short version, price basis, hardware, strengths, trade-offs, unknowns, and key facts visible while collapsing only the raw source ledger.
- Rechecked all 100 exact-model screenshot-bundle records. Ninety-five already mapped to current records, LightCarbon Speed7 was split into two candidates, and two tenfold price transcription errors were corrected to ¥2,100 and ¥1,500.
- Strengthened monotonic coverage so record identities, facts, prices, sources, relationships, image quality, remote hosting, frameset-price metadata, and every recorded research-attempt entry and accepted source cannot silently regress.
- Added 325 atomic field records covering 609 public-post attempts and 606 web/official attempts. All 83 previously unrun web lanes were completed in a fourth pass. A field can be called temporarily exhausted only after three distinct attempts in every required channel, and successful evidence, conflicts, blocks, and retry dates remain explicit.
- Added exact-model or exact-generation detail facts for Bianchi Oltre Race, ELVES Falath R7170, PARDUS Super Sport Gen2 eGR, Giant Propel Gen 4, Quick Pro TR:ONE and TT ONE, SAVA A4, and SEKA Spear RDC. Foreign prices and unresolved trim mappings remain references rather than mainland facts.
- Expanded published model pages with a concise specification snapshot for bottom bracket, wheels, tires, cockpit, fit range, and purchase route when those facts are supported.
- Kept promotional, custom-build, foreign-market, secondary-report, and public-community observations visibly separate from authoritative mainland facts, preserving every remaining unknown instead of filling it by inference.

## Quantitative result

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| Source records | 121 | 320 | +199 |
| Primary image records | 61 | 123 | +62 |
| Candidate-targeted images | 26 | 88 | +62 |
| Distinct catalog candidates without a dedicated image | 151 | 101 | -50 despite 21 new candidate records |
| Candidate `source-missing` gaps | 126 | 83 | -43 |
| Candidate `price-missing` gaps | 30 | 19 | -11 |

## Remaining blockers

- 101 distinct catalog candidates still lack a dedicated image, while nine alias candidates intentionally use an existing published record's image.
- The remaining high-priority exact-image blockers are the LightCarbon Speed7 complete-bike and frameset candidates. The only medium-priority blocker is the ELVES Mori community lead.
- Many popular global models still lack a verifiable mainland SKU, current CNY checkout, stock, duties/returns, or local warranty route.
- Published records still have 30 geometry gaps, 22 frame-weight gaps, 12 BB gaps, five complete-weight gaps, five incomplete BOMs, and seven weak/non-exact primary-image relationships. The exact Falath R7170 frame claim is now surfaced from its variant record rather than counted as missing.
- Current manufacturer pages sometimes conflict on global price or components; these conflicts remain explicit until one exact market/variant explanation is verified.
- Web/official-source attempt budgets are complete for this batch. The ledger currently has 22 open atomic fields, all waiting on public-post work; the canonical local capture extension is enabled, but the first signed-in search in the current window reached Security Verification, so the lane is paused until a later research window or confirmed normal access.

## Next research queue

1. Exact official images for the two LightCarbon Speed7 candidates, then the ELVES Mori-family lead and the highest-visibility low-priority exact models.
2. Official mainland price and purchase-route confirmation for the remaining 19 price-missing candidate groups.
3. In a later normal-access window, process the next public-post field one at a time with `npm run research:queue -- --channel public-post --channel-status not-run --limit 1`; the current next item is the PARDUS Super Sport Gen2 eGR frame-weight field.
4. Exact official BOM/weight/BB/geometry extraction for Trek Checkpoint and Domane, then Winspace G3 and other high-visibility complete bikes when new exact-source leads appear.
5. Published-variant cleanup for the seven weak images and the highest-priority geometry/weight/BOM gaps.
6. A fresh strict image-health run before every content merge and scheduled weekly health verification afterward.
