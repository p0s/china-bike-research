import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { indexNow, indexNowKeyUrl, validatePublicUrl, createIndexNowManifest, changedPublicUrls, sitemapPublicUrls, indexNowPayload } from '../src/lib/indexnow.mjs';
import { runIndexNow } from '../scripts/indexnow.mjs';

const url = route => `${indexNow.origin}${route}`;
const manifest = pages => ({ schema_version: 1, host: indexNow.host, pages });
const hash = character => character.repeat(64);
function files(t, before, after) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bike-indexnow-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const snapshot = path.join(directory, 'before.json'), expected = path.join(directory, 'after.json');
  fs.writeFileSync(snapshot, JSON.stringify({ schema_version: 1, host: indexNow.host, baseline: before }));
  fs.writeFileSync(expected, JSON.stringify(after));
  return ['notify', '--before', snapshot, '--expected', expected];
}
function fakeLive(after, { key = indexNow.key, status = 200, sitemap, calls = [] } = {}) {
  return async (target, options) => {
    calls.push({ target, options });
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal);
    if (target === indexNow.endpoint) return new Response('', { status });
    assert.equal(options.headers.DNT, '1');
    if (target === indexNowKeyUrl) return new Response(`${key}\n`);
    if (target.endsWith('/sitemap.xml')) return new Response(sitemap);
    assert.equal(target, `${indexNow.origin}${indexNow.manifestPath}`);
    return after === null ? new Response('', { status: 404 }) : Response.json(after);
  };
}

test('only canonical public same-host HTTPS document URLs can be submitted', () => {
  for (const route of ['/', '/zh/', '/de/geometry/', '/models/ican-graro-frameset/', '/blog/article/']) assert.equal(validatePublicUrl(url(route)), url(route));
  for (const value of ['http://chinesebikes.xyz/', 'https://www.chinesebikes.xyz/', 'https://example.com/', url('/geometry/?a=manual'), url('/#catalog'), url('/analytics/config'), url('/data/catalog.json'), url('/admin/'), url('/models/../private/'), 'https://user:pass@' + indexNow.host + '/']) {
    assert.throws(() => indexNowPayload([value]));
  }
  assert.throws(() => indexNowPayload([url('/'), url('/')]));
  assert.throws(() => indexNowPayload([]));
});

test('manifest preserves only sitemap-eligible pages and has stable content hashes', () => {
  const pages = new Map([['/', { file: 'index.html', includeInSitemap: true }], ['/models/draft/', { file: 'draft.html', includeInSitemap: false }]]);
  const input = { siteUrl: indexNow.origin, base: '', pages, readPage: file => `<html>${file}</html>` };
  const built = createIndexNowManifest(input);
  assert.deepEqual(Object.keys(built.pages), [url('/')]);
  assert.deepEqual(createIndexNowManifest(input), built);
  assert.equal(createIndexNowManifest({ ...input, base: '/preview' }), null);
  assert.equal(createIndexNowManifest({ ...input, siteUrl: 'https://example.invalid' }), null);
});

test('delta contains new, changed and removed pages, with no unchanged URL', () => {
  const before = manifest({ [url('/')]: hash('a'), [url('/blog/removed/')]: hash('b'), [url('/geometry/')]: hash('c') });
  const after = manifest({ [url('/')]: hash('a'), [url('/blog/new/')]: hash('d'), [url('/geometry/')]: hash('e') });
  assert.deepEqual(changedPublicUrls(before, after), [url('/blog/new/'), url('/blog/removed/'), url('/geometry/')]);
  assert.deepEqual(changedPublicUrls(after, after), []);
  assert.throws(() => changedPublicUrls(before, { ...after, host: 'other.example' }));
});

test('notify verifies the live build and key before one bounded POST', async t => {
  const before = manifest({ [url('/')]: hash('a') }), after = manifest({ [url('/')]: hash('b'), [url('/geometry/')]: hash('c') });
  const calls = [];
  const receipt = await runIndexNow(files(t, before, after), { fetcher: fakeLive(after, { calls, status: 202 }) });
  assert.equal(receipt.http_status, 202);assert.equal(receipt.url_count, 2);assert.equal(receipt.indexing_proven, false);
  const posts = calls.filter(call => call.options.method === 'POST');assert.equal(posts.length, 1);
  assert.deepEqual(JSON.parse(posts[0].options.body), indexNowPayload([url('/'), url('/geometry/')]));
});

test('unchanged and first-manifest deployments never POST a blanket inventory', async t => {
  const after = manifest({ [url('/')]: hash('a') });
  for (const before of [after, null]) {
    const calls = [];
    assert.equal((await runIndexNow(files(t, before, after), { fetcher: fakeLive(after, { calls }) })).url_count, 0);
    assert.equal(calls.some(call => call.options.method === 'POST'), false);
  }
});

test('wrong key, mismatched deployment and provider rejection fail without retry', async t => {
  const before = manifest({ [url('/')]: hash('a') }), after = manifest({ [url('/')]: hash('b') });
  for (const scenario of [{ key: 'wrong' }, { live: before }, { status: 429 }]) {
    const calls = [];
    await assert.rejects(runIndexNow(files(t, before, after), { fetcher: fakeLive(scenario.live ?? after, { ...scenario, calls }) }));
    assert.equal(calls.filter(call => call.options.method === 'POST').length, scenario.status ? 1 : 0);
  }
});

test('bootstrap submits the current verified sitemap once and rejects mixed inventories', async () => {
  const after = manifest({ [url('/')]: hash('a'), [url('/zh/')]: hash('b') });
  const sitemap = `<urlset><url><loc>${url('/')}</loc></url><url><loc>${url('/zh/')}</loc></url></urlset>`;
  assert.deepEqual(sitemapPublicUrls(sitemap), [url('/'), url('/zh/')]);
  const calls = [];
  assert.equal((await runIndexNow(['bootstrap'], { fetcher: fakeLive(after, { sitemap, calls }) })).url_count, 2);
  assert.equal(calls.filter(call => call.options.method === 'POST').length, 1);
  const rejected = [];
  await assert.rejects(runIndexNow(['bootstrap'], { fetcher: fakeLive(after, { sitemap: `<urlset><url><loc>${url('/')}</loc></url></urlset>`, calls: rejected }) }));
  assert.equal(rejected.some(call => call.options.method === 'POST'), false);
  assert.throws(() => sitemapPublicUrls(`<urlset><loc>${url('/geometry/?private=value')}</loc></urlset>`));
});

test('snapshot handles only a real 404 as the initial missing manifest and cannot overwrite', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bike-indexnow-snapshot-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'snapshot.json');
  const args = ['snapshot', '--output', output];
  const result = await runIndexNow(args, { fetcher: fakeLive(null) });
  assert.equal(result.initial_manifest_missing, true);
  await assert.rejects(runIndexNow(args, { fetcher: fakeLive(null) }), /EEXIST/);
  await assert.rejects(runIndexNow(['snapshot', '--output', path.join(directory, 'failed.json')], { fetcher: async () => new Response('', { status: 503 }) }), /503/);
});
