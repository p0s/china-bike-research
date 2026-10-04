const PRODUCTION_HOSTNAME = 'chinesebikes.xyz';

function doNotTrackEnabled(value) {
  return ['1', 'yes'].includes(String(value ?? '').trim().toLowerCase());
}

export function sendComparisonOpenedEvent({
  comparisonCount,
  locationRef = globalThis.location,
  navigatorRef = globalThis.navigator,
  windowRef = globalThis.window,
  fetchImpl = globalThis.fetch
} = {}) {
  if (locationRef?.hostname !== PRODUCTION_HOSTNAME || typeof fetchImpl !== 'function') return false;
  if (navigatorRef?.globalPrivacyControl === true) return false;
  if ([navigatorRef?.doNotTrack, navigatorRef?.msDoNotTrack, windowRef?.doNotTrack].some(doNotTrackEnabled)) return false;

  const path = String(locationRef.pathname ?? '');
  if (!['/', '/zh/', '/de/'].includes(path)) return false;

  try {
    const result = fetchImpl('/analytics/event', {
      method: 'POST',
      mode: 'same-origin',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      keepalive: true,
      referrerPolicy: 'no-referrer',
      headers: { 'X-Analytics-Path': path,
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
  locationRef = globalThis.location,
  navigatorRef = globalThis.navigator,
  windowRef = globalThis.window,
  fetchImpl = globalThis.fetch
} = {}) {
  if (locationRef?.hostname !== PRODUCTION_HOSTNAME || typeof fetchImpl !== 'function') return false;
  if (navigatorRef?.globalPrivacyControl === true) return false;
  if ([navigatorRef?.doNotTrack, navigatorRef?.msDoNotTrack, windowRef?.doNotTrack].some(doNotTrackEnabled)) return false;

  const pagePath = String(locationRef.pathname ?? '');
  if (sourceId !== undefined && (typeof sourceId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,149}$/.test(sourceId)
    || !/^(?:\/(?:zh|de))?\/models\/[a-z0-9][a-z0-9-]{0,149}\/$/.test(pagePath))) return false;

  try {
    const result = fetchImpl('/analytics/action', {
      method: 'POST',
      mode: 'same-origin',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      keepalive: true,
      referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId: 'product_outbound_click',
        ...(sourceId ? { pagePath, sourceId } : {}) })
    });
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch {
    // Analytics is best-effort and cannot block the outgoing product link.
  }
  return true;
}
