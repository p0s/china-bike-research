# GIRDER XHS historical builds — 2026-10-24

Batch 3 of the GIRDER brand expansion. It turns captured XHS posts into historical build references and family context. It is a local research delivery, not publication or deployment. No new live XHS query, seller contact, video review or image copy was made.

## Capture corpus

The input is the GIRDER capture corpus collected on 2026-10-24: 12 validated archives, 54 detail rows, **46 unique posts** and 112 captured comment rows (4 comment threads partial). All were captured sequentially with extension 1.5.0 and no rate-limit or access stop.

That corpus is not 46 relevant GIRDER posts. 41 posts match the brand term, and many broad-query results were unrelated (clothing, travel, generic branding). It also does not cover the whole brand. This batch used only the selected posts below. Post text and comments were read as untrusted evidence. Listing photos were opened locally only where identity was in doubt (DASH frameset, BISON 105 Di2 lead), and no media entered Git.

| Query | Archive SHA-256 (prefix) | Posts used here |
| --- | --- | --- |
| 格拉德 FAME | `1b78be453a0ea346` | 647aa374, 64dcf1bb, 64eebcfc, 660be04d |
| 格拉德 DASH | `9cfaeece46acde4d` | 640605ca, 63f2ea0a, 63f1a1e1, 69ce6d03 |
| 格拉德 BISON | `2cc2f6076c9c64d9` | 6434f1d9, 657a7123 (lead only) |
| 格拉德 TSAR | `6e75493314ea903c` | 651e662b, 684aae4c |

Full hashes and byte counts are in each `data/sources/public-xhs-girder-*-2026-10-24.json` record. Public links use the canonical `/explore/<id>` URL without parameters.

## Accepted: five new candidates

The year in each name is the date of the source posts, not a manufacturer model year. All prices are dated seller references. None is a current new-bike price, a checkout, a sale or a build estimate, and none feeds a China price, budget or builder total.

| Candidate | Accepted facts | Price reference |
| --- | --- | --- |
| `girder-fame-105-di2-2023-reference` | R7170 2×12, carbon frame, integrated carbon bar, wavy carbon wheels, two-tone finish (2 posts) | CNY 17,800 seller retail, 2023-06-03 |
| `girder-dash-105-di2-2023-reference` | R7170 2×12, carbon frame/fork/seatpost/cockpit/wheels; 8.39 kg seller-reported, basis unknown | CNY 17,800 seller-claimed official, 2023-03-06 |
| `girder-bison-r7020-2023-reference` | 105 R7020 2×11 hydraulic disc, carbon frame and wheels, Schwalbe tires | CNY 11,800 store promotion, 2023-04-11 |
| `girder-tsar-105-di2-2023-reference` | R7170, 50/60 mm wavy carbon wheels, two-sided finish | CNY 18,800 retailer ad, 2023-10-05 |
| `girder-dash-frameset-unresolved-generation` | Carbon DASH frame and fork, black/gold finish | CNY 3,499 new asking price with shipping, 2026-04-02; package unknown, excluded from price, build estimate and builder |

Per-package details stay with their own source:

- **DASH:** the 2023-02-20 listing's 45/65 mm ceramic-hub wheels and Schwalbe tires are an "Other documented build" on the model page. They are not merged into the reference row. The 8.39 kg figure appears in two posts (2023-02-19 and 2023-03-06) that may not be independent. The 2023-02-19 post does not name the group tier.
- **TSAR:** the 2025-06-12 CNY 9,999 asking price (size M, shipping included) is a separate listing. Its condition is not stated, and seller "discontinued" hype and rider-height advice were not accepted.
- **DASH frameset:** the listing text says "RIDER DASH", but the photos show GIRDER down-tube and DASH top-tube decals, so the identity is accepted. Its generation (NEW 2025 threaded BSA, or ROAD press-fit endurance) and its package beyond frame and fork remain unknown.

## Accepted: FAME family context

Both items below are attached to `girder-fame-pf-ultegra-r8020` as context only:

- A 2023-08-30 post advertises an R8020 FAME with 50/60 mm carbon wheels at CNY 16,800. That 2023 package may differ from the current ROAD page. It is not a current price.
- One April 2024 owner reports that a FAME bought in summer 2023 cracked after the owner over-tightened the seat clamp without a torque wrench. The owner says the shop declined warranty, and GIRDER after-sales then replaced the frame free of charge. This is a single, uncorroborated account with a self-described cause. It says nothing about defect frequency, design causation or current warranty policy. Route, identity and contact details are omitted.

## Rejected or not accepted

- **BISON 105 Di2 (657a7123, 2023-12-14):** the title names the build, but the post has no specification, price or generation text. Its photos show riders and a bike without readable specs. It stays an unresolved lead.
- Seller value superlatives, "Arrow upgrade" and "discontinued" wording, and subjective stiffness adjectives were not accepted. A commenter's 9 kg L-size guess, a lower-price recollection for BISON, an unanswered weight question and a frame-likeness comment were not accepted either.
- Seller warranty statements (BISON lifetime frame / one-year parts) are recorded as seller claims only.
- No favorable spec was moved between posts or onto the official current records. No video was watched, so no claim about video content is made.

## Still unresolved

For all five references: frame generation and shell standard, geometry, maximum tire clearance, a complete weight with its basis (the DASH 8.39 kg lacks one), frame weight, stiffness, and current price, route and warranty. The CORSA/Arrow context and the model-by-model ledger are in `docs/research-girder-xhs-coverage-ledger-2026-10-24.md`.

## Validation

See `CHECKPOINT.md` for the commands run on this batch.
