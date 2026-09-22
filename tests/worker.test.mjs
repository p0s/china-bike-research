import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsPayload, handleRequest, hasOptOutCookie, ingestAnalytics, isEligibleDocumentPath } from '../worker/index.mjs';

function makeRequest(path, init = {}, cf = { country: 'SG' }) {
  const request = new Request(`https://china-bikes.p0s.eu${path}`, init);
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
    hostname: 'china-bikes.p0s.eu',
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

test('document responses preserve cache behavior and schedule bounded ingestion', async () => {
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
    assert.equal(response.headers.get('cache-control'), 'public, max-age=120');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(waits.length, 1);
    await Promise.all(waits);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, 'https://stats.p0s.eu/ingest/v1');
    assert.equal(sent[0].init.headers.authorization, 'Bearer test-token');
    assert.deepEqual(JSON.parse(sent[0].init.body), {
      hostname: 'china-bikes.p0s.eu',
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
    hostname: 'china-bikes.p0s.eu',
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
  const origin = 'https://china-bikes.p0s.eu';
  const optOut = await handleRequest(new Request(`${origin}/analytics/opt-out`, {
    method: 'POST',
    headers: { origin }
  }), {});
  assert.equal(optOut.status, 200);
  assert.match(optOut.headers.get('set-cookie'), /p0s_analytics_optout=1/);
  assert.match(optOut.headers.get('set-cookie'), /HttpOnly/);
  assert.match(optOut.headers.get('set-cookie'), /SameSite=Lax/);
  assert.doesNotMatch(optOut.headers.get('set-cookie'), /Domain=/i);

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
  const redirect = await handleRequest(new Request('https://china-bikes.p0s.eu/models/example-bike?build=1'), { ASSETS: assets });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), 'https://china-bikes.p0s.eu/models/example-bike/?build=1');
  assert.equal(assets.calls.length, 0);
  const assetResponse = await handleRequest(new Request('https://china-bikes.p0s.eu/assets/logo.svg'), { ASSETS: assets });
  assert.equal(assetResponse.status, 200);
  assert.equal(assetResponse.headers.get('etag'), '"asset"');
  assert.equal(assets.calls.length, 1);
});
