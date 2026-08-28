import { freshness, joinCatalogCandidates, joinProducts, loadDataset } from '../src/lib/data.mjs';
import { latestResearchAttemptIndex } from '../src/lib/research-attempts.mjs';

const DEFAULT_AS_OF = new Date().toISOString().slice(0, 10);

function unresolved(value) {
  return value === undefined || value === null || value === '' ||
    (typeof value === 'string' && /^(unknown|unverified|not recorded|varies|variable)$/i.test(value.trim()));
}

function addGap(gaps, code, label, score, details = {}) {
  gaps.push({ code, label, score, ...details });
}

function hasMaximumClearance(clearance) {
  if (!clearance || clearance.eligibility !== 'pass') return false;
  if (Number.isFinite(clearance.published_max_mm)) return true;
  return Number.isFinite(clearance.published_front_max_mm) && Number.isFinite(clearance.published_rear_max_mm);
}

function hasFrameMaterialDetail(frame) {
  if (!frame || unresolved(frame.material)) return false;
  const coarse = /^(carbon|titanium|aluminum|aluminium|alloy|steel|magnesium|composite)$/i.test(String(frame.material).trim());
  if (!coarse) return true;
  return [frame.material_grade, frame.claimed_fiber, frame.construction].some((value) => !unresolved(value));
}

function hasCandidateFrameMaterialDetail(facts) {
  const value = facts.frame_material ?? facts.frame;
  if (unresolved(value)) return false;
  return !/^(carbon|titanium|aluminum|aluminium|alloy|steel|magnesium|composite)( frame)?$/i.test(String(value).trim());
}

function latestPriceGap(gaps, product, asOf) {
  const price = product.latestPrice;
  if (!price) {
    addGap(gaps, 'price-missing', 'No dated price record', 28);
    return;
  }
  const age = freshness(price.observed_at, new Date(`${asOf}T00:00:00Z`));
  if (price.price_type === 'reference-range') {
    addGap(gaps, 'price-reference-range', 'Price is a reference range, not checkout evidence', 14, { observed_at: price.observed_at });
  }
  if (price.price_type === 'historical-launch' || price.status === 'historical') {
    addGap(gaps, 'price-historical', 'Latest price is historical or launch-only', 18, { observed_at: price.observed_at });
  } else if (age.days !== undefined && age.days > 90) {
    addGap(gaps, 'price-stale', `Price is ${age.days} days old`, 12, { observed_at: price.observed_at });
  }
  if (price.status !== 'available' && price.status !== 'in-stock') {
    addGap(gaps, 'purchase-route', 'Purchase status or route needs re-checking', 8, { status: price.status });
  }
}

function productGaps(product, asOf) {
  const { variant, platform, brand, image, latestPrice } = product;
  const gaps = [];
  const frame = platform.frame ?? {};
  const clearance = platform.tire_clearance;

  latestPriceGap(gaps, product, asOf);

  if (!image) addGap(gaps, 'image-missing', 'No primary image record', 24);
  else {
    if (image.subject_accuracy !== 'exact-variant') {
      addGap(gaps, 'image-exactness', `Primary image is ${image.subject_accuracy}`, 18, { image_id: image.id });
    }
    if (image.hosting?.mode === 'remote') {
      addGap(gaps, 'image-health-unverified', 'Remote image reachability needs runtime verification', 4, { image_id: image.id });
    }
  }

  if (unresolved(frame.geometry) || typeof frame.geometry !== 'object') {
    addGap(gaps, 'geometry-missing', 'No structured frame geometry', 20);
  }
  const hasVariantFrameWeight = Number.isFinite(variant.claimed_frame_weight_g) && variant.claimed_frame_weight_g > 0;
  if (unresolved(frame.claimed_frame_weight_g) && unresolved(frame.claimed_frame_weight_g_by_size) && !hasVariantFrameWeight) {
    addGap(gaps, 'frame-weight-missing', 'No frame weight', variant.kind === 'frameset' ? 16 : 10);
  }
  if (variant.kind === 'complete-bike' && unresolved(variant.claimed_complete_weight_g)) {
    addGap(gaps, 'complete-weight-missing', 'No complete-bike weight', 24);
  } else if (variant.kind === 'complete-bike' && unresolved(variant.claimed_complete_weight_basis)) {
    addGap(gaps, 'complete-weight-basis-missing', 'Complete-bike weight basis is missing', 8);
  }
  if (!hasMaximumClearance(clearance)) {
    addGap(gaps, 'clearance-unverified', 'Maximum tire clearance is not verified', 22, { eligibility: clearance?.eligibility ?? 'missing' });
  }
  if (!hasFrameMaterialDetail(frame)) addGap(gaps, 'frame-material-detail-missing', 'Exact frame material or construction is not documented', 14);
  if (unresolved(frame.stiffness_evidence)) addGap(gaps, 'stiffness-evidence-missing', 'No meaningful frame stiffness evidence', 6);
  if (unresolved(frame.bottom_bracket)) addGap(gaps, 'bottom-bracket-missing', 'Bottom-bracket standard is unknown', 9);

  if (variant.kind === 'complete-bike') {
    const exactDrivetrain = variant.drivetrain &&
      ['brand', 'model', 'speeds', 'shifting', 'layout'].every((key) => !unresolved(variant.drivetrain[key]));
    if (!exactDrivetrain) addGap(gaps, 'drivetrain-missing', 'Exact complete-bike drivetrain is missing', 22);
    const missingBom = [
      !variant.brakes && 'brakes',
      !variant.wheels && 'wheels',
      !variant.tires && 'tires',
      !variant.cockpit && 'cockpit'
    ].filter(Boolean);
    if (missingBom.length) addGap(gaps, 'bom-incomplete', `Exact build details missing: ${missingBom.join(', ')}`, 10, { fields: missingBom });
  }

  if (brand.warranty === 'verify-exact-seller-and-sku' || /unknown|verify/i.test(String(platform.china_availability ?? ''))) {
    addGap(gaps, 'support-warranty', 'Exact mainland support or warranty route needs verification', 8);
  }

  const score = gaps.reduce((sum, gap) => sum + gap.score, 0);
  const sourceIds = [...new Set([
    ...(variant.source_ids ?? []),
    ...(platform.source_ids ?? []),
    ...(latestPrice?.source_ids ?? [])
  ])];
  return {
    record_type: 'published-variant',
    id: variant.id,
    name: variant.name,
    platform_id: platform.id,
    brand_id: brand.id,
    category: platform.category,
    last_reviewed: platform.last_reviewed,
    priority_score: score,
    gaps: gaps.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code)),
    latest_price: latestPrice ? {
      observed_at: latestPrice.observed_at,
      price_type: latestPrice.price_type,
      status: latestPrice.status
    } : null,
    source_ids: sourceIds,
    files: [
      `data/variants/${variant.id}.json`,
      `data/platforms/${platform.id}.json`,
      ...product.prices.map((price) => `data/prices/${price.id}.json`),
      ...(image ? [`data/images/${platform.id}.json`] : []),
      ...sourceIds.map((sourceId) => `data/sources/${sourceId}.json`)
    ]
  };
}

function candidateGaps(entry) {
  const candidate = entry.candidate;
  const gaps = [];
  const facts = candidate.facts ?? {};
  const isFrameset = entry.kind === 'frameset';
  const priorityScore = { high: 26, medium: 17, low: 9 }[candidate.research_priority] ?? 13;
  addGap(gaps, 'candidate-blockers', 'Candidate is not publication-ready', priorityScore, {
    status: candidate.status,
    research_priority: candidate.research_priority ?? 'unspecified',
    missing: candidate.missing
  });
  if (!entry.price) addGap(gaps, 'price-missing', 'No dated candidate price evidence', 20);
  else if (!candidate.observed_price) addGap(gaps, 'price-not-observed', 'Candidate has no mainland observed checkout value', 12, { price_kind: entry.priceKind });
  else if (unresolved(candidate.observed_price.price_basis)) addGap(gaps, 'price-basis-missing', 'Observed selected-build price basis is missing', 8);
  if (isFrameset) {
    if (!Number.isFinite(facts.frame_weight_g)) addGap(gaps, 'frame-weight-missing', 'No frameset weight', 16);
    else if (unresolved(facts.frame_weight_basis)) addGap(gaps, 'frame-weight-basis-missing', 'Frameset weight basis is missing', 7);
  } else {
    if (!Number.isFinite(facts.complete_weight_g)) addGap(gaps, 'complete-weight-missing', 'No complete-bike weight', 24);
    else if (unresolved(facts.complete_weight_basis)) addGap(gaps, 'complete-weight-basis-missing', 'Complete-bike weight basis is missing', 8);
    if (unresolved(facts.drivetrain)) addGap(gaps, 'drivetrain-missing', 'Exact complete-bike drivetrain is missing', 22);
  }
  if (!Number.isFinite(facts.tire_clearance_mm)) addGap(gaps, 'clearance-unverified', 'Maximum tire clearance is not verified', 22);
  if (!hasCandidateFrameMaterialDetail(facts)) addGap(gaps, 'frame-material-detail-missing', 'Exact frame material or construction is not documented', 14);
  if (unresolved(facts.stiffness_evidence)) addGap(gaps, 'stiffness-evidence-missing', 'No meaningful frame stiffness evidence', 6);
  if ((candidate.source_ids ?? []).length === 0) addGap(gaps, 'source-missing', 'Candidate has no linked source record', 10);
  return {
    record_type: 'candidate',
    id: candidate.id,
    name: candidate.name,
    category: entry.category,
    last_reviewed: candidate.last_reviewed,
    priority_score: gaps.reduce((sum, gap) => sum + gap.score, 0),
    gaps,
    source_ids: candidate.source_ids ?? [],
    files: [
      `data/candidates/${candidate.id}.json`,
      ...(candidate.source_ids ?? []).map((sourceId) => `data/sources/${sourceId}.json`)
    ]
  };
}

const gapFieldIds = {
  'image-missing': 'image',
  'image-exactness': 'image',
  'price-missing': 'price',
  'price-not-observed': 'price',
  'price-reference-range': 'price',
  'price-historical': 'price',
  'purchase-route': 'purchase-route',
  'geometry-missing': 'geometry',
  'frame-weight-missing': 'frame-weight',
  'frame-weight-basis-missing': 'frame-weight',
  'complete-weight-missing': 'complete-weight',
  'complete-weight-basis-missing': 'complete-weight',
  'drivetrain-missing': 'drivetrain',
  'price-basis-missing': 'price',
  'clearance-unverified': 'tire-clearance',
  'bottom-bracket-missing': 'bottom-bracket',
  'frame-material-detail-missing': 'frame-material',
  'stiffness-evidence-missing': 'frame-stiffness',
  'bom-incomplete': 'bom',
  'support-warranty': 'warranty-support'
};

function attachResearchState(records, attempts) {
  const index = latestResearchAttemptIndex(attempts);
  return records.map((record) => ({
    ...record,
    gaps: record.gaps.map((gap) => {
      const field = gapFieldIds[gap.code];
      if (!field) return gap;
      const keys = record.record_type === 'candidate'
        ? [`candidate:${record.id}:${field}`]
        : [`variant:${record.id}:${field}`, `platform:${record.platform_id}:${field}`];
      const attempt = keys.map((key) => index.get(key)).find(Boolean);
      if (!attempt) return gap;
      return {
        ...gap,
        research: {
          attempt_id: attempt.id,
          status: attempt.status,
          searched_at: attempt.searched_at,
          retry_after: attempt.retry_after ?? null
        }
      };
    })
  }));
}

/**
 * Build a deterministic, read-only buyer-impact gap report. The report is
 * intentionally not written into data/research: that directory is a dated
 * import ledger with a fixed validation contract. Use `npm run data:gaps` to
 * print this report for the next evidence pass.
 */
export function buildGapReport(data = loadDataset(), asOf = DEFAULT_AS_OF) {
  const published = joinProducts(data).map((product) => productGaps(product, asOf));
  const candidates = joinCatalogCandidates(data).map(candidateGaps);
  const gaps = attachResearchState([...published, ...candidates], data.researchAttempts ?? [])
    .sort((a, b) => b.priority_score - a.priority_score || a.id.localeCompare(b.id));
  const gapCounts = {};
  const researchStatusCounts = {};
  for (const record of gaps) for (const gap of record.gaps) gapCounts[gap.code] = (gapCounts[gap.code] ?? 0) + 1;
  for (const record of gaps) for (const gap of record.gaps) {
    const status = gap.research?.status;
    if (status) researchStatusCounts[status] = (researchStatusCounts[status] ?? 0) + 1;
  }
  return {
    as_of: asOf,
    generated_by: 'npm run data:gaps',
    scope: { published_variants: published.length, candidates: candidates.length },
    gap_counts: Object.fromEntries(Object.entries(gapCounts).sort((a, b) => a[0].localeCompare(b[0]))),
    research_status_counts: Object.fromEntries(Object.entries(researchStatusCounts).sort((a, b) => a[0].localeCompare(b[0]))),
    records: gaps
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const asOf = process.env.DATA_GAPS_AS_OF ?? DEFAULT_AS_OF;
  console.log(JSON.stringify(buildGapReport(loadDataset(), asOf), null, 2));
}
