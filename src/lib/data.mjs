import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

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
    buildProfiles: loadDirectory('build-profiles'),
    recommendations: loadDirectory('recommendations'),
    candidates: loadDirectory('candidates'),
    exclusions: loadDirectory('exclusions')
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

export function validateDataset(data = loadDataset()) {
  const errors = [];
  const requireFields = (kind, record, fields) => {
    for (const field of fields) if (record[field] === undefined || record[field] === null || record[field] === '') errors.push(`${kind} ${record.id ?? '(missing id)'}: missing ${field}`);
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
    brand:data.brands, platform:data.platforms, variant:data.variants, price:data.prices,
    source:data.sources, buildProfile:data.buildProfiles, recommendation:data.recommendations,
    candidate:data.candidates, exclusion:data.exclusions
  })) unique(kind, records);

  const brandIds = new Set(data.brands.map((x) => x.id));
  const platformIds = new Set(data.platforms.map((x) => x.id));
  const variantIds = new Set(data.variants.map((x) => x.id));
  const sourceIds = new Set(data.sources.map((x) => x.id));

  for (const brand of data.brands) {
    requireFields('brand', brand, ['name','manufacturing','china_support','last_reviewed']);
    if (!isObject(brand.manufacturing)) errors.push(`brand ${brand.id}: manufacturing must be an object`);
    if (!isDate(brand.last_reviewed)) errors.push(`brand ${brand.id}: invalid last_reviewed`);
  }
  for (const platform of data.platforms) {
    requireFields('platform', platform, ['brand_id','name','category','handlebar','frame','tire_clearance','source_ids','last_reviewed']);
    if (!brandIds.has(platform.brand_id)) errors.push(`platform ${platform.id}: missing brand ${platform.brand_id}`);
    if (!['drop','flat'].includes(platform.handlebar)) errors.push(`platform ${platform.id}: handlebar must be drop or flat`);
    if (!isDate(platform.last_reviewed)) errors.push(`platform ${platform.id}: invalid last_reviewed`);
    const clearance = platform.tire_clearance ?? {};
    if (!['pass','conditional','fail','unverified'].includes(clearance.eligibility)) errors.push(`platform ${platform.id}: invalid clearance eligibility`);
    const anyClearance = clearance.stock_nominal_mm ?? clearance.published_max_mm ?? clearance.published_front_max_mm ?? clearance.published_rear_max_mm;
    if (clearance.eligibility === 'pass' && anyClearance === undefined) errors.push(`platform ${platform.id}: pass without a clearance number`);
    for (const key of ['stock_nominal_mm','published_max_mm','published_front_max_mm','published_rear_max_mm']) {
      const value = clearance[key];
      if (value !== undefined && (typeof value !== 'number' || value <= 0 || value > 100)) errors.push(`platform ${platform.id}: invalid ${key}`);
    }
    for (const sourceId of platform.source_ids ?? []) if (!sourceIds.has(sourceId)) errors.push(`platform ${platform.id}: missing source ${sourceId}`);
  }
  for (const variant of data.variants) {
    requireFields('variant', variant, ['platform_id','name','kind','editorial','source_ids']);
    if (!platformIds.has(variant.platform_id)) errors.push(`variant ${variant.id}: missing platform ${variant.platform_id}`);
    if (!['complete-bike','frameset'].includes(variant.kind)) errors.push(`variant ${variant.id}: invalid kind`);
    const thresholds = variant.editorial?.price_thresholds_cny;
    if (thresholds && !(thresholds.great_buy_below <= thresholds.fair_buy_below && thresholds.fair_buy_below <= thresholds.not_compelling_above)) errors.push(`variant ${variant.id}: invalid threshold ordering`);
    for (const sourceId of variant.source_ids ?? []) if (!sourceIds.has(sourceId)) errors.push(`variant ${variant.id}: missing source ${sourceId}`);
  }
  for (const price of data.prices) {
    requireFields('price', price, ['variant_id','observed_at','price_type','currency','source_ids']);
    if (!variantIds.has(price.variant_id)) errors.push(`price ${price.id}: missing variant ${price.variant_id}`);
    if (!isDate(price.observed_at)) errors.push(`price ${price.id}: invalid observed_at`);
    if (price.currency !== 'CNY') errors.push(`price ${price.id}: currency must be CNY`);
    if (price.amount_cny === undefined && price.low_cny === undefined) errors.push(`price ${price.id}: needs amount_cny or low_cny`);
    if (price.low_cny !== undefined && price.high_cny !== undefined && price.low_cny > price.high_cny) errors.push(`price ${price.id}: low_cny exceeds high_cny`);
    for (const key of ['amount_cny','low_cny','high_cny']) if (price[key] !== undefined && (typeof price[key] !== 'number' || price[key] <= 0)) errors.push(`price ${price.id}: invalid ${key}`);
    for (const sourceId of price.source_ids ?? []) if (!sourceIds.has(sourceId)) errors.push(`price ${price.id}: missing source ${sourceId}`);
  }
  for (const source of data.sources) {
    requireFields('source', source, ['type','title','publisher','accessed_at','reliability','notes']);
    if (!isDate(source.accessed_at)) errors.push(`source ${source.id}: invalid accessed_at`);
    if (source.url) { try { new URL(source.url); } catch { errors.push(`source ${source.id}: invalid URL`); } }
  }
  for (const recommendation of data.recommendations) if (!variantIds.has(recommendation.variant_id)) errors.push(`recommendation ${recommendation.id}: missing variant ${recommendation.variant_id}`);
  for (const profile of data.buildProfiles) {
    requireFields('build profile', profile, ['name','parts','last_reviewed']);
    for (const [part, range] of Object.entries(profile.parts ?? {})) if (!Array.isArray(range) || range.length !== 2 || range.some((x) => typeof x !== 'number' || x < 0) || range[0] > range[1]) errors.push(`build profile ${profile.id}: invalid range for ${part}`);
  }
  for (const variant of data.variants) if (!data.prices.some((price) => price.variant_id === variant.id)) errors.push(`variant ${variant.id}: no price record`);
  return errors;
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
    const prices = data.prices.filter((price) => price.variant_id === variant.id).sort((a,b) => b.observed_at.localeCompare(a.observed_at));
    const sourceIds = new Set([...(variant.source_ids ?? []), ...(platform.source_ids ?? []), ...prices.flatMap((price) => price.source_ids ?? [])]);
    return { variant, platform, brand, prices, latestPrice:prices[0], sources:[...sourceIds].map((id) => sources.get(id)).filter(Boolean) };
  }).sort((a,b) => priceSortValue(a.latestPrice) - priceSortValue(b.latestPrice));
}

export function priceSortValue(price) { return price?.amount_cny ?? price?.low_cny ?? Number.POSITIVE_INFINITY; }
export function priceMidpoint(price) {
  if (!price) return undefined;
  if (price.amount_cny !== undefined) return price.amount_cny;
  if (price.low_cny !== undefined && price.high_cny !== undefined) return Math.round((price.low_cny + price.high_cny) / 2);
  return price.low_cny;
}
export function formatCny(value) { return value === undefined ? 'Price unknown' : `¥${new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(value)}`; }
export function formatPrice(price) {
  if (!price) return 'Price not verified';
  if (price.amount_cny !== undefined) return formatCny(price.amount_cny);
  if (price.low_cny !== undefined && price.high_cny !== undefined) return `${formatCny(price.low_cny)}–${formatCny(price.high_cny)}`;
  return `From ${formatCny(price.low_cny)}`;
}
export function maxClearance(platform) {
  const c = platform.tire_clearance;
  return c.published_max_mm ?? c.published_rear_max_mm ?? c.stock_nominal_mm;
}
export function clearanceLabel(platform) {
  const c = platform.tire_clearance;
  if (c.published_front_max_mm && c.published_rear_max_mm) return `${c.published_front_max_mm} mm front / ${c.published_rear_max_mm} mm rear`;
  if (c.published_max_mm) return `Up to ${c.published_max_mm} mm`;
  if (c.stock_nominal_mm) return `${c.stock_nominal_mm} mm stock; max unverified`;
  return 'Unverified';
}
export function freshness(observedAt, now = new Date()) {
  if (!observedAt) return {label:'No price date',key:'unknown'};
  const observed = new Date(`${observedAt}T00:00:00Z`);
  const days = Math.max(0, Math.floor((now.getTime()-observed.getTime())/86_400_000));
  if (days <= 30) return {label:'Current',key:'current',days};
  if (days <= 90) return {label:'Recent',key:'recent',days};
  if (days <= 180) return {label:'Historical',key:'historical',days};
  return {label:'Old',key:'old',days};
}
export function buildProfileRange(profile, cockpitIncluded=false) {
  return Object.entries(profile.parts).reduce((sum,[key,range]) => {
    if (cockpitIncluded && key === 'cockpit_if_needed') return sum;
    return [sum[0]+range[0],sum[1]+range[1]];
  },[0,0]);
}
