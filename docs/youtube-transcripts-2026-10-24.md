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

## Batch 6b — remaining candidates and wheelsets: Winspace SLC3 and T1550 Gen 2, Carbonda CFR707, SEKA Spear RDC, X-LAB AD8, Elves Falath EVO and Vanyar Pro, LightCarbon LCG071-PRO; Elitewheels Drive 50D II and Drive G36, ICAN Alpha 50 II Disc, Yoeleo SAT C45 NXT Gravel

Delivered: transcript review of the last 19 linked videos, closing the frozen 93-record scope. Takeaways for all videos with speech; Popeye's Vanyar Pro build has no speech in its captions; ICAN's Alpha 50 II build and LightCarbon's LCG071-PRO overview have no caption track. The X-LAB AD8 frame weight spoken around 2:40 was garbled in the captions and is not used.

## Candidate discovery continuation (from 2026-10-25)

The first campaign searched for new videos only for published platforms. This continuation freezes the 283 research-stage candidate records as of main `22ad6ff9` and searches YouTube for each identifiable exact model, including candidates that already had videos. Records are grouped by exact identity: trims of one physical platform share a search, merged or superseded pointers inherit their target's outcome, and generic or model-unclear records are marked unsuitable for exact-model video search instead of being given an invented identity. Search result cards are discovery only; every selected video is transcript-checked, and a video is linked only to the exact candidate model it shows. Sibling generations, trims with a different frame and look-alike OEM frames are recorded as mismatches.

### Batch 7 — Evolve CIMA road, SAVA A7L Pro, BXT Gravel 135, Winspace M6, Elves Falath EVO, ALVAS DA54, Argon 18 Krypton Pro, BASSO Venta Disc, Bianchi Sprint ICR, Airwolf YF-R003

Delivered: 17 new transcript-checked candidate videos and attributed field reports in the candidates' clearance, weight and stiffness notes.

- Evolve CIMA road (`evolve-cima-road`): added Cyclists Hub (`wUP9U1tgk8U`), Hambini (`pd_HiFezS0w`), Cus Baker (`xl14yzDgiJI`) and Peak Torque (`RwC0DVcGDpY`), the batch-4 road-frame leads. Weigh-ins: size ML 765 g frame, 385 g uncut fork (Cyclists Hub); 775 g frame, about 363 g fork, size not stated (Hambini). Cyclists Hub's 32 mm tires measured about 34 mm on wide rims, near the limit. Two reviewers and a retailer report the Di2 battery holder in the seatpost losing grip. Evolve's own build video `mjGbQI0W_p8` has music only (not added); China Cycling's `x82UHOASTxc` was not added because the record already holds two China Cycling videos.
- SAVA A7L Pro (`sava-a7l-pro-2026`): added BikeLabHQ (`elgWayjQS70`) and an owner walkaround (`D-mH_qaRoag`), both rejected earlier for the published A7L R7100 because the Pro is the full-105 trim. The owner fitted 28 mm GP5000 tires with a tight rear against SAVA's 25C figure; recorded as a community report only. SAVA R08 7170 unboxing vlog `czU9d2rQThg` (trim unclear; build and music only) was not added to `sava-r8-r8170`.
- BXT Gravel 135 (`bxt-gravel-complete`): the three BXT 135 frame videos rejected for the BXT-055 platform now map to the candidate's 135 frame (`PoBaCk0DQmE`, `6RmPw4_VbW0`, `XtxI6o0yUPQ`): painted size-56 frame about 1,330 g with a 500 g fork, and 45 mm tires fitting with room in two builds.
- Winspace M6 (`winspace-m6`): added BikeRadar's review (`FyzUCmZK6XA`): size-L 105 Di2 just over 8.3 kg with pedals and cages, low stack with a slack 72.3° head angle, and toe overlap on 28 mm tires.
- Elves Falath EVO (`missing-china-price-elves-falath-evo`): added Jourdain Coleman's 500-mile review of a 2023 frame (`YY7ZSH18tDI`), 8.79 kg on 32 mm tires. Cam Nicholls' `Ucf-h48Mbuc` (2022 Falath before the EVO) and David Arthur's Falath EXP review `bZL_AtGYFe8` are sibling-model mismatches.
- ALVAS DA54 (`alums-da54`): added The Velographer (`JeyM3VJJ2QY`; stock size S Ultegra Di2 8.4 kg with pedals) and two China Rides videos (`K76Ho12PHS8`, `VDHvlYO6if8`; ¥28,000 and 7.7 kg as built), with China Rides' brand relationship disclosed. China Rides' build `dCjKrKa1HSo` repeats the same bike and was not added.
- Argon 18 Krypton Pro (`argon18-krypton-pro`): added Chris Hall's sponsored review (`PynzfKYcwEI`); his 500 km bike check `yGTUVSnKD5Y` repeats it. Krypton (non-Pro) videos `FiX5tQ_wooM` and `ucTDcOZf3fg` cover a different layup and were not mapped.
- BASSO Venta Disc (`basso-venta-disc`): added Mapdec's 2023 old-generation Venta Disc 105 review and teardown (`Wynu488WepM`); `mu03UhYeoKg` is a music-only build.
- Bianchi Sprint ICR (`bianchi-sprint-icr`): added an owner's customized 2024 Sprint ICR (`4Dm0luL76F0`). The Endurance Hub short `mfW43vIVljI` and BT Bikestore short `6AC-14FqynY` have no caption track; Sam Rates Bikes `mIJVaiz6bv0` is the Infinito (mismatch).
- Airwolf YF-R003 (`airwolf-yf-r003`): no suitable result. Andiamo Endurance's Airwolf gravel videos (`RXKidCMpJd4`, `-bCKelOmt04`, `LK5bNAWCJxw`) show the YFR045 frame; other results are generic AliExpress listicles.

### Batch 8 — LightCarbon LCR017-D, LCR017S-D, LCR018-D, LCR020-D, LCR007-V, LCG087-D, LCG087S-D, LCG074-D, LCG074S-D, LCG071-PRO

Delivered: 13 new transcript-checked candidate videos; LCR018-D gains a tire-fit field report, reviewer weigh-ins and a bottom-bracket width statement.

- LCR017-D (`lightcarbon-lcr017-d`): added Hambini (`c5nIgQ-UxDA`), Selected Components (`2Q6H8sMhubY`), tsp52 (`sLVea8yoAxA`) and Coach Daniel (`3shKfVWA8aw`). Owners report 30–32 mm tires fitting, a seatpost that needs carbon paste, split spacers that open slightly, and a bar wider at the drops than ordered; Hambini found 0.02 mm bottom-bracket alignment. The frame and fork weights Hambini speaks around 11:44 are garbled in the captions and a playback frame check did not show a legible scale, so they are not used. Greg Fisher's `33wvybkW1ZY` (2.5-minute LCR017-D vs LCR018-D comment) adds nothing decision-relevant.
- LCR018-D (`lightcarbon-lcr018-d`): added Trace Velo's inspection and all-road build (`Vcam2DBqAcQ`, `nQv-9un6Cd8`; size-58 frame 1,236 g; 700×40 tires rubbed the 2× front derailleur, 38 mm fitted), Hambini (`aBRsiEQOSnI`; T47 86.5 mm, EPS front triangle) and three Darren French videos (`XhjC0B_QZe8`, `dmuZ2tExb8U`, `u90AxrSVuPw`; 95-day delivery, storage-cover bolts loosening, a creaking optional bottom bracket). Trace Velo's inspection and Hambini's video were found in batch 4 but not then identified; their descriptions name the LCR018-D. LightCarbon's own build `YoK2zUibV-U` and Michael Prewitt's short `tRF5Ah_UVPw` have no caption track; Lloyd Rogers' `SBQKMRFmgvc` is an unfinished build teaser.
- LCR007-V (`lightcarbon-lcr007-v`): added durianrider (`ksEL5EuFSYc`; uncut fork 368 g, seatpost 215 g) and MAE Bikr (`TBlGplEKqNI`; 28 mm tires with 4–5 mm room, and LightCarbon telling him the model is no longer made). `SB64Eo2YfW4` is a 2026 re-upload of the same durianrider video (duplicate); Cycling in the Alps `QpAXSuVtq2M` has ten caption lines of first thoughts only.
- LCG087-D (`lightcarbon-lcg087-d`): added White Beard Reviews (`6V9nSV6B2Sk`): L-TWOO calipers need spacers or do not fit, 47 mm tires with room, micro-suspension without bob.
- LCG074-D, LCG074S-D, LCG087S-D, LCR017S-D, LCR020-D: no exact-model review found; results are LightCarbon promo shorts (`B_lZBtXyGKA`, `lpaf4PgGf80`, `OlMC-cbyhB8`) or other models. Samuel Black's LightCarbon builds (`LUlHihI24yI`, `NwwvDuLvlME`) never name the frame model and were not mapped.
- LCG071-PRO (`lightcarbon-lcg071-pro`): no new exact video; Jourdain Coleman's `-NYsVBXBj2o` and LightCarbon's `DAhY06YkWEs` show the LCG071-D, a different frame.

### Batch 9 — LightCarbon LCR014-D, LCR014-V, LCR015-D, LCR015-V, LCR015S-D, LCR015S-V, LCR0X-D, LCR0X-V, LCRXS-D, LCRXS-V

No video added. Searches by model code, by "review"/"build" and by family ("LightCarbon aero road frame") returned only LightCarbon's own promo clips for these frames: `kUYEgGy7b48` (LCR015-V), `I9dGefXfBto` and `NUfqp4FCAYg` (LCR015S-D), `nW9V40ZxlgA` (unnamed super-aero frame), `OWl8KUhnsuY` (LCR014-V), `CSMdv1gyQ48` and `ctAjyhusFNQ` (LCR0X-D; the latter's captions are music only) and `Z-396vcNYCI` (LCRXS-D). These are 30–80-second showcases without decision-relevant claims, so none was added. Cam Nicholls' "two cheap Chinese aero frames" (`jzAghikGHzo`) compares an Elves Falath and a Trifox, not a LightCarbon frame. The remaining LightCarbon review videos map only to the LCR017-D, LCR018-D, LCR007-V and LCG087-D handled in batch 8.

### Batch 10 — LightCarbon LCTT001, LCTT004, LCTT05-D, LCTR003, Speed7 complete and frameset; LongTeng LTK266-D-SL; LAGET AERO ONE, PIONEER, PIONEER ONE

Delivered: three LAGET AERO ONE videos, two with Korean automatic captions (takeaways are English paraphrases of the Korean speech).

- LAGET AERO ONE (`laget-aero-one`): added Korean retailer Bike Cabin's introduction (`tL2DooXKcsE`; ₩17.9 million, SRAM wireless only, two-to-three-month lead time), King Bike's test-ride discussion with a bike fitter (`1GFthrFA7fE`; high stack with a steep head angle, stable seated but demanding out of the saddle) and Gravel Cyclist's Eurobike booth clip (`jZi8o4DfEMk`; €19,999, TSB Technology as maker). Bike Cabin's second clip `hXi-1fD3MJ0` has no caption track. GCN Tech's Eurobike day-2 roundup `QrnH4-jxQGk` covers the bike for about a minute (claimed 1.6 kg frame, 2.3 kg with fork and seatpost) among many products and was not linked; GCN's Rouleur Live roundup `W1wRmY1NXw0` shows the Number 22 titanium aero bike, not LAGET (mismatch).
- LAGET PIONEER (`laget-pioneer`): Dream Build's Pioneer LTD build `1k_3rZWybAc` has only a spoken parts list before music; LAGET's own "Pioneer Matte Blue" archive clip `GWZukndTutY` repeats catalogue specs (32 mm maximum tire). Neither was added.
- LAGET PIONEER ONE (`laget-pioneer-one`): no exact-model video; TSB's clips (`vhXUahCNT6c`, `mUS9XrXTyY0`) are untitled under-20-second shorts. Mapdec's anodised titanium aero frame `XjVmkPIk3_g` is a Reilly Fusion (mismatch).
- LightCarbon LCTT001, LCTT004, LCTT05-D (triathlon), LCTR003 (track) and Speed7 complete bike and frameset: no exact-model review. Results are LightCarbon promo clips (`fn0kQS5soP4`, `yl0ioYmbcEI`) without model-specific claims or other brands' triathlon builds (ICAN TT017, Winowcycle).
- LongTeng LTK266-D-SL (`longteng-ltk266-d-sl`): no exact-model video; Man of a Certain Age's videos (`UbQkuAkxCgQ`, `eT8vtAXO97c`) show the LongTeng RD301-D (mismatch).

### Batch 11 — LAGET DISCOVERY ONE flagship and PRO, DISCOVERY SLR, G0 PRO; TSB PIONEER ONE; Hi-Light G0, G7.2, R6, R9; Dengfu R20

Delivered: one Hi-Light G7.2 video with a tire-fit field report.

- Hi-Light G7.2 (`hi-light-g7-2`): added Carlo Villarica's distributor-supplied titanium build (`KU8iO807E10`): 700×40 tires measuring 43–44 mm with plenty of room against the 45 mm rating, about 10 kg built, stable long-trail handling. The video shows a frameset build, so it is linked to the frameset record, not to the separate G7.2 GRX complete bike (`hi-light-g7-2-grx-gr1600`), which has no exact-build video.
- Hi-Light G0, R6 and R9 (`hi-light-g0`, `hi-light-r6-105-al`, `hi-light-r9-2025`, `hi-light-r9-force-pr1600`): no exact-model video. Chinese results show the G6 and G9 flat-bar titanium bikes (`pwqOR3_wROk`, `nkrom0Uo2pE`, `micO428zpe8`, `Xtf6Gfm93JA`) and Hi-Light's catalogue film `CGDBut-QKOg`; English "R9" searches return motorcycles.
- LAGET DISCOVERY ONE flagship and PRO, DISCOVERY SLR and G0 PRO (`laget-discovery-one-flagship`, `laget-discovery-one-pro`, `laget-discovery-slr`, `missing-china-price-laget-g0-pro`): no exact-model video; the Discovery One appears only in the background of Gravel Cyclist's Eurobike clip linked to the AERO ONE.
- TSB / Titan Super Bond PIONEER ONE (`tsb-titan-super-bond-pioneer-one` and its price pointer `missing-china-price-tsb-titan-super-bond-pioneer-one`): no exact-model video; TSB's shorts carry no model claims.
- Dengfu R20 gravel frame (`dengfu-gravel`): no exact-model video; results show the Dengfu R01 road frame (`umwMwygTJCY`) and Dengfu e-bikes.
- Hongfu current gravel frame (`hongfu-gravel`): generic record without an exact model identity; unsuitable for exact-model video search.

### Batch 12 — Canyon Aeroad CFR, Ultimate CFR, Grail CF 7; Giant Defy Advanced 2, Revolt Advanced 2, TCR Advanced 3-GC; Merida Reacto 6000, Scultura 6000, Silex 7000, Scultura Endurance 4000

Delivered: nine transcript-checked videos. For these widely reviewed models one or two reviews that match the candidate's generation and frame grade were selected; launch roundups and reviews of other frame grades were skipped.

- Canyon Aeroad CFR (`missing-china-price-canyon-aeroad`): David Arthur's first ride on the 2024 fourth-generation CFR (`o68gCuTqZ98`; 32 mm, 7.1 kg size M with SRAM Red). GC Performance's walkaround `etzACmxfS-Q` repeats the same changes; Crank & Sprints' `SHm_cvDNuos` does not identify the frame grade; GCN's `hSLOZkhyInw` is the Endurace CFR (mismatch).
- Canyon Ultimate CFR (`missing-china-price-canyon-ultimate`): Cycling Unboxed's close-up at Canyon UK (`r5nQ6m2YzlE`; size M 6.75 kg without pedals). TriathlonDan's used-bike chat `yG7rgNkRMyU`, Moloko's range Q&A `CAJEHRhL6t0` and Cycling Weekly's 2023 long-term review `oZaLsAf1IB0` (frame grade not stated) were not added.
- Canyon Grail CF 7 (`missing-china-price-canyon-grail`): David Arthur's clearance test on the 2024-generation Grail (`vwWx09avNxk`; a 45 mm tire fits the fork but rubs the rear chainstay). The grade he rode is not stated, so the observation stays on the video and is not copied into the candidate's clearance notes. The September 2026 Grail videos (`8cSqQFEgk2U`, `y2-sz7qjxR0`) and English Cyclist's CF 7 Speed review `i3MocVqECug` show the new 2027 generation (mismatch); GCN Tech's 2023 launch `d8UlZmvbT-E` covers the whole range.
- Giant Defy Advanced 2 (`missing-china-price-giant-defy-advanced`): Jamesthebikeguy's 2024 overview (`4AHuEoH20iY`; 860 g Advanced frame, 38 mm) and David Arthur's Defy Advanced 1 review (`GdcesbYBfm4`), which uses the same Advanced frame and fork grade. RATATA's `HtJx_LF4sK4` is the previous generation (mismatch); Josh Reid's `gQcXC-g6_dw` is a short promotional-style recap.
- Giant Revolt Advanced 2 (`missing-china-price-giant-revolt-advanced`): The Indy Cyclist's shop walkthrough of the 2026 bike (`Y5No2wQT2cc`). Review Genesis `uJF3BwfTwlU` and Jamesthebikeguy `zLv4F_6ry-U` are short spec read-throughs.
- Giant TCR Advanced 3-GC (`missing-china-price-giant-tcr-advanced`): the candidate is a rim-brake Tiagra build whose frame generation is unresolved; current disc-generation TCR reviews (`HFrSUsE2nnY`, `-aMNm4MYo1c`, `1EeDLhZPuCo`) are excluded as the candidate already excludes them, and Thomas Verdonck's 2017 rim-brake bike check `aNmZobxMIUY` cannot be tied to the 3-GC generation. No video added.
- Merida Reacto 6000 (`missing-china-price-merida-reacto`): Lohem's owner first impressions of the fifth-generation 6000 (`FIXyQnfT6UE`). David Arthur `oCiTJcnPG7E` and Cycling Weekly `qKOinNROpXw` review the Reacto 9000 on the lighter CF5 frame (different frame grade); Cycling Weekly's launch `sWNZfafqVBM` covers the range.
- Merida Scultura 6000 (`missing-china-price-merida-scultura`): David Arthur's Scultura 7000 review (`q2xRf8ITXk8`), which uses the same CF3 frame. Cycling Insider's 6000 Di2 buyer's guide `u82zQOUqqrg` only reads the specification.
- Merida Silex 7000 (`missing-china-price-merida-silex`): Active Hobo Podcast's 30-day review (`L8rLQSQTJAY`; 9.55 kg size XL; mudguards reduce clearance to 42 mm).
- Merida Scultura Endurance 4000 (`merida-scultura-endurance-4000-community-lead`): no video added. Damian Harris Cycles' `L05BYhVquWY` is a two-minute dealer preview of the current 12-speed model, which the candidate distinguishes from its older 11-speed build; Marky's Bike Lab `4sNdzRQ0vx4` weighs the race Scultura 4000 (mismatch).

### Batch 13 — Giant Propel Advanced 3, Propel Advanced SL 1 (Gen 4), Defy Advanced SL 1; Specialized Crux Comp, Crux 10r and S-Works Crux (bike and frameset), Roubaix SL8 (Tiagra, Sport 105, Comp 105), Tarmac SL8 Comp 105 Di2

Delivered: nine transcript-checked videos. Generations were matched by clearance and frame details: the Propel Advanced 3 (30 mm) is the third-generation frame and the SL 1 lead is the 2026 fourth generation (32 mm); the Crux candidates (47 mm) are the 2022–2025 round-tube Crux, not the 2026 Crux 5 (55 mm).

- Giant Propel Advanced 3 (`giant-propel-advanced-3`): David Arthur's 2023 Propel Advanced review (`o-fyu512kc0`). His 2022 Propel Advanced SL first ride `0i-GRqSpcyY` and Patrick Lino's long-term review `Li-oZAGrZrg` are the SL grade of that generation and were not mapped.
- Giant Propel Advanced SL 1 Gen 4 (`giant-propel-gen4-community-lead`): BikeRadar's 2026 launch overview (`NSxPItz2h6I`) with the Advanced SL 0 on the same frame grade. Cycling Weekly's launch `hIkiy1bWjIA` repeats it.
- Giant Defy Advanced SL 1 (`giant-defy-advanced-sl1-community-lead`): no video added. The candidate's 2026 reference describes an integrated seatpost and 40 mm clearance, while David Arthur's 2024 Defy Advanced SL videos (`u98PcWnbQIM`, `datVi0tqAa0`) show a clamped D-Fuse seatpost and 38 mm, so the generation mapping stays unresolved.
- Specialized Crux Comp (`missing-china-price-specialized-crux`): GC Performance's 2024 Crux Comp walkaround (`qWegz_XEP9g`; 8.77 kg size 54). Crux 10r frameset (`specialized-crux-10r-frameset`): no separate video; it shares the Comp's FACT 10r frame. The 2026 Crux 5 reviews (`h3zgUxeVXFw`, `l2c0o_Z_muM`) are the new generation (mismatch); Patrick Delorenzi's `1RHuyLKlccw` does not name the frame grade.
- Specialized S-Works Crux 2024 and frameset: David Arthur's two-month review of the same FACT 12r S-Works frame (`Thl2mal0ATs`; 7.25 kg size 56) for the complete bike and Road Bike Action's launch review (`rHJn4dmapLE`) for the frameset.
- Specialized Roubaix SL8: Jamesthebikeguy's 2026 base-model walkaround (`9xGQvpdt5ac`; Tiagra, 9.7 kg size 56) for the Tiagra price target, and David Arthur's launch ride (`uTZcm5BjEho`; grade not stated) for the Comp 105. The Sport 105 (`specialized-roubaix-sl8-sport-105`) shares the FACT 10r frame; no trim-specific review was found and the base-model video is not duplicated. The Bicycle Station's owner review `33vA1MQsMs8` does not state the frame grade.
- Specialized Tarmac SL8 Comp 105 Di2 (`missing-china-price-specialized-tarmac-sl8`): road.cc's review of the entry FACT 10r SL8 with 105 Di2 (`d537VnXsEto`; 7.9 kg size 52) and GC Performance's 2026 US Comp walkaround (`tREYq4W4-_U`; 7.68 kg size 50, SRAM Rival). Crank & Sprints' owner chat `dEYkQGwf42M` adds little.

### Batch 14 — Trek Checkpoint SL 5 Gen 3, Domane SL 5 Gen 4, Madone SL 5 Gen 8; Van Rysel RCR-F Pro; SCOTT Addict 40, Foil RC 10; Pinarello F5; Cervélo Áspero-5; Cinelli Pressure, Pressure ADR

Delivered: nine transcript-checked videos.

- Trek Checkpoint SL 5 Gen 3: Terra Riders' 12,000 km owner review (`gdAHP2VUgEo`; water ingress and a creaking IsoSpeed fixed by servicing). Their 2025 first review `B463Ys_TN-Y` is covered by the long-term video.
- Trek Domane SL 5 Gen 4: BikeLabHQ's six-month owner review (`r7acx4pcfG4`; seatpost slipping, plug falling out). Hiker Biker Omar's `9PIjSdivoLo` was not needed; the 2026 Domane Gen 5 videos are a newer generation (mismatch).
- Trek Madone SL 5 Gen 8: GC Performance's walkaround (`TMA8Mx_g7o0`; 8.65 kg size M). Cycling Insider's `gYvhmN9P-L0` reads the specification.
- Van Rysel RCR-F Pro 105 Di2: Cyclingnews' wind-tunnel and ride review of the RCR-F frame in Ultegra spec (`FahPsErb-24`; low, stiff front end; about 8.5 kg in 105 spec). road.cc's first ride `TOkRl4nyUPg` was not needed.
- SCOTT Addict 40: Sam Rates Bikes' review of the 2026 Addict in Addict 10 trim (`um1O_TDrcpo`; frame grade not stated). Cycling Insider's Addict 40 buyer's guide `YaRyNVGnbPA` reads the specification.
- SCOTT Foil RC 10: Jenson USA's short retailer review (`NhsffxoW3cw`; 7.9 kg Ultegra). GC Performance's 2023 walkaround `8e5tpWSlp1E` is an alternative.
- Pinarello F5: Bicycling's review (`cjv41gIDbWw`; 990 g claimed frame; he says 30 mm, against 32 mm in the candidate's MY26 reference, a conflict left visible) and Approved's follow-up (`-JZmG8RJa_c`; slight flex above about 800 W). Victory Bicycle Studio's dealer clip `e1Ym9D3YaYc` is promotional.
- Cervélo Áspero-5: Ben Delaney's review (`X-hVsq37ar8`; 45 mm with about 6 mm per side). David Arthur's `qPyGQBORh5s` was not needed.
- Cinelli Pressure (first generation, `cinelli-pressure`): no video added. OtomoRide's `UyG1R-j2iZM` re-narrates a magazine review rather than presenting its own test, and Cycling Insider's `JCZwWTvZyUw` reads the specification; the 2025 Pressure II videos (`6ySzYnuG7To`, `iNu0901g0No`) are the newer generation.
- Cinelli Pressure ADR (`cinelli-pressure-adr`): no video added; ridemedia's two videos (`bg5rUNekDWk`, `SfXRxEcMLoQ`) cover parts, the cockpit and ride scenery without frame-specific observations.

### Batch 15 — Colnago Y1Rs; De Rosa Idol, New 838; Felt IA 2.0; LOOK 765 electronic; SEKA Exceed, Spear RDC (bike and frameset), Spear standard, ExAero road; Seraph TT-X68 new UDH

Delivered: nine transcript-checked videos (one in Italian with English paraphrased takeaways).

- Colnago Y1Rs (`colnago-y1rs`): Cyclingnews' wind-tunnel and ride review (`PypDvxWdcFM`; flexible front end and speed wobble noted). David Arthur's `F8aZDfd0qL8` was not needed.
- De Rosa New 838 (`de-rosa-new-838`): Cristiano De Rosa's two-minute presentation on Bikeroom (`fKeh4-xFLp4`; claimed 900 g frame), recorded as maker claims. BicycleTube's `ioPgL24VDcU` is a music-only walkaround.
- De Rosa Idol (`de-rosa-idol`): no video added because the candidate's generation is unresolved; a Japanese shop's 2026 Idol look `zavF9WWUbbI` (34 mm, T47, UDH) shows the redesigned generation and cannot be tied to the retained listing.
- Felt IA 2.0 (`felt-ia-2`): no video added; results are pro-bike features (`a5TwW_essno`, `Kq444u9lAp0`) and a dealer's custom build showcase (`W5CCWMKXkLA`) without buyer-relevant findings for a stock trim.
- LOOK 765 electronic (`look-765-electronic`): Mapdec's launch analysis of the 2023 765 Optimum (`4PBpEm1Veiw`; 34 mm, T47, 27.2 mm post, about 1,400 g frame and fork claimed). Jamesthebikeguy's `thM_bE6r6VM` is the previous 765 Optimum+ and Mapdec's custom build `Id9QkaPNc5s` was not needed.
- SEKA Exceed 105 Di2 dealer build (`seka-exceed-105-di2-dealer-build`): Cam Nicholls' Exceed RDC first impressions (`TlMnJmZckr4`; 885 g medium frame) and his warning about the former retailer's service (`P3igLjAP9mE`); both disclose that the dealer build's frame grade is not stated. Veloville's 105 Di2 build `2XIgKogT2-U` has an empty transcript panel.
- SEKA Spear (standard) 105 Di2 (`seka-spear-standard-105-di2`): David Arthur's first ride and 10,000 km follow-up (`eWgD06hvF_4`, `5MhtQR2Wtk0`); his £2,250 frameset price and weight comparison indicate the standard frame. His nine-month review `Tfn73UFq4jw` has an empty transcript panel.
- SEKA Spear RDC frameset (`seka-spear-rdc-frameset`): Klein Concept's first impressions of the RDC edition (`hN2RcvmAjvc`). The complete Spear RDC (`seka-spear-rdc`) keeps its existing Cyclingnews record; Cycling Unboxed's `jdmXjwfoFkw` discusses that review, and GC Performance's `yjpOvfPDTXw` and NERO's `zJwKiLosihI` do not state the frame version.
- SEKA ExAero road (`seka-exaero-road`): Cycling_Boon's Malaysian shop look at the new ExAero RDC (`8V7YQyTIzF0`); SEKA's spec short `fMnx1Wqkph0` was not added.
- Seraph / TanTan TT-X68 new UDH (`seraph-tt-x68-new-udh`): no video added. Patrick Lino's `WhVb730XtTk` shows the earlier BSA frame, and Tom Bowers (`s4MdcxUSNGw`), Jack's Coaching (`NH_cto3UxyA`) and Nico Kühn (`ekN3dvSTudc`) do not identify the T47/UDH revision.

### Batch 16 — TWITTER Cyclone (3rd R7120, R7120 aero, Sport), Gravel V3 (105, 2024 RS, unknown RS listing), R10 Pro (Gen 3 and Storm Knight), T10 Pro, T8, X7, Little White Rabbit; Cyctrac / TWITTER R18

Delivered: two transcript-checked videos (Russian and Vietnamese, with English paraphrased takeaways).

- R10 Pro Gen 3 (`twitter-r10-pro-gen3`): Bike Content's one-season owner report (`oRk92nDl-es`; an electronic shift lever failed after water ingress and the seller replaced it at shipping cost; heavy stock bar). The generation is not stated, which the record discloses. R10 Pro Storm Knight (`twitter-storm-knight`): no exact video; 阿冬玩三鐵's `itQTk57DrlA` and Gowes Dadakan's `C3kbkSRJb9o` show the non-Pro R10 with Shuntai 12-speed, a different trim and possibly frame. Bike Content's `DBsowE25re4` is a short test-ride clip.
- T10 Pro (`twitter-t10-pro`): Vietnamese retailer BKBIKE's walkaround of the full 105 R7120 build (`ztBuwOG4Iu8`). Older T10 Pro clips from 2019–2021 (`lu3LqE7HoXs`, `j-6p1ZQ_yYo`, `KcIQUewjI4k`) predate the current specification.
- Cyclone third generation (`twitter-cyclone-gen3-7170`, `twitter-cyclone-r7120`, `twitter-cyclone-sport`): no exact video beyond TWITTER's own promo shorts (`PjiYBuhB1Rw`, `4y8aaaUrVao`); owner reviews show the 2021 and 2024 Cyclone Pro (`qTpp-tqdvW4`, `eY3E2BQDPWM`, `tNX3P5R1Sn0`), an earlier generation.
- Gravel V3 105 (`twitter-gravel-v3-105`), the superseded 2024 RS build (`twitter-gravel-v3-2024-rs-carbon-wave`) and the unresolved RS listing (`twitter-carbon-road-gravel-unknown`): the usable Gravel V3 reviews are already linked to the published `twitter-gravel-v3` platform; the remaining results are promos, empty transcript panels (`BV6G8wQDF6Q`, `jlURjof_mFw`) or an older-generation review (`QAeZAoofY6c`). No separate video added.
- T8 (`twitter-t8-closed-wheel`), X7 (`twitter-x7`) and Little White Rabbit (`twitter-little-white-rabbit`): no exact-model review; only TWITTER promo shorts (`HjnaaOTOhFA`, `hwbnXYgIdhQ`, `v3WLZe6Pfrs`, `fkRpemcrvV4`) or nothing.
- Cyctrac / TWITTER R18 (`cyctrac-r18`): no exact-model review; BikeVibes' "TT-R18" review `nKKJzRcpGgM` is the Seraph/TanTan TT-R18 (mismatch) and TWITTER's own R18 clip `mOw_dfNJxL4` is a promo short.

### Batch 17 — JAVA Fuoco 2025, Siluro6-Top, Suprema 7120, Vittoria 7170 and ER7 2026, Volata, Vega TT, Auriga 2027, carbon TT frameset; unresolved JAVA listings

Delivered: six transcript-checked videos from Philippine, Indonesian and Chilean shops (Filipino, Indonesian and Spanish captions, English paraphrased takeaways).

- Fuoco 2025 (`java-fuoco-2025`): Unli Ahon's unboxing of the updated full-105 Fuoco Top (`Q5Xmr5RTr18`). JC Bikes (`JIXX7WCGRRI`), Palm Paramet (`y6kWF5ydHsY`) and My Wild Hobby (`Bq7nLGeal_k`) cover the same or earlier Fuoco Top builds and were not needed.
- Siluro6-Top (`java-siluro6-top-r7120`): JKT Sepeda's 2025 first look (`dj0UvuebGnA`; aluminium aero frame, about 10.6 kg). Unli Ahon's `4ltvZoyLSQ8` shows the earlier build; 杨弟's `EZtzfWqv6HI` has no caption track.
- Vittoria 7170 closed-wheel (`java-vittoria-7170`): Zona3's Chilean walkaround of the carbon 105 Di2 build with a disc rear wheel (`a6cJNO0j6EI`). Vittoria ER7 2026 (`java-vittoria-er7-2026`): JKT Sepeda's look at the aluminium-frame ER7 (`xfqO5dMmKFU`; 28 mm tires already tight), with the frame version disclosed.
- Volata (`java-volata-r7120`): Zona3's ride review (`zCfBWj3b_Nk`), built with 105 Di2 rather than mechanical R7120.
- Vega TT 24S (`java-vega-tt-24s`): Zona3's walkaround with L-TWOO R9 (`O55aVYYIvPk`). A Vietnamese shop review `HUS5sUKxY48` was not needed; 브이맨's `ZfCLsi3aw40` has an empty transcript panel.
- Auriga 2027 (`java-auriga-2027`): no usable transcript; EverydayBikes' `fWRDZZJ1JfE` has no caption track and Cycle Omania's `2RCIP3kdBSQ` an empty panel.
- Suprema 7120 (`java-suprema-7120`): no current-build video; David Mann's reviews (`g_k8JmIevyo`, `gNIj7Ojv56g`, `lcUJBexhysY`) and TTBok's 2022 bike check `b2vRYSLgLDE` predate the R7120 build.
- JAVA carbon triathlon frameset with hydraulic brakes (`java-tt-frame-hydraulic`), carbon hydraulic road bike (`java-carbon-hydraulic-unknown`) and LAMPO full-carbon listing (`java-lampo-carbon-road`): no exact model identity, so unsuitable for exact-model video search. The aluminium 24-speed observation (`java-aluminum-24s`) is merged into the Vittoria ER7 record. China Rides' JAVA team-edition video `p8htrqH-GOs` and Jourdain Coleman's general Q&A `OCat2f03T6k` do not show candidate models.

### Batch 18 — PARDUS Spark AL, Spark EVO Gen 4 (frameset and Ultegra Di2), Spark RS, Spark Sport PES, Spark Tourist, Spark family listing, Super AL, Super Sport (original), Super Sport Gen 2 price pointer, Gomera EVO

Delivered: two transcript-checked videos (Tamil and Indonesian, with English paraphrased takeaways).

- Super AL (`pardus-super-al`): 5AM Bicycle Studio's Indian launch unboxing (`X0kI6pwu7bk`; ₹89,000, 105 R7000 11-speed with mechanical discs), with the build difference disclosed.
- Super Sport original generation (`pardus-super-sport`): Dani Chika's climbing test and weigh-in of a Super Sport disc 105 (`qiPy0FLInoA`; 9.5 kg with pedals and cages). Dwayne Cycles' `nArYkyY2Z7c` is a short bike check.
- Super Sport Gen 2 (`pardus-super-sport-gen2`): the candidate points to the published platform, whose discovery outcome is in batch 4.
- Spark EVO Gen 4 frameset and Ultegra Di2 (`pardus-spark-evo-gen4-frameset`, `pardus-spark-evo-gen4-ultegra-di2`): no usable transcript; 周四青年's fourth-generation launch and ride clips (`tf8rsnAl_m0`, `NEkMoT32_Es`) have no caption track, and Willie Smit's `QtT6Y7d5MAY` unboxes the 2024 third generation (mismatch).
- Spark Sport PES (`pardus-spark-sport-pes`): no exact video; Ivan Stepanets' 2024 Spark Sport bike check `XQPwwbMaGHE` (32 mm fitted, he says 35 mm would fit) shows the prior platform, which the candidate keeps separate from the 2026 Gen 3 PES build. 骑不动的洋芋's `P5WqDbGZfzo` has no caption track.
- Spark AL, Spark RS and Spark Tourist (`pardus-spark-al`, `pardus-spark-rs-community-lead`, `pardus-spark-tourist`): no exact-model review; Charlie Bike Channel's 2022 `N4fcrgkljPk` and FITAMIN's `ebmEf4D5jRQ` show earlier Spark builds without the AL, RS or Tourist identity.
- Spark family listing (`pardus-spark`): an aggregate of several generations and trims, so unsuitable for an exact-model video.
- Gomera EVO Dura-Ace Di2 (`pardus-gomera-evo-dura-ace-di2`): no exact video; WaterBear Cycles' `yOkzKegkgvE` is a used earlier Gomera with an 11-speed upgrade (mismatch), and Pinoy Katari's 2021 Gomera Ultra review predates the EVO.

### Batch 19 — PARDUS Robin EVO (Force AXS and competition lead), Robin Sport PES, Uragano EVO (and merged lead), Uragano F, Uragano Sport; SAVA A4, Dream Maker, R8 R8170, R9, Starship R13; SAVA pointers

Delivered: one transcript-checked video (Russian, English paraphrased takeaways) with a tire-fit field report.

- Uragano Sport (`pardus-uragano-sport`): Veloville's workshop build of a size-XL Uragano Sport 105 (`jHGGa82cm_E`; 9.76 kg without pedals; loose spokes retensioned; 42 mm expected to fit, 45 mm tight). NUBIKE TV's GRX-equipped Uragano `vyEoznb0a-w` does not identify the Sport, EVO or F version, and FITAMIN's 2022 clip `pKrU31x6kg8` is a short earlier build.
- Uragano EVO (`pardus-uragano-evo`, merged lead `pardus-uragano-evo-community-lead`) and Uragano F (`pardus-uragano-f`): no exact-model video found.
- Robin EVO third generation (`pardus-robin-evo-force-axs`, `pardus-robin-evo-community-lead`): no exact video; Somtam Rider's 2022 `FbWlvJirFXk` and the 2022–2023 rim and Shuntai builds (`um4fBz7dYcg`, `NTtO6R9gcVw`, the latter two without caption tracks) predate the third generation.
- Robin Sport PES (`pardus-robin-sport-pes`): no exact video; the Robin Sport reviews found are 2020–2024 mechanical builds (`xrqA_JkZZis`, `knXFHj6XNGE`, `ZBg9JvwCz8c`, `r66GeiAVCYU`), not the current Magene PES model with 40 mm clearance.
- SAVA A4, Dream Maker, R8 R8170, R9 and Starship R13 (`sava-a4`, `sava-dream-maker`, `sava-r8-r8170`, `sava-r9`, `sava-starship-r13`): no exact-model review. Results are SAVA's own shorts (`xGeUsw9PqQU`, `clNqoK3cw4I`, `3WJScOLpytg`, `I-bLD5V3ong`), a reseller's narrated specification read-out for a "Blade R9" (`Qb_k9LpcTCc`) that cannot be tied to the candidate, the R08 7170 vlog rejected in batch 7, and other SAVA models (AeroX SLR8 `zMGDwPd4e5Y`, Pulse and Voyager `ie7OPQpcj0Q`, an unnamed 2022 test `2JN3W6eiAic`).
- SAVA F20 Hawkeye (`sava-f20-hawkeye`): keeps its China Cycling review; Nicolai Andreasen's unboxing `OnTUF6XoHJQ` has no caption track. The Gelaro S4 and A7L 2026 observations are merged into their exact records, and the Gelaro SF candidate points to the published platform.

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
| alums-da54 (candidate/wheelset) | `china-rides-alvas-da54-hainan-700km` | China Rides | automatic captions · 3 takeaways |
| alums-da54 (candidate/wheelset) | `china-rides-alvas-da54-vs-canyon-aeroad` | China Rides | automatic captions · 3 takeaways |
| alums-da54 (candidate/wheelset) | `velographer-alvas-da54-review` | The Velographer | automatic captions · 5 takeaways |
| argon18-krypton-pro (candidate/wheelset) | `chris-hall-argon18-krypton-pro-review` | Chris Hall | automatic captions · 6 takeaways |
| basso-venta-disc (candidate/wheelset) | `mapdec-basso-venta-disc-105-review` | Mapdec Cycle Works | creator captions · 6 takeaways |
| bianchi-sprint-icr (candidate/wheelset) | `eyeguy-bianchi-sprint-icr-custom` | Eyeguy’s Dropbar Bikes | automatic captions · 3 takeaways |
| bigrock-sohtea (candidate/wheelset) | `china-cycling-bigrock-sohtea-long-term` | China Cycling | automatic captions · 7 takeaways |
| bxt-gravel-complete (candidate/wheelset) | `carlo-villarica-bxt-gravel-135-build` | Carlo Villarica - No Boring Days | automatic captions · 3 takeaways |
| bxt-gravel-complete (candidate/wheelset) | `cycling-cameras-coffee-bxt-gravel-135-six-months` | Cycling, Cameras and Coffee. | automatic captions · 6 takeaways |
| bxt-gravel-complete (candidate/wheelset) | `jackalope-dave-bxt-gravel-135-frame-review` | Jackalope Dave | automatic captions · 3 takeaways |
| carbonda-cfr707 (candidate/wheelset) | `daryl-pace-carbonda-cfr707-build` | Daryl Pace | automatic captions · 3 takeaways |
| carbonda-cfr707 (candidate/wheelset) | `sysadmin-carbonda-cfr707-owner-build` | Sysadmin | automatic captions · 4 takeaways |
| cervelo-aspero-5-current (candidate/wheelset) | `ben-delaney-cervelo-aspero-5-review` | The Ride with Ben Delaney | automatic captions · 5 takeaways |
| colnago-y1rs (candidate/wheelset) | `cyclingnews-colnago-y1rs-review` | Cyclingnews Tech | automatic captions · 5 takeaways |
| de-rosa-new-838 (candidate/wheelset) | `bikeroom-de-rosa-new-838-cristiano-de-rosa` | Bikeroom | creator captions · 2 takeaways |
| elitewheels-drive-50d-ii (candidate/wheelset) | `cyclists-hub-elitewheels-drive-50d-ii-review` | Cyclists Hub \| Petr Minarik | automatic captions · 5 takeaways |
| elitewheels-drive-50d-ii (candidate/wheelset) | `the-bike-sauce-elitewheels-drive-50d-ii-review` | The Bike Sauce | automatic captions · 4 takeaways |
| elitewheels-drive-g36 (candidate/wheelset) | `bicycle-station-gravel-wheel-shootout-drive-g36` | The Bicycle Station | automatic captions · 3 takeaways |
| elitewheels-drive-g36 (candidate/wheelset) | `lovemtb-elitewheels-drive-g36-tech-check` | LoveMTB | creator captions · 3 takeaways |
| evolve-cima-road (candidate/wheelset) | `china-cycling-cima-lightweight-build` | China Cycling | automatic captions · 3 takeaways |
| evolve-cima-road (candidate/wheelset) | `china-cycling-cima-long-term` | China Cycling | automatic captions · 5 takeaways |
| evolve-cima-road (candidate/wheelset) | `cus-baker-evolve-cima-road-ride` | Cus Baker | automatic captions · 6 takeaways |
| evolve-cima-road (candidate/wheelset) | `cyclists-hub-evolve-cima-road-review` | Cyclists Hub \| Petr Minarik | automatic captions · 8 takeaways |
| evolve-cima-road (candidate/wheelset) | `hambini-evolve-cima-road-inspection` | Hambini | automatic captions · 5 takeaways |
| evolve-cima-road (candidate/wheelset) | `peak-torque-evolve-cima-road-ten-months` | Peak Torque | automatic captions · 8 takeaways |
| giant-propel-advanced-3 (candidate/wheelset) | `david-arthur-giant-propel-advanced-2023-review` | David Arthur - Just Ride Bikes | automatic captions · 4 takeaways |
| giant-propel-gen4-community-lead (candidate/wheelset) | `bikeradar-giant-propel-2026-first-look` | BikeRadar | automatic captions · 4 takeaways |
| hi-light-g7-2 (candidate/wheelset) | `carlo-villarica-hi-light-g7-2-titanium` | Carlo Villarica - No Boring Days | automatic captions · 5 takeaways |
| ican-alpha-50-ii-disc (candidate/wheelset) | `ican-alpha-50-ii-disc-build` | ICAN Cycling | no caption track |
| java-fuoco-2025 (candidate/wheelset) | `unli-ahon-java-fuoco-top-105` | Unli Ahon | automatic captions · 4 takeaways |
| java-siluro6-top-r7120 (candidate/wheelset) | `jkt-sepeda-java-siluro-6-top-2025` | JKT Sepeda | automatic captions · 3 takeaways |
| java-vega-tt-24s (candidate/wheelset) | `zona3-java-vega-tt` | Zona3 | automatic captions · 3 takeaways |
| java-vittoria-7170 (candidate/wheelset) | `zona3-java-vittoria-105-di2-disc-wheel` | Zona3 | automatic captions · 4 takeaways |
| java-vittoria-er7-2026 (candidate/wheelset) | `jkt-sepeda-java-vittoria-er7-alloy` | JKT Sepeda | automatic captions · 4 takeaways |
| java-volata-r7120 (candidate/wheelset) | `zona3-java-volata-review` | Zona3 | automatic captions · 4 takeaways |
| laget-aero-one (candidate/wheelset) | `bike-cabin-laget-aero-one-introduction` | Bike Cabin | automatic captions · 4 takeaways |
| laget-aero-one (candidate/wheelset) | `gravel-cyclist-laget-aero-one-eurobike` | Gravel Cyclist | automatic captions · 2 takeaways |
| laget-aero-one (candidate/wheelset) | `king-bike-laget-aero-one-test-ride-talk` | 자전거news | automatic captions · 4 takeaways |
| lightcarbon-lcg071-pro (candidate/wheelset) | `lightcarbon-lcg071-pro-brand-overview` | LightCarbon | no caption track |
| lightcarbon-lcg071-pro (candidate/wheelset) | `tom-bowers-lightcarbon-lcg071-pro-build` | Tom Bowers Cycling | creator captions · 3 takeaways |
| lightcarbon-lcg087-d (candidate/wheelset) | `white-beard-lightcarbon-lcg087-d-first-look` | White Beard Reviews | automatic captions · 5 takeaways |
| lightcarbon-lcr007-v (candidate/wheelset) | `durianrider-lightcarbon-lcr007-v-unboxing` | durianrider | automatic captions · 4 takeaways |
| lightcarbon-lcr007-v (candidate/wheelset) | `mae-bikr-lightcarbon-lcr007-v-owner` | MAE Bikr | automatic captions · 4 takeaways |
| lightcarbon-lcr017-d (candidate/wheelset) | `coach-daniel-lightcarbon-lcr017-d-first-look` | Coach Daniel, PhD | creator captions · 3 takeaways |
| lightcarbon-lcr017-d (candidate/wheelset) | `hambini-lightcarbon-lcr017-d-inspection` | Hambini | automatic captions · 7 takeaways |
| lightcarbon-lcr017-d (candidate/wheelset) | `selected-components-lightcarbon-lcr017-d-review` | Selected Components | automatic captions · 6 takeaways |
| lightcarbon-lcr017-d (candidate/wheelset) | `tsp52-lightcarbon-lcr017-d-owner` | tsp52 | automatic captions · 5 takeaways |
| lightcarbon-lcr018-d (candidate/wheelset) | `darren-french-lightcarbon-lcr018-d-bottom-bracket` | Darren French | automatic captions · 2 takeaways |
| lightcarbon-lcr018-d (candidate/wheelset) | `darren-french-lightcarbon-lcr018-d-first-ride` | Darren French | automatic captions · 4 takeaways |
| lightcarbon-lcr018-d (candidate/wheelset) | `darren-french-lightcarbon-lcr018-d-unboxing-build` | Darren French | automatic captions · 5 takeaways |
| lightcarbon-lcr018-d (candidate/wheelset) | `hambini-lightcarbon-lcr018-d-inspection` | Hambini | automatic captions · 5 takeaways |
| lightcarbon-lcr018-d (candidate/wheelset) | `trace-velo-lightcarbon-lcr018-d-all-road-build` | Trace Velo | automatic captions · 6 takeaways |
| lightcarbon-lcr018-d (candidate/wheelset) | `trace-velo-lightcarbon-lcr018-d-overview` | Trace Velo | automatic captions · 4 takeaways |
| look-765-electronic (candidate/wheelset) | `mapdec-look-765-optimum-2023-launch` | Mapdec Cycle Works | automatic captions · 4 takeaways |
| missing-china-price-canyon-aeroad (candidate/wheelset) | `david-arthur-canyon-aeroad-cfr-first-ride` | David Arthur - Just Ride Bikes | automatic captions · 6 takeaways |
| missing-china-price-canyon-grail (candidate/wheelset) | `david-arthur-canyon-grail-tire-clearance` | David Arthur - Just Ride Bikes | automatic captions · 4 takeaways |
| missing-china-price-canyon-ultimate (candidate/wheelset) | `cycling-unboxed-canyon-ultimate-cfr-close-up` | Cycling unboxed | automatic captions · 3 takeaways |
| missing-china-price-elves-falath-evo (candidate/wheelset) | `cam-nicholls-falath-evo-inspection` | Cam Nicholls | automatic captions · 4 takeaways |
| missing-china-price-elves-falath-evo (candidate/wheelset) | `gc-performance-falath-evo-ride-review` | GC Performance | automatic captions · 5 takeaways |
| missing-china-price-elves-falath-evo (candidate/wheelset) | `jourdain-coleman-elves-falath-evo-500-miles` | Jourdain Coleman | automatic captions · 6 takeaways |
| missing-china-price-elves-vanyar (candidate/wheelset) | `jourdain-coleman-vanyar-pro-2024-unbox` | Jourdain Coleman | automatic captions · 5 takeaways |
| missing-china-price-elves-vanyar (candidate/wheelset) | `popeye-vanyar-pro-disc-2024-build` | CYCLE SHOP POPEYE Channel | no speech in captions |
| missing-china-price-giant-defy-advanced (candidate/wheelset) | `david-arthur-giant-defy-advanced-1-review` | David Arthur - Just Ride Bikes | automatic captions · 4 takeaways |
| missing-china-price-giant-defy-advanced (candidate/wheelset) | `jamesthebikeguy-giant-defy-advanced-2024-overview` | Jamesthebikeguy | automatic captions · 4 takeaways |
| missing-china-price-giant-revolt-advanced (candidate/wheelset) | `indy-cyclist-giant-revolt-advanced-2-review` | The Indy Cyclist | automatic captions · 5 takeaways |
| missing-china-price-merida-reacto (candidate/wheelset) | `lohem-merida-reacto-6000-v5-first-impressions` | Lohem | automatic captions · 2 takeaways |
| missing-china-price-merida-scultura (candidate/wheelset) | `david-arthur-merida-scultura-7000-review` | David Arthur - Just Ride Bikes | automatic captions · 4 takeaways |
| missing-china-price-merida-silex (candidate/wheelset) | `active-hobo-merida-silex-7000-review` | Active Hobo Podcast | automatic captions · 4 takeaways |
| missing-china-price-quick-pro-xr-one (candidate/wheelset) | `china-cycling-quick-pro-xr-one` | China Cycling | automatic captions · 2 takeaways |
| missing-china-price-specialized-crux (candidate/wheelset) | `gc-performance-specialized-crux-comp-2024` | GC Performance | automatic captions · 4 takeaways |
| missing-china-price-specialized-roubaix-sl8 (candidate/wheelset) | `jamesthebikeguy-specialized-roubaix-sl8-base` | Jamesthebikeguy | automatic captions · 5 takeaways |
| missing-china-price-specialized-tarmac-sl8 (candidate/wheelset) | `gc-performance-specialized-tarmac-sl8-comp-2026` | GC Performance | automatic captions · 3 takeaways |
| missing-china-price-specialized-tarmac-sl8 (candidate/wheelset) | `road-cc-cheapest-specialized-tarmac-sl8` | road.cc | creator captions · 4 takeaways |
| missing-china-price-tavelo-arow (candidate/wheelset) | `china-cycling-tavelo-arow-2026-build` | China Cycling | automatic captions · 3 takeaways |
| missing-china-price-trek-checkpoint (candidate/wheelset) | `terra-riders-trek-checkpoint-sl5-gen3-long-term` | Terra Riders | automatic captions · 5 takeaways |
| missing-china-price-trek-domane (candidate/wheelset) | `bikelabhq-trek-domane-sl5-gen4-six-months` | BikeLabHQ | automatic captions · 5 takeaways |
| missing-china-price-trek-madone-gen-8 (candidate/wheelset) | `gc-performance-trek-madone-sl5-gen8` | GC Performance | automatic captions · 4 takeaways |
| missing-china-price-van-rysel-rcr (candidate/wheelset) | `cyclingnews-van-rysel-rcr-f-review` | Cyclingnews Tech | automatic captions · 5 takeaways |
| missing-china-price-winspace-slc3 (candidate/wheelset) | `david-arthur-winspace-slc3-review` | David Arthur - Just Ride Bikes | automatic captions · 4 takeaways |
| missing-china-price-winspace-t1550 (candidate/wheelset) | `watt-life-t1550-gen2-build-cost` | The Watt Life | automatic captions · 3 takeaways |
| pardus-super-al (candidate/wheelset) | `5am-bicycle-studio-pardus-super-al-105-india` | 5AM BICYCLE STUDIO Cyclistlife | automatic captions · 3 takeaways |
| pardus-super-sport (candidate/wheelset) | `dani-chika-pardus-super-sport-disc-climb-weigh` | Dani Chika | automatic captions · 2 takeaways |
| pardus-uragano-sport (candidate/wheelset) | `veloville-pardus-uragano-sport-unboxing` | Veloville | automatic captions · 4 takeaways |
| pinarello-f5 (candidate/wheelset) | `approved-pinarello-f5-negative-points` | Approved | automatic captions · 3 takeaways |
| pinarello-f5 (candidate/wheelset) | `bicycling-pinarello-f5-review` | Bicycling | creator captions · 4 takeaways |
| quick-pro-er-one (candidate/wheelset) | `china-cycling-quick-pro-er-one` | China Cycling | automatic captions · 6 takeaways |
| quick-pro-ur-one (candidate/wheelset) | `china-cycling-quick-pro-ur-one` | China Cycling | automatic captions · 3 takeaways |
| quick-pro-ur-one (candidate/wheelset) | `china-rides-quick-pro-ur-one` | China Rides | automatic captions · 4 takeaways |
| sava-a7l-pro-2026 (candidate/wheelset) | `bikelabhq-sava-a7l-pro-review` | BikeLabHQ | automatic captions · 6 takeaways |
| sava-a7l-pro-2026 (candidate/wheelset) | `jonathan-simmons-sava-a7l-pro-owner` | Jonathan Simmons | automatic captions · 4 takeaways |
| sava-f20-hawkeye (candidate/wheelset) | `china-cycling-sava-f20-hawkeye` | China Cycling | automatic captions · 4 takeaways |
| scott-addict-40 (candidate/wheelset) | `sam-rates-bikes-scott-addict-2026-review` | Sam Rates Bikes | automatic captions · 4 takeaways |
| scott-foil-rc-10 (candidate/wheelset) | `jenson-usa-scott-foil-rc-10-ride-review` | Jenson USA | automatic captions · 3 takeaways |
| seka-exaero-road (candidate/wheelset) | `cycling-boon-seka-exaero-road-shop-look` | Cycling_Boon | automatic captions · 2 takeaways |
| seka-exceed-105-di2-dealer-build (candidate/wheelset) | `cam-nicholls-seka-exceed-rdc-first-impressions` | Cam Nicholls | automatic captions · 4 takeaways |
| seka-exceed-105-di2-dealer-build (candidate/wheelset) | `cam-nicholls-seka-exceed-retailer-warning` | Cam Nicholls | automatic captions · 1 takeaways |
| seka-spear-rdc (candidate/wheelset) | `cyclingnews-seka-spear-rdc-review` | Cyclingnews Tech | automatic captions · 5 takeaways |
| seka-spear-rdc-frameset (candidate/wheelset) | `klein-concept-seka-spear-rdc-first-impressions` | Klein Concept | automatic captions · 4 takeaways |
| seka-spear-standard-105-di2 (candidate/wheelset) | `david-arthur-seka-spear-10000km` | David Arthur - Just Ride Bikes | automatic captions · 4 takeaways |
| seka-spear-standard-105-di2 (candidate/wheelset) | `david-arthur-seka-spear-first-ride` | David Arthur - Just Ride Bikes | automatic captions · 5 takeaways |
| specialized-roubaix-sl8-comp-105 (candidate/wheelset) | `david-arthur-specialized-roubaix-sl8-first-ride` | David Arthur - Just Ride Bikes | automatic captions · 4 takeaways |
| specialized-s-works-crux-2024-sram-red-xplr (candidate/wheelset) | `david-arthur-specialized-s-works-crux-long-term` | David Arthur - Just Ride Bikes | automatic captions · 4 takeaways |
| specialized-s-works-crux-frameset (candidate/wheelset) | `road-bike-action-specialized-s-works-crux` | Road Bike Action Magazine | automatic captions · 3 takeaways |
| twitter-r10-pro-gen3 (candidate/wheelset) | `bike-content-twitter-r10-pro-season-review` | Bike Content | automatic captions · 5 takeaways |
| twitter-t10-pro (candidate/wheelset) | `bkbike-twitter-t10-pro-r7120` | BKBIKE - GIÁ TỐT 1.0.2 | automatic captions · 3 takeaways |
| voicevelo-g-major (candidate/wheelset) | `china-cycling-voicevelo-g-major` | China Cycling | automatic captions · 5 takeaways |
| winspace-m6 (candidate/wheelset) | `bikeradar-winspace-m6-review` | BikeRadar | automatic captions · 7 takeaways |
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
| xlab-ad8 (candidate/wheelset) | `china-rides-xlab-ad8-build` | China Rides | automatic captions · 3 takeaways |
| yoeleo-sat-c45-db-pro-nxt-gravel (candidate/wheelset) | `cycle-workshop-yoeleo-sat-c45-nxt-gravel-long-term` | The Cycle Workshop | automatic captions · 3 takeaways |
| yoeleo-sat-c45-db-pro-nxt-gravel (candidate/wheelset) | `cycle-workshop-yoeleo-sat-c45-nxt-gravel-review` | The Cycle Workshop | automatic captions · 5 takeaways |

Published platforms with no linked YouTube video yet: `bianchi-oltre-race`, `camp-gx600`, `incolor-voyager`, `lightcarbon-lcg071s-pro`, `lightcarbon-speedz`, `pardus-super-sport-gen2`, `rinasclta-gr025`, `sava-a7l-r7100`, `sava-gelaro-s8`, `sava-gelaro-sf`, `spcycle-g026`, `tfsa-jh37`, `twitter-cyclone-electronic`, `twitter-cyclone-gen3-et`, `twitter-gravel-v3-2024`, `twitter-t3-tt`, `xmcarbonspeed-cs-gr01`.
