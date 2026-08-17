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
