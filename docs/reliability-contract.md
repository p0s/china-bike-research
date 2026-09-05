# Interaction and build reliability contract

Implementation batch: 2026-09-05, based on `c99204e68172150504c130c85e18df58a7f03757`.

## Buyer-visible behavior

The catalog and model pages use the same ten-item comparison limit. Duplicate and invalid URL IDs are removed without changing valid selection order. An explicit comparison query takes precedence over local storage. A direct model visit uses the reviewed build allowance unless an explicit valid `build` parameter supplies another amount. Comparison-to-model links carry that amount. Unknown prices and category metrics follow known values in either sort direction; a recorded zero price remains a real number, while the catalog's legacy zero capability sentinel remains unknown. Filtering does not reinsert every row when the order has not changed.

An explicit build URL is a complete plan: omitted values use deterministic defaults, not a recipient's private draft. A bare planner visit may resume a stored draft. Browser Back and Forward restore the displayed plan as well as the address. A continuous numeric/text edit creates one undoable history entry; subsequent keystrokes update that entry. Blank, whitespace-only, boolean, object, malformed, negative and non-finite numeric values remain unknown. An explicit numeric zero is allowed.

Frameset planning separates the recorded **frame-only weight** from a buyer-entered **fork and remaining frame-package weight** (`packageWeight`). This remainder includes the seatpost and hardware not already included in the recorded frame weight, but excludes parts counted separately below. It is never fabricated or silently set to zero. A buyer can explicitly mark a slot `in-base` to confirm it is part of the frameset package. That slot adds no second purchase cost or separate weight; its weight belongs in the frame/package total. This is a buyer assertion, not new manufacturer evidence. No slot is automatically inferred to be included from an ambiguous seller description.

Complete-bike upgrades add the price of the replacement and apply a weight delta only with a known removed weight. Changing the base clears removed weights specific to the previous bike. A removed package weight must include all the components that package replaces. Removed weights exceeding the whole recorded bike weight produce an explicit inconsistency, never an apparently valid negative bike weight. Multi-slot component packages continue to count once.

Drivetrain-specific tire-clearance limits remain distinct. A known layout with an unrecorded limit remains unknown; another layout's limit must not be substituted as permission. For an unknown layout, the smallest recorded limit is only a conservative warning threshold. Recorded rotor-mount conflicts are checked alongside existing shell, freehub and clearance checks. No-conflict results are not universal compatibility certification. Source notes and weight bases remain visible.

Theme cycling continues in memory when browser storage fails. System preference changes do not override an explicitly selected theme. Cross-tab theme changes are synchronized. Failed hero images do not destroy the gallery controls; selecting another working view restores the hero. Failed thumbnails affect only their own button. Switching views removes stale `srcset`/`sizes`; rapid clicks cannot queue an older selection after a newer one. Arrow/Home/End navigation skips unavailable views. No placeholder product photography is introduced. Hidden form controls stay hidden even when a component sets `display: grid`. Clipboard fallback preserves keyboard focus and announces success or failure.

## Developer behavior

`dist` is published only after the existing validation, render, budget and internal-link checks pass. Work is staged in a sibling `.dist-stage-*` directory. Promotion uses a previous-output backup and rolls back if promotion fails. This is a checked directory swap, not a claim of transactional filesystem behavior under simultaneous publishers, abrupt machine failure or hostile filesystem mutation. Ordinary failure cleans the staging directory; abrupt termination may leave an untracked staging directory that can be removed after confirming no build is running. Do not run concurrent publishers into the same `dist`.

The local preview binds only to loopback. Decoded path traversal and symlinks outside the served root are rejected. Deployment bases use an exact path boundary. GET/HEAD, MIME types, missing/custom 404s, directory redirects, invalid URLs, conditional requests and stream failures are handled deliberately. It is still a local preview server, not a production hosting or authentication system.

CSV output quotes commas, quotes, CR and LF, and prefixes formula-like untrusted strings with an apostrophe. Unknown boolean facts export blank, not “no.” JSON remains the lossless machine-readable export. CSV importers vary; this mitigation is not a guarantee that editing and re-saving a CSV in every spreadsheet application is safe. See OWASP's CSV Injection guidance: https://owasp.org/www-community/attacks/CSV_Injection .

## Evidence and validation boundaries

This batch changes application behavior and developer safeguards. It does not reverify or add bike prices, tire-clearance claims, geometry, weights, recommendations or sources. Existing observation dates, provenance, uncertainty and third-party image credits remain unchanged.

Native tests cover pure rules, live loopback HTTP requests, build-output rollback and the actual build driver with synthetic data/renderers. Browser regression tests exercise the original deployed HTML plus modified JavaScript in Chromium with explicit local navigation/storage/image fixtures. These are not live-network, Safari/Firefox or assistive-technology certification. The complete upstream `npm run check` requires the original repository's source and research data and must be run after integration.
