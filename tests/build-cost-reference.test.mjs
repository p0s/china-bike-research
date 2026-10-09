import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset } from '../src/lib/data.mjs';
import { buildCostReference, buildCostReferenceCsv, renderBuildCostReference } from '../src/lib/build-cost-reference.mjs';
const data = loadDataset();

test('equal planning totals retain different purchase bases and original dates', () => {
  const rows = buildCostReference(data);
  const camp = rows.find((row) => row.id === 'camp-ace-gen3-105');
  const mira = rows.find((row) => row.id === 'spect-mira');
  assert.equal(camp.planning_cny, 12999);
  assert.equal(mira.planning_cny, camp.planning_cny);
  assert.equal(camp.kind, 'complete-bike');
  assert.equal(camp.allowance_cny, 0);
  assert.equal(mira.kind, 'frameset');
  assert.equal(mira.recorded_cny, 6999);
  assert.equal(mira.allowance_cny, 6000);
  assert.equal(mira.observed_at, '2026-08-08');
});
test('unknown frame and delivered costs stay null, including in CSV', () => {
  const rows = buildCostReference(data);
  const unknown = rows.find((row) => row.id === 'lightcarbon-lcr020-d');
  assert.equal(unknown.recorded_cny, null);
  assert.equal(unknown.planning_cny, null);
  assert.ok(rows.every((row) => row.overseas_delivered_cny === null));
  const csv = buildCostReferenceCsv(data);
  assert.match(csv, /lightcarbon-lcr020-d/);
  assert.match(csv, /,6000,2026-08-24,,,/);
});
test('the reference follows reviewed source data rather than stale duplicated totals', () => {
  const revised = structuredClone(data);
  revised.meta.frameset_build_assumption.amount_cny = 7000;
  const mira = buildCostReference(revised).find((row) => row.id === 'spect-mira');
  assert.equal(mira.planning_cny, 13999);
  assert.equal(buildCostReference(revised)[0].planning_cny, 12999);
});
test('all locales expose sources, unknowns and a base-safe downloadable reference', () => {
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const html = renderBuildCostReference({ data, locale, base: '/project' });
    assert.match(html, /role="region" tabindex="0"/);
    assert.match(html, /\/project\/data\/china-build-cost-reference.csv/);
    assert.match(html, /\/project\/models\/spect-mira\/#source-records/);
    assert.match(html, /2026-08-08/);
    assert.equal((html.match(/<tr>/g) ?? []).length, 5);
  }
});
