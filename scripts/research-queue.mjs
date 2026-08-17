import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGapReport } from './data-gaps.mjs';
import { loadDataset } from '../src/lib/data.mjs';

const nonAtomicCodes = new Set(['candidate-blockers', 'image-health-unverified']);

export function buildResearchQueue(data = loadDataset(), asOf = new Date().toISOString().slice(0, 10)) {
  const report = buildGapReport(data, asOf);
  const representedAttemptIds = new Set();
  const buckets = {
    ready: [],
    'evidence-found': [],
    deferred: [],
    blocked: [],
    conflicted: []
  };
  const addToBucket = (item, status) => {
    if (status === 'found') buckets['evidence-found'].push(item);
    else if (status === 'temporarily-exhausted' && item.retry_after > asOf) buckets.deferred.push(item);
    else if (status === 'blocked') buckets.blocked.push(item);
    else if (status === 'conflicted') buckets.conflicted.push(item);
    else buckets.ready.push(item);
  };
  for (const record of report.records) {
    for (const gap of record.gaps) {
      if (nonAtomicCodes.has(gap.code)) continue;
      const item = {
        record_type: record.record_type,
        record_id: record.id,
        name: record.name,
        gap: gap.code,
        label: gap.label,
        score: record.priority_score + gap.score,
        attempt_id: gap.research?.attempt_id ?? null,
        searched_at: gap.research?.searched_at ?? null,
        retry_after: gap.research?.retry_after ?? null
      };
      const status = gap.research?.status ?? 'open';
      if (item.attempt_id) representedAttemptIds.add(item.attempt_id);
      addToBucket(item, status);
    }
  }

  const names = {
    candidate: new Map(data.candidates.map((record) => [record.id, record.name])),
    platform: new Map(data.platforms.map((record) => [record.id, record.name])),
    variant: new Map(data.variants.map((record) => [record.id, record.name]))
  };
  const priorityScores = { high: 100, medium: 60, low: 30 };
  for (const attempt of data.researchAttempts ?? []) {
    if (representedAttemptIds.has(attempt.id)) continue;
    const item = {
      record_type: attempt.target.record_type,
      record_id: attempt.target.record_id,
      name: names[attempt.target.record_type]?.get(attempt.target.record_id) ?? attempt.target.record_id,
      gap: attempt.field,
      label: `Atomic research field: ${attempt.field.replaceAll('-', ' ')}`,
      score: priorityScores[attempt.priority] ?? 0,
      attempt_id: attempt.id,
      searched_at: attempt.searched_at,
      retry_after: attempt.retry_after ?? null,
      ledger_only: true
    };
    addToBucket(item, attempt.status);
  }
  for (const items of Object.values(buckets)) items.sort((a, b) => b.score - a.score || a.record_id.localeCompare(b.record_id) || a.gap.localeCompare(b.gap));
  return {
    as_of: asOf,
    counts: Object.fromEntries(Object.entries(buckets).map(([key, items]) => [key, items.length])),
    ...buckets
  };
}

function main() {
  const asOf = process.env.DATA_GAPS_AS_OF ?? new Date().toISOString().slice(0, 10);
  console.log(JSON.stringify(buildResearchQueue(loadDataset(), asOf), null, 2));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
