# China Bikes: SEO + Chinese + starter articles

Integrated for publication on 2026-09-22 from the supplied September 18 source package. See [integration evidence](docs/seo/INTEGRATION-2026-09-22.md) for current validation and delivery boundaries.

`docs/seo/RESULTS.md` and `docs/seo/CODEX-HANDOFF.md` preserve the preparation-stage results and handoff. Their deployment status describes that historical package, not the current release.

This release keeps existing English routes, adds native Chinese pages under `/zh/`, adds four evidence-linked posts in both languages, and aligns sitemap/indexing behavior. Existing data records are unchanged.

Preview with the Node version in `.nvmrc`:

```sh
PUBLIC_BASE_PATH='' PUBLIC_SITE_URL='https://china-bikes.p0s.eu' npm run dev
```

Open the address printed by the existing preview server. `/blog/` and `/zh/blog/` contain the starter posts. No new npm production dependency is needed.

Search Console HTML verification uses the public token stored in the repository's `GOOGLE_SITE_VERIFICATION` Actions variable. Keep this variable in place after verification so subsequent deployments retain the ownership tag. It adds no analytics or visitor tracking.

Detailed original-language evidence notes are not all translated. This is explicitly disclosed in Chinese model pages and documented in `locales/zh-Hans/README.md`.
