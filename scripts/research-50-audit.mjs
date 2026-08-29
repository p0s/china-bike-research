import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDataset } from '../src/lib/data.mjs';
import { latestResearchAttemptIndex } from '../src/lib/research-attempts.mjs';
import {
  EXTENDED_RESEARCH_APPROACH_REQUIREMENT,
  RESEARCH_APPROACH_AREAS
} from '../src/lib/research-approach-areas.mjs';
import { buildGapReport } from './data-gaps.mjs';

const root = path.resolve(import.meta.dirname, '..');
const campaignDirectory = path.join(root, 'data/research-campaigns');
const nonInformationGapCodes = new Set(['candidate-blockers', 'image-health-unverified']);
const fieldByGapCode = {
  'image-missing': 'image',
  'image-exactness': 'image',
  'price-missing': 'price',
  'price-not-observed': 'price',
  'price-reference-range': 'price',
  'price-historical': 'price',
  'purchase-route': 'purchase-route',
  'geometry-missing': 'geometry',
  'frame-weight-missing': 'frame-weight',
  'frame-weight-basis-missing': 'frame-weight',
  'complete-weight-missing': 'complete-weight',
  'complete-weight-basis-missing': 'complete-weight',
  'drivetrain-missing': 'drivetrain',
  'price-basis-missing': 'price',
  'clearance-unverified': 'tire-clearance',
  'bottom-bracket-missing': 'bottom-bracket',
  'frame-material-detail-missing': 'frame-material',
  'stiffness-evidence-missing': 'frame-stiffness',
  'bom-incomplete': 'bom',
  'support-warranty': 'warranty-support',
  'source-missing': 'identity-source'
};
const platformFields = new Set([
  'geometry',
  'frame-weight',
  'tire-clearance',
  'bottom-bracket',
  'frame-material',
  'frame-stiffness',
  'warranty-support'
]);

function campaignField(record, gap) {
  if (nonInformationGapCodes.has(gap.code)) return null;
  const field = fieldByGapCode[gap.code];
  if (!field) return null;
  const recordType = record.record_type === 'candidate'
    ? 'candidate'
    : platformFields.has(field) ? 'platform' : 'variant';
  const recordId = recordType === 'platform' ? record.platform_id : record.id;
  return {
    key: `${recordType}:${recordId}:${field}`,
    target: { record_type: recordType, record_id: recordId },
    field,
    name: record.name,
    record_ids: [record.id],
    initial_gap_codes: [gap.code],
    priority_score: record.priority_score + gap.score
  };
}

export function buildResearch50Campaign(data = loadDataset(), options = {}) {
  const asOf = options.asOf ?? new Date().toISOString().slice(0, 10);
  const campaignId = options.campaignId;
  const baseSha = options.baseSha;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(campaignId ?? '')) throw new Error('campaignId must be lowercase kebab-case');
  if (!/^[a-f0-9]{40}$/.test(baseSha ?? '')) throw new Error('baseSha must be a full Git commit SHA');
  const fields = new Map();
  for (const record of buildGapReport(data, asOf).records) {
    for (const gap of record.gaps) {
      const item = campaignField(record, gap);
      if (!item) continue;
      const existing = fields.get(item.key);
      if (!existing) {
        fields.set(item.key, item);
        continue;
      }
      existing.record_ids = [...new Set([...existing.record_ids, ...item.record_ids])].sort();
      existing.initial_gap_codes = [...new Set([...existing.initial_gap_codes, ...item.initial_gap_codes])].sort();
      existing.priority_score = Math.max(existing.priority_score, item.priority_score);
    }
  }
  return {
    id: campaignId,
    created_at: asOf,
    base_sha: baseSha,
    minimum_distinct_approaches: EXTENDED_RESEARCH_APPROACH_REQUIREMENT,
    approach_area_ids: RESEARCH_APPROACH_AREAS.map((area) => area.id),
    field_count: fields.size,
    fields: [...fields.values()].sort((a, b) => b.priority_score - a.priority_score || a.key.localeCompare(b.key))
  };
}

function attemptCoverage(attempt) {
  const applications = (attempt?.required_channels ?? []).flatMap((channel) => attempt.channels?.[channel]?.attempts ?? []);
  return {
    applications: applications.length,
    areas: new Set(applications.map((entry) => entry.approach_area_id).filter(Boolean)).size,
    requirement: attempt?.minimum_distinct_approaches ?? null
  };
}

export function auditResearch50Campaign(campaign, data = loadDataset(), asOf = new Date().toISOString().slice(0, 10)) {
  const attemptIndex = latestResearchAttemptIndex(data.researchAttempts ?? []);
  const currentFields = new Map();
  for (const record of buildGapReport(data, asOf).records) {
    for (const gap of record.gaps) {
      const item = campaignField(record, gap);
      if (item) currentFields.set(item.key, item);
    }
  }
  const campaignKeys = new Set(campaign.fields.map((field) => field.key));
  const fields = campaign.fields.map((field) => {
    const attempt = attemptIndex.get(field.key) ?? null;
    const coverage = attemptCoverage(attempt);
    const complete = coverage.requirement === campaign.minimum_distinct_approaches &&
      coverage.applications >= campaign.minimum_distinct_approaches &&
      coverage.areas >= campaign.minimum_distinct_approaches;
    return {
      ...field,
      current_gap: currentFields.has(field.key),
      attempt_id: attempt?.id ?? null,
      attempt_status: attempt?.status ?? 'missing-ledger',
      approach_applications: coverage.applications,
      distinct_approach_areas: coverage.areas,
      complete
    };
  });
  const uncoveredCurrentFields = [...currentFields.values()].filter((field) => !campaignKeys.has(field.key));
  return {
    campaign_id: campaign.id,
    as_of: asOf,
    minimum_distinct_approaches: campaign.minimum_distinct_approaches,
    counts: {
      fields: fields.length,
      complete: fields.filter((field) => field.complete).length,
      incomplete: fields.filter((field) => !field.complete).length,
      current_gaps: fields.filter((field) => field.current_gap).length,
      resolved_catalog_fields: fields.filter((field) => !field.current_gap).length,
      missing_ledgers: fields.filter((field) => field.attempt_id === null).length,
      uncovered_current_fields: uncoveredCurrentFields.length,
      approach_applications: fields.reduce((sum, field) => sum + field.approach_applications, 0)
    },
    incomplete: fields.filter((field) => !field.complete),
    uncovered_current_fields: uncoveredCurrentFields
  };
}

function argumentValue(args, name) {
  const equals = args.find((arg) => arg.startsWith(`${name}=`));
  if (equals) return equals.slice(name.length + 1);
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1];
}

function campaignPath(id) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id ?? '')) throw new Error('campaign id must be lowercase kebab-case');
  return path.join(campaignDirectory, `${id}.json`);
}

function main() {
  const args = process.argv.slice(2);
  const asOf = process.env.DATA_GAPS_AS_OF ?? new Date().toISOString().slice(0, 10);
  const campaignId = argumentValue(args, '--campaign');
  if (args.includes('--create')) {
    const campaign = buildResearch50Campaign(loadDataset(), {
      asOf,
      campaignId,
      baseSha: argumentValue(args, '--base-sha')
    });
    fs.mkdirSync(campaignDirectory, { recursive: true });
    const destination = campaignPath(campaign.id);
    if (fs.existsSync(destination)) throw new Error(`campaign already exists: ${destination}`);
    fs.writeFileSync(destination, `${JSON.stringify(campaign, null, 2)}\n`, { flag: 'wx' });
    console.log(`Created ${path.relative(root, destination)} with ${campaign.field_count} fields.`);
    return;
  }
  const campaign = JSON.parse(fs.readFileSync(campaignPath(campaignId), 'utf8'));
  const report = auditResearch50Campaign(campaign, loadDataset(), asOf);
  console.log(JSON.stringify(args.includes('--full') ? report : { ...report, incomplete: report.incomplete.slice(0, 25) }, null, 2));
  if (args.includes('--strict') && (report.counts.incomplete > 0 || report.counts.uncovered_current_fields > 0)) process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
