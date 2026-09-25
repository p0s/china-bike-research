import test from 'node:test';
import assert from 'node:assert/strict';
import { latestResearchAttemptIndex, summarizeResearchAttempts, validateResearchAttempts } from '../src/lib/research-attempts.mjs';
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

function retryRecord(predecessor = baseRecord()) {
  const record = structuredClone(predecessor);
  record.id = 'example-bike-image-2026-09-23';
  record.searched_at = '2026-09-23';
  record.retry_of = predecessor.id;
  record.retry_reason = 'The retry date passed and a newly indexed manufacturer product page became available.';
  record.channels['public-post'] = {
    status: 'carried-forward',
    from_attempt_id: predecessor.id,
    attempts: []
  };
  record.channels.web = {
    status: 'temporarily-exhausted',
    attempts: [1, 2, 3].map((number) => ({
      ...attempt(number),
      query: `fresh source query ${number}`,
      route: `fresh source route ${number}`,
      accessed_at: '2026-09-23'
    }))
  };
  record.retry_after = '2026-10-23';
  record.notes = 'Fresh web routes did not resolve the exact field; the unchanged public-post channel is carried forward.';
  return record;
}

test('temporary exhaustion requires three distinct attempts in every required channel', () => {
  assert.deepEqual(validateResearchAttempts([baseRecord()], data), []);
  const invalid = baseRecord();
  invalid.channels.web.attempts.pop();
  assert.ok(validateResearchAttempts([invalid], data)
    .some((error) => error.includes('exactly 3 attempts before temporary exhaustion')));
});

test('dated retries preserve earlier searches and carry forward unchanged channels', () => {
  const predecessor = baseRecord();
  predecessor.retry_after = '2026-09-20';
  const retry = retryRecord(predecessor);
  const records = [predecessor, retry];
  assert.deepEqual(validateResearchAttempts(records, data), []);
  assert.equal(latestResearchAttemptIndex(records).get('candidate:example-bike:image').id, retry.id);

  const summary = summarizeResearchAttempts(records);
  assert.equal(summary.atomic_fields, 1);
  assert.equal(summary.statuses['temporarily-exhausted'], 1);
  assert.equal(summary.attempts['public-post'], 3);
  assert.equal(summary.attempts.web, 6);

  const unlinkedDuplicate = structuredClone(retry);
  delete unlinkedDuplicate.retry_of;
  delete unlinkedDuplicate.retry_reason;
  for (const channelName of ['public-post', 'web']) {
    if (unlinkedDuplicate.channels[channelName].status === 'carried-forward') {
      unlinkedDuplicate.channels[channelName] = { status: 'not-run', attempts: [] };
    }
  }
  assert.ok(validateResearchAttempts([predecessor, unlinkedDuplicate], data)
    .some((error) => error.includes('duplicate target field')));

  const earlyRetry = structuredClone(retry);
  earlyRetry.searched_at = '2026-09-01';
  delete earlyRetry.retry_reason;
  assert.ok(validateResearchAttempts([predecessor, earlyRetry], data)
    .some((error) => error.includes('retry before retry_after')));

  const wrongCarry = structuredClone(retry);
  wrongCarry.channels['public-post'].from_attempt_id = 'other-record';
  assert.ok(validateResearchAttempts([predecessor, wrongCarry], data)
    .some((error) => error.includes('must point to retry_of')));
});

test('partial channel work stays open without inventing exhaustion or an access blocker', () => {
  const record = baseRecord();
  record.channels.web = { status: 'open', attempts: [attempt(1)] };
  record.channels['public-post'] = { status: 'not-run', attempts: [] };
  record.status = 'open';
  record.retry_after = null;
  assert.deepEqual(validateResearchAttempts([record], data), []);
  for (const attempts of [[], [attempt(1), attempt(2), attempt(3)]]) {
    const invalid = structuredClone(record);
    invalid.channels.web.attempts = attempts;
    assert.ok(validateResearchAttempts([invalid], data).some((error) =>
      error.includes('incomplete nonempty attempt budget')));
  }
  for (const outcome of ['found', 'blocked', 'conflict']) {
    const invalid = structuredClone(record);
    invalid.channels.web.attempts = [attempt(1, outcome)];
    assert.ok(validateResearchAttempts([invalid], data).some((error) =>
      error.includes('cannot hide found, blocked or conflicted evidence')));
  }
  const falseCompletion = structuredClone(record);
  falseCompletion.status = 'temporarily-exhausted';
  assert.notDeepEqual(validateResearchAttempts([falseCompletion], data), []);
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

test('a bounded follow-up after an extended campaign requires a formal scope and preserves its 50-area coverage', () => {
  const predecessor = extendedRecord();
  const retry = structuredClone(predecessor);
  retry.id = 'example-bike-image-follow-up-2026-09-23';
  retry.searched_at = '2026-09-23';
  retry.retry_of = predecessor.id;
  retry.retry_reason = 'A newly surfaced exact public listing provided a distinct route to recheck the image.';
  delete retry.minimum_distinct_approaches;
  retry.campaign_extension = {
    id: 'example-image-bounded-extension',
    extends_attempt_id: predecessor.id,
    authorized_at: retry.searched_at,
    scope_file: 'docs/research-batches/2026-09-24/example-scope.json',
    reason: 'One newly surfaced exact listing is available for a bounded follow-up.',
    allowed_channels: ['web'],
    max_new_attempts: 1
  };
  retry.channels['public-post'] = {
    status: 'carried-forward',
    from_attempt_id: predecessor.id,
    attempts: []
  };
  retry.channels.web = {
    status: 'blocked',
    blocker: 'The exact listing did not include a reusable image.',
    attempts: [{
      ...attempt(1, 'rejected'),
      query: 'new exact listing image search',
      route: 'new public exact listing',
      accessed_at: retry.searched_at
    }]
  };
  retry.status = 'blocked';
  retry.retry_after = null;
  retry.notes = 'The bounded follow-up did not resolve the image; the earlier extended campaign remains intact.';

  assert.deepEqual(validateResearchAttempts([predecessor, retry], data), []);
  const summary = summarizeResearchAttempts([predecessor, retry]);
  assert.equal(summary.extended_approach_campaigns.fields, 1);
  assert.equal(summary.extended_approach_campaigns.complete, 1);
  assert.equal(summary.extended_approach_campaigns.approach_applications, 50);

  const missingExtension = structuredClone(retry);
  delete missingExtension.campaign_extension;
  assert.ok(validateResearchAttempts([predecessor, missingExtension], data)
    .some((error) => error.includes('campaign_extension is required')));

  const overBudget = structuredClone(retry);
  overBudget.campaign_extension.max_new_attempts = 0;
  assert.ok(validateResearchAttempts([predecessor, overBudget], data)
    .some((error) => error.includes('max_new_attempts')));
});

test('a new scoped extension can continue an open bounded follow-up after a completed 50-area sweep', () => {
  const original = extendedRecord();
  const first = structuredClone(original);
  first.id = 'example-bike-image-first-extension-2026-09-01';
  first.searched_at = '2026-09-01';
  first.retry_of = original.id;
  first.retry_reason = 'A distinct manufacturer listing became available for a bounded follow-up.';
  delete first.minimum_distinct_approaches;
  first.campaign_extension = {
    id: 'example-first-extension',
    extends_attempt_id: original.id,
    authorized_at: first.searched_at,
    scope_file: 'docs/research-batches/2026-09-01/example-first-scope.json',
    reason: 'The newly surfaced manufacturer listing was not part of the original 50-area sweep.',
    allowed_channels: ['web'],
    max_new_attempts: 1
  };
  first.channels['public-post'] = {
    status: 'carried-forward',
    from_attempt_id: original.id,
    attempts: []
  };
  first.channels.web = {
    status: 'open',
    attempts: [{
      ...attempt(1),
      query: 'exact manufacturer listing 2026 weight',
      route: 'new manufacturer product listing',
      accessed_at: first.searched_at
    }]
  };
  first.status = 'open';
  first.retry_after = null;
  first.notes = 'One scoped attempt remains inconclusive; a later distinct lead may support another frozen extension.';

  const second = structuredClone(first);
  second.id = 'example-bike-image-second-extension-2026-09-23';
  second.searched_at = '2026-09-23';
  second.retry_of = first.id;
  second.retry_reason = 'A newly published exact seller item page provides a distinct route for one follow-up.';
  second.campaign_extension = {
    id: 'example-second-extension',
    extends_attempt_id: first.id,
    authorized_at: second.searched_at,
    scope_file: 'docs/research-batches/2026-09-23/example-second-scope.json',
    reason: 'The exact seller item page appeared after the prior extension and is a new route.',
    allowed_channels: ['web'],
    max_new_attempts: 1
  };
  second.channels['public-post'] = {
    status: 'carried-forward',
    from_attempt_id: first.id,
    attempts: []
  };
  second.channels.web = {
    status: 'blocked',
    blocker: 'The newly published exact seller item page timed out once.',
    attempts: [{
      ...attempt(1, 'blocked'),
      query: 'exact seller item page 2026 frame mass',
      route: 'new exact seller item page',
      accessed_at: second.searched_at
    }]
  };
  second.status = 'blocked';
  second.retry_after = null;
  second.notes = 'The new exact seller route timed out; no retry was made and prior campaign evidence remains preserved.';

  assert.deepEqual(validateResearchAttempts([original, first, second], data), []);

  const missingExtension = structuredClone(second);
  delete missingExtension.campaign_extension;
  assert.ok(validateResearchAttempts([original, first, missingExtension], data)
    .some((error) => error.includes('campaign_extension is required')));
});

test('a scoped extension can recheck a found extended campaign when a distinct exact subcondition remains unresolved', () => {
  const predecessor = extendedRecord();
  predecessor.status = 'found';
  predecessor.retry_after = null;
  predecessor.accepted_source_ids = ['example-source'];
  predecessor.channels.web.status = 'found';
  predecessor.channels.web.attempts[0].outcome = 'found';
  predecessor.channels.web.attempts[0].note = 'An attributable source was found, but its exact orderability details remain incomplete.';

  const retry = structuredClone(predecessor);
  retry.id = 'example-bike-image-found-extension-2026-09-23';
  retry.searched_at = '2026-09-23';
  retry.retry_of = predecessor.id;
  retry.retry_reason = 'A newly indexed exact listing can test whether the selected build is currently orderable.';
  delete retry.minimum_distinct_approaches;
  retry.campaign_extension = {
    id: 'example-image-found-extension',
    extends_attempt_id: predecessor.id,
    authorized_at: retry.searched_at,
    scope_file: 'docs/research-batches/2026-09-24/example-scope.json',
    reason: 'A new public item route can verify the unresolved selected-build availability condition.',
    allowed_channels: ['web'],
    max_new_attempts: 1
  };
  retry.channels['public-post'] = {
    status: 'carried-forward',
    from_attempt_id: predecessor.id,
    attempts: []
  };
  retry.channels.web = {
    status: 'blocked',
    blocker: 'The exact item page was inaccessible and did not expose current availability.',
    attempts: [{
      ...attempt(1, 'blocked'),
      query: 'exact selected build current availability',
      route: 'one newly indexed public product item',
      accessed_at: retry.searched_at
    }]
  };
  retry.status = 'blocked';
  retry.retry_after = null;
  retry.notes = 'The scoped follow-up could not verify the unresolved orderability condition; earlier accepted evidence remains preserved.';

  assert.deepEqual(validateResearchAttempts([predecessor, retry], data), []);

  const unscoped = structuredClone(retry);
  delete unscoped.campaign_extension;
  assert.ok(validateResearchAttempts([predecessor, unscoped], data)
    .some((error) => error.includes('without a scoped campaign extension')));

  const simpleFoundPredecessor = baseRecord();
  simpleFoundPredecessor.status = 'found';
  simpleFoundPredecessor.retry_after = null;
  simpleFoundPredecessor.accepted_source_ids = ['example-source'];
  simpleFoundPredecessor.channels['public-post'] = { status: 'found', attempts: [attempt(1, 'found')] };
  simpleFoundPredecessor.channels.web = { status: 'not-run', attempts: [] };
  const simpleRetry = structuredClone(retry);
  simpleRetry.retry_of = simpleFoundPredecessor.id;
  simpleRetry.campaign_extension.extends_attempt_id = simpleFoundPredecessor.id;
  assert.ok(validateResearchAttempts([simpleFoundPredecessor, simpleRetry], data)
    .some((error) => error.includes('without a scoped campaign extension')));
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

test('a rechecked conflict can be dispositioned without pretending its value was found', () => {
  const record = baseRecord();
  record.channels.web = {
    status: 'conflicted',
    conflict: 'Exact sources publish incompatible or unqualified values.',
    attempts: [attempt(1, 'conflict')]
  };
  record.status = 'conflicted';
  const conflictData = { ...data, sources: [...data.sources, { id: 'example-source-2' }] };
  record.accepted_source_ids = ['example-source', 'example-source-2'];
  record.resolution = {
    kind: 'conflict-reconfirmed',
    resolved_at: '2026-08-18',
    source_ids: ['example-source', 'example-source-2'],
    note: 'The exact sources were rechecked; the conflict remains unresolved.'
  };
  record.retry_after = null;
  assert.deepEqual(validateResearchAttempts([record], conflictData), []);

  const invalid = structuredClone(record);
  invalid.status = 'found';
  assert.ok(validateResearchAttempts([invalid], conflictData).some((error) => error.includes('conflict-reconfirmed resolution requires conflicted status')));
});

test('repeated queries and routes do not count as distinct attempts', () => {
  const record = baseRecord();
  record.channels.web.attempts[1].query = record.channels.web.attempts[0].query;
  record.channels.web.attempts[2].route = record.channels.web.attempts[0].route;
  const errors = validateResearchAttempts([record], data);
  assert.ok(errors.some((error) => error.includes('repeats a prior query')));
  assert.ok(errors.some((error) => error.includes('repeats a prior route')));
});

test('distinct attempts may surface the same page and can record identity mismatches', () => {
  const record = baseRecord();
  record.channels['public-post'] = { status: 'not-run', attempts: [] };
  record.channels.web = {
    status: 'open',
    attempts: [
      { ...attempt(1, 'identity-mismatch'), result_url: 'https://example.com/catalog' },
      { ...attempt(2, 'no-result'), result_url: 'https://example.com/catalog' }
    ]
  };
  record.status = 'open';
  record.retry_after = null;
  assert.deepEqual(validateResearchAttempts([record], data), []);

  const exhausted = structuredClone(record);
  exhausted.channels['public-post'] = exhaustedChannel();
  exhausted.channels.web = {
    status: 'temporarily-exhausted',
    attempts: [1, 2, 3].map((number) => ({
      ...attempt(number, number === 1 ? 'identity-mismatch' : 'no-result'),
      result_url: 'https://example.com/catalog'
    }))
  };
  exhausted.status = 'temporarily-exhausted';
  exhausted.retry_after = '2026-11-17';
  assert.deepEqual(validateResearchAttempts([exhausted], data), []);
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
