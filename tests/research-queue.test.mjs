import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset } from '../src/lib/data.mjs';
import { buildResearchQueue } from '../scripts/research-queue.mjs';

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
