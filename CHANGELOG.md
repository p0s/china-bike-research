# Changelog

## 2.0.0 — 2026-08-07

- Replaced the multi-page landing experience with one unified homepage catalog and inline comparison.
- Mixed complete bikes and frameset-based builds in the same price ranking using one transparent ¥6,000 full-build allowance for every frameset.
- Removed standalone complete-bike, frameset, comparison, guide, watchlist, brand, and research-queue routes.
- Reduced catalog rows to decision-critical information and moved price dates, status, conditions, buy thresholds, clearance evidence, frame extras, and manufacturing context into accessible info popovers.
- Removed dashboard-style counts and introductory marketing blocks from the rider-facing experience.
- Added compact sticky filters, responsive comparison cards, accessible table roles, filter result announcements, and improved mobile layouts.
- Simplified model pages while retaining product rationale, caveats, Chinese seller questions, source records, and manufacturing context.
- Removed obsolete multi-profile build-cost data and guide content.

## 1.1.0 — 2026-08-07

- Added product visuals to explorer cards, recommendation cards, model pages, comparison, and social-preview metadata.
- Added structured image records with platform/variant references, exactness, hosting mode, source, credit, rights status, alt text, and review date.
- Added primary visual coverage for all 29 published frame platforms and all 30 listed variants.
- Added credited remote product-image references for all 29 platforms, with original local fallback artwork used automatically when a remote host fails.
- Added local broken-image fallback behavior, `no-referrer` image requests, responsive image layout, and image credits.
- Added a public product-image policy, a complete image-source inventory, and expanded privacy disclosure for remote image requests.
- Added image schema validation, generated image JSON export, image fields in catalog JSON/CSV, image contribution issue form, and image tests.
- Removed repository-owner-specific links and citation metadata so the archive contains no personal account information.

## 1.0.0 — 2026-08-06

- Initial public buyer guide and GitHub Pages site.
- Added complete-bike and frameset explorers, comparison, model pages, brand pages, guides, methodology, watchlist, and exclusions.
- Added 23 brands, 29 platforms, 30 configurations, 30 price records, source records, build profiles, and recommendations.
- Added public JSON/CSV exports, reference schemas, tests, privacy scan, cross-reference validation, internal-link checking, CI, deployment, issue forms, and pull-request template.
- Replaced the initial framework prototype with a zero-dependency Node static build so local and CI builds do not depend on a package registry.
- Initial repository intentionally contains no personal or private transaction data.
