const PRODUCTION_HOSTNAME = 'china-bikes.p0s.eu';
const OPT_OUT_COOKIE = 'p0s_analytics_optout';
const OPT_OUT_MAX_AGE = 31_536_000;
// Umami's current ingestion field is capped at 500 characters; keep the edge
// stricter than the upstream frozen contract so the gateway never rejects a
// valid document path after deployment.
const MAX_PATH_LENGTH = 500;
const MAX_REFERRER_LENGTH = 255;
const MAX_USER_AGENT_LENGTH = 512;
const COMPARISON_OPEN_EVENT_NAME = 'compare_open';
const ANALYTICS_EVENT_ROUTE = '/analytics/event';

const publicDocumentPattern = /^(?:\/zh)?\/(?:models|brands|prices|complete-bikes|framesets|build|methodology|privacy|image-policy|image-sources|electronic-shifting|blog)(?:\/|$)/;
const privatePathPattern = /\/(?:account|admin|auth|login|logout|job|jobs|private|session|token|api)(?:\/|$)/i;
const suspiciousPathPattern = /(?:@[\w.-]+\.[A-Za-z]{2,}|[0-9a-f]{32,}|(?:^|\/)\d{6,}(?:\/|$))/i;
const botPattern = /(?:bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pagespeed|prerender|curl|wget|python-requests|go-http-client|uptimerobot|statuscake)/i;
const prefetchPattern = /(?:prefetch|prerender)/i;

const SECURITY_HEADERS = {
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
  'permissions-policy': 'camera=(), geolocation=(), microphone=(), payment=()'
};

function responseWithHeaders(response, extra = {}) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  for (const [name, value] of Object.entries(extra)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function htmlResponse(body, status = 200, extra = {}) {
  return responseWithHeaders(new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>China Bikes</title></head><body>${body}</body></html>`, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' }
  }), {
    'cache-control': 'no-store',
    ...extra
  });
}

function plainResponse(body, status, extra = {}) {
  return responseWithHeaders(new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  }), extra);
}

function normalizeBooleanHeader(value) {
  return String(value ?? '').trim().toLowerCase() === '1';
}

export function hasOptOutCookie(cookieHeader = '') {
  return String(cookieHeader)
    .split(';')
    .some((part) => part.trim().toLowerCase() === `${OPT_OUT_COOKIE}=1`);
}

function validIPv4(value) {
  const parts = value.split('.');
  return parts.length === 4 && parts.every((part) => /^(?:0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255);
}

function validIPv6(value) {
  if (!value.includes(':') || value.includes(':::')) return false;
  const compressionIndex = value.indexOf('::');
  const hasCompression = compressionIndex !== -1;
  if (hasCompression && compressionIndex !== value.lastIndexOf('::')) return false;

  const left = hasCompression ? value.slice(0, compressionIndex) : value;
  const right = hasCompression ? value.slice(compressionIndex + 2) : '';
  const leftGroups = left ? left.split(':') : [];
  const rightGroups = right ? right.split(':') : [];
  if (leftGroups.some((group) => !group) || rightGroups.some((group) => !group)) return false;

  const groups = [...leftGroups, ...rightGroups];
  const dottedGroups = groups.filter((group) => group.includes('.'));
  if (dottedGroups.length > 1) return false;
  if (dottedGroups.length === 1) {
    const dottedGroup = dottedGroups[0];
    // A dotted IPv4 tail expands to two 16-bit groups and must remain last.
    if (groups.at(-1) !== dottedGroup || (hasCompression && rightGroups.length === 0)) return false;
    if (!validIPv4(dottedGroup)) return false;
  }

  const groupCount = groups.reduce((count, group) => {
    if (group.includes('.')) return count + 2;
    return /^[0-9a-f]{1,4}$/i.test(group) ? count + 1 : Number.NaN;
  }, 0);
  if (!Number.isFinite(groupCount)) return false;
  return hasCompression ? groupCount < 8 : groupCount === 8;
}

function validClientIp(value) {
  const ip = String(value ?? '').trim();
  if (!ip || ip.length > 64 || /[\u0000-\u001f\u007f\s]/.test(ip)) return false;
  if (ip.includes(':')) return validIPv6(ip);
  return validIPv4(ip);
}

export function referrerOrigin(value) {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    const origin = parsed.origin;
    return origin.length <= MAX_REFERRER_LENGTH ? origin : '';
  } catch {
    return '';
  }
}

function requestCountry(request) {
  const country = String(request.cf?.country ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : '';
}

function documentPath(pathname) {
  if (pathname === '/' || pathname === '/zh' || pathname === '/zh/' || pathname === '/404.html') return true;
  return publicDocumentPattern.test(pathname);
}

export function isEligibleDocumentPath(pathname) {
  if (!documentPath(pathname) || pathname === '/404.html') return false;
  if (pathname.length > MAX_PATH_LENGTH || privatePathPattern.test(pathname) || suspiciousPathPattern.test(pathname)) return false;
  return pathname === '/' || pathname.endsWith('/');
}

function hasPrefetchIntent(request) {
  return [
    request.headers.get('purpose'),
    request.headers.get('sec-purpose'),
    request.headers.get('x-purpose'),
    request.headers.get('x-moz'),
    request.headers.get('sec-fetch-mode')
  ].some((value) => prefetchPattern.test(String(value ?? '')));
}

function looksLikeBot(request) {
  return botPattern.test(request.headers.get('user-agent') ?? '');
}

function isExcludedAnalyticsRequest(request) {
  return normalizeBooleanHeader(request.headers.get('dnt'))
    || normalizeBooleanHeader(request.headers.get('sec-gpc'))
    || hasOptOutCookie(request.headers.get('cookie'))
    || hasPrefetchIntent(request)
    || looksLikeBot(request);
}

function analyticsIdentity(request) {
  const ip = String(request.headers.get('cf-connecting-ip') ?? '').trim();
  if (!validClientIp(ip)) return null;
  const userAgent = String(request.headers.get('user-agent') ?? '').trim();
  if (!userAgent || /[\u0000-\u001f\u007f]/.test(userAgent)) return null;

  const identity = {
    ip,
    userAgent: userAgent.slice(0, MAX_USER_AGENT_LENGTH)
  };
  const country = requestCountry(request);
  if (country) identity.country = country;
  return identity;
}

export function analyticsPayload(request, url) {
  if (request.method !== 'GET' || url.hostname !== PRODUCTION_HOSTNAME || !isEligibleDocumentPath(url.pathname)) return null;
  if (isExcludedAnalyticsRequest(request)) return null;
  const identity = analyticsIdentity(request);
  if (!identity) return null;

  const payload = {
    hostname: PRODUCTION_HOSTNAME,
    path: url.pathname,
    referrer: referrerOrigin(request.headers.get('referer') ?? request.headers.get('referrer') ?? ''),
    ...identity
  };
  return payload;
}

export async function ingestAnalytics(payload, env, fetchImpl = globalThis.fetch) {
  const endpoint = String(env?.ANALYTICS_INGEST_URL ?? '').trim();
  const token = String(env?.ANALYTICS_INGEST_TOKEN ?? '');
  if (!payload || !endpoint || !token) return false;
  let parsed;
  try { parsed = new URL(endpoint); } catch { return false; }
  if (parsed.protocol !== 'https:') return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function sameOriginPost(request, url) {
  const origin = request.headers.get('origin');
  if (origin) return origin === url.origin;
  const referer = request.headers.get('referer') ?? request.headers.get('referrer');
  if (!referer) return false;
  try { return new URL(referer).origin === url.origin; } catch { return false; }
}

function validEventPagePath(path) {
  return typeof path === 'string' && ['/', '/zh/'].includes(path) && isEligibleDocumentPath(path);
}

export function analyticsEventPayload(request, url) {
  if (request.method !== 'POST' || url.hostname !== PRODUCTION_HOSTNAME || url.pathname !== ANALYTICS_EVENT_ROUTE) return null;
  if (url.search || url.hash || request.headers.has('content-type') || !sameOriginPost(request, url)) return null;

  const path = request.headers.get('x-analytics-path') ?? '';
  if (!validEventPagePath(path) || isExcludedAnalyticsRequest(request)) return null;
  const identity = analyticsIdentity(request);
  if (!identity) return null;

  return {
    hostname: PRODUCTION_HOSTNAME,
    path,
    ...identity,
    eventName: COMPARISON_OPEN_EVENT_NAME
  };
}

function noContentResponse(status = 204) {
  return responseWithHeaders(new Response(null, { status }), { 'cache-control': 'no-store' });
}

async function hasEventBodyBytes(request) {
  if (!request.body) return false;
  const reader = request.body.getReader();
  try {
    // Cloudflare can expose an empty POST as a readable stream. Inspect only
    // enough to distinguish an empty request from a submitted payload.
    for (let i = 0; i < 4; i += 1) {
      const { done, value } = await reader.read();
      if (done) return false;
      if (value?.byteLength) return true;
    }
    return true;
  } catch {
    return true;
  } finally {
    reader.releaseLock();
  }
}

async function comparisonEventResponse(request, url, env, ctx) {
  if (request.method !== 'POST') return plainResponse('Method not allowed', 405, { allow: 'POST' });
  if (!sameOriginPost(request, url)) return plainResponse('Origin check failed', 403);
  if (url.search || request.headers.has('content-type') || await hasEventBodyBytes(request)) return plainResponse('Invalid event request', 400);

  const path = request.headers.get('x-analytics-path') ?? '';
  if (!validEventPagePath(path)) return plainResponse('Invalid event request', 400);
  const payload = analyticsEventPayload(request, url);
  if (payload && typeof ctx.waitUntil === 'function') ctx.waitUntil(ingestAnalytics(payload, env));
  return noContentResponse();
}

function choiceResponse(request, url, optOut) {
  if (request.method !== 'POST') return plainResponse('Method not allowed', 405, { allow: 'POST' });
  if (!sameOriginPost(request, url)) return plainResponse('Origin check failed', 403);
  const cookie = optOut
    ? `${OPT_OUT_COOKIE}=1; Max-Age=${OPT_OUT_MAX_AGE}; Path=/; Secure; HttpOnly; SameSite=Lax`
    : `${OPT_OUT_COOKIE}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure; HttpOnly; SameSite=Lax`;
  const action = optOut ? 'excluded from' : 'included in';
  return htmlResponse(`<main><h1>Analytics preference saved</h1><p>This browser is now ${action} optional page analytics.</p><p>DNT and Global Privacy Control remain honored when present.</p><p><a href="/privacy/">Return to the privacy page</a></p></main>`, 200, { 'set-cookie': cookie });
}

function trailingSlashRedirect(url) {
  if (!documentPath(url.pathname) || url.pathname === '/' || url.pathname === '/404.html' || url.pathname.endsWith('/') || url.pathname.includes('.')) return null;
  const target = new URL(url);
  target.pathname = `${target.pathname}/`;
  return new Response(null, {
    status: 308,
    headers: {
      ...SECURITY_HEADERS,
      location: target.toString(),
      'cache-control': 'public, max-age=3600'
    }
  });
}

export async function handleRequest(request, env = {}, ctx = {}) {
  const url = new URL(request.url);
  if (url.pathname === '/analytics/opt-out') return choiceResponse(request, url, true);
  if (url.pathname === '/analytics/opt-in') return choiceResponse(request, url, false);
  if (url.pathname === ANALYTICS_EVENT_ROUTE) return comparisonEventResponse(request, url, env, ctx);

  const redirect = trailingSlashRedirect(url);
  if (redirect) return redirect;

  if (!env.ASSETS?.fetch) return plainResponse('Static assets binding is unavailable', 500);
  const response = responseWithHeaders(await env.ASSETS.fetch(request));
  if (response.status === 200 && (response.headers.get('content-type') ?? '').toLowerCase().startsWith('text/html')) {
    const payload = analyticsPayload(request, url);
    if (payload) {
      const task = ingestAnalytics(payload, env);
      if (typeof ctx.waitUntil === 'function') ctx.waitUntil(task);
    }
  }
  return response;
}

export default { fetch: handleRequest };
