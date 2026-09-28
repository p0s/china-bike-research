import test from 'node:test';
import assert from 'node:assert/strict';
import { sendComparisonOpenedEvent, sendProductOutboundClickEvent } from '../assets/analytics-event.js';

const origin = 'https://chinesebikes.xyz';

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
  assert.equal(requests[0].url, '/analytics/event');
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
  assert.equal(requests[0].url, '/analytics/action');
  assert.equal(requests[0].init.referrerPolicy, 'no-referrer');
  assert.deepEqual(JSON.parse(requests[0].init.body), { actionId: 'product_outbound_click' });
  assert.deepEqual(Object.keys(requests[0].init.headers), ['Content-Type']);
  assert.equal(Object.hasOwn(requests[0].init, 'referrer'), false);
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
