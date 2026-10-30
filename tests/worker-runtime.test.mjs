import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadWranglerRuntime() {
  for (const entry of (process.env.PATH ?? '').split(delimiter)) {
    const executable = join(entry, process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler');
    if (!existsSync(executable)) continue;
    let directory;
    try { directory = dirname(realpathSync(executable)); } catch { continue; }
    while (directory !== dirname(directory)) {
      const packagePath = join(directory, 'package.json');
      if (existsSync(packagePath)) {
        try {
          if (JSON.parse(readFileSync(packagePath, 'utf8')).name === 'wrangler') {
            const require = createRequire(packagePath);
            const miniflare = require('miniflare');
            if (typeof miniflare.Miniflare !== 'function'
              || typeof miniflare.convertV4MiniflareOptions !== 'function') return null;
            return { ...miniflare, require };
          }
        } catch {
          // Continue up the executable's package tree.
        }
      }
      directory = dirname(directory);
    }
  }
  return null;
}

const runtime = loadWranglerRuntime();

test('workerd accepts empty event POSTs and does not follow collector redirects', {
  skip: runtime ? false : 'Wrangler with its bundled Miniflare runtime is unavailable',
  timeout: 20_000
}, async () => {
  const config = JSON.parse(await readFile(join(root, 'wrangler.jsonc'), 'utf8'));
  const assetsDirectory = await mkdtemp(join(tmpdir(), 'china-bikes-worker-runtime-'));
  const outbound = [];
  const collectorStatuses = [];
  let redirectCollector = false;
  let mf;
  try {
    const options = runtime.convertV4MiniflareOptions({
      assets: {
        directory: assetsDirectory,
        binding: config.assets.binding,
        run_worker_first: config.assets.run_worker_first
      },
      workers: [{
        name: config.name,
        modulesRoot: root,
        modules: [
          { type: 'ESModule', path: 'worker/index.mjs' },
          { type: 'ESModule', path: 'worker/ga4.mjs' },
          { type: 'ESModule', path: 'worker/consent.mjs' },
          { type: 'ESModule', path: 'worker/ingest-client.mjs' },
          { type: 'ESModule', path: 'worker/markdown.mjs' }
        ],
        compatibilityDate: config.compatibility_date,
        compatibilityFlags: config.compatibility_flags ?? [],
        routes: [`${config.routes[0].pattern}/*`],
        bindings: {
          ANALYTICS_INGEST_URL: 'https://collector.invalid/ingest/v1',
          ANALYTICS_INGEST_TOKEN: 'runtime-test-token'
        }
      }]
    });
    options.workers[0].dev ??= {};
    options.workers[0].dev.outboundService = {
      type: 'fetcher',
      handler: async (request) => {
        const url = new URL(request.url);
        outbound.push({ url: request.url, body: await request.clone().text() });
        if (url.hostname !== 'collector.invalid') throw new Error(`Unexpected outbound host: ${url.hostname}`);
        if (redirectCollector) {
          return new Response(null, { status: 302, headers: { location: 'https://redirect.invalid/collect' } });
        }
        return new Response(null, { status: collectorStatuses.shift() ?? 204 });
      }
    };
    mf = new runtime.Miniflare(options);

    const waitForOutbound = async (count) => {
      const deadline = Date.now() + 2_000;
      while (outbound.length < count && Date.now() < deadline) {
        await new Promise((resolveWait) => setTimeout(resolveWait, 10));
      }
      assert.equal(outbound.length, count, `expected ${count} collector request(s), got ${outbound.length}`);
    };
    const dispatchEngagement = (extraHeaders = {}, body) => mf.dispatchFetch(
      'https://chinesebikes.xyz/site-events/engagement',
      {
        method: 'POST',
        cf: { country: 'US' },
        headers: {
          origin: 'https://chinesebikes.xyz',
          'content-length': body === undefined ? '0' : String(new TextEncoder().encode(body).byteLength),
          'cf-connecting-ip': '203.0.113.10',
          'user-agent': 'Mozilla/5.0 runtime fixture',
          cookie: 'p0s_analytics_consent=v1',
          'x-analytics-path': '/',
          ...extraHeaders
        },
        ...(body === undefined ? {} : { body })
      }
    );

    const qaResponse = await dispatchEngagement({ 'x-measurement-qa': '1' });
    assert.equal(qaResponse.status, 204);
    await waitForOutbound(1);
    assert.equal(outbound[0].url, 'https://collector.invalid/ingest/v1');
    const { eventId, ...qaBody } = JSON.parse(outbound[0].body);
    assert.match(eventId, /^[0-9a-f]{32}$/);
    assert.deepEqual(qaBody, {
      hostname: 'chinesebikes.xyz',
      path: '/',
      ip: '203.0.113.10',
      userAgent: 'Mozilla/5.0 runtime fixture',
      country: 'US',
      eventName: 'page_engaged',
      qa: true
    });

    const invalidBody = await dispatchEngagement({}, 'unbounded payload');
    assert.equal(invalidBody.status, 400);
    assert.equal(outbound.length, 1);

    // The start signal is a stage count without visitor fields; a 503 gets
    // exactly one retry with the same event ID, and 409 is never resent.
    collectorStatuses.push(503, 409);
    assert.equal((await dispatchEngagement({ 'x-analytics-signal': 'bootstrap' })).status, 204);
    await waitForOutbound(3);
    const [first, retry] = outbound.slice(1).map(({ url, body }) => ({ url, body: JSON.parse(body) }));
    assert.equal(first.url, 'https://collector.invalid/ingest/stage/v1');
    assert.equal(retry.url, first.url);
    assert.deepEqual(first.body, { stage: 'bootstrap', eventId: first.body.eventId });
    assert.deepEqual(retry.body, { ...first.body, attempt: 2 });
    assert.equal((await dispatchEngagement({ 'x-analytics-signal': 'visible' })).status, 204);
    await waitForOutbound(4);
    assert.equal(outbound[3].url, 'https://collector.invalid/ingest/v1');
    assert.equal(JSON.parse(outbound[3].body).eventName, 'page_visible');

    redirectCollector = true;
    const redirectResponse = await dispatchEngagement();
    assert.equal(redirectResponse.status, 204);
    await waitForOutbound(5);
    assert.equal(outbound[4].url, 'https://collector.invalid/ingest/v1');

    const dntResponse = await dispatchEngagement({ dnt: '1' });
    assert.equal(dntResponse.status, 204);
    await new Promise((resolveWait) => setTimeout(resolveWait, 30));
    assert.equal(outbound.length, 5);
  } finally {
    await mf?.dispose();
    await rm(assetsDirectory, { recursive: true, force: true });
  }
});
