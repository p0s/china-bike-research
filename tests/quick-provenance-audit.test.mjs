import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadDataset, joinProducts, validateDataset } from '../src/lib/data.mjs';
import { catalogSummaries, renderModel, renderBikeBuilder } from '../src/render.mjs';
import { priceEvidence } from '../src/lib/price-evidence.mjs';
import { chinaPriceBasis, regionalPricePayload } from '../src/lib/regional-prices.mjs';
import { regionalPrice } from '../assets/regional-prices.js';
import { translate } from '../assets/i18n.js';

const data = loadDataset();
const context = (dataset = data, locale = 'en') => ({ data: dataset, products: joinProducts(dataset), posts: [], base: '', locale, siteUrl: 'https://chinesebikes.xyz', repositoryUrl: 'https://github.com/p0s/china-bike-research', now: new Date('2026-10-05') });
const product = ctx => ctx.products.find(p => p.variant.id === 'quick-gr-one-frameset');
const bases = ctx => JSON.parse(renderBikeBuilder(ctx).match(/id="build-configurator-data">([\s\S]*?)<\/script>/)[1]).bases;
const expected = {
  'data/brands/quick.json': 'a67ec86fae81cb2190f349172c4b63606832f6e753e40ef47be4ec5835de9eb3',
  'data/prices/quick-gr-one-launch-2025-05.json': '62c23e25b6c5489423a1aa81a4da11bf565e39860ade788373d7d9c6b1bf0d07',
  'data/sources/quick-gr-one-official.json': '1c0862df8af55e08aae94e2fae5e4387852a9ab2cc69323a34e359816bd0a2cc',
  'data/sources/quick-gr-one-global-store-2026-09-01.json': 'e10ca928ba5596353a5e822e7453a7f6a4b4d61416583fcd21446fb0cd329406',
  'data/sources/quick-gr-one-global-store-recheck-2026-09-23.json': '26cc0fa593eb4b4096a536911cb9a16d890be654ae64f2ea642a9f147906ed5e',
  'data/prices/quick-gr-one-global-official-2026-09-01.json': '9523453db87882f8139e8adbfe1238fb14e16f85b1543d4895ce4a28d7f3956f',
  'data/platforms/quick-gr-one.json': 'cf0c5dfc9bbeae78ee05d14393e0045d835427b92ab704890971e610c3123ffb',
  'data/variants/quick-gr-one-frameset.json': '8fc885fae32d2a4fd0bfd8212fbd299b78c45433b882c69c1944b456b65fd7ba'
};

test('all eight exact prior records survive with their original dates, facts, relationships and claims', () => {
  for (const [file, hash] of Object.entries(expected)) {
    const record = JSON.parse(readFileSync(new URL('../' + file, import.meta.url)));
    const prior = record.audit_corrections.at(-1).prior_values;
    assert.equal(createHash('sha256').update(JSON.stringify(prior)).digest('hex'), hash, file);
    assert.equal(record.last_reviewed ?? record.observed_at ?? record.accessed_at, prior.last_reviewed ?? prior.observed_at ?? prior.accessed_at, file);
  }
  const p = product(context());
  assert.deepEqual(p.platform.frame.geometry.sizes, p.platform.audit_corrections.at(-1).prior_values.frame.geometry.sizes);
  assert.match(p.platform.audit_corrections.at(-1).prior_values.frame.stiffness_evidence, /manufacturer-hosted/);
});

test('current exact-source roles are seller-scoped while ownership remains explicitly unverified', () => {
  for (const id of ['quick-gr-one-official', 'quick-gr-one-global-store-2026-09-01', 'quick-gr-one-global-store-recheck-2026-09-23']) {
    const source = data.sources.find(s => s.id === id);
    assert.match(source.type, /^regional-retailer-/);
    assert.ok(source.classification_history.length);
    assert.match(source.authority_note, /relationship remains unverified/);
    assert.match(source.authority_note, /does not establish false ownership/);
    assert.doesNotMatch(source.notes, /manufacturer-hosted|global-direct/);
  }
  const p = product(context());
  assert.equal(p.platform.china_availability, 'mainland-listing-and-foreign-seller');
  assert.match(p.variant.purchase_route, /foreign regional seller/);
  assert.match(p.platform.frame.stiffness_evidence, /seller-hosted.*not an independent/);
  assert.deepEqual(validateDataset(data), []);
});

test('the dated foreign amount and FX basis remain references, never an exact budget or automatic purchase input', () => {
  const p = product(context()), price = p.latestPrice;
  assert.equal(price.amount_cny, 14105);
  assert.equal(price.original_amount, 2099);
  assert.equal(price.original_currency, 'USD');
  assert.equal(price.observed_at, '2026-09-01');
  assert.equal(price.conversion_rate_date, '2026-08-31');
  assert.equal(price.conversion_rate_cny_per_original_unit, 6.719730941704037);
  assert.equal(priceEvidence(price).reference, true);
  assert.equal(priceEvidence(price).purchaseEligible, false);
  assert.equal(chinaPriceBasis([price]), null);
  const summary = catalogSummaries(context()).find(s => s.id === p.variant.id);
  assert.notEqual(summary.chinaPrice?.id, price.id);
  assert.equal(summary.chinaPrice, null);
  assert.doesNotMatch(summary.availability, /direct/);
  assert.equal(regionalPrice(summary, { country: 'CN', currency: 'CNY' }, regionalPricePayload(data, '2026-10-05')).high, null);
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const base = bases(context(data, locale)).find(b => b.id === p.variant.id);
    assert.equal(base.priceLow, null);
    assert.equal(base.priceHigh, null);
    assert.ok(base.priceNote.includes(translate(price.planner_quote_note, locale)));
    if (locale !== 'en') assert.notEqual(translate(price.planner_quote_note, locale), price.planner_quote_note);
  }
});

test('published incomplete quote handling is explicit and does not change other current bases', () => {
  const restored = structuredClone(data);
  delete restored.prices.find(p => p.id === 'quick-gr-one-global-official-2026-09-01').purchase_total_complete;
  const before = new Map(bases(context(restored)).map(b => [b.id, b]));
  const after = bases(context());
  for (const base of after) if (base.id !== 'quick-gr-one-frameset') assert.deepEqual(base, before.get(base.id), base.id);
  assert.equal(before.get('quick-gr-one-frameset').priceLow, 14105);
  const fixture = structuredClone(data);
  const selected = product(context(fixture)).latestPrice;
  selected.purchase_total_complete = true;
  assert.equal(bases(context(fixture)).find(b => b.id === 'quick-gr-one-frameset').priceLow, 14105);
});

test('all localized model pages visibly qualify buyer-facing relationship and preserve the dated references', () => {
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const ctx = context(data, locale), p = product(ctx), html = renderModel(ctx, p);
    const caveat = p.variant.editorial.caveats.at(-1);
    assert.ok(html.includes(translate(caveat, locale)), locale);
    assert.ok(html.includes(translate(data.sources.find(s => s.id === 'quick-gr-one-official').authority_note, locale)), locale);
    assert.ok(html.includes('2026-09-01'), locale);
    assert.ok(html.includes('14,105'), locale);
    if (locale !== 'en') assert.notEqual(translate(caveat, locale), caveat);
  }
});


test('the shared Quick USA website label and manufacturing summary do not imply verified factory ownership', () => {
  const brand = data.brands.find(b => b.id === 'quick');
  assert.equal(brand.manufacturing.relationship, 'brand-identity-only');
  assert.equal(brand.manufacturing.confidence, 'unknown');
  assert.match(brand.manufacturing.summary, /legal relationship.*remain unverified/);
  assert.equal(brand.audit_corrections.at(-1).prior_values.manufacturing.relationship, 'factory-linked-brand');
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const ctx = context(data, locale), html = renderModel(ctx, product(ctx));
    assert.ok(html.includes(translate(brand.website_label, locale)));
    assert.ok(html.includes(translate(brand.manufacturing.summary, locale)));
    assert.doesNotMatch(html, /Visit the official Quick Pro website/);
    const summary = catalogSummaries(ctx).find(s => s.id === 'quick-gr-one-frameset');
    assert.match(summary.manufacturing, /factory not verified/);
    assert.doesNotMatch(summary.manufacturing, /factory-linked/);
  }
});
