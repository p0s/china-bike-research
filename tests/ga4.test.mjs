import test from 'node:test';
import assert from 'node:assert/strict';
import { startGa4 } from '../assets/ga4.js';
import { ga4Identity, ga4SiteOpenPayload, sendGa4 } from '../worker/ga4.mjs';
import { handleRequest } from '../worker/index.mjs';

const env = {
  GA4_ENABLED: 'true', GA4_MEASUREMENT_ID: 'G-TEST12345', GA4_API_SECRET: 'test-secret',
  ANALYTICS_INGEST_URL: 'https://stats.p0s.eu/ingest/v1', ANALYTICS_INGEST_TOKEN: 'test-token'
};

function documentRequest(cookie = '', extraHeaders = {}) {
  const request = new Request('https://chinesebikes.xyz/models/example/?q=private', {
    headers: { 'cf-connecting-ip': '203.0.113.10', 'user-agent': 'Mozilla/5.0', cookie, ...extraHeaders }
  });
  Object.defineProperty(request, 'cf', { value: { country: 'SG' } });
  return request;
}

function assets() {
  return { fetch: async () => new Response('<!doctype html>', {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=120' }
  }) };
}

test('GA identity reuses valid first-party cookies and rejects invalid ones', () => {
  const input = documentRequest('p0s_ga_cid=123.456; p0s_ga_sid=1780000000');
  assert.deepEqual(ga4Identity(input), { clientId: '123.456', sessionId: '1780000000' });
  const fresh = ga4Identity(documentRequest('p0s_ga_cid=bad; p0s_ga_sid=bad'), 1_780_000_000_000);
  assert.match(fresh.clientId, /^[1-9]\d+\.[1-9]\d+$/);
  assert.equal(fresh.sessionId, '1780000000');
});

test('eligible document schedules one minimized GA site_open alongside Umami', async () => {
  const sent = [];
  const waits = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    sent.push({ url: String(url), init });
    return new Response(null, { status: 204 });
  };
  try {
    const response = await handleRequest(documentRequest(), { ...env, ASSETS: assets() }, {
      waitUntil: (promise) => waits.push(promise)
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.getSetCookie().length, 2);
    const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
    assert.match(cookies, /p0s_ga_cid=/);
    assert.match(cookies, /p0s_ga_sid=/);
    await Promise.all(waits);
    assert.equal(sent.length, 2);
    const ga = sent.find((item) => item.url.startsWith('https://www.google-analytics.com/mp/collect?'));
    assert.ok(ga);
    assert.deepEqual(JSON.parse(ga.init.body).events.map((event) => event.name), ['site_open']);
    const body = JSON.parse(ga.init.body);
    assert.equal(body.events[0].params.page_location, 'https://chinesebikes.xyz/models/example/');
    assert.equal(body.user_location.country_id, 'SG');
    assert.doesNotMatch(ga.init.body, /private|203\.0\.113|Mozilla/);

    const config = await handleRequest(new Request('https://chinesebikes.xyz/analytics/ga-config', {
      headers: { cookie: cookies, 'user-agent': 'Mozilla/5.0' }
    }), env);
    assert.equal(config.status, 200);
    assert.equal(config.headers.get('cache-control'), 'no-store');
    const browserIds = await config.json();
    assert.equal(browserIds.clientId, body.client_id);
    assert.equal(browserIds.sessionId, body.events[0].params.session_id);
    assert.equal(browserIds.measurementId, env.GA4_MEASUREMENT_ID);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('excluded requests do not receive GA cookies or dispatch and config stays closed', async () => {
  for (const header of [{ dnt: '1' }, { 'sec-gpc': '1' }, { cookie: 'p0s_analytics_optout=1' }]) {
    const waits = [];
    const response = await handleRequest(documentRequest('', header), { ...env, ASSETS: assets() }, {
      waitUntil: (promise) => waits.push(promise)
    });
    assert.equal(response.headers.getSetCookie().length, 0);
    assert.equal(waits.length, 0);
  }
  const noCookie = await handleRequest(new Request('https://chinesebikes.xyz/analytics/ga-config'), env);
  assert.equal(noCookie.status, 204);
  assert.equal(noCookie.headers.get('cache-control'), 'no-store');
});

test('GA action relay uses existing identity only, and opt-out clears identifiers', async () => {
  const originalFetch = globalThis.fetch;
  const sent = [];
  const waits = [];
  globalThis.fetch = async (url, init) => {
    sent.push({ url: String(url), init });
    return new Response(null, { status: 204 });
  };
  try {
    const cookie = 'p0s_ga_cid=123.456; p0s_ga_sid=1780000000';
    const response = await handleRequest(new Request('https://chinesebikes.xyz/analytics/action', {
      method: 'POST',
      headers: { origin: 'https://chinesebikes.xyz', 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0', cookie },
      body: JSON.stringify({ actionId: 'product_outbound_click' })
    }), env, { waitUntil: (promise) => waits.push(promise) });
    assert.equal(response.status, 204);
    await Promise.all(waits);
    const ga = sent.filter((item) => item.url.startsWith('https://www.google-analytics.com/mp/collect?'));
    assert.equal(ga.length, 1);
    assert.equal(JSON.parse(ga[0].init.body).events[0].name, 'product_outbound_click');
    assert.equal(JSON.parse(ga[0].init.body).client_id, '123.456');

    const optOut = await handleRequest(new Request('https://chinesebikes.xyz/analytics/opt-out', {
      method: 'POST', headers: { origin: 'https://chinesebikes.xyz', cookie }
    }), env);
    const cleared = optOut.headers.getSetCookie();
    assert.ok(cleared.some((value) => value.startsWith('p0s_ga_cid=;')));
    assert.ok(cleared.some((value) => value.startsWith('p0s_ga_sid=;')));
    assert.ok(cleared.some((value) => value.startsWith('_ga=;')));
    assert.ok(cleared.some((value) => value.startsWith('_ga_TEST12345=;')));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('browser tag uses shared IDs and queues one bounded page_view', async () => {
  const scripts = [];
  const win = {
    location: { hostname: 'chinesebikes.xyz', origin: 'https://chinesebikes.xyz', pathname: '/models/example/', search: '?q=private' },
    navigator: { doNotTrack: '0' },
    fetch: async () => new Response(JSON.stringify({
      measurementId: env.GA4_MEASUREMENT_ID, clientId: '123.456', sessionId: '1780000000'
    }), { headers: { 'content-type': 'application/json' } }),
    document: {
      referrer: 'https://other.example/page?private=1',
      createElement: () => ({}),
      head: { appendChild: (script) => scripts.push(script) }
    }
  };
  assert.equal(await startGa4(win), true);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, '/gtag/js?id=G-TEST12345');
  const config = win.dataLayer.find((args) => args[0] === 'config');
  assert.equal(config[2].client_id, '123.456');
  assert.equal(config[2].session_id, '1780000000');
  assert.equal(config[2].send_page_view, false);
  const pageviews = win.dataLayer.filter((args) => args[0] === 'event' && args[1] === 'page_view');
  assert.equal(pageviews.length, 1);
  assert.equal(pageviews[0][2].page_location, 'https://chinesebikes.xyz/models/example/');
  assert.equal(pageviews[0][2].page_referrer, 'https://other.example');
  assert.equal(await startGa4({ ...win, navigator: { doNotTrack: '1' } }), false);
  assert.equal(await startGa4({ ...win, navigator: { globalPrivacyControl: true } }), false);
});

test('Measurement Protocol failure never throws or reports receipt as processing proof', async () => {
  const payload = ga4SiteOpenPayload({ path: '/', country: 'SG' }, { clientId: '123.456', sessionId: '1780000000' });
  assert.equal(await sendGa4(payload, env, async () => new Response(null, { status: 204 })), true);
  assert.equal(await sendGa4(payload, env, async () => new Response(null, { status: 500 })), false);
  assert.equal(await sendGa4(payload, env, async () => { throw new Error('blocked'); }), false);
});
