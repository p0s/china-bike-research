import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset } from '../src/lib/data.mjs';
import { buildResearchQueue, filterResearchQueue } from '../scripts/research-queue.mjs';

function exhaustedAttempt(target) {
  return {
    id: `${target}-geometry-2026-08-17`,
    target: { record_type: 'variant', record_id: target },
    field: 'geometry',
    priority: 'high',
    searched_at: '2026-08-17',
    required_channels: ['public-post', 'web'],
    channels: {
      'public-post': { status: 'temporarily-exhausted', attempts: [] },
      web: { status: 'temporarily-exhausted', attempts: [] }
    },
    status: 'temporarily-exhausted',
    retry_after: '2026-11-17',
    notes: 'Fixture.'
  };
}

test('research queue defers exhausted gaps until their retry date without hiding them', () => {
  const data = structuredClone(loadDataset());
  data.researchAttempts = [exhaustedAttempt('lightcarbon-speedz-complete')];
  const beforeRetry = buildResearchQueue(data, '2026-08-18');
  assert.ok(beforeRetry.deferred.some((item) => item.record_id === 'lightcarbon-speedz-complete' && item.gap === 'geometry-missing'));
  const afterRetry = buildResearchQueue(data, '2026-11-18');
  assert.ok(afterRetry.ready.some((item) => item.record_id === 'lightcarbon-speedz-complete' && item.gap === 'geometry-missing'));
});

test('research queue keeps atomic ledger fields that have no coarse gap-code mapping', () => {
  const data = structuredClone(loadDataset());
  const cockpit = exhaustedAttempt('lightcarbon-speedz-complete');
  cockpit.id = 'lightcarbon-speedz-complete-cockpit-2026-08-17';
  cockpit.field = 'cockpit';
  data.researchAttempts = [cockpit];
  const queue = buildResearchQueue(data, '2026-08-18');
  assert.ok(queue.deferred.some((item) =>
    item.attempt_id === cockpit.id && item.gap === 'cockpit' && item.ledger_only === true));
});

test('research queue can return one channel-specific item for sequential browser work', () => {
  const data = structuredClone(loadDataset());
  const pending = exhaustedAttempt('lightcarbon-speedz-complete');
  pending.status = 'open';
  pending.channels['public-post'] = { status: 'not-run', attempts: [] };
  data.researchAttempts = [pending];
  const queue = buildResearchQueue(data, '2026-08-18');
  const next = filterResearchQueue(queue, data, {
    channel: 'public-post',
    channelStatus: 'not-run',
    limit: 1
  });
  assert.deepEqual(next.filters, { channel: 'public-post', channel_status: 'not-run', limit: 1 });
  assert.equal(Object.values(next.counts).reduce((sum, count) => sum + count, 0), 1);
  assert.equal(next.ready[0].attempt_id, pending.id);
  assert.equal(next.ready[0].channel_status, 'not-run');
});

test('research queue uses the latest retry cycle without duplicating its older field', () => {
  const data = structuredClone(loadDataset());
  const previous = exhaustedAttempt('lightcarbon-speedz-complete');
  previous.id = 'lightcarbon-speedz-complete-cockpit-2026-08-17';
  previous.field = 'cockpit';
  previous.retry_after = '2026-09-20';
  const retry = structuredClone(previous);
  retry.id = 'lightcarbon-speedz-complete-cockpit-2026-09-23';
  retry.searched_at = '2026-09-23';
  retry.retry_of = previous.id;
  retry.retry_reason = 'A newly indexed current manufacturer page justified a focused recheck.';
  retry.retry_after = '2026-10-23';
  retry.channels = {
    'public-post': { status: 'carried-forward', from_attempt_id: previous.id, attempts: [] },
    web: {
      status: 'temporarily-exhausted',
      attempts: [1, 2, 3].map((attempt) => ({
        attempt,
        query: `fresh cockpit query ${attempt}`,
        route: `fresh cockpit route ${attempt}`,
        outcome: 'no-result',
        accessed_at: '2026-09-23',
        note: 'No exact-build cockpit claim was found.'
      }))
    }
  };
  data.researchAttempts = [previous, retry];

  const deferred = buildResearchQueue(data, '2026-09-23').deferred.filter((item) => item.gap === 'cockpit');
  assert.equal(deferred.length, 1);
  assert.equal(deferred[0].attempt_id, retry.id);
  assert.equal(deferred[0].retry_after, '2026-10-23');

  const afterRetry = buildResearchQueue(data, '2026-10-24').ready.filter((item) => item.gap === 'cockpit');
  assert.equal(afterRetry.length, 1);
  assert.equal(afterRetry[0].attempt_id, retry.id);
});

test('research queue omits only explicitly source-reuse-resolved ledger-only fields', () => {
  const data = structuredClone(loadDataset());
  const resolved = exhaustedAttempt('lightcarbon-speedz-complete');
  resolved.id = 'lightcarbon-speedz-complete-resolved-field-2026-08-17';
  resolved.field = 'resolved-field';
  resolved.status = 'found';
  resolved.resolution = {
    kind: 'source-reuse',
    resolved_at: '2026-09-23',
    source_ids: ['example-source'],
    note: 'The accepted exact-model source is already integrated.'
  };
  const unresolved = exhaustedAttempt('lightcarbon-speedz-complete');
  unresolved.id = 'lightcarbon-speedz-complete-unresolved-field-2026-08-17';
  unresolved.field = 'unresolved-field';
  unresolved.status = 'found';
  data.researchAttempts = [resolved, unresolved];

  const queue = buildResearchQueue(data, '2026-09-23');
  assert.ok(!queue['evidence-found'].some((item) => item.attempt_id === resolved.id));
  assert.ok(queue['evidence-found'].some((item) => item.attempt_id === unresolved.id));
});

test('research queue suppresses a rechecked conflict while preserving its unresolved catalog gap', () => {
  const data = structuredClone(loadDataset());
  const attempt = data.researchAttempts.find((record) =>
    record.id === 'candidate-pardus-spark-rs-community-lead-complete-weight-2026-08-30');
  assert.equal(attempt.resolution?.kind, 'conflict-reconfirmed');

  const queue = buildResearchQueue(data, '2026-09-25');
  assert.ok(!queue.conflicted.some((item) => item.attempt_id === attempt.id));
  assert.ok(data.candidates.some((candidate) => candidate.id === attempt.target.record_id));
});

test('research queue keeps a candidate price visible after a later blocked attempt reopens source reuse', () => {
  const data = structuredClone(loadDataset());
  const attempt = data.researchAttempts.find((record) => record.id === 'candidate-seka-exaero-road-price-2026-08-27');
  assert.equal(attempt.resolution?.kind, 'source-reuse');
  const laterAttempt = data.researchAttempts.find((record) => record.id === 'candidate-seka-exaero-road-mainland-observed-price-2026-09-24');
  assert.equal(laterAttempt.status, 'blocked');
  assert.equal(laterAttempt.resolution, undefined);

  const queue = buildResearchQueue(data, '2026-09-24');
  const sekaPrice = bucket => queue[bucket].filter((item) =>
    item.record_id === 'seka-exaero-road' && item.gap === 'price-missing');
  assert.deepEqual(sekaPrice('ready'), []);
  assert.deepEqual(sekaPrice('evidence-found'), []);
  assert.deepEqual(sekaPrice('blocked').map((item) => item.attempt_id), [laterAttempt.id]);
});
