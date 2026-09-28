# First-party product image cutover

The September 2026 owner-requested cutover replaces 192 displayed remote image records with 185 pairs of source-attributed WebP card/detail assets under `assets/images/sourced/official/` and `assets/images/sourced/retailer/`. The new assets total about 16 MB. Cards are at most 480 px and 100 KB; detail files are at most 1,200 px and 400 KB. Sources below these dimensions are not enlarged. The raw downloads and extracted brochure media stay outside Git; each record carries the original media URL, SHA-256 digest, visible credit, removal route, configuration accuracy and privacy review. A private off-repository cache preserves the available source files and a 323-file SHA-256 manifest (manifest digest `fd66324088bb2ffb7cacf3f5808de9e6b48b033c293e1c42450e77ed90f66bef`).

Six originally displayed photo records could not be fetched from their source hosts or replaced with an image verified against the exact build. They remain as hidden provenance records and create no browser request: `camp-ace-qed-primary-image`, `camp-gx600-blue-gallery`, `camp-gx600-grey-gallery`, `camp-gx600-primary-image`, `camp-gx700-gold-gallery`, and `twitter-gravel-v3-primary-image`. The Twitter Gravel V3 product pages use a labelled same-platform Shimano 105 photo; the pictured components differ from the RS and WheelTop builds. CAMP GX600 PES still has no verified photo of that stock trim; a separately credited custom GX600 flat-bar build is now shown as a same-platform example. Three previously hidden remote records remain hidden. The importer did not bypass host access controls.

Image records, the blog, groupset comparisons and image-credits page now serve displayed photos from local paths. Dataset validation rejects a displayed remote product image. The generated Cloudflare bundle contains 586 HTML pages; inspection of all 2,384 media tags and gallery media attributes found no third-party image URL. Local verification checked SHA-256, byte count and WebP signatures for all 424 catalog and groupset variant references. The full `npm run check` gate and `npm run build:cloudflare` passed before publication.

## Curated XHS archive follow-up, 2026-09-29

Four validated local public-post archives supplied six additional, individually reviewed images across four models. The public repository contains only content-addressed card/detail WebP derivatives. Each image record links its canonical XHS post, names the public creator or shop handle, records the original media hash and derivative hashes, labels configuration differences, and provides a removal route. The original ZIPs and image files remain outside Git. No photo in this batch asserts a new price, component specification, or redistribution license.

| Model | Added view | Original archive image | Review note |
| --- | --- | --- | --- |
| CAMP GX600 | Custom flat-bar whole bike; representative primary | `post-002-image-01.webp` in CAMP GX600/GX700 ZIP | Stock PES build is unverified; no face or account identifier appears. |
| Quick Pro XR:ONE | Geometry diagram | `post-001-image-05.webp` in XR:ONE ZIP | A 180 px top strip containing the public account handle was cropped from the derivative; the creator remains visibly credited beside the image. |
| Quick Pro XR:ONE | Down-tube access detail | `post-002-image-04.webp` in XR:ONE ZIP | Dealer size M frame; no delivered-package claim. |
| Winspace G3 | White dealer build | `post-002-image-01.webp` in Winspace G3 ZIP | Assembly and components are examples, not the catalog trim. |
| Winspace G3 | Geometry diagram | `post-002-image-05.webp` in Winspace G3 ZIP | Archived size chart; current fit should be confirmed with the seller. |
| X-LAB AD8 | Blue owner build | `post-005-image-02.webp` in X-LAB AD8 ZIP | Owner's Shimano 105 build, not a promised retail configuration. |

All six derivatives were visually reviewed for faces, registration numbers, account identifiers, and location identifiers. `webpmux -info` confirmed no EXIF, XMP, or ICC payload in the detail variants. The source records identify the validated immutable archive by SHA-256 and bytes; image records identify the selected original by SHA-256 and both optimized assets by SHA-256, dimensions, and bytes.
