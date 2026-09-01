# China Rides video pilot — 2026-09-01

Status: bounded pilot complete; no transcript, media, thumbnail, cookie, comment, or personal-data artifact is committed.

## Scope

- Channel: China Rides (`UC7g_hJQhHjx_gUgA8Vsi9vw`).
- Eight public YouTube videos were selected, including the supplied wheel-review link, model reviews, shop tours, and a custom build.
- Three public Bilibili search results were selected for a feasibility check.
- Discovery stopped at 10 named model leads and below 25 atomic gaps.

## Retrieval result

All eight selected YouTube pages exposed an automatic-track hint, but the visible player reported captions unavailable and returned no usable timed-text body. The ignored records therefore remain `no-captions`; no transcript-derived claim was accepted.

The three Bilibili IDs came from public search results. The first direct video-page probe returned a security block before subtitle state could be observed. The lane stopped there, so the remaining two direct pages were not retried or opened during that run. No API fallback or bypass was attempted.

## Discovery result

The bounded description/title leads were:

- Quick Pro UR:ONE
- Incolor SSR
- Gusto Duro
- Sava Hawkeye, Aurora, and Beast
- Winspace M6 and SLC3
- X-LAB AD8
- 京东京造 XC500

Sava Falcon also appeared in the shop-tour description, but it was held outside the batch when the 10-lead cap was reached. No price, geometry, compatibility, warranty, quality, or recommendation claim was accepted from a description.

Current-main reconciliation showed that Incolor SSR was already published and Quick Pro UR:ONE, Winspace M6, and X-LAB AD8 already had research-stage candidate profiles. Four exact-target China Rides records were therefore added to those existing pages instead of duplicating products. The ignored coverage report separately classifies other names as an existing record or a new/ambiguous lead; none was promoted solely because of a video.

## Disclosure and presentation

The channel's public About page listed Lameda and Light Bicycle as partners with discount codes when reviewed on 2026-09-02. Each added record exposes that relationship caveat and links to the About page; no model-specific supplied-product claim is made.

Candidate profiles previously validated `video_ids` but did not join or render their corresponding records. The pilot fixes that gap, keeps video context separate from publication evidence, adds creator-published timestamp links, and preserves explicit click-to-load privacy behavior.

## Local evidence contract

`scripts/video-research.mjs` validates the ignored corpus, parses WebVTT/SRT/BCC or JSON3, normalizes local segments, matches exact catalog aliases, classifies existing/candidate/excluded/unmatched context, and enforces the pilot cap in its report. `scripts/video-browser-capture.py` is acquisition-only and stops at the first Bilibili block.
