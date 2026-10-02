import { PRICE_MARKETS } from '../../assets/regional-prices.js';

export function validateRegionalPricing(data) {
  const errors = [];
  const ids = new Set(data.variants.map((item) => item.id));
  const sources = new Map(data.sources.map((item) => [item.id, item]));
  const date = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && Number.isFinite(Date.parse(value));
  for (const rate of data.exchangeRates ?? []) {
    if (!rate.id || !date(rate.rate_date) || !date(rate.accessed_at) || rate.accessed_at < rate.rate_date) errors.push('exchange rates: invalid identity or dates');
    if (rate.per_eur?.EUR !== 1) errors.push(`exchange rates ${rate.id}: EUR base must be 1`);
    for (const currency of new Set(Object.values(PRICE_MARKETS).map((market) => market.currency))) {
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
      source: sources.get(price.source_ids[0])?.url, sourceTitle: sources.get(price.source_ids[0])?.title
    }))
  };
}
