// Exact-model owner and reviewer opinions. A sentiment summary is shown only
// once enough independent opinions exist; it is never a product-quality score.
export const OPINION_SCORE_THRESHOLD = 21;

export const OPINION_STANCES = Object.freeze(['positive', 'mixed', 'negative']);
export const OPINION_ROLES = Object.freeze(['owner', 'reviewer', 'test-rider', 'shop-mechanic']);
export const OPINION_RELATIONSHIPS = Object.freeze(['independent', 'product-supplied', 'affiliate-linked', 'unknown', 'brand-published', 'seller']);
export const OPINION_SOURCE_KINDS = Object.freeze(['forum-post', 'social-post', 'written-review', 'video-review', 'blog-post', 'marketplace-review']);
export const OPINION_TOPICS = Object.freeze([
  'ride', 'comfort', 'handling', 'stiffness', 'fit', 'weight', 'build', 'compatibility',
  'finish', 'durability', 'support', 'value', 'shipping', 'noise', 'clearance'
]);
// Brand and seller material can be useful context but never counts as an independent opinion.
const NON_INDEPENDENT = new Set(['brand-published', 'seller']);

export function opinionTargetKey(target = {}) {
  if (target.platform_id) return `platform:${target.platform_id}`;
  if (target.candidate_id) return `candidate:${target.candidate_id}`;
  return '';
}

// One person or publication counts once per target: syndicated copies, repeat
// comments and follow-ups carry `duplicate_of` and are shown but not counted.
export function qualifyingOpinions(opinions = []) {
  return opinions.filter((opinion) => !opinion.duplicate_of
    && !NON_INDEPENDENT.has(opinion.relationship)
    && OPINION_STANCES.includes(opinion.stance));
}

// Wilson score interval for a proportion; mixed opinions count as half positive.
function wilson(share, n, z = 1.96) {
  const denominator = 1 + z * z / n;
  const centre = (share + z * z / (2 * n)) / denominator;
  const margin = z * Math.sqrt(share * (1 - share) / n + z * z / (4 * n * n)) / denominator;
  return [Math.max(0, centre - margin), Math.min(1, centre + margin)];
}

export function opinionAggregate(opinions = [], threshold = OPINION_SCORE_THRESHOLD) {
  const counted = qualifyingOpinions(opinions);
  const counts = Object.fromEntries(OPINION_STANCES.map((stance) => [stance, counted.filter((opinion) => opinion.stance === stance).length]));
  const n = counted.length;
  const roles = Object.fromEntries(OPINION_ROLES.map((role) => [role, counted.filter((opinion) => opinion.author_role === role).length]));
  const base = { n, counts, roles, total: opinions.length, threshold, eligible: n >= threshold };
  if (!base.eligible) return { ...base, score: null, interval: null };
  const share = (counts.positive + counts.mixed / 2) / n;
  const [low, high] = wilson(share, n);
  return { ...base, score: Math.round(share * 100), interval: [Math.round(low * 100), Math.round(high * 100)] };
}

export function validateOpinionCollection(collection, { platformIds = new Set(), candidateIds = new Set(), variantIds = new Set(), videoIds = new Set(), isDate = () => true } = {}) {
  const errors = [];
  const label = `opinions ${collection?.id ?? '(unnamed)'}`;
  if (!collection || typeof collection !== 'object') return [`${label}: not an object`];
  const target = collection.target ?? {};
  const keys = ['platform_id', 'candidate_id'].filter((key) => target[key] !== undefined);
  if (keys.length !== 1) errors.push(`${label}: target must identify exactly one platform or candidate`);
  if (target.platform_id !== undefined && !platformIds.has(target.platform_id)) errors.push(`${label}: missing platform ${target.platform_id}`);
  if (target.candidate_id !== undefined && !candidateIds.has(target.candidate_id)) errors.push(`${label}: missing candidate ${target.candidate_id}`);
  if (collection.id !== (target.platform_id ?? target.candidate_id)) errors.push(`${label}: id must equal its target id`);
  if (!isDate(collection.reviewed_at)) errors.push(`${label}: invalid reviewed_at`);
  if (collection.coverage_note !== undefined && (typeof collection.coverage_note !== 'string' || collection.coverage_note.trim().length < 40 || collection.coverage_note.length > 420)) errors.push(`${label}: coverage_note must be 40–420 characters`);
  // A shown summary must state where its opinions come from and how they may skew.
  if (opinionAggregate(collection.opinions ?? []).eligible && !collection.coverage_note) errors.push(`${label}: a collection with a sentiment summary needs a coverage_note`);
  if (!Array.isArray(collection.opinions) || !collection.opinions.length) return [...errors, `${label}: opinions must be a non-empty array`];
  const ids = new Set(), urls = new Set();
  for (const opinion of collection.opinions) {
    const where = `${label} ${opinion?.id ?? '(no id)'}`;
    if (typeof opinion?.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(opinion.id)) errors.push(`${where}: invalid id`);
    if (ids.has(opinion.id)) errors.push(`${where}: duplicate id`);
    ids.add(opinion.id);
    if (!OPINION_SOURCE_KINDS.includes(opinion.source_kind)) errors.push(`${where}: invalid source_kind`);
    if (!OPINION_ROLES.includes(opinion.author_role)) errors.push(`${where}: invalid author_role`);
    if (!OPINION_RELATIONSHIPS.includes(opinion.relationship)) errors.push(`${where}: invalid relationship`);
    if (!OPINION_STANCES.includes(opinion.stance)) errors.push(`${where}: invalid stance`);
    if (!Array.isArray(opinion.topics) || !opinion.topics.length || opinion.topics.some((topic) => !OPINION_TOPICS.includes(topic))) errors.push(`${where}: topics must use the controlled vocabulary`);
    for (const field of ['title', 'publisher', 'configuration', 'summary']) {
      if (typeof opinion[field] !== 'string' || !opinion[field].trim()) errors.push(`${where}: missing ${field}`);
    }
    if (typeof opinion.summary === 'string' && (opinion.summary.trim().length < 40 || opinion.summary.length > 420)) errors.push(`${where}: summary must be a 40–420 character paraphrase`);
    if (typeof opinion.language !== 'string' || opinion.language.length < 2) errors.push(`${where}: missing language`);
    if (!isDate(opinion.accessed_at)) errors.push(`${where}: invalid accessed_at`);
    if (opinion.published_at !== undefined && !isDate(opinion.published_at)) errors.push(`${where}: invalid published_at`);
    try {
      const parsed = new URL(opinion.url);
      if (parsed.protocol !== 'https:') errors.push(`${where}: URL must use HTTPS`);
      // Identity-safe canonical links only: no tracking, share or session parameters.
      if ([...parsed.searchParams.keys()].some((key) => /^(utm_|share|si$|ref|spm|xsec|from|source)/i.test(key))) errors.push(`${where}: URL carries tracking or share parameters`);
    } catch { errors.push(`${where}: invalid URL`); }
    const urlKey = `${opinion.url}#${opinion.anchor ?? ''}`;
    if (urls.has(urlKey)) errors.push(`${where}: duplicate source URL`);
    urls.add(urlKey);
    if (opinion.variant_id !== undefined && !variantIds.has(opinion.variant_id)) errors.push(`${where}: missing variant ${opinion.variant_id}`);
    if (opinion.video_id !== undefined && !videoIds.has(opinion.video_id)) errors.push(`${where}: missing video ${opinion.video_id}`);
    if (opinion.source_kind === 'video-review' && opinion.video_id === undefined && !/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(opinion.url ?? '')) errors.push(`${where}: video reviews link a canonical YouTube watch URL or a video record`);
  }
  for (const opinion of collection.opinions) {
    if (opinion.duplicate_of === undefined) continue;
    const original = collection.opinions.find((item) => item.id === opinion.duplicate_of);
    if (!original || original.duplicate_of !== undefined || original === opinion) errors.push(`${label} ${opinion.id}: duplicate_of must name a counted opinion in the same collection`);
  }
  return errors;
}
