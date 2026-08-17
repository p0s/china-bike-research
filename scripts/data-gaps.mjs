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
  if (unresolved(frame.claimed_frame_weight_g) && unresolved(frame.claimed_frame_weight_g_by_size)) {
    addGap(gaps, 'frame-weight-missing', 'No frame-weight claim', 14);
  }
  if (variant.kind === 'complete-bike' && unresolved(variant.claimed_complete_weight_g)) {
    addGap(gaps, 'complete-weight-missing', 'No complete-bike weight claim', 14);
  }
  if (platform.category.startsWith('gravel') || ['adventure-gravel', 'all-road'].includes(platform.category)) {
    if (!clearance || clearance.eligibility !== 'pass') {
      addGap(gaps, 'clearance-unverified', 'Tire-clearance evidence is not a clean pass', 11, { eligibility: clearance?.eligibility ?? 'missing' });
    }
  }
  if (unresolved(frame.bottom_bracket)) addGap(gaps, 'bottom-bracket-missing', 'Bottom-bracket standard is unknown', 9);

  if (variant.kind === 'complete-bike') {
    const exactDrivetrain = variant.drivetrain &&
      ['brand', 'model', 'speeds', 'shifting', 'layout'].every((key) => !unresolved(variant.drivetrain[key]));
    const missingBom = [
      !exactDrivetrain && 'exact drivetrain',
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
  const priorityScore = { high: 26, medium: 17, low: 9 }[candidate.research_priority] ?? 13;
  addGap(gaps, 'candidate-blockers', 'Candidate is not publication-ready', priorityScore, {
    status: candidate.status,
    research_priority: candidate.research_priority ?? 'unspecified',
    missing: candidate.missing
  });
  if (!entry.price) addGap(gaps, 'price-missing', 'No dated candidate price evidence', 20);
  else if (entry.priceKind !== 'observed') addGap(gaps, 'price-not-observed', 'Candidate price is not a mainland observed checkout value', 12, { price_kind: entry.priceKind });
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
  'complete-weight-missing': 'complete-weight',
  'clearance-unverified': 'tire-clearance',
  'bottom-bracket-missing': 'bottom-bracket',
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
