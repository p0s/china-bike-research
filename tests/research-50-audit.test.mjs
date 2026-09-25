import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset } from '../src/lib/data.mjs';
import { RESEARCH_APPROACH_AREAS } from '../src/lib/research-approach-areas.mjs';
import { auditResearch50Campaign } from '../scripts/research-50-audit.mjs';

const campaign = JSON.parse(fs.readFileSync(
  new URL('../data/research-campaigns/all-gaps-50-approaches-2026-08-29.json', import.meta.url),
  'utf8'
));

test('the all-gaps campaign freezes every information field and 50 distinct areas', () => {
  assert.equal(campaign.minimum_distinct_approaches, 50);
  assert.equal(campaign.approach_area_ids.length, 50);
  assert.equal(new Set(campaign.approach_area_ids).size, 50);
  assert.deepEqual(campaign.approach_area_ids, RESEARCH_APPROACH_AREAS.map((area) => area.id));
  assert.equal(campaign.field_count, campaign.fields.length);
  assert.equal(new Set(campaign.fields.map((field) => field.key)).size, campaign.field_count);
  assert.ok(campaign.fields.every((field) => !field.initial_gap_codes.includes('candidate-blockers')));
  assert.ok(campaign.fields.every((field) => !field.initial_gap_codes.includes('image-health-unverified')));
});

test('the 50-approach audit retains new live gaps until the campaign is extended', () => {
  const report = auditResearch50Campaign(campaign, loadDataset(), '2026-08-29');
  assert.equal(report.counts.fields, campaign.field_count);
  assert.equal(report.counts.complete + report.counts.incomplete, campaign.field_count);
  const newTargets = ['airwolf-yf-r003', 'mondince-fm316', 'seka-exaero-road', 'seraph-tt-x68-new-udh', 'twitter-gravel-v3', 'velobuild-cx-002-2023', 'xlab-rs9'];
  const expectedTargets = newTargets;
  assert.equal(report.counts.uncovered_current_fields, 12);
  assert.deepEqual([...new Set(report.uncovered_current_fields.map((field) => field.target.record_id))].sort(), expectedTargets.sort());
  assert.ok(!report.uncovered_current_fields.some((field) => field.target.record_id === 'sava-gelaro' && field.field === 'bottom-bracket'));
  assert.ok(report.incomplete.every((field) => field.approach_applications < 50 || field.distinct_approach_areas < 50));
});

test('a formally scoped follow-up does not erase its completed 50-approach campaign coverage', () => {
  const beforeData = structuredClone(loadDataset());
  beforeData.researchAttempts = beforeData.researchAttempts.filter((record) =>
    record.id !== 'candidate-sava-f20-hawkeye-price-recheck-2026-09-24');
  const beforeReport = auditResearch50Campaign(campaign, beforeData, '2026-09-24');
  const data = structuredClone(loadDataset());
  const predecessor = data.researchAttempts.find((record) =>
    record.id === 'candidate-sava-f20-hawkeye-price-2026-09-01');
  const followUp = data.researchAttempts.find((record) =>
    record.id === 'candidate-sava-f20-hawkeye-price-recheck-2026-09-24');
  assert.ok(predecessor);
  assert.ok(followUp);

  const report = auditResearch50Campaign(campaign, data, '2026-09-24');
  assert.equal(report.counts.complete, beforeReport.counts.complete);
  assert.equal(report.counts.approach_applications, beforeReport.counts.approach_applications);
  assert.ok(!report.incomplete.some((field) => field.key === 'candidate:sava-f20-hawkeye:price'));
});
