import { translate } from '../../assets/i18n.js';

export const LOCALES = ['en', 'zh-Hans'];
export function localePath(route = '/', locale = 'en') {
  return locale === 'zh-Hans' ? `/zh${route}` : route;
}
export function isPagePath(route) {
  return route === '/' || route === '/404.html' || /^\/(?:zh\/)?(?:models|brands|prices|complete-bikes|framesets|methodology|build|electronic-shifting|privacy|image-policy|image-sources|blog)(?:\/|$)/.test(route);
}
function escape(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function decode(value) { return value.replaceAll('&quot;', '"').replaceAll('&#039;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'); }
export function localizedHref(value, { base = '', locale = 'en', siteUrl = '' } = {}) {
  if (locale === 'en' || typeof value !== 'string') return value;
  let prefix = '';
  let local = value;
  if (siteUrl && value.startsWith(`${siteUrl}/`)) { prefix = siteUrl; local = value.slice(siteUrl.length); }
  if (!local.startsWith('/') || local.startsWith('//') || (base && !(local === base || local.startsWith(`${base}/`)))) return value;
  const route = local.slice(base.length) || '/';
  const pathname = route.split(/[?#]/)[0];
  if (pathname.startsWith('/zh/') || !isPagePath(pathname)) return value;
  return `${prefix}${base}${localePath(route, locale)}`;
}
export function localizeJson(value, options = {}, key = '') {
  if (Array.isArray(value)) return value.map((item) => localizeJson(item, options, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === 'inLanguage' ? 'zh-Hans' : localizeJson(v, options, k)]));
  if (typeof value !== 'string') return value;
  // IDs, categories used by filters, source URLs and media paths are not translations.
  if (['url', '@id', 'item', 'mainEntityOfPage', 'citation'].includes(key)) return localizedHref(value, options);
  if (['name', 'description', 'label', 'title', 'value', 'price', 'tireClearance', 'weight', 'drivetrain', 'imageAccuracy', 'imageAlt', 'categoryLabel', 'frameMaterial'].includes(key)) return translate(value, options.locale);
  return value;
}
export function localizeHtml(html, options = {}) {
  if (options.locale !== 'zh-Hans') return html;
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
      part = part.replace(/\b(aria-label|title|placeholder|alt|label|data-gallery-caption|data-label)="([^"]*)"/g, (_, attr, value) => `${attr}="${escape(translate(decode(value), options.locale))}"`);
      if (!/data-language-switch|rel="(?:alternate|canonical)"/.test(part)) part = part.replace(/\b(href|data-model-url)="([^"]*)"/g, (_, attr, value) => `${attr}="${escape(localizedHref(decode(value), options))}"`);
      return part;
    }
    const decoded = decode(part);
    const translated = translate(decoded, options.locale);
    return translated === decoded ? part : escape(translated);
  }).join('');
  return input.replace(/<!--i18n-raw-(\d+)-->/g, (_, index) => raw[Number(index)]);
}
