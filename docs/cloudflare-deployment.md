# Cloudflare Workers deployment

China Bikes builds to `dist/` and deploys as a Cloudflare Worker with Static
Assets. The checked-in [`wrangler.jsonc`](../wrangler.jsonc) pins the Worker
name, the tightness account, the production site URL used for canonical tags,
and the asset-first route split. `assets/*`, generated data, `sitemap.xml`,
`robots.txt`, and other static files stay on the CDN asset path. The Worker
runs first only for document route families and the two privacy-choice routes.

The build used by Wrangler is `npm run build:cloudflare`; it clears the
GitHub-project base path and sets `https://china-bikes.p0s.eu` as the canonical
origin. Use `npm run check` before a deployment, or `npm run deploy:cloudflare`
with an authenticated Wrangler session. The repository workflow uses the
`CLOUDFLARE_API_TOKEN` GitHub secret and the account ID in `wrangler.jsonc`.
Its deployment job stays explicitly skipped until the repository variable
`CLOUDFLARE_DEPLOY_ENABLED=true` is set after the dedicated token is installed.
Until then, deploy through the existing authenticated local Wrangler session.
The workflow pins Wrangler 4.135.0. The token never enters browser assets.
The checked-in custom-domain route binds only `china-bikes.p0s.eu`.

Configure these Worker secrets in Cloudflare after the backend is ready:

- `ANALYTICS_INGEST_URL` — the HTTPS `stats.p0s.eu/ingest/v1` endpoint;
- `ANALYTICS_INGEST_TOKEN` — the site-scoped bearer token.

The gateway must bind the token to `china-bikes.p0s.eu`, validate the frozen
ingestion payload, discard transient IP and user-agent data after derivation,
and retain only the documented page-request and country data. Live analytics
retention is 13 months; encrypted operational backup copies expire within 30
days after live removal. A missing or failing collector never changes the site
response. DNS and the final production deployment remain an operator step after
the pull request is reconciled.

## Smoke checks

After deployment, verify the production host with a cacheable document and a
static asset, then confirm the trailing-slash redirect and the privacy forms:

```text
GET  https://china-bikes.p0s.eu/                 -> 200 text/html
GET  https://china-bikes.p0s.eu/assets/logo.svg -> 200 image/svg+xml
GET  https://china-bikes.p0s.eu/models/<id>      -> 308 .../<id>/
POST https://china-bikes.p0s.eu/analytics/opt-out -> 200 + host-only cookie
POST https://china-bikes.p0s.eu/analytics/opt-in  -> 200 + expired cookie
```

The request body sent to the gateway contains no browser-visible secret and no
query string, fragment, title, event, or invented visitor identifier.
