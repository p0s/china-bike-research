import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const script = fs.readFileSync(new URL('../assets/site.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../assets/site.css', import.meta.url), 'utf8');

test('shared tooltips distinguish hover from pinned click state', () => {
  assert.match(script, /let tooltipPinned = false/);
  assert.match(script, /let tooltipDismissTimer = null/);
  assert.match(script, /function toggleTooltip\(button\)/);
  assert.match(script, /button\.matches\(':focus-visible'\)/);
  assert.match(script, /tooltipPanel\?\.addEventListener\('mouseenter', cancelTooltipDismiss\)/);
  assert.match(script, /tooltipPanel\?\.addEventListener\('mouseleave', scheduleTooltipClose\)/);
  assert.match(script, /tooltipPanel\?\.addEventListener\('pointerdown', \(event\) => event\.preventDefault\(\)\)/);
  assert.match(script, /button\.addEventListener\('click', \(\) => toggleTooltip\(button\)\)/);
  assert.doesNotMatch(script, /button\.addEventListener\('click', \(\) => openTooltip\(button\)\)/);
  assert.match(styles, /\.tooltip-content \{[\s\S]*?pointer-events: auto;/);
  assert.match(styles, /\.tooltip-content\[data-placement="above"\]::after/);
});

test('catalog previews enlarge the full hit target from a useful default size', () => {
  assert.match(styles, /\.catalog-product \{[^}]*grid-template-columns: 156px minmax\(0, 1fr\)/);
  assert.match(styles, /\.product-image \{[^}]*width: 156px/);
  assert.match(styles, /\.catalog-row \.product-image-link:hover \{[\s\S]*?transform: scale\(var\(--catalog-preview-scale\)\)/);
  assert.doesNotMatch(styles, /\.product-image-link:hover > img/);
  assert.match(styles, /@media \(max-width: 1120px\)[\s\S]*?\.catalog-table \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 780px\)[\s\S]*?\.filter-primary \{ grid-template-columns: 1fr 1fr; \}[\s\S]*?\.catalog-table \{ grid-template-columns: 1fr; \}/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.product-image \{ width: 132px; \}/);
  assert.match(script, /\.catalog-row \.product-image-link'[\s\S]*?addEventListener\('mouseenter'[\s\S]*?closeTooltip\(\)/);
  assert.match(styles, /\.product-image:has\(\.product-image-link:hover\) \.image-info \{[\s\S]*?opacity: 0;[\s\S]*?pointer-events: none;/);
  assert.match(styles, /\.model-figure\.is-unavailable,[\s\S]*?\.gallery-thumb\[hidden\] \{ display: none; \}/);
  assert.match(styles, /\.model-grid\.has-no-image \{[^}]*grid-template-columns: minmax\(0, 760px\);[^}]*justify-content: center;/);
  assert.match(styles, /\.catalog-product\.has-no-image \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.doesNotMatch(styles, /\.selection-actions \.text-button \{ display: none; \}/);
});

test('failed product photos are hidden without substituting a placeholder', () => {
  assert.match(script, /captionStatus\.textContent = 'Source image unavailable'/);
  assert.match(script, /container\.remove\(\)/);
  assert.match(script, /image\.remove\(\)/);
  assert.doesNotMatch(script, /showing project placeholder|dataset\.completeBikeFallback|dataset\.framesetFallback/);
});

test('product galleries are explicit, keyboard-operable, and motion-safe', () => {
  assert.match(script, /document\.querySelectorAll\('\[data-image-gallery\]'\)/);
  assert.match(script, /const caption = gallery\.querySelector\('\[data-image-caption-status\]\[data-gallery-caption\]'\)/);
  assert.match(script, /const selectImage = \(button\) =>/);
  assert.match(script, /button\.addEventListener\('click', \(\) => selectImage\(button\)\)/);
  assert.match(script, /ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1/);
  assert.match(script, /event\.key === 'Home'/);
  assert.match(script, /event\.key === 'End'/);
  assert.doesNotMatch(script, /fallbackApplied|dataset\.fallback/);
  assert.match(styles, /\.model-gallery-strip \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.gallery-hero-image\.is-switching \{[^}]*opacity: \.18/);
  assert.match(styles, /\.gallery-thumb\[aria-pressed="true"\]/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test('catalog headings and compact control share directional sorting', () => {
  assert.match(script, /const defaultSortModes = \{ price: 'price-asc', name: 'name-asc', capability: 'capability-desc', tire: 'tire-desc' \}/);
  assert.match(script, /function canonicalSortMode\(value\)/);
  assert.match(script, /function updateSortHeadings\(\)/);
  assert.match(script, /heading\?\.setAttribute\('aria-sort'/);
  assert.match(script, /sortHeadingButtons\.forEach\(\(button\) => button\.addEventListener\('click'/);
  assert.match(script, /Boolean\(aValue\) !== Boolean\(bValue\)/);
  assert.match(script, /key === 'capability' \|\| key === 'tire'/);
  assert.match(script, /row\.dataset\.tireClearanceSort/);
  assert.match(styles, /\[role="columnheader"\]\[aria-sort="ascending"\] \.catalog-sort-button/);
  assert.match(styles, /\.catalog-head \{[\s\S]*?position: sticky;[\s\S]*?top: var\(--catalog-head-top, 144px\);[\s\S]*?z-index: 34;/);
  assert.match(script, /function syncCatalogHeadTop\(\)/);
  assert.match(script, /new ResizeObserver\(syncCatalogHeadTop\)\.observe\(catalogFilterBar\)/);
  assert.match(styles, /@media \(max-width: 1120px\)[\s\S]*?\.catalog-head \{ display: none; \}/);
});

test('typed catalog filters are numeric where appropriate, URL-addressable, and removable', () => {
  assert.match(script, /const tire = catalogRoot\.querySelector\('\[data-filter-tire\]'\)/);
  assert.match(script, /const minTire = numericValue\(tire\)/);
  assert.match(script, /!minTire \|\| tireValue >= minTire \|\| \(!tireValue && tireUnknown\?\.checked\)/);
  assert.match(script, /function syncTireUnknownAvailability\(\)/);
  assert.match(script, /tireUnknown\.disabled = !hasMinimum/);
  assert.match(script, /setParam\(next, 'tire', tire\?\.value\)/);
  assert.match(script, /setParam\(next, 'completeWeight', completeWeight\?\.value\)/);
  assert.match(script, /setParam\(next, 'frameWeight', frameWeight\?\.value\)/);
  assert.match(script, /setParam\(next, 'drivetrain', drivetrainFilter\?\.value\.trim\(\)\)/);
  assert.match(script, /function typedFilterChips\(\)/);
  assert.match(script, /button\.dataset\.clearFilter = key/);
  assert.match(script, /clearTypedFilter\(key\)/);
  assert.match(script, /filterHeadingButtons\.forEach\(\(button\) => button\.addEventListener\('click'/);
});

test('candidate discovery stays URL-addressable without repeated missing-data warnings', () => {
  assert.match(script, /let allModelsVisible = false/);
  assert.match(script, /function rowInScope\(row\)/);
  assert.match(script, /row\.dataset\.defaultVisible === 'true'/);
  assert.match(script, /setParam\(next, 'scope', allModelsVisible \? 'all' : ''\)/);
  assert.match(script, /showAllModels\?\.addEventListener\('click'/);
  assert.match(script, /const hasValue = \(key\) => items\.some/);
  assert.match(script, /if \(secondaryFields\.length\)/);
  assert.match(script, /remove\.setAttribute\('aria-label', `Remove \$\{label\}`\)/);
  assert.match(script, /\['Tire clearance', \(item\) => valueCell\(item\.tireClearance\)\]/);
  assert.match(script, /\['Weight', \(item\) => valueCell\(item\.weight\)\]/);
  assert.doesNotMatch(script, /\['What to verify'/);
  assert.doesNotMatch(styles, /\.compare-value\.is-warning strong/);
});

test('brand filtering covers candidate-only brands and frameset overrides stay shareable', () => {
  assert.match(script, /const brandValues = new Set\(rows\.map\(\(row\) => row\.dataset\.brand\)/);
  assert.match(script, /brandButtons\.forEach\(\(button\) => button\.addEventListener\('click'/);
  assert.match(script, /const buildPreset = document\.querySelector\('\[data-frameset-build-preset\]'\)/);
  assert.match(script, /function syncBuildPreset\(\)/);
  assert.match(script, /function updateFramesetPrices\(value, \{ highlight = false, presetId \} = \{\}\)/);
  assert.match(script, /row\.dataset\.priceFilter = String\(high\)/);
  assert.match(script, /setParam\(next, 'build', String\(currentBuildAllowance\), String\(defaultBuildAllowance\)\)/);
  assert.match(script, /buildAllowance\?\.addEventListener\('input'/);
  assert.match(script, /buildPreset\?\.addEventListener\('change'/);
  assert.match(script, /buildCustom\.hidden = !requiresInput/);
  assert.match(script, /buildAllowance\.focus\(\{ preventScroll: true \}\)/);
  assert.match(script, /buildAllowanceStorageKey = 'china-bike-guide-build-allowance-v1'/);
  assert.match(script, /const stored = localStorage\.getItem\(buildAllowanceStorageKey\);/);
  assert.match(script, /if \(stored === null\) return null;/);
  assert.match(script, /writeStoredBuildAllowance\(currentBuildAllowance\)/);
  assert.match(script, /document\.querySelector\('\[data-model-frame-price-low\]'\)/);
  assert.match(script, /target\.searchParams\.set\('from', from\)[\s\S]*?setParam\(target, 'build'/);
  assert.match(script, /if \(comparePanel && !comparePanel\.hidden && selection\.length >= 2\) renderComparison\(\)/);
  assert.doesNotMatch(script, /data-copy-catalog-view|copyCatalogView/);
});

test('shared disclosures and copy feedback have complete dismissal and failure states', () => {
  assert.match(script, /function closeMenu\(\{ restoreFocus = false \} = \{\}\)/);
  assert.match(script, /if \(event\.key !== 'Escape'\) return/);
  assert.match(script, /!target\?\.closest\('\.menu-button'\)/);
  assert.match(script, /addEventListener\('resize', \(\) => \{/);
  assert.match(script, /button\.textContent = copied \? 'Copied' : 'Copy failed'/);
  assert.match(script, /showCopyFeedback\(event\.currentTarget, await copyText\(location\.href\)\)/);
});

test('video embeds are created only after an explicit click and never autoplay', () => {
  assert.match(script, /document\.querySelectorAll\('\[data-video-shell\]'\)/);
  assert.match(script, /button\.addEventListener\('click', \(\) => \{/);
  assert.match(script, /youtube-nocookie\.com\/embed\/\$\{videoId\}\?rel=0/);
  assert.match(script, /shell\.dataset\.videoTitle \|\| 'Model video'/);
  assert.match(script, /frame\.referrerPolicy = 'strict-origin-when-cross-origin'/);
  assert.match(script, /shell\.replaceChildren\(frame\)/);
  assert.doesNotMatch(script, /autoplay=1/);
});

test('bike builder persists shareable state and avoids package double counting', () => {
  assert.match(script, /data\?\.schemaVersion !== 2/);
  assert.match(script, /const storageKey = 'china-bike-builder-v2'/);
  assert.match(script, /const bases = new Map\(data\.bases\.map/);
  assert.match(script, /function ensureBaseOption\(base\)/);
  assert.match(script, /group\.label = 'Selected research-stage item'/);
  assert.match(script, /base\?\.kind === 'complete-bike' \? 'included' : sourcedDefaults\[slot\]/);
  assert.match(script, /function coveredSlots\(\)/);
  assert.match(script, /for \(const coveredSlot of part\.covers \|\| \[\]\)/);
  assert.match(script, /if \(!covered\.has\(coveredSlot\)\) covered\.set\(coveredSlot, part\)/);
  assert.match(script, /if \(coveringPart\) \{[\s\S]*?continue;/);
  assert.match(script, /target\.searchParams\.set\('base', state\.baseId\)/);
  assert.match(script, /target\.searchParams\.delete\('frame'\)/);
  assert.match(script, /target\.searchParams\.set\(`part-\$\{slot\}`, selection\)/);
  assert.match(script, /localStorage\.setItem\(storageKey, JSON\.stringify\(state\)\)/);
  assert.match(script, /const partPrice = recordedPrice \?\? buyerPrice/);
  assert.match(script, /const partWeight = recordedWeight \?\? buyerWeight/);
  assert.match(script, /recordedPrice === null && buyerPrice !== null \? 'Buyer-entered price'/);
  assert.match(script, /customPriceField\.hidden = !needsPriceInput/);
  assert.match(script, /customWeightField\.hidden = !needsWeightInput/);
  assert.match(script, /removedWeightField\.hidden = !needsRemovedWeight/);
  assert.match(script, /const delta = partWeight - removedPartWeight/);
  assert.match(script, /missingWeights\.push\(`\$\{slot\} replacement delta`\)/);
  assert.match(script, /accepted_frame_shells/);
  assert.match(script, /does not list \$\{base\.bottomBracket\} frame compatibility/);
  assert.match(script, /nominal_tire_width_mm/);
  assert.match(script, /tires exceed the frame's published/);
  assert.match(script, /the selected wheelset does not list it/);
  assert.match(styles, /\.builder-summary \{[\s\S]*?position: sticky;/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.builder-summary \{[\s\S]*?position: sticky;/);
});

test('one catalog selection opens Build while multiple selections open Compare', () => {
  assert.match(script, /const openBuildLink = document\.querySelector\('\[data-open-build\]'\)/);
  assert.match(script, /const item = selection\.length === 1 \? byId\.get\(selection\[0\]\) : null/);
  assert.match(script, /openBuildLink\.hidden = !item\?\.builderEligible/);
  assert.match(script, /target\.searchParams\.set\('base', item\.buildBaseId \|\| item\.id\)/);
  assert.match(script, /item\.buildBaseKind === 'frameset' \? 'Build this frame' : 'Modify this bike'/);
  assert.match(script, /openCompareButton\.hidden = selection\.length < 2/);
});

test('comparison selection accepts ten bikes and keeps the wide viewer usable', () => {
  assert.match(script, /const comparisonSelectionLimit = 10/);
  assert.equal((script.match(/slice\(0, comparisonSelectionLimit\)/g) ?? []).length, 4);
  assert.match(script, /selection\.length >= comparisonSelectionLimit/);
  assert.match(script, /scroll\.tabIndex = 0/);
  assert.match(script, /Bike comparison table; scroll horizontally to see every selected bike/);
  assert.match(styles, /\.compare-scroll \{[^}]*overflow-x: auto;[^}]*overscroll-behavior-inline: contain;[^}]*scrollbar-gutter: stable;/);
  assert.match(styles, /\.compare-label \{[^}]*position: sticky;[^}]*left: 0;/);
});
