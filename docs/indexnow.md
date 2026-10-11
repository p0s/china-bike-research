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

The enabled GitHub Cloudflare publisher captures the live manifest before
deployment. After Wrangler succeeds, notification requires the live manifest to
match the uploaded build and the live key file to match. It submits one request
containing only new/changed documents and previously public URLs removed from
the manifest. Unchanged deployments submit nothing. The first manifest deploy
also submits nothing automatically; the initial bootstrap is explicit.

Each operation has request timeouts, bounded response sizes and a 10,000-URL
limit. There are no automatic submission retries. A notification failure is
visible in the publisher log but does not undo or block the website deployment.
Inspect that failure and the exact deployment before any manual retry.

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
node scripts/indexnow.mjs snapshot --output UNIQUE-TEMP-FILE
# Run the normal validated Cloudflare deployment.
node scripts/indexnow.mjs notify --before UNIQUE-TEMP-FILE --expected dist/indexnow-manifest.json
```

The snapshot file must be new. Keep it until notification is resolved. Never
run local and GitHub publication for the same release concurrently.

HTTP 200 means receipt. HTTP 202 means receipt with key validation pending.
Neither proves indexing or traffic. The protocol shares submissions with
participating engines, so do not submit the same batch to multiple endpoints.
See the [official IndexNow documentation](https://www.indexnow.org/documentation).
