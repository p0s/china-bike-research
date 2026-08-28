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

test('--all research queue preserves deferred gaps and reopens them on their retry date', () => {
  const data = structuredClone(loadDataset());
  data.researchAttempts = [exhaustedAttempt('lightcarbon-speedz-complete')];
  const beforeRetry = buildResearchQueue(data, '2026-08-18', { all: true });
  assert.ok(beforeRetry.deferred.some((item) => item.record_id === 'lightcarbon-speedz-complete' && item.gap === 'geometry-missing'));
  const afterRetry = buildResearchQueue(data, '2026-11-18', { all: true });
  assert.ok(afterRetry.ready.some((item) => item.record_id === 'lightcarbon-speedz-complete' && item.gap === 'geometry-missing'));
});

test('research queue keeps atomic ledger fields that have no coarse gap-code mapping', () => {
  const data = structuredClone(loadDataset());
  const handlebarWidth = exhaustedAttempt('lightcarbon-speedz-complete');
  handlebarWidth.id = 'lightcarbon-speedz-complete-handlebar-width-2026-08-17';
  handlebarWidth.field = 'handlebar-width';
  data.researchAttempts = [handlebarWidth];
  const queue = buildResearchQueue(data, '2026-08-18', { all: true });
  assert.ok(queue.deferred.some((item) =>
    item.attempt_id === handlebarWidth.id && item.gap === 'handlebar-width' && item.ledger_only === true));
});

test('research queue can return one channel-specific item for sequential browser work', () => {
  const data = structuredClone(loadDataset());
  const pending = exhaustedAttempt('lightcarbon-speedz-complete');
  pending.status = 'open';
  pending.channels['public-post'] = { status: 'not-run', attempts: [] };
  data.researchAttempts = [pending];
  const queue = buildResearchQueue(data, '2026-08-18', { all: true });
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

test('default research queue remains a finite ready-only plan', () => {
  const queue = buildResearchQueue(loadDataset(), '2026-08-28');
  assert.equal(queue.mode, 'active-shortlist');
  assert.ok(queue.ready.length <= 25);
  assert.equal(queue['evidence-found'].length, 0);
  assert.equal(queue.deferred.length, 0);
  assert.equal(queue.blocked.length, 0);
  assert.equal(queue.conflicted.length, 0);
});
