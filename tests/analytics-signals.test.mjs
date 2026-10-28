import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CONTRACT_VERSION } from '../worker/ingest-client.mjs';
import { handleRequest, ingestAnalytics, ingestStage } from '../worker/index.mjs';

const origin = 'https://chinesebikes.xyz';
const collector = { ANALYTICS_INGEST_URL: 'https://stats.p0s.eu/ingest/v1', ANALYTICS_INGEST_TOKEN: 'test-token' };
const gaEnv = { ...collector, GA4_ENABLED: 'true', GA4_MEASUREMENT_ID: 'G-TEST12345', GA4_API_SECRET: 'test-secret' };
const session = 'p0s_ga_cid=123.456; p0s_ga_sid=1780000000';
const noWait = { sleep: async () => {} };

function makeRequest(path, init = {}, cf = { country: 'SG' }) {
  const request = new Request(origin + path, init);
  Object.defineProperty(request, 'cf', { value: cf, configurable: true });
  return request;
}

function signalRequest(signal, extra = {}, cf) {
  return makeRequest('/site-events/engagement', { method: 'POST', headers: {
    origin, 'x-analytics-path': '/models/example-bike/', 'cf-connecting-ip': '203.0.113.10',
    'user-agent': 'Mozilla/5.0', ...(signal === null ? {} : { 'x-analytics-signal': signal }), ...extra
  } }, cf);
}

// Records every outgoing request; the collector answers 204 and GA answers gaStatus.
async function capture(run, { gaStatus = 204 } = {}) {
  const originalFetch = globalThis.fetch, sent = [], waits = [];
  globalThis.fetch = async (url, init) => {
    const target = new URL(String(url));
    sent.push({ route: target.hostname === 'stats.p0s.eu' ? target.pathname : 'ga', body: JSON.parse(init.body) });
    if (target.hostname !== 'stats.p0s.eu' && gaStatus instanceof Error) throw gaStatus;
    return new Response(null, { status: target.hostname === 'stats.p0s.eu' ? 204 : gaStatus });
  };
  try {
    const responses = await run((promise) => waits.push(promise));
    await Promise.all(waits);
    return { sent, waits, responses };
  } finally { globalThis.fetch = originalFetch; }
}

test('the vendored ingest client is the frozen contract file, unchanged', () => {
  const source = readFileSync(new URL('../worker/ingest-client.mjs', import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'),
    '78eeaf19a82ff96391c3b157a7433d4b01c0245739ee1db07a401ee338e2240a');
  assert.equal(CONTRACT_VERSION, 'p0s-ingest-2-20261028');
});

test('each delivery has a fresh event ID and one retry only when the collector may not have it', async () => {
  const payload = { hostname: 'chinesebikes.xyz', path: '/', ip: '203.0.113.10', userAgent: 'Mozilla/5.0' };
  const attempts = async (...statuses) => {
    const calls = [];
    const delivered = await ingestAnalytics(payload, collector, async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      const status = statuses.shift();
      if (status === 'network') throw new TypeError('network');
      if (status === 'timeout') return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('abort'))));
      return new Response(null, { status });
    }, { ...noWait, timeoutMs: 5 });
    return { delivered, calls };
  };
  const ok = await attempts(204);
  assert.equal(ok.delivered, true);
  assert.equal(ok.calls.length, 1);
  assert.equal(ok.calls[0].url, collector.ANALYTICS_INGEST_URL);
  assert.match(ok.calls[0].body.eventId, /^[0-9a-f]{32}$/);
  assert.equal(Object.hasOwn(ok.calls[0].body, 'attempt'), false);
  assert.notEqual((await attempts(204)).calls[0].body.eventId, ok.calls[0].body.eventId);

  for (const first of [503, 500, 502, 504, 'network', 'timeout']) {
    const retried = await attempts(first, 204);
    assert.equal(retried.delivered, true, String(first));
    assert.equal(retried.calls.length, 2, String(first));
    assert.deepEqual(retried.calls[1].body, { ...retried.calls[0].body, attempt: 2 });
  }
  // A gateway 409 means possibly stored or a possible loss: never resent.
  assert.equal((await attempts(503, 409)).calls.length, 2);
  assert.equal((await attempts(503, 503)).delivered, false);
  for (const final of [400, 401, 409, 413, 415, 429, 302]) {
    const once = await attempts(final);
    assert.equal(once.delivered, false, String(final));
    assert.equal(once.calls.length, 1, String(final));
  }
  for (const env of [{}, { ...collector, ANALYTICS_INGEST_URL: 'http://stats.p0s.eu/ingest/v1' }, { ANALYTICS_INGEST_URL: collector.ANALYTICS_INGEST_URL }]) {
    assert.equal(await ingestAnalytics(payload, env, async () => assert.fail('not configured')), false);
  }
  assert.equal(await ingestStage('ga_ok', collector, async (url, init) => {
    assert.equal(url, 'https://stats.p0s.eu/ingest/stage/v1');
    assert.deepEqual(Object.keys(JSON.parse(init.body)).sort(), ['eventId', 'stage']);
    return new Response(null, { status: 204 });
  }), true);
});

test('the signal relay sends bootstrap as a bare stage, and visible or engaged as page signals', async () => {
  const { sent, responses } = await capture(async (waitUntil) => {
    const results = [];
    for (const request of [signalRequest('bootstrap'), signalRequest('visible'), signalRequest('engaged'),
      signalRequest(null), signalRequest('bootstrap', { 'x-measurement-qa': '1' }),
      signalRequest('visible', { 'x-measurement-qa': '1' })]) {
      results.push(await handleRequest(request, collector, { waitUntil }));
    }
    return results;
  });
  assert.deepEqual(responses.map((response) => response.status), [204, 204, 204, 204, 204, 204]);
  const visitor = { hostname: 'chinesebikes.xyz', path: '/models/example-bike/', ip: '203.0.113.10',
    userAgent: 'Mozilla/5.0', country: 'SG' };
  assert.deepEqual(sent.map(({ route, body }) => { const { eventId, ...rest } = body; return [route, rest]; }), [
    ['/ingest/stage/v1', { stage: 'bootstrap' }],
    ['/ingest/v1', { ...visitor, eventName: 'page_visible' }],
    ['/ingest/v1', { ...visitor, eventName: 'page_engaged' }],
    ['/ingest/v1', { ...visitor, eventName: 'page_engaged' }],
    ['/ingest/stage/v1', { stage: 'bootstrap', qa: true }],
    ['/ingest/v1', { ...visitor, eventName: 'page_visible', qa: true }]
  ]);
  assert.equal(new Set(sent.map(({ body }) => body.eventId)).size, sent.length);

  for (const signal of ['page_visible', 'hidden', 'Bootstrap', 'visible,engaged', '']) {
    const invalid = await capture(async (waitUntil) => handleRequest(signalRequest(signal), collector, { waitUntil }));
    assert.equal(invalid.responses.status, 400, signal);
    assert.equal(invalid.sent.length, 0, signal);
  }
});

test('refusals, prefetch, bots and private paths send no signal or stage', async () => {
  const verifiedBot = { country: 'SG', botManagement: { verifiedBot: true } };
  for (const [extra, cf] of [
    [{ dnt: '1' }], [{ 'sec-gpc': '1' }], [{ cookie: 'p0s_analytics_optout=1' }],
    [{}, { country: 'DE' }], [{ 'sec-purpose': 'prefetch;prerender' }],
    [{ 'user-agent': 'ExampleBot/1.0' }], [{ 'user-agent': 'HeadlessChrome/120' }], [{}, verifiedBot]
  ]) {
    for (const signal of ['bootstrap', 'visible', 'engaged']) {
      const { sent, waits, responses } = await capture(async (waitUntil) =>
        handleRequest(signalRequest(signal, extra, cf), gaEnv, { waitUntil }));
      assert.equal(responses.status, 204, `${signal} ${JSON.stringify(extra)}`);
      assert.equal(waits.length + sent.length, 0, `${signal} ${JSON.stringify(extra)}`);
    }
  }
  const privatePath = await capture(async (waitUntil) =>
    handleRequest(signalRequest('bootstrap', { 'x-analytics-path': '/account/' }), collector, { waitUntil }));
  assert.equal(privatePath.responses.status, 400);
  assert.equal(privatePath.sent.length, 0);
  // Without Cloudflare's bot signal the request is unclassified, not presumed a bot.
  const unavailable = await capture(async (waitUntil) =>
    handleRequest(signalRequest('visible', {}, { country: 'SG', botManagement: {} }), collector, { waitUntil }));
  assert.equal(unavailable.sent.length, 1);
});

test('GA forwarding sends once and reports one fixed stage without inventing an identity', async () => {
  const productAction = (cookie, qa = false) => makeRequest('/site-events/action', { method: 'POST', headers: {
    origin, 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0', 'cf-connecting-ip': '203.0.113.10',
    ...(cookie ? { cookie } : {}), ...(qa ? { 'x-measurement-qa': '1' } : {})
  }, body: JSON.stringify({ actionId: 'product_outbound_click' }) });
  const run = async (cookie, options = {}, env = gaEnv, qa = false) => (await capture(async (waitUntil) =>
    handleRequest(productAction(cookie, qa), env, { waitUntil }), options)).sent;
  const stages = (sent) => sent.filter(({ route }) => route === '/ingest/stage/v1').map(({ body }) => body.stage);
  const gaCalls = (sent) => sent.filter(({ route }) => route === 'ga').length;

  for (const cookie of ['', 'p0s_ga_cid=123.456', 'p0s_ga_cid=bad; p0s_ga_sid=1780000000', 'p0s_ga_cid=123.456; p0s_ga_sid=bad']) {
    const sent = await run(cookie);
    assert.equal(gaCalls(sent), 0, cookie);
    assert.deepEqual(stages(sent), ['ga_skip_no_session'], cookie);
    assert.equal(sent.filter(({ route }) => route === '/ingest/action/v1').length, 1, cookie);
  }
  for (const [gaStatus, stage] of [[204, 'ga_ok'], [400, 'ga_fail_definite'], [302, 'ga_fail_definite'],
    [503, 'ga_fail_uncertain'], [new TypeError('network'), 'ga_fail_uncertain']]) {
    const sent = await run(session, { gaStatus });
    assert.equal(gaCalls(sent), 1, stage);
    assert.deepEqual(stages(sent), [stage]);
    assert.deepEqual(Object.keys(sent.find(({ route }) => route === '/ingest/stage/v1').body).sort(), ['eventId', 'stage']);
  }
  // GA disabled: no GA attempt and no GA stage. QA: never a GA business event.
  assert.deepEqual(stages(await run(session, {}, collector)), []);
  const qa = await run(session, {}, gaEnv, true);
  assert.equal(gaCalls(qa), 0);
  assert.deepEqual(stages(qa), []);
  const { eventId, ...qaAction } = qa.find(({ route }) => route === '/ingest/action/v1').body;
  assert.deepEqual(qaAction, { actionId: 'product_outbound_click', qa: true });
});

test('a no-JavaScript visit keeps one server page observation and adds no stage', async () => {
  const assets = { fetch: async () => new Response('<!doctype html><html><body><main>Page</main></body></html>', {
    headers: { 'content-type': 'text/html; charset=utf-8' } }) };
  const { sent, responses } = await capture(async (waitUntil) => handleRequest(makeRequest('/models/example-bike/', {
    headers: { 'cf-connecting-ip': '203.0.113.10', 'user-agent': 'Mozilla/5.0' }
  }), { ...gaEnv, ASSETS: assets }, { waitUntil }));
  assert.match(await responses.text(), /<body data-analytics-allowed="true">/);
  assert.deepEqual(sent.map(({ route }) => route), ['/ingest/v1']);
  assert.equal(Object.hasOwn(sent[0].body, 'eventName'), false);
});

test('GA identity continues for one browser and stays separate between browsers', async () => {
  const config = (cookie) => handleRequest(makeRequest('/analytics/ga-config', {
    headers: { 'user-agent': 'Mozilla/5.0', ...(cookie ? { cookie } : {}) } }), gaEnv);
  const first = await config(), second = await config();
  const firstId = (await first.json()).clientId, secondId = (await second.json()).clientId;
  assert.notEqual(firstId, secondId);
  const returning = await config(`p0s_ga_cid=${firstId}`);
  assert.equal((await returning.json()).clientId, firstId);
  assert.equal(returning.headers.get('set-cookie'), null);
});
