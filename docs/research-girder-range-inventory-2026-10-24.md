# GIRDER 格拉德 range inventory — 2026-10-24

Official/web-source batches 1 and 2, plus XHS batch 3 (historical builds) and batch 4 (CORSA/Arrow context and the XHS coverage ledger). This finite map is the current coverage boundary for GIRDER (苏州格拉德自行车科技有限公司). It does not claim that every GIRDER product ever sold has been found. XHS was out of scope for batches 1 and 2; batches 3 and 4 use only already-captured XHS posts.

## Method and access

- Official site `http://www.girdercycle.com/` (HTTP; read 2026-10-24). Its navigation has two bike sections: **NEW 2025** (12 product pages, `/NEW2025/35–46.html`) and **ROAD** (9 product pages, `/ROAD/25–33.html`). Every product page linked from the home and section pages was read. There is no separate gravel, MTB or e-bike section.
- Geometry charts were only available as images. They were downloaded to a local scratch directory to be read and are not in Git.
- Web searches (standard and extended, Chinese and English) found few exact-model pages. Autohome Q&A pages (`autohome.com.cn/ask/…`) are generic and conflict with each other (German/British/domestic origin, "carbon steel" frames), so they were rejected as evidence.
- JD/Taobao were not retried. An earlier batch found that their search needs a login, which only a human can do.

## Inventory

Status key: **covered** = an existing candidate record; **batch 1** / **batch 2** = candidate added in that batch; **out of scope / lead** = not added (reason given).

### NEW 2025 section (current official listings)

| Model / build | Official page | ¥ list | Key identity | Disposition |
|---|---|---|---|---|
| ARROW 105 Di2 (2025, T800+T1000, T47, UDH) | `/NEW2025/41.html` | 12,800 | aero; XS–L 420–510 | covered `girder-arrow-2025-105-di2` |
| FAME PRO Dura-Ace Di2 R9270 | `/NEW2025/39.html` | 28,800 | aero; same frame text and geometry as 2025 ARROW; 7.86 kg | batch 1 `girder-fame-pro-2025-dura-ace-di2` |
| FAME Ultegra Di2 R8170 | `/NEW2025/40.html` | 21,800 | aero; same as above; 7.9 kg | batch 1 `girder-fame-2025-ultegra-di2` |
| DASH PRO Dura-Ace Di2 R9270 | `/NEW2025/35.html` | 30,800 | all-round T800+T1000, BSA "68/73 mm"; 7.38 kg | batch 1 `girder-dash-pro-2025-dura-ace-di2` |
| DASH Ultegra Di2 R8170 | `/NEW2025/36.html` | 22,800 | same frame text and chart as DASH PRO; 7.58 kg | batch 1 `girder-dash-2025-ultegra-di2` |
| BISON PRO 105 Di2 R7170 | `/NEW2025/37.html` | 17,800 | same frame text and chart as DASH; 8.08 kg | batch 1 `girder-bison-pro-2025-105-di2` |
| BISON 105 R7120 mechanical | `/NEW2025/38.html` | 13,800 | same frame text and chart as DASH; 8.30 kg | batch 1 `girder-bison-2025-105` |
| CORSA 105 R7120 mechanical | `/NEW2025/42.html` | 9,999 | aero text, T47, own S/M/L chart; 8.8 kg | batch 1 `girder-corsa-2025-105` |
| Titanium road 105 Di2 | `/NEW2025/43.html` | 19,800 | 3Al-2.5V, T47 86.5 mm, UDH; 8.86 kg | batch 1 `girder-titanium-road-2025-105-di2` |
| Titanium road SRAM Apex XPLR 1×12 mechanical | `/NEW2025/44.html` | 16,800 | same Ti frame; 9.18 kg | batch 1 `girder-titanium-road-2025-apex-1x12` |
| Titanium MTB 27.5 XT 1×12 | `/NEW2025/46.html` | 8,800 | 3Al-2.5V hardtail, 148 Boost, Suntour 110/"120 mm"; 13.32 kg | batch 1 `girder-titanium-mtb-2025-xt-1x12` |
| Titanium Gravel SRAM Apex XPLR AXS 1×12 | `/NEW2025/45.html` | — (blank) | 3Al-2.5V, 3D-printed crown fork, 45C, 405–492 mm sizes; 10.34 kg | batch 2 `girder-titanium-gravel-2025-apex-axs` (no price on page) |

### ROAD section (earlier generation, still listed with prices)

These pages share T700+T800 carbon, press-fit shells with GIRDER's "PF386 to T47 tool" ceramic BB or BB386, and S/M/L sizes 476/503/533 (aero) or 448/459/497 (endurance/integrated). Shared names do **not** mean they share a frame with the NEW 2025 bikes of the same name.

| Model / build | Official page | ¥ list | Key identity | Disposition |
|---|---|---|---|---|
| ARROW 105 Di2 R7170 (press-fit) | `/ROAD/25.html` | 14,800 | aero; 9.1 kg | covered `girder-arrow-pf-105-di2` |
| AERO TEAM Dura-Ace Di2 R9270 | `/ROAD/26.html` | 28,800 | hand-painted floral aero; 60/60 mm; 8.1 kg | batch 2 `girder-aero-team-dura-ace-di2` |
| TSAR Ultegra Di2 R8170 | `/ROAD/27.html` | 18,800 | aero, same sizes as the press-fit ARROW; 8.8 kg | batch 2 `girder-tsar-ultegra-di2` |
| DASH Ultegra Di2 R8170 (endurance) | `/ROAD/28.html` | 18,800 | endurance; 448–497 sizes; 8.3 kg | batch 2 `girder-dash-pf-ultegra-di2` |
| FAME Ultegra R8020 2×11 | `/ROAD/29.html` | 14,800 | aero; BB386 46×86; 8.8 kg | batch 2 `girder-fame-pf-ultegra-r8020` |
| BISON Ultegra R8020 2×11 | `/ROAD/30.html` | 14,800 | "integrated" frame; BB386; 7.8 kg; intro text conflicts (names AERO TEAM and 105 R7100) | batch 2 `girder-bison-pf-ultegra-r8020` |
| CORSA 105 R7120 (alloy wheels) | `/ROAD/32.html` | 7,999 | integrated frame; YBN chain; 8.8 kg | batch 2 `girder-corsa-pf-105-alloy` |
| GLARE Ultegra R8000 rim brake | `/ROAD/31.html` | 7,200 | endurance; quick-release; 25C; 7.8 kg | batch 2 `girder-glare-ultegra-r8000-rim` |
| JAUNT SRAM Apex AXS 1×12 gravel | `/ROAD/33.html` | — (blank) | T700+T800 gravel, 45C, 490/520 sizes; 9.7 kg | batch 2 `girder-jaunt-apex-axs` (no price on page) |

### Other public leads (not added)

| Lead | Source | Disposition |
|---|---|---|
| Arrow mechanical 105 R7120 / R7020 builds ("爱路") | Zhihu answer `zhihu.com/question/605653883/answer/3066418181` (blocked to non-browser reads); earlier XHS records | Uncertain lead. Generation and price are unknown, so it stays as context on the existing Arrow records. |
| 2025 Arrow: 860 g frame, 7.1 kg complete, "BB stiffness +7.5%" | Douyin video surfaced by search (`douyin.com/shipin/7308287066214565907`, not opened) | Unverified marketing lead. These values conflict with the official 8.44 kg and are not stiffness evidence. Not used. |
| E-assist gravel model | Cyclingchina 2024 China expo report, `cyclingchina.net/site/html/2024/new_product_0507/9113.html` (2024-05-07) | Model name and specs unknown. Lead only. |
| Vagrant 3.0 / 5.0 / 7.0 aluminium road (2016) | Biketo `biketo.com/product/30589.html` (byline is GIRDER itself) | Historical. No current listing found. Not added. |
| City bikes V01 (¥2,098), V03 / V04 451 (¥1,998), lugged Cr-Mo, Nexus 3 (2015) | Wildto `wildto.com/news/37116.html` (2015-12-03) | Historical city bikes. Outside the catalog's categories. |

## Batch 1 findings and caveats

- All ten batch-1 records are **candidates**. They are not published because, like the two Arrow records, they have no verified mainland marketplace route or checkout price and no published maximum tire clearance. Official prices are manufacturer list prices observed 2026-10-24.
- Weights are manufacturer claims. Size, pedals and weighing method are not stated. No frame weights or stiffness data are published.
- The NEW 2025 FAME and FAME PRO pages repeat the 2025 ARROW frame and fork text and its geometry exactly. DASH PRO, DASH, BISON PRO and BISON share another frame text and chart. The site never says these bikes share a frame, so each build stays a separate record.
- The DASH/BISON pages list "BSA … 68mm/73mm". The FAME/CORSA/ARROW pages say "BSA" in the frame line but give T47 P1.0 84.5 mm in the BB row. Records keep the more specific BB row and note the conflict.
- The titanium road chart matches the carbon DASH/BISON chart value for value. It is kept as official but flagged for confirmation.
- The MTB page says "SUNTOUR BOOST 110mm, Travel: 120mm", which is ambiguous. Its chart has no reach column.
- No images were added.

## Batch 2 findings and caveats (2026-10-24)

- All 21 official product pages now map to an exact candidate record: two Arrow records from earlier work, ten from batch 1 and nine from batch 2. No official page is left unresolved. All are candidates, for the same missing route/checkout and clearance reasons as batch 1.
- Batch-2 facts come from page copies saved on 2026-10-24. On a later 2026-10-24 attempt the site refused non-browser image requests (403, then a redirect to the home page), so that route was stopped. The ROAD-section geometry charts were never saved and stay unknown. The titanium-gravel chart was saved earlier the same day and is recorded.
- The titanium gravel and JAUNT pages show `￥：` with no amount. No price was added.
- ROAD BISON: the specification table lists Ultegra R8020 2×11, but the intro paragraph names the AERO TEAM and describes 105 R7100 2×12. The table is recorded and the conflict is flagged.
- ROAD-section size labels (476/503/533, 448/459/497, 440–530, 490/520 mm) do not say which dimension they measure.
- Bottom brackets: FAME, BISON and GLARE list BB386 46×86 mm. AERO TEAM, TSAR, DASH and CORSA describe the in-house ceramic BB only as "PF386 to/Locking T47 tool". JAUNT names no standard.
- Maximum clearance is not published for any page. The 45C tires on JAUNT and titanium gravel are fitted widths only.

## Batch 3: historical builds from captured XHS posts (2026-10-24)

These configurations appear only in dated seller posts, not on a current official page. Each is a separate candidate. A year in the name is the date of the posts, not a manufacturer model year. Details are in `docs/research-girder-xhs-historical-2026-10-24.md`.

| Model / build | Source posts | Dated reference | Disposition |
|---|---|---|---|
| FAME 105 Di2 R7170 | 647aa374, 64dcf1bb | ¥17,800 seller retail, 2023-06-03 | batch 3 `girder-fame-105-di2-2023-reference` |
| DASH 105 Di2 R7170 | 640605ca, 63f1a1e1, 63f2ea0a | ¥17,800 seller-claimed official, 2023-03-06; 8.39 kg seller claim | batch 3 `girder-dash-105-di2-2023-reference` |
| BISON 105 R7020 2×11 | 6434f1d9 | ¥11,800 store promotion, 2023-04-11 | batch 3 `girder-bison-r7020-2023-reference` |
| TSAR 105 Di2 R7170 | 651e662b, 684aae4c | ¥18,800 retailer ad, 2023-10-05; ¥9,999 ask, 2025-06-12 | batch 3 `girder-tsar-105-di2-2023-reference` |
| DASH carbon frameset (generation unresolved) | 69ce6d03 | ¥3,499 new ask, 2026-04-02; package unknown | batch 3 `girder-dash-frameset-unresolved-generation` |
| FAME Ultegra R8020 (2023 package) | 64eebcfc | ¥16,800 seller retail, 2023-08-30 | context on `girder-fame-pf-ultegra-r8020` |
| FAME owner frame replacement (2024) | 660be04d | — | single owner report, context on `girder-fame-pf-ultegra-r8020` |
| BISON 105 Di2 | 657a7123 (title only) | — | lead; no specs, price or generation |

## Batch 4: CORSA/Arrow context and XHS ledger (2026-10-24)

Two CORSA posts (a 7120 carbon store post from 2025 and a 2026 used Tiagra 4720/105-crank listing) and one Arrow used 7020 listing (¥4,500, 2026-09-01, aftermarket wheels) became new family-context sources. A 2026-06-06 repeat of the ¥7,999 R7170 Arrow listing was added to the existing source. A used Ultegra Arrow post is a trim lead only. No official build, price or new model row changed. All 21 official builds are mapped in `docs/research-girder-xhs-coverage-ledger-2026-10-24.md`.

## Remaining leads (not added)

GIRDER coverage is complete only within this finite range and the captured XHS corpus. These leads remain open: the BISON 105 Di2 title-only post, the Ultegra and mechanical Arrow builds, the Douyin 2025 Arrow claim, the 2024 e-gravel, Vagrant (2016) and the V-series city bikes (2015), plus uncaptured XHS search results, videos and partial comment threads.

Future XHS model queries could combine "格拉德" with a model name, alone and with the groupset (e.g. "格拉德 Fame R8170", "格拉德 Dash Pro"). Priorities are clearance, real prices and purchase route, owner weights, warranty, and which frame generation a seller is offering.
