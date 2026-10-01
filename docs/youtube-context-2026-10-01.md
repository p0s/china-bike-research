# YouTube context additions — 2026-10-01

## Scope and method

Add useful exact-model video context to existing pages, without accepting video claims as specifications, current prices, BOMs, recommendations or publication evidence. Discovery started with China Cycling and covered ten exact model targets: Winspace SLC3, Tavelo Arden Race, Evolve CIMA GR, Incolor Voyager, SEKA Spear RDC, Incolor Speedster SR/SR+, ICAN Graro, Winspace G5, Elves Mori AeroX and Carbonda CFR696. Exact-model searches on other channels supplied the selected videos where the initial channel lacked a suitable result. Eight videos for seven targets were accepted, below the ten-model/25-gap limit.

Each accepted canonical watch page was opened sequentially in dedicated research Chrome. Page and loaded-player video IDs matched; the public player reported `OK` and `playableInEmbed: true`. Titles, channel IDs, publication dates, model names and disclosure wording were checked against public player metadata and descriptions. This was metadata/context curation, not a full playback, transcript or technical-claim audit. Raw local captures remain ignored; no media, thumbnails, captions, comments, contact details or affiliate URLs are committed.

## Accepted context

| Target | Video and creator | Mapping and disclosure basis |
| --- | --- | --- |
| ICAN Graro | [Workshop build — The Cycle Workshop](https://www.youtube.com/watch?v=pCCgt1hMgS0) | Exact Graro title and component list; affiliate commissions and ICAN code disclosed. Custom GeX build, not the catalog estimate. |
| ICAN Graro | [Ride review — The Cycle Workshop](https://www.youtube.com/watch?v=qMe2tPvgBoA) | Exact Graro title and description; companion ride review of that custom build. Same affiliate disclosure. |
| Winspace G5 | [G5 overview — GC Performance](https://www.youtube.com/watch?v=EI7UDtH-XKM) | Exact G5 title and linked G5 Ultra AXS listing; retailer code disclosed. Not the catalog's frameset-based build. |
| Elves Mori AeroX | [Mori AeroX presentation — ELVES BIKE](https://www.youtube.com/watch?v=GvA2bht4H2c) | Exact AeroX title and model description; [ELVES's website](https://elvesbike.com/) links to the same channel ID. Explicitly labelled promotional brand material. |
| Carbonda CFR696 | [696 build — Andrew Grabbs](https://www.youtube.com/watch?v=t_JLDO3jygI) | Exact Carbonda 696/Flybike FM696 title; creator calls it his frame and corrects its size to 56. Amazon support link disclosed; 2021 build remains historical context. |
| Incolor Speedster SR/SR+ | [SR+ build — Crafted Cycles](https://www.youtube.com/watch?v=H7SQgMrzg8Y) | Exact SR+ title; workshop promotes custom-build services. SR+ context is explicitly distinguished from SR complete builds and SSR. |
| Winspace SLC3 candidate | [SLC3 review — David Arthur](https://www.youtube.com/watch?v=JIPhnHZ5XF0) | Exact SLC3 title and description. Squarespace episode sponsor disclosed; Winspace supply/payment terms remain unknown. Links at 2:29, 5:21 and 12:45 follow creator-published chapters. |
| SEKA Spear RDC candidate | [Spear RDC review — Cyclingnews Tech](https://www.youtube.com/watch?v=VvpJOvFlmqM) | Exact RDC title and description. Supplied-bike and sponsorship terms are not established by the description. Wind-tunnel comparisons remain review context, without accepting rankings or numbers. |

Access dates are 2026-10-01. Publication dates retain the calendar dates exposed by YouTube's public `publishDate` metadata. Other product, source, price and review dates are unchanged.

## Exclusions and limits

The initial SLC result was the older SLC, not SLC3. Evolve road-CIMA videos do not establish CIMA GR. Voyager and Arden results were broad trade-show coverage or different Tavelo models. The anonymously purchased Elves video was Falath Evo, not Mori AeroX. Those videos were excluded. A generic Mori review and retailer discussion were also omitted in favor of the explicitly named AeroX presentation. The MAE Bikr SLC3 long-term video was not needed alongside the selected chaptered review.

Known commercial ties remain visible; missing supply/payment information is stated as unknown rather than treated as independence. Candidate status and all publication gates remain unchanged. New summaries, disclosures and chapter labels have reviewed Chinese and German copy; original video titles, identities and canonical URLs stay intact.

The existing lazy `youtube-nocookie.com` player, no-autoplay behavior and ordinary watch-page fallback are reused. A new `brand-published` relationship labels the promotional ELVES video accurately. Disclosure text is a separate inline text node so it can be translated while channel names and dates remain unchanged.

## Validation

- `npm run validate` passed with 43 curated videos (24 YouTube, 19 XHS).
- `node --test tests/german.test.mjs` passed, including the regression check for translated disclosure text alongside unchanged creator names, dates and watch URLs.
- `npm run coverage:accept` added the eight records and two candidate links without removing protected evidence.
- `npm run check` passed: privacy, data validation, research ledger, coverage, 398 tests, 882 built pages and the SEO audit (684 indexable, 198 noindex). The outgoing privacy step is only applicable with a commit base; the default full gate reported it as skipped.
- Rendered desktop checks covered all eight affected pages at 1440×1000, sampling English, Chinese and German. Mobile checks covered all eight German pages at 390×844. No horizontal overflow; iframe sizing, lazy privacy-enhanced URLs, no-autoplay settings, watch links, brand label and creator chapter links passed. The Graro desktop and SLC3 mobile video sections were visually inspected. These checks do not claim full playback or technical-claim verification.
- After the gate, only this evidence note and the verified ELVES disclosure URL changed; focused data validation was rerun for that URL.
