# Publish the twenty-post editorial series

## Authority and fixed scope
The user authorized writing and automatically publishing exactly twenty additional posts, starting three days after September 22, 2026, with randomized two-to-five-day gaps. The queue is `content/post-schedule.json`. The first release is September 25 at 20:20 Asia/Singapore. Each article has English and Simplified Chinese editions, a mascot cover and relevant credited remote bike photographs.

The twenty new articles are scheduled drafts in `content/posts/`. They are deliberately visible in this public source repository, but absent from the website until explicitly released. Existing articles remain published. Never publish multiple queued articles to catch up, rerandomize intervals, change the first date, or add articles to this authorization.

## Ownership and durable state
- Repository: p0s/china-bike-research; production: https://china-bikes.p0s.eu.
- Use this task's existing owned checkout, recorded in its local checkpoint and automation prompt. Do not edit the unrelated canonical checkout.
- One same-thread heartbeat: `publish-china-bikes-editorial-series`. Keep this task and checkout available until the series ends.
- Git records which articles were prepared for release. `.research/blog-publication-state.json` records actual successful live verification and deployment IDs. Preserve it across branch changes; do not add private machine state to the public repository.
- The next heartbeat prompt must preserve the latest confirmed slug, verification timestamp and deployment ID as a second recovery record. If local receipt state is missing, verify all prepared articles again; use the new verification time conservatively, rather than inventing an earlier publication time.
- Local automation needs the computer on, Codex running and authenticated CLI access. If a run is delayed, subsequent releases move later; the queue never compresses the selected intervals to catch up.

## Every wake
1. Read this runbook and the local `.research/blog-series-checkpoint.md`. Inspect Git status, branch ownership and current remote main before changing anything. Preserve any unfinished exact release and unrelated state.
2. Run `node scripts/blog-publication.mjs status`. This returns one of: wait, publish, verify or complete. Do not infer state just from a date.
3. If wait, rearm the same heartbeat for the returned next time and stop. If complete, set the heartbeat PAUSED, report all twenty complete and stop.
4. If verify, finish or recover that exact release before preparing another. A published_at value is a prepared release, not proof that production serves it. Recover the matching PR/merge/deployment using Git history and the checkpoint.

## Prepare one due article
1. Synchronize the owned checkout with remote main without overwriting dirty work. Create a feature branch for the exact due slug. Never push directly to main. Keep any prior failed release intact.
2. Inspect both language editions, relevant photo captions and inline sources. Reopen current purchasing routes and any import, shipping, warranty or stock claims material to this article. Verify owner anecdotes remain attributed to their original dates and models. Do not treat a page fetch failure as evidence of changed policy.
3. Fix factual changes in both editions, cite the current source and record the actual review date. Never automatically refresh every research date; the original source-check date remains valid historical provenance. Do not fabricate stock, prices, personal testing or an overseas owner experience.
4. Run `node scripts/blog-publication.mjs prepare EXACT-SLUG`. It refuses early, duplicate and out-of-order preparation, and enforces the gap after the previous live verification. This is the only queue mutation needed to expose the due article.
5. Run the repository's complete `npm run check` gate once for the changed release (prefer `codex-pnpm-check check`). Inspect the released article on desktop and mobile. Run the image report if image sources or assets changed. Fix failures before proceeding.
6. Run signing/GitHub preflight; report p0s account, repository and feature branch. Make a signed commit, push that exact branch, create a public pull request with validation and the due date, and attach it to this task. Wait for required checks, then merge through the PR. No direct-main push, force push or workflow/secret changes.

## Deploy and prove the one release
1. Fetch and fast-forward to the exact merged main commit in this owned checkout. Check it contains the intended queue change and no additional queued release. Inspect current deployment configuration; this site uses Cloudflare Worker Static Assets. Historical GitHub Pages wording does not authorize switching hosts.
2. Use the existing authenticated local Wrangler and existing project/account to deploy. The established command is `env WRANGLER_LOG_PATH=/private/tmp/china-bikes-blog-publish npx --no-install wrangler deploy`; its configured build command performs the production build. Do not install a new CLI, change accounts or create credentials automatically.
3. Record the returned Cloudflare deployment version. Run `node scripts/blog-publication.mjs confirm EXACT-SLUG CLOUDFLARE-VERSION-UUID`. It requires both live language pages to match local production HTML, and requires the live sitemap and blog index to contain the article. The command stores the receipt only after all checks pass.
4. Verify the next pending slug still returns 404 and is absent from the live sitemap/index. Confirm the due article's canonical, hreflang, cover and real-bike photo behavior. A deployed version alone is not proof of these public results.
5. Update the <=25-line checkpoint with the exact merge SHA, deployment version, slug, live verification and next due time. Keep one current baseline plus the latest delta.

## Rearm and recovery
Use the same automation ID and preserve its full name, destination and prompt. The status/confirm command returns a one-shot rule for the next Singapore wall-clock time. Use `automation_update` to update the existing heartbeat with that rule and ACTIVE status, then view it to verify persistence. The rule is an annual calendar selector with COUNT=1 to encode an exact upcoming date without a DTSTART timezone override; it is not an annually recurring publication. Never rearm a date already in the past.

The next prompt must instruct the agent to follow this runbook and preserve the latest successful receipt. After the twentieth verified release, use PAUSED instead of rearming. An expired COUNT=1 rule must not remain active.

For a temporary provider/build/deploy failure, preserve the candidate and checkpoint and rearm the same heartbeat for a bounded retry (for example, two hours later). Do not repeatedly run the same failure without a relevant change, duplicate watchers or publish another article around it. If credential unlock, a policy conflict, concurrent ownership or a new authority boundary requires the user, report the concrete blocker and pause rather than inventing credentials or changing deployment targets.

If the app was off or a wake was missed, status is authoritative. Publish at most one overdue article, verify it, then use the selected gap after actual verification. If a prepared article never went live and its publication date is now stale, correct that date through the same PR workflow before publishing; do not backdate a newly released article.

## Preview and verification tools
- `node scripts/blog-preview.mjs`: renders all drafts only into ignored `.research/blog-series-preview`, with noindex. It never writes dist and cannot be selected by the deploy configuration.
- `node --test tests/post-publication.test.mjs`: scheduling, exclusion, delay, duplicate and completion tests.
- `tests/bilingual-browser.py --site .research/blog-series-preview --case /blog/`: isolated desktop/mobile preview inspection in both languages.
- `docs/blog-publication-calendar.md`: fixed planned calendar. Actual delivery can shift it later.
