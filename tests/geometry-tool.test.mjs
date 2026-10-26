import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts } from '../src/lib/data.mjs';
import { geometryLibrary, renderGeometryTool } from '../src/lib/geometry-tool.mjs';
import { dimension, defaultGeometryState, readGeometryState, writeGeometryState, selectedGeometry, nearbyGeometry, geometryDifference } from '../assets/geometry-core.js';
import { comparisonView, nearbyView } from '../assets/geometry-view.js';
import { geometryCopy } from '../assets/geometry-copy.js';

const data = loadDataset(), products = joinProducts(data);
const ctx = { data, products, locale: 'en', base: '/project', siteUrl: 'https://example.com', repositoryUrl: 'https://github.com/example/bikes' };
const library = geometryLibrary(ctx);
const payload = { ...library, locale: 'en', toolUrl: '/project/geometry/', catalogUrl: '/project/' };

test('library includes every eligible published structured table, once per platform, without mutating data', () => {
  const before = JSON.stringify(data);
  const result = geometryLibrary(ctx);
  const published = new Set(products.map(p => p.platform.id));
  const structured = data.platforms.filter(p => published.has(p.id) && p.frame?.geometry?.sizes?.length);
  assert.equal(result.models.length + result.excluded.length, structured.length);
  assert.equal(new Set(result.models.map(m => m.id)).size, result.models.length);
  for (const m of result.models) {
    const geometry = data.platforms.find(p => p.id === m.id).frame.geometry;
    assert.equal(m.sizes.length, geometry.sizes.filter(s => dimension(s.stack_mm) !== null && dimension(s.reach_mm) !== null).length);
    assert.ok(m.sources.length);
    for (const row of m.sizes) assert.deepEqual(row, geometry.sizes.find(s => String(s.size) === row.size));
    for (const v of m.variants) { assert.ok(products.some(p => p.variant.id === v.id)); assert.match(v.buildUrl, /\/project\/build\/\?base=/); }
  }
  for (const id of ['spcycle-g026', 'pardus-super-sport-gen2', 'lightcarbon-lcg071s-pro']) {
    assert.ok(result.excluded.some(m => m.id === id)); assert.ok(!result.models.some(m => m.id === id));
  }
  assert.ok(result.models.some(m => m.id === 'elves-falath-r7170'), 'multiple geometry source_ids are supported');
  assert.equal(JSON.stringify(data), before);
});

test('missing, blank, zero, non-finite and coercible inputs never become dimensions', () => {
  for (const n of ['', ' ', null, undefined, 0, -10, 'Infinity', '0x10', true, 1501]) assert.equal(dimension(n), null);
  assert.equal(dimension('560.5'), 560.5);
  const state = { ...defaultGeometryState(library.models), a: 'manual', stackA: '560', reachA: '' };
  assert.equal(selectedGeometry(library.models, state, 'a'), null);
  assert.equal(nearbyGeometry(library.models, null), null);
  assert.equal(geometryDifference({ stack_mm: 500 }, {}, 'stack_mm'), null);
});

test('unresolved review flags, missing source attribution and text dimensions never feed calculations', () => {
  for (const change of [
    p => { p.frame.geometry.evidence_review = { derived_fit_eligible: false }; },
    p => { p.geometry_evidence = { status: 'source-inconsistent' }; },
    p => { p.frame.geometry.source_id = 'missing-source'; },
    p => { p.frame.geometry.sizes.forEach(s => { s.stack_mm = String(s.stack_mm); }); }
  ]) {
    const altered = structuredClone(data);
    change(altered.platforms.find(p => p.id === 'ican-graro'));
    const result = geometryLibrary({ ...ctx, data: altered, products: joinProducts(altered) });
    assert.ok(!result.models.some(m => m.id === 'ican-graro'));
  }
});

test('shared state restores exact sizes, manual values and incomplete or unavailable inputs without substitution', () => {
  const state = { ...defaultGeometryState(library.models), a: 'manual', stackA: '', reachA: '385.5', b: 'quick-gr-one', sb: 'M/486', tolerance: '0', category: 'gravel-race' };
  const params = writeGeometryState(state, new URLSearchParams('ship=DE&currency=EUR'));
  assert.deepEqual(readGeometryState(library.models, params), state);
  assert.equal(params.get('ship'), 'DE');
  const unavailable = readGeometryState(library.models, new URLSearchParams('a=retired&sa=XXXL'));
  assert.equal(unavailable.a, 'retired'); assert.equal(unavailable.sa, 'XXXL');
  assert.equal(selectedGeometry(library.models, unavailable, 'a'), null);
  assert.match(comparisonView(payload, unavailable), /Unavailable links are not replaced/);
  const modelOnly = readGeometryState(library.models, new URLSearchParams('a=quick-gr-one'));
  assert.ok(selectedGeometry(library.models, modelOnly, 'a'));
});

test('similarity uses both axis limits, exact source values, category and deterministic distance order', () => {
  const models = [
    { id: 'a', category: 'road', sizes: [{ size: 'M', stack_mm: 550, reach_mm: 380 }] },
    { id: 'b', category: 'road', sizes: [{ size: 'S', stack_mm: 559, reach_mm: 389 }, { size: 'M', stack_mm: 550, reach_mm: 380 }, { size: 'L', stack_mm: 550, reach_mm: 390.1 }] },
    { id: 'c', category: 'gravel', sizes: [{ size: 'M', stack_mm: 551, reach_mm: 380 }] }
  ];
  const reference = { ...models[0].sizes[0], model: models[0] };
  const nearby = nearbyGeometry(models, reference, { tolerance: '10' });
  assert.deepEqual(nearby.map(x => `${x.model.id}/${x.row.size}`), ['b/M', 'c/M', 'b/S']);
  assert.equal(nearby.at(-1).distance, Math.hypot(9, 9), 'rectangular tolerance, not radial cutoff');
  assert.deepEqual(nearbyGeometry(models, reference, { tolerance: '0', category: 'road' }).map(x => x.row.size), ['M']);
  for (const tolerance of ['', '-1', '101', 'NaN']) assert.equal(nearbyGeometry(models, reference, { tolerance }), null);
  assert.equal(nearbyGeometry(models, reference, { category: 'unavailable' }).length, 0);
});

test('localized pages have sourced static content, reciprocal routes, accessible controls and base-safe assets', () => {
  for (const [locale, prefix] of [['en', ''], ['zh-Hans', '/zh'], ['de', '/de']]) {
    const html = renderGeometryTool({ ...ctx, locale });
    assert.ok(html.includes(`<h1>${geometryCopy(locale).title}</h1>`));
    assert.ok(html.includes(`rel="canonical" href="https://example.com/project${prefix}/geometry/"`));
    assert.match(html, /hreflang="zh-Hans" href="https:\/\/example.com\/project\/zh\/geometry\/"/);
    assert.match(html, /href="\/project\/assets\/geometry.css"/);
    assert.match(html, /src="\/project\/assets\/geometry.js"/);
    assert.match(html, /<fieldset class="geo-picker" data-side="a" disabled>/);
    assert.match(html, /<label for="geo-a">/);
    assert.match(html, /aria-labelledby="geo-plot-title geo-plot-desc"/);
    assert.match(html, /scope="row"/);
    assert.match(html, /id="size-library"/);
    assert.match(html, /ICAN Graro/);
    assert.match(html, /2026-09-22/);
    assert.match(html, /"@type":"WebApplication"/);
    const parsed = JSON.parse(html.match(/id="geometry-data">([^<]+)<\/script>/)[1]);
    assert.equal(parsed.models.length, library.models.length);
    assert.ok(parsed.models[0].url.startsWith(`/project${prefix}/models/`));
  }
});

test('user-controlled strings are escaped and unavailable categories do not broaden search', () => {
  const state = { ...defaultGeometryState(library.models), category: '<script>' };
  assert.match(nearbyView(payload, state), /No sizes within/);
  const malicious = { ...payload, models: [{ ...payload.models[0], name: '<script>alert(1)</script>' }] };
  const valid = { ...defaultGeometryState(malicious.models) };
  assert.ok(!comparisonView(malicious, valid).includes('<script>'));
});

test('size chips, close-up ladders and the glossary explain sourced sizes without inventing values', () => {
  const state = defaultGeometryState(payload.models);
  const html = renderGeometryTool(ctx);
  // Every recorded size of the selected model is a labelled radio with its literal stack/reach.
  const a = payload.models.find(m => m.id === state.a);
  for (const row of a.sizes) assert.ok(html.includes(`<input type="radio" name="sa" value="${row.size}"`), row.size);
  assert.match(html, /role="radiogroup" aria-labelledby="geo-size-label-a"/);
  assert.match(html, /class="geo-size-numbers"[^>]*>\d+(?:\.\d)?\/\d+(?:\.\d)?</);
  const view = comparisonView(payload, state);
  // Both models' size runs are drawn; the dots are pointer shortcuts to recorded sizes only.
  assert.match(view, /class="geo-ladder geo-ladder-a"/);
  assert.match(view, /class="geo-ladder geo-ladder-b"/);
  assert.equal((view.match(/data-pick-side="a"/g) ?? []).length, a.sizes.length);
  assert.match(view, /<details class="geo-glossary">/);
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const copy = geometryCopy(locale);
    for (const key of ['stack', 'reach', 'head_tube_mm', 'head_angle_deg', 'seat_angle_deg', 'top_tube_mm', 'wheelbase_mm', 'chainstay_mm', 'bb_drop_mm', 'standover_mm', 'front_center_mm', 'fork_offset_mm']) {
      assert.ok(copy[key] && copy.define[key], `${locale} ${key}`);
    }
  }
  // A secondary row appears only when either size records it, and stays a dash otherwise.
  const manual = comparisonView(payload, { ...state, a: 'manual', stackA: '560', reachA: '380' });
  assert.doesNotMatch(manual, /class="geo-ladder geo-ladder-a"/);
  assert.match(html, /data-geo-tolerance="5">±5</);
});
