# Action collection fixes — 2026-10-08

This batch fixes optional-module timing and immediate action suppression after
opt-out, and adds allowlisted homepage offer clicks. Counts remain best-effort
actions, not people, sessions or purchases. Catalog offers keep their actual page
attribution, exclude policy links, and retain the existing collector privacy gates.

## Coordinated receiver change

The existing Umami gateway currently accepts product context only on model paths.
Apply analytics-gateway-catalog-offers.patch to the matching gateway source and
run its existing tests plus test_catalog_offer_context before deploying catalog
offer coverage. The patch permits only the three catalog paths with a bounded
public model ID. It keeps exact model-path matching and all context, site,
destination-host and privacy validation. No visitor fields or collection routes
are added.

Gateway source before patch: SHA-256 b6c6c6e03e4e43a6c30c48adec5cc6b8198d62385922d2af05e240e9177e7b2c.
Gateway source after patch: SHA-256 f9d06629ad950885b0ed7c952c1329697e4a0e434b325de4cd1a4d3f4e2fed2d.

The receiver patch must be deployed before the site coverage change. Before
both are deployed, a catalog-offer event could reach GA4 while Umami rejects it.
Source tests and receipt do not establish processed GA4 reporting. Record the
actual release times and start the next complete UTC baseline after both changes.

## Dashboard limitation

The dedicated research browser fails the Umami event stats and series resources
with status 0 and no transferred bytes while the metrics table request succeeds.
Its console reports blocked-by-client errors. Browser tooling denies access to
the extension settings page, so no browser settings were changed. Correct the
proven dashboard-specific browser block before treating these report panels as
available. Keep public collection blocks and global privacy defaults intact.

## Validation

Focused Node tests exercise module delay/failure, queue bounds/expiry, original
public paths, current privacy checks, immediate keepalive dispatch, and allowlisted
offer context in both collectors. The optional browser fixture uses only a
disposable context of dedicated research Chrome and local mocked resources; it
sends no production analytics. Run the complete repository gate once for this
batch, then verify exact deployed source and processed aggregate reports after
separately authorized production delivery.

Completed local validation:
- Full npm run check: 576 tests passed; 927 pages built; privacy, data, research,
  coverage and SEO gates passed.
- Rendered browser fixture: 18 cases passed in English, Chinese and German,
  including 1440, 390 and 320 px comparison flows, delayed/blocked loading,
  opt-out and offer navigation. All network resources were mocked locally;
  production analytics requests: zero.
- Receiver tests: 13 passed, including existing gateway privacy cases and the
  new catalog-offer context cases.
- Receiver patch dry-apply and real apply on an exact-source disposable copy
  passed and reproduced the tested source byte-for-byte.
- A final focused privacy scan and git diff whitespace check passed.
