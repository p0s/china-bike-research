import fs from 'node:fs';
import path from 'node:path';
import { validateResearchAttempts } from './research-attempts.mjs';

const root = path.resolve(import.meta.dirname, '../..');

export const supportedCategories = [
  'road', 'road-race', 'road-aero', 'road-endurance', 'road-climbing',
  'gravel', 'gravel-race', 'gravel-flatbar', 'gravel-touring', 'gravel-adventure', 'adventure-gravel', 'all-road',
  'mtb-xc', 'mtb-trail', 'mtb-enduro',
  'e-road', 'folding', 'triathlon'
];

const categoryLabels = {
  road: 'Road',
  'road-race': 'Road race',
  'road-aero': 'Aero road',
  'road-endurance': 'Endurance road',
  'road-climbing': 'Climbing road',
  gravel: 'Gravel',
  'gravel-race': 'Race gravel',
  'gravel-flatbar': 'Flat-bar gravel',
  'gravel-touring': 'Gravel touring',
  'gravel-adventure': 'Adventure gravel',
  'adventure-gravel': 'Adventure gravel',
  'all-road': 'All-road',
  'mtb-xc': 'Cross-country MTB',
  'mtb-trail': 'Trail MTB',
  'mtb-enduro': 'Enduro MTB',
  'e-road': 'E-road',
  folding: 'Folding',
  triathlon: 'Triathlon / time trial'
};

export function categoryLabel(category) {
  return categoryLabels[category] ?? String(category).replaceAll('-', ' ');
}

export function categoryFamily(category) {
  if (String(category).startsWith('road')) return 'road';
  if (String(category).startsWith('gravel') || ['adventure-gravel', 'all-road'].includes(category)) return 'gravel';
  if (String(category).startsWith('mtb-')) return 'mtb';
  return category;
}

export function evidenceLabel(value) {
  const labels = {
    official: 'official source',
    'industry-report': 'industry report',
    'retailer-claim': 'retailer claim',
    'seller-claim': 'seller claim',
    'seller-listing': 'seller listing',
    'snapshot-classification': 'marketplace listing classification',
    unknown: 'unverified'
  };
  return labels[value] ?? String(value).replaceAll('-', ' ');
}

export function supportsStandardFramesetBuild(category) {
  return ['road', 'gravel', 'triathlon'].includes(categoryFamily(category));
}

function categoryDetailLines(platform) {
  const details = platform.category_details ?? {};
  return [details.note, details.evidence ? `Evidence: ${evidenceLabel(details.evidence)}.` : ''].filter(Boolean);
}

export function categoryMetric(platform) {
  const category = platform.category;
  if (category.startsWith('mtb-')) {
    const suspension = platform.category_details?.suspension ?? {};
    const front = suspension.travel_front_mm;
    const rear = suspension.travel_rear_mm;
    const value = front && rear ? `${front}/${rear} mm` : front ? `${front} mm front` : 'Unverified';
    return {
      label: 'Suspension',
      value,
      sortValue: front ?? 0,
      kind: 'suspension',
      details: [
        suspension.layout ? `Layout: ${String(suspension.layout).replaceAll('-', ' ')}.` : 'Suspension layout is not recorded.',
        suspension.shock_included ? `Shock included: ${String(suspension.shock_included).replaceAll('-', ' ')}.` : '',
        ...categoryDetailLines(platform)
      ].filter(Boolean)
    };
  }
  if (category === 'e-road') {
    const motor = platform.category_details?.motor ?? {};
    return {
      label: 'Motor',
      value: motor.model ?? 'Unverified',
      sortValue: motor.power_w ?? 0,
      kind: 'motor',
      details: [
        motor.power_w ? `${motor.power_w} W listed power.` : 'Motor power is not recorded.',
        motor.battery_wh ? `${motor.battery_wh} Wh battery.` : 'Battery capacity is not recorded.',
        ...categoryDetailLines(platform)
      ].filter(Boolean)
    };
  }
  if (category === 'folding') {
    const folding = platform.category_details?.folding ?? {};
    const dimensions = folding.folded_dimensions_mm;
    return {
      label: 'Fold',
      value: dimensions ? dimensions.join(' × ') + ' mm' : (folding.wheel_size ?? 'Unverified'),
      sortValue: 0,
      kind: 'folding',
      details: [
        folding.wheel_size ? `Wheel size: ${folding.wheel_size}.` : 'Wheel size is not recorded.',
        dimensions ? 'Folded dimensions are recorded.' : 'Folded dimensions are not recorded.',
        ...categoryDetailLines(platform)
      ].filter(Boolean)
    };
  }
  if (category === 'triathlon') {
    const triathlon = platform.category_details ?? {};
    return {
      label: 'Format',
      value: triathlon.discipline ?? 'Triathlon / time trial',
      sortValue: 0,
      kind: 'triathlon',
      details: [
        triathlon.aero_bars ? `Aero bars: ${triathlon.aero_bars}.` : 'Aero-bar package is not recorded.',
        triathlon.storage && triathlon.storage !== 'unknown'
          ? `Triathlon storage / boxes: ${triathlon.storage}.`
          : 'Triathlon storage / boxes: Unknown.',
        ...categoryDetailLines(platform)
      ].filter(Boolean)
    };
  }
  const details = platform.category_details ?? {};
  return {
    label: 'Use',
    value: details.discipline ?? categoryLabel(category),
    sortValue: 0,
    kind: 'discipline',
    details: categoryDetailLines(platform).length ? categoryDetailLines(platform) : [`Category: ${categoryLabel(category)}.`]
  };
}

/** @param {string} directory */
export function loadDirectory(directory) {
  const absolute = path.join(root, 'data', directory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const file = path.join(absolute, name);
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (error) {
        throw new Error(`${path.relative(root, file)}: ${error.message}`);
      }
    });
}

let cache;
export function loadDataset() {
  if (cache) return cache;
  cache = {
    meta: JSON.parse(fs.readFileSync(path.join(root, 'data/meta.json'), 'utf8')),
    brands: loadDirectory('brands'),
    platforms: loadDirectory('platforms'),
    variants: loadDirectory('variants'),
    prices: loadDirectory('prices'),
    sources: loadDirectory('sources'),
    images: loadDirectory('images'),
    videos: loadDirectory('videos'),
    groupsets: loadDirectory('groupsets'),
    recommendations: loadDirectory('recommendations'),
    candidates: loadDirectory('candidates'),
    exclusions: loadDirectory('exclusions'),
    research: loadDirectory('research'),
    researchAttempts: loadDirectory('research-attempts')
  };
  return cache;
}

export function resetDatasetCache() { cache = undefined; }

/** @param {unknown} value */
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
/** @param {unknown} value */
function isDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)); }
/** @param {unknown} value */
function isId(value) { return typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value); }
function categoryValues(value) {
  if (!value) return [];
  return String(value).split('|').map((item) => item.trim()).filter(Boolean);
}
function hasSupportedCategory(value, categorySet) { return categoryValues(value).every((category) => categorySet.has(category)); }

export function validateDataset(data = loadDataset()) {
  const errors = [];
  const requireFields = (kind, record, fields) => {
    for (const field of fields) {
      if (record[field] === undefined || record[field] === null || record[field] === '') {
        errors.push(`${kind} ${record.id ?? '(missing id)'}: missing ${field}`);
      }
    }
  };
  const unique = (kind, records) => {
    const seen = new Set();
    for (const record of records) {
      if (!isId(record.id)) errors.push(`${kind}: invalid id ${String(record.id)}`);
      if (seen.has(record.id)) errors.push(`${kind}: duplicate id ${record.id}`);
      seen.add(record.id);
    }
  };

  for (const [kind, records] of Object.entries({
    brand: data.brands,
    platform: data.platforms,
    variant: data.variants,
    price: data.prices,
    source: data.sources,
    image: data.images,
    video: data.videos,
    groupset: data.groupsets,
    recommendation: data.recommendations,
    candidate: data.candidates,
    exclusion: data.exclusions,
    research: data.research,
    researchAttempt: data.researchAttempts
  })) unique(kind, records);

  const buildAssumption = data.meta?.frameset_build_assumption;
  if (!isObject(buildAssumption)) errors.push('meta: missing frameset_build_assumption');
  else {
    if (typeof buildAssumption.amount_cny !== 'number' || buildAssumption.amount_cny <= 0) errors.push('meta: invalid frameset_build_assumption.amount_cny');
    if (typeof buildAssumption.label !== 'string' || !buildAssumption.label.trim()) errors.push('meta: missing frameset_build_assumption.label');
    if (typeof buildAssumption.drivetrain_label !== 'string' || !buildAssumption.drivetrain_label.trim()) errors.push('meta: missing frameset_build_assumption.drivetrain_label');
    if (!Array.isArray(buildAssumption.presets) || buildAssumption.presets.length < 2) errors.push('meta: frameset_build_assumption.presets must include named and custom options');
    else {
      const presetIds = new Set();
      for (const preset of buildAssumption.presets) {
        if (!isId(preset.id) || presetIds.has(preset.id)) errors.push('meta: invalid or duplicate frameset build preset id');
        presetIds.add(preset.id);
        if (typeof preset.label !== 'string' || !preset.label.trim()) errors.push(`meta: frameset build preset ${preset.id} needs a label`);
        if (preset.custom !== true && (!Number.isFinite(preset.amount_cny) || preset.amount_cny < 0)) errors.push(`meta: frameset build preset ${preset.id} needs a non-negative amount_cny`);
      }
      if (buildAssumption.presets.filter((preset) => preset.default === true).length !== 1) errors.push('meta: frameset build presets need exactly one default');
      if (buildAssumption.presets.filter((preset) => preset.custom === true).length !== 1) errors.push('meta: frameset build presets need exactly one custom option');
      const selectedDefault = buildAssumption.presets.find((preset) => preset.default === true);
      if (selectedDefault?.amount_cny !== buildAssumption.amount_cny) errors.push('meta: default frameset build preset must match amount_cny');
    }
    if (!isDate(buildAssumption.reviewed_at)) errors.push('meta: invalid frameset_build_assumption.reviewed_at');
  }

  const brandIds = new Set(data.brands.map((x) => x.id));
  const platformIds = new Set(data.platforms.map((x) => x.id));
  const platformsById = new Map(data.platforms.map((x) => [x.id, x]));
  const variantIds = new Set(data.variants.map((x) => x.id));
  const sourceIds = new Set(data.sources.map((x) => x.id));
  const sourcesById = new Map(data.sources.map((x) => [x.id, x]));
  const variantsById = new Map(data.variants.map((x) => [x.id, x]));
  const candidateIds = new Set(data.candidates.map((x) => x.id));

  for (const preset of buildAssumption?.presets ?? []) {
    if (preset.source_id && !sourceIds.has(preset.source_id)) errors.push(`meta: frameset build preset ${preset.id} is missing source ${preset.source_id}`);
    if (preset.observed_at && !isDate(preset.observed_at)) errors.push(`meta: frameset build preset ${preset.id} has an invalid observed_at`);
  }

  for (const groupset of data.groupsets) {
    requireFields('groupset', groupset, [
      'maker', 'name', 'scope', 'use_case', 'status', 'positioning', 'variants', 'shifting',
      'architecture', 'brake_options', 'weight', 'battery', 'controls_and_app',
      'package_summary', 'compatibility', 'china_price_status', 'price_observations', 'caveats',
      'source_ids', 'reviewed_at'
    ]);
    if (!['established-benchmark', 'chinese-alternative'].includes(groupset.scope)) errors.push(`groupset ${groupset.id}: invalid scope`);
    for (const field of ['freehub', 'hanger', 'frame', 'brake_fluid']) {
      if (!groupset.compatibility?.[field]) errors.push(`groupset ${groupset.id}: missing compatibility.${field}`);
    }
    if (!isDate(groupset.reviewed_at)) errors.push(`groupset ${groupset.id}: invalid reviewed_at`);
    if (!Array.isArray(groupset.variants) || !groupset.variants.length) errors.push(`groupset ${groupset.id}: variants must not be empty`);
    if (!Array.isArray(groupset.brake_options) || !groupset.brake_options.length) errors.push(`groupset ${groupset.id}: brake_options must not be empty`);
    if (!Array.isArray(groupset.caveats) || !groupset.caveats.length) errors.push(`groupset ${groupset.id}: caveats must not be empty`);
    for (const sourceId of groupset.source_ids ?? []) {
      if (!sourceIds.has(sourceId)) errors.push(`groupset ${groupset.id}: missing source ${sourceId}`);
    }
    for (const observation of groupset.price_observations ?? []) {
      if (!Number.isFinite(observation.amount) || observation.amount <= 0) errors.push(`groupset ${groupset.id}: invalid price amount`);
      if (!isDate(observation.observed_at)) errors.push(`groupset ${groupset.id}: invalid price observation date`);
      if (!sourceIds.has(observation.source_id)) errors.push(`groupset ${groupset.id}: missing price source ${observation.source_id}`);
      if (observation.option_label_zh !== undefined && (typeof observation.option_label_zh !== 'string' || !observation.option_label_zh.trim())) errors.push(`groupset ${groupset.id}: invalid price option label`);
      if (observation.package_basis !== undefined && !['shift-only', 'shift-brake', 'electronics-only', 'partial-groupset', 'full-groupset', 'component', 'oem-takeoff'].includes(observation.package_basis)) errors.push(`groupset ${groupset.id}: invalid price package basis`);
      if (observation.checkout_verified !== undefined && typeof observation.checkout_verified !== 'boolean') errors.push(`groupset ${groupset.id}: checkout_verified must be boolean`);
    }
    if (groupset.image !== undefined) {
      const image = groupset.image;
      if (!isObject(image)) errors.push(`groupset ${groupset.id}: image must be an object`);
      else {
        for (const field of ['remote_url', 'source_id', 'subject_accuracy', 'credit', 'alt', 'reviewed_at']) {
          if (typeof image[field] !== 'string' || !image[field].trim()) errors.push(`groupset ${groupset.id}: missing image.${field}`);
        }
        try {
          const imageUrl = new URL(image.remote_url);
          if (imageUrl.protocol !== 'https:') errors.push(`groupset ${groupset.id}: image.remote_url must use HTTPS`);
        } catch {
          errors.push(`groupset ${groupset.id}: invalid image.remote_url`);
        }
        if (!sourceIds.has(image.source_id)) errors.push(`groupset ${groupset.id}: missing image source ${image.source_id}`);
        if (!groupset.source_ids.includes(image.source_id)) errors.push(`groupset ${groupset.id}: image source must be listed in source_ids`);
        if (!['exact-family', 'featured-variant'].includes(image.subject_accuracy)) errors.push(`groupset ${groupset.id}: invalid image.subject_accuracy`);
        if (image.subject_accuracy === 'featured-variant' && (typeof image.featured_variant !== 'string' || !image.featured_variant.trim())) errors.push(`groupset ${groupset.id}: featured image needs featured_variant`);
        if (!Number.isInteger(image.width) || image.width <= 0 || !Number.isInteger(image.height) || image.height <= 0) errors.push(`groupset ${groupset.id}: image needs positive integer dimensions`);
        if (typeof image.alt !== 'string' || image.alt.trim().length < 10) errors.push(`groupset ${groupset.id}: image.alt is too short`);
        if (!isDate(image.reviewed_at)) errors.push(`groupset ${groupset.id}: invalid image.reviewed_at`);
        if (!isObject(image.rights) || image.rights.status !== 'official-page-embed') errors.push(`groupset ${groupset.id}: image must use official-page-embed rights status`);
        for (const field of ['copyright_holder', 'usage_note']) {
          if (typeof image.rights?.[field] !== 'string' || !image.rights[field].trim()) errors.push(`groupset ${groupset.id}: missing image.rights.${field}`);
        }
      }
    }
  }
  const exclusionIds = new Set(data.exclusions.map((x) => x.id));
  const videoIds = new Set(data.videos.map((x) => x.id));
  const categorySet = new Set(supportedCategories);
  const isUnresolvedExactField = (value) => typeof value !== 'string'
    || !value.trim()
    || /\b(?:unknown|varies|variable|unspecified|not recorded)\b/i.test(value);

  errors.push(...validateResearchAttempts(data.researchAttempts, data));

  for (const brand of data.brands) {
    requireFields('brand', brand, ['name', 'manufacturing', 'china_support', 'last_reviewed']);
    if (!isObject(brand.manufacturing)) errors.push(`brand ${brand.id}: manufacturing must be an object`);
    if (!isDate(brand.last_reviewed)) errors.push(`brand ${brand.id}: invalid last_reviewed`);
  }

  for (const platform of data.platforms) {
    requireFields('platform', platform, ['brand_id', 'name', 'category', 'handlebar', 'frame', 'china_availability', 'source_ids', 'last_reviewed']);
    if (!brandIds.has(platform.brand_id)) errors.push(`platform ${platform.id}: missing brand ${platform.brand_id}`);
    if (!categorySet.has(platform.category)) errors.push(`platform ${platform.id}: unsupported category ${platform.category}`);
    if (!['drop', 'flat'].includes(platform.handlebar)) errors.push(`platform ${platform.id}: handlebar must be drop or flat`);
    if (!isDate(platform.last_reviewed)) errors.push(`platform ${platform.id}: invalid last_reviewed`);
    const requiresClearance = platform.category.startsWith('gravel') || ['adventure-gravel', 'all-road'].includes(platform.category);
    if (requiresClearance && !isObject(platform.tire_clearance)) errors.push(`platform ${platform.id}: gravel-family platform needs tire_clearance`);
    if (platform.tire_clearance !== undefined) {
      const clearance = platform.tire_clearance;
      if (!isObject(clearance) || !['pass', 'conditional', 'fail', 'unverified'].includes(clearance.eligibility)) errors.push(`platform ${platform.id}: invalid clearance eligibility`);
      const anyClearance = clearance.stock_nominal_mm ?? clearance.published_max_mm ?? clearance.published_front_max_mm ?? clearance.published_rear_max_mm;
      if (clearance.eligibility === 'pass' && anyClearance === undefined) errors.push(`platform ${platform.id}: pass without a clearance number`);
      for (const key of ['stock_nominal_mm', 'published_max_mm', 'published_front_max_mm', 'published_rear_max_mm']) {
        const value = clearance[key];
        if (value !== undefined && (typeof value !== 'number' || value <= 0 || value > 100)) errors.push(`platform ${platform.id}: invalid ${key}`);
      }
    }
    if (platform.category.startsWith('mtb-') && platform.handlebar !== 'flat') errors.push(`platform ${platform.id}: MTB platform must use a flat handlebar`);
    if (platform.category.startsWith('mtb-') && !isObject(platform.category_details?.suspension)) errors.push(`platform ${platform.id}: MTB platform needs category_details.suspension`);
    if (platform.category === 'e-road' && !isObject(platform.category_details?.motor)) errors.push(`platform ${platform.id}: e-road platform needs category_details.motor`);
    if (platform.category === 'folding' && !isObject(platform.category_details?.folding)) errors.push(`platform ${platform.id}: folding platform needs category_details.folding`);
    if (platform.category === 'triathlon' && typeof platform.category_details?.discipline !== 'string') errors.push(`platform ${platform.id}: triathlon platform needs category_details.discipline`);
    for (const sourceId of platform.source_ids ?? []) if (!sourceIds.has(sourceId)) errors.push(`platform ${platform.id}: missing source ${sourceId}`);
  }

  for (const variant of data.variants) {
    requireFields('variant', variant, ['platform_id', 'name', 'kind', 'editorial', 'source_ids']);
    if (!platformIds.has(variant.platform_id)) errors.push(`variant ${variant.id}: missing platform ${variant.platform_id}`);
    if (!['complete-bike', 'frameset'].includes(variant.kind)) errors.push(`variant ${variant.id}: invalid kind`);
    if (variant.kind === 'complete-bike') {
      if (!isObject(variant.drivetrain)) errors.push(`variant ${variant.id}: complete bike needs an exact drivetrain`);
      else {
        requireFields('drivetrain', { id: variant.id, ...variant.drivetrain }, ['brand', 'model', 'speeds', 'shifting', 'layout']);
        for (const field of ['brand', 'model', 'speeds', 'layout']) {
          if (isUnresolvedExactField(variant.drivetrain[field])) errors.push(`variant ${variant.id}: complete bike drivetrain ${field} must identify one exact build`);
        }
        if (!/^[12]x\d{1,2}$/.test(variant.drivetrain.speeds)) errors.push(`variant ${variant.id}: complete bike drivetrain speeds must use an exact chainring-by-cog count`);
        if (!['single', 'double'].includes(variant.drivetrain.layout)) errors.push(`variant ${variant.id}: complete bike drivetrain layout must be single or double`);
        if ((variant.drivetrain.layout === 'single') !== variant.drivetrain.speeds.startsWith('1x')) errors.push(`variant ${variant.id}: complete bike drivetrain layout must match its speed count`);
        if (!['mechanical', 'electronic', 'electronic-wireless'].includes(variant.drivetrain.shifting)) errors.push(`variant ${variant.id}: complete bike drivetrain shifting must identify one exact build`);
      }
    }
    if (variant.kind === 'frameset') {
      const platform = platformsById.get(variant.platform_id);
      if (platform && !supportsStandardFramesetBuild(platform.category)) errors.push(`variant ${variant.id}: fixed frameset build allowance is not approved for ${platform.category}`);
    }
    for (const key of ['claimed_complete_weight_g', 'claimed_frame_weight_g']) {
      if (variant[key] !== undefined && (typeof variant[key] !== 'number' || variant[key] <= 0)) {
        errors.push(`variant ${variant.id}: invalid ${key}`);
      }
    }
    const thresholds = variant.editorial?.price_thresholds_cny;
    if (thresholds && !(thresholds.great_buy_below <= thresholds.fair_buy_below && thresholds.fair_buy_below <= thresholds.not_compelling_above)) errors.push(`variant ${variant.id}: invalid threshold ordering`);
    for (const sourceId of variant.source_ids ?? []) if (!sourceIds.has(sourceId)) errors.push(`variant ${variant.id}: missing source ${sourceId}`);
  }

  for (const price of data.prices) {
    requireFields('price', price, ['variant_id', 'observed_at', 'price_type', 'currency', 'channel', 'status', 'conditions', 'source_ids']);
    if (!variantIds.has(price.variant_id)) errors.push(`price ${price.id}: missing variant ${price.variant_id}`);
    if (!isDate(price.observed_at)) errors.push(`price ${price.id}: invalid observed_at`);
    if (price.currency !== 'CNY') errors.push(`price ${price.id}: currency must be CNY`);
    if (price.amount_cny === undefined && price.low_cny === undefined) errors.push(`price ${price.id}: needs amount_cny or low_cny`);
    if (price.low_cny !== undefined && price.high_cny !== undefined && price.low_cny > price.high_cny) errors.push(`price ${price.id}: low_cny exceeds high_cny`);
    for (const key of ['amount_cny', 'low_cny', 'high_cny']) {
      if (price[key] !== undefined && (typeof price[key] !== 'number' || price[key] <= 0)) errors.push(`price ${price.id}: invalid ${key}`);
    }
    for (const sourceId of price.source_ids ?? []) if (!sourceIds.has(sourceId)) errors.push(`price ${price.id}: missing source ${sourceId}`);
  }

  for (const source of data.sources) {
    requireFields('source', source, ['type', 'title', 'publisher', 'accessed_at', 'reliability', 'notes']);
    if (!isDate(source.accessed_at)) errors.push(`source ${source.id}: invalid accessed_at`);
    if (source.url) {
      try { new URL(source.url); } catch { errors.push(`source ${source.id}: invalid URL`); }
    }
    if (source.type === 'marketplace-screenshot') {
      if (!isDate(source.observed_at)) errors.push(`source ${source.id}: invalid observed_at`);
      if (source.checkout_verified !== false) errors.push(`source ${source.id}: marketplace screenshot must remain checkout-unverified`);
      if (!Array.isArray(source.observations) || !source.observations.length) errors.push(`source ${source.id}: marketplace screenshot needs observations`);
      for (const observation of source.observations ?? []) {
        if (typeof observation.option_label_zh !== 'string' || !observation.option_label_zh.trim()) errors.push(`source ${source.id}: invalid option label`);
        if (!Number.isFinite(observation.amount_cny) || observation.amount_cny <= 0) errors.push(`source ${source.id}: invalid option amount`);
        if (!['shift-only', 'shift-brake', 'electronics-only', 'partial-groupset', 'full-groupset', 'component', 'oem-takeoff'].includes(observation.normalized_package)) errors.push(`source ${source.id}: invalid normalized package`);
        if (!['complete', 'truncated'].includes(observation.label_visibility)) errors.push(`source ${source.id}: invalid option-label visibility`);
      }
      if (source.adjacent_system !== undefined) {
        for (const field of ['name', 'discipline', 'headline_price', 'why_separate']) {
          if (typeof source.adjacent_system?.[field] !== 'string' || !source.adjacent_system[field].trim()) errors.push(`source ${source.id}: missing adjacent_system.${field}`);
        }
      }
    }
  }

  for (const candidate of data.candidates) {
    requireFields('candidate', candidate, ['name', 'why_interesting', 'missing', 'status', 'last_reviewed']);
    if (!Array.isArray(candidate.missing) || candidate.missing.length === 0) errors.push(`candidate ${candidate.id}: missing must be a non-empty array`);
    if (!isDate(candidate.last_reviewed)) errors.push(`candidate ${candidate.id}: invalid last_reviewed`);
    if (candidate.source_url !== undefined) {
      try {
        const sourceUrl = new URL(candidate.source_url);
        if (sourceUrl.protocol !== 'https:') errors.push(`candidate ${candidate.id}: source_url must use HTTPS`);
      } catch {
        errors.push(`candidate ${candidate.id}: invalid source_url`);
      }
    }
    if (candidate.category && !hasSupportedCategory(candidate.category, categorySet)) errors.push(`candidate ${candidate.id}: unsupported category ${candidate.category}`);
    if (candidate.source_snapshot_id && !sourceIds.has(candidate.source_snapshot_id)) errors.push(`candidate ${candidate.id}: missing source snapshot ${candidate.source_snapshot_id}`);
    for (const sourceId of candidate.source_ids ?? []) if (!sourceIds.has(sourceId)) errors.push(`candidate ${candidate.id}: missing source ${sourceId}`);
    if (candidate.catalog_distinct_reason !== undefined && (!candidate.existing_record_id || typeof candidate.catalog_distinct_reason !== 'string' || !candidate.catalog_distinct_reason.trim())) {
      errors.push(`candidate ${candidate.id}: catalog_distinct_reason requires an existing_record_id and a non-empty explanation`);
    }
    if (candidate.facts !== undefined) {
      if (!isObject(candidate.facts)) {
        errors.push(`candidate ${candidate.id}: facts must be an object`);
      } else {
        for (const key of ['drivetrain', 'brakes', 'frame', 'bottom_bracket', 'wheels', 'tires', 'cockpit', 'sizes', 'storage', 'mounts']) {
          if (candidate.facts[key] !== undefined && (typeof candidate.facts[key] !== 'string' || !candidate.facts[key].trim())) {
            errors.push(`candidate ${candidate.id}: invalid facts.${key}`);
          }
        }
        for (const key of ['complete_weight_g', 'frame_weight_g', 'tire_clearance_mm']) {
          if (candidate.facts[key] !== undefined && (typeof candidate.facts[key] !== 'number' || candidate.facts[key] <= 0)) {
            errors.push(`candidate ${candidate.id}: invalid facts.${key}`);
          }
        }
      }
    }
    for (const [priceKey, candidatePrice] of [['observed_price', candidate.observed_price], ['official_price', candidate.official_price]]) {
      if (candidatePrice === undefined) continue;
      if (!isObject(candidatePrice)) {
        errors.push(`candidate ${candidate.id}: ${priceKey} must be an object`);
        continue;
      }
      if (candidatePrice.currency !== 'CNY') errors.push(`candidate ${candidate.id}: ${priceKey} currency must be CNY`);
      if (!isDate(candidatePrice.observed_at)) errors.push(`candidate ${candidate.id}: ${priceKey} needs a valid observed_at`);
      if (candidatePrice.amount_cny === undefined && candidatePrice.low_cny === undefined) errors.push(`candidate ${candidate.id}: ${priceKey} needs amount_cny or low_cny`);
      for (const key of ['amount_cny', 'low_cny', 'high_cny']) {
        if (candidatePrice[key] !== undefined && (typeof candidatePrice[key] !== 'number' || candidatePrice[key] <= 0)) errors.push(`candidate ${candidate.id}: invalid ${priceKey}.${key}`);
      }
      if (candidatePrice.price_type === 'reference-conversion') {
        if (priceKey !== 'official_price') errors.push(`candidate ${candidate.id}: reference conversion must use official_price`);
        if (typeof candidatePrice.original_amount !== 'number' || candidatePrice.original_amount <= 0) errors.push(`candidate ${candidate.id}: reference conversion needs original_amount`);
        if (typeof candidatePrice.original_currency !== 'string' || !candidatePrice.original_currency.trim() || candidatePrice.original_currency === 'CNY') errors.push(`candidate ${candidate.id}: reference conversion needs a foreign original_currency`);
        if (typeof candidatePrice.conversion_rate_cny_per_original_unit !== 'number' || candidatePrice.conversion_rate_cny_per_original_unit <= 0) errors.push(`candidate ${candidate.id}: reference conversion needs a positive rate`);
        if (!isDate(candidatePrice.conversion_rate_date)) errors.push(`candidate ${candidate.id}: reference conversion needs conversion_rate_date`);
      }
    }
    for (const videoId of candidate.video_ids ?? []) {
      const video = data.videos.find((item) => item.id === videoId);
      if (!videoIds.has(videoId)) errors.push(`candidate ${candidate.id}: missing video ${videoId}`);
      else if (video?.target?.candidate_id !== candidate.id) errors.push(`candidate ${candidate.id}: video ${videoId} targets another record`);
    }
  }

  for (const exclusion of data.exclusions) {
    requireFields('exclusion', exclusion, ['name', 'reason', 'review_again_when', 'last_reviewed']);
    if (!isDate(exclusion.last_reviewed)) errors.push(`exclusion ${exclusion.id}: invalid last_reviewed`);
    if (exclusion.category && !hasSupportedCategory(exclusion.category, categorySet)) errors.push(`exclusion ${exclusion.id}: unsupported category ${exclusion.category}`);
    if (exclusion.source_snapshot_id && !sourceIds.has(exclusion.source_snapshot_id)) errors.push(`exclusion ${exclusion.id}: missing source snapshot ${exclusion.source_snapshot_id}`);
  }

  const dispositionIds = new Set([...variantIds, ...candidateIds, ...exclusionIds]);
  for (const snapshot of data.research) {
    requireFields('research', snapshot, ['source_id', 'observed_at', 'screenshot_count', 'listing_observation_count', 'model_group_count', 'group_dispositions']);
    if (!isDate(snapshot.observed_at)) errors.push(`research ${snapshot.id}: invalid observed_at`);
    if (!sourceIds.has(snapshot.source_id)) errors.push(`research ${snapshot.id}: missing source ${snapshot.source_id}`);
    if (snapshot.model_group_count !== snapshot.group_dispositions.length) errors.push(`research ${snapshot.id}: model_group_count does not match group_dispositions`);
    const groupIds = new Set();
    for (const group of snapshot.group_dispositions) {
      if (!isId(group.model_id)) errors.push(`research ${snapshot.id}: invalid model_id ${group.model_id}`);
      if (groupIds.has(group.model_id)) errors.push(`research ${snapshot.id}: duplicate model_id ${group.model_id}`);
      groupIds.add(group.model_id);
      if (!hasSupportedCategory(group.category, categorySet)) errors.push(`research ${snapshot.id}: unsupported category ${group.category}`);
      if (!['publish_now', 'verify_before_publish', 'research_queue', 'exclude', 'split_variants_before_publish'].includes(group.dashboard_status)) errors.push(`research ${snapshot.id}: invalid dashboard status ${group.dashboard_status}`);
      const disposition = group.disposition;
      if (!isObject(disposition) || !['published-variant', 'candidate', 'exclusion'].includes(disposition.disposition)) errors.push(`research ${snapshot.id}: invalid disposition for ${group.model_id}`);
      else if (!dispositionIds.has(disposition.record_id)) errors.push(`research ${snapshot.id}: missing disposition record ${disposition.record_id}`);
      if (group.dashboard_status === 'exclude' && disposition?.disposition !== 'exclusion') errors.push(`research ${snapshot.id}: excluded group ${group.model_id} is not an exclusion`);
      if (['verify_before_publish', 'research_queue'].includes(group.dashboard_status) && disposition?.disposition !== 'candidate') errors.push(`research ${snapshot.id}: unresolved group ${group.model_id} must remain a candidate`);
    }
    if (snapshot.priority_additions?.length !== 35) errors.push(`research ${snapshot.id}: expected 35 priority additions`);
    if (snapshot.titanium_additions?.length !== 13) errors.push(`research ${snapshot.id}: expected 13 titanium additions`);
    if (snapshot.missing_china_price_targets?.length !== 35) errors.push(`research ${snapshot.id}: expected 35 missing-price targets`);
  }

  const accuracyValues = new Set(['exact-variant', 'exact-platform', 'same-platform', 'same-model-different-color', 'same-model-different-market-build', 'illustrative']);
  const mediaValues = new Set(['official-product-photo', 'retailer-product-photo', 'community-post-photo', 'project-placeholder']);
  const rightsValues = new Set(['project-owned', 'contributor-owned', 'permission-granted', 'brand-media-license', 'cc-licensed', 'public-domain', 'official-page-embed', 'retailer-page-embed', 'public-post-embed', 'public-post-quotation']);
  for (const image of data.images) {
    requireFields('image', image, ['role', 'subject_accuracy', 'media_type', 'hosting', 'source_id', 'rights', 'credit', 'alt', 'reviewed_at']);
    const targetKeys = ['platform_id', 'candidate_id'].filter((key) => image[key] !== undefined);
    if (targetKeys.length !== 1) errors.push(`image ${image.id}: target must identify exactly one platform or candidate`);
    if (image.platform_id !== undefined && !platformIds.has(image.platform_id)) errors.push(`image ${image.id}: missing platform ${image.platform_id}`);
    if (image.candidate_id !== undefined && !candidateIds.has(image.candidate_id)) errors.push(`image ${image.id}: missing candidate ${image.candidate_id}`);
    if (!['primary', 'gallery'].includes(image.role)) errors.push(`image ${image.id}: unsupported role ${image.role}`);
    if (image.buyer_visibility !== undefined && !['show', 'omit'].includes(image.buyer_visibility)) errors.push(`image ${image.id}: invalid buyer_visibility`);
    if (image.role === 'gallery' && image.candidate_id === undefined) errors.push(`image ${image.id}: gallery images currently require a candidate target`);
    if (!accuracyValues.has(image.subject_accuracy)) errors.push(`image ${image.id}: invalid subject_accuracy`);
    if (!mediaValues.has(image.media_type)) errors.push(`image ${image.id}: invalid media_type`);
    if (!isDate(image.reviewed_at)) errors.push(`image ${image.id}: invalid reviewed_at`);
    if (!sourceIds.has(image.source_id)) errors.push(`image ${image.id}: missing source ${image.source_id}`);
    if (!isObject(image.rights) || !rightsValues.has(image.rights?.status)) errors.push(`image ${image.id}: invalid rights status`);
    if (typeof image.alt !== 'string' || image.alt.trim().length < 10) errors.push(`image ${image.id}: alt text is too short`);
    if (typeof image.credit !== 'string' || image.credit.trim().length < 3) errors.push(`image ${image.id}: credit is required`);
    for (const variantId of image.variant_ids ?? []) {
      const variant = variantsById.get(variantId);
      if (!variant) errors.push(`image ${image.id}: missing variant ${variantId}`);
      else if (variant.platform_id !== image.platform_id) errors.push(`image ${image.id}: variant ${variantId} belongs to another platform`);
    }
    if (image.candidate_id !== undefined && image.variant_ids?.length) errors.push(`image ${image.id}: candidate image cannot target variants`);
    const mode = image.hosting?.mode;
    if (mode === 'remote') {
      if (!['official-page-embed', 'retailer-page-embed', 'public-post-embed', 'public-post-quotation', 'permission-granted', 'brand-media-license', 'cc-licensed', 'public-domain'].includes(image.rights?.status)) errors.push(`image ${image.id}: remote image has incompatible rights status`);
      try {
        const parsed = new URL(image.hosting.remote_url);
        if (parsed.protocol !== 'https:') errors.push(`image ${image.id}: remote URL must use HTTPS`);
      } catch { errors.push(`image ${image.id}: invalid remote URL`); }
      if (image.rights?.status === 'public-post-quotation') {
        const variants = image.hosting?.variants;
        if (!Array.isArray(variants) || variants.length !== 2) {
          errors.push(`image ${image.id}: public-post quotation needs card and detail variants`);
        } else {
          const purposes = new Set();
          for (const variant of variants) {
            purposes.add(variant?.purpose);
            const byteLimit = variant?.purpose === 'card' ? 40_000 : variant?.purpose === 'detail' ? 88_000 : 0;
            const widthLimit = variant?.purpose === 'card' ? 480 : variant?.purpose === 'detail' ? 1200 : 0;
            if (!byteLimit) errors.push(`image ${image.id}: invalid media variant purpose`);
            if (!Number.isInteger(variant?.bytes) || variant.bytes < 1 || variant.bytes > byteLimit) errors.push(`image ${image.id}: ${variant?.purpose ?? 'unknown'} variant exceeds its byte budget`);
            if (!Number.isInteger(variant?.width) || variant.width < 1 || variant.width > widthLimit) errors.push(`image ${image.id}: ${variant?.purpose ?? 'unknown'} variant has invalid width`);
            if (!Number.isInteger(variant?.height) || variant.height < 1 || variant.height > 2400) errors.push(`image ${image.id}: ${variant?.purpose ?? 'unknown'} variant has invalid height`);
            if (variant?.format !== 'image/webp') errors.push(`image ${image.id}: quotation variants must be WebP`);
            if (!/^[a-f0-9]{64}$/.test(variant?.sha256 ?? '')) errors.push(`image ${image.id}: quotation variant needs a SHA-256 digest`);
            try {
              const parsed = new URL(variant?.url);
              if (parsed.protocol !== 'https:' || parsed.hostname !== 'china-bike-media.161-97-123-19.sslip.io') errors.push(`image ${image.id}: quotation variant must use the approved media origin`);
              if (!/^\/media\/xhs\/[a-z0-9][a-z0-9-]*\/[a-f0-9]{16}-(?:card|detail)-w\d+\.webp$/.test(parsed.pathname)) errors.push(`image ${image.id}: quotation variant URL is not immutable`);
            } catch { errors.push(`image ${image.id}: invalid quotation variant URL`); }
          }
          if (purposes.size !== 2 || !purposes.has('card') || !purposes.has('detail')) errors.push(`image ${image.id}: public-post quotation needs one card and one detail variant`);
          const detail = variants.find((variant) => variant.purpose === 'detail');
          if (detail && image.hosting.remote_url !== detail.url) errors.push(`image ${image.id}: remote_url must be the detail variant`);
        }
        const quotation = image.editorial_quotation;
        if (quotation?.purpose !== 'editorial-identification-and-commentary'
          || quotation?.scope !== 'one-compressed-public-post-photo'
          || quotation?.source_link_required !== true
          || quotation?.no_license_asserted !== true) errors.push(`image ${image.id}: incomplete editorial quotation record`);
        try {
          const route = new URL(quotation?.removal_route);
          if (route.protocol !== 'https:') errors.push(`image ${image.id}: removal route must use HTTPS`);
        } catch { errors.push(`image ${image.id}: invalid removal route`); }
        const privacy = image.privacy_review;
        if (!isDate(privacy?.reviewed_at)
          || privacy?.embedded_metadata !== 'stripped'
          || privacy?.faces !== 'none-visible'
          || privacy?.vehicle_registration !== 'none-visible'
          || privacy?.account_identifiers !== 'none-visible'
          || privacy?.location_identifiers !== 'none-visible') errors.push(`image ${image.id}: incomplete privacy review`);
        const source = sourcesById.get(image.source_id);
        if (image.media_type !== 'community-post-photo' || !/^https:\/\/www\.xiaohongshu\.com\/explore\/[a-f0-9]{24}$/.test(source?.url ?? '')) {
          errors.push(`image ${image.id}: public-post quotation needs an exact public XHS source`);
        }
      }
    } else if (mode === 'local') {
      const localPath = image.hosting?.local_path;
      if (typeof localPath !== 'string' || !localPath.startsWith('/assets/images/')) errors.push(`image ${image.id}: invalid local_path`);
      else if (!fs.existsSync(path.join(root, localPath.replace(/^\//, '')))) errors.push(`image ${image.id}: missing local asset ${localPath}`);
      if (['official-page-embed', 'retailer-page-embed', 'public-post-embed', 'public-post-quotation'].includes(image.rights?.status)) errors.push(`image ${image.id}: third-party remote image cannot be stored locally`);
    } else errors.push(`image ${image.id}: hosting mode must be remote or local`);
  }

  for (const platform of data.platforms) {
    if (!data.images.some((image) => image.platform_id === platform.id && image.role === 'primary')) errors.push(`platform ${platform.id}: no primary visual`);
  }

  const youtubeIds = new Set();
  const platformVideoCounts = new Map();
  const videoFormats = new Set(['hands-on-review', 'long-term-review', 'model-overview', 'build-and-ride']);
  const videoRelationships = new Set(['retailer-linked', 'product-supplied', 'publication-review', 'owner-review']);
  for (const video of data.videos) {
    requireFields('video', video, [
      'provider', 'youtube_video_id', 'title', 'channel_name', 'channel_url', 'url', 'language',
      'accessed_at', 'target', 'match', 'format', 'relationship', 'disclosure', 'disclosure_url', 'summary'
    ]);
    if (video.provider !== 'youtube') errors.push(`video ${video.id}: unsupported provider ${video.provider}`);
    if (typeof video.youtube_video_id !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(video.youtube_video_id)) errors.push(`video ${video.id}: invalid YouTube video ID`);
    if (youtubeIds.has(video.youtube_video_id)) errors.push(`video ${video.id}: duplicate YouTube video ID ${video.youtube_video_id}`);
    youtubeIds.add(video.youtube_video_id);
    const expectedUrl = `https://www.youtube.com/watch?v=${video.youtube_video_id}`;
    if (video.url !== expectedUrl) errors.push(`video ${video.id}: URL must match its YouTube video ID`);
    try {
      const channel = new URL(video.channel_url);
      if (channel.protocol !== 'https:' || !['www.youtube.com', 'youtube.com'].includes(channel.hostname)) errors.push(`video ${video.id}: invalid YouTube channel URL`);
    } catch { errors.push(`video ${video.id}: invalid channel URL`); }
    if (!isDate(video.accessed_at)) errors.push(`video ${video.id}: invalid accessed_at`);
    if (video.published_at !== undefined && !isDate(video.published_at)) errors.push(`video ${video.id}: invalid published_at`);
    if (!videoFormats.has(video.format)) errors.push(`video ${video.id}: invalid format`);
    if (!videoRelationships.has(video.relationship)) errors.push(`video ${video.id}: invalid relationship`);
    if (typeof video.summary !== 'string' || video.summary.trim().length < 30) errors.push(`video ${video.id}: summary is too short`);
    if (typeof video.disclosure !== 'string' || video.disclosure.trim().length < 20) errors.push(`video ${video.id}: disclosure is too short`);
    try {
      const disclosureUrl = new URL(video.disclosure_url);
      if (disclosureUrl.protocol !== 'https:') errors.push(`video ${video.id}: disclosure URL must use HTTPS`);
    } catch { errors.push(`video ${video.id}: invalid disclosure URL`); }

    const target = isObject(video.target) ? video.target : {};
    const targetKeys = ['platform_id', 'variant_id', 'candidate_id'].filter((key) => target[key] !== undefined);
    if (targetKeys.length !== 1) errors.push(`video ${video.id}: target must identify exactly one platform, variant, or candidate`);
    if (target.platform_id !== undefined) {
      if (!platformIds.has(target.platform_id)) errors.push(`video ${video.id}: missing platform ${target.platform_id}`);
      if (video.match !== 'exact-platform') errors.push(`video ${video.id}: platform target must use exact-platform match`);
      platformVideoCounts.set(target.platform_id, (platformVideoCounts.get(target.platform_id) ?? 0) + 1);
    }
    if (target.variant_id !== undefined) {
      if (!variantIds.has(target.variant_id)) errors.push(`video ${video.id}: missing variant ${target.variant_id}`);
      if (video.match !== 'exact-variant') errors.push(`video ${video.id}: variant target must use exact-variant match`);
    }
    if (target.candidate_id !== undefined) {
      if (!candidateIds.has(target.candidate_id)) errors.push(`video ${video.id}: missing candidate ${target.candidate_id}`);
      if (video.match !== 'exact-model-lead') errors.push(`video ${video.id}: candidate target must use exact-model-lead match`);
    }
  }
  for (const [platformId, count] of platformVideoCounts) {
    if (count > 2) errors.push(`platform ${platformId}: more than two curated videos`);
  }

  for (const recommendation of data.recommendations) if (!variantIds.has(recommendation.variant_id)) errors.push(`recommendation ${recommendation.id}: missing variant ${recommendation.variant_id}`);
  for (const variant of data.variants) if (!data.prices.some((price) => price.variant_id === variant.id)) errors.push(`variant ${variant.id}: no price record`);
  return errors;
}

function choosePrimaryImage(images, variantId) {
  return images.find((image) => image.role === 'primary' && image.variant_ids?.includes(variantId))
    ?? images.find((image) => image.role === 'primary' && !(image.variant_ids?.length))
    ?? images.find((image) => image.role === 'primary')
    ?? null;
}

export function priceBounds(price) {
  if (!price) return [undefined, undefined];
  const low = price.amount_cny ?? price.low_cny;
  const high = price.amount_cny ?? price.high_cny ?? price.low_cny;
  return [low, high];
}

export function framesetBuildAssumption(data = loadDataset()) {
  return data.meta.frameset_build_assumption;
}

export function allInPriceFor(variant, price, data = loadDataset()) {
  const [rawLow, rawHigh] = priceBounds(price);
  if (rawLow === undefined) {
    return {
      estimated: variant.kind === 'frameset',
      low: undefined,
      high: undefined,
      midpoint: Number.POSITIVE_INFINITY,
      buildAmount: variant.kind === 'frameset' ? framesetBuildAssumption(data).amount_cny : 0,
      frameLow: rawLow,
      frameHigh: rawHigh
    };
  }
  const buildAmount = variant.kind === 'frameset' ? framesetBuildAssumption(data).amount_cny : 0;
  const low = rawLow + buildAmount;
  const high = (rawHigh ?? rawLow) + buildAmount;
  return {
    estimated: variant.kind === 'frameset',
    low,
    high,
    midpoint: Math.round((low + high) / 2),
    buildAmount,
    frameLow: rawLow,
    frameHigh: rawHigh ?? rawLow
  };
}

export function joinProducts(data = loadDataset()) {
  const brands = new Map(data.brands.map((item) => [item.id, item]));
  const platforms = new Map(data.platforms.map((item) => [item.id, item]));
  const sources = new Map(data.sources.map((item) => [item.id, item]));
  return data.variants.map((variant) => {
    const platform = platforms.get(variant.platform_id);
    if (!platform) throw new Error(`Missing platform ${variant.platform_id}`);
    const brand = brands.get(platform.brand_id);
    if (!brand) throw new Error(`Missing brand ${platform.brand_id}`);
    const prices = data.prices.filter((price) => price.variant_id === variant.id).sort((a, b) => b.observed_at.localeCompare(a.observed_at));
    const latestPrice = prices[0];
    const platformImages = data.images.filter((image) => image.platform_id === platform.id);
    const selectedImage = choosePrimaryImage(platformImages, variant.id);
    const image = selectedImage ? {
      ...selectedImage,
      display_accuracy: selectedImage.subject_accuracy === 'illustrative'
        ? 'illustrative'
        : selectedImage.variant_ids?.includes(variant.id)
          ? selectedImage.subject_accuracy
          : 'same-platform'
    } : null;
    const sourceIds = new Set([
      ...(variant.source_ids ?? []),
      ...(platform.source_ids ?? []),
      ...prices.flatMap((price) => price.source_ids ?? []),
      ...(image?.source_id ? [image.source_id] : [])
    ]);
    const videos = data.videos
      .filter((video) => video.target?.platform_id === platform.id || video.target?.variant_id === variant.id)
      .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? '') || a.title.localeCompare(b.title));
    return {
      variant,
      platform,
      brand,
      prices,
      latestPrice,
      allInPrice: allInPriceFor(variant, latestPrice, data),
      image,
      imageSource: image ? sources.get(image.source_id) ?? null : null,
      videos,
      sources: [...sourceIds].map((id) => sources.get(id)).filter(Boolean)
    };
  }).sort((a, b) => a.allInPrice.midpoint - b.allInPrice.midpoint);
}

function candidateBrand(candidate, brands) {
  const identity = `${candidate.model_id ?? ''} ${candidate.id ?? ''}`.toLowerCase();
  const candidateName = String(candidate.name ?? '').trim();
  const name = candidateName.toLowerCase();
  const publishedBrand = brands
    .slice()
    .sort((a, b) => b.id.length - a.id.length)
    .find((brand) => {
      const idPattern = new RegExp(`(^|-)${brand.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(-|$)`);
      if (idPattern.test(identity.replaceAll(' ', '-'))) return true;
      const labels = [brand.name, brand.name_zh].filter(Boolean).map((value) => String(value).toLowerCase());
      return labels.some((label) => name === label || name.startsWith(`${label} `) || name.startsWith(`${label} /`));
    });
  if (publishedBrand) return publishedBrand;

  if (!candidateName || /^generic custom seller\b/i.test(candidateName)) return null;
  const multiwordPrefixes = [
    'DE ROSA',
    'Flying Pigeon',
    'Giant',
    'Hi-Light',
    'MY WAY',
    'Quick Pro',
    'ROLLING STONE',
    'TSB / Titan Super Bond',
    'Van Rysel',
    'WEST BIKING',
    'X-TREME / 美涵达',
    '轻鲨 QingSha'
  ];
  const displayName = multiwordPrefixes.find((prefix) => name === prefix.toLowerCase() || name.startsWith(`${prefix.toLowerCase()} `))
    ?? candidateName.split(/\s+/)[0];
  const id = displayName
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return id ? { id: `candidate-brand-${id}`, name: displayName } : null;
}

/**
 * Candidate records stay distinct from publication-ready variants, but useful
 * candidates can share the catalog surface. Records pointing at an existing
 * published variant are omitted so one physical configuration never appears
 * twice. A materially distinct configuration can remain visible only when its
 * data record explains the split explicitly.
 */
export function joinCatalogCandidates(data = loadDataset()) {
  const sources = new Map(data.sources.map((item) => [item.id, item]));
  return data.candidates
    .filter((candidate) => !candidate.existing_record_id || candidate.catalog_distinct_reason)
    .map((candidate) => {
      const categories = categoryValues(candidate.category);
      const observedPrice = candidate.observed_price ?? null;
      const officialPrice = candidate.official_price ?? null;
      const price = [observedPrice, officialPrice]
        .filter(Boolean)
        .sort((a, b) => String(b.observed_at ?? '').localeCompare(String(a.observed_at ?? '')))[0] ?? null;
      const priceKind = price === observedPrice ? 'observed' : price === officialPrice ? 'official' : '';
      const sourceIds = candidate.source_ids ?? [];
      const candidateSources = sourceIds.map((id) => sources.get(id)).filter(Boolean);
      const source = candidateSources.find((item) => item?.url) ?? null;
      const candidateImages = data.images.filter((item) => item.candidate_id === candidate.id);
      const image = candidateImages.find((item) => item.role === 'primary') ?? null;
      const galleryImages = candidateImages
        .filter((item) => item.role === 'gallery')
        .sort((a, b) => (a.sort_order ?? Number.POSITIVE_INFINITY) - (b.sort_order ?? Number.POSITIVE_INFINITY) || a.id.localeCompare(b.id))
        .map((item) => ({ ...item, source: sources.get(item.source_id) ?? null }));
      const priority = candidate.research_priority;
      const hasIdentifiableModel = !['research-queue', 'needs-exact-model'].includes(candidate.status) &&
        !/model unclear|title mismatch|generic custom seller|current gravel frame|carbon .*bike|custom carbon|road platform/i.test(candidate.name);
      return {
        id: `candidate-${candidate.id}`,
        candidate,
        brand: candidateBrand(candidate, data.brands),
        categories,
        category: categories[0] ?? '',
        kind: ['complete-bike', 'frameset'].includes(candidate.type) ? candidate.type : '',
        price,
        priceKind,
        priceMidpoint: priceMidpoint(price) ?? Number.POSITIVE_INFINITY,
        source,
        sources: candidateSources,
        image,
        imageSource: image ? sources.get(image.source_id) ?? null : null,
        galleryImages,
        defaultVisible: Boolean(
          officialPrice ||
          (observedPrice && hasIdentifiableModel) ||
          priority === 'high' ||
          priority === 'medium' ||
          sourceIds.length >= 2
        )
      };
    })
    .sort((a, b) => a.priceMidpoint - b.priceMidpoint || a.candidate.name.localeCompare(b.candidate.name));
}

export function priceSortValue(price) { return price?.amount_cny ?? price?.low_cny ?? Number.POSITIVE_INFINITY; }
export function priceMidpoint(price) {
  if (!price) return undefined;
  if (price.amount_cny !== undefined) return price.amount_cny;
  if (price.low_cny !== undefined && price.high_cny !== undefined) return Math.round((price.low_cny + price.high_cny) / 2);
  return price.low_cny;
}
export function formatCny(value) { return value === undefined ? 'Price unknown' : `¥${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`; }
export function formatRange(low, high, { estimated = false } = {}) {
  if (low === undefined) return 'Price not verified';
  const prefix = estimated ? 'Est. ' : '';
  if (high === undefined || high === low) return `${prefix}${formatCny(low)}`;
  const number = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
  return `${prefix}¥${number(low)}–${number(high)}`;
}
export function formatPrice(price) {
  const [low, high] = priceBounds(price);
  return formatRange(low, high);
}
export function formatAllInPrice(product) {
  return formatRange(product.allInPrice.low, product.allInPrice.high, { estimated: product.allInPrice.estimated });
}
export function maxClearance(platform) {
  const c = platform.tire_clearance;
  if (!c) return undefined;
  return c.published_max_mm ?? c.published_rear_max_mm ?? c.stock_nominal_mm;
}
export function clearanceLabel(platform) {
  const c = platform.tire_clearance;
  if (!c) return 'Not applicable';
  if (c.published_front_max_mm && c.published_rear_max_mm) return `${c.published_front_max_mm}/${c.published_rear_max_mm} mm`;
  if (c.published_max_mm) return `${c.published_max_mm} mm`;
  if (c.stock_nominal_mm) return `${c.stock_nominal_mm} mm`;
  return 'Unverified';
}
export function clearanceLongLabel(platform) {
  const c = platform.tire_clearance;
  if (!c) return 'Not recorded for this category';
  if (c.published_front_max_mm && c.published_rear_max_mm) return `${c.published_front_max_mm} mm front / ${c.published_rear_max_mm} mm rear`;
  if (c.published_max_mm) return `Up to ${c.published_max_mm} mm`;
  if (c.stock_nominal_mm) return `${c.stock_nominal_mm} mm stock; maximum unverified`;
  return 'Unverified';
}
export function freshness(observedAt, now = new Date()) {
  if (!observedAt) return { label: 'No price date', key: 'unknown' };
  const observed = new Date(`${observedAt}T00:00:00Z`);
  const days = Math.max(0, Math.floor((now.getTime() - observed.getTime()) / 86_400_000));
  if (days <= 30) return { label: 'Current', key: 'current', days };
  if (days <= 90) return { label: 'Recent', key: 'recent', days };
  if (days <= 180) return { label: 'Historical', key: 'historical', days };
  return { label: 'Old', key: 'old', days };
}
