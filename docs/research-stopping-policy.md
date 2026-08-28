# Research stopping policy

Research stops per atomic gap, not per bike. An atomic gap is one exact catalog target and one decision-relevant field, such as an exact image, mainland complete-bike price, frameset price, complete weight, frame weight, geometry, bottom bracket, clearance, BOM item, purchase route, or warranty route.

## Attempt budget

High-priority gaps normally require both evidence channels:

1. Up to three distinct public-post searches: exact English model and field; Chinese brand/model alias and field; then a year, trim, or use-case variation.
2. Up to three distinct web searches: exact manufacturer route; official regional catalog or authorized exact-SKU route; then a targeted alternate official, archive, or credible industry route.

An attempt counts only when its query and route are materially different. Repeating the same search wording, result page, source family, or unverified snippet does not count.

Stop early when exact, attributable evidence resolves the field. Preserve the original source, access date, model/trim/market match, conditions, authority, and any conflict. Images also require a stable remote asset, subject exactness, credit, rights status, alt text, and fallback. Prices must distinguish complete bike, frameset/package, promotion, used sale, deposit, foreign reference, and current mainland observation.

When an already accepted source for the same exact target directly publishes another atomic field, reuse it with a `resolution.kind: source-reuse` record instead of rewriting a historical attempt or repeating an identical search. The resolution must name the accepted source, date the reconciliation, state the exact claim and model/trim match, and preserve any unrun channel as `not-run`; source reuse is evidence reuse, not a fabricated search attempt.

## Exhaustion states

- `found`: exact evidence was accepted; later channels may remain unrun.
- `temporarily-exhausted`: every required channel completed all three distinct attempts without acceptable evidence.
- `blocked`: a required channel could not be completed because of authentication, challenge, inaccessible dynamic content, or another recorded external limitation.
- `conflicted`: exact-looking sources disagree and the difference cannot yet be explained by market, trim, size, date, or condition.
- `open`: the attempt budget is incomplete.

Temporary exhaustion is not negative evidence. It means “not found through the recorded routes on this date.” Exhausted gaps receive a retry date and reopen when a new model year, source lead, restored page, tooling improvement, or conflicting catalog change appears.

CAPTCHA, login, and Security Verification remain human-only. HTTP 412, 300013, or rate limiting stops the current job with no same-session retry or bypass; on a later turn, one content-free normal-access probe may clear the breaker when ordinary cards load, without requiring a particular user phrase.

## Durable ledger

Each atomic result lives in `data/research-attempts/`. `npm run research:check` rejects duplicate target fields, repeated queries or route labels, incomplete exhaustion, invalid references, private access parameters, and found results without accepted source records. `npm run research:report` summarizes coverage and effort. The attempt ledger is included in the monotonic coverage baseline so completed searches cannot silently disappear.

`npm run data:gaps` is the finite planning view. It selects all published variants plus non-duplicate high- and medium-priority candidates, then emits at most 25 decision-critical, unattempted or explicitly retry-due fields across at most 10 models. Research evidence, publication gates, and operational checks have separate queues; each default queue is independently capped at 10 models and 25 rows, while its full active-scope totals remain disclosed. The metrics denominator is the entire selected scope, not a capped queue, and always distinguishes candidates from published variants. `npm run data:gaps:all` retains every long-tail gap and state without rewriting evidence.

The decision-ready metric requires an exact configured price, applicable weight plus basis, maximum clearance, complete-bike drivetrain/BOM, material or construction detail, purchase route, and exact image. Stiffness remains visible as supporting coverage; it becomes decision-critical only when the candidate, variant, or platform is explicitly marked `research_finalist: true`. To record a bounded batch rate without inferring effort, supply both inputs:

```bash
npm run data:gaps -- --models-completed 3 --hours 1.5
```

`npm run research:queue` uses the same finite default. `npm run research:queue:all` exposes evidence awaiting integration, deferred exhaustion, blockers, conflicts, and ledger-only fields that have no coarse gap-code mapping.

For a sequential browser pass, request only one unresolved channel item at a time:

```bash
npm run research:queue -- --channel public-post --channel-status not-run --limit 1
```

Finish or record that atomic field before requesting the next item. The limit is a workflow guard against turning a research queue into concurrent tabs; it is not a claim about a safe request cadence.
