# IndexNow publication notifications

## Frozen scope — 2026-10-11

Publish the public host-verification key on `chinesebikes.xyz`, submit the current
canonical public sitemap once, and notify one IndexNow endpoint after deployment
when public pages are added, changed or removed. Preserve all product records,
content, privacy controls and existing release gates. No scheduled inventory
submissions, analytics, private/query URLs, accounts or paid services are added.

Production builds generate a root `{key}.txt` and `indexnow-manifest.json` from
the same indexable page map as the sitemap. The manifest contains only canonical
public HTTPS page URLs and SHA-256 document hashes; it has no build timestamp.
Preview and GitHub subpath builds do not publish host-verification artifacts.
The verification key is intentionally public and is not a credential.

The enabled GitHub Cloudflare publisher runs only from `main`. It restores its
previous delivery state and captures the live manifest before deployment. After
Wrangler succeeds, notification requires the live URL/hash inventory to match
the uploaded build and the live key file to match. A stale or unavailable live
manifest gets one further read after 30 seconds; persistent mismatch sends
nothing. JSON property order does not affect the comparison. Preview, failed
deployment and failed state restoration paths never run notification.

Delivery state contains only public canonical URL/hash inventories, pending
URLs and the last accepted receipt's time/status/count. The snapshot merges
changes since the preceding observed live manifest. Verified deployment changes
are saved before the key check or POST, and removed URLs remain pending. One
request submits the pending delta; HTTP 200 or 202 clears it and records the
acknowledgement. Before POST, state records an in-flight attempt with its exact
URLs, endpoint, payload fingerprint, manifest fingerprint and start time. Every
HTTP rejection, including 429 and 503, records a held attempt; a timeout or other
uncertain outcome is held as ambiguous. A process restart with an interrupted
in-flight attempt is held too. Later runs retain all pending URLs and send
nothing until the attempt is reviewed. There is no automatic POST retry or
unbounded replay. A resolved unchanged deployment sends nothing. There is no
recurring inventory submission or new publishing job.

The existing workflow saves `indexnow-delivery-state-v1` even after a failed
deployment, key check or notification. It restores only this repository's
production publisher artifacts, using the existing `GITHUB_TOKEN` with the
workflow's `actions: read` permission. There is no new credential or account.
State artifacts have 90-day retention; discovery inspects at most 20 completed
publisher runs. Missing state after a production operation, expired state,
invalid provenance or failed restore stops notification instead of silently
resetting it. Recover the state before the next notification. Upload failure
makes the workflow fail visibly; it does not undo the deployed website.

Each operation has request timeouts, bounded response sizes and a 10,000-URL
limit, including the combined pending queue. The manifest has at most two reads
per verification. Before releasing a hold, review the exact request, provider
status and any retained receipt. Permanent 400/403/422 errors require correcting
their cause; 429/503 are also held rather than automatically retried. An
ambiguous outcome may already have been received: do not clear it merely because
the dashboard is empty. Review and release is an explicit operator action, never
an incidental snapshot or deployment. Notification/state failures do not block
an independent website deployment. The protocol provides no exactly-once
receipt guarantee.

On first adoption of durable state, the existing live manifest becomes an
observed baseline without a submission. `acknowledged_manifest` and
`last_receipt` remain null until an actual accepted delta request. Adoption does
not claim the entire existing inventory was submitted. The first-ever manifest
deployment still requires the explicit bootstrap below.

Earlier failures that predate durable state cannot be reconstructed from a
current snapshot alone. Use a retained accepted manifest, the failed run's
pre-deployment snapshot or exact verified source builds to derive a bounded
one-time new/changed/removed URL recovery. Keep that recovery and its receipt
separate from initial baseline adoption; do not repeat the blanket sitemap
submission for dashboard visibility or mark an unsubmitted baseline accepted.

## Commands

After the first verified deployment, run exactly once:

```sh
node scripts/indexnow.mjs bootstrap
```

This verifies the live key, requires the live sitemap and manifest inventories
to match, and submits the sitemap URLs to `https://api.indexnow.org/indexnow`.
Do not repeat bootstrap on ordinary releases.

For an authorized local deployment, capture a fresh temporary baseline before
Wrangler, then notify after successful deployment using its final built output:

```sh
node scripts/indexnow.mjs snapshot --output UNIQUE-TEMP-FILE --state PERSISTENT-STATE-FILE
# Run the normal validated Cloudflare deployment.
node scripts/indexnow.mjs notify --before UNIQUE-TEMP-FILE --expected dist/indexnow-manifest.json --state PERSISTENT-STATE-FILE
```

The snapshot file must be new. Keep the state file durable and the snapshot
until notification is resolved; neither belongs in source control. State writes
are atomic. Never run local and GitHub publication for the same release
concurrently. Omitting `--state` retains the legacy local snapshot behavior and
does not provide recovery across runs.

HTTP 200 means receipt. HTTP 202 means receipt with key validation pending.
Neither proves indexing or traffic. The protocol shares submissions with
participating engines, so do not submit the same batch to multiple endpoints.
See the [official IndexNow documentation](https://www.indexnow.org/documentation).
