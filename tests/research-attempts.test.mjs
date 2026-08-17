import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeResearchAttempts, validateResearchAttempts } from '../src/lib/research-attempts.mjs';

const data = {
  candidates: [{ id: 'example-bike' }],
  platforms: [],
  variants: [],
  sources: [{ id: 'example-source' }]
};

function attempt(number, outcome = 'no-result') {
  return {
    attempt: number,
    query: `distinct query ${number}`,
    route: `distinct route ${number}`,
    outcome,
    accessed_at: '2026-08-17',
    note: outcome === 'found' ? 'Exact evidence verified.' : 'No exact-model evidence accepted.'
  };
}

function exhaustedChannel() {
  return { status: 'temporarily-exhausted', attempts: [attempt(1), attempt(2), attempt(3)] };
}

function baseRecord() {
  return {
    id: 'example-bike-image-2026-08-17',
    target: { record_type: 'candidate', record_id: 'example-bike' },
    field: 'image',
    priority: 'high',
    searched_at: '2026-08-17',
    required_channels: ['public-post', 'web'],
    channels: {
      'public-post': exhaustedChannel(),
      web: exhaustedChannel()
    },
    status: 'temporarily-exhausted',
    retry_after: '2026-11-17',
    notes: 'No exact attributable image was found in the fixed attempt budget.'
  };
}

test('temporary exhaustion requires three distinct attempts in every required channel', () => {
  assert.deepEqual(validateResearchAttempts([baseRecord()], data), []);
  const invalid = baseRecord();
  invalid.channels.web.attempts.pop();
  assert.ok(validateResearchAttempts([invalid], data)
    .some((error) => error.includes('exactly 3 attempts before temporary exhaustion')));
});

test('a successful exact source stops the search early and links accepted evidence', () => {
  const record = baseRecord();
  record.channels['public-post'] = { status: 'found', attempts: [attempt(1, 'found')] };
  record.channels.web = { status: 'not-run', attempts: [] };
  record.status = 'found';
  record.accepted_source_ids = ['example-source'];
  record.retry_after = null;
  assert.deepEqual(validateResearchAttempts([record], data), []);
});

test('repeated queries and routes do not count as distinct attempts', () => {
  const record = baseRecord();
  record.channels.web.attempts[1].query = record.channels.web.attempts[0].query;
  record.channels.web.attempts[2].route = record.channels.web.attempts[0].route;
  const errors = validateResearchAttempts([record], data);
  assert.ok(errors.some((error) => error.includes('repeats a prior query')));
  assert.ok(errors.some((error) => error.includes('repeats a prior route')));
});

test('high-priority gaps require both channels and sanitized result URLs', () => {
  const record = baseRecord();
  record.required_channels = ['web'];
  record.channels.web.attempts[0].result_url = 'https://example.com/item?xsec_token=private';
  const errors = validateResearchAttempts([record], data);
  assert.ok(errors.some((error) => error.includes('require both public-post and web channels')));
  assert.ok(errors.some((error) => error.includes('private or ephemeral access parameter')));
});

test('found records cannot cite missing evidence records', () => {
  const record = baseRecord();
  record.channels.web = { status: 'found', attempts: [attempt(1, 'found')] };
  record.channels['public-post'] = { status: 'not-run', attempts: [] };
  record.status = 'found';
  record.accepted_source_ids = ['not-in-dataset'];
  record.retry_after = null;
  assert.ok(validateResearchAttempts([record], data)
    .some((error) => error.includes('missing accepted source not-in-dataset')));
});

test('research summary counts atomic fields and channel effort', () => {
  const summary = summarizeResearchAttempts([baseRecord()]);
  assert.equal(summary.atomic_fields, 1);
  assert.equal(summary.statuses['temporarily-exhausted'], 1);
  assert.equal(summary.attempts['public-post'], 3);
  assert.equal(summary.attempts.web, 3);
});
