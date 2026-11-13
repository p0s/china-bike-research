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
    purchaseEligible: Boolean(price) && !reference && !historical && !conflict && !starting && !partial && !conditional };
}

export function evidencePriceBounds(price) {
  if (!price) return { low: null, high: null };
  const low = price.amount_cny ?? price.low_cny ?? null;
  return { low, high: priceEvidence(price).starting ? null : price.amount_cny ?? price.high_cny ?? low };
}

// Newest observation first. Same-day observations of one record put the higher yuan ceiling
// first, so a file name never chooses a headline and a budget is never understated; then by ID.
export function latestPriceFirst(a, b) {
  const ceiling = (price) => price.amount_cny ?? price.high_cny ?? price.low_cny ?? 0;
  return String(b.observed_at ?? '').localeCompare(String(a.observed_at ?? ''))
    || ceiling(b) - ceiling(a)
    || String(a.id ?? '').localeCompare(String(b.id ?? ''));
}
