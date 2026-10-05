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

export function ga4Identity(request) {
  const cookies = request.headers.get('cookie');
  const existingClientId = cookieValue(cookies, GA4_CLIENT_COOKIE);
  const existingSessionId = cookieValue(cookies, GA4_SESSION_COOKIE);
  const hasClientId = CLIENT_ID_PATTERN.test(existingClientId);
  return {
    clientId: hasClientId ? existingClientId : `${randomPositive64()}.${randomPositive64()}`,
    sessionId: hasClientId && SESSION_ID_PATTERN.test(existingSessionId) ? existingSessionId : null
  };
}

export function ga4StoredIdentity(request) {
  const cookies = request.headers.get('cookie');
  const clientId = cookieValue(cookies, GA4_CLIENT_COOKIE);
  const sessionId = cookieValue(cookies, GA4_SESSION_COOKIE);
  return CLIENT_ID_PATTERN.test(clientId)
    ? { clientId, sessionId: SESSION_ID_PATTERN.test(sessionId) ? sessionId : null }
    : null;
}

export function validGa4SessionId(value) {
  return SESSION_ID_PATTERN.test(String(value ?? ''));
}

export function ga4CookieHeaders(identity) {
  return [`${GA4_CLIENT_COOKIE}=${identity.clientId}; Max-Age=${CLIENT_MAX_AGE}; Path=/; Secure; HttpOnly; SameSite=Lax`];
}

export function ga4SessionCookieHeader(sessionId) {
  return `${GA4_SESSION_COOKIE}=${sessionId}; Max-Age=${SESSION_MAX_AGE}; Path=/; Secure; HttpOnly; SameSite=Lax`;
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
        ...(identity.sessionId ? { session_id: identity.sessionId } : {}),
        page_location: `https://chinesebikes.xyz${analytics.path}`,
        ...(analytics.referrer ? { page_referrer: analytics.referrer } : {})
      }
    }]
  };
  if (analytics.country) body.user_location = { country_id: analytics.country };
  return body;
}

export function ga4ActionPayload(name, identity, context = {}) {
  if (!['compare_open', 'product_outbound_click'].includes(name)) return null;
  return {
    client_id: identity.clientId,
    consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' },
    events: [{ name, params: {
      ...(identity.sessionId ? { session_id: identity.sessionId } : {}),
      ...context,
      ...(context.page_path ? { page_location: `https://chinesebikes.xyz${context.page_path}` } : {})
    } }]
  };
}

function reportDelivery(logger, payload, outcome, status = null) {
  const event = payload.events?.[0]?.name;
  const eventName = ['site_open', 'compare_open', 'product_outbound_click'].includes(event) ? event : 'unknown';
  // Never log the request URL (which contains the secret), payload, IDs, or errors.
  try { logger.info(JSON.stringify({ type: 'ga4_delivery', event: eventName, outcome, status })); } catch {}
}

export async function sendGa4(payload, env, fetchImpl = globalThis.fetch, logger = console) {
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
      // Our Workers compatibility date rejects 'error'. A redirect fails delivery;
      // never follow it with the Measurement Protocol secret or payload.
      redirect: 'manual',
      referrerPolicy: 'no-referrer',
      signal: controller.signal
    });
    reportDelivery(logger, payload, response.ok ? 'http_received' : 'http_rejected', response.status);
    return response.ok;
  } catch {
    reportDelivery(logger, payload, controller.signal.aborted ? 'timeout' : 'network_error');
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
