# Blog images — 2026-09-22

- Added one index banner and four topic-specific covers, shared between English and Chinese. Covers also appear in the article list, Open Graph/Twitter previews and BlogPosting image metadata.
- All five images are original AI-generated editorial illustrations, not exact-model photographs or technical evidence. Captions and the image-credits page disclose this.
- Optimized assets live in `assets/blog/` (about 1.7 MiB total). Final prompts, source hashes, localized alt text and derivative metadata live in `content/blog-images.json`. Exact derivative hashes are pinned in the privacy checker.
- No catalog facts, source observations or remote image URLs changed. Removed audience labels remain absent.
- Validation: `codex-pnpm-check check` passed 289 tests, data/privacy/coverage checks, a 584-page build and SEO audit. Unit coverage includes asset hashes and social-image paths in both locales under root and project base paths.
- Browser validation: `tests/bilingual-browser.py --case /blog/` passed 22 checks across all four posts and both indexes, English/Chinese, desktop/mobile, image decoding and recoverable image failures. Desktop and mobile screenshots were visually reviewed.
- Required `npm run image:report` ran once. All 212 existing remote resources reported fetch failures in the restricted network environment; this run does not establish their availability. New images are local and were verified independently.
