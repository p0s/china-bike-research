import test from 'node:test';
import assert from 'node:assert/strict';
import {
  datasetStructuredData,
  latestDate,
  productPageStructuredData,
  sitemapXml,
  websiteStructuredData
} from '../src/lib/seo.mjs';

test('homepage structured data identifies the site without duplicating the catalog payload', () => {
  const data = websiteStructuredData({
    siteUrl: 'https://china-bikes.example',
    base: '',
    description: 'Bike comparison'
  });
  assert.equal(data['@type'], 'WebSite');
  assert.equal(data.url, 'https://china-bikes.example/');
  assert.equal(JSON.stringify(data).includes('itemListElement'), false);
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

test('dataset schema mirrors visible downloads without commercial claims', () => {
  const data = datasetStructuredData({
    siteUrl: 'https://china-bikes.example',
    base: '',
    path: '/methodology/',
    name: 'China Bikes dataset',
    description: 'Source-linked bike records.',
    dateModified: '2026-08-28',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    distributions: [
      { name: 'Catalog JSON', encodingFormat: 'application/json', path: '/data/catalog.json' },
      { name: 'Catalog CSV', encodingFormat: 'text/csv', path: '/data/catalog.csv' }
    ]
  });
  const dataset = data['@graph'].find((entry) => entry['@type'] === 'Dataset');
  assert.equal(dataset.dateModified, '2026-08-28');
  assert.equal(dataset.distribution.length, 2);
  assert.equal(dataset.distribution[0].contentUrl, 'https://china-bikes.example/data/catalog.json');
  assert.equal(JSON.stringify(data).includes('offers'), false);
  assert.equal(JSON.stringify(data).includes('Product'), false);
});
