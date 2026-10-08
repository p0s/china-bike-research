import test from 'node:test';
import assert from 'node:assert/strict';
import { createActionDispatcher } from '../assets/action-dispatch.js';
import * as events from '../assets/analytics-event.js';
import { stopAnalytics } from '../assets/analytics-choice.js';

function fixture() {
  const requests = [], listeners = new Map(), timers = new Map();
  let resolve, reject, time = 0, nextTimer = 0;
  const module = new Promise((a, b) => { resolve = a; reject = b; });
  const win = { location: new URL('https://chinesebikes.xyz/de/?compare=private#private'), navigator: {},
    fetch: (url, init) => { requests.push({ url, init }); return Promise.resolve(new Response(null, { status: 204 })); },
    addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  const dispatcher = createActionDispatcher({ windowRef: win, loadModule: () => module, now: () => time,
    setTimer: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, at: time + delay }); return id; },
    clearTimer: id => timers.delete(id) });
  return { ...dispatcher, win, requests, resolve: () => resolve(events), reject,
    pagehide: () => listeners.get('pagehide')?.(),
    advance(ms) { time += ms; for (const [id, timer] of [...timers]) if (timer.at <= time) { timers.delete(id); timer.fn(); } } };
}

test('an early comparison is delivered once with its original public path and bounded context', async () => {
  const f = fixture();
  const details = { comparisonCount: 2, selectedModels: ['private'], query: 'private' };
  assert.equal(f.sendComparisonOpenedEvent(details), true);
  details.comparisonCount = 10;
  f.win.location.pathname = '/';
  assert.equal(f.requests.length, 0);
  f.resolve(); await f.ready;
  assert.equal(f.requests.length, 1);
  assert.deepEqual(f.requests[0].init.headers, { 'X-Analytics-Path': '/de/', 'X-Comparison-Count': '2' });
  assert.equal(Object.hasOwn(f.requests[0].init, 'body'), false);
  assert.equal(f.sendComparisonOpenedEvent({ comparisonCount: 3 }), true);
  assert.equal(f.requests.length, 2);
  f.dispose();
});

test('queued actions honor current opt-out, DNT and GPC when the module resolves', async () => {
  for (const stop of [win => stopAnalytics(win), win => { win.navigator.doNotTrack = '1'; },
    win => { win.navigator.globalPrivacyControl = true; }]) {
    const f = fixture();
    f.sendComparisonOpenedEvent({ comparisonCount: 2 });
    stop(f.win); f.resolve(); await f.ready;
    assert.equal(f.requests.length, 0);
    assert.equal(f.sendComparisonOpenedEvent({ comparisonCount: 2 }), false);
    f.dispose();
  }
});

test('failed or throwing optional loaders discard actions without propagating an error', async () => {
  const f = fixture();
  f.sendComparisonOpenedEvent({ comparisonCount: 2 });
  f.reject(new Error('Blocked')); await f.ready;
  assert.equal(f.sendComparisonOpenedEvent({ comparisonCount: 2 }), false);
  assert.equal(f.requests.length, 0); f.dispose();
  const throws = createActionDispatcher({ windowRef: f.win, loadModule() { throw new Error('Unavailable'); } });
  await throws.ready;
  assert.equal(throws.sendComparisonOpenedEvent({ comparisonCount: 2 }), false); throws.dispose();
});

test('pending events expire after five seconds and are discarded on departure', async () => {
  for (const discard of [f => f.advance(5000), f => f.pagehide()]) {
    const f = fixture(); f.sendComparisonOpenedEvent({ comparisonCount: 2 });
    discard(f); f.resolve(); await f.ready;
    assert.equal(f.requests.length, 0);
    assert.equal(f.sendComparisonOpenedEvent({ comparisonCount: 2 }), true);
    assert.equal(f.requests.length, 1); f.dispose();
  }
});

test('pending work is capped and expired entries release capacity before a loader finishes', async () => {
  const f = fixture();
  for (let i = 0; i < 20; i++) assert.equal(f.sendComparisonOpenedEvent({ comparisonCount: 2 }), true);
  assert.equal(f.sendComparisonOpenedEvent({ comparisonCount: 2 }), false);
  f.advance(5000);
  assert.equal(f.sendComparisonOpenedEvent({ comparisonCount: 2 }), true);
  f.resolve(); await f.ready;
  assert.equal(f.requests.length, 1); f.dispose();
});

test('a ready outbound sender starts its keepalive request immediately, before navigation', async () => {
  const f = fixture(); f.resolve(); await f.ready;
  f.win.location.pathname = '/models/test-bike/';
  assert.equal(f.sendProductOutboundClickEvent({ sourceId: 'test-source' }), true);
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].init.keepalive, true);
  f.pagehide();
  assert.equal(f.requests.length, 1); f.dispose();
});

test('only permitted public IDs and page types can enter the pending buffer', async () => {
  const f = fixture();
  assert.equal(f.sendProductOutboundClickEvent({ offerId: 'test-offer', destination: 'private' }), true);
  assert.equal(f.sendProductOutboundClickEvent({ sourceId: 'test-source' }), false);
  assert.equal(f.sendProductOutboundClickEvent({ offerId: 'user@example.com' }), false);
  assert.equal(f.sendProductOutboundClickEvent({ offerId: 'test-offer', sourceId: 'test-source' }), false);
  assert.equal(f.sendComparisonOpenedEvent({ comparisonCount: 11 }), false);
  f.resolve(); await f.ready;
  assert.deepEqual(JSON.parse(f.requests[0].init.body), {
    actionId: 'product_outbound_click', pagePath: '/de/', offerId: 'test-offer' });
  assert.equal(f.requests.length, 1); f.dispose();
});
