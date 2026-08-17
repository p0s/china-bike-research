# Data-entry plan

The public catalog should stay quiet: an absent value is already visible as an em dash. Missing-data prioritization and authoring belong in repository tooling and review, not in a second website queue or repeated table warnings.

## What can be entered now

Use the existing GitHub issue forms for a new model, dated price, specification correction, owner report, or rights-safe image. A direct pull request may add or update the JSON records described in `SPEC.md` and `schemas/README.md`.

Enter evidence in this order:

1. Exact identity: brand, model, generation, product type, and category.
2. China relevance: purchase route, availability, support, and aliases.
3. A dated price record with market, channel, price type, conditions, exact variant, and source.
4. Decision-relevant platform facts, such as geometry, tire clearance, mounts, suspension, motor, folding, or triathlon details.
5. Exact complete-bike configuration: drivetrain and enough BOM detail to distinguish the variant.
6. Weight with size, configuration, measurement basis, and source.
7. Image metadata only when exactness, original source, credit, hosting mode, and rights basis are documented.

Add new observations instead of overwriting dated price or research history. Keep generation-specific facts on the exact platform or variant; never copy them to a similarly named model without evidence.

## Which sparse records to complete first

The maintenance view should rank candidates internally, without exposing a research queue on the website:

1. Models already visible in the focused catalog that have an exact identity and current China price.
2. High-interest Chinese models with two independent named sources.
3. Records missing only one publication gate, especially exact BOM or a primary source.
4. Models with current owner evidence that can be tied to an exact generation.
5. Generic, title-mismatched, or model-unclear leads last; exclude them when exact identity cannot be established.

Popularity or engagement may break a tie, but it cannot replace exact-model evidence.

## Proposed local authoring workflow

### Phase 1 — gap report

Implemented in this worktree: the dependency-free `npm run data:gaps` command reads the existing JSON and prints one ranked, machine-readable report. Each candidate or published variant includes actionable high-value gaps, linked source IDs, last review date, and the exact record/source files that would be created or edited. It does not create a public route or transmit data. Run `npm run --silent data:gaps` when a pure JSON stream is needed for another local tool.

### Phase 2 — guided writer

Add a local `npm run data:add` command with explicit modes for `source`, `candidate`, `brand`, `platform`, `variant`, `price`, and `image`. The writer should:

- start with a source and the claims it supports;
- reuse existing IDs after exact-match and alias checks;
- write one small JSON record at a time;
- require actual observation/access dates;
- preserve unknowns and price history;
- show the diff and run validation before accepting the write;
- never download media, upload evidence, or collect personal data.

The command should support `--dry-run` and accept a candidate ID so promotion work begins from an existing record rather than retyping discovery notes.

### Phase 3 — promotion preview

Add a local preview that maps a candidate to proposed brand → platform → variant → source → price records. It may mark publication gates as pass or unresolved, but promotion remains a reviewed pull request. After promotion, the candidate must point to the published record so it cannot render twice.

## Frameset estimates

The homepage editor is a buyer-side calculator. It changes published frameset totals, sorting, max-price filtering, comparison values, and the shareable URL for that browser view; it does not modify repository data.

The reviewed default lives in `data/meta.json` under `frameset_build_assumption`. Changing it requires a pull request that edits `amount_cny` and `reviewed_at`, supplies a dated rationale and realistic China-market component basket, updates methodology copy when needed, and receives explicit maintainer approval. The fixed allowance remains publication-eligible only for the categories allowed by `SPEC.md`.

## Promotion gate

A candidate becomes a published product only when every publication criterion in `SPEC.md` is supported for the exact model and generation. Review must confirm valid cross-references, source and date attribution, price basis, privacy, image rights, and no duplicate published configuration. Run `npm run check` and inspect the affected desktop and mobile catalog states before merge.
