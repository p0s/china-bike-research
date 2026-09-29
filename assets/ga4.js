const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{5,20}$/;
const CLIENT_ID_PATTERN = /^[1-9]\d{0,19}\.[1-9]\d{0,19}$/;
const SESSION_ID_PATTERN = /^[1-9]\d{9,12}$/;

function referringOrigin(referrer) {
  try { return new URL(referrer).origin; } catch { return undefined; }
}

export async function startGa4(win = globalThis.window) {
  if (!win || win.location.hostname !== 'chinesebikes.xyz'
    || win.navigator?.doNotTrack === '1' || win.navigator?.globalPrivacyControl === true) return false;
  try {
    const response = await win.fetch('/analytics/ga-config', {
      credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer'
    });
    if (!response.ok || response.status === 204) return false;
    const { measurementId, clientId } = await response.json();
    if (!MEASUREMENT_ID_PATTERN.test(measurementId)
      || !CLIENT_ID_PATTERN.test(clientId)) return false;

    win.dataLayer = win.dataLayer || [];
    const gtag = (...args) => win.dataLayer.push(args);
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
    const script = win.document.createElement('script');
    script.async = true;
    script.src = `/gtag/js?id=${encodeURIComponent(measurementId)}`;
    win.document.head.appendChild(script);
    return true;
  } catch {
    return false;
  }
}

void startGa4();
