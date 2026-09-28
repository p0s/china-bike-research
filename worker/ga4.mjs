export const GA4_CLIENT_COOKIE = 'p0s_ga_cid';
export const GA4_SESSION_COOKIE = 'p0s_ga_sid';

const CLIENT_MAX_AGE = 30 * 24 * 60 * 60;
const SESSION_MAX_AGE = 30 * 60;
const CLIENT_ID_PATTERN = /^[1-9]\d{0,19}\.[1-9]\d{0,19}$/;
const SESSION_ID_PATTERN = /^[1-9]\d{9,12}$/;
const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{5,20}$/;

function cookieValue(header, name) {
  const entry = String(header ?? '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : '';
}

function randomPositive64() {
  const values = crypto.getRandomValues(new Uint32Array(2));
  return ((BigInt(values[0]) << 32n) | BigInt(values[1]) || 1n).toString();
}

export function ga4Configured(env) {
  return env?.GA4_ENABLED === 'true'
    && MEASUREMENT_ID_PATTERN.test(String(env?.GA4_MEASUREMENT_ID ?? ''))
    && Boolean(String(env?.GA4_API_SECRET ?? '').trim());
}

export function ga4Identity(request, now = Date.now()) {
  const cookies = request.headers.get('cookie');
  const existingClientId = cookieValue(cookies, GA4_CLIENT_COOKIE);
  const existingSessionId = cookieValue(cookies, GA4_SESSION_COOKIE);
  return {
    clientId: CLIENT_ID_PATTERN.test(existingClientId) ? existingClientId : `${randomPositive64()}.${randomPositive64()}`,
    sessionId: SESSION_ID_PATTERN.test(existingSessionId) ? existingSessionId : String(Math.floor(now / 1000))
  };
}

export function ga4StoredIdentity(request) {
  const cookies = request.headers.get('cookie');
  const clientId = cookieValue(cookies, GA4_CLIENT_COOKIE);
  const sessionId = cookieValue(cookies, GA4_SESSION_COOKIE);
  return CLIENT_ID_PATTERN.test(clientId) && SESSION_ID_PATTERN.test(sessionId)
    ? { clientId, sessionId }
    : null;
}

export function ga4CookieHeaders(identity) {
  const attributes = 'Path=/; Secure; HttpOnly; SameSite=Lax';
  return [
    `${GA4_CLIENT_COOKIE}=${identity.clientId}; Max-Age=${CLIENT_MAX_AGE}; ${attributes}`,
    `${GA4_SESSION_COOKIE}=${identity.sessionId}; Max-Age=${SESSION_MAX_AGE}; ${attributes}`
  ];
}

export function clearGa4CookieHeaders(measurementId = '') {
  const names = [GA4_CLIENT_COOKIE, GA4_SESSION_COOKIE, '_ga'];
  if (MEASUREMENT_ID_PATTERN.test(measurementId)) names.push(`_ga_${measurementId.slice(2)}`);
  return names.flatMap((name) => {
    const options = `Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure; SameSite=Lax`;
    return [`${name}=; ${options}`, `${name}=; ${options}; Domain=chinesebikes.xyz`];
  });
}

export function ga4SiteOpenPayload(analytics, identity) {
  const body = {
    client_id: identity.clientId,
    consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' },
    events: [{
      name: 'site_open',
      params: {
        session_id: identity.sessionId,
        page_location: `https://chinesebikes.xyz${analytics.path}`,
        ...(analytics.referrer ? { page_referrer: analytics.referrer } : {})
      }
    }]
  };
  if (analytics.country) body.user_location = { country_id: analytics.country };
  return body;
}

export function ga4ActionPayload(name, identity) {
  if (!['compare_open', 'product_outbound_click'].includes(name)) return null;
  return {
    client_id: identity.clientId,
    consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' },
    events: [{ name, params: { session_id: identity.sessionId } }]
  };
}

export async function sendGa4(payload, env, fetchImpl = globalThis.fetch) {
  if (!payload || !ga4Configured(env)) return false;
  const url = new URL('https://www.google-analytics.com/mp/collect');
  url.searchParams.set('measurement_id', env.GA4_MEASUREMENT_ID);
  url.searchParams.set('api_secret', env.GA4_API_SECRET);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetchImpl(url.toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      signal: controller.signal
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
