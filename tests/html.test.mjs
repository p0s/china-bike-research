import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, layout, url } from '../src/lib/html.mjs';

test('HTML escaping prevents markup injection', () => {
  assert.equal(escapeHtml('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
});

test('base-aware URLs work for GitHub project pages', () => {
  assert.equal(url('/china-bike-research', '/models/example/'), '/china-bike-research/models/example/');
  assert.equal(url('', '/'), '/');
});

test('layout emits base-aware social and structured metadata without repository identity', () => {
  const html = layout({
    base: '/guide',
    repositoryUrl: 'https://github.com/example/guide',
    siteUrl: 'https://example.github.io',
    title: 'Bike',
    description: 'A bike page',
    path: '/models/bike/',
    image: '/guide/assets/images/placeholders/complete-bike.svg',
    imageWidth: 1200,
    imageHeight: 630,
    imageType: 'image/png',
    ogType: 'product',
    structuredData: { '@context': 'https://schema.org', '@type': 'Product', name: 'Bike <exact>' },
    datasetUpdated: '2026-08-30',
    catalogReviewed: '2026-08-08',
    footerDescription: 'Evidence-led China bike comparison.',
    body: '<p>Bike</p>'
  });
  assert.match(html, /property="og:image" content="https:\/\/example.github.io\/guide\/assets\/images\/placeholders\/complete-bike.svg"/);
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /property="og:image:height" content="630"/);
  assert.match(html, /property="og:image:type" content="image\/png"/);
  assert.match(html, /property="og:type" content="product"/);
  assert.match(html, /property="og:site_name" content="China Bikes"/);
  assert.match(html, /aria-label="China Bikes home"/);
  assert.match(html, /data-theme-control aria-label="Theme: System\. Switch to light theme"/);
  assert.ok(html.indexOf('china-bikes-theme-v1') < html.indexOf('rel="stylesheet"'));
  assert.match(html, /<script type="module" src="\/guide\/assets\/site\.js"><\/script>/);
  assert.match(html, /Evidence-led China bike comparison\.[\s\S]*Dataset updated <time datetime="2026-08-30">2026-08-30<\/time>; catalog-wide review <time datetime="2026-08-08">2026-08-08<\/time>/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /name="twitter:image" content="https:\/\/example.github.io\/guide\/assets\/images\/placeholders\/complete-bike.svg"/);
  assert.match(html, /name="robots" content="index,follow,max-image-preview:large"/);
  assert.match(html, /type="application\/ld\+json">.*Bike \\u003cexact>/);
  assert.doesNotMatch(html, /github\.com\/private-owner|file:\/\/\//i);
});

test('noindex pages remain followable and do not emit an index directive', () => {
  const html = layout({
    repositoryUrl: 'https://github.com/example/guide',
    title: 'Missing',
    description: 'Not found',
    path: '/404.html',
    noindex: true,
    body: '<p>Missing</p>'
  });
  assert.match(html, /name="robots" content="noindex,follow"/);
  assert.doesNotMatch(html, /max-image-preview:large/);
});
