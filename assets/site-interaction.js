const PRODUCTION_HOSTNAME = 'chinesebikes.xyz';
const SITE_EVENTS_ACTION_ROUTE = '/site-events/action';
const SITE_EVENTS_ENGAGEMENT_ROUTE = '/site-events/engagement';
const MIN_VISIBLE_ENGAGEMENT_MS = 10_000;
const engagementDocuments = new WeakSet();

function doNotTrackEnabled(value) {
  return ['1', 'yes'].includes(String(value ?? '').trim().toLowerCase());
}

function analyticsAllowed(windowRef, navigatorRef = windowRef?.navigator) {
  const body = windowRef?.document?.body;
  return !windowRef?.p0sAnalyticsStopped
    && (!body || body.dataset?.analyticsAllowed === 'true')
    && navigatorRef?.globalPrivacyControl !== true
    && ![navigatorRef?.doNotTrack, navigatorRef?.msDoNotTrack,
      windowRef?.doNotTrack].some(doNotTrackEnabled);
}

function fixedEventHeaders(locationRef) {
  return {
    'X-Analytics-Path': String(locationRef?.pathname ?? ''),
    ...(locationRef?.search === '?measurement_qa=1' ? { 'X-Measurement-QA': '1' } : {})
  };
}

export function sendComparisonOpenedEvent({
  comparisonCount,
  locationRef = globalThis.location,
  navigatorRef = globalThis.navigator,
  windowRef = globalThis.window,
  fetchImpl = globalThis.fetch
} = {}) {
  if (locationRef?.hostname !== PRODUCTION_HOSTNAME || typeof fetchImpl !== 'function') return false;
  if (!analyticsAllowed(windowRef, navigatorRef)) return false;

  const path = String(locationRef.pathname ?? '');
  if (!['/', '/zh/', '/de/'].includes(path)) return false;

  try {
    const result = fetchImpl(SITE_EVENTS_ACTION_ROUTE, {
      method: 'POST',
      mode: 'cors',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      keepalive: true,
      referrerPolicy: 'no-referrer',
      headers: { ...fixedEventHeaders(locationRef),
        ...(Number.isInteger(comparisonCount) && comparisonCount >= 2 && comparisonCount <= 10
          ? { 'X-Comparison-Count': String(comparisonCount) } : {}) }
    });
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch {
    // Analytics is best-effort and cannot block the comparison.
  }
  return true;
}

export function sendProductOutboundClickEvent({
  sourceId,
  offerId,
  locationRef = globalThis.location,
  navigatorRef = globalThis.navigator,
  windowRef = globalThis.window,
  fetchImpl = globalThis.fetch
} = {}) {
  if (locationRef?.hostname !== PRODUCTION_HOSTNAME || typeof fetchImpl !== 'function') return false;
  if (!analyticsAllowed(windowRef, navigatorRef)) return false;

  const pagePath = String(locationRef.pathname ?? '');
  if (offerId !== undefined && (sourceId !== undefined || typeof offerId !== 'string'
    || !/^[a-z0-9][a-z0-9-]{0,149}$/.test(offerId) || !['/', '/zh/', '/de/'].includes(pagePath))) return false;
  if (sourceId !== undefined && (typeof sourceId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,149}$/.test(sourceId)
    || !/^(?:\/(?:zh|de))?\/models\/[a-z0-9][a-z0-9-]{0,149}\/$/.test(pagePath))) return false;

  try {
    const result = fetchImpl(SITE_EVENTS_ACTION_ROUTE, {
      method: 'POST',
      mode: 'cors',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      keepalive: true,
      referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json',
        ...(locationRef?.search === '?measurement_qa=1' ? { 'X-Measurement-QA': '1' } : {}) },
      body: JSON.stringify({ actionId: 'product_outbound_click',
        ...(sourceId ? { pagePath, sourceId } : {}),
        ...(offerId ? { pagePath, offerId } : {}) })
    });
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch {
    // Analytics is best-effort and cannot block the outgoing product link.
  }
  return true;
}

export function sendPageEngagedEvent({
  locationRef = globalThis.location,
  navigatorRef = globalThis.navigator,
  windowRef = globalThis.window,
  fetchImpl = globalThis.fetch
} = {}) {
  if (locationRef?.hostname !== PRODUCTION_HOSTNAME || typeof fetchImpl !== 'function'
    || !analyticsAllowed(windowRef, navigatorRef)) return false;
  const path = String(locationRef.pathname ?? '');
  if (!path.startsWith('/') || path.length > 500 || !path.endsWith('/') || /[?#\u0000-\u001f\u007f]/.test(path)) return false;

  try {
    const result = fetchImpl(SITE_EVENTS_ENGAGEMENT_ROUTE, {
      method: 'POST',
      mode: 'cors',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      keepalive: true,
      referrerPolicy: 'no-referrer',
      headers: fixedEventHeaders(locationRef)
    });
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch {
    // Engagement is best-effort and cannot affect the page.
  }
  return true;
}

export function startPageEngagement(windowRef = globalThis.window, {
  now = () => windowRef?.performance?.now?.() ?? Date.now(),
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
  fetchImpl = windowRef?.fetch?.bind(windowRef)
} = {}) {
  const doc = windowRef?.document;
  const locationRef = windowRef?.location;
  if (!doc?.addEventListener || !locationRef || locationRef.hostname !== PRODUCTION_HOSTNAME
    || !analyticsAllowed(windowRef) || engagementDocuments.has(doc)) return false;
  const path = String(locationRef.pathname ?? '');
  if (!path.startsWith('/') || path.length > 500 || !path.endsWith('/') || /[?#\u0000-\u001f\u007f]/.test(path)) return false;
  engagementDocuments.add(doc);

  let visibleMs = 0;
  let visibleSince = null;
  let interacted = false;
  let sent = false;
  let timer = null;
  let ended = false;

  const isVisible = () => doc.visibilityState === 'visible';
  const totalVisible = () => visibleMs + (visibleSince === null ? 0 : Math.max(0, now() - visibleSince));
  const removeInteractionListeners = () => {
    for (const type of ['click', 'keydown', 'scroll']) doc.removeEventListener(type, onInteraction, true);
  };
  const cleanup = () => {
    ended = true;
    if (timer !== null) clearTimer(timer);
    timer = null;
    removeInteractionListeners();
    doc.removeEventListener('visibilitychange', onVisibilityChange);
    windowRef.removeEventListener?.('pagehide', cleanup);
  };
  const maybeSend = () => {
    if (sent || ended || !interacted || !isVisible() || totalVisible() < MIN_VISIBLE_ENGAGEMENT_MS
      || !analyticsAllowed(windowRef)) return false;
    sent = true;
    cleanup();
    return sendPageEngagedEvent({ locationRef, navigatorRef: windowRef.navigator, windowRef, fetchImpl });
  };
  const scheduleVisibleTime = () => {
    if (ended || sent || !isVisible() || !analyticsAllowed(windowRef)) return;
    if (visibleSince === null) visibleSince = now();
    maybeSend();
    const remaining = MIN_VISIBLE_ENGAGEMENT_MS - totalVisible();
    if (remaining <= 0 || timer !== null) return;
    timer = setTimer(() => {
      timer = null;
      if (!isVisible() || ended || !analyticsAllowed(windowRef)) return;
      const current = now();
      visibleMs += visibleSince === null ? 0 : Math.max(0, current - visibleSince);
      visibleSince = current;
      maybeSend();
      if (!sent) scheduleVisibleTime();
    }, remaining);
  };
  function onInteraction(event) {
    if (!event?.isTrusted || !isVisible() || !analyticsAllowed(windowRef)) return;
    interacted = true;
    removeInteractionListeners();
    maybeSend();
  }
  function onVisibilityChange() {
    if (!isVisible()) {
      if (visibleSince !== null) visibleMs += Math.max(0, now() - visibleSince);
      visibleSince = null;
      if (timer !== null) clearTimer(timer);
      timer = null;
      return;
    }
    scheduleVisibleTime();
  }

  for (const type of ['click', 'keydown', 'scroll']) {
    doc.addEventListener(type, onInteraction, { capture: true, passive: true });
  }
  doc.addEventListener('visibilitychange', onVisibilityChange);
  windowRef.addEventListener?.('pagehide', cleanup, { once: true });
  if (isVisible()) scheduleVisibleTime();
  return true;
}

if (typeof globalThis.window !== 'undefined') startPageEngagement(globalThis.window);
