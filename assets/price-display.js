import { formatMoneyRange } from './regional-prices.js';

// One buyer-facing price vocabulary for catalog rows, comparison, popovers and
// model pages. The server renders the China/CNY default with the same function
// the browser uses after a destination or currency change.
const STALE_DAYS = 90;

export function priceAgeLabel(date, today = '') {
  if (!date || !today) return '';
  const days = Math.floor((Date.parse(today) - Date.parse(date)) / 86400000);
  if (!Number.isFinite(days) || days <= STALE_DAYS) return '';
  return `${Math.max(3, Math.round(days / 30.4))} mo old`;
}

// Dates remain in the evidence payload and price popover, not every table row.
export function compactPriceBasis(basis = '') {
  return basis.split(' · ').filter((part) => !/^(?:\d{4}-\d{2}-\d{2}|conditional|\d+ mo old)$/.test(part)).join(' · ');
}

export function priceEvidenceLines(item) {
  const details = item.priceDetails || '';
  const dated = details.match(/(?:Historical price|Price) observed \d{4}-\d{2}-\d{2}\./)?.[0];
  return [
    dated || (item.priceDate ? `Price observed ${item.priceDate}.` : ''),
    item.chinaPrice?.official && !/official/i.test(details) ? 'Official price' : '',
    item.chinaPrice?.conditional && !details ? 'conditional' : '',
    dated ? details.replace(dated, '').trim() : details
  ].filter(Boolean);
}

export function pricePopoverLines(item) {
  const full = priceEvidenceLines(item);
  const build = String(item.priceDetails || '').match(/Frameset price: .+?\.(?=\s|$)|Estimated complete adds .+?\.(?=\s|$)/g) ?? [];
  return [...full.filter((line) => /^(?:Historical price|Price) observed|^Official price$/.test(line)), ...build];
}

/**
 * @param projection result of regionalPrice()
 * @param options.currency display currency
 * @param options.allowance frameset build allowance in CNY
 * @param options.today ISO date used only for the stale-price marker
 * @param options.referenceLabel recorded basis for prices without a China observation
 * @param options.referenceDate observation date of that recorded basis
 * @param options.fallback { headline, basis } for records without a comparable price
 * @param options.translate display-text translator for the active locale
 */
export function priceDisplay(projection, { currency = 'CNY', allowance = 0, locale = 'en', today = '', referenceLabel = '', referenceDate = '', fallback = null, translate = (value) => value } = {}) {
  const t = (value) => translate(value, locale);
  const { display, china, frame } = projection;
  if (!Number.isFinite(display?.low) || !Number.isFinite(display?.high)) {
    return {
      headline: t(fallback?.headline || '—'),
      basis: fallback?.basis ? t(compactPriceBasis(fallback.basis)) : t('No comparable price'),
      date: referenceDate,
      tone: 'unknown',
      stale: false
    };
  }
  if (display.basis === 'delivered') {
    const basis = [t(projection.state === 'confirmed' ? 'Delivered' : 'Delivered, seller estimate')];
    if (china) basis.push(`${t('China price')} ${formatMoneyRange(china.low, china.high ?? china.low, 'CNY', locale)}`);
    return {
      headline: formatMoneyRange(display.low, display.high, currency, locale, { approximate: display.approximate }),
      basis: basis.filter(Boolean).join(' · '), date: projection.offer?.date || '', tone: projection.state === 'estimated' ? 'attention' : '', stale: false
    };
  }
  const converted = currency !== 'CNY';
  const reference = ['reference', 'build-reference'].includes(display.basis);
  // "Est." already marks a frame-build estimate; "≈" marks conversion or a reference.
  const approximate = converted || (reference && !frame) || Boolean(china?.approximate);
  const prefix = display.starting ? `${t('From')} ` : frame ? `${t('Est.')} ` : '';
  const headline = `${prefix}${formatMoneyRange(display.low, display.high, currency, locale, { approximate })}`;
  const native = converted ? formatMoneyRange(display.nativeLow, display.nativeHigh, 'CNY', locale, { approximate: reference || Boolean(china?.approximate) }) : '';
  // The frame/parts split is available in the price popover.
  const parts = [];
  if (display.basis === 'china') parts.push(converted ? `China ${native}` : projection.state === 'china' ? '' : 'China price');
  else if (display.basis === 'china-build') parts.push(converted ? `China build ${native}` : projection.state === 'china' ? '' : 'China price');
  else parts.push(...[referenceLabel || (display.basis === 'build-reference' ? 'Build reference' : 'Reference estimate'), native].filter(Boolean));
  if (china && ['china', 'china-build'].includes(display.basis)) {
    if (china.starting) parts.push('package unknown');
    if (china.partial) parts.push('total incomplete');
  }
  const date = ['china', 'china-build'].includes(display.basis) ? china?.date : referenceDate;
  const age = priceAgeLabel(date, today);
  const attention = Boolean(china?.starting || china?.partial);
  return {
    headline,
    basis: parts.filter(Boolean).map(t).join(' · '),
    date: date || '',
    tone: reference ? 'reference' : attention ? 'attention' : '',
    stale: Boolean(age)
  };
}

export function deliveredLine(projection, { currency = 'CNY', locale = 'en', translate = (value) => value } = {}) {
  if (projection?.display?.basis === 'delivered') return '';
  const delivered = projection?.delivered;
  if (!delivered || !Number.isFinite(delivered.low)) return '';
  const t = (value) => translate(value, locale);
  return `${t(delivered.state === 'confirmed' ? 'Delivered' : 'Delivered, seller estimate')} ${formatMoneyRange(delivered.low, delivered.high, currency, locale, { approximate: delivered.approximate })}`;
}
