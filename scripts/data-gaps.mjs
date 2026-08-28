import { freshness, joinCatalogCandidates, joinProducts, loadDataset } from '../src/lib/data.mjs';
import { latestResearchAttemptIndex } from '../src/lib/research-attempts.mjs';

const DEFAULT_AS_OF = new Date().toISOString().slice(0, 10);
const DEFAULT_MODEL_LIMIT = 10;
const DEFAULT_GAP_LIMIT = 25;
const activeCandidatePriorities = new Set(['high', 'medium']);
const queueCategories = ['research-evidence', 'publication-gate', 'operational-check'];
const criticalFieldOrder = [
  'exact-configured-price',
  'weight-and-basis',
  'maximum-clearance',
  'drivetrain-and-bom',
  'material-and-construction',
  'purchase-route',
  'exact-image',
  'stiffness-evidence'
];

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
  const value = facts.frame_construction ?? facts.frame_material ?? facts.frame;
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
  } else if (!Number.isFinite(price.amount_cny)) {
    addGap(gaps, 'price-reference-range', 'Price does not identify one exact configured amount', 14, { observed_at: price.observed_at });
  }
  if (price.price_type === 'historical-launch' || price.status === 'historical') {
    addGap(gaps, 'price-historical', 'Latest price is historical or launch-only', 18, { observed_at: price.observed_at });
  } else if (age.days !== undefined && age.days > 90) {
    addGap(gaps, 'price-stale', `Price is ${age.days} days old`, 12, { observed_at: price.observed_at });
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
    for (const field of missingBom) addGap(gaps, 'bom-incomplete', `Exact build detail missing: ${field}`, 10, { field });
  }

  if (brand.warranty === 'verify-exact-seller-and-sku' || /unknown|verify/i.test(String(platform.china_availability ?? ''))) {
    addGap(gaps, 'support-warranty', 'Exact mainland support or warranty route needs verification', 8);
  }
  if (unresolved(variant.purchase_route) || (latestPrice && !['available', 'in-stock'].includes(latestPrice.status))) {
    addGap(gaps, 'purchase-route', 'Exact purchase status or route needs verification', 8, { status: latestPrice?.status ?? 'missing' });
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
    kind: variant.kind,
    finalist: Boolean(variant.research_finalist === true || platform.research_finalist === true),
    active_shortlist: true,
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
  else {
    if (!Number.isFinite(entry.price.amount_cny)) addGap(gaps, 'price-reference-range', 'Candidate price is not one exact configured amount', 14, { price_kind: entry.priceKind });
    if (unresolved(entry.price.price_basis)) addGap(gaps, 'price-basis-missing', 'Selected-build price basis is missing', 8);
    if (!candidate.observed_price) addGap(gaps, 'price-not-observed', 'Candidate has no mainland observed checkout value', 12, { price_kind: entry.priceKind });
  }
  if (!entry.image) addGap(gaps, 'image-missing', 'No primary image record', 24);
  else if (entry.image.subject_accuracy !== 'exact-variant') {
    addGap(gaps, 'image-exactness', `Primary image is ${entry.image.subject_accuracy}`, 18, { image_id: entry.image.id });
  }
  if (entry.image?.hosting?.mode === 'remote') {
    addGap(gaps, 'image-health-unverified', 'Remote image reachability needs runtime verification', 4, { image_id: entry.image.id });
  }
  if (isFrameset) {
    if (!Number.isFinite(facts.frame_weight_g)) addGap(gaps, 'frame-weight-missing', 'No frameset weight', 16);
    else if (unresolved(facts.frame_weight_basis)) addGap(gaps, 'frame-weight-basis-missing', 'Frameset weight basis is missing', 7);
  } else {
    if (!Number.isFinite(facts.complete_weight_g)) addGap(gaps, 'complete-weight-missing', 'No complete-bike weight', 24);
    else if (unresolved(facts.complete_weight_basis)) addGap(gaps, 'complete-weight-basis-missing', 'Complete-bike weight basis is missing', 8);
    if (unresolved(facts.drivetrain)) addGap(gaps, 'drivetrain-missing', 'Exact complete-bike drivetrain is missing', 22);
    const missingBom = [
      unresolved(facts.brakes) && 'brakes',
      unresolved(facts.wheels) && 'wheels',
      unresolved(facts.tires) && 'tires',
      unresolved(facts.cockpit) && 'cockpit'
    ].filter(Boolean);
    for (const field of missingBom) addGap(gaps, 'bom-incomplete', `Exact build detail missing: ${field}`, 10, { field });
  }
  if (!Number.isFinite(facts.tire_clearance_mm)) addGap(gaps, 'clearance-unverified', 'Maximum tire clearance is not verified', 22);
  if (!hasCandidateFrameMaterialDetail(facts)) addGap(gaps, 'frame-material-detail-missing', 'Exact frame material or construction is not documented', 14);
  if (unresolved(facts.stiffness_evidence)) addGap(gaps, 'stiffness-evidence-missing', 'No meaningful frame stiffness evidence', 6);
  if (unresolved(facts.purchase_route ?? candidate.purchase_route)) addGap(gaps, 'purchase-route', 'Exact purchase route is not documented', 8);
  if ((candidate.source_ids ?? []).length === 0) addGap(gaps, 'source-missing', 'Candidate has no linked source record', 10);
  return {
    record_type: 'candidate',
    id: candidate.id,
    name: candidate.name,
    category: entry.category,
    kind: entry.kind,
    finalist: candidate.research_finalist === true,
    active_shortlist: activeCandidatePriorities.has(candidate.research_priority),
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
  'price-stale': 'price',
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

function queueCategory(code) {
  if (['candidate-blockers', 'source-missing'].includes(code)) return 'publication-gate';
  if (code === 'image-health-unverified') return 'operational-check';
  return 'research-evidence';
}

function criticalField(record, code) {
  if (['price-missing', 'price-reference-range', 'price-historical', 'price-stale', 'price-basis-missing'].includes(code)) return 'exact-configured-price';
  if (record.kind === 'complete-bike' && ['complete-weight-missing', 'complete-weight-basis-missing'].includes(code)) return 'weight-and-basis';
  if (record.kind === 'frameset' && ['frame-weight-missing', 'frame-weight-basis-missing'].includes(code)) return 'weight-and-basis';
  if (code === 'clearance-unverified') return 'maximum-clearance';
  if (record.kind === 'complete-bike' && ['drivetrain-missing', 'bom-incomplete'].includes(code)) return 'drivetrain-and-bom';
  if (code === 'frame-material-detail-missing') return 'material-and-construction';
  if (code === 'purchase-route') return 'purchase-route';
  if (['image-missing', 'image-exactness'].includes(code)) return 'exact-image';
  if (record.finalist && code === 'stiffness-evidence-missing') return 'stiffness-evidence';
  return null;
}

function researchActionability(gap, asOf) {
  if (!gap.research) return 'unattempted';
  if (gap.research.status !== 'found' && gap.research.retry_after && gap.research.retry_after <= asOf) return 'retry-due';
  return null;
}

function decorateRecords(records, asOf) {
  return records.map((record) => ({
    ...record,
    gaps: record.gaps.map((gap) => {
      const category = queueCategory(gap.code);
      const field = criticalField(record, gap.code);
      return {
        ...gap,
        queue_category: category,
        decision_critical: Boolean(field),
        critical_field: field,
        actionability: category === 'research-evidence' ? researchActionability(gap, asOf) : null
      };
    })
  }));
}

function groupSelectedGaps(items) {
  const grouped = new Map();
  for (const { record, gap, valueScore } of items) {
    const key = `${record.record_type}:${record.id}`;
    if (!grouped.has(key)) grouped.set(key, { ...record, queue_score: valueScore, gaps: [] });
    const selected = grouped.get(key);
    selected.queue_score = Math.max(selected.queue_score, valueScore);
    selected.gaps.push({ ...gap, value_score: valueScore });
  }
  return [...grouped.values()]
    .map((record) => ({ ...record, gaps: record.gaps.sort((a, b) => b.value_score - a.value_score || a.code.localeCompare(b.code)) }))
    .sort((a, b) => b.queue_score - a.queue_score || a.id.localeCompare(b.id));
}

function selectBounded(records, predicate) {
  const ranked = records.flatMap((record) => record.gaps
    .filter((gap) => predicate(gap))
    .map((gap) => ({ record, gap, valueScore: record.priority_score + gap.score })))
    .sort((a, b) => b.valueScore - a.valueScore || a.record.id.localeCompare(b.record.id) || a.gap.code.localeCompare(b.gap.code));
  const selected = [];
  const selectedModels = new Set();
  for (const item of ranked) {
    const modelKey = `${item.record.record_type}:${item.record.id}`;
    if (!selectedModels.has(modelKey) && selectedModels.size >= DEFAULT_MODEL_LIMIT) continue;
    selectedModels.add(modelKey);
    selected.push(item);
    if (selected.length === DEFAULT_GAP_LIMIT) break;
  }
  return groupSelectedGaps(selected);
}

function selectDefaultResearch(records) {
  return selectBounded(records, (gap) =>
    gap.queue_category === 'research-evidence' && gap.decision_critical && gap.actionability);
}

function recordsForCategory(records, category) {
  return records
    .map((record) => ({ ...record, gaps: record.gaps.filter((gap) => gap.queue_category === category) }))
    .filter((record) => record.gaps.length > 0);
}

function summarizeQueue(records) {
  const gapCounts = {};
  let gapCount = 0;
  for (const record of records) for (const gap of record.gaps) {
    gapCount += 1;
    gapCounts[gap.code] = (gapCounts[gap.code] ?? 0) + 1;
  }
  return {
    record_count: records.length,
    gap_count: gapCount,
    records_by_record_type: typeCounts(records),
    gaps_by_record_type: {
      published_variants: records.filter((record) => record.record_type === 'published-variant').reduce((sum, record) => sum + record.gaps.length, 0),
      candidates: records.filter((record) => record.record_type === 'candidate').reduce((sum, record) => sum + record.gaps.length, 0)
    },
    gap_counts: Object.fromEntries(Object.entries(gapCounts).sort((a, b) => a[0].localeCompare(b[0]))),
    records
  };
}

function applicableCriticalFields(record) {
  return criticalFieldOrder.filter((field) => {
    if (field === 'drivetrain-and-bom') return record.kind === 'complete-bike';
    if (field === 'stiffness-evidence') return record.finalist;
    return true;
  });
}

function typeCounts(records, predicate = () => true) {
  return {
    published_variants: records.filter((record) => record.record_type === 'published-variant' && predicate(record)).length,
    candidates: records.filter((record) => record.record_type === 'candidate' && predicate(record)).length
  };
}

function percentage(covered, required) {
  return required === 0 ? null : Number(((covered / required) * 100).toFixed(1));
}

function buildMetrics(records, mode, throughput = null) {
  const states = records.map((record) => {
    const missingFields = new Set(record.gaps.filter((gap) => gap.decision_critical).map((gap) => gap.critical_field));
    const requiredFields = applicableCriticalFields(record);
    return { record, requiredFields, decisionReady: requiredFields.every((field) => !missingFields.has(field)) };
  });
  const fields = {};
  for (const field of criticalFieldOrder) {
    const applicable = states.filter((state) => state.requiredFields.includes(field));
    const covered = applicable.filter((state) => !state.record.gaps.some((gap) => gap.decision_critical && gap.critical_field === field));
    fields[field] = {
      required: applicable.length,
      covered: covered.length,
      coverage_percent: percentage(covered.length, applicable.length),
      denominator_by_record_type: typeCounts(applicable.map((state) => state.record)),
      covered_by_record_type: typeCounts(covered.map((state) => state.record)),
      ...(field === 'stiffness-evidence' ? { required_only_for_explicit_finalists: true } : {})
    };
  }
  const required = Object.values(fields).reduce((sum, field) => sum + field.required, 0);
  const covered = Object.values(fields).reduce((sum, field) => sum + field.covered, 0);
  const requiredByType = {
    published_variants: Object.values(fields).reduce((sum, field) => sum + field.denominator_by_record_type.published_variants, 0),
    candidates: Object.values(fields).reduce((sum, field) => sum + field.denominator_by_record_type.candidates, 0)
  };
  const coveredByType = {
    published_variants: Object.values(fields).reduce((sum, field) => sum + field.covered_by_record_type.published_variants, 0),
    candidates: Object.values(fields).reduce((sum, field) => sum + field.covered_by_record_type.candidates, 0)
  };
  const ready = states.filter((state) => state.decisionReady).map((state) => state.record);
  const stiffnessCovered = records.filter((record) => !record.gaps.some((gap) => gap.code === 'stiffness-evidence-missing'));
  const modelsCompleted = throughput?.modelsCompleted ?? null;
  const hours = throughput?.hours ?? null;
  return {
    denominator: {
      mode,
      filters: mode === 'all'
        ? ['all published variants', 'all non-duplicate candidates']
        : ['all published variants', 'non-duplicate high/medium-priority candidates'],
      record_types: typeCounts(records),
      total_models: records.length
    },
    decision_ready_models: {
      total: ready.length,
      by_record_type: typeCounts(ready),
      denominator_total: records.length
    },
    critical_field_coverage: {
      covered,
      required,
      coverage_percent: percentage(covered, required),
      required_by_record_type: requiredByType,
      covered_by_record_type: coveredByType,
      fields
    },
    supporting_field_coverage: {
      stiffness_evidence: {
        covered: stiffnessCovered.length,
        denominator_total: records.length,
        coverage_percent: percentage(stiffnessCovered.length, records.length),
        denominator_by_record_type: typeCounts(records),
        covered_by_record_type: typeCounts(stiffnessCovered),
        note: 'Visible for every model; decision-critical only when research_finalist is true.'
      }
    },
    throughput: {
      inputs: {
        decision_ready_models_completed: modelsCompleted,
        elapsed_research_hours: hours
      },
      decision_ready_models_per_hour: modelsCompleted === null ? null : Number((modelsCompleted / hours).toFixed(2))
    }
  };
}

function attachResearchState(records, attempts) {
  const index = latestResearchAttemptIndex(attempts);
  return records.map((record) => ({
    ...record,
    gaps: record.gaps.map((gap) => {
      const field = gapFieldIds[gap.code];
      if (!field) return gap;
      const fields = gap.code === 'bom-incomplete' && gap.field ? [gap.field, field] : [field];
      const keys = fields.flatMap((targetField) => record.record_type === 'candidate'
        ? [`candidate:${record.id}:${targetField}`]
        : [`variant:${record.id}:${targetField}`, `platform:${record.platform_id}:${targetField}`]);
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
export function buildGapReport(data = loadDataset(), asOf = DEFAULT_AS_OF, options = {}) {
  const all = options.all === true;
  const published = joinProducts(data).map((product) => productGaps(product, asOf));
  const candidates = joinCatalogCandidates(data).map(candidateGaps);
  const fullRecords = decorateRecords(attachResearchState([...published, ...candidates], data.researchAttempts ?? []), asOf)
    .sort((a, b) => b.priority_score - a.priority_score || a.id.localeCompare(b.id));
  const scopedRecords = all ? fullRecords : fullRecords.filter((record) => record.active_shortlist);
  const researchRecords = all ? recordsForCategory(scopedRecords, 'research-evidence') : selectDefaultResearch(scopedRecords);
  const publicationRecords = recordsForCategory(scopedRecords, 'publication-gate');
  const operationalRecords = recordsForCategory(scopedRecords, 'operational-check');
  const queues = {
    'research-evidence': summarizeQueue(researchRecords),
    'publication-gate': summarizeQueue(all ? publicationRecords : selectBounded(scopedRecords, (gap) => gap.queue_category === 'publication-gate')),
    'operational-check': summarizeQueue(all ? operationalRecords : selectBounded(scopedRecords, (gap) => gap.queue_category === 'operational-check'))
  };
  const availableQueues = {
    'research-evidence': summarizeQueue(recordsForCategory(scopedRecords, 'research-evidence')),
    'publication-gate': summarizeQueue(publicationRecords),
    'operational-check': summarizeQueue(operationalRecords)
  };
  const researchStatusCounts = {};
  for (const record of researchRecords) for (const gap of record.gaps) {
    const status = gap.research?.status;
    if (status) researchStatusCounts[status] = (researchStatusCounts[status] ?? 0) + 1;
  }
  return {
    as_of: asOf,
    generated_by: 'npm run data:gaps',
    mode: all ? 'all' : 'active-shortlist',
    scope: {
      published_variants: scopedRecords.filter((record) => record.record_type === 'published-variant').length,
      candidates: scopedRecords.filter((record) => record.record_type === 'candidate').length,
      dataset: { published_variants: published.length, candidates: candidates.length },
      filters: all
        ? ['all published variants', 'all non-duplicate candidates', 'all gap states and priorities']
        : ['all published variants', 'non-duplicate high/medium-priority candidates', 'decision-critical', 'unattempted or retry-due']
    },
    default_limits: all ? null : { models: DEFAULT_MODEL_LIMIT, atomic_gaps: DEFAULT_GAP_LIMIT },
    queue_counts: Object.fromEntries(queueCategories.map((category) => [category, {
      records: queues[category].record_count,
      gaps: queues[category].gap_count,
      records_by_record_type: queues[category].records_by_record_type,
      gaps_by_record_type: queues[category].gaps_by_record_type,
      active_scope_total_records: availableQueues[category].record_count,
      active_scope_total_gaps: availableQueues[category].gap_count
    }])),
    gap_counts_scope: 'research-evidence',
    gap_counts: queues['research-evidence'].gap_counts,
    research_status_counts: Object.fromEntries(Object.entries(researchStatusCounts).sort((a, b) => a[0].localeCompare(b[0]))),
    metrics: buildMetrics(scopedRecords, all ? 'all' : 'active-shortlist', options.throughput ?? null),
    queues,
    records: researchRecords
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const asOf = process.env.DATA_GAPS_AS_OF ?? DEFAULT_AS_OF;
  const args = process.argv.slice(2);
  const value = (name) => {
    const equals = args.find((arg) => arg.startsWith(`${name}=`));
    if (equals) return equals.slice(name.length + 1);
    const index = args.indexOf(name);
    return index === -1 ? null : args[index + 1];
  };
  const modelsValue = value('--models-completed');
  const hoursValue = value('--hours');
  if ((modelsValue === null) !== (hoursValue === null)) throw new Error('--models-completed and --hours must be provided together');
  const modelsCompleted = modelsValue === null ? null : Number(modelsValue);
  const hours = hoursValue === null ? null : Number(hoursValue);
  if (modelsCompleted !== null && (!Number.isInteger(modelsCompleted) || modelsCompleted < 0)) throw new Error('--models-completed must be a non-negative integer');
  if (hours !== null && (!Number.isFinite(hours) || hours <= 0)) throw new Error('--hours must be a positive number');
  const throughput = modelsCompleted === null ? null : { modelsCompleted, hours };
  console.log(JSON.stringify(buildGapReport(loadDataset(), asOf, { all: args.includes('--all'), throughput }), null, 2));
}
