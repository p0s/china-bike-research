import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGapReport } from '../scripts/data-gaps.mjs';
import { loadDataset } from '../src/lib/data.mjs';

test('default gap report is a finite active-shortlist plan of actionable critical evidence', () => {
  const report = buildGapReport(loadDataset(), '2026-08-16');
  assert.equal(report.as_of, '2026-08-16');
  assert.equal(report.mode, 'active-shortlist');
  assert.ok(report.scope.published_variants > 0);
  assert.ok(report.scope.candidates > 0);
  assert.ok(report.scope.candidates < report.scope.dataset.candidates);
  assert.ok(report.records.length <= report.default_limits.models);
  assert.ok(report.records.reduce((sum, record) => sum + record.gaps.length, 0) <= report.default_limits.atomic_gaps);
  assert.ok(report.records.every((record) => record.gaps.length > 0));
  assert.ok(report.records.every((record) => record.files.length > 0));
  assert.ok(report.records.every((record) => record.gaps.every((gap) =>
    gap.queue_category === 'research-evidence' && gap.decision_critical && ['unattempted', 'retry-due'].includes(gap.actionability))));
  for (let index = 1; index < report.records.length; index += 1) {
    assert.ok(report.records[index - 1].queue_score >= report.records[index].queue_score);
  }
});

test('--all retains the complete long tail and keeps queue categories separate', () => {
  const report = buildGapReport(loadDataset(), '2026-08-28', { all: true });
  assert.equal(report.mode, 'all');
  assert.equal(report.scope.candidates, report.scope.dataset.candidates);
  assert.equal(report.scope.published_variants, report.scope.dataset.published_variants);
  assert.equal(report.records.length, report.queues['research-evidence'].record_count);
  for (const [category, queue] of Object.entries(report.queues)) {
    assert.ok(queue.records.every((record) => record.gaps.every((gap) => gap.queue_category === category)));
  }
  assert.ok(report.queues['publication-gate'].gap_counts['candidate-blockers'] > 0);
  assert.ok(report.queues['operational-check'].gap_counts['image-health-unverified'] > 0);
  assert.equal(report.gap_counts['candidate-blockers'], undefined);
  assert.equal(report.gap_counts['image-health-unverified'], undefined);
});

test('gap report exposes the latest atomic research status without hiding the gap', () => {
  const data = structuredClone(loadDataset());
  data.researchAttempts = [{
    id: 'lightcarbon-speedz-complete-geometry-2026-08-17',
    target: { record_type: 'variant', record_id: 'lightcarbon-speedz-complete' },
    field: 'geometry',
    priority: 'high',
    searched_at: '2026-08-17',
    required_channels: ['web'],
    channels: { web: { status: 'temporarily-exhausted', attempts: [] } },
    status: 'temporarily-exhausted',
    retry_after: '2026-11-17',
    notes: 'Fixture for gap report state.'
  }];
  const report = buildGapReport(data, '2026-08-17', { all: true });
  const record = report.records.find((item) => item.id === 'lightcarbon-speedz-complete');
  const gap = record.gaps.find((item) => item.code === 'geometry-missing');
  assert.equal(gap.research.status, 'temporarily-exhausted');
  assert.equal(report.research_status_counts['temporarily-exhausted'], 1);
});

test('gap report recognizes an exact frame-weight claim stored on a complete-bike variant', () => {
  const report = buildGapReport(loadDataset(), '2026-08-18', { all: true });
  const record = report.records.find((item) => item.id === 'elves-falath-r7170');
  assert.ok(record);
  assert.doesNotMatch(JSON.stringify(record.gaps), /frame-weight-missing/);
});

test('gap report always exposes decision-critical trim gaps for complete-bike candidates', () => {
  const data = structuredClone(loadDataset());
  const candidate = data.candidates.find((item) => item.type === 'complete-bike');
  candidate.facts = {};
  const record = buildGapReport(data, '2026-08-27', { all: true }).records.find((item) => item.id === candidate.id);
  const codes = new Set(record.gaps.map((gap) => gap.code));
  assert.ok(codes.has('complete-weight-missing'));
  assert.ok(codes.has('clearance-unverified'));
  assert.ok(codes.has('drivetrain-missing'));
});

test('gap report asks frameset candidates for frame weight and clearance, not complete-bike fields', () => {
  const data = structuredClone(loadDataset());
  const candidate = data.candidates.find((item) => item.type === 'frameset');
  candidate.facts = {};
  const record = buildGapReport(data, '2026-08-27', { all: true }).records.find((item) => item.id === candidate.id);
  const codes = new Set(record.gaps.map((gap) => gap.code));
  assert.ok(codes.has('frame-weight-missing'));
  assert.ok(codes.has('clearance-unverified'));
  assert.ok(!codes.has('complete-weight-missing'));
  assert.ok(!codes.has('drivetrain-missing'));
});

test('gap report distinguishes a fitted tire from verified maximum clearance', () => {
  const data = structuredClone(loadDataset());
  const platform = data.platforms.find((item) => item.id === 'camp-gx700');
  platform.tire_clearance = {
    eligibility: 'pass',
    stock_nominal_mm: 45,
    maximum_unverified: true,
    evidence: 'official',
    note: 'Fixture stock tire only.'
  };
  const record = buildGapReport(data, '2026-08-27', { all: true }).records.find((item) => item.platform_id === platform.id);
  assert.ok(record.gaps.some((gap) => gap.code === 'clearance-unverified'));
});

test('gap report preserves weight and selected-price basis as separate research targets', () => {
  const data = structuredClone(loadDataset());
  const candidate = data.candidates.find((item) => item.type === 'complete-bike' && item.observed_price);
  candidate.facts = { ...(candidate.facts ?? {}), complete_weight_g: 8000, drivetrain: 'Shimano 105 Di2 2×12', tire_clearance_mm: 32 };
  delete candidate.facts.complete_weight_basis;
  delete candidate.observed_price.price_basis;
  const record = buildGapReport(data, '2026-08-27', { all: true }).records.find((item) => item.id === candidate.id);
  const codes = new Set(record.gaps.map((gap) => gap.code));
  assert.ok(codes.has('complete-weight-basis-missing'));
  assert.ok(codes.has('price-basis-missing'));
});

test('a coherent historic reference trim does not hide a current observed price from the gap ledger', () => {
  const data = structuredClone(loadDataset());
  const candidate = data.candidates.find((item) => item.id === 'pardus-uragano-evo');
  candidate.reference_price_kind = 'official';
  const record = buildGapReport(data, '2026-08-27', { all: true }).records.find((item) => item.id === candidate.id);
  assert.ok(record);
  assert.ok(!record.gaps.some((gap) => gap.code === 'price-not-observed'));
  assert.ok(!record.gaps.some((gap) => gap.code === 'price-basis-missing'));
});

test('gap report always seeks exact frame material details and meaningful stiffness evidence', () => {
  const data = structuredClone(loadDataset());
  const platform = data.platforms.find((item) => item.frame?.material === 'carbon');
  platform.frame.material = 'carbon';
  delete platform.frame.claimed_fiber;
  delete platform.frame.material_grade;
  delete platform.frame.construction;
  delete platform.frame.stiffness_evidence;
  const records = buildGapReport(data, '2026-08-27', { all: true }).records.filter((item) => item.platform_id === platform.id);
  assert.ok(records.length > 0);
  assert.ok(records.every((record) => record.gaps.some((gap) => gap.code === 'frame-material-detail-missing')));
  assert.ok(records.every((record) => record.gaps.some((gap) => gap.code === 'stiffness-evidence-missing')));
});

test('candidate frame construction and stiffness evidence close their separate gaps', () => {
  const data = structuredClone(loadDataset());
  const candidate = data.candidates.find((item) => item.type === 'complete-bike');
  candidate.facts = { ...(candidate.facts ?? {}), frame_material: 'Toray T800 and M40X carbon', stiffness_evidence: 'Manufacturer comparative torsional test; exact protocol recorded in the linked source.' };
  const record = buildGapReport(data, '2026-08-27', { all: true }).records.find((item) => item.id === candidate.id);
  assert.ok(!record.gaps.some((gap) => gap.code === 'frame-material-detail-missing'));
  assert.ok(!record.gaps.some((gap) => gap.code === 'stiffness-evidence-missing'));
});

function retryAttempt(recordId, retryAfter, status = 'temporarily-exhausted') {
  return {
    id: `${recordId}-complete-weight-retry-fixture`,
    target: { record_type: 'variant', record_id: recordId },
    field: 'complete-weight',
    priority: 'high',
    searched_at: '2026-08-17',
    required_channels: ['public-post', 'web'],
    channels: {},
    status,
    retry_after: retryAfter,
    notes: 'Fixture for finite planning.'
  };
}

test('default planning includes an explicit retry only when it is due', () => {
  const data = structuredClone(loadDataset());
  data.researchAttempts = [retryAttempt('lightcarbon-speedz-complete', '2026-11-17')];
  const before = buildGapReport(data, '2026-11-16');
  assert.ok(!before.records.some((record) => record.id === 'lightcarbon-speedz-complete' &&
    record.gaps.some((gap) => gap.code === 'complete-weight-missing')));
  const due = buildGapReport(data, '2026-11-17');
  const retry = due.records.find((record) => record.id === 'lightcarbon-speedz-complete')?.gaps
    .find((gap) => gap.code === 'complete-weight-missing');
  assert.equal(retry?.actionability, 'retry-due');
});

test('metrics disclose candidate and published denominators and deterministic throughput inputs', () => {
  const report = buildGapReport(loadDataset(), '2026-08-28', {
    throughput: { modelsCompleted: 3, hours: 1.5 }
  });
  const denominator = report.metrics.denominator;
  assert.equal(denominator.total_models, denominator.record_types.published_variants + denominator.record_types.candidates);
  assert.equal(report.metrics.decision_ready_models.denominator_total, denominator.total_models);
  assert.equal(report.metrics.critical_field_coverage.fields['drivetrain-and-bom'].denominator_by_record_type.candidates > 0, true);
  assert.equal(report.metrics.throughput.decision_ready_models_per_hour, 2);
  assert.deepEqual(report.metrics.throughput.inputs, {
    decision_ready_models_completed: 3,
    elapsed_research_hours: 1.5
  });
});

test('stiffness stays visible but becomes critical only for an explicit finalist', () => {
  const data = structuredClone(loadDataset());
  const candidate = data.candidates.find((item) => item.research_priority === 'high');
  candidate.research_finalist = true;
  delete candidate.facts?.stiffness_evidence;
  const report = buildGapReport(data, '2026-08-28', { all: true });
  assert.equal(report.metrics.critical_field_coverage.fields['stiffness-evidence'].required, 1);
  assert.equal(report.metrics.critical_field_coverage.fields['stiffness-evidence'].covered, 0);
  const record = report.records.find((item) => item.id === candidate.id);
  const stiffness = record.gaps.find((gap) => gap.code === 'stiffness-evidence-missing');
  assert.equal(stiffness.decision_critical, true);
});
