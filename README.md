# China Bike Research

A minimalist, evidence-backed comparison of bicycles available to riders in mainland China.

**[Open the guide](https://china-bikes.p0s.eu/)**

The catalog combines complete bikes and suitable frameset builds in one comparison. It prioritizes information that changes a buying decision: China-market price, category, components, weight, compatibility, evidence quality, and estimated full-bike cost where applicable.

Prices are dated observations, not live quotes. Unknown facts remain unknown rather than being treated as bad.

## Contribute

Use the structured GitHub issue forms to add a model, submit a price, correct a specification, report owner experience, or fix an image. Pull requests are welcome.

See [DATA_ENTRY_PLAN.md](DATA_ENTRY_PLAN.md) for the evidence order, candidate-promotion gates, and proposed local authoring workflow for completing sparse records without adding maintenance UI to the public site.

After adding catalog evidence, run `npm run coverage:accept` to extend the append-only information baseline, then run `npm run check`. Removing a protected record requires a documented entry in `data/retired-records/`; lowering totals or editing the baseline cannot bypass CI.

For agent-assisted work, point the LLM at the repository and tell it to read [AGENTS.md](AGENTS.md) first.

- [VISION.md](VISION.md) — purpose and product principles
- [SPEC.md](SPEC.md) — product, research, and data contract
- [AGENTS.md](AGENTS.md) — instructions for coding and research agents

## License

- Code and original fallback artwork: [MIT](LICENSE)
- Original research text and structured data: [CC BY 4.0](LICENSE-DATA)
- Third-party names, pages, and images remain with their owners; see [THIRD_PARTY.md](THIRD_PARTY.md)
