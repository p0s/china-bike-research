/** Local generated-HTML audit. No network requests or build side effects. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function decodeHtml(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (entity, code) => {
    if (code.startsWith('#')) {
      const number = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '\ufffd';
    }
    return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }[code.toLowerCase()];
  });
}

// Tokenize generated markup, ignoring comments and raw text so code examples
// and inline scripts cannot masquerade as links. This is not a general DOM parser.
function elements(html) {
  const tags = [];
  html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/(<(script|style|textarea|title)\b[^>]*>)[\s\S]*?<\/\2\s*>/gi, '$1');
  const tokens = /<([a-z][\w:-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;
  for (const match of html.matchAll(tokens)) {
    const attributes = {};
    for (const attr of match[2].matchAll(/([^\s=/'"<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      const name = attr[1].toLowerCase();
      if (!Object.hasOwn(attributes, name)) attributes[name] = decodeHtml(attr[2] ?? attr[3] ?? attr[4] ?? '');
    }
    tags.push({ tag: match[1].toLowerCase(), attributes });
  }
  return tags;
}

function srcsetUrls(value) {
  const urls = [];
  let rest = value.trim();
  while (rest) {
    rest = rest.replace(/^[\s,]+/, '');
    if (!rest) break;
    const url = rest.match(/^\S+/)[0];
    urls.push(url.replace(/,+$/, ''));
    rest = rest.slice(url.length);
    if (!url.endsWith(',')) {
      const comma = rest.indexOf(',');
      rest = comma < 0 ? '' : rest.slice(comma + 1);
    }
  }
  return urls;
}

export function checkLinks(directory) {
  const root = fs.realpathSync(directory);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'build-manifest.json'), 'utf8'));
  if (typeof manifest.base !== 'string') throw Error('build-manifest.json: missing base path');
  const base = manifest.base.replace(/\/+$/, '');
  const origin = new URL(manifest.site_url ?? 'https://generated.invalid').origin;
  const pages = new Map();
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && /\.html$/i.test(entry.name)) {
        const relative = path.relative(root, file).split(path.sep).join('/');
        const tags = elements(fs.readFileSync(file, 'utf8'));
        const ids = new Set(tags.flatMap(({ tag, attributes: a }) => [a.id, tag === 'a' ? a.name : undefined].filter(v => v !== undefined)));
        pages.set(relative, { tags, ids, destinations: new Set() });
      }
    }
  }
  walk(root);
  if (!pages.size) throw Error('No generated HTML pages found');
  const errors = [];
  let checked = 0;
  for (const [page, { tags }] of pages) {
    // Directory index documents are served at their directory URL.
    const route = page.replace(/(^|\/)index\.html$/i, '$1');
    const pageUrl = new URL(`${base}/${route}`, origin);
    for (const { tag, attributes: a } of tags) {
      const links = [a.href, a.src, ...(a.srcset ? srcsetUrls(a.srcset) : [])].filter(v => v !== undefined);
      for (const value of links) {
        const fail = reason => errors.push(`${page}: broken target ${JSON.stringify(value)} (${reason})`);
        try {
          const url = new URL(value, pageUrl);
          const fileUrl = url.protocol === 'file:';
          // Absolute and protocol-relative same-origin URLs are local too.
          if (!fileUrl && url.origin !== origin) continue;
          checked++;
          let local = decodeURIComponent(url.pathname);
          if (/[\u0000-\u001f\u007f\\]/.test(local)) { fail('invalid path'); continue; }
          if (!fileUrl && base && local !== base && !local.startsWith(`${base}/`)) { fail('outside configured base path'); continue; }
          local = local.slice(base.length) || '/';
          let target = fileUrl ? fileURLToPath(url) : path.resolve(root, `.${local}`);
          // macOS /var and /private/var may name the same temporary fixture.
          if (fileUrl && fs.existsSync(target)) target = fs.realpathSync(target);
          const inside = file => { const rel = path.relative(root, file); return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); };
          if (!inside(target)) { fail('outside output directory'); continue; }
          if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
          if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { fail(`missing file ${path.relative(root, target)}`); continue; }
          if (!inside(fs.realpathSync(target))) { fail('outside output directory'); continue; }
          const targetName = path.relative(root, target).split(path.sep).join('/');
          const targetPage = pages.get(targetName);
          // Canonicals, hreflang and resources cannot make a page discoverable.
          if (tag === 'a' && value === a.href && targetPage && !fileUrl && !Object.hasOwn(a, 'download')) {
            pages.get(page).destinations.add(targetName);
          }
          if (url.hash && targetPage) {
            const fragment = decodeURIComponent(url.hash.slice(1)).split(':~:')[0];
            if (fragment && !targetPage.ids.has(fragment)) fail(`missing fragment #${fragment} in ${path.relative(root, target)}`);
          }
        } catch (error) { fail(`invalid URL or target: ${error.message}`); }
      }
    }
  }
  const reachable = new Set();
  const queue = pages.has('index.html') ? ['index.html'] : [];
  for (let i = 0; i < queue.length; i++) {
    const page = queue[i];
    if (reachable.has(page)) continue;
    reachable.add(page);
    queue.push(...pages.get(page).destinations);
  }
  const orphaned = [];
  const sitemapFile = path.join(root, 'sitemap.xml');
  if (fs.existsSync(sitemapFile)) {
    const sitemap = fs.readFileSync(sitemapFile, 'utf8');
    for (const [, value] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const url = new URL(decodeHtml(value));
      if (url.origin !== origin) throw Error('sitemap.xml: URL outside configured origin');
      const pathname = decodeURIComponent(url.pathname);
      if (base && pathname !== base && !pathname.startsWith(`${base}/`)) throw Error('sitemap.xml: URL outside configured base');
      const route = pathname.slice(base.length).replace(/^\//, '');
      const page = route.endsWith('/') || !route ? `${route}index.html` : route;
      if (!reachable.has(page)) orphaned.push(page);
    }
    for (const page of orphaned) errors.push(`${page}: indexable page is unreachable through HTML links from the homepage`);
  }
  return { errors, pages: pages.size, checked, orphaned };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = checkLinks(path.resolve(process.argv[2] ?? path.join(import.meta.dirname, '../dist')));
    if (result.errors.length) {
      console.error(`Generated link check failed:\n${result.errors.join('\n')}`);
      process.exitCode = 1;
    } else console.log(`Generated link check passed: ${result.pages} pages; ${result.checked} local links.`);
  } catch (error) {
    console.error(`Generated link check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
