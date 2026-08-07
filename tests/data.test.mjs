import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadDataset,
  validateDataset,
  joinProducts,
  freshness,
  maxClearance
} from '../src/lib/data.mjs';

const data = loadDataset();
const products = joinProducts(data);

test('dataset validates without errors', () => {
  assert.deepEqual(validateDataset(data), []);
});

test('public dataset has the expected coverage', () => {
  assert.equal(data.brands.length, 23);
  assert.equal(data.platforms.length, 29);
  assert.equal(data.variants.length, 30);
  assert.equal(data.prices.length, 30);
  assert.equal(data.images.length, 29);
  assert.ok(data.sources.length >= 41);
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

test('all framesets use one transparent full-bike build allowance', () => {
  assert.equal(data.meta.frameset_build_assumption.amount_cny, 6000);
  const frame = products.find((item) => item.variant.id === 'lightcarbon-lcg071s-pro-frameset');
  assert.deepEqual([frame.allInPrice.low, frame.allInPrice.high], [9200, 10900]);
  assert.equal(frame.allInPrice.estimated, true);
  const complete = products.find((item) => item.variant.id === 'twitter-v3-wheeltop-eds');
  assert.deepEqual([complete.allInPrice.low, complete.allInPrice.high], [5191, 5191]);
  assert.equal(complete.allInPrice.estimated, false);
});

test('wide-clearance products preserve the narrower rear limit', () => {
  const product = products.find((item) => item.variant.id === 'seka-exaero-gr-frameset');
  assert.equal(maxClearance(product.platform), 52);
});

test('every platform and variant resolves a primary visual', () => {
  assert.equal(data.images.length, data.platforms.length);
  const imagedPlatforms = new Set(data.images.filter((image) => image.role === 'primary').map((image) => image.platform_id));
  assert.deepEqual([...imagedPlatforms].sort(), data.platforms.map((platform) => platform.id).sort());
  for (const product of products) {
    assert.ok(product.image, product.variant.id);
    assert.ok(product.imageSource, product.variant.id);
  }
});

test('image records preserve exactness, source, rights, and fallback-safe hosting', () => {
  const allowedRights = new Set([
    'project-owned', 'contributor-owned', 'permission-granted', 'brand-media-license',
    'cc-licensed', 'public-domain', 'official-page-embed', 'retailer-page-embed'
  ]);
  for (const image of data.images) {
    assert.ok(image.alt.length >= 10, image.id);
    assert.ok(image.credit.length >= 3, image.id);
    assert.ok(allowedRights.has(image.rights.status), image.id);
    if (image.hosting.mode === 'remote') assert.match(image.hosting.remote_url, /^https:\/\//, image.id);
    if (image.hosting.mode === 'local') assert.match(image.hosting.local_path, /^\/assets\/images\//, image.id);
  }
  assert.equal(data.images.filter((image) => image.hosting.mode === 'remote').length, 29);
  assert.equal(data.images.filter((image) => image.subject_accuracy === 'illustrative').length, 0);
});

test('shared frame images do not masquerade as exact component builds', () => {
  const eds = products.find((item) => item.variant.id === 'twitter-v3-wheeltop-eds');
  const rs = products.find((item) => item.variant.id === 'twitter-v3-rs-sensah');
  const pardus = products.find((item) => item.variant.id === 'pardus-super-sport-gen2-egr');
  assert.equal(eds.image.display_accuracy, 'exact-variant');
  assert.equal(rs.image.display_accuracy, 'same-platform');
  assert.equal(pardus.image.display_accuracy, 'same-platform');
});

test('previously unresolved platforms now have credited product references', () => {
  const ican = products.find((product) => product.platform.id === 'ican-gra04');
  const trinx = products.find((product) => product.platform.id === 'trinx-gtr-c6');
  assert.equal(ican.image.hosting.mode, 'remote');
  assert.equal(ican.image.display_accuracy, 'exact-variant');
  assert.equal(ican.image.rights.status, 'retailer-page-embed');
  assert.equal(trinx.image.hosting.mode, 'remote');
  assert.equal(trinx.image.display_accuracy, 'same-model-different-market-build');
  assert.match(trinx.image.display_note, /does not depict the China-market carbon specification/i);
});
