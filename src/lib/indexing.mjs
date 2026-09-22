// Index eligibility is independent of visibility in the interactive research catalog.
// Missing evidence is not a negative product-quality judgment.
export function candidateIndexable(entry) {
  if (!entry.identifiableModel || !entry.defaultVisible) return false;
  if (['research-queue', 'needs-exact-model', 'model-unclear'].includes(entry.candidate.status)) return false;
  if (!entry.sources?.some((source) => source.url?.startsWith('https://'))) return false;
  const facts = entry.candidate.facts ?? {};
  const usefulKeys = ['drivetrain', 'brakes', 'frame', 'frame_material', 'bottom_bracket', 'wheels', 'tires', 'sizes', 'complete_weight_g', 'frame_weight_g', 'tire_clearance_mm'];
  const known = usefulKeys.filter((key) => {
    const value = facts[key];
    return typeof value === 'number' ? Number.isFinite(value) && value > 0 : typeof value === 'string' && value.trim() && !/^(?:unknown|not (?:recorded|confirmed)|unverified|none)(?:\b|$)/i.test(value);
  });
  return known.length >= 3;
}
