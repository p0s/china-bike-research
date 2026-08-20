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
  assert.match(styles, /@media \(max-width: 780px\)[\s\S]*?\.filter-primary \{ grid-template-columns: 1fr; \}[\s\S]*?\.catalog-table \{ grid-template-columns: 1fr; \}/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.product-image \{ width: 132px; \}/);
  assert.match(script, /\.catalog-row \.product-image-link'[\s\S]*?addEventListener\('mouseenter'[\s\S]*?closeTooltip\(\)/);
  assert.match(styles, /\.product-image:has\(\.product-image-link:hover\) \.image-info \{[\s\S]*?opacity: 0;[\s\S]*?pointer-events: none;/);
  assert.match(styles, /\.product-image\.hero-image > img:is\(\.is-fallback, \.is-placeholder\) \{ padding: 0; \}/);
  assert.doesNotMatch(styles, /\.selection-actions \.text-button \{ display: none; \}/);
});

test('failed product photos disclose the visible placeholder', () => {
  assert.match(script, /captionStatus\.textContent = 'Source image unavailable · Project placeholder shown'/);
});

test('catalog headings and compact control share directional sorting', () => {
  assert.match(script, /const defaultSortModes = \{ price: 'price-asc', name: 'name-asc', capability: 'capability-desc' \}/);
  assert.match(script, /function canonicalSortMode\(value\)/);
  assert.match(script, /function updateSortHeadings\(\)/);
  assert.match(script, /heading\?\.setAttribute\('aria-sort'/);
  assert.match(script, /sortHeadingButtons\.forEach\(\(button\) => button\.addEventListener\('click'/);
  assert.match(script, /Boolean\(aValue\) !== Boolean\(bValue\)/);
  assert.match(styles, /\[role="columnheader"\]\[aria-sort="ascending"\] \.catalog-sort-button/);
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
  assert.match(script, /\['Claimed weight', \(item\) => valueCell\(item\.weight, item\.weightSubline\)\]/);
  assert.doesNotMatch(script, /\['What to verify'/);
  assert.doesNotMatch(styles, /\.compare-value\.is-warning strong/);
});

test('brand filtering covers candidate-only brands and frameset overrides stay shareable', () => {
  assert.match(script, /const brandValues = new Set\(rows\.map\(\(row\) => row\.dataset\.brand\)/);
  assert.match(script, /brandButtons\.forEach\(\(button\) => button\.addEventListener\('click'/);
  assert.match(script, /function updateFramesetPrices\(value\)/);
  assert.match(script, /row\.dataset\.priceFilter = String\(high\)/);
  assert.match(script, /setParam\(next, 'build', String\(currentBuildAllowance\), String\(defaultBuildAllowance\)\)/);
  assert.match(script, /buildAllowance\?\.addEventListener\('input'/);
  assert.match(script, /buildAllowanceStorageKey = 'china-bike-guide-build-allowance-v1'/);
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
