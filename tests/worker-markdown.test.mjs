import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../worker/index.mjs';
import { appendVary, prefersMarkdown } from '../worker/markdown.mjs';

const files = {
  '/': { type: 'text/html', body: '<!doctype html><html><body>Catalog</body></html>', etag: '"home-html"' },
  '/index.md': { type: 'text/markdown', body: '---\ntitle: "Catalog"\nrobots: "index,follow,max-image-preview:large"\n---\n\n# Catalog\n', etag: '"home-md"' },
  '/models/lead/': { type: 'text/html', body: '<!doctype html><html><body>Lead</body></html>', etag: '"lead-html"' },
  '/models/lead/index.md': { type: 'text/markdown', body: '---\ntitle: "Lead"\nrobots: "noindex,follow"\n---\n\nLead\n', etag: '"lead-md"' },
  '/models/missing/': { type: 'text/html', body: '<!doctype html><html><body>No Markdown</body></html>', etag: '"missing-html"' }
};

function assets() {
  const calls = [];
  return {
    calls,
    fetch: async (request) => {
      const { pathname } = new URL(request.url);
      calls.push({ method: request.method, pathname });
      const file = files[pathname];
      if (!file) return new Response('<!doctype html><title>Not found</title>', { status: 404, headers: { 'content-type': 'text/html' } });
      const headers = { 'content-type': file.type, etag: file.etag, 'cache-control': 'public, max-age=0, must-revalidate', 'content-length': String(new TextEncoder().encode(file.body).length) };
      if (request.headers.get('if-none-match') === file.etag) return new Response(null, { status: 304, headers: { etag: file.etag, 'cache-control': headers['cache-control'] } });
      return new Response(request.method === 'HEAD' ? null : file.body, { headers });
    }
  };
}

async function fetchPath(path, headers = {}, method = 'GET') {
  const ASSETS = assets();
  const waits = [];
  // An ordinary visitor: the HTML control request is analytics-eligible, so Markdown's zero is meaningful.
  const request = new Request(`https://chinesebikes.xyz${path}`, { method, headers: { 'user-agent': 'Mozilla/5.0', 'cf-connecting-ip': '203.0.113.10', ...headers } });
  Object.defineProperty(request, 'cf', { value: { country: 'SG' } });
  const response = await handleRequest(request, { ASSETS }, { waitUntil: (task) => waits.push(task) });
  return { response, calls: ASSETS.calls, waits, body: await response.text() };
}

test('only an explicit Markdown range at least as preferred as HTML selects Markdown', () => {
  for (const accept of ['text/markdown', 'text/x-markdown', 'text/markdown, text/html', 'text/markdown, text/html;q=0.9, */*;q=0.8', 'text/html;q=0.5, text/markdown;q=0.5', 'TEXT/MARKDOWN; charset=utf-8']) {
    assert.equal(prefersMarkdown(accept), true, accept);
  }
  for (const accept of ['', 'text/html', '*/*', 'text/*', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'text/html, text/markdown;q=0.5', 'text/markdown;q=0', 'text/markdown;q=bad', 'application/json']) {
    assert.equal(prefersMarkdown(accept), false, accept);
  }
  const headers = new Headers({ vary: 'Accept-Encoding' });
  appendVary(headers, 'Accept');
  appendVary(headers, 'accept');
  assert.equal(headers.get('vary'), 'Accept-Encoding, Accept');
});

test('a negotiated page returns its Markdown, varies by Accept and is never a page view', async () => {
  const { response, calls, waits, body } = await fetchPath('/', { accept: 'text/markdown, text/html;q=0.9' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/markdown; charset=utf-8');
  assert.equal(response.headers.get('vary'), 'Accept');
  assert.equal(response.headers.get('content-signal'), 'search=yes, ai-input=yes');
  assert.equal(response.headers.get('etag'), '"home-md"');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.has('x-robots-tag'), false);
  assert.equal(response.headers.has('link'), false);
  assert.equal(body, files['/index.md'].body);
  assert.deepEqual(calls, [{ method: 'GET', pathname: '/index.md' }]);
  assert.equal(waits.length, 0);

  const head = await fetchPath('/', { accept: 'text/markdown' }, 'HEAD');
  assert.equal(head.response.status, 200);
  assert.equal(head.response.headers.get('content-type'), 'text/markdown; charset=utf-8');
  assert.equal(head.body, '');
  assert.deepEqual(head.calls, [{ method: 'GET', pathname: '/index.md' }]);

  const cached = await fetchPath('/', { accept: 'text/markdown', 'if-none-match': '"home-md"' });
  assert.equal(cached.response.status, 304);
  assert.equal(cached.response.headers.get('vary'), 'Accept');
  assert.equal(cached.body, '');
});

test('Markdown repeats a noindex page policy and a .md URL names its HTML page as canonical', async () => {
  const negotiated = await fetchPath('/models/lead/', { accept: 'text/markdown' });
  assert.equal(negotiated.response.headers.get('x-robots-tag'), 'noindex,follow');
  assert.equal(negotiated.response.headers.has('link'), false);

  const direct = await fetchPath('/models/lead/index.md');
  assert.equal(direct.response.status, 200);
  assert.equal(direct.response.headers.get('content-type'), 'text/markdown; charset=utf-8');
  assert.equal(direct.response.headers.get('link'), '<https://chinesebikes.xyz/models/lead/>; rel="canonical"');
  assert.equal(direct.response.headers.get('x-robots-tag'), 'noindex,follow');
  assert.equal(direct.response.headers.has('vary'), false);
  assert.equal(direct.waits.length, 0);

  const home = await fetchPath('/index.md');
  assert.equal(home.response.headers.get('link'), '<https://chinesebikes.xyz/>; rel="canonical"');
  assert.equal(home.response.headers.has('x-robots-tag'), false);

  const absent = await fetchPath('/models/none/index.md');
  assert.equal(absent.response.status, 404);
  assert.match(absent.response.headers.get('content-type'), /^text\/html/);
});

test('HTML documents advertise their Markdown alternate and fall back when none exists', async () => {
  const home = await fetchPath('/');
  assert.equal(home.response.status, 200);
  assert.match(home.response.headers.get('content-type'), /^text\/html/);
  assert.equal(home.response.headers.get('vary'), 'Accept');
  assert.equal(home.response.headers.get('link'), '</index.md>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"; type="text/plain"');
  assert.equal(home.waits.length, 1, 'the HTML control request is an eligible page view');

  const model = await fetchPath('/models/lead/', { accept: 'text/html,application/xhtml+xml,*/*;q=0.8' });
  assert.equal(model.response.headers.get('link'), '</models/lead/index.md>; rel="alternate"; type="text/markdown"');
  assert.deepEqual(model.calls, [{ method: 'GET', pathname: '/models/lead/' }]);

  const fallback = await fetchPath('/models/missing/', { accept: 'text/markdown' });
  assert.equal(fallback.response.status, 200);
  assert.match(fallback.response.headers.get('content-type'), /^text\/html/);
  assert.equal(fallback.response.headers.get('vary'), 'Accept');
  assert.deepEqual(fallback.calls.map((call) => call.pathname), ['/models/missing/index.md', '/models/missing/']);

  const notFound = await fetchPath('/models/none/', { accept: 'text/markdown' });
  assert.equal(notFound.response.status, 404);
  assert.equal(notFound.response.headers.has('link'), false);
  assert.equal(notFound.response.headers.has('vary'), false);
});
