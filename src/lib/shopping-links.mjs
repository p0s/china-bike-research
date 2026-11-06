import { escapeAttr, escapeHtml } from './html.mjs';
import { isCalendarDate } from './calendar-date.mjs';

// Store links that may earn a commission are a separate buying route. They are
// never source citations, price evidence, sort keys, filters or ranking inputs.
export const SHOPPING_DISCLOSURE = 'We may earn a commission from purchases through this link. It does not affect our comparisons.';
const RECORD_TYPES = new Set(['variant', 'candidate', 'groupset']);
const MATCHES = new Set(['exact-build', 'model']);
const AVAILABILITY = { 'made-to-order': 'Made to order.', 'in-stock': 'Listed in stock.' };
const CURRENCY_SYMBOLS = { USD: 'US$', CAD: 'CA$', EUR: '€', GBP: '£' };

export function shoppingLinksFor(data, recordType, recordId) {
  return (data.shoppingLinks ?? []).flatMap((merchant) => (merchant.links ?? [])
    .filter((link) => link.record_type === recordType && link.record_id === recordId)
    .map((link) => ({ merchant, link })));
}

function priceLabel(merchant, link) {
  const number = (value) => new Intl.NumberFormat('en-US').format(value);
  const symbol = CURRENCY_SYMBOLS[merchant.currency];
  if (link.match === 'model') return `from ${symbol}${number(link.price_low)}`;
  return link.price_low === link.price_high ? `${symbol}${number(link.price_low)}` : `${symbol}${number(link.price_low)}–${number(link.price_high)}`;
}

// Each phrase is its own text node so the page dictionaries can translate it.
export function shoppingLinkHtml({ merchant, link }) {
  const details = [
    link.store_option ? `<span>Store option:</span> <span class="shop-link-option" data-original-language>${escapeHtml(link.store_option)}</span>` : '',
    link.note ? `<span>${escapeHtml(link.note)}</span>` : '',
    link.match === 'exact-build' && link.price_low !== link.price_high ? '<span>Price varies by finish.</span>' : '',
    `<span>${escapeHtml(AVAILABILITY[link.availability])}</span>`,
    '<span>Shipping and duties depend on your country.</span>',
    `<span>${escapeHtml(`Price observed ${link.checked_at}.`)}</span>`
  ].filter(Boolean).join(' ');
  return `<span class="shop-link"><span class="shop-link-offer"><a href="${escapeAttr(link.url)}" rel="sponsored noreferrer">${escapeHtml(merchant.name)}</a> <strong>${escapeHtml(priceLabel(merchant, link))}</strong></span><span class="shop-link-details">${details}</span><small class="shop-link-disclosure">${escapeHtml(SHOPPING_DISCLOSURE)}</small></span>`;
}

export function shoppingLinksHtml(data, recordType, recordId) {
  return shoppingLinksFor(data, recordType, recordId).map(shoppingLinkHtml).join('');
}

function parseHttps(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed : null;
  } catch { return null; }
}

export function validateShoppingLinks(data, today = new Date().toISOString().slice(0, 10)) {
  const errors = [];
  const variants = new Map(data.variants.map((item) => [item.id, item]));
  const platforms = new Map(data.platforms.map((item) => [item.id, item]));
  const candidates = new Map(data.candidates.map((item) => [item.id, item]));
  const groupsets = new Map((data.groupsets ?? []).map((item) => [item.id, item]));
  const seen = new Set();
  for (const merchant of data.shoppingLinks ?? []) {
    const label = `shopping links ${merchant.id ?? '(missing id)'}`;
    const website = parseHttps(merchant.website);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(merchant.id ?? '') || typeof merchant.name !== 'string' || !merchant.name.trim()) errors.push(`${label}: needs an id and name`);
    if (!website || website.pathname !== '/' || website.search || website.hash) errors.push(`${label}: website must be an https origin`);
    if (merchant.relationship !== 'commission') errors.push(`${label}: relationship must be disclosed as commission`);
    if (!/^[a-z][a-z0-9_]{0,31}$/.test(merchant.referral_parameter ?? '')) errors.push(`${label}: invalid referral_parameter`);
    if (!CURRENCY_SYMBOLS[merchant.currency]) errors.push(`${label}: unsupported currency`);
    if (typeof merchant.note !== 'string' || !merchant.note.trim()) errors.push(`${label}: missing note`);
    if (!Array.isArray(merchant.links) || !merchant.links.length) { errors.push(`${label}: needs links`); continue; }
    const referralValues = new Set();
    for (const link of merchant.links) {
      const name = `${label} ${link.record_type}:${link.record_id}`;
      const key = `${merchant.id}|${link.record_type}|${link.record_id}`;
      if (seen.has(key)) errors.push(`${name}: duplicate link`);
      seen.add(key);
      if (!RECORD_TYPES.has(link.record_type)) errors.push(`${name}: unsupported record_type`);
      if (link.record_type === 'variant') {
        const variant = variants.get(link.record_id);
        if (!variant) errors.push(`${name}: missing variant`);
        else if (platforms.get(variant.platform_id)?.status === 'superseded') errors.push(`${name}: superseded generations get no store link`);
      }
      if (link.record_type === 'candidate') {
        const candidate = candidates.get(link.record_id);
        if (!candidate) errors.push(`${name}: missing candidate`);
        else if (candidate.status === 'superseded') errors.push(`${name}: superseded generations get no store link`);
      }
      if (link.record_type === 'groupset') {
        const groupset = groupsets.get(link.record_id);
        if (!groupset) errors.push(`${name}: missing groupset`);
        else if (!groupset.variants?.some((item) => item.name === link.record_variant)) errors.push(`${name}: record_variant must name an exact groupset variant`);
      } else if (link.record_variant !== undefined) errors.push(`${name}: record_variant applies only to groupsets`);
      if (!MATCHES.has(link.match)) errors.push(`${name}: unsupported match`);
      // A bike build names the store option to choose; a model-level or component link explains its scope.
      if (link.record_type !== 'groupset' && link.match === 'exact-build' && !(typeof link.store_option === 'string' && link.store_option.trim())) errors.push(`${name}: exact builds need the store option`);
      if ((link.match === 'model' || link.record_type === 'groupset') && !(typeof link.note === 'string' && link.note.trim())) errors.push(`${name}: needs a scope note`);
      const product = parseHttps(link.product_url);
      if (!product || product.hostname !== website?.hostname || !product.pathname.startsWith('/products/') || product.search || product.hash) {
        errors.push(`${name}: product_url must be the store's canonical https product page`);
      }
      // The shopping URL is the product page plus only the store's own referral parameter.
      const target = parseHttps(link.url);
      const params = target ? [...target.searchParams.entries()] : [];
      const referral = params[0]?.[0] === merchant.referral_parameter ? params[0][1] : '';
      if (!target || !product || `${target.origin}${target.pathname}` !== link.product_url || target.hash || params.length !== 1 || !/^[A-Za-z0-9_-]{4,64}$/.test(referral)) {
        errors.push(`${name}: url must be product_url with only the referral parameter`);
      } else referralValues.add(referral);
      if (![link.price_low, link.price_high].every((value) => Number.isFinite(value) && value > 0) || link.price_low > link.price_high) errors.push(`${name}: invalid price range`);
      if (!Object.hasOwn(AVAILABILITY, link.availability)) errors.push(`${name}: unsupported availability`);
      if (!isCalendarDate(link.checked_at) || link.checked_at > today) errors.push(`${name}: invalid checked_at`);
    }
    if (referralValues.size > 1) errors.push(`${label}: links use different referral codes`);
  }
  return errors;
}
