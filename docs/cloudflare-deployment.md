# Cloudflare Workers deployment

China Bikes builds to `dist/` and deploys as a Cloudflare Worker with Static
Assets. The checked-in [`wrangler.jsonc`](../wrangler.jsonc) pins the Worker
name, the production site URL used for canonical tags,
and the asset-first route split. `assets/*`, generated data, `sitemap.xml`,
`robots.txt`, and other static files stay on the CDN asset path. The Worker
runs first for document route families and analytics preference, action,
engagement, and configuration routes, including both `/analytics/*` and
`/site-events/*` endpoints.

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

Enable **Always Use HTTPS** for the `chinesebikes.xyz` zone before serving
production traffic. It covers HTTP documents and asset-first paths. The Worker
also permanently redirects HTTP requests on the canonical host before handling
preferences, events, cookies or content. Preserve the path and query; never
collect an event for the redirect response.

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

## GA4 browser measurement

Keep Umami enabled. The GA4 browser tag sends one `page_view` through the
configured first-party gateway after the privacy-gated browser request to
`/analytics/ga-config` succeeds. An eligible HTML GET never creates a GA client
ID, sets a GA cookie, or sends a GA page event. The config response creates a
first-party client ID cookie only when no valid stored client ID exists; repeat
config requests reuse it. A session cookie is set only after the tag reports
its real session ID through the same-origin `/analytics/ga-session` handshake.
The Worker sends `compare_open` and `product_outbound_click` to GA only when
both stored IDs exist. Without a verified session, a permitted business action
can still reach Umami while no server action reaches GA. `page_engaged` is a
first-party Umami event after 10 seconds of visible time and a trusted click,
keydown, or scroll; it records foreground interaction, not a verified human.

The GA4 property currently uses 14-month event-level retention, documented
2026-10-22. Keep advertising signals disabled. Disable Enhanced Measurement
features that generate automatic page views, site-search queries, or outbound
clicks. Configure Cloudflare Google tag gateway for the exact zone, tag ID, and
unused `/sitedelivery` measurement path. Cloudflare accepts only letters,
numbers and forward slashes in this field; hyphens are rejected. This source
update does not change provider settings.
Leave Cloudflare's **Set up tag** option off. Its injected gateway-root
bootstrap is additionally blocked by the document CSP, because the toggle alone
still allowed the Google library to read consent before the site's defaults.
The module queues all-denied defaults before asynchronous config and inserts
only its nonce-bearing `/sitedelivery/` loader after eligibility passes. The
managed gateway does not serve `/sitedelivery/js`; that path returns 400. The
HTML nonce is fresh per permitted response and marks only the site theme and
GA module, leaving injected gateway commands and bootstrap blocked.
Verify the real library and collection response, not only the queued commands.

Follow `docs/analytics-consent-policy.md` for the trusted-country consent gate.
Visitors in the prior-choice regions see equally visible Allow/No thanks;
Google and Umami remain stopped until Allow. Unknown locations and Switzerland use
automatic limited analytics with a permanent Privacy opt-out. DNT, GPC and opt-out prevail everywhere. Test the first opt-out,
not merely a second one: stop the old tag before the POST, clear Google cookies
after success, reload, and confirm no identifier remains or collection follows.
The Privacy page exposes both choices without a banner elsewhere. Do not loosen
CSP or grant advertising consent to clear an unrelated console diagnostic.

The browser normalizes query-parameter ordering for the configured tag’s
exact same-origin `/sitedelivery/ga/g/c` collection URL after config passes
the privacy checks. Fetch and beacon bodies and options remain untouched.
Other requests pass through unchanged, and there is no delivery retry. Verify
a completed collection response as well as the library download: a queued
`page_view` or a working session handshake alone does not prove delivery.

Use UTC as the GA property's reporting timezone to match the portfolio's
completed UTC days. Exclude the day of a timezone or collection change from
comparisons. Keep advertising consent denied. Enable only Scrolls in Enhanced Measurement (one event when
90 percent of a page becomes visible). Disable automatic history page views,
outbound clicks, site search, forms, video and file downloads: page views and
product-link actions already have bounded explicit senders, and search/form
text must not enter the trial. Do not turn on advertising to clear the
zero-advertising-consent diagnostic.

Action context is resolved from the build's `data/analytics-context.json`.
Register event-scoped GA dimensions for `page_type`, `interface_language`,
`model_id`, `brand_id`, `link_type` and `destination_host`, plus a standard
numeric custom metric for `comparison_count`. GA page location is the canonical
public path. Umami receives the same bounded fields as event data after its
China Bikes validator is deployed. No query, fragment, search text, selected
model list, full outbound URL or arbitrary client property is accepted.

Set `GA4_MEASUREMENT_ID` to the web stream ID and `GA4_API_SECRET` to a new
Measurement Protocol API secret in Worker secrets. Set `GA4_ENABLED=true` only
after those, the gateway, and the privacy checks are verified. Never put the
API secret in source, build output, or browser responses. Measurement QA uses
only the exact query `?measurement_qa=1`: GA sends `measurement_qa` instead of
`page_view` with fixed `traffic_type: internal` and `debug_mode: true`; Umami
classifies the fixed QA boolean as `measurement_qa`. No arbitrary query or run
label is forwarded. QA obeys consent, DNT, GPC, opt-out, bot, and path gates.
The GA internal filter is currently in Testing, so QA is not claimed to be
excluded from default GA active-user totals until that filter is activated.

A 2xx from Measurement Protocol proves only HTTP receipt. Confirm processing
in GA4 Realtime or reports; inspect the browser page event and, for a server
business action, the verified stored client/session join. Missing cookies,
blocked network traffic, and Google's processing can still cause gaps. On
2026-09-29, this property's Events report defaulted to a range ending the
previous day; that dated report-range observation remains historical. Select a
range that includes the first live date before interpreting an empty report.

Use a narrowly filtered `wrangler tail` session for live delivery diagnosis.
The Worker emits `ga4_delivery` with a fixed event name, `outcome`, and HTTP
`status`. `http_received` confirms receipt only; `http_rejected`, `timeout`,
and `network_error` identify transport failures. Logs deliberately omit the
secret-bearing collector URL, payload, visitor IDs, paths, and raw errors.
Do not retry ambiguous deliveries automatically or fabricate engagement
signals.

The configured Cloudflare Workers runtime rejects `fetch` with
`redirect: 'error'` before sending a request. Use `redirect: 'manual'` and reject non-2xx responses for both GA4 and
product-action ingestion. This defect was reproduced in the local Workers
runtime on 2026-09-29: the original sender threw `TypeError`; the corrected
sender reached the collector and received HTTP 204. Node mocks alone did not
expose the unsupported option.

### Reporting comparison procedure

After the final production change, collect three complete UTC days and allow
another 48 hours for GA processing. Record the same inclusive date range and
canonical hostname in both systems. Start a new comparison window after any
collection change; do not mix earlier broken delivery or partial days into
the baseline.

1. Compare Umami's eligible server page observations with GA `page_view` on the
   same UTC dates. They use separate collection paths: a server observation in
   Umami and a browser event in GA. Differences can reflect consent, blockers,
   JavaScript, network delivery, or processing. Preserve raw counts; a ratio is
   observed browser coverage for that window, not an ad-block rate or a count of
   people. Exclude QA events when the reports expose the fixed QA classification.
2. Compare `page_engaged` separately from page observations. It records a
   foreground interaction after 10 visible seconds and a trusted click, keydown,
   or scroll. It is not proof of a verified human, and its absence does not prove
   inactivity.
3. Compare `compare_open` and `product_outbound_click` as separate action counts.
   GA receives a server business action only when the stored client and verified
   tag session exist; Umami can still receive the permitted action without that
   GA join. Do not compare GA Users/Sessions with backend request counts or add
   action and page-event totals together.

Historical evidence note: earlier code sent a server `site_open` for each
eligible HTML response and created the GA client cookie on that response. That
contract was retired in the 2026-10-22 source update. Keep any dated `site_open`
reports as historical evidence; do not use them as current reporting
instructions or combine them with browser `page_view` data.

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
POST https://chinesebikes.xyz/analytics/opt-in  -> 200 + Allow cookie + expired opt-out
GET  https://www.chinesebikes.xyz/models/<id> -> 301 https://chinesebikes.xyz/models/<id>
GET  https://china-bikes.p0s.eu/assets/logo.svg -> 301 https://chinesebikes.xyz/assets/logo.svg
```

Browser event requests contain no browser-visible secret or URL query. The
bodyless comparison and engagement requests carry only bounded headers; product
action JSON carries a fixed action ID and validated public IDs. Worker-to-
collector payloads use fixed event names and the existing visitor context, with
no new persistent visitor identifier.
