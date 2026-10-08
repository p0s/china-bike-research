const MAX_PENDING = 20;
const MAX_AGE_MS = 5000;
const PUBLIC_ID = /^[a-z0-9][a-z0-9-]{0,149}$/;
const CATALOG_PATHS = ['/', '/zh/', '/de/'];
const MODEL_PATH = /^(?:\/(?:zh|de))?\/models\/[a-z0-9][a-z0-9-]{0,149}\/$/;

function excluded(win) {
  const nav = win?.navigator;
  return win?.p0sAnalyticsStopped || win?.location?.hostname !== 'chinesebikes.xyz'
    || nav?.globalPrivacyControl === true
    || [nav?.doNotTrack, nav?.msDoNotTrack, win?.doNotTrack]
      .some(value => ['1', 'yes'].includes(String(value ?? '').trim().toLowerCase()));
}

// The catalog never waits for optional analytics. Keep only bounded public
// context while its module loads; failure or navigation discards pending work.
export function createActionDispatcher({
  windowRef = globalThis.window,
  loadModule = () => import('./analytics-event.js'),
  now = () => performance.now(),
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout
} = {}) {
  let events, unavailable = false, pending = [], timer;
  const clearPending = () => {
    pending = [];
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
  };
  const expire = () => {
    timer = undefined;
    pending = pending.filter(entry => now() - entry.at < MAX_AGE_MS);
    if (pending.length) timer = setTimer(expire, MAX_AGE_MS - (now() - pending[0].at));
  };
  windowRef?.addEventListener?.('pagehide', clearPending);

  function deliver(name, args) {
    if (excluded(windowRef)) return false;
    try {
      return events[name]({ ...args, windowRef, navigatorRef: windowRef.navigator,
        fetchImpl: windowRef.fetch.bind(windowRef) });
    } catch { return false; }
  }

  function send(name, details = {}) {
    if (unavailable || excluded(windowRef)) return false;
    const path = windowRef.location.pathname;
    const args = { locationRef: { hostname: windowRef.location.hostname, pathname: path } };
    if (name === 'sendComparisonOpenedEvent') {
      if (!CATALOG_PATHS.includes(path)) return false;
      if (details.comparisonCount !== undefined) {
        if (!Number.isInteger(details.comparisonCount) || details.comparisonCount < 2 || details.comparisonCount > 10) return false;
        args.comparisonCount = details.comparisonCount;
      }
    } else {
      const key = details.offerId !== undefined ? 'offerId' : 'sourceId';
      if (details.offerId !== undefined && details.sourceId !== undefined) return false;
      if (typeof details[key] !== 'string' || !PUBLIC_ID.test(details[key])) return false;
      if (!(key === 'offerId' ? CATALOG_PATHS.includes(path) : MODEL_PATH.test(path))) return false;
      args[key] = details[key];
    }
    if (events) return deliver(name, args);
    pending = pending.filter(entry => now() - entry.at < MAX_AGE_MS);
    if (pending.length >= MAX_PENDING) return false;
    pending.push({ name, args, at: now() });
    if (timer === undefined) timer = setTimer(expire, MAX_AGE_MS);
    return true;
  }

  const ready = Promise.resolve().then(loadModule).then(module => {
    events = module;
    const queued = pending;
    clearPending();
    for (const entry of queued) {
      if (now() - entry.at < MAX_AGE_MS) deliver(entry.name, entry.args);
    }
  }).catch(() => { unavailable = true; clearPending(); });

  return {
    sendComparisonOpenedEvent: details => send('sendComparisonOpenedEvent', details),
    sendProductOutboundClickEvent: details => send('sendProductOutboundClickEvent', details),
    ready,
    dispose() { clearPending(); windowRef?.removeEventListener?.('pagehide', clearPending); unavailable = true; }
  };
}
