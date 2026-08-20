# Repository Instructions

## Read first

1. Read `VISION.md` for product intent.
2. Read `SPEC.md` for the behavior and data contract.
3. Inspect only the code and records relevant to the task.

User instructions override this file. `SPEC.md` overrides incidental existing behavior.

## Repository workflow

- `p0s/china-bike-research` is a public GitHub repository. Do not assume private visibility or use tooling restricted to private repositories.
- Never push directly to `origin/main`; direct pushes to remote `main` are prohibited even if the active credentials technically permit them.
- Put changes on a feature branch, push that branch, open a pull request to `main`, wait for required checks, and merge through the pull request. GitHub Pages deploys from `main` after the merge.

## Task boundaries

- Plan, audit, review, and diagnosis requests are read-only. Until execution is authorized, do not create a goal, browse research sites, create a worktree, edit, run write-producing checks, or mutate Git/external state.
- Before execution, freeze 3-7 steps and done criteria. A research batch covers at most 10 exact models or 25 atomic gaps and has one writer.
- End a batch at its first local delivery or merged pull request. Later "add more" work is a new bounded batch; never keep one goal across deliveries.
- At two compactions or about 90 minutes, make a ≤25-line checkpoint and decide keep versus handoff. At three compactions, hand off unless delivery is imminent. Record exactly one of `[workflow-decision:keep]` or `[workflow-decision:handoff]`. Include only checkout/branch/HEAD, batch IDs, done/next items, blockers, validation, and mutation authority.

## Research workflow

- Start with `npm run --silent data:gaps` and select the bounded top batch. Never dump whole data directories, schemas, DOMs, or unchanged reports.
- Research one exact model/source page at a time and extract all supported useful fields. Check linked sources, exact primary sources, mainland listings, then public community sources.
- Stop at decisive evidence. Use up to three distinct routes only for a still-unresolved, purchase-relevant claim; do not give every field three searches.
- Research-only batches change data and dated evidence. Leave tooling, `SPEC.md`, rendering, and unrelated UI work for a separate task unless it blocks the frozen batch.

## XHS and public-community research

- Before any XHS worker starts, preflight dedicated research Chrome once: signed in, the canonical `network-requests-extension` checkout enabled (not a copied worktree), duplicates disabled, and one usable tab.
- Use one sequential XHS lane. Search cards are discovery only; opened exact posts may support visible claims, while comments remain `community report` evidence.
- Keep only sanitized public URLs and privacy-safe summaries. Third-party media never enters Git. A selected public-post photo may use `public-post-quotation` on the approved external media origin only when its record has the exact source, owner credit, editorial purpose, no-license statement, removal route, content hashes, alt text, fallback, and completed privacy review. Otherwise use `public-post-embed` or the project placeholder.
- Security Verification, HTTP 412, or rate limiting stops the lane. Close the tab, record the blocker, and retry only in a later turn after the user confirms normal access.

## Research delegation

- Use at most two direct evidence-only children per batch, only when explicitly requested or required by a skill. Give them disjoint model lists; they do not write, share the XHS lane, recurse, or duplicate audits. One writer integrates results, and no browser-dependent child starts before its preflight passes.

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
- **Images:** third-party binaries never enter Git. Direct remote references remain the default. The approved external media origin may serve a bounded public-post editorial quotation only under the complete `SPEC.md` media contract. Preserve exactness, source, credit, alt text, privacy review, immutable derivative metadata, and fallback.

Use lowercase kebab-case IDs and existing schemas. Keep shared product facts in `platforms/`, exact builds in `variants/`, and dated market facts in `prices/`.

## UI changes

- Preserve one homepage catalog with inline comparison.
- Treat category as a primary navigation and filtering concept.
- Show a compact common core, then expose category-specific facts only where useful.
- Move secondary details to accessible popovers or model pages.
- Remove repetition rather than adding another explanation or page.
- Keep generic project copy broad; keep model-specific category descriptions accurate.
- Keep the design minimalist, responsive, keyboard-accessible, and base-path safe for GitHub Pages.

## Public-post browser research

- Use only the dedicated research Chrome and the local request-capture extension. Keep capture data local, and never expose cookies, tokens, or private request parameters in repository records.
- Keep one active search or detail tab. Do not fan out concurrent tabs or use the extension's bulk auto-mode for evidence collection.
- Stop the lane immediately on a verification or HTTP 412 challenge, record the field as blocked, and retry in a later research window. Do not solve or bypass the challenge and do not repeatedly probe it.
- There is no verified numeric safe delay. A rapid tab fan-out was followed by a challenge, while a slower single-tab retry remained challenged, so use moderate variable pacing without treating it as a guarantee.
- The canonical capture extension is `aeldmfnliicdpoggggpnbhpfbbkkkpmd`; keep duplicate extension `inepmoichhhgmpohidkjofleliiipccb` disabled. If the canonical window reaches Security Verification, close the tab after one sanitized blocked record and do not advance to another queue item in that same window.

## Validation and handoff

During development, run only the smallest check covering the changed behavior. Run the complete gate once per coherent batch:

```bash
npm run check
```

Do not rerun the full gate after documentation, evidence metadata, or unchanged-code edits. For image changes, run `npm run image:report` once, with at most one confirmation retry per changed unreachable URL. For UI changes, inspect desktop and mobile output.

Before handoff, review the diff for unsupported claims, stale dates, broken references, privacy leaks, copied images, and unnecessary complexity.

Report the files changed, evidence added, assumptions or unknowns, and commands run. Do not claim verification you did not perform.
