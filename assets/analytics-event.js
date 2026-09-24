const PRODUCTION_HOSTNAME = 'chinesebikes.xyz';

function doNotTrackEnabled(value) {
  return ['1', 'yes'].includes(String(value ?? '').trim().toLowerCase());
}

export function sendComparisonOpenedEvent({
  locationRef = globalThis.location,
  navigatorRef = globalThis.navigator,
  windowRef = globalThis.window,
  fetchImpl = globalThis.fetch
} = {}) {
  if (locationRef?.hostname !== PRODUCTION_HOSTNAME || typeof fetchImpl !== 'function') return false;
  if (navigatorRef?.globalPrivacyControl === true) return false;
  if ([navigatorRef?.doNotTrack, navigatorRef?.msDoNotTrack, windowRef?.doNotTrack].some(doNotTrackEnabled)) return false;

  const path = String(locationRef.pathname ?? '');
  if (!['/', '/zh/'].includes(path)) return false;

  try {
    const result = fetchImpl('/analytics/event', {
      method: 'POST',
      mode: 'same-origin',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      keepalive: true,
      referrerPolicy: 'no-referrer',
      headers: { 'X-Analytics-Path': path }
    });
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch {
    // Analytics is best-effort and cannot block the comparison.
  }
  return true;
}
