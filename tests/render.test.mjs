import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts } from '../src/lib/data.mjs';
import { renderHome, renderModel, renderPrivacy } from '../src/render.mjs';

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
  assert.match(html, /placeholder="Search model, use or drivetrain"/);
  assert.match(html, /class="product-fit"><span>Best for<\/span>/);
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
  assert.match(html, /aria-controls="shared-tooltip"/);
  assert.match(html, /role="status" aria-live="polite" id="copy-status"/);
  assert.match(html, /data-result-summary aria-live="polite" hidden/);
  assert.match(html, /class="metric-sub price-state [^"]*">Promo · 2026-08-08<\/span>/);
  assert.match(html, /data-filter-category/);
  assert.match(html, /Category fact/);
  assert.match(html, /role="columnheader" aria-sort="none"><button class="catalog-sort-button" type="button" data-sort-heading="name"/);
  assert.match(html, /role="columnheader" aria-sort="ascending"><button class="catalog-sort-button" type="button" data-sort-heading="price"/);
  assert.match(html, /data-sort-heading="capability" disabled/);
  assert.match(html, /<option value="price-asc">Price: low to high<\/option>/);
  assert.match(html, /<option value="name-desc">Bike: Z to A<\/option>/);
  assert.match(html, /<option value="capability-desc" disabled>Category fact: high to low<\/option>/);
  assert.doesNotMatch(html, /data-filter-style/);
  assert.match(html, /class="metric-sub">Claimed<\/span>/);
  assert.match(html, /Why Best value/);
  assert.match(html, /Wireless electronic hydraulic 2×12, carbon frame\/fork\/cockpit, and T47/);
});

test('model evidence labels claims, source roles, confidence, and inaccessible snapshots', () => {
  const product = products.find((item) => item.variant.id === 'twitter-v3-wheeltop-eds');
  const detail = renderModel({
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-09T00:00:00Z')
  }, product);
  assert.match(detail, /<dt>Claimed weight<\/dt><dd>9\.9 kg<\/dd>/);
  assert.match(detail, /Each source is labelled by what it supports/);
  assert.match(detail, /Twitter Bikes · Manufacturer product page · Product facts · Image/);
  assert.match(detail, /Product facts: Medium–high · Image: High/);
  assert.match(detail, /Archived evidence; no public link/);

  const placeholderProduct = products.find((item) => item.variant.id === 'tfsa-jh37-frameset');
  const placeholderDetail = renderModel({
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-09T00:00:00Z')
  }, placeholderProduct);
  assert.match(placeholderDetail, /Project-owned local asset/);
  assert.doesNotMatch(placeholderDetail, /Project-owned product image placeholders[\s\S]*Archived evidence; no public link/);
});

test('primary navigation reflects catalog and exact model context', () => {
  assert.match(html, /data-nav-catalog aria-current="page"/);
  assert.doesNotMatch(html, /data-nav-framesets aria-current="page"/);

  const complete = products.find((item) => item.variant.kind === 'complete-bike');
  const frameset = products.find((item) => item.variant.kind === 'frameset');
  assert.ok(complete);
  assert.ok(frameset);
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-09T00:00:00Z')
  };
  const completeDetail = renderModel(context, complete);
  const framesetDetail = renderModel(context, frameset);
  assert.match(completeDetail, /data-nav-catalog aria-current="page"/);
  assert.doesNotMatch(completeDetail, /data-nav-framesets aria-current="page"/);
  assert.doesNotMatch(framesetDetail, /data-nav-catalog aria-current="page"/);
  assert.match(framesetDetail, /data-nav-framesets aria-current="page"/);
});

test('buyer controls preserve strict budget, category evidence, and valid row semantics', () => {
  assert.match(html, /data-id="sava-gelaro-s4-grx400"[^>]*data-price-filter="6500"/);
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

test('model videos are exact, disclosed, and privacy-preserving before interaction', () => {
  const product = products.find((item) => item.variant.id === 'yoeleo-altera-g21-frameset');
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-09T00:00:00Z')
  };
  const detail = renderModel(context, product);
  assert.match(detail, /Selected video context/);
  assert.match(detail, /data-video-shell data-youtube-id="jmdVakRJPQ8" data-video-title="\$1278 for a frame THIS GOOD! The Yoeleo G21 Altera"/);
  assert.match(detail, /No YouTube request until you choose/);
  assert.match(detail, /Retailer-linked/);
  assert.match(detail, /Disclosure basis/);
  assert.match(detail, /href="https:\/\/www\.youtube\.com\/watch\?v=jmdVakRJPQ8" rel="noreferrer"/);
  assert.doesNotMatch(detail, /<iframe|youtube-nocookie\.com\/embed/);

  const privacy = renderPrivacy(context);
  assert.match(privacy, /youtube-nocookie\.com/);
  assert.match(privacy, /only after the visitor presses/);
  assert.match(privacy, /videos do not autoplay/);
});


test('generic project copy is category-neutral', () => {
  assert.match(html, /<h1>Bikes in China<\/h1>/);
  assert.doesNotMatch(html, /Carbon bikes in China|Gravel and all-road bikes|above 38 mm/i);
});
