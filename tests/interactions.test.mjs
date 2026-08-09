import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const script = fs.readFileSync(new URL('../assets/site.js', import.meta.url), 'utf8');

test('shared tooltips distinguish hover from pinned click state', () => {
  assert.match(script, /let tooltipPinned = false/);
  assert.match(script, /function toggleTooltip\(button\)/);
  assert.match(script, /button\.matches\(':focus-visible'\)/);
  assert.match(script, /button\.addEventListener\('click', \(\) => toggleTooltip\(button\)\)/);
  assert.doesNotMatch(script, /button\.addEventListener\('click', \(\) => openTooltip\(button\)\)/);
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
