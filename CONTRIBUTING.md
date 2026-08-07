# Contributing

The published website is for riders and buyers. New research enters through structured GitHub issues and pull requests.

## The smallest useful contribution

- a dated price observation for an exact configuration;
- a correction to one specification with a source;
- an official geometry or clearance document;
- an owner measurement with tire, rim, pressure, and method;
- a manufacturing or warranty source;
- a current availability confirmation for a watchlist model;
- a broken-image report, attribution correction, or rights-safe product image.

## Before submitting

1. Identify the exact brand, model, generation, size, and configuration.
2. Separate the frame platform from the complete-bike build.
3. Label the evidence as measured, official, seller claim, community report, inferred, or unknown.
4. Add the source and access date.
5. Remove personal and transaction data.
6. Do not overwrite old prices; add a new dated record.
7. For an image, state exactly what it depicts and who owns it.

## Privacy requirements

Do not submit names, unnecessary faces, avatars, account IDs, phone numbers, emails, addresses, license plates, GPS data, order IDs, tracking numbers, payment details, private chat history, private permission correspondence, or unrelated order information. Crop screenshots to the model, configuration, price, date, and promotion conditions. Redaction should be irreversible.

Original photographs should be re-encoded before publication so EXIF, GPS, device, author, and embedded-thumbnail metadata is removed.

## Product-image contributions

Use the **Add or fix a product image** issue form. Acceptable proposals include:

- an original photograph you can license to the project;
- an image with explicit written reuse permission;
- an image under a compatible Creative Commons or public-domain license;
- an official manufacturer media asset with terms allowing reuse;
- a public official or retailer product-image URL proposed only for remote embedding;
- a correction, broken-link report, attribution issue, or removal request.

Do not copy a product photograph from Taobao, JD, Xiaohongshu, Bilibili, a forum, a blog, a reviewer, or a manufacturer site into the repository merely because it is publicly viewable.

Every image record must specify:

- `platform_id` and optional `variant_ids`;
- `subject_accuracy`;
- `media_type`;
- `hosting.mode` and URL or local path;
- `source_id`;
- `rights.status`, owner, and usage note;
- `credit`, `alt`, and `reviewed_at`.

When one platform photo is reused for another build variant, the website automatically displays **Same frame platform · components may differ** unless an exact variant record exists.

## Data changes

Use lowercase kebab-case IDs and one JSON record per file. Reuse existing brand and platform IDs when the physical frame is shared. A new drivetrain on the same frame is usually a new variant, not a new platform.

Reference schemas live in `schemas/`; the canonical executable checks live in `src/lib/data.mjs`.

Run:

```bash
npm run check
```

CI rejects invalid or duplicate IDs, broken references, missing sources, undated prices, impossible values, unclassified image rights, missing local image assets, suspicious privacy patterns, test failures, broken internal links, and build failures.

## Editorial changes

State what is known, what is claimed, and what remains uncertain. Do not rank a product lower merely because information is missing; lower the confidence instead. Avoid universal 0–100 scores and unsupported safety conclusions.

## Source quality

Prefer official product pages for identity and specifications, public company or factory evidence for provenance, independent measurements for physical claims, and dated checkout evidence for price. A marketplace title alone is weak evidence because variants and substitutions are common.

A visual source is evidence of appearance and product identity only. It is not evidence for weight, carbon lay-up, tire clearance, manufacturing quality, or the exact components unless those details are independently supported.

## Pull-request checklist

- [ ] Exact model/generation is identified.
- [ ] New claims have source IDs.
- [ ] Price records have an observation date and conditions.
- [ ] Historical records were preserved.
- [ ] Image exactness, source, credit, rights status, and alt text are present where relevant.
- [ ] No personal, account, transaction, permission-correspondence, metadata, or secret data was added.
- [ ] `npm run check` passes.
