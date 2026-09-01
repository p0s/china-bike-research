# Video evidence workflow

Video research is a bounded discovery lane for China Bikes. It can reveal exact model names, missing catalog records, useful visual context, and claims worth checking. A creator's statement is not an official specification, current price, publication gate, or recommendation by itself.

## Local corpus

The ignored `.research/video-corpus/` directory uses `platform/channel-or-creator/video-id/`. Each record has `metadata.json` and, only when a public caption track is available, one `captions-original.vtt`, `.srt`, or `.json`. The normalizer creates local `segments.json`, `transcript.txt`, and `index.json`; the matcher creates `.research/reports/video-coverage.json`.

Raw captions, translations, video/audio, thumbnails, cookies, comments, credentials, and personal data stay local and are never committed. Committed records are limited to canonical public URLs, compact metadata, creator-published timestamp links, paraphrased context, and explicit evidence classifications.

## Commands

```bash
npm run video:validate
npm run video:normalize
npm run video:match
```

These commands are offline. Public acquisition must use the dedicated isolated research browser. Never bypass a CAPTCHA, login, security verification, HTTP 412/300013, or rate limit. A Bilibili block ends that capture run without retrying later entries.

## Evidence rules

- Creator captions are preferred; automatic captions are fallible and labelled.
- A visible measurement applies only to the exact configuration shown.
- Ride impressions and owner experience are contextual reports, not universal facts.
- A creator repeating a manufacturer claim still needs an exact primary source.
- Titles, descriptions, chapters, and shop-tour lists are discovery evidence only.
- Identity, generation, price, availability, fit, compatibility, safety, and recommendation-changing claims require exact-model evidence.
- Never propagate a claim to a sibling model, size, generation, or regional build.

## Site presentation

Curated context uses records in `data/videos/`. A record targets exactly one published platform/variant or research-stage candidate. Model pages show disclosure, relationship, date, summary, and optional timestamp links. The player is an explicit click-to-load control using YouTube's privacy-enhanced host; the initial page makes no YouTube embed request and videos never autoplay.

Candidate video context does not promote a candidate into the published catalog. It remains separate from sources used for price, specifications, and publication readiness.

## Batch limit and stopping rule

Start with one channel and at most 10 exact model leads or 25 atomic gaps. Stop when captions are blocked, identity is ambiguous, the cap is reached, or the evidence is decisive for the next verification step. A candidate is promoted only after the normal gates in `SPEC.md` are met.
