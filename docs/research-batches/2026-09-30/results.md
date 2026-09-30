# Verified bike-data additions — 2026-09-30

Base: `p0s/china-bike-research` commit `4e5154196b44163a1c8bbe3569c5486f6353e7ff`.

The gap report flagged 250 records: 28 published variants and 222 candidates. It included 103 unverified-clearance and 81 missing-complete-weight entries. These are record-level counts, not distinct physical frames. Most highest-ranked targets already have blocked or trim-conflicted research. No open pull requests were returned during the duplication check.

This bounded batch enriches five exact models from five manufacturer pages. It adds 19 accepted atomic evidence records and two unresolved follow-up records. These fine-grained additions do not resolve the report's broad model-publication, clearance or full-bike-weight gaps.

## Additions

- CAMP GX600 PES: exact shifter and rear derailleur, chain speed, double-wall wheel/hub construction, Chaoyang fitted tires; a new CNY 5,688 official-list observation. Stock and checkout remain unverified.
- CAMP GX700 GRX: wheel-bearing construction, integrated T700/T800 cockpit, T800 fork. Existing crank inconsistency remains visible.
- SCOTT Addict RC 40, model 290362: exact shifters, both derailleurs, crank/chainrings, cassette, chain, brake calipers and rotors; internal cable routing.
- ELVES Mori AeroX: fork and offset-specific seatpost weights, EPS/latex-bladder construction, axle and rotor compatibility, and itemized package accessories. No total frameset mass is inferred.
- WINSPACE G5: T47 68 mm explicitly requires external bearings.

## Primary evidence

All five pages were accessed on 2026-09-30. Per-record attribution and qualifications are in the corresponding new `data/sources/` JSON records.

1. https://www.campbicycle.com/gravel_92368/gx600.html
2. https://www.campbicycle.com/gravel_92368/gx700.html
3. https://www.scott.pl/produkt/1635/12093/Rower-Addict-RC-40
4. https://www.elvesbike.com/more.php?id=188&lm=47
5. https://www.winspace.cc/products/g5-gravel

## Unresolved evidence

- CAMP's linked generic geometry chart returned HTTP 403. No retry or bypass was attempted, and no coordinates were inferred from size choices. GX700 uses the same chart route, so it was not retried.
- The older SCOTT RC Disc manual and exact 290362 page still do not establish maximum tire clearance. The later endurance Addict's 38 mm value remains excluded.
- CAMP GX700's current crank row conflicts with its 1x12 designation. This batch does not change its drivetrain or attach a new selected-build price.
- Mori AeroX regional package options/hanger quantity vary. Confirm the selected offer. Component masses are not a complete-package weight.
- A preliminary GR025 page access exposed a verification interstitial; that route was stopped and excluded from the batch.
- Many mainland price leads remain configuration-hidden or conditional. Global specifications do not resolve local stock, checkout or warranty.

## Validation

The aggregate `npm run check` passed privacy, dataset validation, research ledger and monotonic coverage, then exposed three stale test expectations: price/research counts, expanded GX600 drivetrain text, and the newly surfaced GX600 purchase-route uncertainty. Those expectations were updated without relaxing the evidence rules. A regression test additionally protects exact weight bases, unknown clearance/geometry and the GX700 conflict.

Final test, build, SEO and patch-application results are recorded in the ZIP's `VALIDATION.md`. No images, runtime implementation, dependencies or production settings changed. No branch was pushed, PR opened or site deployed.
