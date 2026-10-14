import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkLinks } from '../scripts/check-links.mjs';

const cli = path.resolve(import.meta.dirname, '../scripts/check-links.mjs');
function fixture(t, base = '') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'generated-links-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  write('build-manifest.json', JSON.stringify({ base }));
  write('index.html', '<h1 id="catalog">Catalog</h1>');
  write('models/bike/index.html', '<h1 id="fit &amp; size">Bike</h1><a name="legacy"></a>');
  write('images/bike one.webp', 'fixture image');
  return { root, write };
}

for (const base of ['', '/china-bike-research']) {
  test(`resolves index routes, relative URLs, queries and decoded fragments with base ${base || '/'}`, t => {
    const { root, write } = fixture(t, base);
    write('index.html', `<h1 id="catalog">Catalog</h1>
      <a href="${base}/models/bike/?x=1&amp;y=2#fit%20%26%20size">Bike</a>
      <a href='${base}/models/bike#legacy'>Directory without slash</a>
      <a href="${base || '/' }">Base root</a>
      <img src="${base}/images/bike%20one.webp?version=1#ignored">
      <img srcset="${base}/images/bike%20one.webp 1x, ${base}/images/bike%20one.webp 2x">
      <source srcset="data:image/png;base64,AAAA 1x, ${base}/images/bike%20one.webp 2x">`);
    write('models/bike/index.html', `<h1 id='fit &amp; size'>Bike</h1><a name=legacy></a>
      <a href="../../?query=1#catalog">Home</a><a href="#fit%20%26%20size">Self</a>
      <a href="?query=1#legacy">Query only</a><a href="index.html#legacy">Explicit index</a>
      <img src="../../images/bike%20one.webp"><a href="#">Top</a>`);
    assert.deepEqual(checkLinks(root).errors, []);
  });
}

test('skips external URLs and all schemes, comments and raw text', t => {
  const { root, write } = fixture(t);
  write('index.html', `<a href="https://example.com/missing">External</a><img src="//cdn.example.com/missing">
    <a href="mailto:test@example.com">Mail</a><a href="tel:123">Call</a><a href="javascript:void(0)">JS</a>
    <img src="data:image/png;base64,AAAA"><a href="ftp://example.com/a">FTP</a><a href="custom:thing">Custom</a>
    <!-- <a href="/missing"> --> <script>const x = '<img src="/missing">';</script>
    <style>/* <a href="/missing"> */</style><textarea><img src="/missing"></textarea>`);
  assert.deepEqual(checkLinks(root), { errors: [], pages: 2, checked: 0, orphaned: [] });
});

test('CLI reports deliberately broken page, image, responsive image and fragment and exits nonzero', t => {
  const { root, write } = fixture(t, '/bikes');
  write('models/bike/index.html', `<a href="../missing/">Missing page</a><img src="../../images/missing.webp">
    <img srcset="/bikes/images/bike%20one.webp 480w, /bikes/images/missing-large.webp 1200w">
    <a href="/bikes/#missing-id">Missing fragment</a>`);
  const result = spawnSync(process.execPath, [cli, root], { encoding: 'utf8' });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  for (const target of ['../missing/', '../../images/missing.webp', '/bikes/images/missing-large.webp', '/bikes/#missing-id']) {
    assert.ok(result.stderr.includes(`models/bike/index.html: broken target "${target}"`), result.stderr);
  }
  assert.equal(checkLinks(root).errors.length, 4);
});

test('rejects outside-base paths, encoded traversal, malformed encoding and directories without indexes', t => {
  const { root, write } = fixture(t, '/bikes');
  fs.mkdirSync(path.join(root, 'empty'));
  write('index.html', `<a href="/bikes-other/">Wrong base</a><a href="/images/bike%20one.webp">Missing base</a>
    <a href="/bikes/%2e%2e%2fsecret">Traversal</a><img src="/bikes/%ZZ"><a href="/bikes/empty/">Empty</a>`);
  assert.equal(checkLinks(root).errors.length, 5);
});

test('decodes numeric HTML entities and checks script resource attributes', t => {
  const { root, write } = fixture(t);
  write('index.html', '<h1 id="a&#38;b">Title</h1><a HREF=&#35;a%26b>Self</a><script src="/missing.js"></script>');
  const result = checkLinks(root);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /missing.js/);
});

test('CLI succeeds without building and fails closed on absent output or manifest', t => {
  const { root } = fixture(t);
  assert.equal(spawnSync(process.execPath, [cli, root], { encoding: 'utf8' }).status, 0);
  fs.unlinkSync(path.join(root, 'build-manifest.json'));
  assert.equal(spawnSync(process.execPath, [cli, root], { encoding: 'utf8' }).status, 1);
  assert.equal(spawnSync(process.execPath, [cli, path.join(root, 'absent')], { encoding: 'utf8' }).status, 1);
});

test('file URLs must refer to files inside generated output', t => {
  const { root, write } = fixture(t);
  write('index.html', `<img src="${pathToFileURL(path.join(root, 'images/bike one.webp'))}"><a href="file:///outside.html">Outside</a>`);
  const result = checkLinks(root);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /outside output directory/);
});

for (const base of ['', '/bikes']) {
  test(`checks absolute and protocol-relative same-origin targets with base ${base || '/'}`, t => {
    const { root, write } = fixture(t, base);
    write('build-manifest.json', JSON.stringify({ base, site_url: 'https://bikes.example' }));
    write('index.html', `<a href="https://bikes.example${base}/models/bike/#legacy">Bike</a>
      <img src="//bikes.example${base}/images/bike%20one.webp">
      <a href="https://other.example/missing">External</a>
      <a href="https://bikes.example${base}/models/bike/#wrong">Broken fragment</a>
      <img srcset="https://bikes.example${base}/images/missing.webp 2x">`);
    const result = checkLinks(root);
    assert.equal(result.errors.length, 2);
    assert.ok(result.errors.some(error => error.includes('missing fragment #wrong')));
    assert.ok(result.errors.some(error => error.includes('images/missing.webp')));
  });

  test(`requires navigable sitemap pages rather than metadata or isolated cycles with base ${base || '/'}`, t => {
    const { root, write } = fixture(t, base);
    write('build-manifest.json', JSON.stringify({ base, site_url: 'https://bikes.example' }));
    const sitemap = routes => `<urlset>${routes.map(route => `<url><loc>https://bikes.example${base}${route}</loc></url>`).join('')}</urlset>`;
    write('sitemap.xml', sitemap(['/', '/models/bike/', '/policy/', '/orphan-a/', '/orphan-b/']));
    write('index.html', `<a href="${base}/models/bike/">Bike</a>
      <link rel="alternate" href="${base}/policy/">
      <a download href="${base}/policy/">Download</a>`);
    write('models/bike/index.html', `<a href="${base}/">Home</a>`);
    write('policy/index.html', '<h1>Policy</h1>');
    write('orphan-a/index.html', `<a href="${base}/orphan-b/">B</a>`);
    write('orphan-b/index.html', `<a href="${base}/orphan-a/">A</a>`);
    assert.deepEqual(checkLinks(root).orphaned, ['policy/index.html', 'orphan-a/index.html', 'orphan-b/index.html']);
    write('models/bike/index.html', `<a href="${base}/policy/">Policy</a><a href="${base}/orphan-a/">A</a>`);
    assert.deepEqual(checkLinks(root).errors, []);
  });
}

test('follows multilingual and noindex navigation, excludes nonsitemap pages and supports text fragments', t => {
  const { root, write } = fixture(t);
  write('build-manifest.json', JSON.stringify({ base: '', site_url: 'https://bikes.example' }));
  write('sitemap.xml', '<urlset><url><loc>https://bikes.example/</loc></url><url><loc>https://bikes.example/zh/models/bike/</loc></url></urlset>');
  write('index.html', '<a href="/zh/">中文</a><a href="/models/bike/#fit%20%26%20size:~:text=Bike">Text fragment</a>');
  write('zh/index.html', '<meta name="robots" content="noindex,follow"><a href="/zh/models/bike/">车型</a>');
  write('zh/models/bike/index.html', '<h1>车型</h1>');
  write('404.html', '<meta name="robots" content="noindex,follow"><h1>Missing</h1>');
  assert.deepEqual(checkLinks(root).errors, []);
});

test('rejects resources which escape through a symlink', t => {
  const { root, write } = fixture(t);
  const outside = fixture(t).root;
  fs.symlinkSync(path.join(outside, 'images/bike one.webp'), path.join(root, 'escaped.webp'));
  write('index.html', '<img src="/escaped.webp">');
  assert.match(checkLinks(root).errors[0], /outside output directory/);
});
