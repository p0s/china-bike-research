export const COVERAGE_SCHEMA_VERSION = 1;

export const COVERAGE_COLLECTIONS = [
  'brands',
  'platforms',
  'variants',
  'prices',
  'sources',
  'images',
  'videos',
  'recommendations',
  'candidates',
  'exclusions',
  'research'
];

export const IMAGE_ACCURACY_RANKS = {
  illustrative: 0,
  'same-platform': 1,
  'same-model-different-market-build': 2,
  'exact-platform': 3,
  'exact-variant': 4
};

const IMAGE_ACCURACY_LABELS = Object.fromEntries(
  Object.entries(IMAGE_ACCURACY_RANKS).map(([label, rank]) => [rank, label])
);

const RELIABILITY_RANKS = {
  none: -1,
  'not-applicable': -1,
  low: 0,
  'low-to-medium': 0.5,
  medium: 1,
  'medium-high': 2,
  high: 3
};

const relationshipKeys = new Set([
  'brand_id',
  'candidate_id',
  'existing_record_id',
  'model_id',
  'platform_id',
  'source_id',
  'source_ids',
  'source_snapshot_id',
  'variant_id',
  'variant_ids',
  'video_ids'
]);

const unprotectedFieldRoots = {
  candidates: new Set(['missing', 'required_before_dashboard']),
  exclusions: new Set(['review_again_when'])
};

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasInformation(value) {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return true;
}

function sortedUnique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function collectFieldPaths(value, prefix = '', excludedRoots = new Set()) {
  const paths = [];
  if (!isObject(value)) return paths;

  for (const [key, child] of Object.entries(value)) {
    if (!prefix && (key === 'id' || excludedRoots.has(key))) continue;
    const childPath = prefix ? `${prefix}.${key}` : key;
    if (!hasInformation(child)) continue;
    if (Array.isArray(child) || !isObject(child)) paths.push(childPath);
    else paths.push(...collectFieldPaths(child, childPath, excludedRoots));
  }

  return sortedUnique(paths);
}

function collectRelationships(value, prefix = '') {
  const relationships = [];
  if (!isObject(value)) return relationships;

  for (const [key, child] of Object.entries(value)) {
    const childPath = prefix ? `${prefix}.${key}` : key;
    if (relationshipKeys.has(key)) {
      const values = Array.isArray(child) ? child : [child];
      for (const item of values) {
        if (typeof item === 'string' && item) relationships.push(`${childPath}=${item}`);
      }
      continue;
    }
    if (isObject(child)) relationships.push(...collectRelationships(child, childPath));
  }

  return sortedUnique(relationships);
}

function imageTarget(image) {
  if (image.platform_id) return `platforms:${image.platform_id}`;
  if (image.candidate_id) return `candidates:${image.candidate_id}`;
  return null;
}

function imageSourceTier(image) {
  if (image.subject_accuracy === 'illustrative') return 0;
  const status = image.rights?.status;
  if (['retailer-page-embed', 'public-post-embed'].includes(status)) return 1;
  if (status === 'official-page-embed') return 2;
  if (['project-owned', 'contributor-owned', 'permission-granted', 'brand-media-license', 'cc-licensed', 'public-domain'].includes(status)) return 3;
  return 0;
}

function imageProtection(image) {
  return {
    target: imageTarget(image),
    minimum_accuracy_rank: IMAGE_ACCURACY_RANKS[image.subject_accuracy] ?? -1,
    minimum_source_tier: imageSourceTier(image),
    remote_required: image.hosting?.mode === 'remote',
    primary_required: image.role === 'primary'
  };
}

function sourceTypeTier(type) {
  if (/^(?:manufacturer-|official-|government-)/.test(type)) return 3;
  if (type === 'authorized-retailer-page') return 2;
  if (/(?:retailer|industry)/.test(type)) return 2;
  if (/(?:market|community|research)/.test(type)) return 1;
  return 0;
}

function sourceProtection(source) {
  const reliability = {};
  for (const [dimension, label] of Object.entries(source.reliability ?? {})) {
    reliability[dimension] = RELIABILITY_RANKS[label] ?? -1;
  }
  return {
    minimum_type_tier: sourceTypeTier(source.type ?? ''),
    minimum_reliability: Object.fromEntries(Object.entries(reliability).sort(([a], [b]) => a.localeCompare(b)))
  };
}

function emptyCollectionMap() {
  return Object.fromEntries(COVERAGE_COLLECTIONS.map((collection) => [collection, {}]));
}

function emptyCollectionLists() {
  return Object.fromEntries(COVERAGE_COLLECTIONS.map((collection) => [collection, []]));
}

function countBy(records, selector) {
  const counts = {};
  for (const record of records) {
    const key = selector(record);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function priceKinds(candidate) {
  return ['official_price', 'observed_price'].filter((key) => hasInformation(candidate[key]));
}

export function createCoverageSnapshot(data) {
  const records = emptyCollectionLists();
  const fields = emptyCollectionMap();
  const relationships = emptyCollectionMap();

  for (const collection of COVERAGE_COLLECTIONS) {
    const excluded = unprotectedFieldRoots[collection] ?? new Set();
    for (const record of data[collection] ?? []) {
      records[collection].push(record.id);
      fields[collection][record.id] = collectFieldPaths(record, '', excluded);
      relationships[collection][record.id] = collectRelationships(record);
    }
    records[collection].sort((a, b) => a.localeCompare(b));
    fields[collection] = Object.fromEntries(Object.entries(fields[collection]).sort(([a], [b]) => a.localeCompare(b)));
    relationships[collection] = Object.fromEntries(Object.entries(relationships[collection]).sort(([a], [b]) => a.localeCompare(b)));
  }

  const images = {};
  const imageTargets = {};
  for (const image of [...data.images].sort((a, b) => a.id.localeCompare(b.id))) {
    const protection = imageProtection(image);
    images[image.id] = protection;
    if (!protection.target || !protection.primary_required) continue;
    const previous = imageTargets[protection.target];
    imageTargets[protection.target] = {
      minimum_accuracy_rank: Math.max(previous?.minimum_accuracy_rank ?? -1, protection.minimum_accuracy_rank),
      minimum_source_tier: Math.max(previous?.minimum_source_tier ?? -1, protection.minimum_source_tier),
      remote_required: Boolean(previous?.remote_required || protection.remote_required)
    };
  }

  const pricesByVariant = new Map();
  for (const price of data.prices) {
    const ids = pricesByVariant.get(price.variant_id) ?? [];
    ids.push(price.id);
    pricesByVariant.set(price.variant_id, ids);
  }
  const publishedVariants = {};
  for (const variant of data.variants) {
    if (pricesByVariant.has(variant.id)) publishedVariants[variant.id] = true;
  }
  const candidates = {};
  for (const candidate of data.candidates) {
    const kinds = priceKinds(candidate);
    if (kinds.length) candidates[candidate.id] = kinds;
  }

  const sourceQuality = Object.fromEntries([...data.sources]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((source) => [source.id, sourceProtection(source)]));

  return {
    schema_version: COVERAGE_SCHEMA_VERSION,
    catalog_metrics: {
      records: Object.fromEntries(COVERAGE_COLLECTIONS.map((collection) => [collection, data[collection].length])),
      image_accuracy: countBy(data.images, (image) => image.subject_accuracy),
      image_hosting: countBy(data.images, (image) => image.hosting?.mode ?? 'unknown'),
      candidate_prices: {
        official: data.candidates.filter((candidate) => hasInformation(candidate.official_price)).length,
        observed: data.candidates.filter((candidate) => hasInformation(candidate.observed_price)).length
      }
    },
    records,
    meta_fields: collectFieldPaths(data.meta),
    fields,
    relationships,
    source_quality: sourceQuality,
    images,
    image_targets: Object.fromEntries(Object.entries(imageTargets).sort(([a], [b]) => a.localeCompare(b))),
    price_targets: {
      published_variants: Object.fromEntries(Object.entries(publishedVariants).sort(([a], [b]) => a.localeCompare(b))),
      candidates: Object.fromEntries(Object.entries(candidates).sort(([a], [b]) => a.localeCompare(b)))
    }
  };
}

function mergeLists(previous = [], current = []) {
  return sortedUnique([...previous, ...current]);
}

function mergeCollectionMaps(previous = {}, current = {}) {
  const merged = {};
  for (const id of sortedUnique([...Object.keys(previous), ...Object.keys(current)])) {
    merged[id] = mergeLists(previous[id], current[id]);
  }
  return merged;
}

export function mergeCoverageBaseline(previous, current, updatedAt) {
  if (!previous) return { ...current, updated_at: updatedAt };
  const records = {};
  const fields = {};
  const relationships = {};
  for (const collection of COVERAGE_COLLECTIONS) {
    records[collection] = mergeLists(previous.records?.[collection], current.records[collection]);
    fields[collection] = mergeCollectionMaps(previous.fields?.[collection], current.fields[collection]);
    relationships[collection] = mergeCollectionMaps(previous.relationships?.[collection], current.relationships[collection]);
  }

  const images = {};
  for (const id of sortedUnique([...Object.keys(previous.images ?? {}), ...Object.keys(current.images)])) {
    const before = previous.images?.[id];
    const now = current.images[id];
    if (!before) images[id] = now;
    else if (!now) images[id] = before;
    else {
      images[id] = {
        target: before.target,
        minimum_accuracy_rank: Math.max(before.minimum_accuracy_rank, now.minimum_accuracy_rank),
        minimum_source_tier: Math.max(before.minimum_source_tier, now.minimum_source_tier),
        remote_required: Boolean(before.remote_required || now.remote_required),
        primary_required: Boolean(before.primary_required || now.primary_required)
      };
    }
  }

  const imageTargets = {};
  for (const target of sortedUnique([...Object.keys(previous.image_targets ?? {}), ...Object.keys(current.image_targets)])) {
    const before = previous.image_targets?.[target];
    const now = current.image_targets[target];
    if (!before) imageTargets[target] = now;
    else if (!now) imageTargets[target] = before;
    else {
      imageTargets[target] = {
        minimum_accuracy_rank: Math.max(before.minimum_accuracy_rank, now.minimum_accuracy_rank),
        minimum_source_tier: Math.max(before.minimum_source_tier, now.minimum_source_tier),
        remote_required: Boolean(before.remote_required || now.remote_required)
      };
    }
  }

  const sourceQuality = {};
  for (const id of sortedUnique([...Object.keys(previous.source_quality ?? {}), ...Object.keys(current.source_quality)])) {
    const before = previous.source_quality?.[id];
    const now = current.source_quality[id];
    if (!before) sourceQuality[id] = now;
    else if (!now) sourceQuality[id] = before;
    else {
      const dimensions = sortedUnique([
        ...Object.keys(before.minimum_reliability ?? {}),
        ...Object.keys(now.minimum_reliability ?? {})
      ]);
      sourceQuality[id] = {
        minimum_type_tier: Math.max(before.minimum_type_tier, now.minimum_type_tier),
        minimum_reliability: Object.fromEntries(dimensions.map((dimension) => [
          dimension,
          Math.max(before.minimum_reliability?.[dimension] ?? -1, now.minimum_reliability?.[dimension] ?? -1)
        ]))
      };
    }
  }

  return {
    schema_version: COVERAGE_SCHEMA_VERSION,
    updated_at: updatedAt,
    catalog_metrics: current.catalog_metrics,
    records,
    meta_fields: mergeLists(previous.meta_fields, current.meta_fields),
    fields,
    relationships,
    source_quality: sourceQuality,
    images,
    image_targets: imageTargets,
    price_targets: {
      published_variants: {
        ...(previous.price_targets?.published_variants ?? {}),
        ...current.price_targets.published_variants
      },
      candidates: Object.fromEntries(sortedUnique([
        ...Object.keys(previous.price_targets?.candidates ?? {}),
        ...Object.keys(current.price_targets.candidates)
      ]).map((id) => [id, mergeLists(previous.price_targets?.candidates?.[id], current.price_targets.candidates[id])]))
    }
  };
}

export function validateBaselineTransition(previous, current) {
  if (!previous) return [];
  const errors = [];
  if (previous.schema_version !== COVERAGE_SCHEMA_VERSION || current?.schema_version !== COVERAGE_SCHEMA_VERSION) {
    return [`coverage baseline transition must use schema version ${COVERAGE_SCHEMA_VERSION}`];
  }

  for (const collection of COVERAGE_COLLECTIONS) {
    for (const id of missingItems(previous.records?.[collection], current.records?.[collection])) {
      errors.push(`coverage baseline erased protected identity ${collection}:${id}`);
    }
    for (const [id, protectedFields] of Object.entries(previous.fields?.[collection] ?? {})) {
      for (const field of missingItems(protectedFields, current.fields?.[collection]?.[id])) {
        errors.push(`coverage baseline erased protected field ${collection}:${id}.${field}`);
      }
    }
    for (const [id, protectedRelationships] of Object.entries(previous.relationships?.[collection] ?? {})) {
      for (const relationship of missingItems(protectedRelationships, current.relationships?.[collection]?.[id])) {
        errors.push(`coverage baseline erased protected relationship ${collection}:${id}.${relationship}`);
      }
    }
  }

  for (const field of missingItems(previous.meta_fields, current.meta_fields)) {
    errors.push(`coverage baseline erased protected meta field ${field}`);
  }

  for (const [id, before] of Object.entries(previous.source_quality ?? {})) {
    const now = current.source_quality?.[id];
    if (!now) {
      errors.push(`coverage baseline erased source-quality protection sources:${id}`);
      continue;
    }
    if (now.minimum_type_tier < before.minimum_type_tier) errors.push(`coverage baseline lowered source type tier sources:${id}`);
    for (const [dimension, minimum] of Object.entries(before.minimum_reliability ?? {})) {
      if ((now.minimum_reliability?.[dimension] ?? -1) < minimum) {
        errors.push(`coverage baseline lowered ${dimension} reliability sources:${id}`);
      }
    }
  }

  for (const [id, before] of Object.entries(previous.images ?? {})) {
    const now = current.images?.[id];
    if (!now) {
      errors.push(`coverage baseline erased image protection images:${id}`);
      continue;
    }
    if (now.target !== before.target) errors.push(`coverage baseline changed protected image target images:${id}`);
    if (now.minimum_accuracy_rank < before.minimum_accuracy_rank) errors.push(`coverage baseline lowered image accuracy images:${id}`);
    if (now.minimum_source_tier < before.minimum_source_tier) errors.push(`coverage baseline lowered image source tier images:${id}`);
    if (before.remote_required && !now.remote_required) errors.push(`coverage baseline removed remote-image protection images:${id}`);
    if (before.primary_required && !now.primary_required) errors.push(`coverage baseline removed primary-image protection images:${id}`);
  }

  for (const [target, before] of Object.entries(previous.image_targets ?? {})) {
    const now = current.image_targets?.[target];
    if (!now) {
      errors.push(`coverage baseline erased image-target protection ${target}`);
      continue;
    }
    if (now.minimum_accuracy_rank < before.minimum_accuracy_rank) errors.push(`coverage baseline lowered target image accuracy ${target}`);
    if (now.minimum_source_tier < before.minimum_source_tier) errors.push(`coverage baseline lowered target image source tier ${target}`);
    if (before.remote_required && !now.remote_required) errors.push(`coverage baseline removed target remote-image protection ${target}`);
  }

  for (const variantId of Object.keys(previous.price_targets?.published_variants ?? {})) {
    if (!current.price_targets?.published_variants?.[variantId]) errors.push(`coverage baseline erased price protection variants:${variantId}`);
  }
  for (const [candidateId, protectedKinds] of Object.entries(previous.price_targets?.candidates ?? {})) {
    for (const kind of missingItems(protectedKinds, current.price_targets?.candidates?.[candidateId])) {
      errors.push(`coverage baseline erased ${kind} protection candidates:${candidateId}`);
    }
  }

  return sortedUnique(errors);
}

function recordMap(data, collection) {
  return new Map((data[collection] ?? []).map((record) => [record.id, record]));
}

function retirementKey(recordType, recordId) {
  return `${recordType}:${recordId}`;
}

function validateRetirements(data, baseline, retirements) {
  const errors = [];
  const byKey = new Map();
  const ids = new Set();
  const currentSources = new Set(data.sources.map((source) => source.id));

  for (const retirement of retirements) {
    if (!retirement || typeof retirement !== 'object') {
      errors.push('retirement record must be an object');
      continue;
    }
    if (typeof retirement.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(retirement.id)) errors.push('retirement record has an invalid id');
    if (ids.has(retirement.id)) errors.push(`retirement ${retirement.id}: duplicate id`);
    ids.add(retirement.id);
    if (!COVERAGE_COLLECTIONS.includes(retirement.record_type)) errors.push(`retirement ${retirement.id}: invalid record_type`);
    if (typeof retirement.record_id !== 'string' || !retirement.record_id) errors.push(`retirement ${retirement.id}: missing record_id`);
    if (!['retire', 'replace'].includes(retirement.action)) errors.push(`retirement ${retirement.id}: action must be retire or replace`);
    if (typeof retirement.reason !== 'string' || retirement.reason.trim().length < 20) errors.push(`retirement ${retirement.id}: reason must be at least 20 characters`);
    if (typeof retirement.reviewed_at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(retirement.reviewed_at)) errors.push(`retirement ${retirement.id}: invalid reviewed_at`);
    if (!Array.isArray(retirement.evidence_source_ids) || retirement.evidence_source_ids.length === 0) {
      errors.push(`retirement ${retirement.id}: evidence_source_ids must not be empty`);
    } else {
      for (const sourceId of retirement.evidence_source_ids) {
        if (!currentSources.has(sourceId)) errors.push(`retirement ${retirement.id}: evidence source ${sourceId} is not active`);
      }
    }
    if (retirement.action === 'replace' && !retirement.replacement) errors.push(`retirement ${retirement.id}: replacement is required`);
    if (retirement.replacement) {
      const { record_type: replacementType, record_id: replacementId } = retirement.replacement;
      if (!COVERAGE_COLLECTIONS.includes(replacementType) || !recordMap(data, replacementType).has(replacementId)) {
        errors.push(`retirement ${retirement.id}: replacement must identify an active record`);
      }
      if (replacementType === retirement.record_type && replacementId === retirement.record_id) errors.push(`retirement ${retirement.id}: replacement cannot be the retired record`);
    }

    const key = retirementKey(retirement.record_type, retirement.record_id);
    if (byKey.has(key)) errors.push(`retirement ${retirement.id}: duplicate retirement for ${key}`);
    byKey.set(key, retirement);

    if (!baseline?.records?.[retirement.record_type]?.includes(retirement.record_id)) {
      errors.push(`retirement ${retirement.id}: ${key} is not protected by the baseline`);
    }
    if (recordMap(data, retirement.record_type).has(retirement.record_id)) {
      errors.push(`retirement ${retirement.id}: ${key} is still active`);
    }
  }

  return { errors, byKey };
}

function missingItems(required = [], current = []) {
  const currentSet = new Set(current);
  return required.filter((item) => !currentSet.has(item));
}

function compareMetricObjects(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateCoverage(data, current, baseline, retirements = [], { requireCurrentBaseline = true } = {}) {
  const errors = [];
  if (!baseline || baseline.schema_version !== COVERAGE_SCHEMA_VERSION) {
    return [`coverage baseline must use schema version ${COVERAGE_SCHEMA_VERSION}`];
  }

  const retirementValidation = validateRetirements(data, baseline, retirements);
  errors.push(...retirementValidation.errors);
  const retirementsByKey = retirementValidation.byKey;

  for (const field of missingItems(baseline.meta_fields, current.meta_fields)) errors.push(`meta lost protected field ${field}`);

  for (const collection of COVERAGE_COLLECTIONS) {
    const currentRecords = recordMap(data, collection);
    for (const id of baseline.records?.[collection] ?? []) {
      const key = retirementKey(collection, id);
      if (!currentRecords.has(id) && !retirementsByKey.has(key)) errors.push(`${key} was removed without a retirement record`);
    }

    for (const [id, requiredFields] of Object.entries(baseline.fields?.[collection] ?? {})) {
      if (!currentRecords.has(id)) continue;
      const lost = missingItems(requiredFields, current.fields[collection]?.[id]);
      for (const field of lost) errors.push(`${collection}:${id} lost protected field ${field}`);
    }

    for (const [id, requiredRelationships] of Object.entries(baseline.relationships?.[collection] ?? {})) {
      if (!currentRecords.has(id)) continue;
      const lost = missingItems(requiredRelationships, current.relationships[collection]?.[id]);
      for (const relationship of lost) errors.push(`${collection}:${id} lost protected relationship ${relationship}`);
    }
  }

  const currentImages = new Map(data.images.map((image) => [image.id, image]));

  const currentSources = new Map(data.sources.map((source) => [source.id, source]));
  for (const [id, required] of Object.entries(baseline.source_quality ?? {})) {
    const source = currentSources.get(id);
    if (!source) continue;
    const actual = sourceProtection(source);
    if (actual.minimum_type_tier < required.minimum_type_tier) errors.push(`sources:${id} downgraded its evidence-source tier`);
    for (const [dimension, minimum] of Object.entries(required.minimum_reliability ?? {})) {
      if ((actual.minimum_reliability?.[dimension] ?? -1) < minimum) errors.push(`sources:${id} downgraded ${dimension} reliability`);
    }
  }

  for (const [id, required] of Object.entries(baseline.images ?? {})) {
    const image = currentImages.get(id);
    if (!image) continue;
    const actual = imageProtection(image);
    if (actual.target !== required.target) errors.push(`images:${id} changed target from ${required.target} to ${actual.target}`);
    if (actual.minimum_accuracy_rank < required.minimum_accuracy_rank) {
      errors.push(`images:${id} downgraded subject accuracy from ${IMAGE_ACCURACY_LABELS[required.minimum_accuracy_rank]} to ${image.subject_accuracy}`);
    }
    if (actual.minimum_source_tier < required.minimum_source_tier) errors.push(`images:${id} downgraded its source or reuse-rights tier`);
    if (required.remote_required && !actual.remote_required) errors.push(`images:${id} replaced a protected remote image with a local-only image`);
    if (required.primary_required && !actual.primary_required) errors.push(`images:${id} is no longer a primary image`);
  }

  for (const [target, required] of Object.entries(baseline.image_targets ?? {})) {
    if (retirementsByKey.has(target)) continue;
    const matching = data.images
      .filter((image) => imageTarget(image) === target && image.role === 'primary')
      .map(imageProtection);
    if (!matching.length) {
      errors.push(`${target} lost its protected primary image`);
      continue;
    }
    const qualified = matching.some((image) => image.minimum_accuracy_rank >= required.minimum_accuracy_rank
      && image.minimum_source_tier >= required.minimum_source_tier
      && (!required.remote_required || image.remote_required));
    if (!qualified) errors.push(`${target} no longer has a primary image at its protected quality`);
  }

  const pricesByVariant = new Set(data.prices.map((price) => price.variant_id));
  for (const variantId of Object.keys(baseline.price_targets?.published_variants ?? {})) {
    if (!pricesByVariant.has(variantId) && !retirementsByKey.has(`variants:${variantId}`)) {
      errors.push(`variants:${variantId} lost all protected price observations`);
    }
  }
  const candidatesById = recordMap(data, 'candidates');
  for (const [candidateId, requiredKinds] of Object.entries(baseline.price_targets?.candidates ?? {})) {
    if (!candidatesById.has(candidateId)) continue;
    const currentKinds = priceKinds(candidatesById.get(candidateId));
    for (const kind of missingItems(requiredKinds, currentKinds)) errors.push(`candidates:${candidateId} lost protected ${kind}`);
  }

  if (requireCurrentBaseline) {
    const stale = [];
    const newMetaFields = missingItems(current.meta_fields, baseline.meta_fields);
    if (newMetaFields.length) stale.push(`meta has ${newMetaFields.length} new protected field(s)`);
    for (const collection of COVERAGE_COLLECTIONS) {
      const newRecords = missingItems(current.records[collection], baseline.records?.[collection]);
      if (newRecords.length) stale.push(`${newRecords.length} new ${collection} record(s)`);
      for (const id of current.records[collection]) {
        const newFields = missingItems(current.fields[collection]?.[id], baseline.fields?.[collection]?.[id]);
        const newRelationships = missingItems(current.relationships[collection]?.[id], baseline.relationships?.[collection]?.[id]);
        if (newFields.length) stale.push(`${collection}:${id} has ${newFields.length} new protected field(s)`);
        if (newRelationships.length) stale.push(`${collection}:${id} has ${newRelationships.length} new protected relationship(s)`);
      }
    }
    for (const [id, actual] of Object.entries(current.images)) {
      const required = baseline.images?.[id];
      if (!required
        || actual.minimum_accuracy_rank > required.minimum_accuracy_rank
        || actual.minimum_source_tier > required.minimum_source_tier
        || (actual.remote_required && !required.remote_required)) stale.push(`images:${id} has stronger unaccepted protection`);
    }
    for (const [id, actual] of Object.entries(current.source_quality)) {
      const required = baseline.source_quality?.[id];
      if (!required || actual.minimum_type_tier > required.minimum_type_tier) {
        stale.push(`sources:${id} has stronger unaccepted source protection`);
        continue;
      }
      if (Object.entries(actual.minimum_reliability).some(([dimension, rank]) => rank > (required.minimum_reliability?.[dimension] ?? -1))) {
        stale.push(`sources:${id} has stronger unaccepted reliability protection`);
      }
    }
    for (const [target, actual] of Object.entries(current.image_targets)) {
      const required = baseline.image_targets?.[target];
      if (!required
        || actual.minimum_accuracy_rank > required.minimum_accuracy_rank
        || actual.minimum_source_tier > required.minimum_source_tier
        || (actual.remote_required && !required.remote_required)) stale.push(`${target} has stronger unaccepted image coverage`);
    }
    for (const variantId of Object.keys(current.price_targets.published_variants)) {
      if (!baseline.price_targets?.published_variants?.[variantId]) stale.push(`variants:${variantId} has new price coverage`);
    }
    for (const [candidateId, kinds] of Object.entries(current.price_targets.candidates)) {
      const additions = missingItems(kinds, baseline.price_targets?.candidates?.[candidateId]);
      if (additions.length) stale.push(`candidates:${candidateId} has new price coverage`);
    }
    if (!compareMetricObjects(current.catalog_metrics, baseline.catalog_metrics)) stale.push('catalog metrics do not match the accepted baseline');
    if (stale.length) errors.push(`coverage baseline is stale; run npm run coverage:accept (${stale.slice(0, 8).join('; ')}${stale.length > 8 ? `; ${stale.length - 8} more` : ''})`);
  }

  return sortedUnique(errors);
}

function metricValue(metrics, group, key) {
  return metrics?.[group]?.[key] ?? 0;
}

function tableRows(base, current, group, keys) {
  return keys.map((key) => {
    const before = metricValue(base?.catalog_metrics, group, key);
    const now = metricValue(current.catalog_metrics, group, key);
    const delta = now - before;
    return `| ${key} | ${base ? before : '—'} | ${now} | ${base ? (delta > 0 ? `+${delta}` : delta) : '—'} |`;
  });
}

function baselineRecordAdditions(base, current) {
  const additions = [];
  for (const collection of COVERAGE_COLLECTIONS) {
    for (const id of missingItems(current.records[collection], base?.records?.[collection])) additions.push(`${collection}:${id}`);
  }
  return additions;
}

export function formatCoverageReport({ current, base = null, retirements = [], errors = [] }) {
  const recordRows = tableRows(base, current, 'records', COVERAGE_COLLECTIONS);
  const accuracyRows = tableRows(base, current, 'image_accuracy', Object.keys(IMAGE_ACCURACY_RANKS));
  const additions = baselineRecordAdditions(base, current);
  const retirementLabels = retirements.map((item) => `${item.record_type}:${item.record_id}`);
  const status = errors.length ? 'FAIL' : 'PASS';
  const list = (items, empty) => items.length ? items.slice(0, 30).map((item) => `- ${item}`).join('\n') : `- ${empty}`;

  return [
    '## Catalog coverage regression report',
    '',
    `**Status: ${status}.** Existing record identities, evidence fields, relationships, prices, and image quality are protected by the monotonic baseline.`,
    '',
    '| Record type | Base | Current | Change |',
    '| --- | ---: | ---: | ---: |',
    ...recordRows,
    '',
    '| Image accuracy | Base | Current | Change |',
    '| --- | ---: | ---: | ---: |',
    ...accuracyRows,
    '',
    `Candidate price coverage: **${current.catalog_metrics.candidate_prices.official} official/reference** and **${current.catalog_metrics.candidate_prices.observed} observed** records.`,
    '',
    '<details><summary>Newly protected record identities</summary>',
    '',
    list(additions, 'No new record identities.'),
    additions.length > 30 ? `- …and ${additions.length - 30} more.` : '',
    '',
    '</details>',
    '',
    '<details><summary>Documented retirements</summary>',
    '',
    list(retirementLabels, 'No record retirements.'),
    '',
    '</details>',
    ...(errors.length ? ['', '<details><summary>Blocking regressions</summary>', '', ...errors.map((error) => `- ${error}`), '', '</details>'] : []),
    ''
  ].join('\n');
}
