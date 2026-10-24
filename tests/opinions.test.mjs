import test from 'node:test';
import assert from 'node:assert/strict';
import { OPINION_SCORE_THRESHOLD, opinionAggregate, qualifyingOpinions, validateOpinionCollection } from '../src/lib/opinions.mjs';
import { loadDataset, validateDataset } from '../src/lib/data.mjs';

const opinion = (index, overrides = {}) => ({
  id: `o-${index}`, source_kind: 'social-post', author_role: 'owner', relationship: 'independent', stance: 'positive',
  topics: ['ride'], title: `Post ${index}`, publisher: 'Forum', language: 'en',
  url: `https://example.com/thread/${index}`, accessed_at: '2026-10-24',
  configuration: 'Exact frame', summary: 'A substantive paraphrase of a first-hand exact-model opinion.', ...overrides
});
const opinions = (count, overrides) => Array.from({ length: count }, (_, index) => opinion(index, overrides));
const collection = (items, extra = {}) => ({ id: 'frame-a', target: { platform_id: 'frame-a' }, reviewed_at: '2026-10-24', coverage_note: 'Opinions come from exact-model owner posts and may skew positive.', opinions: items, ...extra });
const context = { platformIds: new Set(['frame-a']), candidateIds: new Set(), variantIds: new Set(), videoIds: new Set(), isDate: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') };

test('a sentiment summary needs strictly more than twenty independent opinions', () => {
  assert.equal(OPINION_SCORE_THRESHOLD, 21);
  const twenty = opinionAggregate(opinions(20));
  assert.equal(twenty.eligible, false);
  assert.equal(twenty.score, null);
  assert.equal(twenty.interval, null);
  const twentyOne = opinionAggregate(opinions(21));
  assert.equal(twentyOne.eligible, true);
  assert.equal(twentyOne.score, 100);
  assert.ok(twentyOne.interval[0] < 100 && twentyOne.interval[1] === 100, 'the interval stays honest about sample size');
});

test('mixed opinions count as half and negatives as zero', () => {
  const items = [...opinions(11), ...opinions(6, { stance: 'mixed' }).map((item, index) => ({ ...item, id: `m-${index}`, url: `https://example.com/m/${index}` })), ...opinions(4, { stance: 'negative' }).map((item, index) => ({ ...item, id: `n-${index}`, url: `https://example.com/n/${index}` }))];
  const result = opinionAggregate(items);
  assert.equal(result.n, 21);
  assert.deepEqual(result.counts, { positive: 11, mixed: 6, negative: 4 });
  assert.equal(result.score, Math.round((11 + 3) / 21 * 100));
});

test('duplicates, brand and seller material never reach the threshold', () => {
  const items = opinions(21);
  items[20] = { ...items[20], duplicate_of: 'o-0' };
  assert.equal(opinionAggregate(items).eligible, false, 'a repeat from the same author counts once');
  const brand = opinions(21);
  brand[0] = { ...brand[0], relationship: 'brand-published' };
  brand[1] = { ...brand[1], relationship: 'seller' };
  assert.equal(qualifyingOpinions(brand).length, 19);
  assert.equal(opinionAggregate(brand).eligible, false);
});

test('validation enforces exact targets, unique sources, paraphrase length and clean links', () => {
  assert.deepEqual(validateOpinionCollection(collection(opinions(3)), context), []);
  const wrongTarget = validateOpinionCollection(collection(opinions(1), { id: 'frame-b', target: { platform_id: 'frame-b' } }), context);
  assert.ok(wrongTarget.some((error) => /missing platform frame-b/.test(error)));
  const duplicate = opinions(2); duplicate[1] = { ...duplicate[1], url: duplicate[0].url };
  assert.ok(validateOpinionCollection(collection(duplicate), context).some((error) => /duplicate source URL/.test(error)));
  const tracked = opinions(1); tracked[0] = { ...tracked[0], url: 'https://example.com/thread/1?utm_source=share' };
  assert.ok(validateOpinionCollection(collection(tracked), context).some((error) => /tracking or share parameters/.test(error)));
  const copied = opinions(1); copied[0] = { ...copied[0], summary: 'x'.repeat(500) };
  assert.ok(validateOpinionCollection(collection(copied), context).some((error) => /40–420 character paraphrase/.test(error)));
  const dangling = opinions(2); dangling[1] = { ...dangling[1], duplicate_of: 'missing' };
  assert.ok(validateOpinionCollection(collection(dangling), context).some((error) => /duplicate_of must name/.test(error)));
});

test('a shown summary must state its coverage', () => {
  const errors = validateOpinionCollection(collection(opinions(21), { coverage_note: undefined }), context);
  assert.ok(errors.some((error) => /needs a coverage_note/.test(error)));
});

test('repository opinion collections validate and only eligible ones carry a coverage note', () => {
  const data = loadDataset();
  assert.ok(data.opinions.length >= 10);
  assert.deepEqual(validateDataset(data).filter((error) => error.startsWith('opinions')), []);
  for (const item of data.opinions) {
    const aggregate = opinionAggregate(item.opinions);
    if (aggregate.eligible) assert.ok(item.coverage_note, `${item.id} shows a summary with coverage`);
    // Opinion text is a paraphrase, never a pasted thread or a username.
    for (const entry of item.opinions) assert.doesNotMatch(entry.url, /\/user\/|\/u\//);
  }
});
