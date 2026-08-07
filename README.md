# China Carbon Bike Guide

A minimalist, evidence-backed comparison of carbon gravel and all-road bikes available to riders in mainland China.

The GitHub Pages site opens directly into one unified catalog. Complete bikes and frameset-based builds are sorted and filtered together, so the visible price is always comparable:

- complete bike: latest dated complete-bike price;
- frameset: latest dated frameset price plus a fixed **¥6,000** China-market build allowance.

The allowance represents an electronic hydraulic 2×12 drivetrain, alloy wheels, tires, finishing parts, and assembly. It is deliberately identical for every frame; the underlying frame price and all price assumptions remain visible in the price details.

## Site behavior

- Product images, search, filters, and sorting on the homepage
- Complete bikes and estimated frame builds in one list
- Inline comparison of two to four selected products
- Price date, freshness, promotion conditions, clearance evidence, and buy thresholds in accessible info popovers
- Individual model pages for rationale, caveats, seller questions, source records, and manufacturing context
- Product-image credits and automatic local fallbacks for broken remote images
- Public JSON and CSV exports

There are no accounts, analytics, advertisements, affiliate rankings, or backend services.

## Run locally

Requires Node.js 20 or newer. The project has no external runtime or build dependencies.

```bash
npm run dev
```

Open `http://127.0.0.1:4173`.

Run the complete quality gate:

```bash
npm run check
```

This performs the privacy scan, data and image validation, tests, static build, and internal-link validation.

## Publish with GitHub Pages

1. Create a public GitHub repository.
2. Upload these files so `package.json` is at repository root.
3. Use `main` as the default branch.
4. Open **Settings → Pages** and choose **GitHub Actions** as the source.
5. Push to `main`.

The included workflow derives the correct project-page base path from the repository name.

## Data model

```text
data/
├── brands/          # manufacturer relationship and China support
├── platforms/       # shared frame, clearance, geometry-standard facts
├── variants/        # exact complete-bike or frameset offering
├── prices/          # dated observations and reference ranges
├── sources/         # source identity, access date, and reliability notes
├── images/          # product-image source, exactness, rights, and URL
├── recommendations/ # compact buyer-facing recommendation labels
├── candidates/      # promising models still missing evidence
└── exclusions/      # excluded products and the reason
```

A price is never stored as a timeless product property. Shared frame facts are not duplicated across drivetrain variants. Missing evidence lowers confidence rather than being treated as proof of poor quality.

## Images

Current product photos are loaded from their credited official manufacturer or retailer host and are not copied into this repository. Every image has source, exactness, credit, rights-status, and fallback metadata. See [IMAGE_SOURCES.md](IMAGE_SOURCES.md) and [THIRD_PARTY.md](THIRD_PARTY.md).

## Contributing

Research is added through structured GitHub issues and pull requests. Exact model identity, dated evidence, and privacy-safe submissions are required. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Privacy and licenses

The repository contains no buyer identity, private messages, order details, payment information, addresses, or private screenshots.

- Code and original fallback artwork: [MIT](LICENSE)
- Original research text and structured data: [CC BY 4.0](LICENSE-DATA)
- Product names, trademarks, linked pages, and third-party photography remain with their respective owners.
