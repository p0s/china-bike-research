import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeResearchAttempts, validateResearchAttempts } from '../src/lib/research-attempts.mjs';
import { RESEARCH_APPROACH_AREAS } from '../src/lib/research-approach-areas.mjs';

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

function extendedRecord() {
  const record = baseRecord();
  record.minimum_distinct_approaches = 50;
  for (const channelName of ['public-post', 'web']) {
    const areas = RESEARCH_APPROACH_AREAS.filter((area) => area.channel === channelName);
    record.channels[channelName] = {
      status: 'temporarily-exhausted',
      attempts: areas.map((area, index) => ({
        attempt: index + 1,
        query: `example bike image via ${area.id}`,
        route: `${area.label} for example bike image`,
        approach_area_id: area.id,
        outcome: 'no-result',
        accessed_at: '2026-08-17',
        note: `The ${area.label.toLowerCase()} route did not expose an exact attributable image.`
      }))
    };
  }
  return record;
}

test('temporary exhaustion requires three distinct attempts in every required channel', () => {
  assert.deepEqual(validateResearchAttempts([baseRecord()], data), []);
  const invalid = baseRecord();
  invalid.channels.web.attempts.pop();
  assert.ok(validateResearchAttempts([invalid], data)
    .some((error) => error.includes('exactly 3 attempts before temporary exhaustion')));
});

test('an extended campaign requires all 50 registered approach areas exactly once', () => {
  assert.deepEqual(validateResearchAttempts([extendedRecord()], data), []);

  const incomplete = extendedRecord();
  incomplete.channels.web.attempts.pop();
  assert.ok(validateResearchAttempts([incomplete], data)
    .some((error) => error.includes('requires at least 50 distinct approaches')));

  const duplicate = extendedRecord();
  duplicate.channels.web.attempts[0].approach_area_id = duplicate.channels.web.attempts[1].approach_area_id;
  assert.ok(validateResearchAttempts([duplicate], data)
    .some((error) => error.includes('repeats approach area')));
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

test('same-target source reuse can resolve a field without rewriting or fabricating a search attempt', () => {
  const record = baseRecord();
  record.channels['public-post'] = { status: 'not-run', attempts: [] };
  record.status = 'found';
  record.accepted_source_ids = ['example-source'];
  record.resolution = {
    kind: 'source-reuse',
    resolved_at: '2026-08-18',
    source_ids: ['example-source'],
    note: 'The exact source already accepted for this target directly publishes the image field.'
  };
  record.retry_after = null;
  assert.deepEqual(validateResearchAttempts([record], data), []);

  const invalid = structuredClone(record);
  invalid.resolution.source_ids = ['missing-source'];
  assert.ok(validateResearchAttempts([invalid], data).some((error) => error.includes('resolution references missing source')));
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
  assert.equal(summary.extended_approach_campaigns.fields, 0);
});
