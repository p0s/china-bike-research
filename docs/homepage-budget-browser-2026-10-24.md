# Homepage budget and browser check — 2026-10-24

Adding the GIRDER range (21 official product pages) made the English homepage exceed the fixed 750,000-byte / 7,400-element budget. This note records the measurements behind the new fixed cap in `scripts/build.mjs` and SPEC §7.

## Measurements (static build, `dist/index.html`)

| Build | Rows | HTML bytes | Elements |
|---|---|---|---|
| 2026-10-03 baseline | 263 | 712,514 | 7,154 |
| Girder batch 1 (12 Girder rows) | 275 | 766,722 | not reached |
| Girder batch 2 (21 Girder rows) | 284 | 790,115 | 7,742 |

The Chinese and German homepages measure 794,377 and 798,456 bytes. The budget is enforced on the English root only, as before. In the browser, the live DOM has 7,766 elements in every language after scripts run.

## Redundancy review

Byte totals for repeated attributes show only two derivable duplicates per row. `data-name` repeats the start of `data-search` (about 10.6 KB). `data-price-filter` usually equals `data-price-sort` (about 6.4 KB). Removing them would mean changing the sort, filter and search scripts, and it would still recover less than half of the 40 KB overage. The rest of each row's ~2.6 KB is visible content, accessible labels, or popover and comparison data. No markup was removed.

## Cap

The cap is now 830,000 bytes and 8,050 elements. The project-path allowance is unchanged at +35,000 bytes. That leaves 39,885 bytes and 308 elements of headroom, about 15 more rows. The previous cap left 5.3% and 3.4% headroom; the new one leaves 5.0% and 4.0%. The cap is fixed and does not grow with the dataset, so the next large addition needs another measured review.

## Browser check

The site was served from a loopback preview of this exact build and opened in desktop Chrome with device-metrics emulation for each width.

- Nine cases (`/`, `/zh/`, `/de/` at 1,600, 390 and 320 px). Every case had 284 rows, with 278 visible by default and all 21 GIRDER rows visible. There was no document horizontal overflow and no price-cell overflow in any of the 278 visible price cells.
- Keyboard: Tab moves through the skip link, search, destination, navigation, language, theme, category, starting points, type, max-price, clearance, drivetrain and "More filters" controls in order. Typing `girder` in search leaves 21 rows. Space on two candidate compare checkboxes (JAUNT, titanium gravel), then Enter on "Compare 2", opens the inline comparison and moves focus to it. The comparison shows category, drivetrain, complete weight, frame and "No comparable price" for both no-price candidates.
- The candidate model page `/models/girder-bison-pf-ultegra-r8020/` shows its R8020 specification, the ¥14,800 official price, the flagged 105 intro conflict and a link to the official page. It has no overflow.
- Desktop comparison (1,600 px) and German 320 px screenshots were reviewed. They are kept task-local and are not in Git.

This is local-build evidence only. It does not assert a production deployment.
