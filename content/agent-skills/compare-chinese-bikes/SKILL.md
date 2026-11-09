---
name: "compare-chinese-bikes"
description: "Shortlist and compare Chinese bicycles and framesets with the public Chinese Bikes catalog (chinesebikes.xyz): dated China-market prices and frame-build estimates, category, tire clearance, drivetrain, weight, frame standards, geometry and the sources behind each fact. Use when someone asks which Chinese road, aero, all-road, gravel, flat-bar or triathlon bike or frameset to consider, wants specific models compared, or asks what to check before buying one. Keeps unknowns, evidence dates and caveats; never invents values or a universal score."
compatibility: "Needs HTTPS access to chinesebikes.xyz. Reads public pages and data files only; no account, key or write access."
metadata:
  publisher: "Chinese Bikes"
  homepage: "https://chinesebikes.xyz/"
  updated: "2026-11-03"
---

# Compare Chinese bikes

Chinese Bikes (https://chinesebikes.xyz/) is an independent catalog of Chinese complete bikes and framesets, researched from China-market sources, for buyers in Europe, North America and mainland China. Use it to shortlist and compare models without losing the evidence behind each fact. Everything below is public and read-only.

## Public resources

| Need | Resource |
| --- | --- |
| Site guide | https://chinesebikes.xyz/llms.txt |
| Every catalog row as one Markdown table | https://chinesebikes.xyz/index.md |
| One model's evidence | the model page with `index.md` appended, for example https://chinesebikes.xyz/models/twitter-v3-rs-sensah/index.md |
| Published records as data | https://chinesebikes.xyz/data/catalog.json and https://chinesebikes.xyz/data/catalog.csv |
| Source records | https://chinesebikes.xyz/data/sources.json |
| How prices and estimates work | https://chinesebikes.xyz/methodology/index.md |
| Lists by type and price | https://chinesebikes.xyz/complete-bikes/, https://chinesebikes.xyz/framesets/, https://chinesebikes.xyz/brands/, https://chinesebikes.xyz/prices/ |
| Component references | https://chinesebikes.xyz/electronic-shifting/, https://chinesebikes.xyz/carbon-wheels/, https://chinesebikes.xyz/tires/ and https://chinesebikes.xyz/data/tires.json |

Every page also answers `Accept: text/markdown`. Chinese and German catalogs, model pages and guides are under `/zh/` and `/de/`; Spanish and Russian (`/es/`, `/ru/`) translate the catalog and tools while product text stays in English. The build planner (https://chinesebikes.xyz/build/) and geometry comparison (https://chinesebikes.xyz/geometry/) are interactive in HTML; point the buyer there for exact part-by-part builds or size overlays.

Fetch what the task needs: the catalog table or data files first, then the model pages on the shortlist. Do not crawl every model page.

## Workflow

1. **Pin down the need.** Ask only for what is missing: the buyer's region (Europe, North America or mainland China), budget and currency, complete bike or frameset build, category, drop or flat bar, required tire width, drivetrain (mechanical or electronic, 1× or 2×), weight priority and size or fit limits.

2. **Build the candidate list.** Read https://chinesebikes.xyz/index.md. Its table has Bike, Product type, Category, Price, Tires, Drivetrain, Weight and Frame columns, and each bike links to its model page. Rows after **Partial profiles** are research leads with incomplete evidence: offer them only as leads to verify, never as equals of published records. For structured filtering of published records, use `products[]` in catalog.json (`brand`, `platform`, `variant`, `prices`, `latest_price`, `display_price`, `sources`) or catalog.csv.

3. **Filter on recorded values only.**
   - `—` or a missing field means unknown. Keep unknowns visible and name them. Exclude an unknown only when the buyer asks to.
   - Tires: a plain width is the recorded maximum clearance, labelled 1×/2× or front/rear where they differ. `NN mm stock` is the fitted tire with the maximum unverified; never treat it as a maximum.
   - Weight: `kg` values are complete bikes; `g frame` values are frames only. Each model page states the size and equipment basis.
   - Category: compare like with like. Unlike categories serve different riding, so do not rank across them.

4. **Read the evidence for each shortlisted model.** Open its Markdown page and use: the price line and **Price record and sources** (date, status, conditions, source), **Buying checks**, **Specifications and evidence** (tire clearance, frame, purchase route), **Geometry**, **Owner and reviewer opinions** and **Videos**. Note the `lastmod` date in the front matter.

5. **Keep prices honest.**
   - Prices are dated observations or labelled estimates, mostly in mainland-China yuan (CNY). They are not live offers or quotes.
   - They exclude shipping and import charges unless marked Delivered.
   - Repeat each price's state label (such as Observed, Promo, Official or Current reference) and its date.
   - A range such as ¥9,000–12,000 spans the recorded evidence. When it crosses the buyer's budget, show the whole range and say the model may fit; never quote only its low end.
   - `Est.` on a frame build is the recorded frameset price plus the site's selected build allowance (the reviewed default is ¥6,000 for a 105 Di2-oriented standard build; see the methodology). It is a planning estimate, not a package price. In catalog.json, `display_price.estimated`, `buildAmount` and `frameLow`/`frameHigh` separate the two parts.
   - Model pages also record dated regional listings in their native currency where found. If you convert a price yourself, say so and give the rate and date; it is not a local price.

6. **Compare.** Use one table per category with the same fields, sources and evidence dates for every model. Where it matters, say whether a fact is measured, official, a seller claim, a community report, inferred or unknown. Present the page's verdict, strengths and caveats as the site's source-based editorial view, not hands-on testing.

7. **Answer.** Lead with the shortlist and why each fits. Then give the table. Then, for each model, **Confirm before buying**: the page's buying checks plus what the buyer's need makes critical, such as size geometry, the current price and delivered cost to their country, tire fit with their drivetrain, bottom bracket and hanger standards, what a frameset package includes, and the warranty or crash-replacement route. End with the model page links, price dates and the dataset credit.

## Rules

- Never invent a specification, price, source, model relationship or image right. If the site does not record a value, say it is unknown.
- Missing evidence is not negative evidence. It lowers confidence; it does not prove poor quality.
- Do not carry a fact to another generation, size, trim or similarly named model.
- There is no universal score; do not make one. An opinion summary appears only with at least 21 independent opinions on one exact model and describes sentiment, not quality.
- Carbon fiber grades such as T700, T800 or T1000 are not quality scores.
- Videos and opinions add context. They do not establish a current price, exact build or specification.
- Credit reused data: the structured dataset is CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), credit "Chinese Bikes (https://chinesebikes.xyz/)". Product images and linked third-party material keep their own rights; link to them instead of copying them.
- Read at a normal pace and respect robots.txt. Linked marketplaces and social sites can require login or block automated access: send the buyer the link instead of trying to get around it.
- Do not order, message sellers or submit forms for the buyer unless they explicitly ask.
- To report an error or a new price, the buyer can open an issue with the exact model and a source: https://github.com/p0s/china-bike-research/issues

## Example

Request: "A carbon gravel frameset build under ¥10,000 that takes 45 mm tires."

1. Read https://chinesebikes.xyz/index.md. Keep Frame build rows in gravel categories with an `Est.` price of ¥10,000 or less and a recorded clearance of 45 mm or more (not `stock`). Mark a price range that crosses ¥10,000 as "may fit".
2. Open each remaining model page. Confirm the frame material, then record the frameset price date and status, what the package includes, the clearance evidence, the bottom bracket and the weight basis.
3. Answer with the shortlist, one comparison table, confirm-before-buying items for each model and the links, and say that the build estimates exclude shipping and import.
