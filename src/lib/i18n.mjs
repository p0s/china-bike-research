import { translate } from '../../assets/i18n.js';

export const LOCALES = ['en', 'zh-Hans', 'de'];
export const LOCALE_PREFIXES = { en: '', 'zh-Hans': '/zh', de: '/de' };
export function routeLocale(route) { return route.startsWith('/de/') ? 'de' : route.startsWith('/zh/') ? 'zh-Hans' : 'en'; }
export function localePath(route = '/', locale = 'en') {
  return `${LOCALE_PREFIXES[locale] ?? ''}${route}`;
}
export function isPagePath(route) {
  return route === '/' || route === '/404.html' || /^\/(?:(?:zh|de)\/)?(?:models|brands|prices|complete-bikes|framesets|methodology|build|electronic-shifting|privacy|image-policy|image-sources|blog)(?:\/|$)/.test(route);
}
function escape(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function decode(value) { return value.replaceAll('&quot;', '"').replaceAll('&#039;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'); }
function clarifyMainland(value) {
  return value
    .replace(/\bnon-mainland\b(?![-\s]+Chin(?:a|ese)\b)/gi, (match) => match[0] === 'N' ? 'Outside mainland China' : 'outside mainland China')
    .replace(/\bmainland\b(?![-\s]+Chin(?:a|ese)\b)/gi, (match) => `${match} China`);
}
const displayPayloadKeys = new Set(['priceDetails', 'verdict', 'categoryMetricDetails', 'caveats', 'availability', 'priceState', 'drivetrain', 'weightBasis', 'tireClearanceLabel', 'tireClearanceNote', 'note', 'frame', 'categoryMetric', 'categoryMetricLabel', 'type', 'category', 'manufacturing', 'mounts', 'internalFrameStorage', 'drivetrainSubline', 'bestFor']);
function clarifyDisplayPayload(value, key = '', locale = 'en') {
  if (Array.isArray(value)) return value.map((item) => clarifyDisplayPayload(item, key, locale));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, clarifyDisplayPayload(item, name, locale)]));
  // Comparison summaries use human-readable category labels, while other
  // payloads may use a canonical category ID. Only the labels are translated.
  if (key === 'category' && typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value)) return value;
  return typeof value === 'string' && displayPayloadKeys.has(key) ? clarifyMainland(translate(value, locale)) : value;
}
export function localizedCatalogPayload(value, options = {}) {
  return clarifyDisplayPayload(localizeJson(value, options), '', options.locale ?? 'en');
}
// Clarify English geographic shorthand only in reader-facing HTML. Keep URLs,
// data IDs, and JSON-LD unchanged; update only display fields in the embedded
// catalog and configurator payloads that the browser can reveal to visitors.
export function clarifyMainlandInDisplayHtml(html) {
  const raw = [];
  const input = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (block) => {
    const index = raw.length;
    if (/^<script\b[^>]*\bid="(?:catalog-data|build-configurator-data)"/i.test(block)) {
      block = block.replace(/(^[^>]*>)([\s\S]*)(<\/script>$)/i, (_, open, json, close) => `${open}${JSON.stringify(clarifyDisplayPayload(JSON.parse(json))).replaceAll('<', '\\u003c')}${close}`);
    }
    raw.push(block);
    return `<!--mainland-raw-${index}-->`;
  });
  const clarified = input.split(/(<[^>]+>)/g).map((part) => {
    if (part.startsWith('<')) {
      if (/^<!--/.test(part)) return part;
      const displayAttribute = /\b(aria-label|title|placeholder|alt|label|data-gallery-caption|data-label|data-tooltip-lines)="([^"]*)"/g;
      const withDisplayAttributes = part.replace(displayAttribute, (_, name, value) => {
        const decoded = decode(value);
        const next = clarifyMainland(decoded);
        return `${name}="${next === decoded ? value : escape(next)}"`;
      });
      if (!/^<meta\b/i.test(withDisplayAttributes) || !/(?:name|property)="(?:description|og:description|twitter:description|og:title|twitter:title)"/i.test(withDisplayAttributes)) return withDisplayAttributes;
      return withDisplayAttributes.replace(/\bcontent="([^"]*)"/, (_, value) => {
        const decoded = decode(value);
        const next = clarifyMainland(decoded);
        return `content="${next === decoded ? value : escape(next)}"`;
      });
    }
    const decoded = decode(part);
    if (decoded.includes('://')) return part;
    const next = clarifyMainland(decoded);
    return next === decoded ? part : escape(next);
  }).join('');
  return clarified.replace(/<!--mainland-raw-(\d+)-->/g, (_, index) => raw[Number(index)]);
}
export function localizedHref(value, { base = '', locale = 'en', siteUrl = '' } = {}) {
  if (locale === 'en' || typeof value !== 'string') return value;
  let prefix = '';
  let local = value;
  if (siteUrl && value.startsWith(`${siteUrl}/`)) { prefix = siteUrl; local = value.slice(siteUrl.length); }
  if (!local.startsWith('/') || local.startsWith('//') || (base && !(local === base || local.startsWith(`${base}/`)))) return value;
  const route = local.slice(base.length) || '/';
  const pathname = route.split(/[?#]/)[0];
  if (/^\/(?:zh|de)(?:\/|$)/.test(pathname) || !isPagePath(pathname)) return value;
  return `${prefix}${base}${localePath(route, locale)}`;
}
export function localizeJson(value, options = {}, key = '') {
  if (Array.isArray(value)) return value.map((item) => localizeJson(item, options, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === 'inLanguage' ? (options.locale ?? 'en') : localizeJson(v, options, k)]));
  if (typeof value !== 'string') return value;
  // IDs, categories used by filters, source URLs and media paths are not translations.
  if (['url', '@id', 'item', 'mainEntityOfPage', 'citation'].includes(key)) return localizedHref(value, options);
  if (['name', 'description', 'reviewBody', 'label', 'title', 'value', 'price', 'tireClearance', 'weight', 'drivetrain', 'imageAccuracy', 'imageAlt', 'categoryLabel', 'frameMaterial', 'verdict', 'priceDetails', 'categoryMetricDetails', 'caveats', 'availability', 'priceState', 'weightBasis', 'tireClearanceLabel', 'tireClearanceNote', 'note'].includes(key)) return translate(value, options.locale);
  return value;
}
export function localizeHtml(html, options = {}) {
  if (!options.locale || options.locale === 'en') return html;
  // Work on generated, escaped markup. Script bodies are isolated before tokenizing.
  const raw = [];
  let input = html.replace(/<(p|span)\b[^>]*data-original-language[^>]*>[\s\S]*?<\/\1>/gi, (block) => {
    const index = raw.length;
    raw.push(block);
    return `<!--i18n-raw-${index}-->`;
  }).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (block) => {
    const index = raw.length;
    if (/^<script\b[^>]*type="application\/(?:ld\+)?json"/i.test(block)) {
      block = block.replace(/(^[^>]*>)([\s\S]*)(<\/script>$)/i, (_, a, json, b) => `${a}${JSON.stringify(localizeJson(JSON.parse(json), options)).replaceAll('<', '\\u003c')}${b}`);
    }
    raw.push(block);
    return `<!--i18n-raw-${index}-->`;
  });
  input = input.split(/(<[^>]+>)/g).map((part) => {
    if (part.startsWith('<')) {
      if (/^<!--/.test(part)) return part;
      part = part.replace(/\b(aria-label|title|placeholder|alt|label|data-gallery-caption|data-label|data-tooltip-lines)="([^"]*)"/g, (_, attr, value) => {
        const decoded = decode(value);
        const translated = attr === 'data-tooltip-lines' ? JSON.stringify(JSON.parse(decoded).map((line) => translate(line, options.locale))) : translate(decoded, options.locale);
        return `${attr}="${escape(translated)}"`;
      });
      if (options.locale === 'de') part = part.replace(/action="([^"?]*\/analytics\/opt-(?:in|out))"/g, 'action="$1?lang=de"');
      if (!/data-language-switch|rel="(?:alternate|canonical)"/.test(part)) part = part.replace(/\b(href|data-model-url)="([^"]*)"/g, (_, attr, value) => `${attr}="${escape(localizedHref(decode(value), options))}"`);
      return part;
    }
    const decoded = decode(part);
    const translated = translate(decoded, options.locale);
    return translated === decoded ? part : escape(translated);
  }).join('');
  return input.replace(/<!--i18n-raw-(\d+)-->/g, (_, index) => raw[Number(index)]);
}
