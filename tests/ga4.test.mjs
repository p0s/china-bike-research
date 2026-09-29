import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionRequestUrl, startGa4 } from '../assets/ga4.js';
import { layout } from '../src/lib/html.mjs';
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
  const fresh = ga4Identity(documentRequest('p0s_ga_cid=bad; p0s_ga_sid=bad'));
  assert.match(fresh.clientId, /^[1-9]\d+\.[1-9]\d+$/);
  assert.equal(fresh.sessionId, null);
  assert.equal(ga4Identity(documentRequest('p0s_ga_cid=bad; p0s_ga_sid=1780000000')).sessionId, null);
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
    assert.equal(response.headers.getSetCookie().length, 1);
    const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
    assert.match(cookies, /p0s_ga_cid=/);
    assert.doesNotMatch(cookies, /p0s_ga_sid=/);
    await Promise.all(waits);
    assert.equal(sent.length, 2);
    const ga = sent.find((item) => item.url.startsWith('https://www.google-analytics.com/mp/collect?'));
    assert.ok(ga);
    assert.deepEqual(JSON.parse(ga.init.body).events.map((event) => event.name), ['site_open']);
    const body = JSON.parse(ga.init.body);
    assert.equal(body.events[0].params.page_location, 'https://chinesebikes.xyz/models/example/');
    assert.equal(body.user_location.country_id, 'SG');
    assert.equal(Object.hasOwn(body.events[0].params, 'session_id'), false);
    assert.doesNotMatch(ga.init.body, /private|203\.0\.113|Mozilla/);

    const config = await handleRequest(new Request('https://chinesebikes.xyz/analytics/ga-config', {
      headers: { cookie: cookies, 'user-agent': 'Mozilla/5.0' }
    }), env);
    assert.equal(config.status, 200);
    assert.equal(config.headers.get('cache-control'), 'no-store');
    const browserIds = await config.json();
    assert.equal(browserIds.clientId, body.client_id);
    assert.equal(Object.hasOwn(browserIds, 'sessionId'), false);
    assert.equal(browserIds.measurementId, env.GA4_MEASUREMENT_ID);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a verified browser session is persisted and used on later server events', async () => {
  const cookies = 'p0s_ga_cid=123.456';
  const sync = await handleRequest(new Request('https://chinesebikes.xyz/analytics/ga-session', {
    method: 'POST',
    headers: { origin: 'https://chinesebikes.xyz', cookie: cookies, 'user-agent': 'Mozilla/5.0', 'x-ga4-session-id': '1780000000' }
  }), env);
  assert.equal(sync.status, 204);
  assert.match(sync.headers.get('set-cookie'), /^p0s_ga_sid=1780000000;/);
  assert.equal(sync.headers.get('cache-control'), 'no-store');
  for (const headers of [
    { origin: 'https://elsewhere.example', cookie: cookies, 'x-ga4-session-id': '1780000000' },
    { origin: 'https://chinesebikes.xyz', cookie: cookies, 'x-ga4-session-id': 'bad' },
    { origin: 'https://chinesebikes.xyz', 'x-ga4-session-id': '1780000000' }
  ]) {
    const rejected = await handleRequest(new Request('https://chinesebikes.xyz/analytics/ga-session', {
      method: 'POST', headers
    }), env);
    assert.ok(rejected.status === 400 || rejected.status === 403);
  }
  const bodyRejected = await handleRequest(new Request('https://chinesebikes.xyz/analytics/ga-session', {
    method: 'POST', headers: { origin: 'https://chinesebikes.xyz', cookie: cookies, 'x-ga4-session-id': '1780000000' }, body: 'private'
  }), env);
  assert.equal(bodyRejected.status, 400);
  for (const excluded of [{ dnt: '1' }, { 'sec-gpc': '1' }, { cookie: `${cookies}; p0s_analytics_optout=1` }]) {
    const skipped = await handleRequest(new Request('https://chinesebikes.xyz/analytics/ga-session', {
      method: 'POST',
      headers: { origin: 'https://chinesebikes.xyz', cookie: cookies, 'x-ga4-session-id': '1780000000', ...excluded }
    }), env);
    assert.equal(skipped.status, 204);
    assert.equal(skipped.headers.get('set-cookie'), null);
  }
  const payload = ga4SiteOpenPayload({ path: '/' }, ga4Identity(documentRequest(`${cookies}; p0s_ga_sid=1780000000`)));
  assert.equal(payload.events[0].params.session_id, '1780000000');
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

test('collection URL ordering preserves values and repeated-key order only for this gateway and tag', () => {
  const origin = 'https://chinesebikes.xyz';
  const input = `${origin}/sitedelivery/ga/g/c?v=2&tid=G-TEST12345&en=page_view&dl=https%3A%2F%2Fchinesebikes.xyz%2F%3Fx%3Da%2Bb&ep.label=%E8%87%AA%E8%A1%8C%E8%BD%A6%20test&a=second&a=first&empty=`;
  const output = collectionRequestUrl(input, origin, 'G-TEST12345');
  assert.notEqual(output, input);
  const before = new URL(input).searchParams;
  const after = new URL(output).searchParams;
  for (const key of before.keys()) assert.deepEqual(after.getAll(key), before.getAll(key));
  assert.deepEqual([...after.keys()], [...after.keys()].sort());
  assert.equal(collectionRequestUrl(output, origin, 'G-TEST12345'), output);
  for (const other of [input.replace(origin, 'https://other.example'), input.replace('/ga/g/c?', '/ga/g/other?'), input.replace('v=2', 'v=1'), input.replace('G-TEST12345', 'G-OTHER123'), '/analytics/ga-session', 'https://[invalid']) {
    assert.equal(collectionRequestUrl(other, origin, 'G-TEST12345'), other);
  }
  const request = new Request(input);
  assert.equal(collectionRequestUrl(request, origin, 'G-TEST12345'), request);
});

test('browser tag uses shared IDs and queues one bounded page_view', async () => {
  const scripts = [];
  const requests = [];
  const win = {
    location: { hostname: 'chinesebikes.xyz', origin: 'https://chinesebikes.xyz', pathname: '/models/example/', search: '?q=private' },
    navigator: { doNotTrack: '0' },
    fetch: async (path, init) => {
      requests.push({ path, init });
      return path === '/analytics/ga-config'
        ? new Response(JSON.stringify({ measurementId: env.GA4_MEASUREMENT_ID, clientId: '123.456' }), { headers: { 'content-type': 'application/json' } })
        : new Response(null, { status: 204 });
    },
    document: {
      querySelector: () => ({}),
      scripts,
      referrer: 'https://other.example/page?private=1',
      createElement: () => ({}),
      head: { appendChild: (script) => scripts.push(script) }
    }
  };
  assert.equal(await startGa4(win), true);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, '/sitedelivery/js?id=G-TEST12345');
  assert.ok(win.dataLayer.every((entry) => Object.prototype.toString.call(entry) === '[object Arguments]'));
  const config = win.dataLayer.find((args) => args[0] === 'config');
  assert.equal(config[2].client_id, '123.456');
  assert.equal(Object.hasOwn(config[2], 'session_id'), false);
  assert.equal(config[2].send_page_view, false);
  const pageviews = win.dataLayer.filter((args) => args[0] === 'event' && args[1] === 'page_view');
  assert.equal(pageviews.length, 1);
  assert.equal(await startGa4(win), false);
  assert.equal(requests.length, 1);
  assert.equal(pageviews[0][2].page_location, 'https://chinesebikes.xyz/models/example/');
  assert.equal(pageviews[0][2].page_referrer, 'https://other.example');
  const getClient = win.dataLayer.find((args) => args[0] === 'get' && args[2] === 'client_id');
  getClient[3]('999.888');
  assert.equal(requests.length, 1);
  getClient[3]('123.456');
  const getSession = win.dataLayer.find((args) => args[0] === 'get' && args[2] === 'session_id');
  getSession[3]('1780000000');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests.length, 2);
  assert.equal(requests[1].path, '/analytics/ga-session');
  assert.equal(requests[1].init.headers['x-ga4-session-id'], '1780000000');
  assert.equal(requests[1].init.method, 'POST');
  assert.equal(await startGa4({ ...win, navigator: { doNotTrack: '1' } }), false);
  assert.equal(await startGa4({ ...win, navigator: { globalPrivacyControl: true } }), false);
});

test('collection transport preserves fetch and beacon bodies, results, receivers and unrelated requests', async () => {
  const calls = [];
  const response = Promise.resolve(new Response(null, { status: 204 }));
  const win = {
    location: { hostname: 'chinesebikes.xyz', origin: 'https://chinesebikes.xyz', pathname: '/' },
    navigator: { sendBeacon(url, body) { calls.push({ transport: 'beacon', receiver: this, url, body }); return false; } },
    fetch(url, init) {
      if (url === '/analytics/ga-config') return Promise.resolve(Response.json({ measurementId: env.GA4_MEASUREMENT_ID, clientId: '123.456' }));
      calls.push({ transport: 'fetch', receiver: this, url, init });
      return response;
    },
    document: { querySelector: () => ({}), scripts: [{ src: '/sitedelivery/' }], referrer: '' }
  };
  assert.equal(await startGa4(win), true);
  const url = '/sitedelivery/ga/g/c?v=2&tid=G-TEST12345&en=page_view';
  const body = new Blob(['test-body']);
  const init = { method: 'POST', body, keepalive: true, credentials: 'omit' };
  assert.equal(win.fetch(url, init), response);
  assert.equal(win.navigator.sendBeacon(url, body), false);
  assert.equal(calls[0].receiver, win);
  assert.equal(calls[0].init, init);
  assert.equal(calls[1].receiver, win.navigator);
  assert.equal(calls[1].body, body);
  assert.equal(calls[0].url, calls[1].url);
  assert.notEqual(calls[0].url, url);
  const unrelated = '/analytics/ga-session';
  win.fetch(unrelated, init);
  win.navigator.sendBeacon(unrelated, body);
  assert.equal(calls[2].url, unrelated);
  assert.equal(calls[3].url, unrelated);
  assert.equal(calls.length, 4);
  const denied = { ...win, fetch: win.fetch, navigator: { doNotTrack: '1', sendBeacon: win.navigator.sendBeacon } };
  const fetchBefore = denied.fetch;
  const beaconBefore = denied.navigator.sendBeacon;
  assert.equal(await startGa4(denied), false);
  assert.equal(denied.fetch, fetchBefore);
  assert.equal(denied.navigator.sendBeacon, beaconBefore);
});

test('error documents cannot initialize a tag even with a returning visitor ID', async () => {
  const errorHtml = layout({ path: '/404.html', body: 'Not found', repositoryUrl: 'https://github.com/p0s/china-bike-research' });
  assert.doesNotMatch(errorHtml, /data-ga4-page|\/assets\/ga4\.js/);
  const contentHtml = layout({ path: '/models/example/', body: 'Example', repositoryUrl: 'https://github.com/p0s/china-bike-research' });
  assert.match(contentHtml, /<script type="module" data-ga4-page src="\/assets\/ga4\.js"/);
  let fetched = false;
  const win = {
    location: { hostname: 'chinesebikes.xyz' }, navigator: {},
    document: { querySelector: () => null },
    fetch: async () => { fetched = true; return Response.json({ measurementId: env.GA4_MEASUREMENT_ID, clientId: '123.456' }); }
  };
  assert.equal(await startGa4(win), false);
  assert.equal(fetched, false);
});

test('browser reuses the gateway loader and concurrent initialization queues one page view', async () => {
  for (const src of ['/sitedelivery/', `/sitedelivery/js?id=${env.GA4_MEASUREMENT_ID}`, '/gtag/', `/gtag/js?id=${env.GA4_MEASUREMENT_ID}`]) {
    const scripts = [{ src }];
    const win = {
      location: { hostname: 'chinesebikes.xyz', origin: 'https://chinesebikes.xyz', pathname: '/' },
      navigator: {},
      document: { querySelector: () => ({}), scripts, referrer: '', head: { appendChild: () => assert.fail('duplicate loader') } },
      fetch: async () => Response.json({ measurementId: env.GA4_MEASUREMENT_ID, clientId: '123.456' })
    };
    assert.deepEqual(await Promise.all([startGa4(win), startGa4(win)]), [true, false]);
    assert.equal(win.dataLayer.filter(args => args[0] === 'event' && args[1] === 'page_view').length, 1);
  }
});

test('Measurement Protocol failure never throws or reports receipt as processing proof', async () => {
  const payload = ga4SiteOpenPayload({ path: '/', country: 'SG' }, { clientId: '123.456', sessionId: '1780000000' });
  assert.equal(await sendGa4(payload, env, async () => new Response(null, { status: 204 })), true);
  assert.equal(await sendGa4(payload, env, async () => new Response(null, { status: 500 })), false);
  assert.equal(await sendGa4(payload, env, async () => { throw new Error('blocked'); }), false);
});

test('GA sender uses Workers-compatible manual redirects and rejects a redirect without retrying', async () => {
  const payload = ga4SiteOpenPayload({ path: '/' }, { clientId: '123.456' });
  let calls = 0;
  assert.equal(await sendGa4(payload, env, async (_url, init) => {
    calls += 1;
    assert.equal(init.redirect, 'manual');
    return new Response(null, { status: 302, headers: { location: 'https://elsewhere.example/' } });
  }, { info() {} }), false);
  assert.equal(calls, 1);
});

test('GA delivery diagnostics expose only bounded outcomes and never visitor data or credentials', async () => {
  const payload = ga4SiteOpenPayload({ path: '/models/private-model/', country: 'SG' }, { clientId: '123.456' });
  const messages = [];
  const logger = { info: (message) => messages.push(JSON.parse(message)) };
  assert.equal(await sendGa4(payload, env, async () => new Response(null, { status: 204 }), logger), true);
  assert.equal(await sendGa4(payload, env, async () => new Response(null, { status: 503 }), logger), false);
  assert.equal(await sendGa4(payload, env, async () => { throw new Error('test-secret 123.456 private-model'); }, logger), false);
  assert.deepEqual(messages, [
    { type: 'ga4_delivery', event: 'site_open', outcome: 'http_received', status: 204 },
    { type: 'ga4_delivery', event: 'site_open', outcome: 'http_rejected', status: 503 },
    { type: 'ga4_delivery', event: 'site_open', outcome: 'network_error', status: null }
  ]);
  assert.equal(await sendGa4(payload, env, async () => new Response(null, { status: 204 }), { info() { throw new Error('logger unavailable'); } }), true);
});
