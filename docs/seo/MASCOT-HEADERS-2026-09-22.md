# Illustrated mascot headers — 2026-09-22

The blog banner, article cards, covers and sharing previews now use the five original cycling scenes with the recurring red panda integrated into the activity. The built-in OpenAI image generator edited the project-owned scenes using a shared character reference. The mascot welcomes riders, rides a gravel bike, checks a tire, assembles a frame and packs components.

Real manufacturer/retailer model images remain inside every English and Chinese article, with their original model links, credits and build-difference captions. No catalog evidence, source URL or observation date changed. Headers have no visible AI-image caption.

Implementation:
- `assets/blog/*-scene-*`: fifteen optimized assets, approximately 1.8 MB total, with 640/1600-pixel WebP and 1200-pixel JPEG versions.
- `content/blog-images.json`: final prompts, localized alt text, reference/output hashes and file metadata. Existing inline photo mappings and mascot cutouts are preserved.
- `src/lib/editorial-images.mjs`, `src/lib/posts.mjs`, `assets/site.css`, `assets/site.js`: responsive illustrated headers/social metadata, separate inline real-photo rendering, independent failure handling.
- `scripts/check-privacy.mjs`: hashes for the new project-owned assets. `SPEC.md` and `assets/blog/README.md` describe the corrected image roles.
- `tests/bilingual-seo.test.mjs`, `tests/bilingual-browser.py`: coverage for header/body separation, asset integrity, localization, base paths and failures.

Validation:
- Focused editorial tests: 23 passed.
- Full `npm run check` via `codex-pnpm-check check`: 291 tests passed, privacy/data/research/coverage checks passed, 584 pages built and SEO audit passed (456 indexable, 128 noindex).
- Isolated browser: 24 checks passed for English/Chinese desktop/mobile layouts, all local illustration decodes, all seven retained remote model images, independent failures, no JavaScript errors and no-JavaScript article content.
- Desktop and mobile screenshots were visually inspected. The screenshot harness resets scroll/focus between pages so a previous gallery capture does not move the sticky header into later full-page captures.
- `npm run image:report` ran once; sandbox networking made all 212 remote URLs unreachable. This is not a claim of broken URLs. No remote image reference changed, and the browser loaded all seven article photo URLs successfully.

Original generated outputs remain outside Git. Only optimized project-owned scene derivatives were added; third-party photos remain remote and unmodified.
