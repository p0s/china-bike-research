const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{5,20}$/;
const CLIENT_ID_PATTERN = /^[1-9]\d{0,19}\.[1-9]\d{0,19}$/;
const SESSION_ID_PATTERN = /^[1-9]\d{9,12}$/;
const GATEWAY_PATH = '/sitedelivery';
// Recognize the previous injection during a staged gateway configuration change.
const GATEWAY_LOADER_PATHS = [GATEWAY_PATH, '/gtag'];
const initializedPages = new WeakSet();

function referringOrigin(referrer) {
  try { return new URL(referrer).origin; } catch { return undefined; }
}

export function collectionRequestUrl(input, origin, measurementId) {
  if (typeof input !== 'string') return input;
  try {
    const target = new URL(input, origin);
    if (target.origin !== origin || target.pathname !== `${GATEWAY_PATH}/ga/g/c`
      || target.searchParams.get('v') !== '2'
      || target.searchParams.get('tid') !== measurementId) return input;
    // Keep equivalent collection URLs in a stable parameter order. Sorting
    // preserves values and the order of repeated keys.
    target.searchParams.sort();
    return target.href;
  } catch { return input; }
}

function configureCollectionTransport(win, measurementId) {
  const originalFetch = win.fetch;
  win.fetch = function (input, init) {
    return originalFetch.call(win, collectionRequestUrl(input, win.location.origin, measurementId), init);
  };
  const originalBeacon = win.navigator?.sendBeacon;
  if (typeof originalBeacon === 'function') {
    win.navigator.sendBeacon = function (url, data) {
      return originalBeacon.call(win.navigator, collectionRequestUrl(url, win.location.origin, measurementId), data);
    };
  }
}

export async function startGa4(win = globalThis.window) {
  if (!win || win.location.hostname !== 'chinesebikes.xyz'
    || win.navigator?.doNotTrack === '1' || win.navigator?.globalPrivacyControl === true
    || !win.document.querySelector('script[data-ga4-page]') || initializedPages.has(win)) return false;
  initializedPages.add(win);
  try {
    const response = await win.fetch('/analytics/ga-config', {
      credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer'
    });
    if (!response.ok || response.status === 204) return false;
    const { measurementId, clientId } = await response.json();
    if (!MEASUREMENT_ID_PATTERN.test(measurementId)
      || !CLIENT_ID_PATTERN.test(clientId)) return false;

    configureCollectionTransport(win, measurementId);
    win.dataLayer = win.dataLayer || [];
    function gtag() { win.dataLayer.push(arguments); }
    win.gtag = gtag;
    gtag('consent', 'default', {
      analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    gtag('js', new Date());
    const pageLocation = `${win.location.origin}${win.location.pathname}`;
    const pageReferrer = referringOrigin(win.document.referrer);
    gtag('config', measurementId, {
      client_id: clientId,
      page_location: pageLocation,
      ...(pageReferrer ? { page_referrer: pageReferrer } : {}),
      cookie_domain: 'none',
      cookie_expires: 30 * 24 * 60 * 60,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      send_page_view: false
    });
    gtag('event', 'page_view', {
      send_to: measurementId,
      page_location: pageLocation,
      ...(pageReferrer ? { page_referrer: pageReferrer } : {})
    });
    gtag('get', measurementId, 'client_id', (tagClientId) => {
      if (String(tagClientId) !== clientId) return;
      gtag('get', measurementId, 'session_id', (sessionId) => {
        if (!SESSION_ID_PATTERN.test(String(sessionId))) return;
        void win.fetch('/analytics/ga-session', {
          method: 'POST',
          headers: { 'x-ga4-session-id': String(sessionId) },
          credentials: 'same-origin',
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
          keepalive: true
        }).catch(() => {});
      });
    });
    // Cloudflare injects the library even with Set up tag off. Reuse that
    // loader so the site's fallback does not download the same library twice.
    const hasLoader = Array.from(win.document.scripts).some((script) => {
      try {
        const src = new URL(script.src, win.location.origin);
        return src.origin === win.location.origin && GATEWAY_LOADER_PATHS.some((path) =>
          src.pathname === `${path}/`
          || (src.pathname === `${path}/js` && src.searchParams.get('id') === measurementId));
      } catch { return false; }
    });
    if (!hasLoader) {
      const script = win.document.createElement('script');
      script.async = true;
      script.src = `${GATEWAY_PATH}/js?id=${encodeURIComponent(measurementId)}`;
      win.document.head.appendChild(script);
    }
    return true;
  } catch {
    return false;
  }
}

void startGa4();
