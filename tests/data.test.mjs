import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadDataset,
  validateDataset,
  joinProducts,
  freshness,
  buildProfileRange,
  maxClearance
} from '../src/lib/data.mjs';

const data = loadDataset();
const products = joinProducts(data);

test('dataset validates without errors', () => {
  assert.deepEqual(validateDataset(data), []);
});

test('initial public dataset has the expected minimum coverage', () => {
  assert.equal(data.brands.length, 23);
  assert.equal(data.platforms.length, 29);
  assert.equal(data.variants.length, 30);
  assert.equal(data.prices.length, 30);
  assert.ok(data.sources.length >= 30);
  assert.equal(products.length, data.variants.length);
});

test('frame platforms and configurations remain separate', () => {
  const twitterVariants = data.variants.filter((item) => item.platform_id === 'twitter-gravel-v3');
  assert.equal(twitterVariants.length, 2);
  assert.equal(data.platforms.filter((item) => item.id === 'twitter-gravel-v3').length, 1);
});

test('observed Twitter prices are retained exactly and anonymously', () => {
  const eds = data.prices.find((item) => item.id === 'twitter-eds-2026-08-05');
  const rs = data.prices.find((item) => item.id === 'twitter-rs-2026-08-05');
  assert.equal(eds.amount_cny, 5191);
  assert.equal(rs.amount_cny, 3991);
  assert.equal(eds.channel, 'china-market');
  assert.equal(eds.source_ids.includes('market-snapshot-2026-08-05'), true);
});

test('freshness uses explicit age buckets', () => {
  const now = new Date('2026-08-06T12:00:00Z');
  assert.equal(freshness('2026-08-05', now).key, 'current');
  assert.equal(freshness('2026-05-01', now).key, 'historical');
  assert.equal(freshness('2025-01-01', now).key, 'old');
});

test('build profile ranges add reusable parts assumptions', () => {
  const profile = data.buildProfiles.find((item) => item.id === 'twitter-eds-equivalent');
  assert.deepEqual(buildProfileRange(profile), [6000, 10300]);
  assert.deepEqual(buildProfileRange(profile, true), [5500, 9300]);
});

test('wide-clearance products preserve the narrower rear limit', () => {
  const product = products.find((item) => item.variant.id === 'seka-exaero-gr-frameset');
  assert.equal(maxClearance(product.platform), 52);
});
