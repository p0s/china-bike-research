import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsConsentAllowed, analyticsScriptPolicy, CONSENT_COUNTRIES, needsAnalyticsConsent } from '../worker/consent.mjs';
import { handleRequest } from '../worker/index.mjs';
import { startGa4 } from '../assets/ga4.js';
import { bindAnalyticsChoices, stopAnalytics } from '../assets/analytics-choice.js';

const origin = 'https://chinesebikes.xyz';
const env = {
  GA4_ENABLED: 'true', GA4_MEASUREMENT_ID: 'G-TEST12345', GA4_API_SECRET: 'test-secret',
  ANALYTICS_INGEST_URL: 'https://stats.p0s.eu/ingest/v1', ANALYTICS_INGEST_TOKEN: 'test-token',
  ASSETS: { fetch: async () => new Response('<html><body><script type="module" data-ga4-page src="/assets/ga4.js"></script></body></html>', { headers: { 'content-type': 'text/html' } }) }
};
const ids = 'p0s_ga_cid=123.456; p0s_ga_sid=1780000000; _ga_TEST12345=old';
const consent = 'p0s_analytics_consent=v1';
function request(path = '/', country = 'FR', init = {}) {
  const req = new Request(origin + path, { ...init, headers: {
    'user-agent': 'Mozilla/5.0', 'cf-connecting-ip': '203.0.113.10', ...init.headers
  } });
  if (country !== undefined) Object.defineProperty(req, 'cf', { value: { country } });
  return req;
}

test('trusted location requires a choice in the policy regions and fails closed for unknown locations', () => {
  for (const country of [...CONSENT_COUNTRIES, '', 'XX', 'T1', 'unknown']) {
    assert.equal(needsAnalyticsConsent(request('/', country)), true, country);
    assert.equal(analyticsConsentAllowed(request('/', country)), false, country);
    assert.equal(analyticsConsentAllowed(request('/', country, { headers: { cookie: consent } })), true, country);
  }
  assert.equal(needsAnalyticsConsent(new Request(origin)), true);
  for (const country of ['SG', 'US', 'AU', 'CA']) assert.equal(needsAnalyticsConsent(request('/', country)), false);
  assert.equal(needsAnalyticsConsent(request('/?country=SG', 'FR', { headers: { 'cf-ipcountry': 'SG' } })), true);
  assert.equal(needsAnalyticsConsent(request('/', 'SG', { headers: { 'cf-ipcountry': 'FR' } })), false);
  assert.equal(analyticsConsentAllowed(request('/', 'FR', { headers: { cookie: `${ids}; p0s_analytics_consent=old` } })), false);
});

test('pending visitors get a choice, no collector dispatch or identities, and no executable Google bootstrap', async () => {
  for (const [path, country, label] of [['/', 'FR', 'Allow analytics'], ['/zh/', 'CN', '允许分析'], ['/', '', 'Allow analytics']]) {
    const waits = [];
    const response = await handleRequest(request(path, country, { headers: { cookie: ids } }), env, { waitUntil: p => waits.push(p) });
    assert.equal(waits.length, 0);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('content-security-policy'), analyticsScriptPolicy(false));
    const html = await response.text();
    assert.match(html, /data-analytics-banner/);
    assert.ok(html.includes(label));
    assert.match(html, /action="\/analytics\/opt-in"/);
    assert.match(html, /action="\/analytics\/opt-out"/);
    assert.match(html, /method="post"/);
    assert.ok(response.headers.getSetCookie().some(value => value.startsWith('p0s_ga_cid=;')));
    assert.ok(response.headers.getSetCookie().every(value => value.includes('Max-Age=0')));
  }
  assert.doesNotMatch(analyticsScriptPolicy(true), /https:\/\/chinesebikes\.xyz\/sitedelivery\/(?:\s|;)/);
  assert.match(analyticsScriptPolicy(true), /https:\/\/chinesebikes\.xyz\/sitedelivery\/js/);
});

test('config, session, comparison and product events cannot use old identifiers before consent', async () => {
  for (const [path, method, extra, body] of [
    ['/analytics/ga-config', 'GET', {}, undefined],
    ['/analytics/ga-session', 'POST', { 'x-ga4-session-id': '1780000000' }, undefined],
    ['/analytics/event', 'POST', { 'x-analytics-path': '/' }, undefined],
    ['/analytics/action', 'POST', { 'content-type': 'application/json' }, JSON.stringify({ actionId: 'product_outbound_click' })]
  ]) {
    const waits = [];
    const response = await handleRequest(request(path, 'FR', {
      method, headers: { origin, cookie: ids, ...extra }, body
    }), env, { waitUntil: p => waits.push(p) });
    assert.equal(response.status, 204, path);
    assert.equal(waits.length, 0, path);
    if (path !== '/analytics/ga-config') assert.equal(response.headers.get('set-cookie'), null);
  }
});

test('allow records versioned consent, while decline and privacy signals remain authoritative', async () => {
  const response = await handleRequest(request('/analytics/opt-in', 'FR', { method: 'POST', headers: { origin } }), env);
  assert.equal(response.status, 200);
  assert.ok(response.headers.getSetCookie().some(value => value.startsWith(`${consent}; Max-Age=15552000;`) && value.includes('HttpOnly')));
  const originalFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async url => { sent.push(String(url)); return new Response(null, { status: 204 }); };
  try {
    const waits = [];
    const allowed = await handleRequest(request('/', 'FR', { headers: { cookie: consent } }), env, { waitUntil: p => waits.push(p) });
    await Promise.all(waits);
    assert.equal(sent.length, 2);
    assert.doesNotMatch(await allowed.text(), /data-analytics-banner/);
    assert.match(allowed.headers.get('content-security-policy'), /sitedelivery\/js/);
    assert.ok(allowed.headers.getSetCookie().some(value => /^p0s_ga_cid=[1-9]/.test(value)));
    for (const privacy of [{ dnt: '1' }, { 'sec-gpc': '1' }, { cookie: `${consent}; p0s_analytics_optout=1` }]) {
      const deniedWaits = [];
      const denied = await handleRequest(request('/', 'FR', { headers: { cookie: consent, ...privacy } }), env, { waitUntil: p => deniedWaits.push(p) });
      assert.equal(deniedWaits.length, 0);
      assert.equal(denied.headers.get('content-security-policy'), analyticsScriptPolicy(false));
      assert.doesNotMatch(await denied.text(), /data-analytics-banner/);
    }
  } finally { globalThis.fetch = originalFetch; }
  const declined = await handleRequest(request('/analytics/opt-out', 'FR', { method: 'POST', headers: { origin, cookie: `${consent}; ${ids}` } }), env);
  assert.ok(declined.headers.getSetCookie().some(value => value.startsWith('p0s_analytics_consent=; Max-Age=0;')));
  assert.ok(declined.headers.getSetCookie().some(value => value.startsWith('p0s_analytics_optout=1;')));
  assert.match(await declined.text(), /data-analytics-cleared/);
});

function browser(fetch) {
  const scripts = [];
  return {
    location: { hostname: 'chinesebikes.xyz', origin, pathname: '/' }, navigator: {}, fetch,
    document: { querySelector: () => ({}), scripts, cookie: '', referrer: '', createElement: () => ({}), head: { appendChild: s => scripts.push(s) } }
  };
}

test('defaults precede async config and revocation during that wait prevents all tag loading', async () => {
  let resolveConfig;
  const win = browser(() => new Promise(resolve => { resolveConfig = resolve; }));
  const started = startGa4(win);
  assert.deepEqual([...win.dataLayer[0]], ['consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
  }]);
  assert.equal(win.document.scripts.length, 0);
  stopAnalytics(win);
  resolveConfig(Response.json({ measurementId: 'G-TEST12345', clientId: '123.456' }));
  assert.equal(await started, false);
  assert.equal(win.document.scripts.length, 0);
  assert.equal(win.dataLayer.filter(args => args[0] === 'event').length, 0);
});

test('revocation suppresses late transport and session callbacks', async () => {
  const calls = [];
  const win = browser(async url => {
    calls.push(url);
    return url === '/analytics/ga-config' ? Response.json({ measurementId: 'G-TEST12345', clientId: '123.456' }) : new Response(null, { status: 204 });
  });
  win.navigator.sendBeacon = url => { calls.push(url); return true; };
  assert.equal(await startGa4(win), true);
  const callback = win.dataLayer.find(args => args[0] === 'get')[3];
  stopAnalytics(win);
  assert.equal(win['ga-disable-G-TEST12345'], true);
  callback('123.456');
  await win.fetch('/sitedelivery/ga/g/c?v=2&tid=G-TEST12345&en=page_view');
  win.navigator.sendBeacon('/sitedelivery/ga/g/c?v=2&tid=G-TEST12345&en=page_view');
  assert.deepEqual(calls, ['/analytics/ga-config']);
});

test('choice handling stops before POST, clears late cookies after success, and reloads only on success', async () => {
  let listener, resolvePost;
  const writes = [];
  const buttons = [{ disabled: false }, { disabled: false }];
  const status = { hidden: true };
  let reloads = 0;
  const doc = {
    documentElement: { lang: 'en' },
    addEventListener: (name, fn) => { assert.equal(name, 'submit'); listener = fn; },
    querySelector: selector => selector === '[data-analytics-choice-status]' ? status : null,
    get cookie() { return '_ga=old; _ga_TEST12345=late; unrelated=keep'; },
    set cookie(value) { writes.push(value); }
  };
  const win = { document: doc, navigator: {}, location: { origin, reload: () => reloads++ }, fetch: () => new Promise(resolve => { resolvePost = resolve; }) };
  bindAnalyticsChoices(win);
  const form = { action: origin + '/analytics/opt-out', matches: () => true, parentElement: { querySelectorAll: () => buttons } };
  let prevented = false;
  const task = listener({ target: form, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(win.p0sAnalyticsStopped, true);
  assert.equal(writes.length, 0);
  resolvePost(new Response(null, { status: 200 }));
  await task;
  assert.equal(writes.length, 4);
  assert.ok(writes.every(value => value.startsWith('_ga')));
  assert.equal(reloads, 1);
  form.action = origin + '/analytics/opt-in';
  const failed = listener({ target: form, preventDefault() {} });
  resolvePost(new Response(null, { status: 503 }));
  await failed;
  assert.equal(reloads, 1);
  assert.equal(status.hidden, false);
  assert.ok(buttons.every(button => !button.disabled));
});
