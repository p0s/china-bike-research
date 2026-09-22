# Real model images in the bilingual blog — 2026-09-22

The blog banner, article cards and covers now use existing remote manufacturer/retailer images of the models discussed. Each article also includes an inline model gallery beside the first comparison section. Seven image records cover eight model IDs; the Twitter RS and WheelTop configurations share a V3 platform photo with an explicit component-difference note. The PARDUS image identifies the pictured Shimano 105 configuration separately from the article's eGR comparison, and the LCR018-D caption identifies its example build.

Photo selections, localized alt text and build notes live in `content/blog-images.json`; original URLs, ownership, rights and source records remain in `data/images/` and `data/sources/`. Photos remain remote and unmodified. No catalog evidence or observation date was refreshed by this presentation work.

A consistent red panda mascot appears beside each photo, with a general mechanic pose and topic-specific pumping, measuring, assembling and packing poses. The built-in OpenAI image generator created the mascot assets. The manifest preserves prompts and hashes; optimized 480-pixel alpha WebPs live in `assets/blog/`. The previous generic bicycle-scene assets and visible AI-image captions are removed.

The renderer uses real model images for Open Graph, Twitter and BlogPosting metadata. A failed mascot hides independently. A failed model image hides its visual area while retaining its model/source links, build note and article content. Both languages and root/project base paths are covered.

Validation:
- `node --test tests/bilingual-seo.test.mjs`: 23 focused tests passed.
- `codex-pnpm-check check` (the full `npm run check` gate): 291 tests passed; privacy, data, research and coverage gates passed; 584 pages built; SEO audit passed with 456 indexable and 128 noindex pages.
- Seven selected image URLs returned HTTP200 with image content types and decoded in isolated Chromium.
- `npm run image:report`: network-enabled run checked 212 URLs: 209 healthy, two wrong-content-type responses and one broken response. The three unrelated existing records are evolve-cima-gr, tfsa-jh37 and hi-light-g7-2; none is used in this blog change. The initial sandbox run could not reach any host.
- Isolated Chromium: 24 checks passed across English/Chinese, 1440-pixel desktop and 390-pixel mobile layouts, live photo decoding, independent photo/mascot failures, JavaScript errors and no-JavaScript content. Screenshots were visually reviewed, including all seven model images. Proof is retained locally under `.research/blog-real-photos-final/`; remote requests are restricted to the seven selected image URLs.
