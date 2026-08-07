# Repository Instructions

## Read first

1. Read `VISION.md` for product intent.
2. Read `SPEC.md` for the behavior and data contract.
3. Inspect only the code and records relevant to the task.

User instructions override this file. `SPEC.md` overrides incidental existing behavior.

## Working rules

- Make the smallest coherent change that fully solves the task.
- For current facts, browse current sources; never use model memory as evidence.
- Prefer primary and exact-model sources. Use Chinese sources when they improve China-market accuracy.
- Never invent a specification, price, source URL, model relationship, or image-rights basis.
- Preserve unknowns. Missing information is not negative evidence.
- Keep the repository static and dependency-light. Do not add a backend, analytics, scraping bypass, or production dependency without explicit approval.
- Never add personal, private transaction, credential, location, or private-message data.

## Data changes

- **Price update:** add a new file in `data/prices/`; keep older observations.
- **New product:** add or reuse brand → platform → variant, then add source, price, and image records. Use `data/candidates/` until the publication criteria in `SPEC.md` are met.
- **New category:** add only the category-specific fields, validation, filters, and presentation needed for a useful comparison. Do not distort unrelated categories to fit an existing field.
- **Correction:** change only the exact model/generation supported by evidence; do not propagate it to sibling models without proof.
- **Recommendations:** update only when the underlying evidence changes the buying conclusion.
- **Dates:** record the actual observation/access/review date. Do not refresh dates without rechecking the source.
- **Framesets:** use the allowance in `data/meta.json` only when it is a credible complete-build estimate for that product.
- **Images:** remote third-party files stay remote unless reuse rights are documented. Preserve exactness, credit, alt text, and fallback metadata.

Use lowercase kebab-case IDs and existing schemas. Keep shared product facts in `platforms/`, exact builds in `variants/`, and dated market facts in `prices/`.

## UI changes

- Preserve one homepage catalog with inline comparison.
- Treat category as a primary navigation and filtering concept.
- Show a compact common core, then expose category-specific facts only where useful.
- Move secondary details to accessible popovers or model pages.
- Remove repetition rather than adding another explanation or page.
- Keep generic project copy broad; keep model-specific category descriptions accurate.
- Keep the design minimalist, responsive, keyboard-accessible, and base-path safe for GitHub Pages.

## Validation and handoff

Run:

```bash
npm run check
```

For UI changes, inspect desktop and mobile output. Before handoff, review the diff for unsupported claims, stale dates, broken references, privacy leaks, copied images, and unnecessary complexity.

Report the files changed, evidence added, assumptions or unknowns, and commands run. Do not claim verification you did not perform.
