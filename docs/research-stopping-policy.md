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

## Durable ledger

Each atomic result lives in `data/research-attempts/`. `npm run research:check` rejects duplicate target fields, repeated queries or route labels, incomplete exhaustion, invalid references, private access parameters, and found results without accepted source records. `npm run research:report` summarizes coverage and effort. `npm run research:queue` separates ready work, evidence awaiting integration, deferred exhaustion, blockers, and conflicts; fields without a coarse catalog gap code stay visible as ledger-only queue items. The attempt ledger is included in the monotonic coverage baseline so completed searches cannot silently disappear.

For a sequential browser pass, request only one unresolved channel item at a time:

```bash
npm run research:queue -- --channel public-post --channel-status not-run --limit 1
```

Finish or record that atomic field before requesting the next item. The limit is a workflow guard against turning a research queue into concurrent tabs; it is not a claim about a safe request cadence.
