import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildComposition, buildSlotState, BUILD_GROUPS } from '../assets/builder-presentation.js';
import { buildSlotIds } from '../src/lib/data.mjs';

const script = fs.readFileSync(new URL('../assets/site.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../assets/site.css', import.meta.url), 'utf8');
const renderer = fs.readFileSync(new URL('../src/render.mjs', import.meta.url), 'utf8');

test('gallery is an optional second layout of the same catalog rows, addressable by URL', () => {
  // The toggle is rendered hidden and revealed only once the catalog script runs.
  assert.match(renderer, /class="view-toggle" role="group" aria-label="Catalog view" data-view-control hidden>[\s\S]*?data-view-value="table" aria-pressed="true"[\s\S]*?data-view-value="gallery" aria-pressed="false"/);
  // A bare URL stays the table; only an explicit view=gallery parameter changes it.
  assert.match(script, /activeView = value === 'gallery' \? 'gallery' : 'table';/);
  assert.match(script, /setParam\(next, 'view', activeView === 'gallery' \? 'gallery' : ''\);/);
  assert.match(script, /const requestedView = params\.get\('view'\) \?\? '';/);
  assert.match(script, /setView\(requestedView, \{ update: false \}\);/);
  // Gallery re-lays out existing rows rather than cloning them.
  assert.match(script, /productList\.dataset\.catalogView = activeView;/);
  assert.doesNotMatch(script, /cloneNode\(true\)[^\n]*catalog-row/);
  assert.match(styles, /\.catalog-table\[data-catalog-view="gallery"\] \{ display: grid;/);
  assert.match(styles, /\[data-catalog-view="gallery"\] > \.catalog-head \{ display: none; \}/);
  // The table's per-row mobile separators never leak into gallery cards.
  assert.doesNotMatch(styles, /content: '·'; margin: 0 6px/);
});

test('header tools stay inline and fold into one menu only when the measured row is crowded', () => {
  assert.match(script, /function headerCrowded\(\)/);
  assert.match(script, /toolsMenu\.classList\.toggle\('is-collapsed', collapse\);/);
  assert.match(script, /stickyHeader\?\.classList\.add\('is-compact-nav'\)/);
  assert.match(styles, /\.nav-tools\.is-collapsed \.nav-tools-menu \{ position: absolute;/);
  // Observers watch the row and settings text, never the search box the fit resizes.
  assert.match(script, /new ResizeObserver\(scheduleFit\)\.observe\(headerRow\);/);
  assert.doesNotMatch(script, /new ResizeObserver\(scheduleFit\)\.observe\(headerRow\.querySelector\('\.header-search'\)/);
});

test('slot states never treat unknown values as known', () => {
  assert.equal(buildSlotState({ price: 100, weight: 200 }), 'known');
  assert.equal(buildSlotState({ price: 0, weight: 0 }), 'known');
  assert.equal(buildSlotState({ price: 100, weight: null }), 'partial');
  assert.equal(buildSlotState({ price: null, weight: null }), 'open');
  assert.equal(buildSlotState({ price: Number.NaN, weight: null }), 'open');
  assert.equal(buildSlotState({ included: true, price: null, weight: null }), 'included');
});

test('composition groups every planner slot once and keeps unknowns visible', () => {
  const grouped = BUILD_GROUPS.flatMap((group) => group.slots);
  assert.deepEqual([...grouped].sort(), [...buildSlotIds].sort());
  assert.equal(new Set(grouped).size, grouped.length);
  const slots = buildSlotIds.map((slot) => ({ slot, state: 'open', price: null, weight: null }));
  Object.assign(slots.find((entry) => entry.slot === 'wheelset'), { state: 'known', price: 1200, weight: 1450 });
  Object.assign(slots.find((entry) => entry.slot === 'cassette'), { state: 'included' });
  const result = buildComposition({ isComplete: false, basePrice: 3000, basePriceHigh: 3200, baseWeight: 1000, baseWeightMissing: 1, slots });
  const byId = Object.fromEntries(result.price.segments.map((segment) => [segment.id, segment]));
  assert.equal(result.price.known, 4200);
  assert.equal(byId.base.high, 3200);
  assert.equal(byId.wheels.value, 1200);
  assert.equal(byId.wheels.unknown, 2);
  assert.equal(byId.drivetrain.unknown, 6, 'an included cassette is not an unknown');
  assert.equal(result.weight.segments.find((segment) => segment.id === 'base').unknown, 1, 'the frame-package remainder stays unknown');
  assert.equal(result.price.unknown, 13);
});

test('complete-bike plans draw no weight composition because upgrades are deltas', () => {
  const result = buildComposition({ isComplete: true, basePrice: 9000, baseWeight: 9000, slots: [] });
  assert.equal(result.weight, null);
  assert.equal(result.price.segments[0].label, 'Base bike');
});

test('build map hotspots cover every slot, jump to their rows and carry glyph plus label', () => {
  for (const slot of buildSlotIds) assert.match(renderer, new RegExp(`'?${slot}'?: \\[\\d+, \\d+\\]`));
  assert.match(renderer, /id="build-slot-\$\{escapeAttr\(slot\)\}" tabindex="-1"/);
  assert.match(script, /row\.scrollIntoView\(\{ block: 'center'/);
  assert.match(styles, /\[data-state="open"\] > \.build-hotspot-mark::before \{ content: '\?'; \}/);
  assert.match(styles, /\[data-state="included"\] > \.build-hotspot-mark::before \{ content: '✓'; \}/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\) \{\n  \.builder-part-row\.is-located \{ animation: none; \}/);
});
