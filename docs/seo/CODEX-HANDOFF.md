# Codex handoff: bilingual China Bikes SEO release

## Task
Integrate the supplied SEO patch into the current `p0s/china-bike-research` checkout on a feature branch, validate it, and prepare a pull request. Preserve newer work; do not replace the current repository wholesale with the supplied source snapshot. Do not push directly to `main`, force-push, or automatically merge/deploy without the user's approval.

The user approved approximately 70% China-based buying intent, 30% international research; English plus Simplified Chinese; and four starter posts. Keep the current domain `https://china-bikes.p0s.eu`. No backend, tracking, affiliate funnel or new production dependency is required.

## Input and compatibility
The patch is based on the uploaded `china-bike-research-main(1).zip`, SHA-256:
`1b45bee75dc9cd6091e0fad446317ab9863fcbe896f6c77cdbba1ffd6e0a4619`.

The full source ZIP is a convenient reference, not an instruction to overwrite a newer checkout. The patch contains no changes to `data/`, source facts, observed prices or evidence-review dates.

1. Read `AGENTS.md`, `VISION.md`, `SPEC.md` and `docs/seo/IMPLEMENTATION-PLAN.md`. Inspect the working tree and preserve unrelated/uncommitted changes.
2. Create a feature branch from the appropriate up-to-date base. Check whether any equivalent work already exists.
3. Run `git apply --check` against the patch. Apply only if compatible; otherwise reconcile the changed files manually without reverting newer catalog records or features.
4. Inspect the diff. Retain stable model IDs, source links, per-build distinctions, uncertainty, privacy behavior and query-addressable filters/comparison/builds.
5. Run the commands below. Inspect English and Chinese desktop/mobile pages. The exact outputs in `docs/seo/RESULTS.md` describe the supplied snapshot, not a guarantee for a later checkout.
6. Commit to the feature branch, push that branch and open a pull request. Report its URL, checks and any unresolved differences. Merge only after required checks pass and approval is available; GitHub Pages deploys from `main` afterward.

Example patch application (set the downloaded patch's actual path):

```sh
git switch -c seo/bilingual-buyer-guides
PATCH=/path/to/china-bikes-seo-2026-09-18.patch
git apply --check "$PATCH"
git apply "$PATCH"
```

Do not substitute a destructive reset if the patch does not apply.

## Validation and preview
Use the repository's `.nvmrc`; there are no new npm production dependencies.

```sh
PUBLIC_BASE_PATH='' PUBLIC_SITE_URL='https://china-bikes.p0s.eu' npm run check
PUBLIC_BASE_PATH='/china-bike-research' PUBLIC_SITE_URL='https://p0s.github.io' npm run build
npm run seo:check
# Restore a root build and start the existing local preview:
PUBLIC_BASE_PATH='' PUBLIC_SITE_URL='https://china-bikes.p0s.eu' npm run dev
```

Optional development browser checks use the repository's existing Python/Playwright setup and a disposable Chromium, never a personal research browser:

```sh
python tests/reliability-browser.py --reports /tmp/china-bikes-regression
python tests/bilingual-browser.py --reports /tmp/china-bikes-bilingual
```

The browser scripts use generated HTML, real CSS/JavaScript and explicit URL/history/storage fixtures. Remote media and browser navigation are blocked in this environment. These are DOM/interaction checks, not live production navigation or crawler measurements.

Important routes: `/`, `/zh/`, `/blog/`, `/zh/blog/`, both versions of all four article slugs, `/build/`, `/zh/build/`, an exact published model and an unfinished candidate. Check the language switch with an active comparison/filter, mobile table scrolling, `robots.txt`, `sitemap.xml`, and View Source for a native Chinese article without JavaScript.

## Search Console: owner action required
The code is ready; no Search Console property has been created or verified, and no sitemap has been submitted.

1. In Google Search Console, add a **URL-prefix** property for `https://china-bikes.p0s.eu/`.
2. Choose **HTML tag** verification and copy only the token inside the `content` attribute, not the whole tag. This method is for a URL-prefix property; a Domain property uses DNS instead.
3. In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables → New repository variable**. Name it `GOOGLE_SITE_VERIFICATION` and paste the token as its value. This is a public ownership token, not an analytics identifier or API credential.
4. Deploy the release through the normal pull-request workflow. `.github/workflows/deploy-pages.yml` passes the variable into the build; `src/lib/html.mjs` renders the verification meta tag. Keep it present after verification.
5. Confirm the public homepage's HTML contains the tag, return to Search Console and press **Verify**.
6. Submit `sitemap.xml` for the verified property. Inspect the homepage, `/zh/`, and one article in each language. Request indexing for a few priority pages; do not bulk-submit research pages marked `noindex`.

The build reads environment variables. `.env.example` documents them; creating a `.env` file alone does not load it automatically. Local token testing, when needed:

```sh
GOOGLE_SITE_VERIFICATION='YOUR_PUBLIC_TOKEN' \
PUBLIC_SITE_URL='https://china-bikes.p0s.eu' npm run build
```

## Editorial maintenance
Articles live in `content/posts/` with paired `en` and `zh-Hans` text. Their date is 2026-09-18, the preparation date. If first publication is later, set the actual publication/modification dates at release; do not advance catalog price/source dates.

Chinese UI, core pages, published-model verdicts, candidate summaries and the four article bodies are supplied. Some original source titles, detailed research annotations and price conditions remain English and are disclosed. `locales/zh-Hans/README.md` describes the remaining translation boundary. Do not describe this as a translation of every research record.

Model references and sources are validated at build time. Tables read the current catalog, but narrative still requires an editorial review when facts change. Never imply a table refresh automatically rechecks every paragraph.

## Primary documentation consulted
- Google ownership verification: `https://support.google.com/webmasters/answer/9008080?hl=en`
- Google localized-page annotations: `https://developers.google.com/search/docs/specialty/international/localized-versions`
- Google sitemap guidance: `https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap`
- GitHub repository variables: `https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables`
