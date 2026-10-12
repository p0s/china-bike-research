import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { indexNow, validateManifest, validatePublicUrl, changedPublicUrls, indexNowPayload } from './indexnow.mjs';

const maxStateBytes = 8_000_000;
export function pendingUrls(...groups) {
  const urls = [...new Set(groups.flat())].sort();
  if (urls.length > indexNow.maxUrls) throw new Error('IndexNow pending changes exceed one bounded request.');
  urls.forEach(validatePublicUrl);
  return urls;
}

export function validateDeliveryState(state) {
  if (state?.schema_version !== 1 || state.host !== indexNow.host || !Array.isArray(state.pending_urls)
    || !Object.hasOwn(state, 'observed_manifest') || !Object.hasOwn(state, 'acknowledged_manifest') || !Object.hasOwn(state, 'attempt')) {
    throw new Error('Invalid IndexNow delivery state.');
  }
  for (const manifest of [state.observed_manifest, state.acknowledged_manifest]) if (manifest !== null) {
    validateManifest(manifest);
    if (Object.keys(manifest).some(key => !['schema_version', 'host', 'pages'].includes(key))) throw new Error('Unexpected IndexNow manifest field in state.');
  }
  const pending = pendingUrls(state.pending_urls);
  if (pending.length !== state.pending_urls.length) throw new Error('Duplicate IndexNow pending URL.');
  // Artifacts contain only public inventories and a small receipt summary, never response bodies or tokens.
  const fields = ['schema_version', 'host', 'observed_manifest', 'acknowledged_manifest', 'pending_urls', 'last_receipt', 'attempt'];
  if (Object.keys(state).some(key => !fields.includes(key))) throw new Error('Unexpected IndexNow state field.');
  if (state.last_receipt !== null) {
    const receipt = state.last_receipt;
    if (!receipt || ![200, 202].includes(receipt.http_status) || !Number.isInteger(receipt.url_count)
      || receipt.url_count < 1 || receipt.url_count > indexNow.maxUrls || !Number.isFinite(Date.parse(receipt.submitted_at))
      || Object.keys(receipt).some(key => !['http_status', 'url_count', 'submitted_at'].includes(key))) {
      throw new Error('Invalid IndexNow acknowledged receipt.');
    }
  }
  if (state.acknowledged_manifest !== null) {
    if (!state.last_receipt || state.observed_manifest === null
      || changedPublicUrls(state.acknowledged_manifest, state.observed_manifest).some(url => !pending.includes(url))) {
      throw new Error('IndexNow state has an unrecorded pending change.');
    }
  }
  if (state.attempt !== null) {
    const attempt = state.attempt;
    const fields = ['phase', 'endpoint', 'urls', 'request_sha256', 'manifest_sha256', 'started_at', 'completed_at', 'outcome', 'http_status'];
    if (!attempt || !fields.every(key => Object.hasOwn(attempt, key)) || Object.keys(attempt).some(key => !fields.includes(key))
      || !['in_flight', 'held'].includes(attempt.phase) || attempt.endpoint !== indexNow.endpoint
      || !Array.isArray(attempt.urls) || !attempt.urls.length || pendingUrls(attempt.urls).length !== attempt.urls.length
      || attempt.urls.some(url => !pending.includes(url)) || !/^[a-f0-9]{64}$/.test(attempt.manifest_sha256)
      || attempt.request_sha256 !== requestHash(attempt.urls) || !Number.isFinite(Date.parse(attempt.started_at))) {
      throw new Error('Invalid IndexNow attempt record.');
    }
    if (attempt.phase === 'in_flight' ? attempt.outcome !== null || attempt.http_status !== null || attempt.completed_at !== null
      : !['rejected', 'ambiguous'].includes(attempt.outcome) || !Number.isFinite(Date.parse(attempt.completed_at))
        || (attempt.outcome === 'ambiguous' ? attempt.http_status !== null
          : !Number.isInteger(attempt.http_status) || attempt.http_status < 100 || attempt.http_status > 599 || [200, 202].includes(attempt.http_status))) {
      throw new Error('Invalid IndexNow attempt outcome.');
    }
  }
  return state;
}

const requestHash = urls => createHash('sha256').update(JSON.stringify(indexNowPayload(urls))).digest('hex');
export function startAttempt(urls, manifest) {
  const canonical = { schema_version: 1, host: indexNow.host, pages: Object.fromEntries(Object.entries(manifest.pages).sort(([a], [b]) => a.localeCompare(b))) };
  return { phase: 'in_flight', endpoint: indexNow.endpoint, urls: [...urls], request_sha256: requestHash(urls),
    manifest_sha256: createHash('sha256').update(JSON.stringify(canonical)).digest('hex'), started_at: new Date().toISOString(),
    completed_at: null, outcome: null, http_status: null };
}

export function readDeliveryState(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.size > maxStateBytes) throw new Error('Invalid or oversized IndexNow state file.');
  return validateDeliveryState(JSON.parse(fs.readFileSync(file, 'utf8')));
}

export function writeDeliveryState(file, state) {
  validateDeliveryState(state);
  const body = `${JSON.stringify(state)}\n`;
  if (Buffer.byteLength(body) > maxStateBytes) throw new Error('IndexNow state exceeds the bounded size limit.');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, body, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

export function observeManifest(state, manifest) {
  if (state === null) return {
    schema_version: 1, host: indexNow.host, observed_manifest: manifest,
    acknowledged_manifest: null, pending_urls: [], last_receipt: null, attempt: null
  };
  validateDeliveryState(state);
  if (manifest === null && state.observed_manifest !== null) throw new Error('Previously public IndexNow manifest is missing; retain its delivery state.');
  const changes = state.observed_manifest && manifest ? changedPublicUrls(state.observed_manifest, manifest) : [];
  return { ...state, observed_manifest: manifest, pending_urls: pendingUrls(state.pending_urls, changes) };
}

export function acknowledgeManifest(state, manifest, receipt) {
  return { ...state, observed_manifest: manifest, acknowledged_manifest: manifest, pending_urls: [], attempt: null,
    last_receipt: { http_status: receipt.http_status, url_count: receipt.url_count, submitted_at: receipt.submitted_at } };
}
