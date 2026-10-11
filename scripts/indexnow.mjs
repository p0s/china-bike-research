import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { indexNow, indexNowKeyUrl, validateManifest, changedPublicUrls, sitemapPublicUrls, indexNowPayload } from '../src/lib/indexnow.mjs';

const readOptions = { redirect: 'error', headers: { DNT: '1', 'User-Agent': 'ChinaBikes-IndexNow/1.0', 'Cache-Control': 'no-cache' } };
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
async function submit(urls, fetcher) {
  const payload = indexNowPayload(urls);
  const response = await fetcher(indexNow.endpoint, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'User-Agent': readOptions.headers['User-Agent'] },
    body: JSON.stringify(payload)
  });
  const body = await responseText(response, 16_384);
  const receipt = { endpoint: indexNow.endpoint, host: indexNow.host, key_url: indexNowKeyUrl, url_count: urls.length, http_status: response.status, response: body, submitted_at: new Date().toISOString(), indexing_proven: false };
  if (![200, 202].includes(response.status)) throw new Error(`IndexNow did not accept the notification: ${JSON.stringify(receipt)}`);
  return receipt;
}

export async function runIndexNow(args, { fetcher = fetch } = {}) {
  const [command, ...options] = args;
  if (command === 'snapshot' && options.length === 2 && options[0] === '--output') {
    const baseline = await liveManifest(fetcher, true);
    fs.writeFileSync(options[1], `${JSON.stringify({ schema_version: 1, host: indexNow.host, baseline })}\n`, { flag: 'wx' });
    return { action: 'snapshot', url_count: baseline ? Object.keys(baseline.pages).length : 0, initial_manifest_missing: baseline === null };
  }
  if (command === 'bootstrap' && !options.length) {
    await verifyKey(fetcher);
    const manifest = await liveManifest(fetcher);
    const urls = sitemapPublicUrls(await readLive(`${indexNow.origin}/sitemap.xml`, fetcher));
    if (JSON.stringify(urls) !== JSON.stringify(Object.keys(manifest.pages).sort())) throw new Error('Live sitemap and public manifest differ; do not submit a mixed deployment.');
    return { action: 'bootstrap', ...await submit(urls, fetcher) };
  }
  if (command === 'notify' && options.length === 4 && options[0] === '--before' && options[2] === '--expected') {
    const snapshot = JSON.parse(fs.readFileSync(options[1], 'utf8'));
    if (snapshot.schema_version !== 1 || snapshot.host !== indexNow.host || !Object.hasOwn(snapshot, 'baseline')) throw new Error('Invalid pre-deployment snapshot.');
    const expected = validateManifest(JSON.parse(fs.readFileSync(options[3], 'utf8')));
    const actual = await liveManifest(fetcher);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Live manifest does not match the deployed build; notification withheld.');
    await verifyKey(fetcher);
    if (snapshot.baseline === null) return { action: 'notify', url_count: 0, skipped: 'First manifest deployment. Run bootstrap once after live verification.' };
    const urls = changedPublicUrls(snapshot.baseline, actual);
    return urls.length ? { action: 'notify', ...await submit(urls, fetcher) } : { action: 'notify', url_count: 0, skipped: 'No public page changes.' };
  }
  throw new Error('Usage: indexnow.mjs snapshot --output NEW-FILE | bootstrap | notify --before FILE --expected BUILT-MANIFEST');
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href) {
  try { console.log(JSON.stringify(await runIndexNow(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
