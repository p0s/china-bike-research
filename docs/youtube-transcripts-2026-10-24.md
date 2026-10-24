# YouTube transcript evidence — 2026-10-24

This ledger tracks the transcript-backed video campaign: every published bike platform and every linked YouTube record is reviewed against its public transcript, useful points become takeaways under the player, and reviewer tire-fit observations become clearance field reports beside the official maximum.

## Method

- Frozen scope (2026-10-24): the 39 published platforms and the 93 YouTube records already linked to platforms, candidates or wheelsets. New exact-model videos are searched for every published platform.
- Transcripts are read from YouTube's public "Show transcript" panel in the approved research browser. Direct caption endpoints required player attestation and were not used. Raw transcripts stay outside Git.
- `transcript.status` records creator captions, automatic captions, captions with no speech (music-only videos), or no caption track. Only videos with reviewed speech carry takeaways.
- Decisive numbers were spot-checked against playback where the captions were ambiguous. Takeaways are paraphrases for the build shown; they never replace official values. Conflicts between reviewers stay visible.

## Batch 1 — Incolor and infrastructure

Delivered: video transcript status and takeaways (schema, validation, model-page rendering), tire-clearance field reports (catalog popover, model facts, comparison, build planner), SPEC update, and the Incolor records below.

The reported 38 mm versus about 35 mm remark comes from Crafted Cycles' Speedster SR+ build (`H7SQgMrzg8Y`, 15:52–17:05): on a 58 cm SR+ with 2× Shimano Dura-Ace Di2, the fitted GP5000 tires measured about 32.5 mm with little room left; the mechanics doubted 38 mm would fit and expected even 35 mm to be tight on a wide rim. Incolor's 38 mm figure is for 1× (2×: 32 mm), and no 1× build or larger tire was tested. Incolor's engineer says SR and SR+ share one mould (Cyclists Hub interview); a French dealer says SS/SS+ were the earlier names of SR/SR+, which Incolor's own pages do not confirm. The official maximum is unchanged; the observation is shown as a field report and as a caveat on both Speedster variants.

The SSR now has eight videos, including Cyclingnews (harshest bike its tester had ridden) and an owner who found it comfortable after 600 miles; NERO's tester fitted a tire measuring 34 mm with about 6 mm per side on a 2× build.

Incolor discovery outcomes (searched 2026-10-24):

| Video | Outcome |
|---|---|
| `wAS_81vGinE`, `Dx_-S_PiXio`, `mpS-H-R2mrk`, `tUxUIY2jMhU`, `1JpFS7ocE0Y`, `ObSDrDgvnYk` | Added to SSR |
| `LBa1XWkd8io`, `YEbSMYvdWeU`, `etcz28lFTlc` | Added to Speedster SR/SR+ |
| `rh509RLbwvo`, `5R-vz8DLPwk`, `3VkPZayHnpM` | Exact SSR, not added: eight-video cap reached with more decision-relevant reviews |
| `CstizmBvIGE`, `exdKZ4Nz_TA`, `P3C0K2bqhPo`, `QpYOafaZ61I`, `Ab1bvpfGWYA` | Exact SSR, no caption track; not added |
| `aHc4EyANLwM` | Exact SR (Russian unboxing); repeats maker claims only; not added |
| `T5lfUVXmK8o`, `2wgEP-6UIWE` | Earlier SS / SS+ naming; not mapped to the current platform without Incolor confirmation |
| `TWtySwsjUho` | Voyager workshop clip without speech; no suitable Voyager review found |

## Batch 2 — Carbonda CFR696, ICAN Graro, Quick GR:ONE

Delivered: transcript review of all 24 linked videos for these platforms, reviewer-measured frame and fork weights in the specification table (new `frame.measured_weights`), two clearance field reports and Incolor opinion collections.

- ICAN Graro: Magazyn BIKE's six-month test says about 49 mm fits against ICAN's 45 mm (spoken figure from automatic captions; no measurement shown on screen). Hambini (size 54: 1,020 g frame, 528 g cut fork) and Patrick Lino (size 54: 1,111 g with bolts, 455 g uncut fork) weigh-ins added.
- Quick GR:ONE: Julius Domroes fitted a front tire measuring 50 mm in dry use but calls his 46.5 mm-wide tires about the maximum overall; his size-L frame and fork weighed 1,450 g.
- Carbonda CFR696: Andrew Grabbs' 2020 BB86 size-56 frame weighed 1,320 g with hardware and the fork 568 g; earlier generation details (BB86/BSA) are labelled with their year.
- No speech in captions: Lukáš Benka CFR696 build, Beijing FEELING GR:ONE build. No caption track: Cycle The World and Simon Eizenhöfer CFR696, theDropCycling CFR696, ICAN Graro assembly guide, Dream Build and Victor Torres GR:ONE.
- Discovery: all three platforms already hold the eight-video maximum. Exact-model candidates not added for that reason: CFR696 `cUhWudJzemU`, `JYK2vyZgZ9I`, `Dza-H7gwrvE`, `q5ScTw3dklk`, `bgGvbcUtqv8`, `o1gRx291jNg`; Graro `hkkuOgqxujY`, `-VvHFSzZzv8`, `kEXgcRnfcEA`, `k_fDqHTBEso`, `meTkkcVeumc`, `YcHC5OTn3ME`, `Qdv8TncG4XQ`, `4Jfof423-d4`; GR:ONE `Z-B0KsYbZ1Y`, `rAhu2ohADlI`, `WbKfXeFWyrI`, `mbz3Em10QlQ`, `Yh1vsGS6k3k`, `jzkaVwTRyI0`. Swapping out caption-less records would need a documented retirement and is left for a curation pass.

## Coverage ledger

| Target | Video record | Channel | Transcript outcome |
|---|---|---|---|
| bxt-055 | `bxt-store-055-overview` | BXT Official store | not yet reviewed |
| carbonda-cfr696 | `andrew-grabbs-carbonda-696-first-look` | Andrew Grabbs | automatic captions · 6 takeaways |
| carbonda-cfr696 | `andrew-grabbs-carbonda-cfr696-build` | Andrew Grabbs | automatic captions · 2 takeaways |
| carbonda-cfr696 | `cycle-the-world-carbonda-cfr696-close-look` | Cycle The World | no caption track |
| carbonda-cfr696 | `lukas-benka-carbonda-696-budget-build` | Lukáš Benka | no speech in captions |
| carbonda-cfr696 | `nimbus-cycles-carbonda-cfr696-49cm-review` | Nimbus Cycles | automatic captions · 5 takeaways |
| carbonda-cfr696 | `oompa-loompa-carbonda-cfr696-owner-interview` | Oompa Loompa Cycling | automatic captions · 4 takeaways |
| carbonda-cfr696 | `simon-eizenhofer-carbonda-cfr696-living-room-build` | Simon Eizenhöfer | no caption track |
| carbonda-cfr696 | `thedropcycling-carbonda-cfr696-grx-di2-build` | theDropCycling | no caption track |
| elves-falath-r7170 | `andy-broadhurst-elves-falath-pro-build-2025` | Andy Broadhurst | not yet reviewed |
| elves-falath-r7170 | `jourdain-coleman-elves-falath-pro-disc-inspection` | Jourdain Coleman | not yet reviewed |
| elves-falath-r7170 | `rocky-pop-elves-falath-pro-disc-grx` | Rocky Pop | not yet reviewed |
| elves-mori-aerox | `elves-mori-aerox-brand-overview` | ELVES BIKE | not yet reviewed |
| ican-gra04 | `icanbikes-gra04-apex-xplr-build` | icanian | not yet reviewed |
| ican-gra04 | `icanbikes-gra04-race-build` | icanian | not yet reviewed |
| ican-graro | `cycle-workshop-ican-graro-build` | The Cycle Workshop | automatic captions · 6 takeaways |
| ican-graro | `cycle-workshop-ican-graro-ride-review` | The Cycle Workshop | automatic captions · 5 takeaways |
| ican-graro | `hambini-ican-graro-inspection` | Hambini | automatic captions · 6 takeaways |
| ican-graro | `ican-graro-assembly-guide` | ICAN Cycling | no caption track |
| ican-graro | `lorenzo-del-sant-ican-triaero-graro-review` | Lorenzo Del Sant | automatic captions · 4 takeaways |
| ican-graro | `magazyn-bike-triaero-graro-six-month-test` | Magazyn BIKE | automatic captions · 6 takeaways |
| ican-graro | `oz-cycle-ican-graro-frameset-overview` | oz cycle | automatic captions · 5 takeaways |
| ican-graro | `patrick-lino-ican-graro-first-look` | Patrick Lino | automatic captions · 4 takeaways |
| incolor-speedster | `china-rides-incolor-speedster-shop` | China Rides | automatic captions · 2 takeaways |
| incolor-speedster | `crafted-cycles-incolor-sr-plus-build` | Crafted Cycles | automatic captions · 7 takeaways |
| incolor-speedster | `cyclists-hub-incolor-engineer-interview` | Cyclists Hub \| Petr Minarik | creator captions · 3 takeaways |
| incolor-speedster | `yocyclo-incolor-sr-plus-frameset` | yocyclo | automatic captions · 5 takeaways |
| incolor-ssr | `china-cycling-incolor-ssr-published` | China Cycling | automatic captions · 7 takeaways |
| incolor-ssr | `china-rides-incolor-ssr` | China Rides | automatic captions · 4 takeaways |
| incolor-ssr | `cyclingnews-incolor-ssr-review` | Cyclingnews Tech | automatic captions · 6 takeaways |
| incolor-ssr | `dwayne-pedals-incolor-ssr-600-miles` | Dwayne Pedals | automatic captions · 5 takeaways |
| incolor-ssr | `dwayne-pedals-incolor-ssr-first-look` | Dwayne Pedals | automatic captions · 4 takeaways |
| incolor-ssr | `gc-performance-incolor-ssr-walkaround` | GC Performance | automatic captions · 3 takeaways |
| incolor-ssr | `nero-show-incolor-ssr-review` | NERO Cycling | automatic captions · 7 takeaways |
| incolor-ssr | `underdogs-cycling-incolor-ssr-build` | Underdogs Cycling | creator captions · 4 takeaways |
| quick-gr-one | `beijing-feeling-quick-pro-gr-one-build` | Beijing FEELING-Bicycle Studio | no speech in captions |
| quick-gr-one | `dream-build-quick-pro-gr-one` | Dream Build | no caption track |
| quick-gr-one | `julius-domroes-gr-one-crit-road-build` | Julius Domroes | creator captions · 4 takeaways |
| quick-gr-one | `julius-domroes-gr-one-grow-comparison` | Julius Domroes | creator captions · 4 takeaways |
| quick-gr-one | `julius-domroes-quick-pro-gr-one-review` | Julius Domroes | creator captions · 5 takeaways |
| quick-gr-one | `pedaler-quick-pro-gr-one-buyer-guide` | Pedaler | automatic captions · 4 takeaways |
| quick-gr-one | `pedaler-quick-pro-gr-one-review-test-ride` | Pedaler | automatic captions · 3 takeaways |
| quick-gr-one | `victor-torres-quick-pro-gr-one-dream-build` | victor torres | no caption track |
| seka-exaero-gr | `bicidastrada-seka-exaero-gr-review` | BiciDaStrada | not yet reviewed |
| tavelo-grow | `nero-tavelo-grow-review` | NERO Cycling | not yet reviewed |
| twitter-gravel-v3 | `vitality-twitter-gravel-v3-2025-wheeltop-review` | VITALITY | not yet reviewed |
| winspace-g3 | `cus-baker-winspace-g3-review` | Cus Baker | not yet reviewed |
| winspace-g3 | `gravel-trash-panda-winspace-g3-build` | gravel trash panda | not yet reviewed |
| winspace-g3 | `spindatt-winspace-g3-mechanical-build` | Spindatt | not yet reviewed |
| winspace-g3 | `spindatt-winspace-g3-off-road` | Spindatt | not yet reviewed |
| winspace-g3 | `vadim-on-wheels-winspace-g3-150km` | Vadim on wheels | not yet reviewed |
| winspace-g3 | `woods-cycles-winspace-g3-unboxing` | Woods Cycles | not yet reviewed |
| winspace-g5 | `gc-performance-winspace-g5` | GC Performance | not yet reviewed |
| winspace-g5 | `pierre-staub-winspace-g5-unboxing-quality-check` | Pierre Staub | not yet reviewed |
| winspace-g5 | `woods-cycles-winspace-g5-rival-walkaround` | Woods Cycles | not yet reviewed |
| yoeleo-altera-g21 | `charles-ouimet-yoeleo-g21-altera-first-look` | Charles Ouimet | not yet reviewed |
| yoeleo-altera-g21 | `china-cycling-yoeleo-altera-g21` | China Cycling | not yet reviewed |
| yoeleo-altera-g21 | `gc-performance-yoeleo-altera-g21-singletrack` | GC Performance | not yet reviewed |
| yoeleo-altera-g21 | `oz-cycle-yoeleo-g21-altera-overview` | oz cycle | not yet reviewed |
| yoeleo-altera-g21 | `patrick-lino-yoeleo-g21-altera-finished` | Patrick Lino | not yet reviewed |
| yoeleo-altera-g21 | `peak-torque-yoeleo-altera-g21-slovenia-final-review` | Peak Torque | not yet reviewed |
| yoeleo-altera-g21 | `tom-bowers-yoeleo-altera-g21-build` | Tom Bowers Cycling | not yet reviewed |
| yoeleo-altera-g21 | `uk-bike-fit-yoeleo-altera-g21-custom-build` | UK Bike Fit | not yet reviewed |
| bigrock-sohtea (candidate/wheelset) | `china-cycling-bigrock-sohtea-long-term` | China Cycling | not yet reviewed |
| carbonda-cfr707 (candidate/wheelset) | `daryl-pace-carbonda-cfr707-build` | Daryl Pace | not yet reviewed |
| carbonda-cfr707 (candidate/wheelset) | `sysadmin-carbonda-cfr707-owner-build` | Sysadmin | not yet reviewed |
| elitewheels-drive-50d-ii (candidate/wheelset) | `cyclists-hub-elitewheels-drive-50d-ii-review` | Cyclists Hub \| Petr Minarik | not yet reviewed |
| elitewheels-drive-50d-ii (candidate/wheelset) | `the-bike-sauce-elitewheels-drive-50d-ii-review` | The Bike Sauce | not yet reviewed |
| elitewheels-drive-g36 (candidate/wheelset) | `bicycle-station-gravel-wheel-shootout-drive-g36` | The Bicycle Station | not yet reviewed |
| elitewheels-drive-g36 (candidate/wheelset) | `lovemtb-elitewheels-drive-g36-tech-check` | LoveMTB | not yet reviewed |
| evolve-cima-road (candidate/wheelset) | `china-cycling-cima-lightweight-build` | China Cycling | not yet reviewed |
| evolve-cima-road (candidate/wheelset) | `china-cycling-cima-long-term` | China Cycling | not yet reviewed |
| ican-alpha-50-ii-disc (candidate/wheelset) | `ican-alpha-50-ii-disc-build` | ICAN Cycling | not yet reviewed |
| lightcarbon-lcg071-pro (candidate/wheelset) | `lightcarbon-lcg071-pro-brand-overview` | LightCarbon | not yet reviewed |
| lightcarbon-lcg071-pro (candidate/wheelset) | `tom-bowers-lightcarbon-lcg071-pro-build` | Tom Bowers Cycling | not yet reviewed |
| missing-china-price-elves-falath-evo (candidate/wheelset) | `cam-nicholls-falath-evo-inspection` | Cam Nicholls | not yet reviewed |
| missing-china-price-elves-falath-evo (candidate/wheelset) | `gc-performance-falath-evo-ride-review` | GC Performance | not yet reviewed |
| missing-china-price-elves-vanyar (candidate/wheelset) | `jourdain-coleman-vanyar-pro-2024-unbox` | Jourdain Coleman | not yet reviewed |
| missing-china-price-elves-vanyar (candidate/wheelset) | `popeye-vanyar-pro-disc-2024-build` | CYCLE SHOP POPEYE Channel | not yet reviewed |
| missing-china-price-quick-pro-xr-one (candidate/wheelset) | `china-cycling-quick-pro-xr-one` | China Cycling | not yet reviewed |
| missing-china-price-tavelo-arow (candidate/wheelset) | `china-cycling-tavelo-arow-2026-build` | China Cycling | not yet reviewed |
| missing-china-price-winspace-slc3 (candidate/wheelset) | `david-arthur-winspace-slc3-review` | David Arthur - Just Ride Bikes | not yet reviewed |
| missing-china-price-winspace-t1550 (candidate/wheelset) | `watt-life-t1550-gen2-build-cost` | The Watt Life | not yet reviewed |
| quick-pro-er-one (candidate/wheelset) | `china-cycling-quick-pro-er-one` | China Cycling | not yet reviewed |
| quick-pro-ur-one (candidate/wheelset) | `china-cycling-quick-pro-ur-one` | China Cycling | not yet reviewed |
| quick-pro-ur-one (candidate/wheelset) | `china-rides-quick-pro-ur-one` | China Rides | not yet reviewed |
| sava-f20-hawkeye (candidate/wheelset) | `china-cycling-sava-f20-hawkeye` | China Cycling | not yet reviewed |
| seka-spear-rdc (candidate/wheelset) | `cyclingnews-seka-spear-rdc-review` | Cyclingnews Tech | not yet reviewed |
| voicevelo-g-major (candidate/wheelset) | `china-cycling-voicevelo-g-major` | China Cycling | not yet reviewed |
| winspace-m6 (candidate/wheelset) | `china-rides-winspace-m6-shop-tour` | China Rides | not yet reviewed |
| winspace-m6 (candidate/wheelset) | `cyclists-hub-m6-review` | Cyclists Hub \| Petr Minarik | not yet reviewed |
| winspace-t1600 (candidate/wheelset) | `cyclists-hub-t1600-review` | Cyclists Hub \| Petr Minarik | not yet reviewed |
| winspace-t1600 (candidate/wheelset) | `gc-performance-winspace-t1600-build` | GC Performance | not yet reviewed |
| winspace-t1600 (candidate/wheelset) | `gc-performance-winspace-t1600-ride` | GC Performance | not yet reviewed |
| winspace-t1600 (candidate/wheelset) | `hambini-t1600-long-term-review` | Hambini | not yet reviewed |
| winspace-t1600 (candidate/wheelset) | `its-all-about-racing-winspace-t1600-30-days` | It's all about racing | not yet reviewed |
| winspace-t1600 (candidate/wheelset) | `its-all-about-racing-winspace-t1600-unboxing` | It's all about racing | not yet reviewed |
| winspace-t1600 (candidate/wheelset) | `nero-show-winspace-t1600-review` | NERO Cycling | not yet reviewed |
| winspace-t1600 (candidate/wheelset) | `ridemedia-winspace-t1600-try-before-you-buy` | ridemedia | not yet reviewed |
| xlab-ad8 (candidate/wheelset) | `china-rides-xlab-ad8-build` | China Rides | not yet reviewed |
| yoeleo-sat-c45-db-pro-nxt-gravel (candidate/wheelset) | `cycle-workshop-yoeleo-sat-c45-nxt-gravel-long-term` | The Cycle Workshop | not yet reviewed |
| yoeleo-sat-c45-db-pro-nxt-gravel (candidate/wheelset) | `cycle-workshop-yoeleo-sat-c45-nxt-gravel-review` | The Cycle Workshop | not yet reviewed |

Published platforms with no linked YouTube video yet: `af01`, `bianchi-oltre-race`, `camp-gx600`, `camp-gx700`, `evolve-cima-gr`, `incolor-voyager`, `kung-mach`, `lightcarbon-lcg071s-pro`, `lightcarbon-speedz`, `pardus-super-sport-gen2`, `rinasclta-gr025`, `sava-a7l-r7100`, `sava-gelaro`, `sava-gelaro-s8`, `sava-gelaro-sf`, `scott-addict-rc-40`, `spcycle-g026`, `spcycle-g028`, `tfsa-jh37`, `twitter-cyclone-electronic`, `twitter-cyclone-gen3-et`, `twitter-gravel-v3-2024`, `twitter-t3-tt`, `xmcarbonspeed-cs-gr01`.

Rows marked "not yet reviewed" belong to later batches of this campaign.
