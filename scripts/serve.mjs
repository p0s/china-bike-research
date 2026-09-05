import http from 'node:http';
import fs from 'node:fs';
import { open, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pipeline } from 'node:stream';

const defaultRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
};
const headers = {
  'cache-control': 'no-cache', 'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

export function normalizeBase(value = '') {
  const clean = String(value).replace(/^\/+|\/+$/g, '');
  if (!clean) return '';
  if (!clean.split('/').every((segment) => /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(segment))) {
    throw new Error('PUBLIC_BASE_PATH must contain safe path segments, not a URL, query, or dot traversal.');
  }
  return `/${clean}`;
}

export function parsePort(value = '4173') {
  if (!/^\d+$/.test(String(value))) throw new Error('PORT must be an integer from 0 to 65535.');
  const port = Number(value);
  if (!Number.isInteger(port) || port > 65535) throw new Error('PORT must be an integer from 0 to 65535.');
  return port;
}

function within(root, file) {
  const relative = path.relative(root, file);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function manifestBase(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'build-manifest.json'), 'utf8')).base ?? ''; }
  catch (error) {
    if (error.code === 'ENOENT') return '';
    throw new Error('Cannot read build-manifest.json. Rebuild the site before previewing.', { cause: error });
  }
}

/** Local preview only; deliberately never binds to an external interface. */
export function createPreviewServer({ root = defaultRoot, base } = {}) {
  const directory = fs.realpathSync(root);
  const mount = normalizeBase(base ?? process.env.PUBLIC_BASE_PATH ?? manifestBase(directory));

  function send(request, response, status, message, extra = {}) {
    response.writeHead(status, { ...headers, 'content-type': 'text/plain; charset=utf-8',
      'content-length': Buffer.byteLength(message), ...extra });
    response.end(request.method === 'HEAD' ? undefined : message);
  }

  async function resolveFile(file) {
    if (!within(directory, file)) return { forbidden: true };
    try {
      const resolved = await realpath(file);
      if (!within(directory, resolved)) return { forbidden: true };
      return { path: resolved, stats: await stat(resolved) };
    } catch (error) {
      if (['ENOENT', 'ENOTDIR', 'ELOOP'].includes(error.code)) return null;
      if (error.code === 'EACCES' || error.code === 'EPERM') return { forbidden: true };
      throw error;
    }
  }

  async function handle(request, response) {
    if (!['GET', 'HEAD'].includes(request.method)) return send(request, response, 405, 'Method not allowed', { allow: 'GET, HEAD' });
    const raw = request.url ?? '/';
    if (!raw.startsWith('/') || raw.startsWith('//')) return send(request, response, 400, 'Bad request');
    let url, pathname;
    try {
      url = new URL(raw, 'http://localhost'); // Never use an untrusted Host as a URL base.
      pathname = decodeURIComponent(url.pathname);
    } catch { return send(request, response, 400, 'Bad request'); }
    if (/[\u0000-\u001f\u007f\\]/.test(pathname)) return send(request, response, 400, 'Bad request');
    if (mount && pathname === '/') {
      response.writeHead(302, { ...headers, location: `${mount}/${url.search}` });
      return response.end();
    }
    if (mount && pathname !== mount && !pathname.startsWith(`${mount}/`)) return send(request, response, 404, 'Not found');
    const local = pathname.slice(mount.length) || '/';
    let candidate = await resolveFile(path.resolve(directory, `.${local}`));
    if (candidate?.forbidden) return send(request, response, 403, 'Forbidden');
    if (candidate?.stats.isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        response.writeHead(308, { ...headers, location: `${url.pathname}/${url.search}` });
        return response.end();
      }
      candidate = await resolveFile(path.join(candidate.path, 'index.html'));
    }
    let status = pathname === `${mount}/404.html` ? 404 : 200;
    if (candidate?.forbidden) return send(request, response, 403, 'Forbidden');
    if (!candidate?.stats.isFile()) {
      status = 404;
      candidate = await resolveFile(path.join(directory, '404.html'));
    }
    if (candidate?.forbidden) return send(request, response, 403, 'Forbidden');
    if (!candidate?.stats.isFile()) return send(request, response, 404, 'Not found');
    // Open before sending headers. Missing files or a missing custom 404 cannot crash the process.
    const file = await open(candidate.path, 'r');
    try {
      const info = await file.stat();
      if (!info.isFile()) { await file.close(); return send(request, response, 404, 'Not found'); }
      const etag = `W/"${info.size.toString(16)}-${info.mtimeMs.toString(16)}"`;
      const common = { ...headers, 'content-type': types[path.extname(candidate.path).toLowerCase()] ?? 'application/octet-stream',
        etag, 'last-modified': info.mtime.toUTCString() };
      const tags = (request.headers['if-none-match'] ?? '').split(',').map((tag) => tag.trim().replace(/^W\//, ''));
      if (status === 200 && (tags.includes('*') || tags.includes(etag.replace(/^W\//, '')))) {
        await file.close(); response.writeHead(304, common); return response.end();
      }
      response.writeHead(status, { ...common, 'content-length': info.size });
      if (request.method === 'HEAD') { await file.close(); return response.end(); }
      pipeline(file.createReadStream(), response, () => { /* pipeline closes the file, including client disconnects */ });
    } catch (error) { await file.close().catch(() => {}); throw error; }
  }
  const server = http.createServer((request, response) => {
    handle(request, response).catch((error) => {
      if (response.destroyed) return;
      if (response.headersSent) return response.destroy(error);
      const missing = ['ENOENT', 'ENOTDIR'].includes(error.code);
      send(request, response, missing ? 404 : 500, missing ? 'Not found' : 'Preview could not read this file');
    });
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  return server;
}

export function startPreview(options = {}) {
  const server = createPreviewServer(options);
  const port = parsePort(options.port ?? process.env.PORT ?? '4173');
  server.once('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Set PORT to another port.` : `Preview error: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${server.address().port}`));
  return server;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { startPreview(); }
  catch (error) { console.error(`Preview: ${error.message}`); process.exitCode = 1; }
}
