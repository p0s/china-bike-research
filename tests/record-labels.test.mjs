import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, validateDataset } from '../src/lib/data.mjs';
import { catalogSummaries, renderModel } from '../src/render.mjs';

const data = loadDataset();
const context = (dataset) => ({ data: dataset, products: joinProducts(dataset), posts: [], base: '', siteUrl: 'https://chinesebikes.xyz', repositoryUrl: 'https://github.com/p0s/china-bike-research' });
const summary = (dataset, id) => catalogSummaries(context(dataset)).find((item) => item.id === id);

test('a superseded status names the record’s own successor', () => {
  const variant = data.variants.find((item) => data.platforms.find((platform) => platform.id === item.platform_id)?.china_availability === 'discontinued-superseded');
  assert.ok(variant);
  assert.match(summary(data, variant.id).availability, /superseded by the 2025 Gravel V3/);
  const fixture = structuredClone(data);
  const platform = fixture.platforms.find((item) => item.id === variant.platform_id);
  platform.successor = { ...platform.successor, label: 'Example Mk2' };
  assert.match(summary(fixture, variant.id).availability, /superseded by the Example Mk2/);
  delete platform.successor;
  assert.match(summary(fixture, variant.id).availability, /superseded by the newer generation/);
});

test('missing internal-storage evidence stays unknown instead of reading as No', () => {
  const fixture = structuredClone(data);
  const platform = fixture.platforms.find((item) => item.internal_storage === false);
  delete platform.internal_storage;
  const ctx = context(fixture);
  const product = ctx.products.find((item) => item.platform.id === platform.id);
  assert.equal(summary(fixture, product.variant.id).internalFrameStorage, undefined);
  assert.match(renderModel(ctx, product), /<dt>Internal frame storage<\/dt><dd>Not recorded<\/dd>/);
  assert.equal(summary(data, product.variant.id).internalFrameStorage, 'No', 'a recorded no stays no');
  platform.internal_storage = 'no';
  assert.ok(validateDataset(fixture).some((error) => error.includes(`${platform.id}: internal_storage must be true or false`)));
});

test('the comparison Manufacturing row always means the brand relationship', () => {
  const summaries = catalogSummaries(context(data));
  const candidates = data.candidates.filter((candidate) => candidate.manufacturing);
  assert.ok(candidates.length > 0);
  for (const candidate of candidates) {
    const row = summaries.find((item) => item.id === `candidate-${candidate.id}`);
    if (!row) continue;
    assert.notEqual(row.manufacturing, candidate.manufacturing, candidate.id);
    if (row.manufacturing) assert.match(row.manufacturing, / · (?:high|medium|low|unknown) confidence$/i, candidate.id);
  }
  for (const row of summaries.filter((item) => item.stage === 'published')) assert.match(row.manufacturing, / confidence$/, row.id);
});
