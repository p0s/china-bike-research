// Shipping destination, display currency and interface language are independent.
export const PRICE_MARKETS = {
  eu: { currency: 'EUR' }, gb: { currency: 'GBP' }, europe: { currency: 'EUR' },
  us: { currency: 'USD' }, ca: { currency: 'CAD' }, mx: { currency: 'MXN' },
  'north-america': { currency: 'USD' }, cn: { currency: 'CNY' }
};
export const PRICE_CURRENCIES = ['EUR', 'USD', 'GBP', 'CAD', 'MXN', 'CNY'];
const EU_COUNTRIES = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' '));
const OTHER_EUROPE = new Set('AL AD AM AZ BY BA FO GE GI GG IS IM JE XK LI MD MC ME MK NO RU SM RS CH TR UA VA'.split(' '));
const OTHER_NORTH_AMERICA = new Set('AG AI AW BS BB BZ BM BQ VG KY CR CU CW DM DO SV GL GD GP GT HT HN JM MQ MS NI PA PR BL KN LC MF PM VC SX TT TC VI'.split(' '));
export const DESTINATION_GROUPS = {
  Europe: [...EU_COUNTRIES, ...OTHER_EUROPE, 'GB'],
  'North America': ['US', 'CA', 'MX', ...OTHER_NORTH_AMERICA],
  China: ['CN'],
  'Other destinations': 'AF DZ AS AO AQ AR AU BH BD BT BO BW BR BN BF BI KH CM CV CF TD CL CC CO KM CG CD CK CI DJ EC EG GQ ER ET FK FJ PF TF GA GM GH GU GN GW GY HK HM IN ID IR IQ IL JP JO KZ KE KI KP KR KW KG LA LB LS LR LY MO MG MW MY MV ML MH MR MU YT FM MN MA MZ MM NA NR NP NC NZ NE NG NU NF MP OM PK PW PS PG PY PE PH PN QA RE RW WS ST SA SN SC SL SG SB SO ZA GS SS LK SD SR SJ SZ SY TW TJ TZ TH TL TG TK TO TN TM TV UG AE UY UZ VU VE VN WF EH YE ZM ZW AX'.split(' ')
};
export const DESTINATION_COUNTRIES = new Set(Object.values(DESTINATION_GROUPS).flat());
export function validCountry(value) { return DESTINATION_COUNTRIES.has(value) ? value : ''; }
export function countryName(code, locale = 'en') {
  try { return new Intl.DisplayNames([locale], { type: 'region' }).of(code); }
  catch { return code; }
}
export function marketForCountry(country) {
  const code = String(country ?? '').toUpperCase();
  if (EU_COUNTRIES.has(code)) return 'eu';
  if (OTHER_EUROPE.has(code)) return 'europe';
  if (OTHER_NORTH_AMERICA.has(code)) return 'north-america';
  return { GB: 'gb', US: 'us', CA: 'ca', MX: 'mx', CN: 'cn' }[code] ?? null;
}
export function defaultCurrency(country) { return PRICE_MARKETS[marketForCountry(country)]?.currency ?? 'USD'; }
export function legacyCountry(market) { return { us: 'US', ca: 'CA', mx: 'MX', gb: 'GB', cn: 'CN' }[market] ?? ''; }
function timezoneCountry(zone) {
  const groups = {
    CN: ['Asia/Shanghai', 'Asia/Chongqing', 'Asia/Harbin', 'Asia/Urumqi'],
    US: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu'],
    CA: ['America/Toronto', 'America/Vancouver', 'America/Edmonton', 'America/Winnipeg', 'America/Halifax', 'America/St_Johns'],
    MX: ['America/Mexico_City', 'America/Cancun', 'America/Tijuana', 'America/Monterrey'],
    GB: ['Europe/London'], DE: ['Europe/Berlin'], FR: ['Europe/Paris'], IT: ['Europe/Rome'],
    ES: ['Europe/Madrid', 'Atlantic/Canary'], PT: ['Europe/Lisbon', 'Atlantic/Azores', 'Atlantic/Madeira'],
    NL: ['Europe/Amsterdam'], BE: ['Europe/Brussels'], AT: ['Europe/Vienna'], CH: ['Europe/Zurich'],
    PL: ['Europe/Warsaw'], CZ: ['Europe/Prague'], SE: ['Europe/Stockholm'], NO: ['Europe/Oslo'],
    DK: ['Europe/Copenhagen'], FI: ['Europe/Helsinki'], IE: ['Europe/Dublin'], SG: ['Asia/Singapore'],
    JP: ['Asia/Tokyo'], AU: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth'], NZ: ['Pacific/Auckland']
  };
  return Object.entries(groups).find(([, zones]) => zones.includes(zone))?.[0] ?? '';
}
export function resolveDestination({ requested, stored, legacyMarket, edgeCountry, timeZone, languages = [] } = {}) {
  if (validCountry(requested)) return { country: requested, reason: 'link' };
  if (legacyCountry(legacyMarket)) return { country: legacyCountry(legacyMarket), reason: 'link' };
  if (validCountry(stored)) return { country: stored, reason: 'saved' };
  if (validCountry(edgeCountry)) return { country: edgeCountry, reason: 'suggested' };
  const zone = timezoneCountry(timeZone);
  if (zone) return { country: zone, reason: 'suggested' };
  for (const language of languages) {
    try {
      const country = validCountry(new Intl.Locale(language).region);
      if (country) return { country, reason: 'suggested' };
    } catch { /* malformed or reduced locale */ }
  }
  return { country: '', reason: 'unknown' };
}
export function convertPrice(amount, from, to, rates) {
  if (!Number.isFinite(amount)) return null;
  if (from === to) return amount;
  const source = rates?.per_eur?.[from], target = rates?.per_eur?.[to];
  return source > 0 && target > 0 ? amount / source * target : null;
}
export function formatMoneyRange(low, high, currency, locale = 'en', { approximate = false } = {}) {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return '—';
  const format = new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: approximate ? 0 : 2 });
  return `${approximate ? '≈ ' : ''}${low === high ? format.format(low) : `${format.format(low)}–${format.format(high)}`}`;
}
export function selectRegionalOffer(offers, productId, country, kind, asOf) {
  const recent = (offers ?? []).filter((offer) => offer.productId === productId && offer.kind === kind
    && offer.date <= asOf && (Date.parse(asOf) - Date.parse(offer.date)) / 86400000 <= 90);
  const superseded = new Set(recent.flatMap((offer) => offer.supersedes ?? []));
  return recent.filter((offer) => !superseded.has(offer.id)
    && (offer.countries ? offer.countries.includes(country) : offer.markets.includes(marketForCountry(country))))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))[0] ?? null;
}
export function chinaDifference(deliveredLow, deliveredHigh, chinaLow, chinaHigh) {
  if (![deliveredLow, deliveredHigh, chinaLow, chinaHigh].every(Number.isFinite) || deliveredLow <= 0 || deliveredHigh < deliveredLow || chinaHigh < chinaLow) return null;
  return { low: (1 - chinaHigh / deliveredLow) * 100, high: (1 - chinaLow / deliveredHigh) * 100 };
}
export function regionalPrice(item, { country, currency, area = '' }, { rates, offers = [], asOf } = {}, allowance = 0) {
  const frame = item.estimated && Number.isFinite(item.frameLow);
  const china = item.chinaPrice;
  const chinaLow = item.priceUnavailable ? null : convertPrice(china?.low, 'CNY', currency, rates);
  const chinaHigh = item.priceUnavailable ? null : convertPrice(china?.high, 'CNY', currency, rates);
  const referenceLow = convertPrice(frame ? item.frameLow + allowance : item.priceLowCny, 'CNY', currency, rates);
  const referenceHigh = convertPrice(frame ? (item.frameHigh ?? item.frameLow) + allowance : item.priceHighCny, 'CNY', currency, rates);
  const offer = country === 'CN' || item.priceUnavailable ? null : selectRegionalOffer(offers, item.id, country, frame ? 'frameset' : 'complete-bike', asOf);
  const delivery = offer?.delivery;
  let state = !country ? 'choose-destination' : country === 'CN' ? 'china' : frame ? 'build-unknown' : offer ? 'partial' : 'unavailable';
  if (delivery?.excluded_country_ids?.includes(country) || (delivery?.scope === 'contiguous-us' && area === 'remote')) state = 'unavailable';
  else if (delivery && (!delivery.country_ids || delivery.country_ids.includes(country))
    && (delivery.scope !== 'contiguous-us' || area === 'contiguous') && !frame) state = delivery.status;
  const fullTotal = ['confirmed', 'estimated'].includes(state);
  const low = item.priceUnavailable || (country === 'CN' && (china?.starting || china?.partial)) ? null : country === 'CN'
    ? chinaLow === null ? null : chinaLow + (frame ? convertPrice(allowance, 'CNY', currency, rates) : 0)
    : fullTotal ? convertPrice(delivery.total_low, offer.currency, currency, rates) : null;
  const high = item.priceUnavailable || (country === 'CN' && (china?.starting || china?.partial)) ? null : country === 'CN'
    ? chinaHigh === null ? null : chinaHigh + (frame ? convertPrice(allowance, 'CNY', currency, rates) : 0)
    : fullTotal ? convertPrice(delivery.total_high, offer.currency, currency, rates) : null;
  const freshChina = china && china.date <= asOf && (Date.parse(asOf) - Date.parse(china.date)) / 86400000 <= 90;
  // Display references stay separate from complete totals used by budgets and sorting.
  const chinaBuildAllowance = frame ? allowance : 0;
  const nativeLow = china ? china.low + chinaBuildAllowance : frame ? item.frameLow + allowance : item.priceLowCny;
  const nativeHigh = china ? (china.high ?? china.low) + chinaBuildAllowance : frame ? (item.frameHigh ?? item.frameLow) + allowance : item.priceHighCny;
  const display = {
    low: Number.isFinite(low) ? low : item.priceUnavailable ? null : convertPrice(nativeLow, 'CNY', currency, rates),
    high: Number.isFinite(high) ? high : item.priceUnavailable ? null : convertPrice(nativeHigh, 'CNY', currency, rates),
    basis: fullTotal ? 'delivered' : china ? frame ? 'china-build' : 'china' : frame ? 'build-reference' : 'reference',
    nativeLow, nativeHigh, starting: Boolean(china?.starting), partial: Boolean(china?.partial),
    approximate: fullTotal ? state === 'estimated' || offer.currency !== currency : frame || !china || china.approximate || currency !== 'CNY'
  };
  return { low, high, currency, offer, frame, state, china, chinaLow, chinaHigh, referenceLow, referenceHigh,
    display,
    listAmount: offer ? convertPrice(offer.amount, offer.currency, currency, rates) : null,
    converted: country === 'CN' ? currency !== 'CNY' : offer?.currency !== currency,
    difference: fullTotal && freshChina && china.comparable && !frame ? chinaDifference(low, high, chinaLow, chinaHigh) : null };
}
