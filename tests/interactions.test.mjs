import { buildCompatibilityMessages } from '../assets/builder-presentation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { numberOrNull, compareNumbers, COMPARISON_SELECTION_LIMIT, normalizeSelection } from '../assets/state-utils.js';

const script = fs.readFileSync(new URL('../assets/site.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../assets/site.css', import.meta.url), 'utf8');
const compatibilitySource = fs.readFileSync(new URL('../assets/builder-presentation.js', import.meta.url), 'utf8');

function sourceNavigation(initialHash = '') {
  const listeners = new Map(), frames = [], pendingHashes = [], entries = [];
  class Element {
    constructor(parentElement = null) { this.parentElement = parentElement; }
    scrollIntoView() {}
  }
  class Details extends Element {
    constructor() { super(); this.open = true; this.summary = { focus() {} }; }
    querySelector() { return this.summary; }
  }
  const panel = new Details(), anchor = new Element();
  const targets = new Map([['source-records', panel], ['content', new Element()], ['section-title', new Element()]]);
  const location = new URL(`https://example.invalid/models/test/?build=6000${initialHash}`);
  const state = { retained: 'model preferences' };
  anchor.href = 'https://example.invalid/models/test/?build=6000#source-records';
  anchor.closest = () => anchor;
  const history = { state, pushState(value, title, href) { entries.push({ value, href }); location.href = href; } };
  const start = script.indexOf('  const sourceRecords =');
  const end = script.indexOf("  document.addEventListener('click', (event) => {\n    if (!(event instanceof MouseEvent) || !event.isTrusted", start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(script.slice(start, end), {
    Element, HTMLDetailsElement: Details, URL, location, history,
    document: {
      querySelector: selector => selector === '#source-records' ? panel : null,
      getElementById: id => targets.get(id) ?? null,
      documentElement: { style: { setProperty() {} } },
      addEventListener: (name, fn) => listeners.set(name, fn)
    },
    addEventListener: (name, fn) => listeners.set(name, fn),
    requestAnimationFrame: fn => frames.push(fn)
  });
  const flush = () => {
    while (pendingHashes.length) pendingHashes.shift()();
    while (frames.length) frames.shift()();
  };
  return {
    panel, location, history, entries, flush,
    click(hash = '#source-records') {
      anchor.href = `https://example.invalid/models/test/?build=6000${hash}`;
      const event = { target: anchor, button: 0, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      listeners.get('click')(event);
      // A native fragment default schedules hashchange after the click handler.
      if (!event.defaultPrevented && location.href !== anchor.href) {
        location.href = anchor.href;
        pendingHashes.push(listeners.get('hashchange'));
      }
      return event.defaultPrevented;
    },
    traverse(hash) { location.hash = hash; pendingHashes.push(listeners.get('hashchange')); flush(); }
  };
}

test('source activation cannot reopen an explicitly closed disclosure through delayed hashchange', () => {
  const nav = sourceNavigation();
  assert.equal(nav.panel.open, false);
  nav.click();
  assert.equal(nav.panel.open, true);
  nav.panel.open = false;
  nav.flush();
  assert.equal(nav.panel.open, false);
  assert.equal(nav.entries.length, 1);
  assert.equal(nav.entries[0].value, nav.history.state);
  assert.equal(nav.location.search, '?build=6000');
  nav.click();
  assert.equal(nav.panel.open, true);
  assert.equal(nav.entries.length, 1, 'repeated activation does not add a duplicate history entry');
  nav.panel.open = false;
  nav.flush();
  assert.equal(nav.panel.open, false);
});

test('source deep links and history fragment traversal still open the target', () => {
  const nav = sourceNavigation('#source-records');
  assert.equal(nav.panel.open, true);
  nav.flush();
  nav.panel.open = false;
  nav.traverse('');
  assert.equal(nav.panel.open, false);
  nav.traverse('#source-records');
  assert.equal(nav.panel.open, true);
});

test('skip and ordinary section anchors retain their native default navigation', () => {
  for (const hash of ['#content', '#section-title']) {
    const nav = sourceNavigation();
    assert.equal(nav.click(hash), false, hash);
    assert.equal(nav.entries.length, 0, 'the browser owns the fragment history entry');
    nav.flush();
    assert.equal(nav.location.hash, hash);
    assert.equal(nav.panel.open, false);
  }
});

test('builder applies 1x/2x clearance and fails conservatively for unknown layouts', () => {
  const run = (layout, selections = {}) => buildCompatibilityMessages(
    { tireClearanceMm: 38, tireClearanceByDrivetrain: { single: 38, double: 32 }, drivetrainLayout: 'double' },
    new Map(),
    slot => slot === 'tires' ? { compatibility: { nominal_tire_width_mm: 35 } } : slot === 'drivetrain' && layout ? { compatibility: { drivetrain_layout: layout } } : null,
    selections
  );
  assert.equal(run('single').length, 0);
  assert.match(run('double').join(' '), /32 mm limit for 2×/);
  assert.match(run(null).join(' '), /Confirm drivetrain.*38\/32 mm.*unknown layout/ );
  assert.match(run(null, { drivetrain: 'included' }).join(' '), /32 mm limit for 2×/);
});

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

test('catalog and shortlist previews share uncropped paint while preserving link hit areas', () => {
  assert.match(styles, /\.catalog-product \{[^}]*grid-template-columns: 156px minmax\(0, 1fr\)/);
  assert.match(styles, /\.product-image \{[^}]*width: 156px/);
  assert.match(styles, /:is\(\.catalog-row, \.curated-group\) \.product-image-link\.is-previewing > img \{[\s\S]*?transform: translate\([^;]+scale\(var\(--image-preview-scale\)\)/);
  assert.match(styles, /\.product-image-link > img \{ pointer-events: none; \}/);
  assert.match(styles, /@media \(max-width: 1120px\)[\s\S]*?\.catalog-table \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 780px\)[\s\S]*?\.filter-primary \{ grid-template-columns: 1fr 1fr; \}[\s\S]*?\.catalog-table \{ grid-template-columns: 1fr; \}/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.product-image \{ width: 132px; \}/);
  assert.match(script, /\.catalog-row \.product-image-link, \.curated-group \.product-image-link/);
  assert.match(styles, /\.product-image:has\(\.product-image-link\.is-previewing\) \.image-info \{[\s\S]*?opacity: 0;[\s\S]*?pointer-events: none;/);
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
  assert.match(styles, /\.model-gallery-strip \{[^}]*grid-auto-flow: column;[^}]*overflow-x: auto/);
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
  const source = script.slice(script.indexOf('  function sortRows('), script.indexOf('  function openFilterPanel('));
  for (const key of ['price', 'tire', 'capability']) for (const direction of ['asc', 'desc']) {
    const field = key === 'price' ? 'priceSort' : key === 'tire' ? 'tireClearanceSort' : 'capabilitySort';
    const items = ['', '20', '10'].map((value) => ({ dataset: { [field]: value, name: value } }));
    const ordered = vm.runInNewContext(`(${source.trim()})(items)`, { items, compareNumbers, sortModeParts: () => ({ key, direction }) });
    assert.deepEqual(Array.from(ordered, (row) => row.dataset[field]), direction === 'asc' ? ['10', '20', ''] : ['20', '10', '']);
  }
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
  assert.match(script, /bindHistoryInput\(buildAllowance/);
  assert.match(script, /buildPreset\?\.addEventListener\('change'/);
  assert.match(script, /buildCustom\.hidden = !requiresInput/);
  assert.match(script, /buildAllowance\.focus\(\{ preventScroll: true \}\)/);
  assert.match(script, /buildAllowanceStorageKey = 'china-bike-guide-build-allowance-v1'/);
  assert.doesNotMatch(script, /readStoredBuildAllowance/);
  assert.match(script, /writeStoredBuildAllowance\(currentBuildAllowance\)/);
  assert.match(script, /document\.querySelector\('\[data-model-frame-price-low\]'\)/);
  assert.match(script, /target\.searchParams\.set\('from', from\)[\s\S]*?setParam\(target, 'build'/);
  assert.match(script, /if \(comparePanel && !comparePanel\.hidden && selection\.length >= 2\) renderComparison\(\)/);
  assert.doesNotMatch(script, /data-copy-catalog-view|copyCatalogView/);
});

test('bare catalog URLs use the reviewed default build without serializing stored overrides', () => {
  assert.match(script, /const requestedBuildAllowance = params\.get\('build'\) \?\? String\(defaultBuildAllowance\)/);
  assert.match(script, /params\.get\('buildPreset'\) \?\? defaultBuildPreset/);
  assert.doesNotMatch(script, /params\.get\('build'\) \?\? String\(readStoredBuildAllowance\(\) \?\? defaultBuildAllowance\)/);
});

test('shared disclosures and copy feedback have complete dismissal and failure states', () => {
  assert.match(script, /function closeMenu\(\{ restoreFocus = false \} = \{\}\)/);
  assert.match(script, /if \(event\.key !== 'Escape'\) return/);
  assert.match(script, /!target\?\.closest\('\.menu-button'\)/);
  assert.match(script, /addEventListener\('resize', \(\) => \{/);
  assert.match(script, /button\.textContent = copied \? 'Copied' : 'Copy failed'/);
  assert.match(script, /showCopyFeedback\(event\.currentTarget, await copyText\(location\.href\)\)/);
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
  assert.match(script, /target\.searchParams\.set\('base', state\.requestedBaseId \?\? state\.baseId\)/);
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
  assert.match(compatibilitySource, /accepted_frame_shells/);
  assert.match(compatibilitySource, /does not list \$\{base\.bottomBracket\} frame compatibility/);
  assert.match(compatibilitySource, /nominal_tire_width_mm/);
  assert.match(compatibilitySource, /tires exceed the frame's published/);
  assert.match(compatibilitySource, /the selected wheelset does not list it/);
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
  assert.equal(COMPARISON_SELECTION_LIMIT, 10);
  assert.equal(normalizeSelection(Array.from({ length: 12 }, (_, index) => `bike-${index}`)).length, 10);
  assert.match(script, /const comparisonSelectionLimit = COMPARISON_SELECTION_LIMIT/);
  assert.match(script, /selection\.length >= comparisonSelectionLimit/);
  assert.match(script, /scroll\.tabIndex = 0/);
  assert.match(script, /Bike comparison table; scroll horizontally to see every selected bike/);
  assert.match(styles, /\.compare-scroll \{[^}]*overflow-x: auto;[^}]*overscroll-behavior-inline: contain;[^}]*scrollbar-gutter: stable;/);
  assert.match(styles, /\.compare-label \{[^}]*position: sticky;[^}]*left: 0;/);
});
