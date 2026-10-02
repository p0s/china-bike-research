// Shopping preferences are independent of the site's analytics consent policy.
export const PRICE_MARKETS = {
  eu: { label: 'Europe · EU / EUR', currency: 'EUR' },
  gb: { label: 'Europe · UK / GBP', currency: 'GBP' },
  europe: { label: 'Europe · other / EUR reference', currency: 'EUR' },
  us: { label: 'North America · US / USD', currency: 'USD' },
  ca: { label: 'North America · Canada / CAD', currency: 'CAD' },
  mx: { label: 'North America · Mexico / MXN', currency: 'MXN' },
  'north-america': { label: 'North America · other / USD reference', currency: 'USD' },
  cn: { label: 'China / CNY', currency: 'CNY' }
};
const EU_COUNTRIES = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' '));
const OTHER_EUROPE = new Set('AL AD AM AZ BY BA FO GE GI GG IS IM JE XK LI MD MC ME MK NO RU SM RS CH TR UA VA'.split(' '));
const OTHER_NORTH_AMERICA = new Set('AG AI AW BS BB BZ BM BQ VG KY CR CU CW DM DO SV GL GD GP GT HT HN JM MQ MS NI PA PR BL KN LC MF PM VC SX TT TC VI'.split(' '));

export function marketForCountry(country) {
  const code = String(country ?? '').toUpperCase();
  if (EU_COUNTRIES.has(code)) return 'eu';
  if (OTHER_EUROPE.has(code)) return 'europe';
  if (OTHER_NORTH_AMERICA.has(code)) return 'north-america';
  return { GB: 'gb', US: 'us', CA: 'ca', MX: 'mx', CN: 'cn' }[code] ?? null;
}

export function resolvePriceMarket({ requested, stored, edgeCountry, languages = [] } = {}) {
  if (Object.hasOwn(PRICE_MARKETS, requested ?? '')) return { market: requested, reason: 'link' };
  if (Object.hasOwn(PRICE_MARKETS, stored ?? '')) return { market: stored, reason: 'saved' };
  const edge = marketForCountry(edgeCountry);
  if (edge) return { market: edge, reason: 'site' };
  // A trusted country outside these shopping regions should not become an EU/US
  // offer through a contradictory browser language (e.g. en-US in Singapore).
  if (/^[A-Z]{2}$/.test(edgeCountry ?? '') && edgeCountry !== 'XX') return { market: 'cn', reason: 'default' };
  for (const language of languages) {
    try {
      const market = marketForCountry(new Intl.Locale(language).region);
      if (market) return { market, reason: 'browser' };
    } catch { /* malformed or reduced browser locale */ }
  }
  return { market: 'eu', reason: 'default' };
}

export function convertPrice(amount, from, to, rates) {
  if (!Number.isFinite(amount)) return null;
  if (from === to) return amount;
  const source = rates?.per_eur?.[from];
  const target = rates?.per_eur?.[to];
  return source > 0 && target > 0 ? amount / source * target : null;
}

export function formatMoneyRange(low, high, currency, locale = 'en', { approximate = false } = {}) {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return '—';
  const format = new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: approximate ? 0 : 2 });
  const value = low === high ? format.format(low) : `${format.format(low)}–${format.format(high)}`;
  return `${approximate ? '≈ ' : ''}${value}`;
}

export function selectRegionalOffer(offers, productId, market, kind, asOf) {
  return (offers ?? []).filter((offer) => offer.productId === productId && offer.markets.includes(market) && offer.kind === kind
    && offer.date <= asOf && (Date.parse(asOf) - Date.parse(offer.date)) / 86400000 <= 90)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))[0] ?? null;
}

export function regionalPrice(item, market, { rates, offers = [], asOf } = {}, allowance) {
  const currency = PRICE_MARKETS[market]?.currency ?? 'CNY';
  const frame = item.estimated && Number.isFinite(item.frameLow);
  const lowCny = frame ? item.frameLow + allowance : item.priceLowCny;
  const highCny = frame ? (item.frameHigh ?? item.frameLow) + allowance : item.priceHighCny;
  // A frame sticker price never replaces the comparable full-bike reference.
  const offer = market === 'cn' || item.priceUnavailable ? null
    : selectRegionalOffer(offers, item.id, market, frame ? 'frameset' : 'complete-bike', asOf);
  const completeOffer = !frame && offer;
  const low = item.priceUnavailable ? null : convertPrice(completeOffer ? offer.amount : lowCny, completeOffer ? offer.currency : 'CNY', currency, rates);
  const high = item.priceUnavailable ? null : convertPrice(completeOffer ? offer.amount : highCny, completeOffer ? offer.currency : 'CNY', currency, rates);
  return { low, high, currency, offer, frame, converted: market !== 'cn' && (!completeOffer || offer.currency !== currency), basis: completeOffer ? 'offer' : frame ? 'build-reference' : 'catalog-reference' };
}
