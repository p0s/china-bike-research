import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGapReport } from '../scripts/data-gaps.mjs';
import { loadDataset } from '../src/lib/data.mjs';

test('gap report ranks actionable published and candidate records without mutating data', () => {
  const report = buildGapReport(loadDataset(), '2026-08-16');
  assert.equal(report.as_of, '2026-08-16');
  assert.ok(report.scope.published_variants > 0);
  assert.ok(report.scope.candidates > 0);
  assert.ok(report.records.some((record) => record.platform_id === 'lightcarbon-lcg071s-pro'));
  assert.ok(report.records.some((record) => record.id === 'trinx-gtr-c6'));
  assert.ok(report.records.every((record) => record.gaps.length > 0));
  assert.ok(report.records.every((record) => record.files.length > 0));
  for (let index = 1; index < report.records.length; index += 1) {
    assert.ok(report.records[index - 1].priority_score >= report.records[index].priority_score);
  }
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
  const report = buildGapReport(data, '2026-08-17');
  const record = report.records.find((item) => item.id === 'lightcarbon-speedz-complete');
  const gap = record.gaps.find((item) => item.code === 'geometry-missing');
  assert.equal(gap.research.status, 'temporarily-exhausted');
  assert.equal(report.research_status_counts['temporarily-exhausted'], 1);
});

test('gap report recognizes an exact frame-weight claim stored on a complete-bike variant', () => {
  const report = buildGapReport(loadDataset(), '2026-08-18');
  const record = report.records.find((item) => item.id === 'elves-falath-r7170');
  assert.ok(record);
  assert.doesNotMatch(JSON.stringify(record.gaps), /frame-weight-missing/);
});

test('gap report always exposes decision-critical trim gaps for complete-bike candidates', () => {
  const data = structuredClone(loadDataset());
  const candidate = data.candidates.find((item) => item.type === 'complete-bike');
  candidate.facts = {};
  const record = buildGapReport(data, '2026-08-27').records.find((item) => item.id === candidate.id);
  const codes = new Set(record.gaps.map((gap) => gap.code));
  assert.ok(codes.has('complete-weight-missing'));
  assert.ok(codes.has('clearance-unverified'));
  assert.ok(codes.has('drivetrain-missing'));
});

test('gap report asks frameset candidates for frame weight and clearance, not complete-bike fields', () => {
  const data = structuredClone(loadDataset());
  const candidate = data.candidates.find((item) => item.type === 'frameset');
  candidate.facts = {};
  const record = buildGapReport(data, '2026-08-27').records.find((item) => item.id === candidate.id);
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
  const record = buildGapReport(data, '2026-08-27').records.find((item) => item.platform_id === platform.id);
  assert.ok(record.gaps.some((gap) => gap.code === 'clearance-unverified'));
});

test('gap report preserves weight and selected-price basis as separate research targets', () => {
  const data = structuredClone(loadDataset());
  const candidate = data.candidates.find((item) => item.type === 'complete-bike' && item.observed_price);
  candidate.facts = { ...(candidate.facts ?? {}), complete_weight_g: 8000, drivetrain: 'Shimano 105 Di2 2×12', tire_clearance_mm: 32 };
  delete candidate.facts.complete_weight_basis;
  delete candidate.observed_price.price_basis;
  const record = buildGapReport(data, '2026-08-27').records.find((item) => item.id === candidate.id);
  const codes = new Set(record.gaps.map((gap) => gap.code));
  assert.ok(codes.has('complete-weight-basis-missing'));
  assert.ok(codes.has('price-basis-missing'));
});
