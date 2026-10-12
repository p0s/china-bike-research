import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { indexNow, indexNowKeyUrl, validatePublicUrl, createIndexNowManifest, changedPublicUrls, sitemapPublicUrls, indexNowPayload } from '../src/lib/indexnow.mjs';
import { runIndexNow } from '../scripts/indexnow.mjs';
import { observeManifest, readDeliveryState, writeDeliveryState, validateDeliveryState } from '../src/lib/indexnow-state.mjs';

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

test('wrong key, persistent mismatch and provider rejection never cause a POST retry', async t => {
  const before = manifest({ [url('/')]: hash('a') }), after = manifest({ [url('/')]: hash('b') });
  for (const scenario of [{ key: 'wrong' }, { live: before }, { status: 429 }]) {
    const calls = [];
    await assert.rejects(runIndexNow(files(t, before, after), { fetcher: fakeLive(scenario.live ?? after, { ...scenario, calls }), pause: async () => {} }));
    assert.equal(calls.filter(call => call.options.method === 'POST').length, scenario.status ? 1 : 0);
  }
});

function statefulFiles(t, before, after, stateFile) {
  const args = files(t, before, after);
  stateFile ??= path.join(path.dirname(args[2]), 'state.json');
  if (!fs.existsSync(stateFile)) writeDeliveryState(stateFile, observeManifest(null, before));
  return [...args, '--state', stateFile];
}

test('a stale edge gets one bounded read retry before exactly one POST', async t => {
  const before = manifest({ [url('/')]: hash('a') }), after = manifest({ [url('/')]: hash('b') });
  const calls = [], delays = []; let reads = 0;
  const ready = fakeLive(after, { calls });
  const fetcher = async (target, options) => {
    if (target.endsWith(indexNow.manifestPath) && reads++ === 0) { calls.push({ target, options }); return Response.json(before); }
    return ready(target, options);
  };
  const result = await runIndexNow(files(t, before, after), { fetcher, pause: async delay => delays.push(delay) });
  assert.equal(result.url_count, 1);
  assert.deepEqual(delays, [30_000]);
  assert.equal(reads, 2);
  assert.equal(calls.filter(call => call.options.method === 'POST').length, 1);
});

test('persistent mismatch stops after two reads, sends nothing and preserves state', async t => {
  const before = manifest({ [url('/')]: hash('a') }), after = manifest({ [url('/')]: hash('b') });
  const args = statefulFiles(t, before, after), stateFile = args.at(-1), original = fs.readFileSync(stateFile);
  const calls = [], delays = [];
  await assert.rejects(runIndexNow(args, { fetcher: fakeLive(before, { calls }), pause: async delay => delays.push(delay) }), /does not match/);
  assert.deepEqual(fs.readFileSync(stateFile), original);
  assert.equal(calls.filter(call => call.target.endsWith(indexNow.manifestPath)).length, 2);
  assert.equal(calls.some(call => call.options.method === 'POST'), false);
  assert.deepEqual(delays, [30_000]);
});

test('manifest equality uses canonical URL hashes rather than JSON property ordering', async t => {
  const before = manifest({ [url('/')]: hash('a') });
  const after = manifest({ [url('/')]: hash('a'), [url('/geometry/')]: hash('b') });
  const reordered = { pages: { [url('/geometry/')]: hash('b'), [url('/')]: hash('a') }, host: indexNow.host, schema_version: 1 };
  assert.equal((await runIndexNow(files(t, before, after), { fetcher: fakeLive(reordered), pause: async () => assert.fail('not stale') })).url_count, 1);
});

test('a failed send retains its delta and holds later sends until explicit review; acknowledgement then makes a no-op', async t => {
  const before = manifest({ [url('/')]: hash('a'), [url('/blog/removed/')]: hash('a') });
  const after = manifest({ [url('/')]: hash('b'), [url('/blog/new/')]: hash('b') });
  const first = statefulFiles(t, before, after), stateFile = first.at(-1), rejected = [];
  await assert.rejects(runIndexNow(first, { fetcher: fakeLive(after, { calls: rejected, status: 503 }) }), /did not accept/);
  const delta = [url('/'), url('/blog/new/'), url('/blog/removed/')];
  assert.deepEqual(readDeliveryState(stateFile).pending_urls, delta);
  assert.equal(readDeliveryState(stateFile).acknowledged_manifest, null);
  assert.equal(rejected.filter(call => call.options.method === 'POST').length, 1);

  const second = statefulFiles(t, after, after, stateFile), accepted = [];
  await assert.rejects(runIndexNow(second, { fetcher: async () => assert.fail('held state must not fetch or POST') }), /held or interrupted/);
  // Simulate an operator's explicit review and release of this known rejection; production never clears holds automatically.
  writeDeliveryState(stateFile, { ...readDeliveryState(stateFile), attempt: null });
  const receipt = await runIndexNow(second, { fetcher: fakeLive(after, { calls: accepted, status: 202 }) });
  assert.deepEqual(JSON.parse(accepted.find(call => call.options.method === 'POST').options.body).urlList, delta);
  const state = readDeliveryState(stateFile);
  assert.deepEqual(state.pending_urls, []);
  assert.deepEqual(state.acknowledged_manifest, after);
  assert.deepEqual(state.last_receipt, { http_status: 202, url_count: 3, submitted_at: receipt.submitted_at });
  assert.equal(Object.hasOwn(state.last_receipt, 'response'), false);
  const unchanged = [];
  assert.equal((await runIndexNow(statefulFiles(t, after, after, stateFile), { fetcher: fakeLive(after, { calls: unchanged }) })).url_count, 0);
  assert.equal(unchanged.some(call => call.options.method === 'POST'), false);
});

test('after explicit rejection review, later production changes merge with pending failures including reversions', async t => {
  const a = manifest({ [url('/')]: hash('a') }), b = manifest({ [url('/')]: hash('b'), [url('/blog/new/')]: hash('b') });
  const first = statefulFiles(t, a, b), stateFile = first.at(-1);
  await assert.rejects(runIndexNow(first, { fetcher: fakeLive(b, { status: 429 }) }));
  writeDeliveryState(stateFile, { ...readDeliveryState(stateFile), attempt: null });
  const c = manifest({ [url('/')]: hash('a'), [url('/geometry/')]: hash('c') });
  const calls = [];
  const result = await runIndexNow(statefulFiles(t, b, c, stateFile), { fetcher: fakeLive(c, { calls }) });
  assert.equal(result.url_count, 3);
  assert.deepEqual(JSON.parse(calls.find(call => call.options.method === 'POST').options.body).urlList,
    [url('/'), url('/blog/new/'), url('/geometry/')]);
});

test('all rejected HTTP outcomes hold the exact attempt and never replay on later runs', async t => {
  const a = manifest({ [url('/')]: hash('a') }), b = manifest({ [url('/')]: hash('b') });
  for (const status of [400, 403, 422, 429, 503]) {
    const args = statefulFiles(t, a, b), stateFile = args.at(-1), calls = [];
    await assert.rejects(runIndexNow(args, { fetcher: fakeLive(b, { status, calls }) }));
    const state = readDeliveryState(stateFile);
    assert.equal(state.attempt.phase, 'held'); assert.equal(state.attempt.http_status, status);
    assert.equal(state.attempt.outcome, 'rejected'); assert.match(state.attempt.request_sha256, /^[a-f0-9]{64}$/);
    assert.match(state.attempt.manifest_sha256, /^[a-f0-9]{64}$/);
    assert.deepEqual(state.attempt.urls, [url('/')]); assert.deepEqual(state.pending_urls, [url('/')]);
    assert.equal(calls.filter(call => call.options.method === 'POST').length, 1);
    await assert.rejects(runIndexNow(args, { fetcher: async () => assert.fail('held state must not fetch') }), /held or interrupted/);
  }
});

test('in-flight request is durable before transport; timeout and process interruption hold without replay', async t => {
  const a = manifest({ [url('/')]: hash('a'), [url('/blog/removed/')]: hash('a') }), b = manifest({ [url('/')]: hash('b') });
  const args = statefulFiles(t, a, b), stateFile = args.at(-1), calls = [];
  const ready = fakeLive(b, { calls });
  let started;
  const fetcher = async (target, options) => {
    if (options.method === 'POST') {
      started = readDeliveryState(stateFile).attempt;
      assert.equal(started.phase, 'in_flight');
      assert.deepEqual(started.urls, [url('/'), url('/blog/removed/')]);
      throw new DOMException('Test timeout', 'TimeoutError');
    }
    return ready(target, options);
  };
  await assert.rejects(runIndexNow(args, { fetcher }), /Test timeout/);
  const held = readDeliveryState(stateFile);
  assert.equal(held.attempt.outcome, 'ambiguous'); assert.equal(held.attempt.http_status, null);
  assert.equal(held.attempt.request_sha256, started.request_sha256);
  await assert.rejects(runIndexNow(args, { fetcher: async () => assert.fail('ambiguous outcome must not replay') }), /held or interrupted/);
  // Reconstruct a crash immediately after the durable in-flight write, before any response/acknowledgement.
  writeDeliveryState(stateFile, { ...held, attempt: started });
  await assert.rejects(runIndexNow(args, { fetcher: async () => assert.fail('interrupted POST must not replay') }), /held or interrupted/);
});

test('snapshot retains a held attempt fingerprint and deletion proof while accumulating later public changes', async t => {
  const a = manifest({ [url('/')]: hash('a'), [url('/blog/removed/')]: hash('a') }), b = manifest({ [url('/')]: hash('b') });
  const args = statefulFiles(t, a, b), stateFile = args.at(-1);
  await assert.rejects(runIndexNow(args, { fetcher: fakeLive(b, { status: 403 }) }));
  const attempt = readDeliveryState(stateFile).attempt;
  const c = manifest({ [url('/')]: hash('c'), [url('/geometry/')]: hash('c') });
  await runIndexNow(['snapshot', '--output', `${args[2]}.held`, '--state', stateFile], { fetcher: fakeLive(c) });
  const state = readDeliveryState(stateFile);
  assert.deepEqual(state.attempt, attempt);
  assert.deepEqual(state.pending_urls, [url('/'), url('/blog/removed/'), url('/geometry/')]);
  assert.equal(state.acknowledged_manifest, null);
});

test('a failed deployment snapshots state but cannot submit or acknowledge; a later snapshot recovers a verification delay', async t => {
  const a = manifest({ [url('/')]: hash('a') }), b = manifest({ [url('/')]: hash('b') });
  const args = statefulFiles(t, a, b), stateFile = args.at(-1), directory = path.dirname(stateFile), calls = [];
  // Deployment does not run notify on failure. The snapshot operation is GET-only.
  await runIndexNow(['snapshot', '--output', path.join(directory, 'failed-deploy-before.json'), '--state', stateFile], { fetcher: fakeLive(a, { calls }) });
  assert.equal(calls.some(call => call.options.method === 'POST'), false);
  assert.equal(readDeliveryState(stateFile).acknowledged_manifest, null);
  await assert.rejects(runIndexNow(args, { fetcher: fakeLive(a), pause: async () => {} }), /does not match/);
  // When the deployed manifest becomes visible, the retained pre-deployment observation recovers its delta.
  await runIndexNow(['snapshot', '--output', path.join(directory, 'next-before.json'), '--state', stateFile], { fetcher: fakeLive(b) });
  assert.deepEqual(readDeliveryState(stateFile).pending_urls, [url('/')]);
  assert.equal((await runIndexNow(statefulFiles(t, b, b, stateFile), { fetcher: fakeLive(b) })).url_count, 1);
});

test('wrong key queues a verified delta but never sends; corrupt or missing durable state fails closed', async t => {
  const a = manifest({ [url('/')]: hash('a') }), b = manifest({ [url('/')]: hash('b') });
  const args = statefulFiles(t, a, b), stateFile = args.at(-1), calls = [];
  await assert.rejects(runIndexNow(args, { fetcher: fakeLive(b, { key: 'wrong', calls }) }), /key file/);
  assert.deepEqual(readDeliveryState(stateFile).pending_urls, [url('/')]);
  assert.equal(calls.some(call => call.options.method === 'POST'), false);
  fs.unlinkSync(stateFile);
  await assert.rejects(runIndexNow(args, { fetcher: async () => assert.fail('missing state must not fetch') }), /Missing/);
  fs.writeFileSync(stateFile, '{');
  await assert.rejects(runIndexNow(args, { fetcher: async () => assert.fail('invalid state must not fetch') }));
});

test('delivery artifacts reject private fields, invalid URLs, unrecorded changes and missing production manifest', async t => {
  const a = manifest({ [url('/')]: hash('a') });
  const state = observeManifest(null, a);
  assert.throws(() => validateDeliveryState({ ...state, token: 'not-allowed' }));
  assert.throws(() => validateDeliveryState({ ...state, observed_manifest: { ...a, private: 'not-allowed' } }));
  assert.throws(() => validateDeliveryState({ ...state, pending_urls: [url('/?query=private')] }));
  assert.throws(() => validateDeliveryState({ ...state, acknowledged_manifest: a }));
  assert.throws(() => observeManifest(state, null));
  const args = statefulFiles(t, a, a), stateFile = args.at(-1), original = fs.readFileSync(stateFile);
  await assert.rejects(runIndexNow(['snapshot', '--output', `${args[2]}.missing`, '--state', stateFile], { fetcher: fakeLive(null) }), /Previously public/);
  assert.deepEqual(fs.readFileSync(stateFile), original);
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
