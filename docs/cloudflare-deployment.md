# Cloudflare Workers deployment

China Bikes builds to `dist/` and deploys as a Cloudflare Worker with Static
Assets. The checked-in [`wrangler.jsonc`](../wrangler.jsonc) pins the Worker
name, the production site URL used for canonical tags,
and the asset-first route split. `assets/*`, generated data, `sitemap.xml`,
`robots.txt`, and other static files stay on the CDN asset path. The Worker
runs first only for document route families and the two privacy-choice routes.

The build used by Wrangler is `npm run build:cloudflare`; it clears the
GitHub-project base path and sets `https://chinesebikes.xyz` as the canonical
origin. Use `npm run check` before a deployment, or `npm run deploy:cloudflare`
with an authenticated Wrangler session. The repository workflow uses the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` GitHub secrets. The
account ID is supplied through the environment, not the public config.
Its deployment job stays explicitly skipped until the repository variable
`CLOUDFLARE_DEPLOY_ENABLED=true` is set after the dedicated token is installed.
Until then, deploy through the existing authenticated local Wrangler session
with `CLOUDFLARE_ACCOUNT_ID` set in the process environment for the intended
account. Keep its value in ignored local configuration; never include it in
terminal history, pull requests, logs, or deployment docs.
Before pushing, run `npm run privacy:outgoing -- origin/main` for a new feature
branch. The repository also provides `.githooks/pre-push`; enable it in each
checkout with `git config --worktree core.hooksPath .githooks` where worktree
config is supported. CI runs the same outgoing-commit check against the PR base.
GitHub's standard secret scanning is enabled, but this repository currently
cannot configure a custom push-protection pattern for account IDs, so the local
hook and CI check are the available enforcement layers. The separate
`Account ID guard` pull-request check runs scanner code from the protected
base branch and reads proposed commits as data, so changing a scanner within a
pull request cannot disable that check.
The workflow pins Wrangler 4.135.0. The token never enters browser assets.
The checked-in custom-domain route binds only `chinesebikes.xyz`. The legacy
`china-bikes.p0s.eu` hostname is not a Worker Custom Domain. It redirects at
Cloudflare before reaching its former GitHub Pages origin. Its Single Redirect
in the `p0s.eu` zone uses wildcard request URL
`http*://china-bikes.p0s.eu/*`, target
`https://chinesebikes.xyz/${2}`, status `301`, and **Preserve query string**
enabled. It covers document and asset paths.
In the `chinesebikes.xyz` zone, proxied `www` redirects
`http*://www.chinesebikes.xyz/*` to `https://chinesebikes.xyz/${2}` with the
same settings. The apex is the Worker Custom Domain.

The domain remains registered at Spaceship, with Cloudflare DNS and hosting.
Cloudflare DNSSEC is enabled and its DS record is installed at Spaceship;
validate the signed chain after any nameserver or registrar change. The four
short-term Spaceship domains `chinabikes.xyz`, `chinesecarbonbikes.xyz`,
`chinesecarbon.xyz`, and `chineseroadbikes.xyz` each forward apex and `www`
with a path- and query-preserving `301` to the canonical host. Keep these
redirects while their domains are registered, and do not publish duplicate
content on them. The primary domain remains auto-renewed; review the four
short-term registrations before their September 2027 expiry.

Google Search Console owns `chinesebikes.xyz` as a Domain property, has the
canonical sitemap submitted, and has a Change of Address move in progress from
the old URL-prefix property. Check sitemap fetch/indexing after Google processes
the submission; a successful submission is not indexing proof. Keep both
properties verified and keep the old host redirect active during the move.

Configure these Worker secrets in Cloudflare after the backend is ready:

- `ANALYTICS_INGEST_URL` — the HTTPS `stats.p0s.eu/ingest/v1` endpoint;
- `ANALYTICS_INGEST_TOKEN` — the site-scoped bearer token.

The private gateway binds the existing Worker token and website record to
`chinesebikes.xyz`, validates the frozen
ingestion payload, discards transient IP and user-agent data after derivation,
and retains only the documented page-request and country data. Live analytics
retention is 13 months; encrypted operational backup copies expire within 30
days after live removal. A missing or failing collector never changes the site
response. Umami's existing website was renamed to the canonical domain so its
history remains in the same record.

## Smoke checks

After deployment, verify the production host with a cacheable document and a
static asset, then confirm the trailing-slash redirect and the privacy forms:

```text
GET  https://chinesebikes.xyz/                 -> 200 text/html
GET  https://chinesebikes.xyz/assets/logo.svg -> 200 image/svg+xml
GET  https://chinesebikes.xyz/models/<id>      -> 308 .../<id>/
POST https://chinesebikes.xyz/analytics/opt-out -> 200 + host-only cookie
POST https://chinesebikes.xyz/analytics/opt-in  -> 200 + expired cookie
GET  https://www.chinesebikes.xyz/models/<id> -> 301 https://chinesebikes.xyz/models/<id>
GET  https://china-bikes.p0s.eu/assets/logo.svg -> 301 https://chinesebikes.xyz/assets/logo.svg
```

The request body sent to the gateway contains no browser-visible secret and no
query string, fragment, title, event, or invented visitor identifier.
