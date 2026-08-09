import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts } from '../src/lib/data.mjs';
import { renderHome, renderModel } from '../src/render.mjs';

const data = loadDataset();
const products = joinProducts(data);
const html = renderHome({
  data,
  products,
  base: '/china-bike-research',
  repositoryUrl: 'https://github.com/example/china-bike-research',
  siteUrl: 'https://example.github.io',
  now: new Date('2026-08-07T00:00:00Z')
});

test('homepage is the unified bike and frame-build comparison', () => {
  assert.match(html, /data-catalog-root/);
  assert.match(html, /data-inline-compare/);
  assert.match(html, /Frame estimate/);
  assert.match(html, /Est\. ¥9,200–10,900/);
  assert.match(html, /Full-bike price/);
});

test('homepage omits developer-facing dashboards and legacy sections', () => {
  assert.doesNotMatch(html, /decision-ready configurations/i);
  assert.doesNotMatch(html, /Current quick picks/i);
  assert.doesNotMatch(html, />Guides</i);
  assert.doesNotMatch(html, />Watchlist</i);
  assert.doesNotMatch(html, /href="[^"]*\/compare\//i);
  assert.doesNotMatch(html, /href="[^"]*\/guides\//i);
});

test('category-specific details stay accessible while price state is visible', () => {
  assert.match(html, /aria-label="Price details"/);
  assert.match(html, /aria-label="Tire details"/);
  assert.match(html, /aria-label="Format details"/);
  assert.match(html, /data-filter-capability/);
  assert.match(html, /<option disabled>Mountain bikes — research queue<\/option>/);
  assert.match(html, /<option disabled>E-road — research queue<\/option>/);
  assert.match(html, /<option disabled>Folding — research queue<\/option>/);
  assert.match(html, /Triathlon/);
  assert.match(html, /role="tooltip"/);
  assert.equal((html.match(/role="tooltip"/g) ?? []).length, 1);
  assert.match(html, /data-tooltip-lines=/);
  assert.match(html, /data-result-summary aria-live="polite" hidden/);
  assert.match(html, /class="metric-sub price-state [^"]*">Promo · 2026-08-08<\/span>/);
  assert.match(html, /data-filter-category/);
  assert.match(html, /Category fact/);
  assert.doesNotMatch(html, /data-filter-style/);
});

test('buyer controls preserve strict budget, category evidence, and valid row semantics', () => {
  assert.match(html, /data-id="pardus-uragano-sport"[^>]*data-price-filter="12000"/);
  assert.match(html, /Triathlon storage \/ boxes: Unknown\./);
  assert.match(html, /"internalFrameStorage":"No"/);
  assert.doesNotMatch(html, /<article class="catalog-row" role="row"/);
  assert.match(html, /<div class="catalog-row" role="row"/);
  assert.match(html, /<div class="compare-toggle" role="cell"><label>/);
  assert.doesNotMatch(html, /<label class="compare-toggle" role="cell">/);
  assert.match(html, /data-filter-notice/);
});

test('brand names expose an exact, base-safe catalog filter', () => {
  assert.match(html, /data-brand="twitter"/);
  assert.match(html, /data-brand-filter="twitter" aria-pressed="false" aria-label="Twitter · 推特 — filter catalog to this brand"/);
  assert.match(html, /data-result-context/);
  assert.match(html, /class="product-image-link" href="\/china-bike-research\/models\/twitter-v3-wheeltop-eds\/" data-model-link aria-label="View Twitter Gravel V3 WheelTop EDS 2×12 details"/);
  assert.match(html, /select name="category" data-filter-category/);

  const product = products.find((item) => item.variant.id === 'twitter-v3-wheeltop-eds');
  const detail = renderModel({
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-07T00:00:00Z')
  }, product);
  assert.match(detail, /href="\/china-bike-research\/?\?brand=twitter#catalog"/);
  assert.match(detail, /aria-label="Twitter · 推特 — show this brand in the catalog"/);
  assert.match(detail, /data-catalog-back/);
  assert.match(detail, /data-add-to-comparison/);
  assert.match(detail, /data-model-compare-link/);
});

test('buyer-facing copy does not expose internal evidence or status enums', () => {
  const product = products.find((item) => item.variant.id === 'sava-a7l-r7100');
  const detail = renderModel({
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-09T00:00:00Z')
  }, product);
  assert.match(detail, /marketplace listing classification/);
  assert.match(detail, /Promotion-conditional price/);
  assert.doesNotMatch(detail, /snapshot-classification|from_image|medium-low|promotion-conditional/);
});


test('generic project copy is category-neutral', () => {
  assert.match(html, /<h1>Bikes in China<\/h1>/);
  assert.doesNotMatch(html, /Carbon bikes in China|Gravel and all-road bikes|above 38 mm/i);
});
