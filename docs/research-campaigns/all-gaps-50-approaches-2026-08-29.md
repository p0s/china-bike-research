# All-gaps 50-approach campaign

This campaign freezes the live `main` inventory at verified commit `79c871e87aba3dad656cc380c596f58ac3489c1c` on 2026-08-29.

- 261 catalog records exposed 1,253 overlapping gap instances.
- Shared platform facts were deduplicated across variants.
- Aggregate `candidate-blockers` and runtime-only `image-health-unverified` states were excluded because they are not missing pieces of product information.
- The resulting campaign contains 989 information fields: 71 variant fields, 66 platform fields, and 852 candidate fields.
- Completion requires at least 49,450 validated approach applications, plus coverage for any new information fields that appear while records are corrected or promoted.

The machine-readable field manifest is `data/research-campaigns/all-gaps-50-approaches-2026-08-29.json`. `npm run research:50-audit` reports progress; append `-- --strict` for the terminal gate.

Each field is complete only when its exact evidence has been integrated or its unknown state is preserved after all 50 registered source areas were genuinely checked. Exhaustion is not negative evidence. Searches never cross CAPTCHA, login, security-verification, rate-limit, privacy, or image-rights boundaries.
