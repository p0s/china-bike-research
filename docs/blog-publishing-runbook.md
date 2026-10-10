# Publish the China Bikes editorial series

## Authority and scope

All 120 queued articles are authored in English, Simplified Chinese and German. The user authorized a shared randomized two-to-three-hour cadence on October 6, 2026 for every remaining article, including the original September guides. This replaces the original two-to-five-day gaps and the October eight-hour cadence for pending delivery. Preserve every existing publication and live-confirmation timestamp.

The current queue uses schema version 3 in `content/post-schedule.json`. Original series entries and calendars remain historical metadata; `delivery.entries` is the active ordered plan. Its first slot starts immediately after activation. Every later slot has a once-selected 120–180-minute gap after the previous article's actual successful live confirmation. Neither queue can publish around an unverified release. Downtime shifts delivery later; no bulk catch-up or rerandomization.

The current already-authored series has completed editorial review, mascot covers and credited real-bike photographs. Recheck each article before release and repair missing or inaccurate material then. An unfinished article must wait. Existing source files on GitHub do not make a draft public on the website.

## Ownership and durable state

- Repository: p0s/china-bike-research; production: https://chinesebikes.xyz.
- Use only the owned checkout recorded in the private checkpoint. Read its local `AGENTS.override.md`, `AGENTS.md`, `VISION.md`, `SPEC.md` and `docs/editorial-guidelines.md`. Preserve unrelated state and keep one writer.
- Reuse the same-thread heartbeat `publish-china-bikes-editorial-series`; no duplicate coordinator, worker or watcher.
- Git records prepared releases. Ignored `.research/blog-publication-state.json` records actual live receipts and deployment IDs. Never add private machine state or raw source evidence to Git.
- Keep one private checkpoint of at most 25 lines, with the current baseline plus latest delta. Store historical proof in immutable dated private packages referenced by path and SHA256.
- Local automation requires this computer on, Codex running and authenticated existing CLIs. Delays never compress a selected gap.

## Cadence activation and recovery

Run `node scripts/blog-cadence-activate.mjs` once in the owned feature branch. It requires the reviewed hundred already scheduled and refuses an unfinished exact release. It preserves all original queue entries, orders remaining articles by their original calendar while retaining each series' editorial order, and stores one random delivery plan in schema version 3. The private activation journal recovers the same intervals after an interrupted write. Rerunning an active migration is a no-op.

Validate and deliver the migration through a signed feature PR and required checks. It may accompany the first exact article release; only that article may become newly public. Do not prepare a second article before the first is confirmed live.

## Every wake

1. Inspect owned Git status and current privacy-safe remote main. Preserve any unfinished candidate. Never use old rewritten ancestry.
2. Run `node scripts/blog-publication.mjs status`. Follow its `wait`, `publish`, `verify` or `complete` result.
3. If `wait`, rearm this heartbeat for its returned future one-shot rule. If `complete`, set it PAUSED and report all 120 receipts verified.
4. If `verify`, finish or recover that exact PR, merge, deployment and live proof before any other article.
5. Before a heavyweight gate or production build, run the installed live no-cache storage guard. If blocked, preserve the candidate and rearm one bounded retry. Never bypass the guard or remove protected files.

## Review and prepare one due article

1. Start its feature branch from current remote main in the owned checkout, preserving any dirty candidate. Never push directly to main.
2. Read all three editions as a reader. Check the opening, useful contribution, natural voice, distinct search purpose, section anchors and related links to already-published guides. Reuse relevant completed authoring review.
3. Reopen linked primary sources for material seller, shipping, import, stock, warranty, technical and safety claims. Preserve dated owner anecdotes and original evidence dates. A failed fetch is not evidence that a policy changed.
   If a source is unavailable, review the claim rather than requiring every historical URL to load. Preserve the original observation date, label historical examples, and use a suitable exact source when available. Remove or qualify unsupported current statements. Block release only when a material claim still cannot be supported or safely left unknown. Do not repeat an identical failed fetch more than twice without a changed route or external state.
4. Check the mascot header and relevant real-bike photos, exact pictured configuration, rights/provenance, credits, localized alt text and fallback. Repair omissions before release; never invent image rights, specifications or experience.
5. Make factual corrections in all three editions. Record actual review/modified dates without automatically refreshing older source observations. Publication dates must describe the actual release.
6. Run `node scripts/blog-publication.mjs prepare EXACT-SLUG`. It rejects early, duplicate and out-of-order release and is the only per-article queue mutation needed.
7. Run the complete `npm run check` gate once per changed release, preferably `developer-storage-cache run -- codex-pnpm-check check`. Inspect all three language pages on desktop and mobile; run `npm run image:report` once when image metadata/assets change. Reuse passing checks while relevant inputs remain unchanged.
8. Run signing/GitHub preflight and report p0s, p0s/china-bike-research and the exact feature branch. Inspect every outgoing commit for private artifacts or future drafts. Sign, push only that branch, create and attach its PR, wait for required checks and merge through the PR.

## Deploy and prove the exact release

1. Fetch and fast-forward to its exact merged main commit. Confirm only the intended article became newly public. If concurrent main changed relevant validation inputs, validate that merged candidate.
2. Inspect the Cloudflare deployment for the exact merge and reuse a successful matching GitHub deployment. Record its version UUID. Never claim success from a different run or commit.
3. If that job is disabled or fails, use the existing local Wrangler route and verified saved profile only. Require the ignored owner-only `.research/cloudflare-account-id.env` and `.research/blog-cloudflare-profile.txt`; load the binding without printing it. Do not install a CLI, change accounts, create credentials or edit another checkout.
4. Build the exact production source with `npm run build:cloudflare` under the installed cache lease. Run `node scripts/blog-publication.mjs confirm EXACT-SLUG CLOUDFLARE-VERSION-UUID`. It uses DNT/GPC, matches all three live article HTML hashes, checks the sitemap and every language index, checks all pending articles stay absent, and requires the next pending slug in each series to return 404 in every language. It writes a receipt only after those checks pass.
5. Confirm canonical/hreflang, actual dates, byline, cover, photo captions and served image hashes/content types. Save immutable live proof and preserve all prior receipt timestamps.
6. Update the bounded checkpoint with the exact merge, Cloudflare version, receipt hash and next due time. Never overwrite historical verification times during incidental readback.

## Rearm and finish

Use `automation_update` on the existing heartbeat ID and preserve its name, destination and full current prompt. Use the status/confirm returned future one-shot rule and ACTIVE status. Retain BYSETPOS=1 and COUNT=1 for the installed app's Singapore local-wall-clock path. Never schedule a past annual selector. Read back the saved rule and actual next-run instant after updating.

After all 120 releases have their own verified receipts, set PAUSED. For temporary storage/provider/build/deploy failures, preserve the exact candidate and rearm a bounded future retry, normally two hours later. Keep unchanged waiting states quiet. Report a human-only login, credential, ownership or new-authority blocker once; do not invent credentials or publish around an unverified release.

## Verification tools

- `node --test tests/post-publication.test.mjs tests/blog-publication-confirm.test.mjs tests/blog-series-activate.test.mjs tests/blog-cadence-activate.test.mjs`: cadence, exclusion, recovery, live confirmation and completion.
- `node scripts/blog-preview.mjs`: ignored noindex draft preview; never dist or deployment input.
- `tests/bilingual-browser.py`: isolated desktop/mobile checks for the selected language routes.
- `docs/blog-publication-calendar.md`: original historical September calendar, superseded for remaining delivery by schema version 3.
