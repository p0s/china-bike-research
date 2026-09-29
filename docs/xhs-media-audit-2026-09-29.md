# Local XHS bicycle-image audit — 2026-09-29

This audit closes the locally available, model-focused XHS ZIP set for the current bike catalog. It does not claim to cover every image on XHS or images that may be captured later. Immutable originals and numbered contact sheets stayed outside Git. Each new public image is a compressed, metadata-free derivative linked to its exact canonical post, creator, archive digest, original-media digest, and removal route in `data/images/` and `data/sources/`.

## Inventory and review

- The local collection contained about 98 XHS ZIPs across the searched project, document, and download roots. The 39 bike-model query archives contributed 1,103 image entries. The 13 relevant query families reduced to 857 within-family distinct images and 806 globally distinct media SHA-256 values from 156 canonical posts. Search-result duplication explains part of the difference.
- All 13 families were visually reviewed on numbered contact sheets; selected photos were inspected at full size and cross-checked against existing galleries. The additional nine photos below add a different decision-relevant view for an exact catalog model. The earlier small batch remains in place.
- The five broad-search families for Airwolf YFR068, BXT 055, Rinasclta GR025, Q-AERO GR, and XMCarbonspeed CS-GR01 contained hundreds of unrelated hits (including other bike brands, shoes, cars, and helicopters). The contact sheets did not establish an exact, privacy-safe, decision-relevant photo for those five catalog models. Model words in the query or post caption were not enough to reassign a different bike to a catalog entry.
- The remaining AD8, AD9, RS9, Quick XR:ONE, Winspace G3, PARDUS Super Sport Gen2, CAMP GX, and Twitter Gravel V3 images were screened for duplicate angles, other generations (notably Twitter V1), wrong components or model labels (notably an RS8 photo in an RS9 search), article screenshots, people, location or account identifiers, and images that only decorate a page. Existing useful photos were not re-added.
- Older `xhs-gpt-*` ZIPs do not carry the validated canonical public-post and media manifest needed to prove the source of each image. Their raw media was not published. These are a provenance limit, not evidence that no useful image exists within them.

## New editorial views

| Exact model | New views | Why they add information |
| --- | --- | --- |
| X-LAB AD8 | Astana bare frameset | Frame silhouette and paint before assembly. |
| X-LAB AD9 | Anniversary rear triangle | Seatpost junction and rear-frame profile. |
| X-LAB RS9 | Full seller build, rear, front | Exact RS9 identity plus assembled profile, seatpost, fork and cockpit shapes. Parts are a seller build. |
| Quick Pro XR:ONE | Seat-tube accessory mounts | Mount positions beyond the existing full-frame, downtube and bottom-bracket views. |
| Winspace G3 | Rear frameset, UDH dropout | Rear-triangle and hanger details beyond the existing full-frame and built-bike views. |
| PARDUS Super Sport Gen2 | Owner bare frameset | Frame and fork silhouette, distinct from the existing scale and complete-bike photos. |

Every photo was optimized to one ≤480 px/40 KB card and one ≤1200 px/88 KB detail file. Attribution does not assert a general redistribution license. A valid removal request can be filed through the linked public repository issue route.
