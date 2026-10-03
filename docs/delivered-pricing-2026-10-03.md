# Delivered-price catalog, 2026-10-03

## Frozen batch

Implement the accepted compact price-cell option: delivered total first, China domestic price and percentage underneath, with independent shipping destination and currency. Preserve images, category facts, comparison, strict budgets, build references and URL/history behavior in English, Chinese and German. Keep the static site and existing dependencies.

Bounded evidence work: one exact model, SAVA GELARO S4 GRX400; two new offer observations and three public sources. Preserve all earlier observations. Finish with focused tests, the complete repository gate, desktop/mobile inspection and feature-branch PR delivery. No address, checkout, fresh domestic-price observation or manual production deployment is included.

## Evidence and route limits

- [US product listing](https://savadeck-bike.com/products/sava-gelaro-s4-grx400-carbon-gravel-bike-us): USD 1,699, visible white 47 cm option, USA warehouse, GRX400 2×10. Product-page delivery/tax claims support an estimate, not a verified checkout total.
- [Factory product listing](https://savadeck-bike.com/products/sava-gelaro-s4-grx400-carbon-gravel-bike): USD 1,799, visible grey 47 cm option, factory route, GRX400 2×10.
- [Shipping policy](https://savadeck-bike.com/policies/shipping-policy): US warehouse delivery excludes Alaska, Hawaii, territories and remote locations. Factory free shipping with seller-covered duties/taxes supports standard-address estimates for Bulgaria, Croatia, Denmark, Finland, Greece, Luxembourg, Malta, Portugal, Slovakia, Sweden, the UK and Mexico. Germany, France, Italy, Austria, Belgium, Czechia, Hungary, Poland, Slovenia, Spain and the Netherlands are excluded. Ireland/Romania retain buyer-paid duties; other unsupported totals remain incomplete.

All three sources were read on 2026-10-03 in Singapore, still 2026-10-02 UTC. Observation/access dates use the actual UTC day, matching the build freshness cutoff; record IDs identify the local batch date. The linked shipping policy is more restrictive than general product-page wording and governs this observation. Final checkout, remote surcharges, size/color stock and payment conversion are unverified. New country-scoped observations explicitly supersede the broader 2026-10-02 listings; they do not delete history.

The domestic comparison uses the existing 2026-08-08 Tmall GRX hydraulic option observation of CNY 7,999, with its coupon/conditional-price caveat. It is not a new October China-price verification. The newer CNY 12,089 record is a conversion of an overseas USD price and is kept as a catalog reference, never called a domestic price. CNY 14,756 for the JAVA G5 has the same foreign-conversion limitation; no domestic G5 price is invented.

FX continues to use the existing immutable 2026-10-01 ECB snapshot. Converted amounts and seller-supported delivery totals carry `≈`. No source or rate date was silently refreshed.

## Behavior

- Country hints are suggestions: explicit link, saved manual country, existing edge country, country-specific timezone, explicit locale country, then choose destination. Language and UTC offset alone do not establish China. Currency and interface language remain independent.
- The contiguous-US selector makes the recorded route limitation explicit without collecting an address. Unsupported and partial totals have no complete-price numeric value or China percentage.
- Only a matching complete bike and comparable domestic observation within 90 days get a percentage. The denominator is delivered price: `(delivered − China equivalent) / delivered`. China can also be more expensive; ranges keep interval bounds.
- Chinese shoppers see domestic prices first. Missing domestic observations retain an explicit catalog reference. Frameset quotes and China build allowances remain accessible without becoming foreign complete-build delivery quotes.
- Sorting, strict budgets, comparison and history follow the selected currency. Unknown totals sort last in either direction. Existing photos and facts are retained.

## Validation

- Focused pricing, render, interaction-state and build-driver tests passed. Sixteen pricing tests cover country suggestions, genuine domestic prices, route restrictions, incomplete/confirmed/estimated totals, intervals, stale/future evidence and frameset separation.
- Rendered browser checks passed 63 country/area/language/viewport cases (English, Chinese, German; 1,600, 390, 320 px), retaining 263 rows and 141 images. Longer price labels and China sublines wrap within their columns; no document or price-cell overflow remains.
- Eleven interaction checks passed for timezone suggestions, manual-only storage, independent currency/destination, native and converted strict budget boundaries, zero ceiling, comparison, keyboard focus/popovers, back/forward history, model return links, legacy links, policy-link deduplication, and unchanged frameset quotes alongside editable build references. Numeric native selects/fields were exercised through their DOM change handlers; keyboard proof covers focus, Tab, Enter, filter-panel opening and popover dismissal.
- The homepage measured 712,514 bytes and 7,154 elements. The byte cap stays 750,000; the element cap rises from 7,100 to 7,400 for 257 additional native country/control elements, preserving a similar growth margin. No new package or service was added.

`npm run check` passed: 427 tests, privacy/data/research/coverage checks, 885 generated pages and the SEO audit (687 indexable, 198 noindex). The initial sandbox attempt passed 420 tests and failed seven localhost preview-server tests with `EPERM`; the same full gate passed with localhost access. All 77 original CNY price observations and 244 primary image records remain protected. Outgoing branch privacy is checked separately after the signed commit.
