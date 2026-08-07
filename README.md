# China Carbon Bike Guide

An evidence-backed buyer’s guide to carbon gravel and all-road bikes and framesets available to riders in mainland China.

**Current scope:** carbon complete bikes and framesets that generally support more than 38 mm nominal tires, with emphasis on value, dated China prices, usable clearance, modern standards, manufacturing evidence, and finished-bike cost.

[Open the buyer guide](https://p0s.github.io/china-bike-research/) · [Browse the data](data/) · [Contribute research](CONTRIBUTING.md)

> GitHub repository ownership has been set to `p0s` in the project metadata and links above now resolve for this repo owner.

## Current quick picks

| Buyer need | Current reference | Great-buy price | Main caveat |
|---|---|---:|---|
| Cheapest traceable complete | Twitter Gravel V3 RS/Sensah | ≤ ¥4,100 | Maximum clearance and frame-molding provenance are not fully documented |
| Best complete-bike value | Twitter Gravel V3 WheelTop EDS | ≤ ¥5,300 | Aluminum wheels; smaller drivetrain service network than Shimano |
| Shimano budget alternative | SAVA Gelaro S4 GRX400 | ≤ ¥6,300 | Less component value than the Twitter EDS build |
| Conservative budget custom frame | LightCarbon LCG071S-PRO | ≤ ¥4,200 frameset | Finished custom build costs materially more than a value complete |
| Premium versatile package | Yoeleo Altera G21 | Model-dependent | Different price class from the budget completes |

These are dated editorial reference points, not permanent rankings. The website displays the underlying price date, evidence status, and caveats.

## What is included

- Buyer-facing static website for GitHub Pages
- Separate complete-bike and frameset explorers
- Side-by-side comparison for up to four products
- Exact frame platforms separated from build configurations and dated prices
- Evidence labels for tire-clearance and technical claims
- Manufacturing-provenance assessments with explicit confidence
- Reusable custom-build cost profiles
- Brand pages, buyer guides, watchlist, and exclusions
- Public JSON and CSV exports
- Structured GitHub issue forms and pull-request workflow
- Cross-reference validation, privacy scanning, tests, internal-link checks, and static-site build validation

The initial dataset contains **23 brands, 29 platforms, 30 configurations, 30 dated price records, and 35 sources**. It deliberately preserves uncertainty instead of filling missing facts with confident guesses.

## Local development

Prerequisite: **Node.js 20 or newer**. The project has no runtime or build dependencies, so no package installation is required.

```bash
npm run dev
```

This builds the site and serves it at `http://127.0.0.1:4173`.

Run the complete quality gate:

```bash
npm run check
```

That command performs:

1. privacy-pattern scan;
2. data and cross-reference validation;
3. Node test suite;
4. production static build;
5. generated internal-link validation.

## Publish with GitHub Pages

1. Create a new **public** GitHub repository.
2. Upload the contents of this repository so `package.json` is at the repository root.
3. Use `main` as the default branch.
4. In **Settings → Pages**, set **Source** to **GitHub Actions**.
5. Push to `main`, or manually run **Deploy GitHub Pages** under the Actions tab.

The build derives the GitHub project-page base path from `GITHUB_REPOSITORY`, so it continues to work when the repository is renamed. A repository named `p0s.github.io` is also handled without a project subpath.

Optional local deployment variables are documented in `.env.example`. GitHub Actions does not require them.

## Data structure

```text
data/
├── brands/          # company, manufacturing relationship, support
├── platforms/       # shared frame facts, clearance, standards
├── variants/        # exact complete-bike or frameset configuration
├── prices/          # dated observations and ranges
├── sources/         # source identity and reliability notes
├── build-profiles/  # reusable parts-cost assumptions
├── recommendations/ # buyer-facing quick picks
├── candidates/      # interesting but incomplete products
└── exclusions/      # explicit exclusion reason and review trigger
```

A price is never stored as a timeless property of a model. A frame platform is not duplicated for every drivetrain configuration. Human-edited records use JSON, and reference schemas are published in `schemas/`.

## Privacy

The initial repository contains no buyer identity, personal name, private email, phone number, address, account handle, order ID, tracking number, payment information, private message, or private screenshot. Marketplace observations are anonymized and retain only decision-relevant model, price, date, and condition facts.

Contributors must remove personal and transaction data from attachments. See the generated `/privacy/` page and [CONTRIBUTING.md](CONTRIBUTING.md).

## Evidence and limitations

“Official” means a manufacturer or brand claim, not independent verification. “Unknown” means missing evidence, not a negative quality judgment. The guide is not structural certification, a professional fit service, or a live inventory system. Verify the exact SKU, measured tire/rim combination, remaining clearance, BOM, serial number, warranty, and return terms before purchase.

## Licenses

- Code: [MIT](LICENSE)
- Original research text and structured data: [CC BY 4.0](LICENSE-DATA)
- Product names, trademarks, and linked third-party material remain with their owners; see [THIRD_PARTY.md](THIRD_PARTY.md).
