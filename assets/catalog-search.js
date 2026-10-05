// Normalize only buyer-facing material search terms; preserve source data and IDs.
export function normalizeMaterialSearch(value) {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase()
    .replace(/碳纤维|碳纖維|kohlefaser|kohlenstofffaser/gu, 'carbon');
}
