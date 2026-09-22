# SEO implementation results — 2026-09-18

## Delivery status
Implemented and validated locally against the uploaded repository snapshot. **Not deployed, not pushed, not connected to Search Console.** No ranking, traffic or indexing improvement has yet been measured. The source package and focused patch are for integration into the current checkout, not replacement of newer remote work.

The current domain stays `https://china-bikes.p0s.eu`. Editorial priority is approximately 70% people buying in China and 30% international researchers. English routes remain unchanged; Chinese uses `/zh/`.

## Changes

| Area | Implemented |
|---|---|
| Crawlable language versions | Build-time English and Simplified Chinese pages; native content does not depend on JavaScript translation. |
| Language discovery | Self-canonical URLs, reciprocal `en`/`zh-Hans`/`x-default` annotations, correct document/OG language and same-page switch preserving URL state. |
| Search presentation | More descriptive homepage/model metadata; zero duplicate titles across all 584 generated pages and zero duplicate descriptions among indexable pages in this build. |
| Research indexing | One shared evidence gate drives both robots metadata and sitemap eligibility. Unfinished profiles remain usable but are not promoted to indexable search destinations. |
| Editorial content | Four substantive buying articles, each in English and Chinese, with visible byline/dates, table evidence, sources, limitations, breadcrumbs and BlogPosting data. |
| Internal navigation | Blog in primary navigation, a guide link in homepage discovery, relevant model-to-article links and article-to-model/source/related-article links. |
| Verification | Optional `GOOGLE_SITE_VERIFICATION` environment variable wired through the Pages workflow. No tracking or automatic search-engine submission. |
| Regression protection | Added bilingual tests, generated-site SEO audit and optional bilingual browser regression script; SEO audit now runs in `npm run check`. |

The candidate index threshold (identity, default visibility, a public source and three meaningful facts) is a project editorial rule—not a Google requirement or guarantee of indexation. Error pages are also excluded.

## Starter articles

| Primary reader | English title | Planned route (add `/zh` for Chinese) |
|---|---|---|
| Buying in China | Gravel bikes around ¥5,000: Twitter Gravel V3 vs PARDUS Super Sport Gen2 | `/blog/gravel-bikes-around-5000-yuan/` |
| Buying in China | 38 mm tires on an aero road bike: check the drivetrain, not just the headline | `/blog/38mm-tires-on-aero-road-bikes/` |
| Buying in China | Frameset or complete bike in China? Compare the cost of a rideable build | `/blog/frameset-vs-complete-bike-cost-in-china/` |
| International researcher | Using Chinese bike prices from abroad: what a yuan figure does not include | `/blog/chinese-bike-prices-for-international-buyers/` |

These are evidence-led desk-research articles, not fabricated hands-on reviews or universal product rankings. Price tables derive from the catalog and preserve observation dates, package scope and recorded price basis. Domestic offers, public video observations, official prices and converted foreign references remain distinct. Narrative still needs editorial review after catalog changes.

No article claims that prices or stock were rechecked today. The September 18 article date is separate from the older evidence dates and should become the actual publication date if deployment occurs later.

## Chinese coverage and honest boundary
Translated navigation, common interface text, core reference pages, all 41 published-model verdicts, fact-grounded research-profile summaries, and all four article bodies. Original model names, source titles and some detailed research/price annotations remain in their original language; Chinese model pages disclose this clearly. This is **not** a complete translation of every research annotation in the archive. See `locales/zh-Hans/README.md`.

The site has no automatic language redirects. There is no new analytics, account, backend, paid SEO tool, external translation service or production dependency. No new third-party product image binaries were introduced.

## Validation actually run

- `PUBLIC_SITE_URL=https://china-bikes.p0s.eu npm run check` completed successfully: privacy, data validation, research-record validation, coverage protection, **284 Node tests**, build, and the generated-site SEO audit. An earlier tool execution timed out; the subsequent complete invocation exited 0.
- Existing offline Chromium regression suite: **30 passed, 0 failed**.
- Added English/Chinese desktop/mobile DOM, filters, comparison, builder, language-switch and no-JavaScript article checks: **20 passed, 0 failed**.
- Production-root build and GitHub project-subpath build both passed their internal-link validation and SEO audit.
- Project-subpath language/filter browser checks: **2 passed, 0 failed**, run separately from the full root suite.
- `git diff --check` passed. The patch contains **no changes to `data/`**. Existing source records, price observations, research fields and evidence dates are preserved.

| Generated result | Root domain | Project path `/china-bike-research` |
|---|---:|---:|
| HTML pages, including both languages | 584 | 584 |
| Sitemap/indexable URLs | 450 | 450 |
| `noindex` pages, including errors | 134 | 134 |
| English homepage bytes, uncompressed | 963,374 | 983,289 |
| Existing English homepage budget | 998,000 | 998,000 |
| English homepage elements | 7,352 | 7,352 |

The homepage is still a large, pre-rendered unified catalog. Remaining within its existing budget is not a claim of passing Core Web Vitals. No live Google rich-result test, field-performance measurement, deployed navigation test, backlink audit or search-volume measurement was performed. Chromium checks used generated HTML/CSS/JavaScript with explicit URL/history/storage fixtures and blocked remote navigation/media; they are not live production checks.

## Files and implementation map

- `assets/i18n.js`, `src/lib/i18n.mjs`: shared exact-text translations and safe local routing; raw source quotations/IDs are protected.
- `src/lib/html.mjs`: language-aware metadata, navigation, static layout and verification token.
- `src/render.mjs`: model/search metadata, Chinese buyer summaries, source-language disclosure and relevant guide links.
- `src/lib/indexing.mjs`: shared candidate index eligibility.
- `content/posts/*.json`, `src/lib/posts.mjs`: paired article content, reference validation, catalog-derived tables and article rendering.
- `scripts/build.mjs`, `scripts/audit-seo.mjs`, `package.json`: bilingual generation and enforceable SEO checks.
- `assets/site.js`, `assets/site.css`: language-state retention, dynamically generated UI translations and responsive article layout.
- `tests/bilingual-seo.test.mjs`, `tests/bilingual-browser.py`, existing renderer/build-fixture adjustments: regression coverage.
- `.github/workflows/deploy-pages.yml`, `.env.example`: public verification-token plumbing.
- `SPEC.md`, `START-HERE-SEO.md`, `locales/zh-Hans/README.md`, `docs/seo/*`: the updated product contract, scope and handoff.

## Remaining owner / production actions
Integrate on a feature branch, review and deploy through a pull request. Then complete Google Search Console URL-prefix verification and submit the sitemap using `docs/seo/CODEX-HANDOFF.md`. No ownership token is included in this delivery.

Only after deployment and verification can real search impressions, indexing coverage and click-through behavior inform the next iteration. Do not promise a fixed traffic increase or an indexing deadline. Chinese content does not itself establish Baidu inclusion; Baidu ownership, crawling and real mainland-network performance were not tested here.

## Sources of the implementation decisions
The uploaded repository supplied the product facts and source trail. Representative live pages were inspected for context; the deliverable does not claim to be a byte-for-byte merge with a newer remote checkout. Primary search-engine documentation consulted:

- `https://developers.google.com/search/docs/specialty/international/localized-versions`
- `https://developers.google.com/search/docs/crawling-indexing/block-indexing`
- `https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap`
- `https://developers.google.com/search/docs/appearance/structured-data/article`
- `https://developers.google.com/search/docs/fundamentals/creating-helpful-content`
- `https://support.google.com/webmasters/answer/9008080?hl=en`
- `https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables`
