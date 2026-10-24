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
  const newTargets = ['airwolf-yf-r003', 'camp-gx600-pes', 'mondince-fm316', 'seka-exaero-road', 'seraph-tt-x68-new-udh', 'twitter-gravel-v3', 'twitter-v3-rs-sensah', 'twitter-v3-wheeltop-eds', 'velobuild-cx-002-2023', 'xlab-rs9', 'lightcarbon-lcg071s-pro-frameset', 'girder-arrow-2025-105-di2', 'girder-arrow-pf-105-di2', 'girder-dash-pro-2025-dura-ace-di2', 'girder-dash-2025-ultegra-di2', 'girder-bison-pro-2025-105-di2', 'girder-bison-2025-105', 'girder-fame-pro-2025-dura-ace-di2', 'girder-fame-2025-ultegra-di2', 'girder-corsa-2025-105', 'girder-titanium-road-2025-105-di2', 'girder-titanium-road-2025-apex-1x12', 'girder-titanium-mtb-2025-xt-1x12', 'girder-titanium-gravel-2025-apex-axs', 'girder-aero-team-dura-ace-di2', 'girder-tsar-ultegra-di2', 'girder-dash-pf-ultegra-di2', 'girder-fame-pf-ultegra-r8020', 'girder-bison-pf-ultegra-r8020', 'girder-corsa-pf-105-alloy', 'girder-glare-ultegra-r8000-rim', 'girder-jaunt-apex-axs', 'girder-fame-105-di2-2023-reference', 'girder-dash-105-di2-2023-reference', 'girder-bison-r7020-2023-reference', 'girder-tsar-105-di2-2023-reference', 'girder-dash-frameset-unresolved-generation', 'java-auriga-2027', 'java-siluro6-top-r7120', 'java-volata-r7120', 'pardus-gomera-evo-dura-ace-di2', 'pardus-robin-evo-force-axs', 'pardus-spark-al', 'pardus-spark-evo-gen4-frameset', 'pardus-spark-evo-gen4-ultegra-di2', 'pardus-super-al', 'quick-pro-tr-one-dura-ace-di2', 'seka-exceed-105-di2-dealer-build', 'seka-spear-rdc-frameset', 'seka-spear-standard-105-di2', 'sunpeed-charon-2026', 'sunpeed-galaxy-2026-r7120', 'sunpeed-mars-a-pro-2026', 'sunpeed-space', 'tavelo-arow-disc-frameset', 'tavelo-arow-sl-frameset'];
  const expectedTargets = newTargets;
  // S-PRO now retains platform-only photo scope, leaving exact-package photo identity unresolved.
  // The fresh GX600 official list price does not establish selected-SKU stock.
  // Official-only Girder candidates (two Arrow generations, eleven 2025 builds and eight ROAD-section builds) still lack an observed price and a published clearance; the five XHS-documented historical and frameset references lack clearance and current prices.
  // The 2026-10-24 Taobao/Tmall sweep adds nineteen listing-priced candidates whose weight, clearance and other fields remain open.
  assert.equal(report.counts.uncovered_current_fields, 134);
  assert.ok(report.uncovered_current_fields.some((field) => field.key === 'variant:camp-gx600-pes:purchase-route'));
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
