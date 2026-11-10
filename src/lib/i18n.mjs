import { translate } from '../../assets/i18n.js';
import '../../assets/i18n-es.js';
import '../../assets/i18n-ru.js';

// Full-site languages cover every route, including model evidence and guides.
export const LOCALES = ['en', 'zh-Hans', 'de'];
// Interface languages cover the interactive core routes; other links stay English.
export const INTERFACE_LOCALES = ['es', 'ru'];
export const ALL_LOCALES = [...LOCALES, ...INTERFACE_LOCALES];
export const INTERFACE_ROUTES = ['/', '/geometry/', '/build/', '/electronic-shifting/', '/carbon-wheels/', '/tires/', '/404.html'];
export const LOCALE_PREFIXES = { en: '', 'zh-Hans': '/zh', de: '/de', es: '/es', ru: '/ru' };
const prefixLocales = { '/zh/': 'zh-Hans', '/de/': 'de', '/es/': 'es', '/ru/': 'ru' };
export function routeLocale(route) { return prefixLocales[route.slice(0, 4)] ?? 'en'; }
export function localePath(route = '/', locale = 'en') {
  return `${LOCALE_PREFIXES[locale] ?? ''}${route}`;
}
// The languages in which one unprefixed route is published.
export function localesForRoute(route = '/') {
  const pathname = String(route).split(/[?#]/)[0];
  return INTERFACE_ROUTES.includes(pathname) ? ALL_LOCALES : LOCALES;
}
// A localized link only when that language publishes the route; otherwise English.
export function availableLocalePath(route = '/', locale = 'en') {
  return localesForRoute(route).includes(locale) ? localePath(route, locale) : route;
}
export function isPagePath(route) {
  return route === '/' || route === '/404.html' || /^\/(?:(?:zh|de|es|ru)\/)?(?:models|brands|prices|complete-bikes|framesets|methodology|build|geometry|electronic-shifting|carbon-wheels|tires|privacy|image-policy|image-sources|blog)(?:\/|$)/.test(route);
}
function escape(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function decode(value) { return value.replaceAll('&quot;', '"').replaceAll('&#039;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'); }
function clarifyMainland(value) {
  return value
    .replace(/\bnon-mainland\b(?![-\s]+Chin(?:a|ese)\b)/gi, (match) => match[0] === 'N' ? 'Outside mainland China' : 'outside mainland China')
    .replace(/\bmainland\b(?![-\s]+Chin(?:a|ese)\b)/gi, (match) => `${match} China`);
}
// Credits name the rights holder exactly as recorded. On Chinese pages only the
// label words around the holder are translated, at build time; the browser
// dictionaries are unchanged.
const ZH_CREDIT_KINDS = new Map([
  ['Manufacturer image', '制造商图片'], ['Product image', '产品图片'], ['Product detail', '产品细节图'],
  ['Component detail', '部件细节图'], ['Frameset image', '车架组图片'], ['Product reference image', '产品参考图'],
  ['Frame detail', '车架细节图'], ['Technical image', '技术图'], ['Geometry chart', '几何表'],
  ['Geometry graphic', '几何示意图'], ['Tire-clearance graphic', '轮胎间隙示意图'],
]);
const ZH_XHS_POSTS = new Map([
  ['dealer', '经销商帖子'], ['owner', '车主帖子'], ['seller', '卖家帖子'], ['product', '产品帖子'],
  ['community', '社区帖子'], ['builder', '装车帖子'], ['workshop', '车店帖子'], ['seller listing', '卖家商品页'],
  ['community roundup', '社区汇总'],
]);
const ZH_CREDIT_SOURCES = new Map([
  ['public marketplace listing mirror', '公开商城页镜像'], ['the TWITTER marketplace listing', 'TWITTER 商城页'],
  ['the Alibaba supplier index', '阿里巴巴供应商索引'], ['an authorized Trek retailer', 'Trek 授权零售商'],
  ['JD marketplace listing', '京东商城商品页'], ['什么值得买 product index', '什么值得买商品索引'],
  ['Original XHS post creator', '小红书原帖作者'], ['XHS post', '小红书帖子'],
  ['product photo by the brand', '产品照片由品牌提供'], ['Official TWITTER / 骓特 XHS post', 'TWITTER / 骓特官方小红书帖子'],
  ['Authorized Voicevelo dealer post', 'Voicevelo 授权经销商帖子'],
]);
const ZH_CREDIT_SUFFIXES = new Map([
  ['on XHS', '（小红书）'], ['official XHS account', ' 官方小红书账号'], ['official flagship store', ' 官方旗舰店'], ['official store', ' 官方店'],
]);
function zhCreditHolder(holder) {
  if (ZH_CREDIT_SOURCES.has(holder)) return ZH_CREDIT_SOURCES.get(holder);
  const post = holder.match(/^XHS (.+?)(?: post)?$/);
  if (post && ZH_XHS_POSTS.has(post[1])) return `小红书${ZH_XHS_POSTS.get(post[1])}`;
  for (const [suffix, zh] of ZH_CREDIT_SUFFIXES) if (holder.endsWith(` ${suffix}`)) return `${holder.slice(0, -suffix.length - 1)}${zh}`;
  return holder.replace(/; embedded by (.+)$/, '；由 $1 转载');
}
export function localizedCredit(credit, locale) {
  if (locale !== 'zh-Hans' || typeof credit !== 'string') return credit;
  const kind = credit.match(/^(.+?) © (.+)$/);
  if (kind && ZH_CREDIT_KINDS.has(kind[1])) return `${ZH_CREDIT_KINDS.get(kind[1])} © ${zhCreditHolder(kind[2])}`;
  const via = credit.match(/^(Product image|Product detail) via (.+)$/);
  if (via) {
    const holder = zhCreditHolder(via[2]);
    return `${ZH_CREDIT_KINDS.get(via[1])}，来自${/^\p{Script=Han}/u.test(holder) ? '' : ' '}${holder}`;
  }
  const see = credit.match(/^(.+); see (the linked )?source$/);
  if (see) return `${zhCreditHolder(see[1])}；见${see[2] ? '所链' : ''}来源`;
  const parts = credit.split('; ');
  if (parts.length === 2 && parts.every((part) => zhCreditHolder(part) !== part)) return parts.map(zhCreditHolder).join('；');
  const xhs = credit.match(/^XHS · (.+)$/);
  if (xhs) return `小红书 · ${xhs[1]}`;
  const official = credit.match(/^(.+) — official product photo$/);
  if (official) return `${official[1]} — 官方产品照片`;
  return zhCreditHolder(credit);
}
const displayPayloadKeys = new Set(['priceDetails', 'verdict', 'categoryMetricDetails', 'caveats', 'availability', 'priceState', 'priceNote', 'drivetrain', 'weightBasis', 'tireClearanceLabel', 'tireClearanceNote', 'forkCaliperNote', 'geometryWarning', 'note', 'frame', 'categoryMetric', 'categoryMetricLabel', 'type', 'category', 'manufacturing', 'mounts', 'internalFrameStorage', 'drivetrainSubline', 'bestFor']);
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
      const displayAttribute = /\b(aria-label|title|placeholder|alt|label|data-gallery-caption|data-gallery-note|data-label|data-tooltip-lines)="([^"]*)"/g;
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
  if (/^\/(?:zh|de|es|ru)(?:\/|$)/.test(pathname) || !isPagePath(pathname)) return value;
  return `${prefix}${base}${availableLocalePath(route, locale)}`;
}
export function localizeJson(value, options = {}, key = '') {
  if (Array.isArray(value)) return value.map((item) => localizeJson(item, options, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === 'inLanguage' ? (options.locale ?? 'en') : localizeJson(v, options, k)]));
  if (typeof value !== 'string') return value;
  // IDs, categories used by filters, source URLs and media paths are not translations.
  if (['url', '@id', 'item', 'mainEntityOfPage', 'citation'].includes(key)) return localizedHref(value, options);
  if (['name', 'description', 'reviewBody', 'label', 'title', 'value', 'price', 'tireClearance', 'weight', 'drivetrain', 'imageAccuracy', 'imageAlt', 'categoryLabel', 'frameMaterial', 'verdict', 'priceDetails', 'categoryMetricDetails', 'caveats', 'availability', 'priceState', 'priceNote', 'weightBasis', 'tireClearanceLabel', 'tireClearanceNote', 'forkCaliperNote', 'geometryWarning', 'note'].includes(key)) return translate(value, options.locale);
  return value;
}
export function localizeHtml(html, options = {}) {
  if (!options.locale || options.locale === 'en') return html;
  // Work on generated, escaped markup. Script bodies are isolated before tokenizing.
  const raw = [];
  let input = html.replace(/<(p|span)\b[^>]*(?:data-original-language|data-localized-caption)[^>]*>[\s\S]*?<\/\1>/gi, (block) => {
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
      part = part.replace(/\b(aria-label|title|placeholder|alt|label|data-gallery-note|data-label|data-tooltip-lines)="([^"]*)"/g, (_, attr, value) => {
        const decoded = decode(value);
        const translated = attr === 'data-tooltip-lines' ? JSON.stringify(JSON.parse(decoded).map((line) => translate(line, options.locale))) : translate(decoded, options.locale);
        return `${attr}="${escape(translated)}"`;
      });
      if (options.locale === 'de' || options.locale === 'zh-Hans') part = part.replace(/action="([^"?]*\/analytics\/opt-(?:in|out))"/g, `action="$1?lang=${options.locale === 'de' ? 'de' : 'zh'}"`);
      if (!/data-language-switch|rel="(?:alternate|canonical)"/.test(part)) part = part.replace(/\b(href|data-model-url)="([^"]*)"/g, (_, attr, value) => `${attr}="${escape(localizedHref(decode(value), options))}"`);
      return part;
    }
    const decoded = decode(part);
    const translated = translate(decoded, options.locale);
    return translated === decoded ? part : escape(translated);
  }).join('');
  return input.replace(/<!--i18n-raw-(\d+)-->/g, (_, index) => raw[Number(index)]);
}
