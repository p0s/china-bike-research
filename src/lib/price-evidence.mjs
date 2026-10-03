/** Structured price qualifiers shared by the server-side catalog and planner. */
export function priceEvidence(price) {
  const type = price?.price_type ?? '';
  const reference = /conversion|reference|estimate/.test(type)
    || (price?.original_currency && price.original_currency !== 'CNY');
  const historical = price?.historical === true || /historical|used/.test(type);
  const conflict = /conflict/.test(type);
  const starting = price?.starting_price === true || /starting-price/.test(type);
  const conditional = price?.conditional === true || price?.status === 'promotion-conditional'
    || price?.price_basis === 'coupon';
  const partial = price?.purchase_total_complete === false;
  return { reference: Boolean(reference), historical, conflict, starting, conditional, partial,
    purchaseEligible: Boolean(price) && !reference && !historical && !conflict && !starting && !partial };
}

export function evidencePriceBounds(price) {
  if (!price) return { low: null, high: null };
  const low = price.amount_cny ?? price.low_cny ?? null;
  return { low, high: priceEvidence(price).starting ? null : price.amount_cny ?? price.high_cny ?? low };
}
