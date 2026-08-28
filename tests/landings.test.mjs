import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts } from '../src/lib/data.mjs';
import {
  buildLandingPages,
  MIN_BRAND_PRODUCTS,
  MIN_PRICE_PRODUCTS
} from '../src/lib/landings.mjs';
import { renderLandingPage } from '../src/render.mjs';

const data = loadDataset();
const products = joinProducts(data);
const landings = buildLandingPages({ products });
const context = {
  data,
  products,
  base: '/china-bike-research',
  repositoryUrl: 'https://github.com/example/china-bike-research',
  siteUrl: 'https://example.github.io',
  siteLastmod: '2026-08-28',
  now: new Date('2026-08-28T00:00:00Z')
};

test('landing generation is bounded, deterministic, and anti-thin', () => {
  assert.equal(landings.pages.length, 15);
  assert.equal(new Set(landings.pages.map((entry) => entry.route)).size, landings.pages.length);
  assert.equal(new Set(landings.pages.map((entry) => entry.title)).size, landings.pages.length);
  assert.equal(new Set(landings.pages.map((entry) => entry.description)).size, landings.pages.length);
  assert.ok(landings.brandPages.every((entry) => entry.products.length >= MIN_BRAND_PRODUCTS));
  assert.ok(landings.pricePages.every((entry) => entry.products.length >= MIN_PRICE_PRODUCTS));
  assert.ok(landings.pages.every((entry) => entry.products.length > 0));
  assert.ok(landings.pages.flatMap((entry) => entry.products).every((product) => product.variant && !product.candidate));
});

test('price pages use full non-overlapping ranges and exclude boundary-crossing products', () => {
  const ids = landings.pricePages.flatMap((entry) => entry.products.map((product) => product.variant.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(landings.pricePages.flatMap((entry) => entry.products).every((product) => (
    product.platform.status !== 'superseded'
      && product.platform.china_availability !== 'discontinued-superseded'
      && !product.latestPrice?.status?.startsWith('historical-')
  )));
  assert.ok(!ids.includes('twitter-v3-2024-rs-sensah-alloy'));
  for (const entry of landings.pricePages) {
    assert.ok(entry.products.every((product) => entry.band.includes(product.allInPrice)));
  }
  const crossing = products.filter((product) => (
    product.allInPrice.low < 5_000 && product.allInPrice.high > 5_000
  ) || (
    product.allInPrice.low < 10_000 && product.allInPrice.high > 10_000
  ));
  assert.ok(crossing.length > 0);
  assert.ok(crossing.every((product) => !ids.includes(product.variant.id)));
});

test('landing pages expose crawlable exact-model links and matching collection schema', () => {
  for (const landing of landings.pages) {
    const html = renderLandingPage(context, { ...landing, lastmod: '2026-08-28' });
    assert.match(html, new RegExp(`<link rel="canonical" href="https://example\\.github\\.io/china-bike-research${landing.route.replaceAll('/', '\\/')}"`));
    assert.match(html, /<nav class="breadcrumbs" aria-label="Breadcrumb">/);
    assert.match(html, /Evidence reviewed through <time datetime="2026-08-28">/);
    assert.match(html, /"@type":"CollectionPage"/);
    assert.match(html, /"@type":"BreadcrumbList"/);
    assert.doesNotMatch(html, /"@type":"Product"|"offers"/);
    if (!['brand-hub', 'price-hub'].includes(landing.kind)) {
      const renderedProducts = html.match(/data-landing-product=/g) ?? [];
      assert.equal(renderedProducts.length, landing.products.length);
      for (const product of landing.products) {
        assert.match(html, new RegExp(`/china-bike-research/models/${product.variant.id}/`));
      }
    }
  }
});

test('brand pages add supported context instead of generic keyword copy', () => {
  for (const landing of landings.brandPages) {
    const html = renderLandingPage(context, landing);
    assert.match(html, /Brand context/);
    assert.match(html, new RegExp(landing.brand.manufacturing.summary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, /Manufacturing relationship/);
    assert.match(html, /Warranty/);
    assert.doesNotMatch(html, /research-stage profile/i);
  }
});
