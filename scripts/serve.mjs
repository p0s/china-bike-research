import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../dist');
const port = Number(process.env.PORT ?? 4173);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.csv':'text/csv; charset=utf-8','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { response.writeHead(400).end('Bad request'); return; }
  let candidate = path.resolve(root, `.${pathname}`);
  if (!candidate.startsWith(root)) { response.writeHead(403).end('Forbidden'); return; }
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) candidate = path.join(candidate, 'index.html');
  if (!fs.existsSync(candidate)) candidate = path.join(root, '404.html');
  const extension = path.extname(candidate);
  response.writeHead(candidate.endsWith('404.html') ? 404 : 200, {'content-type': types[extension] ?? 'application/octet-stream','cache-control':'no-cache'});
  fs.createReadStream(candidate).pipe(response);
});
server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}`));
