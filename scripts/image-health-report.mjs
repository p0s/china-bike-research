import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDataset } from '../src/lib/data.mjs';

const concurrency = 6;
const timeoutMs = 12_000;

export function classifyImageResponse({ status, contentType = '' }) {
  if ([401, 403, 429].includes(status)) return 'host-blocked';
  if (status < 200 || status >= 400) return 'broken';
  return contentType.toLowerCase().startsWith('image/') ? 'healthy' : 'wrong-content-type';
}

async function requestImage(url, method = 'HEAD') {
  const headers = { 'user-agent': 'china-bike-research-image-health/1.0' };
  if (method === 'GET') headers.range = 'bytes=0-2047';
  const response = await fetch(url, {
    method,
    headers,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs)
  });
  const result = {
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
    finalUrl: response.url
  };
  if (response.body) await response.body.cancel();
  return result;
}

async function inspect(image) {
  const url = image.hosting.remote_url;
  try {
    let response = await requestImage(url, 'HEAD');
    let classification = classifyImageResponse(response);
    if (!['healthy', 'host-blocked'].includes(classification)) {
      response = await requestImage(url, 'GET');
      classification = classifyImageResponse(response);
    }
    return { id: image.id, url, classification, ...response };
  } catch (error) {
    return { id: image.id, url, classification: 'unreachable', error: error instanceof Error ? error.message : String(error) };
  }
}

async function inspectBatch(images) {
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < images.length) {
      const image = images[next++];
      results.push(await inspect(image));
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, images.length) }, worker));
  return results.sort((a, b) => a.id.localeCompare(b.id));
}

async function main() {
  const images = loadDataset().images.filter((image) => image.hosting.mode === 'remote');
  const results = await inspectBatch(images);
  const summary = Object.fromEntries(['healthy', 'host-blocked', 'wrong-content-type', 'broken', 'unreachable'].map((key) => [key, results.filter((result) => result.classification === key).length]));
  for (const result of results) {
    const detail = result.status ? `${result.status} ${result.contentType || 'unknown content type'}` : result.error;
    console.log(`${result.classification.padEnd(18)} ${result.id} — ${detail}`);
  }
  console.log(`\nChecked ${results.length} remote images: ${Object.entries(summary).map(([key, count]) => `${count} ${key}`).join(', ')}.`);
  console.log('Host-blocked and unreachable embeds remain non-blocking because the site provides rights-safe local fallbacks.');
  if (process.argv.includes('--strict') && (summary.broken || summary['wrong-content-type'])) process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
