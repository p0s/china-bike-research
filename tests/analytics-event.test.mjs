import test from 'node:test';
import assert from 'node:assert/strict';
import { sendComparisonOpenedEvent, sendPageEngagedEvent, sendProductOutboundClickEvent, startPageEngagement } from '../assets/analytics-event.js';
import { stopAnalytics } from '../assets/analytics-choice.js';

const origin = 'https://chinesebikes.xyz';

test('immediate opt-out suppresses both action helpers before the preference cookie is saved', () => {
  const requests = [], windowRef = {};
  const common = { windowRef, navigatorRef: {}, fetchImpl: (...args) => requests.push(args) };
  stopAnalytics(windowRef);
  assert.equal(sendComparisonOpenedEvent({ ...common, locationRef: new URL(origin + '/'), comparisonCount: 2 }), false);
  assert.equal(sendProductOutboundClickEvent({ ...common, locationRef: new URL(origin + '/models/test-bike/'), sourceId: 'test-source' }), false);
  assert.equal(sendProductOutboundClickEvent({ ...common, locationRef: new URL(origin + '/de/'), offerId: 'test-offer' }), false);
  assert.equal(requests.length, 0);
});

test('catalog offer actions send only an offer ID and actual localized catalog pathname', () => {
  const requests = [];
  const common = { locationRef: new URL(origin + '/zh/?ship=US#private'), navigatorRef: {}, windowRef: {},
    fetchImpl: (url, init) => requests.push({ url, init }) };
  assert.equal(sendProductOutboundClickEvent({ ...common, offerId: 'test-offer' }), true);
  assert.deepEqual(JSON.parse(requests[0].init.body), { actionId: 'product_outbound_click', pagePath: '/zh/', offerId: 'test-offer' });
  for (const update of [{ offerId: 'user@example.com' }, { offerId: {} }, { sourceId: 'test-source' },
    { locationRef: new URL(origin + '/models/test-bike/') }, { locationRef: new URL(origin + '/privacy/') }]) {
    assert.equal(sendProductOutboundClickEvent({ ...common, offerId: 'test-offer', ...update }), false);
  }
  assert.equal(requests.length, 1);
});

test('action sender transmits only public IDs and comparison size, never URL query or fragment', () => {
  const requests = [];
  const common = { locationRef: new URL(`${origin}/de/models/test-bike/?search=private#secret`),
    navigatorRef: {}, windowRef: {}, fetchImpl: (url, init) => requests.push({ url, init }) };
  assert.equal(sendProductOutboundClickEvent({ ...common, sourceId: 'test-source' }), true);
  assert.deepEqual(JSON.parse(requests[0].init.body), { actionId: 'product_outbound_click',
    pagePath: '/de/models/test-bike/', sourceId: 'test-source' });
  assert.equal(sendProductOutboundClickEvent({ ...common, sourceId: 'user@example.com' }), false);
  assert.equal(sendComparisonOpenedEvent({ ...common, locationRef: new URL(`${origin}/?compare=private`), comparisonCount: 3 }), true);
  assert.deepEqual(requests[1].init.headers, { 'X-Analytics-Path': '/', 'X-Comparison-Count': '3' });
  assert.equal(Object.hasOwn(requests[1].init, 'body'), false);
});

test('comparison event sends a bodyless same-origin request with only the public pathname', () => {
  const requests = [];
  const sent = sendComparisonOpenedEvent({
    locationRef: new URL(`${origin}/?compare=bike-a,bike-b#compare`),
    navigatorRef: { doNotTrack: '0', globalPrivacyControl: false },
    windowRef: { doNotTrack: '0' },
    fetchImpl: (url, init) => {
      requests.push({ url, init });
      return Promise.resolve(new Response(null, { status: 204 }));
    }
  });

  assert.equal(sent, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/site-events/action');
  assert.deepEqual(requests[0].init, {
    method: 'POST',
    mode: 'same-origin',
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'error',
    keepalive: true,
    referrerPolicy: 'no-referrer',
    headers: { 'X-Analytics-Path': '/' }
  });
  assert.equal(Object.hasOwn(requests[0].init, 'body'), false);
});

test('comparison event is skipped for DNT, GPC, and non-production hosts', () => {
  const requests = [];
  const common = {
    locationRef: new URL(`${origin}/`),
    windowRef: {},
    fetchImpl: (...args) => requests.push(args)
  };

  assert.equal(sendComparisonOpenedEvent({ ...common, navigatorRef: { doNotTrack: '1' } }), false);
  assert.equal(sendComparisonOpenedEvent({ ...common, navigatorRef: { msDoNotTrack: 'YES' } }), false);
  assert.equal(sendComparisonOpenedEvent({ ...common, navigatorRef: { globalPrivacyControl: true } }), false);
  assert.equal(sendComparisonOpenedEvent({
    ...common,
    locationRef: new URL('https://preview.example/') ,
    navigatorRef: {}
  }), false);
  assert.equal(sendComparisonOpenedEvent({
    ...common,
    locationRef: { hostname: origin.slice('https://'.length), pathname: '/?search=private' },
    navigatorRef: {}
  }), false);
  assert.equal(sendComparisonOpenedEvent({
    ...common,
    locationRef: new URL(`${origin}/models/example-bike/`),
    navigatorRef: {}
  }), false);
  assert.equal(requests.length, 0);
});

test('product outbound action sends only the fixed action ID to the same-origin relay', () => {
  const requests = [];
  const sent = sendProductOutboundClickEvent({
    locationRef: new URL(`${origin}/models/example/?private=selection#details`),
    navigatorRef: { doNotTrack: '0', globalPrivacyControl: false },
    windowRef: { doNotTrack: '0' },
    fetchImpl: (url, init) => {
      requests.push({ url, init });
      return Promise.resolve(new Response(null, { status: 204 }));
    }
  });

  assert.equal(sent, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/site-events/action');
  assert.equal(requests[0].init.referrerPolicy, 'no-referrer');
  assert.deepEqual(JSON.parse(requests[0].init.body), { actionId: 'product_outbound_click' });
  assert.deepEqual(Object.keys(requests[0].init.headers), ['Content-Type']);
  assert.equal(Object.hasOwn(requests[0].init, 'referrer'), false);
});

function engagementFixture({ search = '', visible = true, allowed = true, navigator = {} } = {}) {
  let time = 0, nextTimer = 0;
  const timers = new Map(), listeners = new Map(), requests = [];
  const doc = {
    visibilityState: visible ? 'visible' : 'hidden',
    body: { dataset: { analyticsAllowed: allowed ? 'true' : 'false' } },
    addEventListener(type, handler) {
      const entries = listeners.get(type) ?? new Set(); entries.add(handler); listeners.set(type, entries);
    },
    removeEventListener(type, handler) { listeners.get(type)?.delete(handler); }
  };
  const win = {
    document: doc,
    location: { hostname: 'chinesebikes.xyz', pathname: '/models/example-bike/', search },
    navigator,
    performance: { now: () => time },
    addEventListener(type, handler) { const entries = listeners.get(`window:${type}`) ?? new Set(); entries.add(handler); listeners.set(`window:${type}`, entries); },
    removeEventListener(type, handler) { listeners.get(`window:${type}`)?.delete(handler); },
    fetch: (url, init) => { requests.push({ url, init }); return Promise.resolve(new Response(null, { status: 204 })); }
  };
  const fire = (type, event = {}) => { for (const handler of [...(listeners.get(type) ?? [])]) handler(event); };
  const advance = (ms) => {
    const target = time + ms;
    while (true) {
      const due = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      time = due[1].at; timers.delete(due[0]); due[1].fn();
    }
    time = target;
  };
  const start = () => startPageEngagement(win, {
    now: () => time,
    setTimer: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, at: time + delay }); return id; },
    clearTimer: (id) => timers.delete(id)
  });
  return { win, doc, listeners, requests, fire, advance, start };
}

test('foreground page engagement requires ten visible seconds and one trusted interaction, then sends once', async () => {
  const f = engagementFixture();
  assert.equal(f.start(), true);
  assert.equal(f.start(), false);
  f.advance(9999);
  f.fire('click', { isTrusted: false });
  f.advance(1);
  assert.equal(f.requests.length, 0);
  f.fire('keydown', { isTrusted: true });
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].url, '/site-events/engagement');
  assert.equal(f.requests[0].init.method, 'POST');
  assert.equal(f.requests[0].init.headers['X-Analytics-Path'], '/models/example-bike/');
  assert.equal(Object.hasOwn(f.requests[0].init, 'body'), false);
  f.fire('scroll', { isTrusted: true });
  assert.equal(f.requests.length, 1);
});

test('foreground engagement pauses its visible-time clock while the document is hidden', () => {
  const f = engagementFixture();
  assert.equal(f.start(), true);
  f.fire('click', { isTrusted: true });
  f.advance(6000);
  f.doc.visibilityState = 'hidden'; f.fire('visibilitychange');
  f.advance(60_000);
  assert.equal(f.requests.length, 0);
  f.doc.visibilityState = 'visible'; f.fire('visibilitychange');
  f.advance(3999);
  assert.equal(f.requests.length, 0);
  f.advance(1);
  assert.equal(f.requests.length, 1);
});

test('foreground engagement honors consent and privacy gates and sends only the exact QA signal', () => {
  for (const options of [
    { allowed: false },
    { navigator: { doNotTrack: '1' } },
    { navigator: { globalPrivacyControl: true } }
  ]) {
    const f = engagementFixture(options);
    assert.equal(f.start(), false);
  }
  const optedOut = engagementFixture();
  stopAnalytics(optedOut.win);
  assert.equal(optedOut.start(), false);

  for (const [search, expectedQa] of [['?measurement_qa=1', '1'], ['?measurement_qa=1&run=secret', undefined], ['?run=secret', undefined]]) {
    const f = engagementFixture({ search });
    assert.equal(f.start(), true);
    f.fire('click', { isTrusted: true }); f.advance(10_000);
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].init.headers['X-Measurement-QA'], expectedQa);
    assert.equal(f.requests[0].init.headers['X-Analytics-Path'], '/models/example-bike/');
  }
  const direct = [];
  assert.equal(sendPageEngagedEvent({ locationRef: new URL('https://chinesebikes.xyz/?measurement_qa=1&label=private'),
    windowRef: {}, navigatorRef: {}, fetchImpl: (url, init) => direct.push({ url, init }) }), true);
  assert.equal(direct[0].init.headers['X-Measurement-QA'], undefined);
});

test('product outbound actions skip DNT, GPC, and non-production hosts', () => {
  const requests = [];
  const common = {
    locationRef: new URL(`${origin}/models/example/`),
    windowRef: {},
    fetchImpl: (...args) => requests.push(args)
  };
  assert.equal(sendProductOutboundClickEvent({ ...common, navigatorRef: { doNotTrack: '1' } }), false);
  assert.equal(sendProductOutboundClickEvent({ ...common, navigatorRef: { globalPrivacyControl: true } }), false);
  assert.equal(sendProductOutboundClickEvent({
    ...common,
    locationRef: new URL('https://preview.example/models/example/'),
    navigatorRef: {}
  }), false);
  assert.equal(requests.length, 0);
});
