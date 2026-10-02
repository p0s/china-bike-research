# Regional prices and table decisions, 2 October 2026

Scope: one writer, two exact models, three new listing observations. Retain the existing homepage order, all photos, comparison facts, China price history and build methodology. Add a regional price preference, current-source regional offers, dated FX fallback, currency-aware sorting/filtering/comparison and desktop/mobile proof. No dependency, new service, location permission or deployment configuration.

## Evidence

| Exact variant | Observed listing | Supported destinations in the opened page | Basis and limits |
| --- | --- | --- | --- |
| SAVA Gelaro S4 GRX400 2x10 | [US listing](https://savadeck-bike.com/products/sava-gelaro-s4-grx400-carbon-gravel-bike-us), USD 1,699 | USA only | Complete bike, visible white/47 cm option, USA warehouse. The page claims tax included and free shipping but also defers shipping to checkout. Address-specific total and selected stock unverified. |
| SAVA Gelaro S4 GRX400 2x10 | [Factory listing](https://savadeck-bike.com/products/sava-gelaro-s4-grx400-carbon-gravel-bike), USD 1,799 | EU countries, UK, Mexico (USA also named; the separate US observation is used there) | Complete bike, visible grey/47 cm option. Seller claims free shipping and duties prepaid; not a verified final checkout. Canada/non-EU Europe not established. |
| Winspace G5 Gravel | [Frameset listing](https://www.winspace.cc/products/g5-gravel), USD 2,200 | USA, EU member states, UK | Frameset, not a complete bike. Shipping notes name those routes and US/Europe warehouses; exact shipping deferred to checkout, listed lead time 15–20 business days. Canada not established. |

All pages accessed on 2026-10-02. Source and price records retain original currency and dates. Other models and unsupported destinations retain a labeled conversion fallback rather than invented local offers.

[ECB daily table](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html), accessed 2026-10-02, displays **1 October 2026**: 1 EUR = USD 1.1298, GBP 0.85373, CAD 1.6095, CNY 7.5748, MXN 20.5251. Static snapshot, reference purpose only; rates are not payment guarantees.

[MDN navigator.language](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language) defines the browser preference, not location. [Cloudflare request.cf](https://developers.cloudflare.com/workers/runtime-apis/request/) supplies the existing server's coarse country hint. The catalog may receive that hint on private uncached HTML; it is not persisted. Manual shopping choices do not change analytics consent. Static GitHub Pages builds use the locale-country suggestion plus override.

## Table recommendation from buyer decisions

The buyer first needs to identify the exact bike, establish cost, rule out unsuitable fit/use, then compare equipment and ownership constraints. Every field should answer one of those questions without mixing frames and complete bikes.

| Buyer decision | Recommended overview column | Current information to preserve |
| --- | --- | --- |
| Is this the exact build I am considering? | Bike, photo and package | Exact model/configuration, category badge, candidate status, source image and credit |
| What can I afford in my market? | Full-bike price/reference | Applicable dated complete-bike offer, otherwise explicit FX reference; separate frame offer, CNY basis, range and adjustable build estimate |
| Can it handle my roads and tires? | Tire clearance | Numeric maximum, front/rear and drivetrain restrictions, observed fitted tire kept distinct |
| What equipment do I get or need? | Drivetrain for bikes; package/standards for frames | Exact gearing/shifting for a complete bike; included parts, BB/hanger standards and build caveats for a frame |
| What weight is being compared? | Weight with basis | Complete-bike vs frame/package, size, claimed vs measured, included/excluded parts |
| Will it work with my components and ownership plans? | Compatibility | Existing frame standards and material; support or availability only when exact-market evidence exists |

Keep the compact selection checkbox at the left. The current category-fact column often repeats the category/use already under the model name for road/gravel entries; it is valuable for MTB suspension, e-road motor/battery and folding dimensions. A later focused layout change should show those category columns only in the relevant context and retain discipline/use in details and inline comparison. Do not add a universal stiffness/quality score or a wide always-visible EU + US + China set of columns.

This batch implements the price-column behavior while preserving the existing column set. The broader adaptive-column proposal above is a separate layout decision. English, Chinese and German labels and disclosures are included.

## Validation

- `npm run check` passed: privacy, dataset/research/coverage validation, all 418 tests, 885 built pages and SEO audit (687 indexable, 198 noindex). Localhost-based tests ran on the approved host path after sandbox `EPERM`.
- Dedicated research Chrome: 36 combinations of English/Chinese/German, 1600/390/320 px, and US/EU/UK/Canada. All retained 263 rows and 141 catalog images without horizontal overflow. US/EU offers and Canada fallbacks matched the intended eligibility.
- Additional browser checks passed for an exact legacy CNY budget boundary, USD 1,698 exclusion/USD 1,699 inclusion, keyboard filter activation, focusable region selection, region override and Back/Forward comparison currencies, changed frameset allowances retaining the same native offer, China-basis restoration, and German mobile tire labels. Region change was exercised through the select's change event; native OS select-menu keyboard selection was not automated.
- The final homepage measures 702,742 bytes and 6,897 elements against the unchanged 750,000-byte/7,100-element budget. A returning-browser check exposed stale catalog caching; content hashes now bind both JSON requests to the built data.
- No model facts, photos, existing CNY price observations or build allowances were removed. The added listings cover two exact models; wider regional offer coverage remains unknown.
