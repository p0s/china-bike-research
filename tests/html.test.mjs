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

test('layout emits base-aware social image metadata without repository identity', () => {
  const html = layout({
    base: '/guide',
    repositoryUrl: 'https://github.com/example/guide',
    siteUrl: 'https://example.github.io',
    title: 'Bike',
    description: 'A bike page',
    path: '/models/bike/',
    image: '/guide/assets/images/placeholders/complete-bike.svg',
    body: '<p>Bike</p>'
  });
  assert.match(html, /property="og:image" content="https:\/\/example.github.io\/guide\/assets\/images\/placeholders\/complete-bike.svg"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.doesNotMatch(html, /github\.com\/private-owner|file:\/\/\//i);
});
