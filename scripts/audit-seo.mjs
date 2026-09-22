/** Generated-HTML SEO contract. Uses only Node built-ins; never submits to a search engine. */
import fs from 'node:fs';
import path from 'node:path';
const dist = path.resolve(import.meta.dirname, '../dist');
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'build-manifest.json'), 'utf8'));
const { base, site_url: origin } = manifest;
const files = fs.readdirSync(dist, { recursive: true }).filter((name) => name.endsWith('.html'));
const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
const xmlDecode = (s) => s.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#039;', "'");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => xmlDecode(m[1]));
const sitemapSet = new Set(sitemapUrls);
const errors = [];
if (sitemapSet.size !== sitemapUrls.length) errors.push('Duplicate sitemap URLs');
const titles = new Map(), descriptions = new Map(), indexable = new Set();
for (const file of files) {
  const html = fs.readFileSync(path.join(dist, file), 'utf8');
  const route = '/' + file.replaceAll(path.sep, '/').replace(/index\.html$/, '');
  const absolute = `${origin}${base}${route}`;
  const isZh = route.startsWith('/zh/');
  const untranslated = isZh ? route.slice(3) : route;
  const noindex = /<meta name="robots" content="noindex,follow">/.test(html);
  const canonical = [...html.matchAll(/<link rel="canonical" href="([^"]+)">/g)];
  if (canonical.length !== 1 || xmlDecode(canonical[0]?.[1] ?? '') !== absolute) errors.push(`${file}: invalid self-canonical`);
  if (!html.includes(`<html lang="${isZh ? 'zh-Hans' : 'en'}">`)) errors.push(`${file}: incorrect document language`);
  if ([...html.matchAll(/<h1\b/g)].length !== 1) errors.push(`${file}: expected exactly one H1`);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
  if (!title || !description) errors.push(`${file}: empty title/description`);
  if (titles.has(title)) errors.push(`${file}: duplicate title with ${titles.get(title)}`);
  titles.set(title, file);
  const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)];
  if (noindex) {
    if (sitemapSet.has(absolute)) errors.push(`${file}: noindex URL is in sitemap`);
    if (alternates.length) errors.push(`${file}: noindex page advertises indexable alternates`);
  } else {
    indexable.add(absolute);
    if (!sitemapSet.has(absolute)) errors.push(`${file}: indexable URL absent from sitemap`);
    if (descriptions.has(description)) errors.push(`${file}: duplicate indexable description with ${descriptions.get(description)}`);
    descriptions.set(description, file);
    if (alternates.length !== 3) errors.push(`${file}: expected three language links`);
    for (const lang of ['en','zh-Hans','x-default']) {
      const expected = `${origin}${base}${lang === 'zh-Hans' ? '/zh' : ''}${untranslated}`;
      if (!alternates.some((match) => match[1] === lang && xmlDecode(match[2]) === expected)) errors.push(`${file}: incorrect ${lang} alternate`);
      const target = path.join(dist, `${lang === 'zh-Hans' ? '/zh' : ''}${untranslated}`.replace(/^\//,''), 'index.html');
      if (!fs.existsSync(target)) errors.push(`${file}: missing language counterpart`);
    }
  }
  for (const match of html.matchAll(/<script type="application\/(?:ld\+)?json">([^<]+)<\/script>/g)) {
    try { JSON.parse(match[1]); } catch { errors.push(`${file}: invalid embedded JSON`); }
  }
}
for (const url of sitemapSet) if (!indexable.has(url)) errors.push(`Sitemap URL has no indexable generated page: ${url}`);
if (errors.length) {
  console.error(`SEO audit failed with ${errors.length} errors:\n${errors.join('\n')}`);
  process.exit(1);
}
console.log(`SEO audit passed: ${files.length} pages; ${indexable.size} indexable; ${files.length-indexable.size} noindex; unique titles; reciprocal language links; valid JSON.`);
