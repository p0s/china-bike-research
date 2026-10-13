// Normalize only buyer-facing material search terms; preserve source data and IDs.
export function normalizeMaterialSearch(value) {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase()
    .replace(/碳纤维|碳纖維|kohlefaser|kohlenstofffaser/gu, 'carbon');
}

// This is a search key only. Display names, recorded facts and URLs stay intact.
export function normalizeCatalogSearch(value) {
  return String(value ?? '').normalize('NFKD').toLowerCase()
    .replace(/\p{M}/gu, '')
    .replace(/×/gu, 'x')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function matchesCatalogSearch(index, query) {
  // A specific brand spelling, not general stemming: model suffixes are significant.
  const terms = String(query ?? '').normalize('NFKC').toLowerCase()
    .replace(/\bx[\s\p{Pd}_]*labs?\b/gu, 'xlab')
    .split(/\s+/u).map(normalizeCatalogSearch).filter(Boolean);
  return terms.every((term) => index.includes(term));
}
