import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { escapeHtml, layout, url } from '../src/lib/html.mjs';

test('the selected rider brand and browser icons use shared base-safe assets in every locale', () => {
  for (const base of ['', '/guide']) for (const locale of ['en', 'zh-Hans', 'de']) {
    const html = layout({ base, locale, repositoryUrl: 'https://github.com/example/guide', body: '' });
    assert.ok(html.includes(`src="${base}/assets/branding/panda-rider-3b-256.webp"`));
    assert.ok(html.includes(`href="${base}/assets/logo.svg"`));
    assert.ok(html.includes(`href="${base}/assets/branding/favicon-32.png"`));
    assert.ok(html.includes(`href="${base}/assets/branding/apple-touch-icon.png"`));
    assert.match(html, /alt="" width="50" height="50"/);
    assert.match(html, /class="brand-wordmark"[^>]*>China <span>Bikes<\/span>/);
    assert.doesNotMatch(html, /(?:src|href)="[^"]*\/(?:zh|de)\/assets\/branding/);
  }
});

test('published brand assets match their approved generation provenance', () => {
  const provenance = JSON.parse(fs.readFileSync(new URL('../assets/branding/provenance.json', import.meta.url)));
  assert.equal(provenance.selected_concept, '3B Gravel rider');
  for (const asset of provenance.assets) {
    const bytes = fs.readFileSync(new URL(`../${asset.path}`, import.meta.url));
    assert.equal(bytes.length, asset.bytes);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.sha256);
  }
  const svg = fs.readFileSync(new URL('../assets/logo.svg', import.meta.url), 'utf8');
  assert.match(svg, /fill="#f7f7f4"/);
  assert.match(svg, /href="data:image\/png;base64,/);
  assert.doesNotMatch(svg.replace('http://www.w3.org/2000/svg', ''), /<script|<foreignObject|https?:\/\//i);
});

test('HTML escaping prevents markup injection', () => {
  assert.equal(escapeHtml('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
});

test('base-aware URLs work for GitHub project pages', () => {
  assert.equal(url('/china-bike-research', '/models/example/'), '/china-bike-research/models/example/');
  assert.equal(url('', '/'), '/');
});

test('reader-facing mainland labels name China without changing URLs or embedded data', () => {
  const html = layout({
    repositoryUrl: 'https://github.com/example/guide',
    title: 'Mainland guide',
    description: 'Mainland prices and non-mainland references',
    path: '/models/bike/',
    body: '<p>Mainland seller; non-mainland reference; mainland China source.</p><a href="/mainland-offers/">Mainland offer</a><span data-tooltip-lines="[&quot;Mainland price&quot;]">Details</span><script type="application/json">{"id":"mainland-offer"}</script><script type="application/json" id="catalog-data">[{"id":"mainland-offer","priceDetails":"Mainland price"}]</script>'
  });
  assert.match(html, /<title>Mainland China guide/);
  assert.match(html, /Mainland China seller; outside mainland China reference; mainland China source/);
  assert.match(html, /href="\/mainland-offers\/">Mainland China offer/);
  assert.match(html, /data-tooltip-lines="\[&quot;Mainland China price&quot;\]"/);
  assert.match(html, /content="Mainland China prices and outside mainland China references"/);
  assert.match(html, /"id":"mainland-offer"/);
  assert.match(html, /"id":"mainland-offer","priceDetails":"Mainland China price"/);
  assert.doesNotMatch(html, /mainland China China/i);
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
  assert.match(html, /data-theme-control>/);
  assert.match(html, /class="theme-light">Light/);
  assert.match(html, /class="theme-dark">Dark/);
  assert.doesNotMatch(html, /Theme: System|data-theme-label>System/);
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
