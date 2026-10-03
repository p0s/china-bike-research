import { PRICE_MARKETS, PRICE_CURRENCIES, validCountry } from '../../assets/regional-prices.js';

// CNY denomination alone is insufficient: several catalog references are
// converted overseas listings. Never call those the price of buying in China.
export function chinaPriceBasis(prices, asOf = new Date().toISOString().slice(0, 10)) {
  const price = [...prices].filter((item) => !item.market_ids && item.observed_at <= asOf
    && !/conversion|conflict|historical|used/.test(item.price_type ?? '')
    && (!item.original_currency || item.original_currency === 'CNY')
    && ['CNY', undefined].includes(item.currency)
    && Number.isFinite(item.amount_cny ?? item.low_cny) && Number.isFinite(item.amount_cny ?? item.high_cny))
    .sort((a, b) => b.observed_at.localeCompare(a.observed_at))[0];
  if (!price) return null;
  return { id: price.id ?? null, low: price.amount_cny ?? price.low_cny, high: price.amount_cny ?? price.high_cny,
    date: price.observed_at, conditional: price.status === 'promotion-conditional' || price.price_basis === 'coupon',
    approximate: /reference|range|estimate/.test(price.price_type ?? ''),
    comparable: !/reference|range|estimate/.test(price.price_type ?? ''), conditions: price.conditions ?? '' };
}

export function validateRegionalPricing(data) {
  const errors = [];
  const ids = new Set(data.variants.map((item) => item.id));
  const sources = new Map(data.sources.map((item) => [item.id, item]));
  const date = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && Number.isFinite(Date.parse(value));
  for (const rate of data.exchangeRates ?? []) {
    if (!rate.id || !date(rate.rate_date) || !date(rate.accessed_at) || rate.accessed_at < rate.rate_date) errors.push('exchange rates: invalid identity or dates');
    if (rate.per_eur?.EUR !== 1) errors.push(`exchange rates ${rate.id}: EUR base must be 1`);
    for (const currency of PRICE_CURRENCIES) {
      if (!(Number.isFinite(rate.per_eur?.[currency]) && rate.per_eur[currency] > 0)) errors.push(`exchange rates ${rate.id}: invalid ${currency} rate`);
    }
    if (!sources.has(rate.source_id)) errors.push(`exchange rates ${rate.id}: missing source`);
  }
  for (const offer of data.prices.filter((price) => price.market_ids !== undefined)) {
    if (!ids.has(offer.variant_id)) errors.push(`regional price ${offer.id}: missing exact variant`);
    if (!date(offer.observed_at)) errors.push(`regional price ${offer.id}: invalid observed_at`);
    if (!(Number.isFinite(offer.amount) && offer.amount > 0)) errors.push(`regional price ${offer.id}: needs positive native amount`);
    if (!['EUR', 'GBP', 'USD', 'CAD', 'MXN'].includes(offer.currency)) errors.push(`regional price ${offer.id}: unsupported native currency`);
    if (!Array.isArray(offer.market_ids) || !offer.market_ids.length || offer.market_ids.some((market) => !Object.hasOwn(PRICE_MARKETS, market) || ['cn', 'europe', 'north-america'].includes(market))) errors.push(`regional price ${offer.id}: needs explicit supported markets`);
    const variant = data.variants.find((item) => item.id === offer.variant_id);
    if (!['frameset', 'complete-bike'].includes(offer.package_kind) || variant?.kind !== offer.package_kind) errors.push(`regional price ${offer.id}: package must match the exact variant`);
    if (offer.price_type !== 'regional-listed-offer' || offer.status !== 'listed' || ![offer.channel, offer.conditions, offer.package_label].every((value) => typeof value === 'string' && value.trim())) errors.push(`regional price ${offer.id}: missing listing basis or conditions`);
    if (!Array.isArray(offer.source_ids) || !offer.source_ids.length || offer.source_ids.some((id) => !sources.get(id)?.url?.startsWith('https://'))) errors.push(`regional price ${offer.id}: needs public sources`);
    if (['amount_cny', 'low_cny', 'high_cny'].some((key) => offer[key] !== undefined)) errors.push(`regional price ${offer.id}: native offers must not masquerade as the CNY catalog basis`);
    if (offer.country_ids && (!Array.isArray(offer.country_ids) || !offer.country_ids.length || offer.country_ids.some((country) => !validCountry(country)))) errors.push(`regional price ${offer.id}: invalid destination countries`);
    for (const id of offer.supersedes ?? []) {
      const prior = data.prices.find((item) => item.id === id);
      if (!prior || prior.variant_id !== offer.variant_id || prior.observed_at > offer.observed_at || !prior.market_ids || id === offer.id) errors.push(`regional price ${offer.id}: invalid superseded observation`);
    }
    const delivery = offer.delivery;
    if (delivery) {
      if (!['confirmed', 'estimated', 'partial'].includes(delivery.status) || !['standard-addresses', 'contiguous-us'].includes(delivery.scope) || typeof delivery.basis !== 'string' || !delivery.basis.trim()) errors.push(`regional price ${offer.id}: invalid delivery basis`);
      if (!Array.isArray(delivery.source_ids) || !delivery.source_ids.length || delivery.source_ids.some((id) => !sources.has(id))) errors.push(`regional price ${offer.id}: missing delivery sources`);
      for (const key of ['country_ids', 'excluded_country_ids']) {
        if (delivery[key] && (!Array.isArray(delivery[key]) || delivery[key].some((country) => !validCountry(country) || !offer.country_ids?.includes(country)))) errors.push(`regional price ${offer.id}: invalid delivery country scope`);
      }
      if (delivery.country_ids?.some((country) => delivery.excluded_country_ids?.includes(country))) errors.push(`regional price ${offer.id}: overlapping delivery scopes`);
      if (['confirmed', 'estimated'].includes(delivery.status) && (!(Number.isFinite(delivery.total_low) && delivery.total_low >= offer.amount) || !(Number.isFinite(delivery.total_high) && delivery.total_high >= delivery.total_low) || delivery.shipping_included !== true || delivery.taxes_duties_included !== true)) errors.push(`regional price ${offer.id}: incomplete delivered total`);
      if (delivery.status === 'confirmed' && (delivery.all_required_charges_included !== true || !delivery.country_ids?.length)) errors.push(`regional price ${offer.id}: confirmed totals need complete charges and exact countries`);
    }
  }
  return errors;
}

export function regionalPricePayload(data, asOf = new Date().toISOString().slice(0, 10)) {
  const rates = [...(data.exchangeRates ?? [])].filter((rate) => rate.rate_date <= asOf)
    .sort((a, b) => b.rate_date.localeCompare(a.rate_date))[0] ?? null;
  const sources = new Map(data.sources.map((source) => [source.id, source]));
  return {
    asOf,
    rates: rates ? { ...rates, source: sources.get(rates.source_id)?.url } : null,
    offers: data.prices.filter((price) => price.market_ids).map((price) => ({
      id: price.id, productId: price.variant_id, markets: price.market_ids, currency: price.currency,
      amount: price.amount, kind: price.package_kind, package: price.package_label,
      date: price.observed_at, conditions: price.conditions,
      countries: price.country_ids, supersedes: price.supersedes, delivery: price.delivery,
      source: sources.get(price.source_ids[0])?.url, sourceTitle: sources.get(price.source_ids[0])?.title,
      deliverySources: (price.delivery?.source_ids ?? []).map((id) => ({ title: sources.get(id)?.title, url: sources.get(id)?.url }))
    }))
  };
}
