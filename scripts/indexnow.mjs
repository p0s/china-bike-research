import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as wait } from 'node:timers/promises';
import { indexNow, indexNowKeyUrl, validateManifest, changedPublicUrls, sitemapPublicUrls, indexNowPayload } from '../src/lib/indexnow.mjs';
import { readDeliveryState, writeDeliveryState, observeManifest, acknowledgeManifest, startAttempt } from '../src/lib/indexnow-state.mjs';

const readOptions = { redirect: 'error', headers: { DNT: '1', 'Sec-GPC': '1', 'User-Agent': 'ChinaBikes-IndexNow/1.0', 'Cache-Control': 'no-cache' } };
async function responseText(response, limit = 2_000_000) {
  let result = '';
  const reader = response.body?.getReader();
  if (!reader) return result;
  const decoder = new TextDecoder();
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return result + decoder.decode();
      bytes += value.byteLength;
      if (bytes > limit) throw new Error('IndexNow response exceeds the bounded size limit.');
      result += decoder.decode(value, { stream: true });
    }
  } finally { await reader.cancel(); }
}
async function readLive(url, fetcher, allowMissing = false) {
  const response = await fetcher(url, { ...readOptions, signal: AbortSignal.timeout(20_000) });
  if (allowMissing && response.status === 404) { await response.body?.cancel(); return null; }
  if (response.status !== 200) { await response.body?.cancel(); throw new Error(`Live verification failed: ${url} returned ${response.status}.`); }
  return responseText(response);
}
async function liveManifest(fetcher, allowMissing = false) {
  const text = await readLive(`${indexNow.origin}${indexNow.manifestPath}`, fetcher, allowMissing);
  return text === null ? null : validateManifest(JSON.parse(text));
}
async function verifyKey(fetcher) {
  if ((await readLive(indexNowKeyUrl, fetcher)).trim() !== indexNow.key) throw new Error('Live IndexNow key file does not match.');
}
async function verifiedManifest(expected, fetcher, pause) {
  // Wrangler can finish before the new static asset manifest reaches this edge.
  // Retry this read once after a propagation wait; never retry a POST here.
  let failure;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await pause(30_000);
    try {
      const actual = await liveManifest(fetcher);
      if (changedPublicUrls(actual, expected).length) throw new Error('Live manifest does not match the deployed build; notification withheld.');
      return actual;
    } catch (error) { failure = error; }
  }
  throw failure;
}
async function submit(urls, fetcher) {
  const payload = indexNowPayload(urls);
  const response = await fetcher(indexNow.endpoint, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'User-Agent': readOptions.headers['User-Agent'] },
    body: JSON.stringify(payload)
  });
  const body = await responseText(response, 16_384);
  const receipt = { endpoint: indexNow.endpoint, host: indexNow.host, key_url: indexNowKeyUrl, url_count: urls.length, http_status: response.status, response: body, submitted_at: new Date().toISOString(), indexing_proven: false };
  if (![200, 202].includes(response.status)) throw Object.assign(new Error(`IndexNow did not accept the notification: ${JSON.stringify(receipt)}`), { httpStatus: response.status });
  return receipt;
}

export async function runIndexNow(args, { fetcher = fetch, pause = wait } = {}) {
  const [command, ...options] = args;
  if (command === 'snapshot' && [2, 4].includes(options.length) && options[0] === '--output'
    && (options.length === 2 || options[2] === '--state')) {
    const stateFile = options[3];
    const previous = stateFile ? readDeliveryState(stateFile) : null;
    const baseline = await liveManifest(fetcher, true);
    const state = stateFile ? observeManifest(previous, baseline) : null;
    fs.writeFileSync(options[1], `${JSON.stringify({ schema_version: 1, host: indexNow.host, baseline })}\n`, { flag: 'wx' });
    if (stateFile) writeDeliveryState(stateFile, state);
    return { action: 'snapshot', url_count: baseline ? Object.keys(baseline.pages).length : 0, initial_manifest_missing: baseline === null,
      ...(state ? { pending_count: state.pending_urls.length } : {}) };
  }
  if (command === 'bootstrap' && !options.length) {
    await verifyKey(fetcher);
    const manifest = await liveManifest(fetcher);
    const urls = sitemapPublicUrls(await readLive(`${indexNow.origin}/sitemap.xml`, fetcher));
    if (JSON.stringify(urls) !== JSON.stringify(Object.keys(manifest.pages).sort())) throw new Error('Live sitemap and public manifest differ; do not submit a mixed deployment.');
    return { action: 'bootstrap', ...await submit(urls, fetcher) };
  }
  if (command === 'notify' && [4, 6].includes(options.length) && options[0] === '--before' && options[2] === '--expected'
    && (options.length === 4 || options[4] === '--state')) {
    const snapshot = JSON.parse(fs.readFileSync(options[1], 'utf8'));
    if (snapshot.schema_version !== 1 || snapshot.host !== indexNow.host || !Object.hasOwn(snapshot, 'baseline')) throw new Error('Invalid pre-deployment snapshot.');
    const expected = validateManifest(JSON.parse(fs.readFileSync(options[3], 'utf8')));
    const stateFile = options[5];
    let state = stateFile ? readDeliveryState(stateFile) : null;
    if (stateFile && state === null) throw new Error('Missing IndexNow delivery state; capture the pre-deployment baseline first.');
    if (state?.attempt !== null && state?.attempt !== undefined) throw new Error('IndexNow has a held or interrupted POST attempt; review its receipt and exact request before any further submission.');
    const actual = await verifiedManifest(expected, fetcher, pause);
    if (stateFile) {
      state = observeManifest(state, actual);
      // Save the verified delta before checking the key or attempting its one POST.
      writeDeliveryState(stateFile, state);
    }
    await verifyKey(fetcher);
    if (snapshot.baseline === null) return { action: 'notify', url_count: 0, skipped: 'First manifest deployment. Run bootstrap once after live verification.' };
    const urls = state ? state.pending_urls : changedPublicUrls(snapshot.baseline, actual);
    if (!urls.length) return { action: 'notify', url_count: 0, skipped: 'No public page changes.' };
    if (stateFile) {
      state = { ...state, attempt: startAttempt(urls, actual) };
      writeDeliveryState(stateFile, state); // A crash or uncertain response must never make the next run replay silently.
    }
    let receipt;
    try { receipt = await submit(urls, fetcher); }
    catch (error) {
      if (stateFile) writeDeliveryState(stateFile, { ...state, attempt: { ...state.attempt, phase: 'held',
        completed_at: new Date().toISOString(), outcome: error.httpStatus ? 'rejected' : 'ambiguous', http_status: error.httpStatus ?? null } });
      throw error;
    }
    if (stateFile) writeDeliveryState(stateFile, acknowledgeManifest(state, actual, receipt));
    return { action: 'notify', ...receipt };
  }
  throw new Error('Usage: indexnow.mjs snapshot --output NEW-FILE [--state FILE] | bootstrap | notify --before FILE --expected BUILT-MANIFEST [--state FILE]');
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href) {
  try { console.log(JSON.stringify(await runIndexNow(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
