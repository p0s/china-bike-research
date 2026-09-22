# Bilingual articles and Search Console integration

## Provenance and scope

Integrated the supplied `china-bikes-seo-2026-09-18.zip` (SHA-256 `f7eb4a015c0409d784b5e90dbb6f7c172bdec72662e7684835995416e02f24f0`) against main commit `cfe5df27a9372e37673efb439d40b9f3685e432b`.

The package's catalog records matched this base exactly. Only its 11 changed implementation/contract files and 16 added editorial/localization/test/documentation files were imported. The Arden drivetrain-specific clearance correction remains intact. No catalog record, price observation, source-access date, image, dependency manifest dependency, or research ledger was changed.

Article publication/modification dates and the new translation last-modified baseline are September 22, the integration/publication date. Underlying evidence dates are unchanged. The source package's preparation-stage reports remain historical evidence.

## Behavior

- Four source-linked buying articles in English and Simplified Chinese, with catalog-derived tables, dated evidence, organization bylines, limitations, contextual links and BlogPosting metadata.
- Build-time Chinese routes under `/zh/`, reciprocal language annotations, self-canonical URLs and language switching that preserves URL state.
- A shared evidence gate controls candidate indexing and sitemap inclusion; unpublished research remains accessible without inventing missing facts.
- Optional public Search Console verification via the `GOOGLE_SITE_VERIFICATION` Actions variable; no tracking, backend or production dependency.

## Validation

- Complete `npm run check`, invoked through the host's verification wrapper: 284 tests passed, plus privacy, data, research, information-retention, static-build and SEO checks. Local Node version: 26.9.0; hosted validation uses the repository's Node 22 configuration.
- Root build: 584 HTML pages, 450 indexable URLs and 134 noindex pages. Canonical URLs, language counterparts, unique titles, indexable descriptions and embedded JSON passed the generated-site audit.
- Bilingual browser suite: 20 passed, including desktop/mobile layout, filters, comparison, builder state, language links and Chinese content without JavaScript. Rendered English desktop and Chinese mobile articles were visually inspected.
- Existing reliability browser suite: 30 cases passed across the initial 26 passing cases and four focused gallery/thumbnail reruns after adding missing Pillow to the temporary test environment. No application fix was needed.
- GitHub project-subpath build and SEO audit passed with the same 584/450/134 page counts; both language/filter state checks passed with `/china-bike-research` as the deployment base.

The first full-gate attempt was blocked by sandbox loopback permissions in seven preview-server tests; the same gate passed with loopback access. Browser checks use disposable profiles with remote page requests blocked. These checks do not establish Google indexing or ranking improvements.

## External setup and delivery boundary

The public verification token was read from the user-opened Search Console property flow and saved to the exact repository Actions variable, with API readback. Verification requires the deployed homepage to expose the token. PR checks, Pages deployment, ownership verification and sitemap acceptance are read back separately during delivery; a successful build alone proves none of those states.
