# ZIP integration — 2026-09-30

Scope: the supplied five-model batch, with 19 found atomic research records and two unresolved records. The user authorized application and PR merge. No additional models or research gaps were added.

- Base: `4e5154196b44163a1c8bbe3569c5486f6353e7ff`, verified against freshly fetched `origin/main`.
- Patch SHA-256: `a0bc8a139f459312eec2d538a9850d26266dafb3c9f83f4d11f42a6663116244`.
- All 42 manifest file hashes passed; patch application passed without reconciliation; all applied files matched the supplied bytes.
- The five exact manufacturer pages were checked. CAMP GX600 and SCOTT model 290362 were read directly when the web reader could not fetch them. The imported component, price, construction, weight-basis, routing, and compatibility statements matched those pages.
- Existing CAMP GX700 drivetrain conflict, unknown CAMP geometry, unknown SCOTT maximum clearance, unverified checkout/stock, and Mori component-versus-package weight distinctions remain explicit.
- `npm run check` passed privacy, dataset, research and coverage stages. Its test stage passed 367 of 374 tests; seven preview-server cases could not bind loopback sockets inside the sandbox.
- `node --test tests/reliability-preview-server.test.mjs` passed all eight cases on the host, including the seven sandbox-blocked cases. No test assertions or application code were changed after these checks.
- `npm run build` passed: 588 pages for 41 products.
- `npm run seo:check` passed: 456 indexable and 132 noindex pages, unique titles, reciprocal language links and valid JSON.
- Generated HTML for all five changed models was checked for the additions and material qualifications. No interactive visual review was performed; rendering implementation and media are unchanged.
- `git diff --check` passed. The default outgoing-commit privacy stage had no outgoing commit to inspect; an explicit base-to-head scan is performed after committing.

The original source observations, price history, recommendations, runtime implementation, dependencies, media and production settings are preserved. The older canonical checkout and its pre-existing edits are outside this batch.
