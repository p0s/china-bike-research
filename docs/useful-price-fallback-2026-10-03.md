# Useful catalog price fallback — 2026-10-03

## Scope and acceptance

Presentation follow-up to delivered pricing, based on `12e2c64638dc3571e90e34881fc8bd32a29b8a02`:

1. Prefer a supported delivered total or delivery estimate.
2. Otherwise show the genuine domestic China price in the selected currency, with native yuan, conditions and observation date underneath.
3. Without domestic evidence, label the catalog amount `Reference estimate`; distinguish `China build estimate` and `Build reference` for frameset planning.
4. Retain native regional listings, policies, original price details, historical observations, photos and every comparison field.
5. Keep incomplete delivery totals out of strict delivered budgets and sorting. Identify that basis in sort and filter labels, and explain reference exclusions once above the catalog.
6. Localize English, Chinese and German; verify responsive rendering, comparison and keyboard interactions before PR delivery.

## Evidence and limits

No new price observations, exchange rates or product evidence were researched or added. Existing source dates and conditions remain unchanged. Converted overseas listings never become domestic China observations. Partial listings remain accessible, but cannot imply a shipped-to-door price or percentage comparison. Reference amounts exclude shipping and import charges.

## Validation

- `node --test tests/regional-prices.test.mjs`: 20 passing tests, including fallback provenance, complete-build allowances, delivered priority and unknown-price preservation.
- `npm run check`: 431 passing tests, data/privacy/research/coverage validation, 885 generated pages and passing SEO audit. The first sandbox run had seven loopback `EPERM` failures; the exact host retry passed.
- Isolated research Chrome: 63 destination/currency cases for SAVA, then 27 whole-catalog cases across all three languages at 1,600, 390 and 320 px. No document or price-cell overflow; 263 rows and 141 catalog images retained.
- Nine interaction checks passed: strict budgets and zero ceiling, currency conversion, independent destination/currency and browser history, inline comparison, frameset allowance updates, legacy currency handling, incomplete totals sorting last, keyboard/popovers, policy links/model return and German mobile rendering.
- Inspected desktop and German mobile screenshots. Homepage: 712,528 HTML bytes and 7,154 elements, within the existing 750,000-byte / 7,400-element budget.

Browser proof is from the local built site; it does not assert a production deployment or checkout verification.
