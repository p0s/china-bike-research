# Contributing

The published website is for riders and buyers. New research enters through structured GitHub issues and pull requests.

## The smallest useful contribution

- a dated price observation for an exact configuration;
- a correction to one specification with a source;
- an official geometry or clearance document;
- an owner measurement with tire, rim, pressure, and method;
- a manufacturing or warranty source;
- a current availability confirmation for a watchlist model.

## Before submitting

1. Identify the exact brand, model, generation, size, and configuration.
2. Separate the frame platform from the complete-bike build.
3. Label the evidence as measured, official, seller claim, community report, inferred, or unknown.
4. Add the source and access date.
5. Remove personal and transaction data.
6. Do not overwrite old prices; add a new dated record.

## Privacy requirements

Do not submit names, avatars, account IDs, phone numbers, emails, addresses, order IDs, tracking numbers, payment details, private chat history, or unrelated order information. Crop screenshots to the model, configuration, price, date, and promotion conditions. Redaction should be irreversible.

## Data changes

Use lowercase kebab-case IDs and one JSON record per file. Reuse existing brand and platform IDs when the physical frame is shared. A new drivetrain on the same frame is usually a new variant, not a new platform.

Reference schemas live in `schemas/`; the canonical executable checks live in `src/lib/data.mjs`.

Run:

```bash
npm run check
```

CI rejects invalid or duplicate IDs, broken references, missing sources, undated prices, impossible values, suspicious privacy patterns, test failures, broken internal links, and build failures.

## Editorial changes

State what is known, what is claimed, and what remains uncertain. Do not rank a product lower merely because information is missing; lower the confidence instead. Avoid universal 0–100 scores and unsupported safety conclusions.

## Source quality

Prefer official product pages for identity and specifications, public company or factory evidence for provenance, independent measurements for physical claims, and dated checkout evidence for price. A marketplace title alone is weak evidence because variants and substitutions are common.

## Pull-request checklist

- [ ] Exact model/generation is identified.
- [ ] New claims have source IDs.
- [ ] Price records have an observation date and conditions.
- [ ] Historical records were preserved.
- [ ] No personal, account, transaction, or secret data was added.
- [ ] `npm run check` passes.
