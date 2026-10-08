import test from 'node:test';
import assert from 'node:assert/strict';
import { publicActionManifest } from '../src/lib/analytics-context.mjs';
import { loadDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { handleRequest } from '../worker/index.mjs';
import { regionalPricePayload } from '../src/lib/regional-prices.mjs';

const origin = 'https://chinesebikes.xyz';
const context = { page_path: '/de/models/test-bike/', page_type: 'model', interface_language: 'de',
  model_id: 'test-bike', brand_id: 'test-brand', link_type: 'manufacturer', destination_host: 'maker.example' };
const manifest = { '/models/test-bike/': { model_id: 'test-bike', brand_id: 'test-brand',
  sources: { 'test-source': { link_type: 'manufacturer', destination_host: 'maker.example' } } },
  offers: { 'test-offer': { model_id: 'test-bike', brand_id: 'test-brand',
    link_type: 'manufacturer', destination_host: 'maker.example' } } };
const env = { GA4_ENABLED: 'true', GA4_MEASUREMENT_ID: 'G-TEST12345', GA4_API_SECRET: 'synthetic-secret',
  ANALYTICS_INGEST_TOKEN: 'synthetic-token', ANALYTICS_INGEST_URL: 'https://stats.p0s.eu/ingest/v1',
  ASSETS: { fetch: async () => Response.json(manifest) } };
function request(path, init = {}, country = 'SG') {
  const req = new Request(origin + path, { ...init, headers: { origin,
    'user-agent': 'Mozilla/5.0', 'cf-connecting-ip': '203.0.113.10',
    cookie: 'p0s_ga_cid=123.456; p0s_ga_sid=1780000000', ...init.headers } });
  Object.defineProperty(req, 'cf', { value: { country } });
  return req;
}

test('HTTP redirects preserve path/query and run before assets, cookies or analytics', async () => {
  for (const path of ['/', '/de/models/test-bike?compare=public#compare', '/assets/logo.svg', '/analytics/action']) {
    let calls = 0;
    const response = await handleRequest(new Request(`http://chinesebikes.xyz${path}`, {
      method: path === '/analytics/action' ? 'POST' : 'GET'
    }), { ASSETS: { fetch() { calls++; } } }, { waitUntil() { calls++; } });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), `https://chinesebikes.xyz${path}`);
    assert.equal(await response.text(), '');
    assert.equal(response.headers.has('set-cookie'), false);
    assert.equal(calls, 0);
  }
});

test('built context contains only real catalog models and product-link hosts', () => {
  const data = loadDataset();
  const products = joinProducts(data), candidates = joinCatalogCandidates(data);
  const built = publicActionManifest(products, candidates);
  assert.equal(Object.keys(built).length, products.length + candidates.length);
  let sourceCount = 0;
  for (const [path, model] of Object.entries(built)) {
    assert.match(path, /^\/models\/[a-z0-9][a-z0-9-]{0,149}\/$/);
    assert.equal(path, `/models/${model.model_id}/`);
    for (const [sourceId, source] of Object.entries(model.sources)) {
      assert.match(sourceId, /^[a-z0-9][a-z0-9-]{0,149}$/);
      assert.deepEqual(Object.keys(source).sort(), ['destination_host', 'link_type']);
      assert.ok(['manufacturer', 'retailer', 'marketplace'].includes(source.link_type));
      assert.doesNotMatch(source.destination_host, /[/?#@:]/);
      sourceCount++;
    }
  }
  assert.ok(sourceCount > 100);
  const offers = regionalPricePayload(data).offers;
  const withOffers = publicActionManifest(products, candidates, { offers, sources: data.sources });
  assert.ok(Object.keys(withOffers.offers).length > 0);
  for (const offer of offers.filter(offer => offer.analyticsOfferId)) {
    const resolved = withOffers.offers[offer.id];
    assert.equal(resolved.model_id, offer.productId);
    assert.equal(resolved.destination_host, new URL(offer.source).hostname);
    assert.deepEqual(Object.keys(resolved).sort(), ['brand_id', 'destination_host', 'link_type', 'model_id']);
  }
  const invented = publicActionManifest(products, candidates, { sources: data.sources,
    offers: [{ ...offers[0], productId: 'invented' }, { ...offers[0], sourceId: 'invented' }] });
  assert.deepEqual(invented.offers, {});
});

test('both collectors receive the same resolved product context; private or invented data is rejected', async () => {
  const originalFetch = globalThis.fetch, sent = [], waits = [];
  globalThis.fetch = async (url, init) => { sent.push(JSON.parse(init.body)); return new Response(null, { status: 204 }); };
  const body = { actionId: 'product_outbound_click', pagePath: context.page_path, sourceId: 'test-source' };
  try {
    const response = await handleRequest(request('/analytics/action', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env, { waitUntil: p => waits.push(p) });
    assert.equal(response.status, 204);
    await Promise.all(waits);
    assert.equal(sent.length, 2);
    assert.deepEqual(sent.find(x => x.actionId).context, context);
    const ga = sent.find(x => x.events);
    assert.deepEqual(ga.events[0].params, { session_id: '1780000000', ...context,
      page_location: origin + context.page_path });
    assert.deepEqual(ga.consent, { ad_user_data: 'DENIED', ad_personalization: 'DENIED' });
    for (const update of [{ sourceId: 'made-up-source' }, { sourceId: 'constructor' }, { pagePath: '/models/made-up/' },
      { pagePath: context.page_path + '?private=secret' }, { pagePath: context.page_path + '#private' },
      { destination_host: 'private.example' }, { model_id: 'private' }, { sourceId: {} }]) {
      const rejected = await handleRequest(request('/analytics/action', { method: 'POST',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, ...update }) }),
      env, { waitUntil: p => waits.push(p) });
      assert.equal(rejected.status, 400);
    }
    for (const headers of [{ dnt: '1' }, { 'sec-gpc': '1' }, { cookie: 'p0s_analytics_optout=1' }]) {
      assert.equal((await handleRequest(request('/analytics/action', { method: 'POST',
        headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }),
      env, { waitUntil: p => waits.push(p) })).status, 204);
    }
    const priorChoice = await handleRequest(request('/analytics/action', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, 'DE'),
    env, { waitUntil: p => waits.push(p) });
    assert.equal(priorChoice.status, 204);
    assert.equal(sent.length, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test('catalog offer clicks resolve exact products while preserving the real page and privacy gates', async () => {
  const originalFetch = globalThis.fetch, sent = [], waits = [];
  let manifestReads = 0;
  const offerEnv = { ...env, ASSETS: { fetch: async () => { manifestReads++; return Response.json(manifest); } } };
  globalThis.fetch = async (url, init) => { sent.push(JSON.parse(init.body)); return new Response(null, { status: 204 }); };
  const body = { actionId: 'product_outbound_click', pagePath: '/de/', offerId: 'test-offer' };
  const post = (value, headers = {}, country = 'SG') => handleRequest(request('/analytics/action', {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(value)
  }, country), offerEnv, { waitUntil: p => waits.push(p) });
  try {
    for (const headers of [{ dnt: '1' }, { 'sec-gpc': '1' }, { cookie: 'p0s_analytics_optout=1' }]) {
      assert.equal((await post(body, headers)).status, 204);
    }
    assert.equal((await post(body, {}, 'DE')).status, 204);
    assert.equal(manifestReads, 0);
    assert.equal(sent.length, 0);
    for (const pagePath of ['/', '/zh/', '/de/']) {
      assert.equal((await post({ ...body, pagePath })).status, 204);
      await Promise.all(waits);
      const expected = { page_path: pagePath, page_type: 'catalog',
        interface_language: pagePath === '/zh/' ? 'zh-Hans' : pagePath === '/de/' ? 'de' : 'en',
        ...manifest.offers['test-offer'] };
      const latest = sent.slice(-2);
      assert.deepEqual(latest.find(x => x.actionId).context, expected);
      assert.deepEqual(latest.find(x => x.events).events[0].params,
        { session_id: '1780000000', ...expected, page_location: origin + pagePath });
    }
    for (const update of [{ offerId: 'invented' }, { offerId: 'constructor' }, { offerId: {} },
      { pagePath: '/models/test-bike/' }, { pagePath: '/privacy/' }, { pagePath: '/de/?ship=US' },
      { pagePath: '/de/#private' }, { sourceId: 'test-source' }, { destination_host: 'private.example' }]) {
      assert.equal((await post({ ...body, ...update })).status, 400);
    }
    assert.equal(manifestReads, 1);
    assert.equal(sent.length, 6);
  } finally { globalThis.fetch = originalFetch; }
});

test('comparison size and public page context reach both collectors without selection lists', async () => {
  const originalFetch = globalThis.fetch, sent = [], waits = [];
  globalThis.fetch = async (url, init) => { sent.push(JSON.parse(init.body)); return new Response(null, { status: 204 }); };
  try {
    assert.equal((await handleRequest(request('/analytics/event', { method: 'POST',
      headers: { 'x-analytics-path': '/zh/', 'x-comparison-count': '3' } }),
    env, { waitUntil: p => waits.push(p) })).status, 204);
    await Promise.all(waits);
    const expected = { page_path: '/zh/', page_type: 'catalog', interface_language: 'zh-Hans', comparison_count: 3 };
    assert.deepEqual(sent.find(x => x.eventName).context, expected);
    assert.deepEqual(sent.find(x => x.events).events[0].params,
      { session_id: '1780000000', ...expected, page_location: origin + '/zh/' });
    for (const count of ['0', '1', '11', '2.0', '02', 'bike-a,bike-b', 'user@example.com']) {
      assert.equal((await handleRequest(request('/analytics/event', { method: 'POST',
        headers: { 'x-analytics-path': '/', 'x-comparison-count': count } }), env,
      { waitUntil: p => waits.push(p) })).status, 400);
    }
    assert.equal(sent.length, 2);
  } finally { globalThis.fetch = originalFetch; }
});
