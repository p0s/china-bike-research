import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGapReport } from './data-gaps.mjs';
import { joinCatalogCandidates, loadDataset } from '../src/lib/data.mjs';

const nonAtomicCodes = new Set(['candidate-blockers', 'image-health-unverified']);
const bucketNames = ['ready', 'evidence-found', 'deferred', 'blocked', 'conflicted'];
const criticalAttemptFields = new Set([
  'price', 'complete-weight', 'frame-weight', 'tire-clearance', 'drivetrain', 'bom',
  'brakes', 'wheels', 'tires', 'cockpit', 'frame-material', 'purchase-route', 'image'
]);

export function buildResearchQueue(data = loadDataset(), asOf = new Date().toISOString().slice(0, 10), options = {}) {
  const all = options.all === true;
  const report = buildGapReport(data, asOf, { all });
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
  const activeCandidateIds = new Set(joinCatalogCandidates(data)
    .filter((entry) => ['high', 'medium'].includes(entry.candidate.research_priority))
    .map((entry) => entry.candidate.id));
  const publishedVariantIds = new Set(data.variants.map((record) => record.id));
  const publishedPlatformIds = new Set(data.variants.map((record) => record.platform_id));
  const isActiveTarget = (attempt) => attempt.target.record_type === 'candidate'
    ? activeCandidateIds.has(attempt.target.record_id)
    : attempt.target.record_type === 'variant'
      ? publishedVariantIds.has(attempt.target.record_id)
      : publishedPlatformIds.has(attempt.target.record_id);
  for (const attempt of data.researchAttempts ?? []) {
    if (representedAttemptIds.has(attempt.id)) continue;
    const retryDue = attempt.status !== 'found' && attempt.retry_after && attempt.retry_after <= asOf;
    if (!all && (!isActiveTarget(attempt) || !criticalAttemptFields.has(attempt.field) || !retryDue)) continue;
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
    mode: all ? 'all' : 'active-shortlist',
    counts: Object.fromEntries(Object.entries(buckets).map(([key, items]) => [key, items.length])),
    ...buckets
  };
}

export function filterResearchQueue(queue, data, options = {}) {
  const channel = options.channel ?? null;
  const channelStatus = options.channelStatus ?? null;
  const limit = options.limit ?? null;
  if (!channel && !channelStatus && limit == null) return queue;
  if (channelStatus && !channel) throw new Error('--channel-status requires --channel');
  if (channel && !['public-post', 'web'].includes(channel)) throw new Error(`Unsupported channel: ${channel}`);
  if (limit != null && (!Number.isInteger(limit) || limit < 1)) throw new Error('--limit must be a positive integer');

  const attemptsById = new Map((data.researchAttempts ?? []).map((attempt) => [attempt.id, attempt]));
  let remaining = limit ?? Number.POSITIVE_INFINITY;
  const filtered = {};
  for (const bucketName of bucketNames) {
    filtered[bucketName] = [];
    for (const item of queue[bucketName]) {
      if (remaining === 0) break;
      const attempt = item.attempt_id ? attemptsById.get(item.attempt_id) : null;
      const status = channel ? (attempt?.channels?.[channel]?.status ?? 'missing-ledger') : null;
      if (channelStatus && status !== channelStatus) continue;
      filtered[bucketName].push(channel ? { ...item, channel_status: status } : item);
      remaining -= 1;
    }
  }
  return {
    as_of: queue.as_of,
    mode: queue.mode,
    filters: {
      ...(channel ? { channel } : {}),
      ...(channelStatus ? { channel_status: channelStatus } : {}),
      ...(limit != null ? { limit } : {})
    },
    counts: Object.fromEntries(bucketNames.map((name) => [name, filtered[name].length])),
    ...filtered
  };
}

function argumentValue(args, name) {
  const equals = args.find((arg) => arg.startsWith(`${name}=`));
  if (equals) return equals.slice(name.length + 1);
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1];
}

function main() {
  const asOf = process.env.DATA_GAPS_AS_OF ?? new Date().toISOString().slice(0, 10);
  const data = loadDataset();
  const channel = argumentValue(process.argv.slice(2), '--channel');
  const channelStatus = argumentValue(process.argv.slice(2), '--channel-status');
  const limitValue = argumentValue(process.argv.slice(2), '--limit');
  const limit = limitValue == null ? null : Number(limitValue);
  const queue = buildResearchQueue(data, asOf, { all: process.argv.includes('--all') });
  console.log(JSON.stringify(filterResearchQueue(queue, data, { channel, channelStatus, limit }), null, 2));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
