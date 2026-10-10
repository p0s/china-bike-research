import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsEventPayload, analyticsPayload, handleRequest, hasOptOutCookie, ingestAction, ingestAnalytics, isEligibleDocumentPath } from '../worker/index.mjs';

function makeRequest(path, init = {}, cf = { country: 'SG' }) {
  const request = new Request(`https://chinesebikes.xyz${path}`, init);
  Object.defineProperty(request, 'cf', { value: cf });
  return request;
}

function assetsBinding(response = new Response('<!doctype html><html></html>', {
  status: 200,
  headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=120' }
})) {
  const calls = [];
  return {
    calls,
    fetch: async (request) => {
      calls.push(request);
      return response.clone();
    }
  };
}

test('catalog receives only the trusted coarse country hint, independently of analytics consent', async () => {
  const document = '<html><body><div data-catalog-root data-price-country=""></div></body></html>';
  const assets = assetsBinding(new Response(document, { headers: { 'content-type': 'text/html' } }));
  const response = await handleRequest(makeRequest('/?market=us&country=US', { headers: { dnt: '1', 'x-country': 'US' } }, { country: 'DE' }), { ASSETS: assets });
  assert.match(await response.text(), /data-price-country="DE"/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.has('set-cookie'), false);
  const absent = await handleRequest(makeRequest('/', { headers: { 'cf-ipcountry': 'US' } }, {}), { ASSETS: assets });
  assert.match(await absent.text(), /data-price-country=""/);
  const invalid = await handleRequest(makeRequest('/', {}, { country: '\"><script>' }), { ASSETS: assets });
  assert.match(await invalid.text(), /data-price-country=""/);
});

test('country hints do not buffer non-catalog HTML when analytics is excluded', async () => {
  const document = '<!doctype html><html><body><main>Model page</main></body></html>';
  const encoded = new TextEncoder().encode(document);
  let allowRead = false;
  let pulls = 0;
  const assets = {
    fetch: async () => new Response(new ReadableStream({
      pull(controller) {
        pulls += 1;
        if (!allowRead) throw new Error('Worker buffered an unmodified document');
        controller.enqueue(encoded);
        controller.close();
      }
    }, { highWaterMark: 0 }), { headers: { 'content-type': 'text/html; charset=utf-8' } })
  };
  const waits = [];
  const response = await handleRequest(
    makeRequest('/image-sources/', { headers: { dnt: '1' } }, { country: 'SG' }),
    { ASSETS: assets },
    { waitUntil: (task) => waits.push(task) }
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(pulls, 0);
  assert.equal(waits.length, 0);
  allowRead = true;
  assert.equal(await response.text(), document);
  assert.equal(pulls, 1);
});

test('analytics payload is minimized to the frozen ingestion fields', () => {
  const request = makeRequest('/models/example-bike/?q=private-value#fragment', {
    headers: {
      'cf-connecting-ip': '203.0.113.10',
      referer: 'https://referrer.example/article?account=private',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64)'
    }
  });
  const payload = analyticsPayload(request, new URL(request.url));
  assert.deepEqual(payload, {
    hostname: 'chinesebikes.xyz',
    path: '/models/example-bike/',
    referrer: 'https://referrer.example',
    ip: '203.0.113.10',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
    country: 'SG'
  });
  assert.equal(Object.hasOwn(payload, 'timestamp'), false);
  assert.equal(Object.hasOwn(payload, 'query'), false);
  assert.equal(isEligibleDocumentPath('/models/example-bike/'), true);
  assert.equal(isEligibleDocumentPath('/models/example-bike'), false);
});

test('analytics accepts compressed IPv6 addresses from Cloudflare', () => {
  const request = makeRequest('/', {
    headers: {
      'cf-connecting-ip': '2001:db8::10',
      'user-agent': 'Mozilla/5.0'
    }
  });
  assert.equal(analyticsPayload(request, new URL(request.url)).ip, '2001:db8::10');
});

test('analytics accepts IPv4-mapped IPv6 addresses from Cloudflare', () => {
  const request = makeRequest('/', {
    headers: {
      'cf-connecting-ip': '::ffff:192.0.2.1',
      'user-agent': 'Mozilla/5.0'
    }
  });
  assert.equal(analyticsPayload(request, new URL(request.url)).ip, '::ffff:192.0.2.1');
});

test('analytics eligibility honors DNT, GPC, opt-out, prefetch, bots, and private paths', () => {
  const base = {
    'cf-connecting-ip': '203.0.113.10',
    'user-agent': 'Mozilla/5.0'
  };
  for (const headers of [
    { ...base, dnt: '1' },
    { ...base, 'sec-gpc': '1' },
    { ...base, cookie: 'p0s_analytics_optout=1' },
    { ...base, purpose: 'prefetch' },
    { ...base, 'user-agent': 'ExampleBot/1.0' },
  ]) {
    const request = makeRequest('/models/example-bike/', { headers });
    assert.equal(analyticsPayload(request, new URL(request.url)), null);
  }
  assert.equal(hasOptOutCookie('foo=1; p0s_analytics_optout=1; bar=2'), true);
  const privateRequest = makeRequest('/account/profile/', { headers: base });
  assert.equal(analyticsPayload(privateRequest, new URL(privateRequest.url)), null);
});

test('comparison event payload contains only the fixed event and validated public path', () => {
  const request = makeRequest('/analytics/event', {
    method: 'POST',
    headers: {
      origin: 'https://chinesebikes.xyz',
      'x-analytics-path': '/zh/',
      'cf-connecting-ip': '203.0.113.10',
      'user-agent': 'Mozilla/5.0'
    }
  });
  assert.deepEqual(analyticsEventPayload(request, new URL(request.url)), {
    hostname: 'chinesebikes.xyz',
    path: '/zh/',
    ip: '203.0.113.10',
    userAgent: 'Mozilla/5.0',
    country: 'SG',
    eventName: 'compare_open',
    context: { page_path: '/zh/', page_type: 'catalog', interface_language: 'zh-Hans' }
  });
  assert.equal(analyticsPayload(request, new URL(request.url)), null);

  for (const path of ['/private/', '/analytics/event', '/models/example-bike/', '/?compare=bike-a,bike-b', '/models/example/?search=private']) {
    const invalid = makeRequest('/analytics/event', {
      method: 'POST',
      headers: {
        origin: 'https://chinesebikes.xyz',
        'x-analytics-path': path,
        'cf-connecting-ip': '203.0.113.10',
        'user-agent': 'Mozilla/5.0'
      }
    });
    assert.equal(analyticsEventPayload(invalid, new URL(invalid.url)), null, path);
  }
});

test('same-origin comparison event reaches the gateway without browser-only fields', async () => {
  const origin = 'https://chinesebikes.xyz';
  const request = makeRequest('/analytics/event', {
    method: 'POST',
    headers: {
      origin,
      'x-analytics-path': '/',
      'cf-connecting-ip': '203.0.113.10',
      'user-agent': 'Mozilla/5.0'
    }
  });
  const waits = [];
  const sent = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    sent.push({ url, init });
    return new Response(null, { status: 204 });
  };
  try {
    const response = await handleRequest(request, {
      ANALYTICS_INGEST_URL: 'https://stats.p0s.eu/ingest/v1',
      ANALYTICS_INGEST_TOKEN: 'test-token'
    }, { waitUntil: (promise) => waits.push(promise) });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(waits.length, 1);
    await Promise.all(waits);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, 'https://stats.p0s.eu/ingest/v1');
    assert.equal(sent[0].init.headers.authorization, 'Bearer test-token');
    assert.equal(Object.hasOwn(sent[0].init.headers, 'origin'), false);
    assert.deepEqual(JSON.parse(sent[0].init.body), {
      hostname: 'chinesebikes.xyz',
      path: '/',
      ip: '203.0.113.10',
      userAgent: 'Mozilla/5.0',
      country: 'SG',
      eventName: 'compare_open',
      context: { page_path: '/', page_type: 'catalog', interface_language: 'en' }
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('an empty POST stream is accepted but a stream with bytes is rejected', async () => {
  const headers = {
    origin: 'https://chinesebikes.xyz',
    'x-analytics-path': '/',
    'cf-connecting-ip': '203.0.113.10',
    'user-agent': 'Mozilla/5.0'
  };
  const emptyBody = new ReadableStream({ start(controller) { controller.close(); } });
  const emptyRequest = makeRequest('/analytics/event', {
    method: 'POST', headers, body: emptyBody, duplex: 'half'
  });
  assert.notEqual(emptyRequest.body, null);
  const waits = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 204 });
  try {
    const accepted = await handleRequest(emptyRequest, {
      ANALYTICS_INGEST_URL: 'https://stats.p0s.eu/ingest/v1',
      ANALYTICS_INGEST_TOKEN: 'test-token'
    }, { waitUntil: (promise) => waits.push(promise) });
    assert.equal(accepted.status, 204);
    assert.equal(waits.length, 1);
    await Promise.all(waits);

    const submittedBody = new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode('unexpected'));
      controller.close();
    } });
    const rejected = await handleRequest(makeRequest('/analytics/event', {
      method: 'POST', headers, body: submittedBody, duplex: 'half'
    }), {});
    assert.equal(rejected.status, 400);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('comparison events require same-origin bodyless POST and honor analytics exclusions', async () => {
  const origin = 'https://chinesebikes.xyz';
  const common = {
    origin,
    'x-analytics-path': '/',
    'cf-connecting-ip': '203.0.113.10',
    'user-agent': 'Mozilla/5.0'
  };
  const env = {
    ANALYTICS_INGEST_URL: 'https://stats.p0s.eu/ingest/v1',
    ANALYTICS_INGEST_TOKEN: 'test-token'
  };
  const sent = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    sent.push(args);
    return new Response(null, { status: 204 });
  };
  try {
    for (const blocked of [
      { dnt: '1' },
      { 'sec-gpc': '1' },
      { cookie: 'p0s_analytics_optout=1' },
      { purpose: 'prefetch' },
      { 'user-agent': 'ExampleBot/1.0' }
    ]) {
      const request = makeRequest('/analytics/event', { method: 'POST', headers: { ...common, ...blocked } });
      const waits = [];
      const response = await handleRequest(request, env, { waitUntil: (promise) => waits.push(promise) });
      assert.equal(response.status, 204);
      assert.equal(waits.length, 0);
    }

    const crossOrigin = await handleRequest(makeRequest('/analytics/event', {
      method: 'POST', headers: { ...common, origin: 'https://attacker.example' }
    }), env);
    assert.equal(crossOrigin.status, 403);
    const missingOrigin = await handleRequest(makeRequest('/analytics/event', {
      method: 'POST', headers: { 'x-analytics-path': '/', 'cf-connecting-ip': '203.0.113.10', 'user-agent': 'Mozilla/5.0' }
    }), env);
    assert.equal(missingOrigin.status, 403);
    const refererWaits = [];
    const sameOriginReferer = await handleRequest(makeRequest('/analytics/event', {
      method: 'POST', headers: { ...common, origin: '', referer: `${origin}/` }
    }), env, { waitUntil: (promise) => refererWaits.push(promise) });
    assert.equal(sameOriginReferer.status, 204);
    await Promise.all(refererWaits);
    const opaqueOrigin = await handleRequest(makeRequest('/analytics/event', {
      method: 'POST', headers: { ...common, origin: 'null', referer: `${origin}/` }
    }), env);
    assert.equal(opaqueOrigin.status, 403);

    const body = await handleRequest(makeRequest('/analytics/event', {
      method: 'POST', headers: common, body: 'unexpected'
    }), env);
    assert.equal(body.status, 400);
    const contentType = await handleRequest(makeRequest('/analytics/event', {
      method: 'POST', headers: { ...common, 'content-type': 'application/json' }
    }), env);
    assert.equal(contentType.status, 400);
    const query = await handleRequest(makeRequest('/analytics/event?compare=bike-a,bike-b', {
      method: 'POST', headers: common
    }), env);
    assert.equal(query.status, 400);
    const get = await handleRequest(makeRequest('/analytics/event', { headers: common }), env);
    assert.equal(get.status, 405);
    assert.equal(sent.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('product outbound action relay forwards only its fixed action ID and honors privacy exclusions', async () => {
  const origin = 'https://chinesebikes.xyz';
  const env = { ANALYTICS_INGEST_TOKEN: 'test-token' };
  const outbound = [];
  const waits = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    outbound.push({ url, init });
    return new Response(null, { status: 204 });
  };
  try {
    const request = makeRequest('/analytics/action', {
      method: 'POST',
      headers: {
        origin,
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0',
        'cf-connecting-ip': '203.0.113.10',
        referer: `${origin}/models/example/?variant=private`
      },
      body: JSON.stringify({ actionId: 'product_outbound_click' })
    });
    const response = await handleRequest(request, env, { waitUntil: (promise) => waits.push(promise) });
    assert.equal(response.status, 204);
    await Promise.all(waits);
    assert.equal(outbound.length, 1);
    assert.equal(outbound[0].url, 'https://stats.p0s.eu/ingest/action/v1');
    assert.deepEqual(JSON.parse(outbound[0].init.body), { actionId: 'product_outbound_click' });
    assert.deepEqual([...new Headers(outbound[0].init.headers).keys()].sort(), ['authorization', 'content-type']);
    assert.equal(outbound[0].init.headers.authorization, 'Bearer test-token');
    assert.equal(outbound[0].init.redirect, 'manual');
    assert.equal(outbound[0].init.referrerPolicy, 'no-referrer');
    assert.equal(await ingestAction('compare_open', env, async () => new Response(null)), false);
    let redirectCalls = 0;
    assert.equal(await ingestAction('product_outbound_click', env, async (_url, init) => {
      redirectCalls += 1;
      assert.equal(init.redirect, 'manual');
      return new Response(null, { status: 302, headers: { location: 'https://elsewhere.example/' } });
    }), false);
    assert.equal(redirectCalls, 1);

    for (const blocked of [
      { dnt: '1' },
      { 'sec-gpc': '1' },
      { cookie: 'p0s_analytics_optout=1' },
      { purpose: 'prefetch' },
      { 'user-agent': 'ExampleBot/1.0' },
      { 'user-agent': '' }
    ]) {
      const skipped = await handleRequest(makeRequest('/analytics/action', {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0', ...blocked },
        body: JSON.stringify({ actionId: 'product_outbound_click' })
      }), env, { waitUntil: (promise) => waits.push(promise) });
      assert.equal(skipped.status, 204);
    }
    assert.equal(outbound.length, 1);

    for (const [body, headers, path, expectedStatus] of [
      ['{ "actionId": "product_outbound_click", "page": "/" }', { 'content-type': 'application/json' }, '/analytics/action', 400],
      ['{ "actionId": "compare_open" }', { 'content-type': 'application/json' }, '/analytics/action', 400],
      ['{ "actionId": "product_outbound_click" }', { 'content-type': 'text/plain' }, '/analytics/action', 400],
      ['{ "actionId": "product_outbound_click" }', { 'content-type': 'application/json', origin: 'https://attacker.example' }, '/analytics/action', 403],
      ['{ "actionId": "product_outbound_click" }', { 'content-type': 'application/json' }, '/analytics/action?item=secret', 400]
    ]) {
      const rejected = await handleRequest(makeRequest(path, {
        method: 'POST', headers: { origin, 'user-agent': 'Mozilla/5.0', ...headers }, body
      }), env, { waitUntil: (promise) => waits.push(promise) });
      assert.equal(rejected.status, expectedStatus);
    }
    const get = await handleRequest(makeRequest('/analytics/action', { headers: { origin, 'user-agent': 'Mozilla/5.0' } }), env);
    assert.equal(get.status, 405);
    assert.equal(outbound.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('document responses prevent shared caching and schedule bounded ingestion', async () => {
  const assets = assetsBinding();
  const waits = [];
  const sent = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    sent.push({ url, init });
    return new Response(null, { status: 204 });
  };
  try {
    const request = makeRequest('/models/example-bike/?view=full', {
      headers: {
        'cf-connecting-ip': '203.0.113.10',
        referer: 'https://example.org/source/page',
        'user-agent': 'Mozilla/5.0'
      }
    });
    const response = await handleRequest(request, {
      ASSETS: assets,
      ANALYTICS_INGEST_URL: 'https://stats.p0s.eu/ingest/v1',
      ANALYTICS_INGEST_TOKEN: 'test-token'
    }, { waitUntil: (promise) => waits.push(promise) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(waits.length, 1);
    await Promise.all(waits);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, 'https://stats.p0s.eu/ingest/v1');
    assert.equal(sent[0].init.headers.authorization, 'Bearer test-token');
    assert.deepEqual(JSON.parse(sent[0].init.body), {
      hostname: 'chinesebikes.xyz',
      path: '/models/example-bike/',
      referrer: 'https://example.org',
      ip: '203.0.113.10',
      userAgent: 'Mozilla/5.0',
      country: 'SG'
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('collector failure never changes the document response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('collector unavailable'); };
  try {
    const waits = [];
    const response = await handleRequest(makeRequest('/', {
      headers: { 'cf-connecting-ip': '203.0.113.10', 'user-agent': 'Mozilla/5.0' }
    }), {
      ASSETS: assetsBinding(),
      ANALYTICS_INGEST_URL: 'https://stats.p0s.eu/ingest/v1',
      ANALYTICS_INGEST_TOKEN: 'test-token'
    }, { waitUntil: (promise) => waits.push(promise) });
    assert.equal(response.status, 200);
    await Promise.all(waits);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('collector HTTP failures are reported as rejected ingestion', async () => {
  const payload = {
    hostname: 'chinesebikes.xyz',
    path: '/',
    ip: '203.0.113.10',
    userAgent: 'Mozilla/5.0'
  };
  const env = {
    ANALYTICS_INGEST_URL: 'https://stats.p0s.eu/ingest/v1',
    ANALYTICS_INGEST_TOKEN: 'test-token'
  };
  const responseFor = (status) => ingestAnalytics(payload, env, async () => new Response(null, { status }));
  assert.equal(await responseFor(204), true);
  assert.equal(await responseFor(401), false);
  assert.equal(await responseFor(500), false);
});

test('preference routes require same-origin POST and set host-only cookies', async () => {
  const origin = 'https://chinesebikes.xyz';
  const optOut = await handleRequest(new Request(`${origin}/analytics/opt-out`, {
    method: 'POST',
    headers: { origin }
  }), {});
  assert.equal(optOut.status, 200);
  const preferenceCookie = optOut.headers.getSetCookie()[0];
  assert.match(preferenceCookie, /p0s_analytics_optout=1/);
  assert.match(preferenceCookie, /HttpOnly/);
  assert.match(preferenceCookie, /SameSite=Lax/);
  assert.doesNotMatch(preferenceCookie, /Domain=/i);
  assert.ok(optOut.headers.getSetCookie().some((cookie) => cookie.startsWith('p0s_ga_cid=;')));

  const optIn = await handleRequest(new Request(`${origin}/analytics/opt-in`, {
    method: 'POST',
    headers: { referer: `${origin}/privacy/` }
  }), {});
  assert.match(optIn.headers.get('set-cookie'), /Max-Age=0/);
  const crossOrigin = await handleRequest(new Request(`${origin}/analytics/opt-out`, {
    method: 'POST',
    headers: { origin: 'https://evil.example' }
  }), {});
  assert.equal(crossOrigin.status, 403);
  const get = await handleRequest(new Request(`${origin}/analytics/opt-out`), {});
  assert.equal(get.status, 405);
});

test('document paths redirect to trailing slash while static assets remain asset-first', async () => {
  const assets = assetsBinding(new Response('asset', { status: 200, headers: { 'content-type': 'image/svg+xml', etag: '"asset"' } }));
  const redirect = await handleRequest(new Request('https://chinesebikes.xyz/models/example-bike?build=1'), { ASSETS: assets });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), 'https://chinesebikes.xyz/models/example-bike/?build=1');
  assert.equal(assets.calls.length, 0);
  const assetResponse = await handleRequest(new Request('https://chinesebikes.xyz/assets/logo.svg'), { ASSETS: assets });
  assert.equal(assetResponse.status, 200);
  assert.equal(assetResponse.headers.get('etag'), '"asset"');
  assert.equal(assets.calls.length, 1);
});
