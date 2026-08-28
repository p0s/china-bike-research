import test from 'node:test';
import assert from 'node:assert/strict';
import {
  catalogStructuredData,
  latestDate,
  productPageStructuredData,
  sitemapXml
} from '../src/lib/seo.mjs';

test('catalog structured data exposes published products without inventing offers', () => {
  const data = catalogStructuredData({
    siteUrl: 'https://china-bikes.example',
    base: '',
    description: 'Bike comparison',
    products: [{
      brand: { name: 'Example' },
      platform: { category: 'gravel-race' },
      variant: { id: 'example-gravel', name: 'Gravel', kind: 'complete-bike' }
    }]
  });
  const collection = data['@graph'].find((entry) => entry['@type'] === 'CollectionPage');
  assert.equal(collection.mainEntity.numberOfItems, 1);
  assert.equal(collection.mainEntity.itemListElement[0].item.url, 'https://china-bikes.example/models/example-gravel/');
  assert.equal(JSON.stringify(data).includes('offers'), false);
});

test('model structured data provides product and breadcrumb identity without a price offer', () => {
  const data = productPageStructuredData({
    siteUrl: 'https://china-bikes.example',
    base: '/guide',
    path: '/models/example/',
    name: 'Example Gravel',
    model: 'Gravel',
    brand: 'Example',
    description: 'An exact model.',
    category: 'Gravel bike',
    image: '/guide/assets/example.webp',
    properties: [['Maximum tire clearance', '45 mm']]
  });
  const product = data['@graph'].find((entry) => entry['@type'] === 'Product');
  assert.equal(product.url, 'https://china-bikes.example/guide/models/example/');
  assert.deepEqual(product.image, ['https://china-bikes.example/guide/assets/example.webp']);
  assert.equal(product.additionalProperty[0].value, '45 mm');
  assert.equal('offers' in product, false);
  assert.ok(data['@graph'].some((entry) => entry['@type'] === 'BreadcrumbList'));
});

test('unresolved model pages omit Product schema while retaining page breadcrumbs', () => {
  const data = productPageStructuredData({
    siteUrl: 'https://china-bikes.example',
    base: '',
    path: '/models/model-unclear/',
    name: 'Model unclear',
    model: 'Model unclear',
    description: 'Identity unresolved.',
    category: '',
    includeProduct: false
  });
  assert.equal(data['@graph'].some((entry) => entry['@type'] === 'Product'), false);
  assert.ok(data['@graph'].some((entry) => entry['@type'] === 'WebPage'));
});

test('sitemap uses route-specific current dates and excludes non-indexed routes', () => {
  const pages = new Map([
    ['/', { includeInSitemap: true, lastmod: '2026-08-28' }],
    ['/models/example/', { includeInSitemap: true, lastmod: '2026-08-27' }],
    ['/404.html', { includeInSitemap: false }]
  ]);
  const sitemap = sitemapXml({
    siteUrl: 'https://china-bikes.example',
    base: '/guide',
    pages,
    fallbackLastmod: '2026-08-08'
  });
  assert.match(sitemap, /https:\/\/china-bikes\.example\/guide\/models\/example\/<\/loc><lastmod>2026-08-27/);
  assert.doesNotMatch(sitemap, /404\.html/);
  assert.equal(latestDate([['2026-08-08', '2026-08-28'], '2026-08-17'], '2026-01-01'), '2026-08-28');
});
