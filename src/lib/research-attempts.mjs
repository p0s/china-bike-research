export const RESEARCH_CHANNELS = ['public-post', 'web'];
export const RESEARCH_ATTEMPT_LIMIT = 3;

const channelStatuses = new Set(['found', 'temporarily-exhausted', 'blocked', 'conflicted', 'not-run']);
const recordStatuses = new Set(['found', 'temporarily-exhausted', 'blocked', 'conflicted', 'open']);
const attemptOutcomes = new Set(['found', 'no-result', 'rejected', 'blocked', 'conflict']);
const priorities = new Set(['high', 'medium', 'low']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isId(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value);
}

function normalized(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function expectedRecordStatus(record) {
  const statuses = record.required_channels.map((channel) => record.channels?.[channel]?.status);
  if (statuses.includes('conflicted')) return 'conflicted';
  if (statuses.includes('found')) return 'found';
  if (statuses.length && statuses.every((status) => status === 'temporarily-exhausted')) return 'temporarily-exhausted';
  if (statuses.length && statuses.every((status) => ['temporarily-exhausted', 'blocked'].includes(status)) && statuses.includes('blocked')) return 'blocked';
  return 'open';
}

function validateChannel(record, channelName, channel) {
  const prefix = `research attempt ${record.id}: channel ${channelName}`;
  const errors = [];
  if (!isObject(channel)) return [`${prefix} is missing`];
  if (!channelStatuses.has(channel.status)) errors.push(`${prefix} has invalid status ${String(channel.status)}`);
  if (!Array.isArray(channel.attempts)) return [...errors, `${prefix} attempts must be an array`];
  if (channel.attempts.length > RESEARCH_ATTEMPT_LIMIT) errors.push(`${prefix} exceeds the ${RESEARCH_ATTEMPT_LIMIT}-attempt limit`);

  const queries = new Set();
  const routes = new Set();
  const resultUrls = new Set();
  for (let index = 0; index < channel.attempts.length; index += 1) {
    const attempt = channel.attempts[index];
    const attemptPrefix = `${prefix} attempt ${index + 1}`;
    if (!isObject(attempt)) {
      errors.push(`${attemptPrefix} must be an object`);
      continue;
    }
    if (attempt.attempt !== index + 1) errors.push(`${attemptPrefix} must use sequential attempt number ${index + 1}`);
    if (!normalized(attempt.query)) errors.push(`${attemptPrefix} needs a query`);
    if (!normalized(attempt.route)) errors.push(`${attemptPrefix} needs a distinct route label`);
    if (!attemptOutcomes.has(attempt.outcome)) errors.push(`${attemptPrefix} has invalid outcome ${String(attempt.outcome)}`);
    if (!isDate(attempt.accessed_at)) errors.push(`${attemptPrefix} needs a valid accessed_at date`);
    const query = normalized(attempt.query);
    const route = normalized(attempt.route);
    if (query && queries.has(query)) errors.push(`${attemptPrefix} repeats a prior query`);
    if (route && routes.has(route)) errors.push(`${attemptPrefix} repeats a prior route`);
    queries.add(query);
    routes.add(route);
    if (attempt.result_url !== undefined) {
      try {
        const url = new URL(attempt.result_url);
        if (url.protocol !== 'https:') errors.push(`${attemptPrefix} result_url must use HTTPS`);
        for (const key of url.searchParams.keys()) {
          if (/^(?:xsec_.+|.*token.*|auth|session|signature|access_key|api_key)$/i.test(key)) {
            errors.push(`${attemptPrefix} result_url contains a private or ephemeral access parameter`);
          }
        }
        const resultUrl = url.toString();
        if (resultUrls.has(resultUrl)) errors.push(`${attemptPrefix} repeats a prior result URL`);
        resultUrls.add(resultUrl);
      } catch {
        errors.push(`${attemptPrefix} has an invalid result_url`);
      }
    }
    if (typeof attempt.note !== 'string' || !attempt.note.trim()) errors.push(`${attemptPrefix} needs a concise result note`);
  }

  if (channel.status === 'found') {
    if (!channel.attempts.length || !channel.attempts.some((attempt) => attempt.outcome === 'found')) {
      errors.push(`${prefix} is found without a successful attempt`);
    }
  }
  if (channel.status === 'temporarily-exhausted') {
    if (channel.attempts.length !== RESEARCH_ATTEMPT_LIMIT) errors.push(`${prefix} must record exactly ${RESEARCH_ATTEMPT_LIMIT} attempts before temporary exhaustion`);
    if (channel.attempts.some((attempt) => !['no-result', 'rejected'].includes(attempt.outcome))) {
      errors.push(`${prefix} can be exhausted only after no-result or rejected attempts`);
    }
  }
  if (channel.status === 'blocked' && (typeof channel.blocker !== 'string' || !channel.blocker.trim())) {
    errors.push(`${prefix} needs a blocker explanation`);
  }
  if (channel.status === 'conflicted' && (typeof channel.conflict !== 'string' || !channel.conflict.trim())) {
    errors.push(`${prefix} needs a conflict explanation`);
  }
  if (channel.status === 'not-run' && channel.attempts.length) errors.push(`${prefix} cannot be not-run with attempts`);
  return errors;
}

export function validateResearchAttempts(records, data) {
  const errors = [];
  const ids = new Set();
  const targetFields = new Set();
  const targetIds = {
    candidate: new Set((data.candidates ?? []).map((record) => record.id)),
    platform: new Set((data.platforms ?? []).map((record) => record.id)),
    variant: new Set((data.variants ?? []).map((record) => record.id))
  };
  const sourceIds = new Set((data.sources ?? []).map((record) => record.id));

  for (const record of records ?? []) {
    const label = `research attempt ${record?.id ?? '(missing id)'}`;
    if (!isId(record?.id)) errors.push(`${label}: invalid id`);
    else if (ids.has(record.id)) errors.push(`${label}: duplicate id`);
    else ids.add(record.id);
    if (!isDate(record?.searched_at)) errors.push(`${label}: invalid searched_at`);
    if (!isId(record?.field)) errors.push(`${label}: field must be a lowercase kebab-case id`);
    if (!priorities.has(record?.priority)) errors.push(`${label}: invalid priority ${String(record?.priority)}`);
    if (!recordStatuses.has(record?.status)) errors.push(`${label}: invalid status ${String(record?.status)}`);
    if (!isObject(record?.target) || !targetIds[record.target.record_type]?.has(record.target.record_id)) {
      errors.push(`${label}: target must reference an existing candidate, platform, or variant`);
    } else {
      const key = `${record.target.record_type}:${record.target.record_id}:${record.field}`;
      if (targetFields.has(key)) errors.push(`${label}: duplicate target field ${key}`);
      targetFields.add(key);
    }
    if (!Array.isArray(record?.required_channels) || !record.required_channels.length) {
      errors.push(`${label}: required_channels must be a non-empty array`);
      continue;
    }
    if (record.priority === 'high' && RESEARCH_CHANNELS.some((channel) => !record.required_channels.includes(channel))) {
      errors.push(`${label}: high-priority fields require both public-post and web channels`);
    }
    if (new Set(record.required_channels).size !== record.required_channels.length) errors.push(`${label}: required_channels contains duplicates`);
    for (const channelName of record.required_channels) {
      if (!RESEARCH_CHANNELS.includes(channelName)) {
        errors.push(`${label}: unsupported channel ${String(channelName)}`);
        continue;
      }
      errors.push(...validateChannel(record, channelName, record.channels?.[channelName]));
    }
    const expected = expectedRecordStatus(record);
    if (record.status !== expected) errors.push(`${label}: status ${record.status} does not match channel outcome ${expected}`);
    if (record.status === 'found' && !(record.accepted_source_ids?.length > 0)) errors.push(`${label}: found evidence needs accepted_source_ids`);
    if (record.status === 'conflicted' && !(record.accepted_source_ids?.length > 1)) errors.push(`${label}: conflicted evidence needs at least two accepted_source_ids`);
    for (const sourceId of record.accepted_source_ids ?? []) {
      if (!sourceIds.has(sourceId)) errors.push(`${label}: missing accepted source ${sourceId}`);
    }
    if (record.status === 'temporarily-exhausted' && !isDate(record.retry_after)) errors.push(`${label}: temporary exhaustion needs a retry_after date`);
    if (record.retry_after !== undefined && record.retry_after !== null && !isDate(record.retry_after)) errors.push(`${label}: invalid retry_after`);
    if (isDate(record.retry_after) && isDate(record.searched_at) && record.retry_after <= record.searched_at) errors.push(`${label}: retry_after must be later than searched_at`);
    if (typeof record.notes !== 'string' || !record.notes.trim()) errors.push(`${label}: notes are required`);
  }
  return errors;
}

export function summarizeResearchAttempts(records) {
  const summary = {
    atomic_fields: records.length,
    statuses: { found: 0, 'temporarily-exhausted': 0, blocked: 0, conflicted: 0, open: 0 },
    attempts: { 'public-post': 0, web: 0 }
  };
  for (const record of records) {
    summary.statuses[record.status] += 1;
    for (const channel of RESEARCH_CHANNELS) summary.attempts[channel] += record.channels?.[channel]?.attempts?.length ?? 0;
  }
  return summary;
}

export function latestResearchAttemptIndex(records) {
  const result = new Map();
  for (const record of [...records].sort((a, b) => a.searched_at.localeCompare(b.searched_at) || a.id.localeCompare(b.id))) {
    result.set(`${record.target.record_type}:${record.target.record_id}:${record.field}`, record);
  }
  return result;
}
