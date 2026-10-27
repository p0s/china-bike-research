import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, joinCatalogCandidates, categoryMemberships, validateCategoryMemberships } from '../src/lib/data.mjs';
import { renderHome, renderModel } from '../src/render.mjs';
import { nearbyGeometry } from '../assets/geometry-core.js';

const data = loadDataset(), products = joinProducts(data), candidates = joinCatalogCandidates(data);
const ctx = { data, products, catalogCandidates: candidates, posts: [], base: '', siteUrl: 'https://example.invalid', repositoryUrl: 'https://github.com/p0s/china-bike-research', now: new Date('2026-10-27') };
const rowAttributes = (html) => [...html.matchAll(/<div class="catalog-row[^"]*"[^>]*data-id="([^"]+)"[^>]*data-family="([^"]*)" data-category="([^"]*)"/g)]
  .map(([, id, family, category]) => ({ id, families: family.split('|'), categories: category.split('|') }));
const familyMatch = (row, family) => row.families.includes(family);
const categoryMatch = (row, category) => row.categories.includes(category);

test('SUPG2 is one row that both the Road and the Gravel & all-road parents include', () => {
  const html = renderHome({ ...ctx, locale: 'en' });
  const rows = rowAttributes(html);
  const supg2 = rows.filter((row) => row.id === 'pardus-super-sport-gen2-egr');
  assert.equal(supg2.length, 1, 'one canonical row');
  assert.deepEqual(supg2[0].categories, ['all-road', 'aero-wide-clearance', 'road-endurance']);
  for (const family of ['road', 'gravel']) assert.ok(familyMatch(supg2[0], family), family);
  for (const category of ['all-road', 'aero-wide-clearance', 'road-endurance']) assert.ok(categoryMatch(supg2[0], category), category);
  for (const family of ['triathlon', 'mtb', 'e-road', 'folding', 'track']) assert.equal(familyMatch(supg2[0], family), false, family);
  assert.equal(categoryMatch(supg2[0], 'road-aero'), false, 'unsupported subtypes stay out');
  assert.match(html, /data-id="pardus-super-sport-gen2-egr"[\s\S]*?<span class="product-fit">All-road · Aero, wide clearance · Endurance road<\/span>/);
});

test('family counts include each bike once and the Road parent avoids a Road / Road label', () => {
  const html = renderHome({ ...ctx, locale: 'en' });
  const visible = rowAttributes(html.replace(/<div class="catalog-row[^"]*"[^>]*\shidden>/g, ''));
  const count = (value) => Number(html.match(new RegExp(`data-category-value="${value}"[^>]*data-count="(\\d+)"`))?.[1]);
  const defaultRows = [...html.matchAll(/<div class="catalog-row[^"]*"[^>]*data-id="([^"]+)"[^>]*data-family="([^"]*)"[^>]*?(\shidden)?>/g)]
    .filter(([, , , hidden]) => !hidden).map(([, id, family]) => ({ id, families: family.split('|') }));
  assert.equal(count('family:road'), defaultRows.filter((row) => row.families.includes('road')).length);
  assert.equal(count('family:gravel'), defaultRows.filter((row) => row.families.includes('gravel')).length);
  assert.equal(count(''), defaultRows.length, 'All bikes counts every row once');
  assert.ok(visible.length > 0);
  const roadSub = html.match(/<ul class="category-sub" data-category-sub="road"[\s\S]*?<\/ul>/)[0];
  assert.match(roadSub, /data-category-value="category:road"[^>]*>General road<\/button>/);
  assert.doesNotMatch(roadSub, />Road<\/button>/);
  for (const [locale, label] of [['zh-Hans', '通用公路'], ['de', 'Allgemeines Rennrad'], ['es', 'Carretera general'], ['ru', 'Шоссе общего типа']]) {
    assert.match(renderHome({ ...ctx, locale }), new RegExp(`data-category-value="category:road"[^>]*>${label}</button>`), locale);
  }
});

test('the SUPG2 model page lists every category in every language', () => {
  const product = products.find((item) => item.variant.id === 'pardus-super-sport-gen2-egr');
  for (const [locale, labels] of [['en', ['All-road', 'Aero, wide clearance', 'Endurance road']], ['zh-Hans', ['气动宽胎', '耐力公路']], ['de', ['Endurance-Rennrad']]]) {
    const subline = renderModel({ ...ctx, locale }, product).match(/<p class="model-subline">([\s\S]*?)<\/p>/)[1];
    for (const label of labels) assert.ok(subline.includes(label), `${locale}: ${label} in ${subline}`);
  }
});

test('comparison payloads share a family for the Wide-tire aero starting point', () => {
  const html = renderHome({ ...ctx, locale: 'en' });
  const link = html.match(/data-curated-group="wide-tire-aero"/);
  assert.ok(link);
  const families = ['incolor-speedster-sr-frameset', 'candidate-lightcarbon-lcr018-d', 'candidate-tavelo-arden', 'pardus-super-sport-gen2-egr']
    .map((id) => rowAttributes(html).find((row) => row.id === id).families);
  assert.ok(families.every((list) => list.includes('road')), 'all four share the road family');
});

test('the geometry nearby-size filter matches any membership', () => {
  const sizes = [{ size: 'M', stack_mm: 560, reach_mm: 380 }];
  const models = [
    { id: 'multi', category: 'all-road', categories: ['all-road', 'aero-wide-clearance'], sizes },
    { id: 'single', category: 'road-aero', sizes }
  ];
  const reference = { stack_mm: 560, reach_mm: 380 };
  const ids = (category) => (nearbyGeometry(models, reference, { tolerance: '15', category }) ?? []).map((match) => match.model.id);
  assert.deepEqual(ids('aero-wide-clearance'), ['multi']);
  assert.deepEqual(ids('all-road'), ['multi']);
  assert.deepEqual(ids('road-aero'), ['single']);
});

test('extra memberships need evidence, a matching discipline and documented wide clearance', () => {
  assert.deepEqual(validateCategoryMemberships(data), []);
  assert.deepEqual(categoryMemberships(data.platforms.find((platform) => platform.id === 'pardus-super-sport-gen2')), ['all-road', 'aero-wide-clearance', 'road-endurance']);
  const withCandidate = (id, changes) => ({ ...data, candidates: data.candidates.map((candidate) => candidate.id === id ? { ...candidate, ...changes } : candidate) });
  const membership = (category, extra = {}) => ({ category, basis: 'Test basis', source_ids: ['xlab-ad8-official-cn-spec-2026-08-27'], reviewed_at: '2026-10-27', ...extra });
  const errors = (id, changes) => validateCategoryMemberships(withCandidate(id, changes)).join('\n');
  assert.match(errors('xlab-ad8', { additional_categories: [membership('aero-wide-clearance')] }), /at least 35 mm/, 'a 32 mm aero bike is not aero-wide');
  assert.match(errors('xlab-ad8', { additional_categories: [membership('triathlon')] }), /different discipline/);
  assert.match(errors('xlab-ad8', { additional_categories: [membership('road-aero')] }), /repeats a membership/);
  assert.match(errors('xlab-ad8', { additional_categories: [membership('road-climbing', { source_ids: ['missing-source'] })] }), /needs existing source_ids/);
  assert.match(errors('xlab-ad8', { additional_categories: [membership('mtb-xc')] }), /different discipline/);
});

test('the category ledger accounts for every catalog row and agrees with the data', () => {
  const ledger = JSON.parse(fs.readFileSync(new URL('../docs/research-batches/2026-10-27/category-membership-ledger.json', import.meta.url), 'utf8'));
  const current = new Map([...products.map((p) => [p.variant.id, p.categories]), ...candidates.map((e) => [e.id, e.categories])]);
  assert.equal(ledger.rows.length, current.size, 'one ledger row per catalog row');
  assert.equal(ledger.rows.length, ledger.frozen_source.total + ledger.added_after_freeze.length);
  assert.equal(new Set(ledger.rows.map((row) => row.id)).size, ledger.rows.length);
  const sourceIds = new Set(data.sources.map((source) => source.id));
  const supported = new Set();
  for (const row of ledger.rows) {
    assert.ok(current.has(row.id), `${row.id} is still in the catalog`);
    assert.deepEqual(row.memberships, current.get(row.id), `${row.id} memberships match the data`);
    assert.ok(['concordant', 'reconciled', 'not-covered'].includes(row.second_review.status), row.id);
    assert.equal(row.second_review.status === 'not-covered', ledger.added_after_freeze.includes(row.id), row.id);
    for (const decision of row.decisions) {
      assert.ok(['supported', 'rejected', 'unresolved'].includes(decision.status), row.id);
      assert.ok(decision.outcome === undefined || ['accepted', 'rejected', 'unknown', 'confirmed'].includes(decision.outcome), row.id);
      assert.ok(decision.basis.trim(), `${row.id} ${decision.category} has a rationale`);
      for (const id of decision.source_ids) assert.ok(sourceIds.has(id), `${row.id} cites existing source ${id}`);
      if (decision.status === 'supported') {
        assert.ok(current.get(row.id).includes(decision.category), `${row.id} carries supported ${decision.category}`);
        supported.add(`${row.record}:${decision.category}`);
      }
    }
  }
  for (const [type, records] of [['platform', data.platforms], ['candidate', data.candidates]]) {
    for (const record of records) for (const { category } of record.additional_categories ?? []) {
      assert.ok(supported.has(`${type}:${record.id}:${category}`), `${type} ${record.id} ${category} is a reviewed ledger decision`);
    }
  }
});

test('reconciled categories keep one clear label set per real build', () => {
  const rows = new Map([...products.map((p) => [p.variant.id, p.categories]), ...candidates.map((e) => [e.id, e.categories])]);
  const roadChild = (category) => category === 'aero-wide-clearance' || category.startsWith('road-');
  const gravelChild = (category) => ['gravel-race', 'gravel-flatbar', 'gravel-touring', 'gravel-adventure', 'adventure-gravel'].includes(category);
  for (const [id, categories] of rows) {
    assert.ok(!(categories.includes('road') && categories.some(roadChild)), `${id} is not also General road`);
    assert.ok(!(categories.includes('gravel') && categories.some(gravelChild)), `${id} is not also plain Gravel`);
  }
  assert.deepEqual(rows.get('candidate-cervelo-aspero-5-current'), ['gravel-race'], 'race gravel, not aero road');
  assert.deepEqual(rows.get('candidate-xlab-rs7'), ['road-endurance']);
  assert.ok(!rows.get('candidate-xds-ad7').includes('road-race'), 'export AD7 race claims stay off the grouped 2025/2026 AD7');
  assert.deepEqual(rows.get('candidate-java-aluminum-24s'), ['road'], 'the aluminum ER7 keeps its own row');
  assert.deepEqual(rows.get('candidate-velobuild-cx-002-2023'), [], 'cyclocross is not forced into gravel');
  assert.deepEqual(rows.get('candidate-specialized-roubaix-sl8-sport-105'), ['road-endurance', 'all-road']);
});
