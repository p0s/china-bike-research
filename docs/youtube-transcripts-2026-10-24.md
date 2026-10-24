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

## Batch 3 — Yoeleo Altera G21, Winspace G3/G5, Elves, Tavelo Grow, SEKA ExAero GR, Twitter Gravel V3, BXT-055, ICAN GRA04

Delivered: transcript review of every linked video for these platforms and 12 new exact-model videos (Tavelo Grow 7, SEKA ExAero GR 4, Elves Falath Pro 2022 1), five new clearance field reports and reviewer-measured weights for Tavelo Grow, SEKA ExAero GR and Yoeleo Altera G21.

- Yoeleo Altera G21: Patrick Lino's 45 mm tires measured 45 mm and fitted with 2× road Di2 (he expects 53 mm would hit the front-derailleur wire, consistent with Yoeleo's 1×-only 53 mm figure); UK Bike Fit's owner runs 55 mm front / 50 mm rear on 28 mm-internal rims. Oz Cycle weighed a size-56 frame at 1,320 g and fork at 420 g. Builders found the 42T chainring limit realistic with a standard spindle; 46–48T rings needed spacers and sat close to the chainstay.
- Tavelo Grow: against Tavelo's 55 mm front / 50 mm rear, NERO fitted a 2.1 in tire measuring about 54 mm and Woods Cycles fitted about 57 mm front / 54 mm rear on 25 mm-internal rims. Weigh-ins: size S frame 987 g and fork 464 g (Julius Domroes); size 51.5 frame 1,070 g with hardware and uncut fork 481 g (GC Performance). Repeated caveats: limited seatpost insertion (often needs cutting), electronic-groupset routing only, one poorly faced BB shell.
- SEKA ExAero GR: GC Performance ran 29×2.2 in tires (his ~55 mm estimate) with room; Ben_skillz found a 50 mm rear close on wide Zipp 303 XPLR S rims, and the US dealer warns wide rims can push 50 mm tires past the 52 mm rear rating. A size-58 painted frame weighed 1,220 g (SEKA's 980 g claim is size 54 unpainted).
- Winspace G3/G5 and Elves Falath: takeaways only (build notes, fit and finish, seatpost slip fix, routing difficulty); no new numeric clearance evidence beyond the official figures.
- No speech in captions: Rocky Pop Falath build, both ICAN GRA04 factory build videos, Sherry Xie GRA04 build (not added). No caption track: BXT Official 055 overview, Elves Mori AeroX brand video, Pierre Staub G5 unboxing, Vadim on Wheels G3. Empty transcript panel on repeat (not added): Twitter Gravel V3 `jlURjof_mFw`, `zRo7Wf5Blug`, `BV6G8wQDF6Q`.
- Mismatch (not added): BXT `PoBaCk0DQmE`, `6RmPw4_VbW0`, `XtxI6o0yUPQ` show the older BXT Gravel 135, not the 055; Twitter `MPmUqHWyhEs` shows a Gravel V1; Winspace `FyzUCmZK6XA` is the M6 road bike; Elves Falath EVO/EXP/rim-brake videos and Mori videos without AeroX identity.
- Low value or duplicate (not added): promotional Twitter Gravel V3 voice-overs `LRiU3_9_8is`, `6lVsY_E9HW0`; music-only `HBgMo7lTljo`; SEKA `0gA8fsaMZ3U` (repeats the Ben_skillz clearance point), `rknUKahR3-s`, `4jwZGI_XOVA`, `UP-RSKanF9Y` (no decision-relevant facts beyond records added); Tavelo `vXKdfFYLfCg` (cap reached); Winspace `Jbwb3nOMfDY` (launch commentary).

## Batch 4 — first videos for AF01, Bianchi Oltre Race, CAMP GX600/GX700, Evolve CIMA GR, Incolor Voyager, KUNG Mach, LightCarbon LCG071S-PRO/SPEEDZ, Pardus Super Sport Gen2

Delivered: five new exact-model videos with transcript takeaways (AF01 2, Evolve CIMA GR 1, KUNG Mach 1, CAMP GX700 1) and reviewer-measured Evolve CIMA GR frame and fork weights (size ML: 974 g painted with hardware, 394 g uncut fork).

- AF01: an owner's XXL build of the SSL premium layup (AF says about 200 g lighter across frame and fork) and AF's own race video, whose 700×54 mm fork-clearance statement is recorded as a maker claim, not as a change to the 50 mm maximum.
- Evolve CIMA GR: GC Performance confirms 50 mm front and rear (printed on the fork), a 50T 1× maximum and electronic-only 2×.
- KUNG Mach: China Cycling's four-month retailer review (size M build 7.93 kg with pedals; 73.5° seat angle with only a 10 mm-offset aero post).
- CAMP GX700: Indonesian retailer walkaround with stock 45C tires showing room; the 9.9 kg size-48 figure was quoted, not weighed.
- Mismatch (not added): Evolve CIMA road-frame reviews `RwC0DVcGDpY`, `wUP9U1tgk8U`, `QJzLBhC0qM0`, `pd_HiFezS0w`, `mjGbQI0W_p8`, `xl14yzDgiJI` (useful for the `evolve-cima-road` candidate later); Bianchi Oltre Comp `LMpkOo98leE` and Infinito `mIJVaiz6bv0`; Pardus Super Sport first-generation videos; CAMP Beijing shop tour `wQY8nGYGL9o` (no GX600 content).
- Model not identified (not added): LightCarbon gravel and aero-road videos `aBRsiEQOSnI`, `LUlHihI24yI`, `-NYsVBXBj2o`, `8gNfullJAOI`, `Vcam2DBqAcQ` do not name LCG071S-PRO or SPEEDZ.
- No caption track or no speech (not added): AF01 assembly `y4x2q-D5KGI`, CAMP GX600 `sKKgWAF_ZEI`, Pardus Super Sport Gen2 unboxing `wkbXHXhRn0M`, LightCarbon LCG071S launch `2wh59hUs7bw`, Incolor Voyager workshop build `TWtySwsjUho`.
- Low value (not added): Bianchi Oltre Race 105 Di2 voice-over promo `iq_nj9IJE3A`; second CAMP GX700 retailer promo `EY3G43nT_Qk`. No exact KUNG Mach, Incolor Voyager or SPEEDZ review beyond these was found.

## Batch 5 — first videos for the remaining zero-video platforms (Rinasclta GR025, SAVA A7L/Gelaro/S8/SF, SCOTT Addict RC 40, SPCYCLE G026/G028, TFSA JH37, Twitter Cyclone/Gravel V3 2024/T3 TT, XMCS CS-GR01)

Delivered: three new exact-model videos with transcript takeaways and two clearance field reports.

- SAVA Gelaro (S4 GRX400 build): a Russian workshop inspection estimates about 50 mm usable at the rear and 47–48 mm at the front against SAVA's 45C figure, and records QC faults (paint flaking at brake mounts, out-of-round rear axle hole, out-of-true 140 mm rotor) and heavy 19 mm-internal stock wheels.
- SPCYCLE G028: a Russian owner's 800 km review shows ample room with 48 mm tires (maker claims 57 mm); a 170 mm SRAM crank with a 40T ring touched the frame, a 165 mm crank fitted; the size L Rival XPLR build weighed 8.8 kg.
- SCOTT Addict RC 40: a short 2023 US retailer walkaround confirming HMX frame, 105 Di2 and internal routing.
- Trim mismatch (not added): SAVA A7L Pro videos `elgWayjQS70`, `D-mH_qaRoag` (full Shimano 105 R7120, not the SENSAH-mixed A7L); SAVA R08 105 Di2 build `czU9d2rQThg`. Model mismatch: Rinasclta Granite all-road videos (not GR025); XMCS GRT videos (not CS-GR01); TFSA JH-10/JH33/JH-35 videos (not JH37); Twitter Cyclone Pro 2021/2024 videos (not the 3rd ET).
- No caption track, empty panel or music only (not added): SAVA China Rides review `YqpgfRfd6PQ`, Gelaro R21 `F48gzddLfA8`, SPCYCLE G026 `ERebFPFYXGk`, Twitter Gravel V3 2024-era `RJ-uXTCwebY` and `W0wfaCUz1H8`, Twitter Cyclone-3rd and T3 promos `PjiYBuhB1Rw`, `yVXBlSi_yMg`, `lkZfngOaPt4`, `b6fzS4p-u3g`.
- Low value (not added): A7L promo shorts and first-bike vlog `S5nRuoitRKQ`, `EMCP03QcV5c`; Nairobi dealer handover of a Gelaro S4 `RV7OczD-knA`.
- Still without a linked YouTube video after this search: Rinasclta GR025, SAVA A7L R7100, Gelaro S8, Gelaro SF, SPCYCLE G026, TFSA JH37, Twitter Cyclone (both records), Gravel V3 2024, T3 TT, XMCS CS-GR01, plus the batch-4 leftovers.

## Batch 6a — candidate models: Winspace T1600 and M6, Quick Pro ER:ONE/UR:ONE/XR:ONE, Evolve CIMA road, VoiceVelo G Major, BigRock Sohtea, Tavelo Arow 2026, SAVA F20 Hawkeye

Delivered: transcript review and takeaways for all 20 linked videos of these ten candidate models (Winspace T1600 holds eight embeds on its model page). Candidate records stay unpublished in the comparison table; takeaways appear only on their model pages. No new candidate videos were added in this batch; the six Evolve CIMA road videos found in batch 4 remain a later addition.

## Coverage ledger

| Target | Video record | Channel | Transcript outcome |
|---|---|---|---|
| af01 | `af-bicycles-af01-gravel-race-review` | AFbicycles | automatic captions · 3 takeaways |
| af01 | `overbiked-randonneuring-af01-ssl-build` | Overbiked Randonneuring | automatic captions · 6 takeaways |
| bxt-055 | `bxt-store-055-overview` | BXT Official store | no caption track |
| camp-gx700 | `jkt-sepeda-camp-gx700-walkaround` | JKT Sepeda | automatic captions · 4 takeaways |
| carbonda-cfr696 | `andrew-grabbs-carbonda-696-first-look` | Andrew Grabbs | automatic captions · 6 takeaways |
| carbonda-cfr696 | `andrew-grabbs-carbonda-cfr696-build` | Andrew Grabbs | automatic captions · 2 takeaways |
| carbonda-cfr696 | `cycle-the-world-carbonda-cfr696-close-look` | Cycle The World | no caption track |
| carbonda-cfr696 | `lukas-benka-carbonda-696-budget-build` | Lukáš Benka | no speech in captions |
| carbonda-cfr696 | `nimbus-cycles-carbonda-cfr696-49cm-review` | Nimbus Cycles | automatic captions · 5 takeaways |
| carbonda-cfr696 | `oompa-loompa-carbonda-cfr696-owner-interview` | Oompa Loompa Cycling | automatic captions · 4 takeaways |
| carbonda-cfr696 | `simon-eizenhofer-carbonda-cfr696-living-room-build` | Simon Eizenhöfer | no caption track |
| carbonda-cfr696 | `thedropcycling-carbonda-cfr696-grx-di2-build` | theDropCycling | no caption track |
| elves-falath-r7170 | `andy-broadhurst-elves-falath-pro-build-2025` | Andy Broadhurst | automatic captions · 2 takeaways |
| elves-falath-r7170 | `jourdain-coleman-elves-falath-pro-2022-build` | Jourdain Coleman | automatic captions · 3 takeaways |
| elves-falath-r7170 | `jourdain-coleman-elves-falath-pro-disc-inspection` | Jourdain Coleman | automatic captions · 5 takeaways |
| elves-falath-r7170 | `rocky-pop-elves-falath-pro-disc-grx` | Rocky Pop | no speech in captions |
| elves-mori-aerox | `elves-mori-aerox-brand-overview` | ELVES BIKE | no caption track |
| evolve-cima-gr | `gc-performance-evolve-cima-gr-unboxing` | GC Performance | automatic captions · 5 takeaways |
| ican-gra04 | `icanbikes-gra04-apex-xplr-build` | icanian | no speech in captions |
| ican-gra04 | `icanbikes-gra04-race-build` | icanian | no speech in captions |
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
| kung-mach | `china-cycling-kung-mach-vs-vfv-build` | China Cycling | automatic captions · 5 takeaways |
| quick-gr-one | `beijing-feeling-quick-pro-gr-one-build` | Beijing FEELING-Bicycle Studio | no speech in captions |
| quick-gr-one | `dream-build-quick-pro-gr-one` | Dream Build | no caption track |
| quick-gr-one | `julius-domroes-gr-one-crit-road-build` | Julius Domroes | creator captions · 4 takeaways |
| quick-gr-one | `julius-domroes-gr-one-grow-comparison` | Julius Domroes | creator captions · 4 takeaways |
| quick-gr-one | `julius-domroes-quick-pro-gr-one-review` | Julius Domroes | creator captions · 5 takeaways |
| quick-gr-one | `pedaler-quick-pro-gr-one-buyer-guide` | Pedaler | automatic captions · 4 takeaways |
| quick-gr-one | `pedaler-quick-pro-gr-one-review-test-ride` | Pedaler | automatic captions · 3 takeaways |
| quick-gr-one | `victor-torres-quick-pro-gr-one-dream-build` | victor torres | no caption track |
| sava-gelaro | `love-bike-sava-gelaro-s4-express-review` | Веломастерская love.bike | automatic captions · 6 takeaways |
| scott-addict-rc-40 | `victory-bicycle-studio-addict-rc-40-2023` | Victory Bicycle Studio | automatic captions · 2 takeaways |
| seka-exaero-gr | `ben-skillz-seka-exaero-gr-build` | Ben_skillz | automatic captions · 5 takeaways |
| seka-exaero-gr | `bicidastrada-seka-exaero-gr-review` | BiciDaStrada | automatic captions · 5 takeaways |
| seka-exaero-gr | `dwayne-pedals-seka-exaero-gr-unboxing` | Dwayne Pedals | automatic captions · 4 takeaways |
| seka-exaero-gr | `gc-performance-seka-exaero-gr-build` | GC Performance | automatic captions · 4 takeaways |
| seka-exaero-gr | `power-meter-city-seka-exaero-gr-guide` | Power Meter City | automatic captions · 4 takeaways |
| spcycle-g028 | `zzefol-spcycle-g028-owner-review` | zzefol | automatic captions · 4 takeaways |
| tavelo-grow | `cus-baker-tavelo-grow-build` | Cus Baker | automatic captions · 2 takeaways |
| tavelo-grow | `gc-performance-tavelo-grow-all-road-build` | GC Performance | automatic captions · 3 takeaways |
| tavelo-grow | `gc-performance-tavelo-grow-unboxing` | GC Performance | automatic captions · 4 takeaways |
| tavelo-grow | `ide-schelling-tavelo-grow-uci-race` | Ide Schelling | automatic captions · 5 takeaways |
| tavelo-grow | `julius-domroes-tavelo-grow-inspection` | Julius Domroes | creator captions · 6 takeaways |
| tavelo-grow | `kdot-tavelo-grow-owner-build` | kdot | automatic captions · 3 takeaways |
| tavelo-grow | `nero-tavelo-grow-review` | NERO Cycling | automatic captions · 7 takeaways |
| tavelo-grow | `woods-cycles-tavelo-grow-demo` | Woods Cycles | automatic captions · 4 takeaways |
| twitter-gravel-v3 | `vitality-twitter-gravel-v3-2025-wheeltop-review` | VITALITY | automatic captions · 4 takeaways |
| winspace-g3 | `cus-baker-winspace-g3-review` | Cus Baker | automatic captions · 5 takeaways |
| winspace-g3 | `gravel-trash-panda-winspace-g3-build` | gravel trash panda | automatic captions · 2 takeaways |
| winspace-g3 | `spindatt-winspace-g3-mechanical-build` | Spindatt | automatic captions · 2 takeaways |
| winspace-g3 | `spindatt-winspace-g3-off-road` | Spindatt | automatic captions · 3 takeaways |
| winspace-g3 | `vadim-on-wheels-winspace-g3-150km` | Vadim on wheels | no caption track |
| winspace-g3 | `woods-cycles-winspace-g3-unboxing` | Woods Cycles | automatic captions · 3 takeaways |
| winspace-g5 | `gc-performance-winspace-g5` | GC Performance | automatic captions · 5 takeaways |
| winspace-g5 | `pierre-staub-winspace-g5-unboxing-quality-check` | Pierre Staub | no caption track |
| winspace-g5 | `woods-cycles-winspace-g5-rival-walkaround` | Woods Cycles | automatic captions · 3 takeaways |
| yoeleo-altera-g21 | `charles-ouimet-yoeleo-g21-altera-first-look` | Charles Ouimet | automatic captions · 7 takeaways |
| yoeleo-altera-g21 | `china-cycling-yoeleo-altera-g21` | China Cycling | automatic captions · 7 takeaways |
| yoeleo-altera-g21 | `gc-performance-yoeleo-altera-g21-singletrack` | GC Performance | automatic captions · 3 takeaways |
| yoeleo-altera-g21 | `oz-cycle-yoeleo-g21-altera-overview` | oz cycle | automatic captions · 5 takeaways |
| yoeleo-altera-g21 | `patrick-lino-yoeleo-g21-altera-finished` | Patrick Lino | automatic captions · 5 takeaways |
| yoeleo-altera-g21 | `peak-torque-yoeleo-altera-g21-slovenia-final-review` | Peak Torque | automatic captions · 4 takeaways |
| yoeleo-altera-g21 | `tom-bowers-yoeleo-altera-g21-build` | Tom Bowers Cycling | creator captions · 6 takeaways |
| yoeleo-altera-g21 | `uk-bike-fit-yoeleo-altera-g21-custom-build` | UK Bike Fit | automatic captions · 4 takeaways |
| bigrock-sohtea (candidate/wheelset) | `china-cycling-bigrock-sohtea-long-term` | China Cycling | automatic captions · 7 takeaways |
| carbonda-cfr707 (candidate/wheelset) | `daryl-pace-carbonda-cfr707-build` | Daryl Pace | not yet reviewed |
| carbonda-cfr707 (candidate/wheelset) | `sysadmin-carbonda-cfr707-owner-build` | Sysadmin | not yet reviewed |
| elitewheels-drive-50d-ii (candidate/wheelset) | `cyclists-hub-elitewheels-drive-50d-ii-review` | Cyclists Hub \| Petr Minarik | not yet reviewed |
| elitewheels-drive-50d-ii (candidate/wheelset) | `the-bike-sauce-elitewheels-drive-50d-ii-review` | The Bike Sauce | not yet reviewed |
| elitewheels-drive-g36 (candidate/wheelset) | `bicycle-station-gravel-wheel-shootout-drive-g36` | The Bicycle Station | not yet reviewed |
| elitewheels-drive-g36 (candidate/wheelset) | `lovemtb-elitewheels-drive-g36-tech-check` | LoveMTB | not yet reviewed |
| evolve-cima-road (candidate/wheelset) | `china-cycling-cima-lightweight-build` | China Cycling | automatic captions · 3 takeaways |
| evolve-cima-road (candidate/wheelset) | `china-cycling-cima-long-term` | China Cycling | automatic captions · 5 takeaways |
| ican-alpha-50-ii-disc (candidate/wheelset) | `ican-alpha-50-ii-disc-build` | ICAN Cycling | not yet reviewed |
| lightcarbon-lcg071-pro (candidate/wheelset) | `lightcarbon-lcg071-pro-brand-overview` | LightCarbon | not yet reviewed |
| lightcarbon-lcg071-pro (candidate/wheelset) | `tom-bowers-lightcarbon-lcg071-pro-build` | Tom Bowers Cycling | not yet reviewed |
| missing-china-price-elves-falath-evo (candidate/wheelset) | `cam-nicholls-falath-evo-inspection` | Cam Nicholls | not yet reviewed |
| missing-china-price-elves-falath-evo (candidate/wheelset) | `gc-performance-falath-evo-ride-review` | GC Performance | not yet reviewed |
| missing-china-price-elves-vanyar (candidate/wheelset) | `jourdain-coleman-vanyar-pro-2024-unbox` | Jourdain Coleman | not yet reviewed |
| missing-china-price-elves-vanyar (candidate/wheelset) | `popeye-vanyar-pro-disc-2024-build` | CYCLE SHOP POPEYE Channel | not yet reviewed |
| missing-china-price-quick-pro-xr-one (candidate/wheelset) | `china-cycling-quick-pro-xr-one` | China Cycling | automatic captions · 2 takeaways |
| missing-china-price-tavelo-arow (candidate/wheelset) | `china-cycling-tavelo-arow-2026-build` | China Cycling | automatic captions · 3 takeaways |
| missing-china-price-winspace-slc3 (candidate/wheelset) | `david-arthur-winspace-slc3-review` | David Arthur - Just Ride Bikes | not yet reviewed |
| missing-china-price-winspace-t1550 (candidate/wheelset) | `watt-life-t1550-gen2-build-cost` | The Watt Life | not yet reviewed |
| quick-pro-er-one (candidate/wheelset) | `china-cycling-quick-pro-er-one` | China Cycling | automatic captions · 6 takeaways |
| quick-pro-ur-one (candidate/wheelset) | `china-cycling-quick-pro-ur-one` | China Cycling | automatic captions · 3 takeaways |
| quick-pro-ur-one (candidate/wheelset) | `china-rides-quick-pro-ur-one` | China Rides | automatic captions · 4 takeaways |
| sava-f20-hawkeye (candidate/wheelset) | `china-cycling-sava-f20-hawkeye` | China Cycling | automatic captions · 4 takeaways |
| seka-spear-rdc (candidate/wheelset) | `cyclingnews-seka-spear-rdc-review` | Cyclingnews Tech | not yet reviewed |
| voicevelo-g-major (candidate/wheelset) | `china-cycling-voicevelo-g-major` | China Cycling | automatic captions · 5 takeaways |
| winspace-m6 (candidate/wheelset) | `china-rides-winspace-m6-shop-tour` | China Rides | automatic captions · 3 takeaways |
| winspace-m6 (candidate/wheelset) | `cyclists-hub-m6-review` | Cyclists Hub \| Petr Minarik | automatic captions · 5 takeaways |
| winspace-t1600 (candidate/wheelset) | `cyclists-hub-t1600-review` | Cyclists Hub \| Petr Minarik | automatic captions · 5 takeaways |
| winspace-t1600 (candidate/wheelset) | `gc-performance-winspace-t1600-build` | GC Performance | automatic captions · 4 takeaways |
| winspace-t1600 (candidate/wheelset) | `gc-performance-winspace-t1600-ride` | GC Performance | automatic captions · 3 takeaways |
| winspace-t1600 (candidate/wheelset) | `hambini-t1600-long-term-review` | Hambini | automatic captions · 5 takeaways |
| winspace-t1600 (candidate/wheelset) | `its-all-about-racing-winspace-t1600-30-days` | It's all about racing | automatic captions · 3 takeaways |
| winspace-t1600 (candidate/wheelset) | `its-all-about-racing-winspace-t1600-unboxing` | It's all about racing | automatic captions · 1 takeaways |
| winspace-t1600 (candidate/wheelset) | `nero-show-winspace-t1600-review` | NERO Cycling | automatic captions · 5 takeaways |
| winspace-t1600 (candidate/wheelset) | `ridemedia-winspace-t1600-try-before-you-buy` | ridemedia | automatic captions · 1 takeaways |
| xlab-ad8 (candidate/wheelset) | `china-rides-xlab-ad8-build` | China Rides | not yet reviewed |
| yoeleo-sat-c45-db-pro-nxt-gravel (candidate/wheelset) | `cycle-workshop-yoeleo-sat-c45-nxt-gravel-long-term` | The Cycle Workshop | not yet reviewed |
| yoeleo-sat-c45-db-pro-nxt-gravel (candidate/wheelset) | `cycle-workshop-yoeleo-sat-c45-nxt-gravel-review` | The Cycle Workshop | not yet reviewed |

Published platforms with no linked YouTube video yet: `bianchi-oltre-race`, `camp-gx600`, `incolor-voyager`, `lightcarbon-lcg071s-pro`, `lightcarbon-speedz`, `pardus-super-sport-gen2`, `rinasclta-gr025`, `sava-a7l-r7100`, `sava-gelaro-s8`, `sava-gelaro-sf`, `spcycle-g026`, `tfsa-jh37`, `twitter-cyclone-electronic`, `twitter-cyclone-gen3-et`, `twitter-gravel-v3-2024`, `twitter-t3-tt`, `xmcarbonspeed-cs-gr01`.
