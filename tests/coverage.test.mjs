import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadDataset } from '../src/lib/data.mjs';
import {
  createCoverageSnapshot,
  mergeCoverageBaseline,
  validateBaselineTransition,
  validateCoverage
} from '../src/lib/coverage.mjs';

const root = path.resolve(import.meta.dirname, '..');
const data = loadDataset();
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'data/coverage-baseline.json'), 'utf8'));
const retirements = fs.readdirSync(path.join(root, 'data/retired-records'))
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => JSON.parse(fs.readFileSync(path.join(root, 'data/retired-records', name), 'utf8')));

function errorsFor(mutated, accepted = baseline, retirementRecords = retirements, options = {}) {
  return validateCoverage(mutated, createCoverageSnapshot(mutated), accepted, retirementRecords, options);
}

test('accepted catalog coverage passes without exceptions', () => {
  assert.deepEqual(errorsFor(data), []);
});

test('an image cannot disappear by lowering an expected total', () => {
  const mutated = structuredClone(data);
  mutated.images = mutated.images.filter((image) => image.id !== 'quick-pro-er-one-primary-image');
  const errors = errorsFor(mutated);
  assert.ok(errors.some((error) => error.includes('images:quick-pro-er-one-primary-image was removed without a retirement record')));
  assert.ok(errors.some((error) => error.includes('candidates:quick-pro-er-one lost its protected primary image')));
});

test('image subject accuracy and official remote coverage cannot be downgraded', () => {
  const mutated = structuredClone(data);
  const image = mutated.images.find((item) => item.id === 'quick-pro-er-one-primary-image');
  image.subject_accuracy = 'same-platform';
  image.rights.status = 'retailer-page-embed';
  image.hosting = { mode: 'local', local_path: '/assets/images/bike-fallback.svg' };
  const errors = errorsFor(mutated);
  assert.ok(errors.some((error) => error.includes('downgraded subject accuracy')));
  assert.ok(errors.some((error) => error.includes('downgraded its source or reuse-rights tier')));
  assert.ok(errors.some((error) => error.includes('local-only image')));
});

test('candidate prices, facts, and evidence links cannot silently disappear', () => {
  const mutated = structuredClone(data);
  const candidate = mutated.candidates.find((item) => item.id === 'quick-pro-er-one');
  delete candidate.official_price;
  delete candidate.facts.complete_weight_g;
  candidate.source_ids = candidate.source_ids.filter((id) => id !== 'quick-pro-er-one-ultegra-official-2026-08-17');
  const errors = errorsFor(mutated);
  assert.ok(errors.some((error) => error.includes('lost protected field official_price.amount_cny')));
  assert.ok(errors.some((error) => error.includes('lost protected field facts.complete_weight_g')));
  assert.ok(errors.some((error) => error.includes('lost protected relationship source_ids=quick-pro-er-one-ultegra-official-2026-08-17')));
  assert.ok(errors.some((error) => error.includes('lost protected official_price')));
});

test('official evidence sources cannot be weakened in place', () => {
  const mutated = structuredClone(data);
  const source = mutated.sources.find((item) => item.id === 'quick-pro-er-one-ultegra-official-2026-08-17');
  source.type = 'retailer-product-page';
  source.reliability.identity = 'medium';
  source.reliability.specification = 'low';
  const errors = errorsFor(mutated);
  assert.ok(errors.some((error) => error.includes('downgraded its evidence-source tier')));
  assert.ok(errors.some((error) => error.includes('downgraded identity reliability')));
  assert.ok(errors.some((error) => error.includes('downgraded specification reliability')));
});

test('catalog-wide frameset price metadata cannot silently disappear', () => {
  const mutated = structuredClone(data);
  delete mutated.meta.frameset_build_assumption.amount_cny;
  assert.ok(errorsFor(mutated).some((error) => error.includes('meta lost protected field frameset_build_assumption.amount_cny')));
});

test('recorded research attempts cannot silently disappear or be rewritten', () => {
  const mutated = structuredClone(data);
  const record = mutated.researchAttempts.find((item) => item.id === 'candidate-bigrock-sohtea-bom-2026-08-17');
  record.channels['public-post'].attempts.pop();
  assert.ok(errorsFor(mutated).some((error) => error.includes('lost a protected public-post attempt')));

  const rewritten = structuredClone(data);
  const rewrittenRecord = rewritten.researchAttempts.find((item) => item.id === 'candidate-bigrock-sohtea-bom-2026-08-17');
  rewrittenRecord.channels['public-post'].attempts[0].query = 'replacement query';
  assert.ok(errorsFor(rewritten).some((error) => error.includes('lost protected attempt details')));

  const rewrittenNote = structuredClone(data);
  const noteRecord = rewrittenNote.researchAttempts.find((item) => item.id === 'candidate-bigrock-sohtea-bom-2026-08-17');
  noteRecord.channels['public-post'].attempts[0].note = 'replacement result note';
  assert.ok(errorsFor(rewrittenNote).some((error) => error.includes('lost protected attempt details')));

  const addedResultUrl = structuredClone(data);
  const urlRecord = addedResultUrl.researchAttempts.find((item) => item.id === 'candidate-bigrock-sohtea-bom-2026-08-17');
  urlRecord.channels['public-post'].attempts[0].result_url = 'https://example.com/public-result';
  assert.ok(errorsFor(addedResultUrl).some((error) => error.includes('lost protected attempt details')));

  const rewrittenResolution = structuredClone(data);
  const resolutionRecord = rewrittenResolution.researchAttempts.find((item) => item.id === 'variant-elves-falath-r7170-cockpit-2026-08-17');
  resolutionRecord.resolution.note = 'Unexpected resolution rewrite.';
  assert.ok(errorsFor(rewrittenResolution).some((error) => error.includes('lost protected resolution details')));
});

test('new information requires monotonic baseline acceptance', () => {
  const mutated = structuredClone(data);
  mutated.candidates[0].facts = { newly_verified_weight_g: 9000 };
  const current = createCoverageSnapshot(mutated);
  assert.ok(validateCoverage(mutated, current, baseline, retirements, { requireCurrentBaseline: true })
    .some((error) => error.includes('coverage baseline is stale')));
  const merged = mergeCoverageBaseline(baseline, current, '2026-08-17');
  assert.deepEqual(validateCoverage(mutated, current, merged, retirements), []);
});

test('acceptance never erases prior identities or lowers image quality', () => {
  const mutated = structuredClone(data);
  mutated.images = mutated.images.filter((image) => image.id !== 'quick-pro-er-one-primary-image');
  const replacement = structuredClone(data.images.find((image) => image.id === 'quick-pro-gr-one-grx-di2-primary-image'));
  replacement.id = 'quick-pro-er-one-replacement-image';
  replacement.candidate_id = 'quick-pro-er-one';
  replacement.subject_accuracy = 'same-platform';
  mutated.images.push(replacement);
  const merged = mergeCoverageBaseline(baseline, createCoverageSnapshot(mutated), '2026-08-17');
  assert.ok(merged.records.images.includes('quick-pro-er-one-primary-image'));
  assert.equal(merged.images['quick-pro-er-one-primary-image'].minimum_accuracy_rank, 4);
  assert.equal(merged.image_targets['candidates:quick-pro-er-one'].minimum_accuracy_rank, 4);
});

test('hand editing the baseline downward is rejected against the base commit', () => {
  const edited = structuredClone(baseline);
  edited.records.images = edited.records.images.filter((id) => id !== 'quick-pro-er-one-primary-image');
  delete edited.fields.images['quick-pro-er-one-primary-image'];
  delete edited.relationships.images['quick-pro-er-one-primary-image'];
  delete edited.images['quick-pro-er-one-primary-image'];
  edited.image_targets['candidates:quick-pro-er-one'].minimum_accuracy_rank = 1;
  edited.image_targets['candidates:quick-pro-er-one'].minimum_source_tier = 1;
  edited.image_targets['candidates:quick-pro-er-one'].remote_required = false;
  const errors = validateBaselineTransition(baseline, edited);
  assert.ok(errors.some((error) => error.includes('erased protected identity images:quick-pro-er-one-primary-image')));
  assert.ok(errors.some((error) => error.includes('lowered target image accuracy candidates:quick-pro-er-one')));
  assert.ok(errors.some((error) => error.includes('lowered target image source tier candidates:quick-pro-er-one')));
  assert.ok(errors.some((error) => error.includes('removed target remote-image protection candidates:quick-pro-er-one')));
});

test('documented replacements authorize record retirement but not target-quality loss', () => {
  const mutated = structuredClone(data);
  mutated.images = mutated.images.filter((image) => image.id !== 'quick-pro-er-one-primary-image');
  const replacement = structuredClone(data.images.find((image) => image.id === 'quick-pro-gr-one-grx-di2-primary-image'));
  replacement.id = 'quick-pro-er-one-replacement-image';
  replacement.candidate_id = 'quick-pro-er-one';
  replacement.source_id = 'quick-pro-er-one-ultegra-official-2026-08-17';
  replacement.subject_accuracy = 'exact-variant';
  mutated.images.push(replacement);
  const retirement = [...retirements, {
    id: 'replace-quick-pro-er-one-image-2026-08-17',
    record_type: 'images',
    record_id: 'quick-pro-er-one-primary-image',
    action: 'replace',
    reason: 'The newly named record preserves the same exact official product image.',
    evidence_source_ids: ['quick-pro-er-one-ultegra-official-2026-08-17'],
    replacement: { record_type: 'images', record_id: 'quick-pro-er-one-replacement-image' },
    reviewed_at: '2026-08-17'
  }];
  assert.deepEqual(errorsFor(mutated, baseline, retirement, { requireCurrentBaseline: false }), []);

  replacement.subject_accuracy = 'same-platform';
  assert.ok(errorsFor(mutated, baseline, retirement, { requireCurrentBaseline: false })
    .some((error) => error.includes('no longer has a primary image at its protected quality')));
});
