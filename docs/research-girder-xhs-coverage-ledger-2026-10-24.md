# GIRDER XHS coverage ledger — 2026-10-24

Batch 4, the last batch of the GIRDER brand expansion. It adds CORSA and Arrow context from posts that were already captured, and maps each of the 21 official builds to its XHS evidence. This is a local research delivery, not publication or deployment. No live XHS query, recrawl, seller contact, video review or image copy was made in this batch.

## Corpus and limits

- **Batch 3 corpus:** 12 validated archives captured 2026-10-24 (extension 1.5.0, no rate-limit or access stop). They hold 46 unique detailed posts, of which 41 match the brand term, plus 112 captured comment rows, with 4 threads partial. Queries: `格拉德 公路车`, `格拉德`, `格拉德 FAME` (twice), `DASH`, `BISON`, `CORSA`, `钛合金`, `JAUNT`, `TSAR`, `AERO TEAM`, `GLARE`. Each query detailed only 1–10 of about 20 search results, and search-only cards were not used as evidence. Archive hashes are in `docs/research-girder-xhs-historical-2026-10-24.md` and the per-post source records.
- **Earlier Arrow captures:** 3 archives (`格拉德 arrow`, `… 评测`, `… 重量`); see `docs/research-girder-arrow-xhs-2026-10-24.md`.
- **Media:** the campaigns did not capture videos, and no video was watched. Listing photos were opened locally only for the batch 3 DASH frameset and BISON 105 Di2 lead. Batch 4 opened no images. No media entered Git.
- **What this ledger covers:** a bounded text and comment pass. "No accepted evidence" means no exact-model text claim was accepted from the captured posts. It does not mean there are no posts, no stock or no owners. Comments are partial, and unanswered questions are not negative evidence.

## Batch 4 dispositions

| Post | Date | Class | Disposition |
|---|---|---|---|
| `67eb47ff000000001201e417` | 2025-04-01 | bike-store post | New source `public-xhs-girder-corsa-r7120-carbon-2025-04-2026-10-24`. Carbon CORSA with 7120 equipment. Both official CORSA builds are R7120 carbon, so the generation, wheel package, price, weight and clearance stay unresolved. |
| `69e1d26c0000000023023125` | 2026-04-17 | used listing | New source `public-xhs-girder-corsa-used-tiagra-2026-04-2026-10-24`. Tiagra 4720 hydraulic with a 105 crank and carbon wheels; price negotiable and not stated. It is unknown whether this is the original package or a modified bike, and it is not a spec for either R7120 build. |
| `6a96ce21000000002a0066bf` | 2026-09-01 | owner used listing | New source `public-xhs-girder-arrow-used-r7020-2026-09-2026-10-24`. 7020 Arrow bought in 2023, asking ¥4,500, fitted with aftermarket carbon-spoke wheels. The pickup location and the owner's wheel-value story are omitted. |
| `6a23d7f9000000001702b164` | 2026-06-06 | used listing | Added to the existing `public-xhs-girder-arrow-used-r7170-2026-10-24` as a dependent repeat: same S size, R7170, carbon wheels, integrated bar and ¥7,999 with shipping. It was retrieved by the GLARE query. Generation unresolved; not a new-bike price. |
| `6a8cf629000000000f025dc9` | 2026-08-25 | used listing | Trim lead only: a used Arrow with carbon frame and Ultegra hydraulic group, about 80% condition. No price, year, package or generation, so no source record or model row was added. |

The CORSA sources are linked to `girder-corsa-2025-105` and `girder-corsa-pf-105-alloy`, and the new Arrow 7020 source to `girder-arrow-pf-105-di2`. All are family context with `selected_build_fact: false`. Used, modified and dated asking prices stay out of China price, sort, budget and builder inputs. No official BOM, weight, geometry or price was changed.

## Ledger: 21 official builds

"Exact" means accepted XHS text for that exact build and generation. "Family" means accepted posts for the same model name whose generation or build differs or is unresolved.

| # | Official build (candidate) | Query family | Exact XHS evidence | Family-only context | Disposition |
|---|---|---|---|---|---|
| 1 | ARROW 2025 105 Di2 (`girder-arrow-2025-105-di2`) | Arrow ×3, 公路车, GLARE | none | R7170 used ¥7,999 (2025-11-12, repeated 2026-06-06); 2026-marketed R7170 8.4 kg claim | Unresolved: no post proves the T47/UDH generation |
| 2 | FAME PRO Dura-Ace Di2 (`girder-fame-pro-2025-dura-ace-di2`) | FAME | none | 2023 FAME R7170/R8020 references | No attributable exact evidence |
| 3 | FAME Ultegra Di2 (`girder-fame-2025-ultegra-di2`) | FAME | none | as #2 | No attributable exact evidence |
| 4 | DASH PRO Dura-Ace Di2 (`girder-dash-pro-2025-dura-ace-di2`) | DASH | none | 2023 DASH R7170 reference; frameset of unresolved generation | No attributable exact evidence |
| 5 | DASH Ultegra Di2 (`girder-dash-2025-ultegra-di2`) | DASH | none | as #4 | No attributable exact evidence |
| 6 | BISON PRO 105 Di2 (`girder-bison-pro-2025-105-di2`) | BISON | none | 2023 BISON R7020 reference; title-only BISON 105 Di2 lead (657a7123) | Unresolved lead; no specs or generation |
| 7 | BISON 105 R7120 (`girder-bison-2025-105`) | BISON | none | 2023 BISON R7020 reference | No attributable exact evidence |
| 8 | CORSA 2025 105 (`girder-corsa-2025-105`) | CORSA | none | 7120 carbon store post (2025); Tiagra/105-crank used listing (2026) | Unresolved generation; context linked |
| 9 | Titanium road 105 Di2 (`girder-titanium-road-2025-105-di2`) | 钛合金 | none | none | No accepted evidence; results were other brands and unrelated items |
| 10 | Titanium road Apex 1×12 (`girder-titanium-road-2025-apex-1x12`) | 钛合金 | none | none | as #9 |
| 11 | Titanium MTB XT (`girder-titanium-mtb-2025-xt-1x12`) | 钛合金 | none | none | as #9 |
| 12 | Titanium Gravel Apex AXS (`girder-titanium-gravel-2025-apex-axs`) | 钛合金 | none | none | as #9; official 45C is a fitted width, not a proven maximum |
| 13 | ARROW 105 Di2 press-fit (`girder-arrow-pf-105-di2`) | Arrow ×3, 公路车 | none | used 7120 ¥5,350, 7020 ¥4,999 and ¥4,500 (modified wheels); 2023 owner assembly report; Ultegra trim lead | Family context linked; generation of the listings unresolved |
| 14 | AERO TEAM Dura-Ace Di2 (`girder-aero-team-dura-ace-di2`) | AERO TEAM | none | none | No accepted evidence |
| 15 | TSAR Ultegra Di2 (`girder-tsar-ultegra-di2`) | TSAR | none | TSAR R7170 references (separate candidate) | No R8170 TSAR evidence |
| 16 | DASH Ultegra Di2 endurance (`girder-dash-pf-ultegra-di2`) | DASH | none | as #4 | No attributable exact evidence |
| 17 | FAME Ultegra R8020 (`girder-fame-pf-ultegra-r8020`) | FAME | none | 2023 R8020 ¥16,800 package (may differ); one 2024 owner frame-replacement account | Context linked; package and generation match unproven |
| 18 | BISON Ultegra R8020 (`girder-bison-pf-ultegra-r8020`) | BISON | none | 2023 BISON R7020 reference | No attributable exact evidence |
| 19 | CORSA 105 alloy wheels (`girder-corsa-pf-105-alloy`) | CORSA | none | as #8 | Unresolved generation; context linked |
| 20 | GLARE Ultegra R8000 rim (`girder-glare-ultegra-r8000-rim`) | GLARE | none | none | No accepted evidence; query returned Arrow and generic branding |
| 21 | JAUNT Apex AXS (`girder-jaunt-apex-axs`) | JAUNT | none | none | No accepted evidence; official 45C is a fitted width, not a proven maximum |

No captured XHS post supplied an exact-build maximum tire clearance, measured weight with its basis, stiffness measurement, current new-bike checkout or warranty term for any of the 21 builds. Geometry and standards were never borrowed across generations.

## Coverage boundary

GIRDER work is complete only within this documented range: the 21 official pages, the five batch 3 historical/unresolved references, and the captured XHS corpus above. It does not cover the whole brand. Leads that remain open: the BISON 105 Di2 title-only post, the Ultegra Arrow trim lead, the Douyin 2025 Arrow claim, the 2024 e-gravel, Vagrant (2016), the V-series city bikes (2015), uncaptured search-only XHS results, videos, and the partial comment threads.

## Validation

See `CHECKPOINT.md`.
