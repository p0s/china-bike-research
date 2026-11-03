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
// Problems an owner report describes: casing failure (bulging, ply separation or a split
// along the casing cords), rubber cracking, early wear-through, repeated punctures, and a
// bead that comes off or will not seat on the rim.
export const TIRE_ISSUES = ['casing', 'cracking', 'wear', 'punctures', 'fit'];
// Budget all-season starting point (2026-11-01): a dated one-tire price before shipping.
export const BUDGET_CNY_PER_TIRE = 250;

// Owner ratings (2026-11-03): editorial coding of first-hand public reports, one row per
// distinct owner of the exact tire record. Each aspect is rated only from its own sample of
// at least OWNER_RATING_MIN owners; five is an entry threshold, not proof.
export const OWNER_ASPECTS = ['overall', 'wet', 'grip', 'speed', 'punctures', 'wear', 'casing'];
export const OWNER_CODES = ['favourable', 'mixed', 'unfavourable'];
export const OWNER_SETUPS = ['tubeless', 'inner-tube'];
export const OWNER_RATING_MIN = 5;
// Per-tire checked-source ledger (2026-11-03): each route a tire was checked on and its
// outcome. Pending marks a route still waiting for research, such as the Xiaohongshu lane.
export const OWNER_ROUTES = ['xiaohongshu', 'sigma-sports', 'bike-components', 'brr-comments'];
export const OWNER_CHECK_OUTCOMES = ['counted', 'none', 'not-listed', 'blocked', 'pending'];
export const OWNER_STATUSES = ['rated', 'below', 'none', 'blocked', 'pending', 'unchecked'];
// Share = (favourable + mixed / 2) / owners, mapped to five symmetric word bands.
const OWNER_BANDS = [
  [(share) => share >= 0.85, 'favourable'],
  [(share) => share >= 0.65, 'mostly-favourable'],
  [(share) => share > 0.35, 'mixed'],
  [(share) => share > 0.15, 'mostly-unfavourable'],
  [() => true, 'unfavourable']
];

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

// A size is one nominal width (width_mm) or a maker's literal dual-width label
// (width_label_mm, for example [25, 28] for "25/28 mm"). The label is kept as written;
// the site never guesses which labelled number is the mounted width.
export function sizeWidths(size) {
  return Array.isArray(size.width_label_mm) ? size.width_label_mm : [size.width_mm];
}

export function sizeLabel(size) {
  return sizeWidths(size).join('/');
}

// A size counts toward a width group only when every labelled number falls inside it.
export function sizeInRange(size, { min, max }) {
  return sizeWidths(size).every((width) => inRange(width, min, max));
}

export function widthsIn(tire, range) {
  return (tire.sizes ?? []).filter((size) => sizeInRange(size, range)).map(sizeLabel);
}

// Independent wet-traction evidence: a measured lab score or a recorded measured note.
export function measuredWetGrip(tire) {
  const scores = (tire.tests ?? []).map((test) => test.wet_grip).filter(Number.isFinite);
  return scores.length ? Math.max(...scores) : null;
}

export function wetEvidenceKinds(tire) {
  const kinds = new Set((tire.wet_notes ?? []).map((note) => note.kind));
  if (measuredWetGrip(tire) !== null) kinds.add('measured');
  if ((tire.owner_evidence?.reports ?? []).some((report) => report.codes?.wet)) kinds.add('community report');
  return TIRE_EVIDENCE_KINDS.filter((kind) => kinds.has(kind));
}

export function tireGroups(tire) {
  return {
    road: widthsIn(tire, ROAD_WIDTHS).length > 0,
    wet: widthsIn(tire, WET_WIDTHS).length > 0 && wetEvidenceKinds(tire).length > 0
  };
}

// The size used for one-number comparisons: 28 mm, else the nearest recorded width
// (ties prefer the wider size, which is the common modern road choice). A dual-width
// label is placed by its nearest labelled number.
export function referenceSize(tire) {
  const sizes = (tire.sizes ?? []).filter((size) => sizeWidths(size).every(Number.isFinite));
  if (!sizes.length) return null;
  const distance = (size) => Math.min(...sizeWidths(size).map((width) => Math.abs(width - 28)));
  const widest = (size) => Math.max(...sizeWidths(size));
  return [...sizes].sort((a, b) => distance(a) - distance(b) || widest(b) - widest(a))[0];
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
    .map((tire) => ({ tire, reports: (tire.owner_evidence?.reports ?? []).length + (tire.community ?? []).length, tested: (tire.tests ?? []).length }))
    .filter((item) => item.tested || item.reports >= 2)
    .sort((a, b) => b.tested - a.tested || b.reports - a.reports || a.tire.id.localeCompare(b.tire.id));
  const gripScored = wet.map((tire) => ({ tire, grip: measuredWetGrip(tire) })).filter((item) => item.grip !== null);
  const wetGrip = gripScored.filter((item) => item.grip >= 80)
    .sort((a, b) => b.grip - a.grip || a.tire.id.localeCompare(b.tire.id));
  const allSeason = gripScored.filter((item) => item.tire.use === 'all-season')
    .sort((a, b) => b.grip - a.grip || a.tire.id.localeCompare(b.tire.id));
  return { fastest, balanced, protective, chinese, wetGrip, allSeason };
}

// The lowest dated CNY price within the budget for one package basis. Only a one-tire
// ('single') price qualifies; a price whose one-tire or pair basis is unstated is shown apart.
export function budgetPrice(tire, basis = 'single') {
  const prices = (tire.price_observations ?? []).filter((price) => price.currency === 'CNY' && price.package === basis && price.amount <= BUDGET_CNY_PER_TIRE);
  return prices.sort((a, b) => a.amount - b.amount || b.observed_at.localeCompare(a.observed_at))[0] ?? null;
}

// Wet-road evidence for a tire without a lab test comes from first-hand owner reports.
// Tread pattern, "four-season" copy and seller claims never count.
export function wetEvidenceStatus(tire) {
  if (measuredWetGrip(tire) !== null) return 'measured';
  const stances = (tire.wet_notes ?? []).filter((note) => note.kind === 'community report').map((note) => note.stance);
  if (!stances.length) return 'none';
  const positive = stances.filter((stance) => stance === 'positive').length;
  if (positive === stances.length) return positive >= 2 ? 'consistent' : 'single';
  return positive || stances.includes('mixed') ? 'conflicting' : 'unfavourable';
}

// Distinct sources whose owner reports describe the issue.
export function issueSources(tire, issue) {
  return new Set((tire.community ?? []).filter((report) => (report.issues ?? []).includes(issue)).map((report) => report.source_id)).size;
}

// Budget all-season starting point. A supported all-season choice needs measured wet grip of
// at least 80 or two favourable owner wet reports with none against, and fewer than two
// casing-failure sources. Tires listed within the budget whose price basis is unstated are
// returned separately and never count as budget choices.
const BUDGET_WET_ORDER = ['measured', 'consistent', 'single', 'conflicting', 'none', 'unfavourable'];
export function budgetShortlist(tires) {
  const evidence = (tire, price) => {
    const wet = wetEvidenceStatus(tire);
    const grip = measuredWetGrip(tire);
    const issues = Object.fromEntries(TIRE_ISSUES.map((issue) => [issue, issueSources(tire, issue)]));
    const allSeason = ((wet === 'measured' && grip >= 80) || wet === 'consistent') && issues.casing < 2;
    return { tire, price, wet, grip, issues, allSeason };
  };
  const order = (a, b) => Number(b.allSeason) - Number(a.allSeason) || BUDGET_WET_ORDER.indexOf(a.wet) - BUDGET_WET_ORDER.indexOf(b.wet)
    || a.issues.casing - b.issues.casing || a.price.amount - b.price.amount || a.tire.id.localeCompare(b.tire.id);
  const chinese = tires.filter((tire) => tire.origin.group !== 'international' && tireGroups(tire).road);
  const qualifying = chinese.filter((tire) => budgetPrice(tire)).map((tire) => evidence(tire, budgetPrice(tire))).sort(order);
  const unverified = chinese.filter((tire) => !budgetPrice(tire) && budgetPrice(tire, 'unstated'))
    .map((tire) => ({ ...evidence(tire, budgetPrice(tire, 'unstated')), allSeason: false })).sort(order);
  return { qualifying, unverified };
}

// Owner-rating counts and bands. Evidence depth describes how much was found, not statistical
// confidence: public reports are self-selected, and width, pressure, setup and roads vary.
export function ownerRating(counts) {
  const n = counts.favourable + counts.mixed + counts.unfavourable;
  if (n < OWNER_RATING_MIN) return null;
  const share = (counts.favourable + counts.mixed / 2) / n;
  return { band: OWNER_BANDS.find(([test]) => test(share))[1], depth: n >= 20 ? 'larger' : n >= 10 ? 'moderate' : 'limited' };
}

export function ownerRatings(tire) {
  const reports = tire.owner_evidence?.reports ?? [];
  const aspects = Object.fromEntries(OWNER_ASPECTS.map((aspect) => {
    const counts = Object.fromEntries(OWNER_CODES.map((code) => [code, reports.filter((report) => report.codes?.[aspect] === code).length]));
    return [aspect, { counts, n: counts.favourable + counts.mixed + counts.unfavourable, rating: ownerRating(counts) }];
  }));
  const tally = (values) => [...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map())];
  return {
    coded: Boolean(tire.owner_evidence),
    owners: reports.length,
    aspects,
    rated: OWNER_ASPECTS.filter((aspect) => aspects[aspect].rating),
    widths: tally(reports.map((report) => report.width_mm ?? null)).sort((a, b) => (a[0] ?? 999) - (b[0] ?? 999)),
    setups: tally(reports.map((report) => report.setup ?? null)).sort((a, b) => (a[0] === null) - (b[0] === null) || String(a[0]).localeCompare(String(b[0])))
  };
}

// Research status: rated, owners below the threshold, checked with no eligible owner, every
// checked route blocked, waiting for a pending route, or not yet checked at all.
export function ownerCheckStatus(tire) {
  if (!tire.owner_evidence) return 'unchecked';
  const summary = ownerRatings(tire);
  if (summary.rated.length) return 'rated';
  if (summary.owners) return 'below';
  const checks = tire.owner_evidence.checks ?? [];
  if (checks.some((check) => check.outcome === 'pending')) return 'pending';
  if (checks.length && checks.every((check) => check.outcome === 'blocked')) return 'blocked';
  return 'none';
}

const sizeKey = (size) => `${sizeLabel(size)}|${size.bead ?? ''}`;

// Tire photos (2026-11-02). A third-party photo stays on its owner's server: the maker's or
// retailer's own product page, or the original public post. No copy enters Git.
export const TIRE_IMAGE_KINDS = { official: 'official-page-embed', retailer: 'retailer-page-embed', 'public-post': 'public-post-embed' };
export const TIRE_IMAGE_STATUSES = [...Object.keys(TIRE_IMAGE_KINDS), 'missing'];
const TIRE_IMAGE_SOURCE_TYPES = {
  official: /^(manufacturer-[a-z-]+|official-marketplace-listing)$/,
  retailer: /^(retailer-product-page|marketplace-product-page)$/,
  'public-post': /^public-community-post$/
};
// A photo loads from its source page's own host or that site's reviewed media host.
export const TIRE_MEDIA_HOSTS = {
  'www.trekbikes.com': ['media.trekbikes.com'],
  'www.giant-bicycles.com': ['images2.giant-bicycles.com'],
  'www.cadex-cycling.com': ['images2.giant-bicycles.com'],
  'www.enve.com': ['enve.com'],
  'www.michelin.co.uk': ['dxm.contentcenter.michelin.com'],
  'www.pirelli.com': ['tyre24.pirelli.com'],
  'www.specialized.com': ['resources.specialized.com'],
  // Unsigned XHS CDN form of a post's own image (the signed feed URLs expire).
  'www.xiaohongshu.com': ['sns-img-qc.xhscdn.com']
};
// Only resizing parameters may follow an image file URL; tracking or session parameters never do.
const RESIZE_PARAMS = new Set(['width', 'height', 'w', 'h', 'q', 'fm', 'fit', 'crop']);

function plainImageUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hash || url.username || url.password) return null;
    if ([...url.searchParams.keys()].some((key) => !RESIZE_PARAMS.has(key))) return null;
    return url;
  } catch { return null; }
}

export function validateTireImage(tire, sources, label) {
  const errors = [];
  const image = tire.image;
  if (!image || typeof image !== 'object' || Array.isArray(image)) return [`${label}: image must be an object`];
  for (const field of ['source_id', 'subject_accuracy', 'shown', 'credit', 'alt', 'remote_url', 'reviewed_at', 'source_media_sha256']) {
    if (!nonEmpty(image[field])) errors.push(`${label}: missing image.${field}`);
  }
  if (!Object.hasOwn(TIRE_IMAGE_KINDS, image.kind)) errors.push(`${label}: invalid image.kind`);
  if (image.subject_accuracy !== 'exact-model') errors.push(`${label}: tire photos must show the exact model`);
  const source = sources.get(image.source_id);
  if (!source || !(tire.source_ids ?? []).includes(image.source_id)) errors.push(`${label}: image source must be a listed source`);
  else if (!TIRE_IMAGE_SOURCE_TYPES[image.kind]?.test(source.type)) errors.push(`${label}: image source type does not match its kind`);
  if (image.kind === 'public-post' && !/^https:\/\/www\.xiaohongshu\.com\/explore\/[0-9a-f]{24}$/.test(source?.url ?? '')) errors.push(`${label}: a public-post photo needs a canonical XHS post link`);
  const remote = plainImageUrl(image.remote_url);
  if (!remote) errors.push(`${label}: image.remote_url must be an HTTPS file URL with resizing parameters only`);
  let pageHost = '';
  try { pageHost = new URL(source?.url ?? '').hostname; } catch { /* reported above */ }
  if (remote && remote.hostname !== pageHost && !(TIRE_MEDIA_HOSTS[pageHost] ?? []).includes(remote.hostname)) errors.push(`${label}: image must load from its source page's host or reviewed media host`);
  if (image.thumb_url !== undefined) {
    // A resized copy keeps the file name, or changes only a WordPress size suffix or an XHS
    // style suffix (for example !nc_n_webp_prv_1) on the same original.
    const thumb = plainImageUrl(image.thumb_url);
    const original = (url) => url.pathname.split('/').pop().replace(/![a-z0-9_]+$/i, '').replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, '');
    if (!thumb || !remote || thumb.hostname !== remote.hostname || original(thumb) !== original(remote)) errors.push(`${label}: image.thumb_url must be a resized copy of the same file on the same host`);
  }
  if (!/^[a-f0-9]{64}$/.test(image.source_media_sha256 ?? '') || !Number.isInteger(image.source_media_bytes) || image.source_media_bytes < 1) errors.push(`${label}: image needs the reviewed file's hash and size`);
  if (!Number.isInteger(image.width) || image.width < 120 || !Number.isInteger(image.height) || image.height < 120) errors.push(`${label}: image needs reviewed dimensions of at least 120 px`);
  if (nonEmpty(image.alt) && image.alt.trim().length < 15) errors.push(`${label}: image.alt is too short`);
  if (!isDate(image.reviewed_at)) errors.push(`${label}: invalid image.reviewed_at`);
  const rights = image.rights ?? {};
  if (rights.status !== TIRE_IMAGE_KINDS[image.kind] || ['copyright_holder', 'usage_note', 'removal_route'].some((field) => !nonEmpty(rights[field]))) errors.push(`${label}: incomplete image rights record`);
  if (rights.terms_source_id !== undefined && !sources.has(rights.terms_source_id)) errors.push(`${label}: unknown image terms source`);
  const privacy = image.privacy_review ?? {};
  if (!['none-found', 'technical-only'].includes(privacy.embedded_metadata) || privacy.visual !== 'no-faces-plates-accounts-locations' || !isDate(privacy.reviewed_at)) errors.push(`${label}: incomplete image privacy review`);
  return errors;
}

export function validateTires(data, sourceIds) {
  const errors = [];
  const tires = data.tires ?? [];
  const ids = new Set(tires.map((tire) => tire.id));
  const otherIds = new Set([...(data.buildParts ?? []), ...(data.wheelsets ?? [])].map((record) => record.id));
  const sources = new Map((data.sources ?? []).map((source) => [source.id, source]));
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
      if (size.width_label_mm !== undefined) {
        // A literal dual-width label keeps both numbers and claims no single width or ETRTO.
        const [narrow, wide] = Array.isArray(size.width_label_mm) ? size.width_label_mm : [];
        if (!Array.isArray(size.width_label_mm) || size.width_label_mm.length !== 2 || !inRange(narrow, 18, 50) || !inRange(wide, 18, 50) || narrow >= wide) errors.push(`${label}: a dual-width label needs two ascending widths`);
        if (size.width_mm !== null || size.etrto !== undefined) errors.push(`${label}: a dual-width label must not claim one width or ETRTO`);
      } else if (!inRange(size.width_mm, 18, 50)) errors.push(`${label}: invalid size width_mm`);
      if (seen.has(sizeKey(size))) errors.push(`${label}: duplicate size ${sizeLabel(size)} mm`);
      seen.add(sizeKey(size));
      if (size.etrto !== undefined && !/^\d{2}-622$/.test(size.etrto ?? '')) errors.push(`${label}: invalid etrto ${size.etrto}`);
      if (size.weight_g !== null && !inRange(size.weight_g, 120, 700)) errors.push(`${label}: invalid weight for ${sizeLabel(size)} mm`);
      if (size.max_psi !== null && size.max_psi !== undefined && !inRange(size.max_psi, 30, 200)) errors.push(`${label}: invalid max_psi for ${sizeLabel(size)} mm`);
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
      // An owner wet report states whether it favours the tire; other kinds carry no stance.
      if (note.kind === 'community report' ? !TIRE_STANCES.includes(note.stance) : note.stance !== undefined) errors.push(`${label}: only owner wet reports carry a stance, and they need one`);
    }
    for (const report of tire.community ?? []) {
      if (!listed(tire, report.source_id) || !nonEmpty(report.summary) || !TIRE_STANCES.includes(report.stance) || !isDate(report.published_at)) errors.push(`${label}: owner reports need a listed source, summary, stance and date`);
      if (report.issues !== undefined && (!Array.isArray(report.issues) || !report.issues.length || report.issues.some((issue) => !TIRE_ISSUES.includes(issue)) || new Set(report.issues).size !== report.issues.length)) errors.push(`${label}: owner report issues must be distinct known issues`);
    }
    // Owner ratings: one row per distinct owner, coded per aspect. A post is either coded owner
    // by owner or kept as a whole-post note, never both. Rows carry no names or account data.
    if (tire.owner_evidence !== undefined) {
      const evidence = tire.owner_evidence ?? {};
      if (!isDate(evidence.coded_at) || !nonEmpty(evidence.screening_note) || !Array.isArray(evidence.reports)) errors.push(`${label}: owner evidence needs a coding date, screening note and reports`);
      const posts = new Set((tire.community ?? []).map((report) => report.source_id));
      for (const report of evidence.reports ?? []) {
        const codes = Object.entries(report.codes ?? {});
        if (!Array.isArray(report.source_ids) || !report.source_ids.length || report.source_ids.some((id) => !listed(tire, id))) errors.push(`${label}: owner rows need listed sources`);
        if (!codes.length || codes.some(([aspect, code]) => !OWNER_ASPECTS.includes(aspect) || !OWNER_CODES.includes(code))) errors.push(`${label}: owner rows need known aspect codes`);
        if (!nonEmpty(report.summary) || /https?:|www\.|@/i.test(`${report.summary} ${report.exposure ?? ''}`)) errors.push(`${label}: owner rows need a summary without links or handles`);
        if (report.width_mm !== null && !inRange(report.width_mm, 18, 50)) errors.push(`${label}: owner row width must be a width or null`);
        if (report.setup !== null && !OWNER_SETUPS.includes(report.setup)) errors.push(`${label}: owner row setup must be tubeless, inner-tube or null`);
        if (report.setup === 'tubeless' && tire.construction === 'tube-type') errors.push(`${label}: a tube-type tire cannot have a tubeless owner row`);
        if (report.published_at !== undefined && !isDate(report.published_at)) errors.push(`${label}: owner row date must be a full date`);
        if ((report.source_ids ?? []).some((id) => posts.has(id))) errors.push(`${label}: a post is either coded owner by owner or kept as a post note`);
      }
      // The checked-source ledger names each route once with its outcome; only a counted
      // route carries an owner count, and it cannot exceed the coded rows.
      if (evidence.checks !== undefined) {
        if (!Array.isArray(evidence.checks)) errors.push(`${label}: owner checks must be an array`);
        const routes = new Set();
        for (const check of Array.isArray(evidence.checks) ? evidence.checks : []) {
          if (!OWNER_ROUTES.includes(check.route) || routes.has(check.route)) errors.push(`${label}: owner checks need distinct known routes`);
          routes.add(check.route);
          if (!OWNER_CHECK_OUTCOMES.includes(check.outcome)) errors.push(`${label}: invalid owner check outcome`);
          const counted = check.outcome === 'counted';
          if (counted !== (check.owners !== undefined) || (counted && (!Number.isInteger(check.owners) || check.owners < 1 || check.owners > (evidence.reports ?? []).length))) errors.push(`${label}: only a counted route carries an owner count within the coded rows`);
          if (check.note !== undefined && (!nonEmpty(check.note) || /https?:|www\.|@/i.test(check.note))) errors.push(`${label}: owner check notes must be plain text`);
        }
        if ((evidence.reports ?? []).length && !(evidence.checks ?? []).some((check) => check.outcome === 'counted')) errors.push(`${label}: coded rows need a counted route`);
      }
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
    if (tire.image !== undefined) errors.push(...validateTireImage(tire, sources, label));
  }
  // The image ledger lists every published tire once with its photo status or the reason it has none.
  for (const ledger of data.tireImages ?? []) {
    const label = `tire image ledger ${ledger.id}`;
    if (!isDate(ledger.as_of)) errors.push(`${label}: invalid as_of`);
    const entries = new Map();
    for (const entry of ledger.entries ?? []) {
      if (entries.has(entry.tire_id)) errors.push(`${label}: duplicate entry ${entry.tire_id}`);
      entries.set(entry.tire_id, entry);
      if (!ids.has(entry.tire_id)) errors.push(`${label}: unknown tire ${entry.tire_id}`);
      if (!TIRE_IMAGE_STATUSES.includes(entry.status) || !nonEmpty(entry.reason)) errors.push(`${label}: ${entry.tire_id} needs a status and reason`);
    }
    for (const tire of tires) {
      const entry = entries.get(tire.id);
      if (!entry) errors.push(`${label}: tire ${tire.id} is missing`);
      else if (entry.status !== (tire.image?.kind ?? 'missing')) errors.push(`${label}: ${tire.id} status does not match its record`);
    }
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
