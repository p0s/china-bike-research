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
});

test('shared disclosures and copy feedback have complete dismissal and failure states', () => {
  assert.match(script, /function closeMenu\(\{ restoreFocus = false \} = \{\}\)/);
  assert.match(script, /if \(event\.key !== 'Escape'\) return/);
  assert.match(script, /!target\?\.closest\('\.menu-button'\)/);
  assert.match(script, /addEventListener\('resize', \(\) => \{/);
  assert.match(script, /button\.textContent = copied \? 'Copied' : 'Copy failed'/);
  assert.match(script, /showCopyFeedback\(copyCatalogView, await copyText\(location\.href\)\)/);
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
