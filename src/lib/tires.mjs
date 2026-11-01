import { isCalendarDate as isDate } from './calendar-date.mjs';

// Road outer-tire reference (2026-11-01). Records are exact model lines with one
// construction each; sizes keep their own claimed weights and pressure limits.
export const TIRE_USES = ['race', 'all-round', 'endurance', 'all-season', 'training'];
export const TIRE_ORIGIN_GROUPS = ['mainland-china', 'taiwan', 'international'];
export const TIRE_CONSTRUCTIONS = ['tubeless-ready', 'tube-type', 'tubular'];
export const TIRE_HOOKLESS = ['approved', 'not-approved', 'not-stated'];
export const TIRE_EVIDENCE_KINDS = ['measured', 'official', 'seller claim', 'community report'];
export const TIRE_AVAILABILITY = ['official-store', 'authorized-retail', 'retail', 'not-found', 'unverified'];
export const TIRE_REGIONS = ['cn', 'eu', 'na'];
export const TIRE_PRICE_REGIONS = [...TIRE_REGIONS, 'global'];
export const TIRE_PACKAGES = ['single', 'pair', 'unstated'];
export const TIRE_DISPOSITIONS = ['included', 'excluded', 'unresolved'];
export const TIRE_STANCES = ['positive', 'mixed', 'negative'];

// The two requested width groups. Road: 25–35 mm. Wet weather: 20–40 mm with recorded
// wet-traction evidence. Rim-brake or pad braking is never part of tire evidence.
export const ROAD_WIDTHS = { min: 25, max: 35 };
export const WET_WIDTHS = { min: 20, max: 40 };
// Bicycle Rolling Resistance publishes one free rolling-resistance point per width band.
export const BRR_BANDS = [
  { min: 25, max: 27, psi: 80 },
  { min: 28, max: 30, psi: 72 }
];

const inRange = (value, low, high) => Number.isFinite(value) && value >= low && value <= high;
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

export function widthsIn(tire, { min, max }) {
  return (tire.sizes ?? []).map((size) => size.width_mm).filter((width) => width >= min && width <= max);
}

// Independent wet-traction evidence: a measured lab score or a recorded measured note.
export function measuredWetGrip(tire) {
  const scores = (tire.tests ?? []).map((test) => test.wet_grip).filter(Number.isFinite);
  return scores.length ? Math.max(...scores) : null;
}

export function wetEvidenceKinds(tire) {
  const kinds = new Set((tire.wet_notes ?? []).map((note) => note.kind));
  if (measuredWetGrip(tire) !== null) kinds.add('measured');
  return TIRE_EVIDENCE_KINDS.filter((kind) => kinds.has(kind));
}

export function tireGroups(tire) {
  return {
    road: widthsIn(tire, ROAD_WIDTHS).length > 0,
    wet: widthsIn(tire, WET_WIDTHS).length > 0 && wetEvidenceKinds(tire).length > 0
  };
}

// The size used for one-number comparisons: 28 mm, else the nearest recorded width
// (ties prefer the wider size, which is the common modern road choice).
export function referenceSize(tire) {
  const sizes = [...(tire.sizes ?? [])].filter((size) => Number.isFinite(size.width_mm));
  if (!sizes.length) return null;
  return sizes.sort((a, b) => Math.abs(a.width_mm - 28) - Math.abs(b.width_mm - 28) || b.width_mm - a.width_mm)[0];
}

// Comparable rolling resistance: Bicycle Rolling Resistance tests in the 28–30 mm band.
export function comparableRollingTest(tire) {
  const band = BRR_BANDS[1];
  const tests = (tire.tests ?? []).filter((test) => test.protocol === 'brr-road' && Number.isFinite(test.rr_w)
    && inRange(test.measured_width_mm, band.min, band.max) && test.rr_psi === band.psi);
  return tests.sort((a, b) => a.rr_w - b.rr_w)[0] ?? null;
}

// The test shown in the summary row: the 28–30 mm BRR test, else the newest test.
export function headlineTest(tire) {
  return comparableRollingTest(tire) ?? [...(tire.tests ?? [])].sort((a, b) => (b.tested_year ?? 0) - (a.tested_year ?? 0))[0] ?? null;
}

// Criteria-led starting points. Each list states its criteria and never forms a universal score.
export function tireShortlists(tires) {
  const road = tires.filter((tire) => tireGroups(tire).road);
  const wet = tires.filter((tire) => tireGroups(tire).wet);
  const rolling = road.map((tire) => ({ tire, test: comparableRollingTest(tire) })).filter((item) => item.test);
  const fastest = [...rolling].sort((a, b) => a.test.rr_w - b.test.rr_w || a.tire.id.localeCompare(b.tire.id)).slice(0, 5);
  const balanced = rolling.filter((item) => item.test.rr_w <= 12 && item.test.puncture_tread >= 45)
    .sort((a, b) => a.test.rr_w - b.test.rr_w || a.tire.id.localeCompare(b.tire.id));
  const protective = rolling.filter((item) => Number.isFinite(item.test.puncture_tread))
    .sort((a, b) => b.test.puncture_tread - a.test.puncture_tread || a.test.rr_w - b.test.rr_w).slice(0, 5);
  const chinese = road.filter((tire) => tire.origin.group !== 'international')
    .map((tire) => ({ tire, reports: (tire.community ?? []).length, tested: (tire.tests ?? []).length }))
    .filter((item) => item.tested || item.reports >= 2)
    .sort((a, b) => b.tested - a.tested || b.reports - a.reports || a.tire.id.localeCompare(b.tire.id));
  const gripScored = wet.map((tire) => ({ tire, grip: measuredWetGrip(tire) })).filter((item) => item.grip !== null);
  const wetGrip = gripScored.filter((item) => item.grip >= 80)
    .sort((a, b) => b.grip - a.grip || a.tire.id.localeCompare(b.tire.id));
  const allSeason = gripScored.filter((item) => item.tire.use === 'all-season')
    .sort((a, b) => b.grip - a.grip || a.tire.id.localeCompare(b.tire.id));
  return { fastest, balanced, protective, chinese, wetGrip, allSeason };
}

const sizeKey = (size) => `${size.width_mm}|${size.bead ?? ''}`;

export function validateTires(data, sourceIds) {
  const errors = [];
  const tires = data.tires ?? [];
  const ids = new Set(tires.map((tire) => tire.id));
  const otherIds = new Set([...(data.buildParts ?? []), ...(data.wheelsets ?? [])].map((record) => record.id));
  const listed = (tire, id) => sourceIds.has(id) && (tire.source_ids ?? []).includes(id);
  for (const tire of tires) {
    const label = `tire ${tire.id}`;
    for (const field of ['maker', 'name', 'status', 'use', 'positioning', 'construction', 'hookless', 'reviewed_at']) {
      if (!nonEmpty(tire[field])) errors.push(`${label}: missing ${field}`);
    }
    if (otherIds.has(tire.id)) errors.push(`${label}: id collides with a build part or wheelset`);
    if (tire.status !== 'current') errors.push(`${label}: only current tires are compared`);
    if (!TIRE_USES.includes(tire.use)) errors.push(`${label}: invalid use`);
    if (!TIRE_CONSTRUCTIONS.includes(tire.construction)) errors.push(`${label}: invalid construction`);
    if (!TIRE_HOOKLESS.includes(tire.hookless)) errors.push(`${label}: invalid hookless status`);
    // Hookless approval is safety-critical; it must cite the maker's statement.
    if (tire.hookless !== 'not-stated' && !nonEmpty(tire.hookless_note)) errors.push(`${label}: a hookless status needs the maker's note`);
    if (tire.hookless === 'approved' && tire.construction !== 'tubeless-ready') errors.push(`${label}: only tubeless-ready tires can be hookless approved`);
    if (tire.aliases !== undefined && (!Array.isArray(tire.aliases) || tire.aliases.some((alias) => !nonEmpty(alias)))) errors.push(`${label}: aliases must be non-empty strings`);
    const origin = tire.origin ?? {};
    if (!TIRE_ORIGIN_GROUPS.includes(origin.group)) errors.push(`${label}: invalid origin.group`);
    if (!nonEmpty(origin.country) || !nonEmpty(origin.basis)) errors.push(`${label}: origin needs a country and basis`);
    if (origin.group === 'mainland-china' && origin.country !== 'Mainland China') errors.push(`${label}: mainland-China origin must name Mainland China`);
    if (origin.group === 'taiwan' && origin.country !== 'Taiwan') errors.push(`${label}: Taiwan origin must name Taiwan`);
    const made = tire.manufacturing ?? {};
    if (made.country !== null && !nonEmpty(made.country)) errors.push(`${label}: manufacturing.country must be a name or null`);
    if (!nonEmpty(made.basis)) errors.push(`${label}: manufacturing needs a basis`);
    if (!Array.isArray(tire.sizes) || !tire.sizes.length) errors.push(`${label}: sizes must not be empty`);
    const seen = new Set();
    for (const size of tire.sizes ?? []) {
      if (!inRange(size.width_mm, 18, 50)) errors.push(`${label}: invalid size width_mm`);
      if (seen.has(sizeKey(size))) errors.push(`${label}: duplicate size ${size.width_mm} mm`);
      seen.add(sizeKey(size));
      if (size.etrto !== undefined && !/^\d{2}-622$/.test(size.etrto ?? '')) errors.push(`${label}: invalid etrto ${size.etrto}`);
      if (size.weight_g !== null && !inRange(size.weight_g, 120, 700)) errors.push(`${label}: invalid weight for ${size.width_mm} mm`);
      if (size.max_psi !== null && size.max_psi !== undefined && !inRange(size.max_psi, 30, 200)) errors.push(`${label}: invalid max_psi for ${size.width_mm} mm`);
    }
    if (!TIRE_EVIDENCE_KINDS.includes(tire.weight_claim_type)) errors.push(`${label}: invalid weight_claim_type`);
    if (!nonEmpty(tire.weight_basis)) errors.push(`${label}: missing weight_basis`);
    for (const test of tire.tests ?? []) {
      if (test.protocol !== 'brr-road') errors.push(`${label}: unknown test protocol`);
      if (!listed(tire, test.source_id)) errors.push(`${label}: test must cite a listed source`);
      if (!inRange(test.width_mm, 18, 50) || !inRange(test.measured_width_mm, 18, 50)) errors.push(`${label}: test needs tested and measured widths`);
      if (!Number.isInteger(test.tested_year) || test.tested_year < 2014 || test.tested_year > 2030) errors.push(`${label}: invalid test year`);
      if (!['tubeless', 'butyl-tube', 'latex-tube'].includes(test.setup)) errors.push(`${label}: invalid test setup`);
      // A rolling-resistance value is meaningful only with its published band pressure.
      if (test.rr_w !== null) {
        const band = BRR_BANDS.find((item) => test.measured_width_mm >= item.min && test.measured_width_mm <= item.max);
        if (!inRange(test.rr_w, 3, 40) || !band || test.rr_psi !== band.psi) errors.push(`${label}: rolling resistance needs its band pressure`);
      }
      if (test.wet_grip !== null && !inRange(test.wet_grip, 30, 100)) errors.push(`${label}: invalid wet_grip`);
      if (test.puncture_tread !== null && !inRange(test.puncture_tread, 5, 200)) errors.push(`${label}: invalid puncture_tread`);
    }
    for (const note of tire.wet_notes ?? []) {
      if (!TIRE_EVIDENCE_KINDS.includes(note.kind) || !nonEmpty(note.summary) || !listed(tire, note.source_id)) errors.push(`${label}: wet notes need a kind, summary and listed source`);
    }
    for (const report of tire.community ?? []) {
      if (!listed(tire, report.source_id) || !nonEmpty(report.summary) || !TIRE_STANCES.includes(report.stance) || !isDate(report.published_at)) errors.push(`${label}: owner reports need a listed source, summary, stance and date`);
    }
    const availability = tire.availability ?? {};
    for (const region of TIRE_REGIONS) if (!TIRE_AVAILABILITY.includes(availability[region])) errors.push(`${label}: invalid availability.${region}`);
    if (!Array.isArray(tire.price_observations)) errors.push(`${label}: price_observations must be an array`);
    for (const price of tire.price_observations ?? []) {
      if (!Number.isFinite(price.amount) || price.amount <= 0 || !/^[A-Z]{3}$/.test(price.currency ?? '')) errors.push(`${label}: invalid price amount or currency`);
      if (!TIRE_PRICE_REGIONS.includes(price.region) || !TIRE_PACKAGES.includes(price.package)) errors.push(`${label}: invalid price region or package`);
      if (!isDate(price.observed_at) || !listed(tire, price.source_id)) errors.push(`${label}: price needs a date and listed source`);
      for (const field of ['market', 'price_type', 'conditions']) if (!nonEmpty(price[field])) errors.push(`${label}: missing price ${field}`);
      if (price.width_mm !== null && price.width_mm !== undefined && !(tire.sizes ?? []).some((size) => size.width_mm === price.width_mm)) errors.push(`${label}: price width is not a listed size`);
    }
    if (!Array.isArray(tire.caveats) || !tire.caveats.length) errors.push(`${label}: caveats must not be empty`);
    for (const id of tire.source_ids ?? []) if (!sourceIds.has(id)) errors.push(`${label}: missing source ${id}`);
    if (!Array.isArray(tire.source_ids) || !tire.source_ids.length) errors.push(`${label}: source_ids must not be empty`);
    if (!isDate(tire.reviewed_at)) errors.push(`${label}: invalid reviewed_at`);
  }
  // The coverage ledger records every discovered candidate's disposition and reason.
  for (const ledger of data.tireCoverage ?? []) {
    const label = `tire coverage ${ledger.id}`;
    if (!isDate(ledger.as_of)) errors.push(`${label}: invalid as_of`);
    if (!Array.isArray(ledger.routes) || !ledger.routes.length) errors.push(`${label}: routes must not be empty`);
    for (const route of ledger.routes ?? []) {
      if (!nonEmpty(route.name) || !nonEmpty(route.summary) || !isDate(route.checked_at)) errors.push(`${label}: routes need a name, summary and date`);
    }
    const brandIds = new Set();
    for (const brand of ledger.brands ?? []) {
      if (!nonEmpty(brand.id) || brandIds.has(brand.id)) errors.push(`${label}: brand ids must be unique`);
      brandIds.add(brand.id);
      if (!nonEmpty(brand.name) || !TIRE_ORIGIN_GROUPS.includes(brand.origin_group) || !nonEmpty(brand.origin_basis)) errors.push(`${label}: brand ${brand.id} needs a name, origin group and basis`);
    }
    const names = new Set();
    for (const candidate of ledger.candidates ?? []) {
      const key = `${candidate.brand_id}|${candidate.name}`;
      if (names.has(key)) errors.push(`${label}: duplicate candidate ${candidate.name}`);
      names.add(key);
      if (!brandIds.has(candidate.brand_id)) errors.push(`${label}: candidate ${candidate.name} has an unknown brand`);
      if (!TIRE_DISPOSITIONS.includes(candidate.disposition) || !nonEmpty(candidate.reason)) errors.push(`${label}: candidate ${candidate.name} needs a disposition and reason`);
      if (candidate.disposition === 'included' && !ids.has(candidate.record_id)) errors.push(`${label}: included candidate ${candidate.name} needs a tire record`);
      if (candidate.disposition !== 'included' && candidate.record_id !== undefined) errors.push(`${label}: only included candidates link a tire record`);
    }
    // Every published tire appears in the ledger exactly once.
    for (const tire of tires) {
      const count = (ledger.candidates ?? []).filter((candidate) => candidate.record_id === tire.id).length;
      if (count !== 1) errors.push(`${label}: tire ${tire.id} must appear once as an included candidate`);
    }
  }
  return errors;
}
