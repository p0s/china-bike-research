// Operational policy, reviewed 2026-09-30. See docs/analytics-consent-policy.md.
// The listed European territories use the prior-choice policy.
export const CONSENT_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CN', 'TR',
  'AX', 'GF', 'GP', 'MQ', 'RE', 'YT', 'MF', 'GI', 'GG', 'JE', 'IM'
]);
export const CONSENT_COOKIE = 'p0s_analytics_consent';
export const CONSENT_VERSION = 'v1';
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60;

function cookieValue(request, name) {
  return String(request.headers.get('cookie') ?? '').split(';').map(part => part.trim())
    .find(part => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? '';
}

export function hasAnalyticsConsent(request) {
  return cookieValue(request, CONSENT_COOKIE) === CONSENT_VERSION;
}

export function needsAnalyticsConsent(request) {
  // Only Cloudflare's trusted metadata can choose the policy. Never use a
  // browser-supplied country header, query, locale, or cookie.
  const country = String(request.cf?.country ?? '').toUpperCase();
  // Unknown locations follow the automatic-analytics default. Explicit
  // opt-out, DNT and GPC still override that default in the request gate.
  return CONSENT_COUNTRIES.has(country);
}

export function analyticsConsentAllowed(request) {
  return hasAnalyticsConsent(request) || !needsAnalyticsConsent(request);
}

export function analyticsScriptPolicy(allowed, nonce = '') {
  // Cloudflare injects /sitedelivery/ before site code. Block that bootstrap;
  // only our nonce-bearing loader may start, after the privacy decision and defaults.
  const sources = [allowed && nonce ? `'nonce-${nonce}'` : "'unsafe-inline'", 'https://chinesebikes.xyz/assets/'];
  if (allowed) sources.push('https://www.googletagmanager.com/gtag/js', 'https://www.googletagmanager.com/debug/');
  return `script-src ${sources.join(' ')}; object-src 'none'; base-uri 'self'`;
}

export function analyticsBanner(chinese = false) {
  const text = chinese
    ? '允许分析 Cookie，帮助我们改进网站？数据会由 Google 在境外处理。'
    : 'Allow analytics cookies to help improve this site? Google processes data abroad.';
  return `<aside class="analytics-consent" aria-label="${chinese ? '分析偏好' : 'Analytics preference'}" data-analytics-banner><p>${text} <a href="${chinese ? '/zh/privacy/' : '/privacy/'}#analytics">${chinese ? '隐私' : 'Privacy'}</a></p><div><form method="post" action="/analytics/opt-in" data-analytics-choice><button type="submit">${chinese ? '允许分析' : 'Allow analytics'}</button></form><form method="post" action="/analytics/opt-out" data-analytics-choice><button type="submit">${chinese ? '不，谢谢' : 'No thanks'}</button></form></div><p role="status" data-analytics-choice-status hidden></p></aside>`;
}
