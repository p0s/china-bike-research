# Bounded SEO maintenance

Use current `VISION.md`, `SPEC.md` and `docs/editorial-guidelines.md` first. Production is https://chinesebikes.xyz/; English, Simplified Chinese and German have separate static pages. Preserve URLs, source dates, exact-model distinctions, unknowns, candidate indexing gates, privacy and the article publication queue.

## Adopted references

Reviewed [Illyism/seo-skills at af48ce5](https://github.com/Illyism/seo-skills/tree/af48ce5953e00ca75d1cd4d440e77d0c0d61a038). Use its title-optimization, customer-journey and blog-refresher ideas as references: match the buyer's question, answer clearly and improve an existing page when evidence warrants it. These are project-specific original instructions; no upstream skill is installed or vendored.

Do not import publishing quotas, automatic merges, ranking deadlines, paid backlink campaigns, vendor integrations, emotional sales copy or the instruction to avoid tests. Title length is guidance, not an acceptance threshold. Related pages or language editions targeting similar questions are not by themselves evidence of cannibalization; assess actual intent and aggregate search results before merging or redirecting.

## Buyer-intent map

These are proposed questions grounded in existing product capabilities, not measured search volume or ranking claims. Europe and North America are the primary buyer regions; mainland China remains a supported market and evidence source. Language does not establish shipping destination.

| Buyer question | Existing page family | What the page must make clear |
| --- | --- | --- |
| Which bicycles should I compare? | `/`, `/models/` | Exact configuration, evidence, useful differences and research-stage status |
| Which brand or complete build fits my needs? | `/brands/`, `/complete-bikes/` | Supported configurations and source-linked brand/support context |
| What does this frame cost to build? | `/framesets/`, `/build/` | Recorded package price, labelled estimates, included parts and unresolved totals |
| How does this size compare with my reference? | `/geometry/` | Sourced stack/reach and dimensional similarity, never a fit recommendation |
| What must I confirm before ordering or importing? | `/blog/` | Existing published buying guides, source qualifications and country-specific limits |
| How can I trust or correct the evidence? | `/methodology/`, `/image-sources/` | Dates, provenance, image policy and public correction/removal route |

The map spans ten existing families. Choose a smaller fixed subset for each implementation batch. This pilot changes only the build-page search title and the credits-to-image-policy link, in all three languages. It releases no article and adds no route.

## Run a batch

1. Establish the exact owned checkout, live base and existing work; preserve other writers and dirty state. Record scope and acceptance criteria in a task-local checkpoint.
2. Inspect generated metadata and ordinary links. The build checks staged output before replacing the last good build; `npm run links:check` can also read existing output without building or making network requests. It checks local pages/assets, `srcset`, document fragments, absolute same-origin URLs and sitemap-page reachability. It ignores third-party destinations; it does not test live redirects, browser behavior or indexing.
3. Prioritize confirmed failures, stale unsupported claims and demonstrably unclear search presentation. Search Console data may prioritize a page with impressions and weak CTR or positions 8–20; without it, report those metrics as unavailable. Do not invent demand or publish a guide just to fill a keyword row.
4. Match titles, descriptions and visible content in each language. Preserve important model/build identifiers even when they make a title long. Recheck exact sources before changing facts or evidence dates. Research remains bounded by the repository's exact-model/gap limits.
5. Run focused tests while developing and one `npm run check` for the final coherent batch. Inspect changed UI on desktop/mobile, keyboard access and project-base routing where applicable. Deliver through a feature branch and PR; verify changed public HTML after deployment.

## Measure honestly

Record exact release time and an immutable validation/live baseline. Use already-authorized aggregate Search Console and analytics reports when available. State periods, time zones, locale/page groups, country/device filters, release age and data completeness. Missing rows are unavailable evidence, never zero traffic. Impressions, clicks, CTR and position are search signals; comparison opens and product-link activations are approximate activity, not purchases or unique people. Do not sum GA `site_open` and `page_view`.

Keep the existing pilot measurement and article schedules intact. This checklist creates no automation or new tracking. Revisit only when there is enough new evidence; an inconclusive result is valid. Local gates, deployed behavior, indexing and ranking outcomes remain separate proof levels.
