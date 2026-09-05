# Reddit discovery and PR review — 2026-09-05

## Bounded outcome

Five missing frameset candidates were added: Evolve CIMA road, Mondince FM316, VeloBuild CX-002 (2023 internal routing), Seraph/TanTan TT-X68-new UDH, and Airwolf YF-R003. They remain research-stage catalog entries with explicit publication gaps. No foreign storefront price or owner build weight was converted into a mainland price or frameset-package weight.

Discovery used the first [ChineseCarbon all-time top page](https://www.reddit.com/r/ChineseCarbon/top/?t=all). Appearance there is community interest, not sales popularity, quality, or safety evidence. LightCarbon LCR018-D/LCG074 and Quick Pro ER:ONE already had records. Further models remain outside this batch.

Each candidate links its exact storefront and the discovery index. Airwolf also links the exact owner build because its carbon-grade description conflicts with the indexed storefront. Direct Airwolf access returned 403; no bypass was attempted. Mondince's headline and detailed weight bases disagree and are preserved as such. The old TT-X68 BSA URL returned 404; the accepted current record explicitly names the T47/UDH revision.

## Incolor clearance

The existing official Speedster document record already supports 38C slick / 32C slick for 1× / 2× on SR/SR+, with 36C small-knob tires as a separate 1× limit. This change encodes those accepted facts without refreshing their observation date. Current SR/SR+ naming was read back on the official product page, but a fresh document download timed out.

The SSR retailer page was reread and explicitly says 36C single-chainring / 32C dual-chainring. SSR is not the SR/SR+ platform. Older SS/SS+ names occur in secondary material and older manufacturer search-index excerpts, but exact historical-generation equivalence was not established; no historical aliases or sibling-model values were invented.

Catalog, comparison and model labels now use `x/y mm (1×/2×)`. Platform sorting/filtering still use maximum capability; the configurator uses the chosen drivetrain and falls back conservatively when layout is unknown. Rim width and tread caveats remain in the records.

## Review fixes and proof

- Capture checks requested page, player video ID and channel before fetching a caption; existing captures cannot be overwritten.
- Offline normalization rejects stale caption/status combinations; non-captured records cannot contribute stale normalized caption text. Matching no longer uses subset inference, and exceeding the conservative review cap exits nonzero.
- Pilot reporting was corrected to match the retained artifacts rather than claim an unverified historical Bilibili request sequence. No transcript claims or fresh Bilibili attempts were accepted.
- Browser inspection at 2200 px desktop and 390 px mobile found no horizontal overflow. SR/SR+ labels read `38/32 mm (1×/2×)`; SSR reads `36/32 mm (1×/2×)`. A 35 mm tire with the default 105 Di2 package produces a 32 mm 2× conflict warning. A new candidate checkbox activates with Space and links to its exact Build base.
- New rows initially exceeded the DOM budget. Omitting empty price-state spans and using an input accessible name instead of a redundant hidden span restores the existing budget without increasing it.
- The old 50-approach campaign remains frozen. Twelve new live gaps belong to these five candidates; they are visible to the audit, not falsely marked researched.

No third-party image binaries, transcripts, personal identifiers or browser state were published. Source dates and unresolved evidence remain distinct from implementation dates.

Local final gate: `npm run check` passed with 188 tests and 287 generated pages. Focused capture, clearance, rendering and interaction regressions passed. The first gate attempts caught a private local path in the task checkpoint and stale count expectations; those were corrected before the green final gate. No image records changed.
