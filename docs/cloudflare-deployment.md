# Cloudflare Workers deployment

China Bikes builds to `dist/` and deploys as a Cloudflare Worker with Static
Assets. The checked-in [`wrangler.jsonc`](../wrangler.jsonc) pins the Worker
name, the production site URL used for canonical tags,
and the asset-first route split. `assets/*`, generated data, `sitemap.xml`,
`robots.txt`, and other static files stay on the CDN asset path. The Worker
runs first for document route families and analytics preference, action, and
configuration routes.

The build used by Wrangler is `npm run build:cloudflare`; it clears the
GitHub-project base path and sets `https://chinesebikes.xyz` as the canonical
origin. That command generates `sitemap.xml` from the published routes and
runs the SEO audit before Wrangler uploads the assets. Use `npm run check`
before a deployment, or `npm run deploy:cloudflare`
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

## Parallel GA4 test

Keep Umami enabled. Create a dedicated GA4 web stream for
`https://chinesebikes.xyz`, with advertising signals disabled. Disable
Enhanced Measurement features that generate additional automatic page views,
site-search queries, or outbound clicks. Set event-level retention to the
shortest useful interval for this comparison. Configure Cloudflare Google tag
gateway for the exact zone, tag ID, and unused `/site-delivery` measurement path.
Leave Cloudflare's **Set up tag** option off: it inserts a tag automatically
and would bypass the site's DNT, GPC, and opt-out checks. This option alone
does not guarantee that an excluded page downloads no Google code: on
2026-09-29, Cloudflare still injected a `/gtag/` bootstrap into a DNT HTML
response with **Set up tag** off. In that unblocked-browser check, the
bootstrap queued no GA config or event and sent no collection hit. Verify
those outcomes for DNT, GPC, and opt-out, as well as a `204` response from
`/analytics/ga-config`; do not infer them from the toggle. The browser module
initializes only on a document bearing the renderer's `data-ga4-page` marker,
which error pages omit. It runs once per document and reuses Cloudflare's
existing `/site-delivery/` loader. Only if that loader is absent does it append
`/site-delivery/js?id=...`, after the config route returns valid IDs. The managed
gateway can still download its bootstrap on excluded pages; no GA config,
event, or collection request may follow.

For the gateway path migration, deploy the loader first: it recognizes both
`/site-delivery/` and the previous `/gtag/` injection, including their exact
`js?id=...` forms. Then update only the measurement path in Cloudflare,
leaving the tag ID and **Set up tag** setting unchanged. Verify the saved
configuration, one library download, a successful collection request, and
matching client/session IDs on a fresh page. Rollback changes the gateway
path back to `/gtag`; the compatible loader still reuses that injection.

Use UTC as the GA property's reporting timezone to match the portfolio's
completed UTC days. Exclude the day of a timezone or collection change from
comparisons. Keep the shortest retention (two months) and advertising
consent denied. Enable only Scrolls in Enhanced Measurement (one event when
90 percent of a page becomes visible). Disable automatic history page views,
outbound clicks, site search, forms, video and file downloads: page views and
product-link actions already have bounded explicit senders, and search/form
text must not enter the trial. Do not turn on advertising to clear the
zero-advertising-consent diagnostic.

Set `GA4_MEASUREMENT_ID` to the web stream ID and `GA4_API_SECRET` to a new
Measurement Protocol API secret in Worker secrets. Set `GA4_ENABLED=true` only
after those, the gateway, and the privacy checks are verified. Never put the
API secret in source, build output, or browser responses. `site_open` is one
server event per eligible HTML response. `page_view` is one browser event when
the tag loads. Compare the two names separately, and compare Umami page views
to `site_open`; never add `site_open` and `page_view` together. A 2xx from the
Measurement Protocol endpoint proves only HTTP receipt. The first server
`site_open` has the same client ID as the browser tag but no invented session
ID. When the tag reports its actual client and session IDs, the browser checks
the client ID and sends the session ID to the same-origin, bodyless
`/analytics/ga-session` route. Only later server events include that session
ID. Confirm processing in GA4 Realtime or reports; inspect the browser tag's
client/session IDs and a later server event before claiming joined sessions.
Missing cookies, blocked network traffic, and Google's processing can still
cause gaps. On 2026-09-29, this property's Events report defaulted to a range
ending the previous day; select a range that includes the first live date
before interpreting an empty report. First `site_open` events have no asserted
session and may be absent from Realtime even if later processed in reports.

Use a narrowly filtered `wrangler tail` session for live delivery diagnosis.
The Worker emits `ga4_delivery` with a fixed event name, `outcome`, and HTTP
`status`. `http_received` confirms receipt only; `http_rejected`, `timeout`,
and `network_error` identify transport failures. Logs deliberately omit the
secret-bearing collector URL, payload, visitor IDs, paths, and raw errors.
Do not retry ambiguous deliveries automatically or fabricate engagement time
to make server opens appear in Realtime.

The configured Cloudflare Workers runtime rejects `fetch` with
`redirect: 'error'` before sending a request. Use `redirect: 'manual'` and reject non-2xx responses for both GA4 and
product-action ingestion. This defect was reproduced in the local Workers
runtime on 2026-09-29: the original sender threw `TypeError`; the corrected
sender reached the collector and received HTTP 204. Node mocks alone did not
expose the unsupported option.

### Comparison procedure

After the final production change, collect three complete UTC days and allow
another 48 hours for GA processing. Record the same inclusive date range and
canonical hostname in both systems. Start a new comparison window after any
collection change; do not mix earlier broken delivery or partial days into
the baseline.

1. Compare Umami page views with the GA event count filtered to `site_open`.
   These share the successful, eligible HTML-request definition. A difference
   calls for checking transport outcomes and processing before interpretation.
2. Divide the GA event count filtered to `page_view` by `site_open` to estimate
   browser measurement coverage. Preserve the raw counts. Do not clamp a ratio
   above 100 percent: investigate scope, date windows, caching, repeated browser
   events and errors. The gap includes blockers, disabled JavaScript and delivery
   failures; it is not a measured adblock percentage or a count of people.
3. Assess whether browser engagement, `scroll`, `compare_open` and
   `product_outbound_click` help explain usage beyond Umami. Compare event counts,
   not GA Users/Sessions against backend request counts. Never sum `site_open`
   and `page_view`. First/server-only opens have no invented session or engagement.

Verify a normal page, a returning-visitor 404, a blocked Google loader, DNT,
GPC and opt-out after a loader change. Check one normal `page_view` and at most
one Google library load. Redirecting alias domains must return plain redirects
without page/event collection. Keep Umami enabled throughout.

## Smoke checks

After deployment, verify the production host with an eligible document and a
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
