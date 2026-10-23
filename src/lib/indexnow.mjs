import { createHash } from 'node:crypto';

// Public host-verification material, not a credential or analytics identifier.
export const indexNow = Object.freeze({
  host: 'chinesebikes.xyz',
  origin: 'https://chinesebikes.xyz',
  key: '2fd71df35b38ebc67439056c47f11e40',
  endpoint: 'https://api.indexnow.org/indexnow',
  manifestPath: '/indexnow-manifest.json',
  maxUrls: 10_000
});
export const indexNowKeyUrl = `${indexNow.origin}/${indexNow.key}.txt`;
const publicPath = /^\/(?:(?:zh|de)\/)?(?:(?:models|brands|prices|complete-bikes|framesets|build|geometry|methodology|privacy|image-policy|image-sources|electronic-shifting|carbon-wheels|blog)(?:\/[a-z0-9-]+)*\/)?$/;

export function validatePublicUrl(value) {
  const parsed = new URL(value);
  if (parsed.origin !== indexNow.origin || parsed.href !== value || parsed.username || parsed.password || parsed.search || parsed.hash || !publicPath.test(parsed.pathname)) {
    throw new Error('IndexNow requires a canonical public same-host HTTPS page URL.');
  }
  return value;
}

export function validateManifest(manifest) {
  if (manifest?.schema_version !== 1 || manifest.host !== indexNow.host || !manifest.pages || Array.isArray(manifest.pages) || typeof manifest.pages !== 'object') {
    throw new Error('Invalid IndexNow manifest schema or host.');
  }
  if (Object.keys(manifest.pages).length > indexNow.maxUrls) throw new Error('IndexNow manifest exceeds the bounded URL limit.');
  for (const [url, hash] of Object.entries(manifest.pages)) {
    validatePublicUrl(url);
    if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid IndexNow page digest.');
  }
  return manifest;
}

export function createIndexNowManifest({ siteUrl, base, pages, readPage }) {
  if (siteUrl !== indexNow.origin || base) return null;
  const entries = [...pages].filter(([, page]) => page.includeInSitemap).map(([route, page]) => [
    validatePublicUrl(`${siteUrl}${route}`),
    createHash('sha256').update(readPage(page.file)).digest('hex')
  ]).sort(([a], [b]) => a.localeCompare(b));
  return validateManifest({ schema_version: 1, host: indexNow.host, pages: Object.fromEntries(entries) });
}

export function changedPublicUrls(before, after) {
  validateManifest(before); validateManifest(after);
  const urls = [...new Set([...Object.keys(before.pages), ...Object.keys(after.pages)])]
    .filter(url => before.pages[url] !== after.pages[url]).sort();
  if (urls.length > indexNow.maxUrls) throw new Error('IndexNow change set exceeds one bounded request.');
  return urls;
}

export function sitemapPublicUrls(xml) {
  if (!/<urlset(?:\s|>)/.test(xml) || /<!DOCTYPE/i.test(xml)) throw new Error('Expected the public URL sitemap.');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, value]) => validatePublicUrl(value
    .replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>')));
  if (!urls.length || urls.length > indexNow.maxUrls || new Set(urls).size !== urls.length) throw new Error('Invalid or unbounded sitemap URL inventory.');
  return urls.sort();
}

export function indexNowPayload(urls) {
  if (!urls.length || urls.length > indexNow.maxUrls || new Set(urls).size !== urls.length) throw new Error('IndexNow requires 1–10000 distinct URLs.');
  urls.forEach(validatePublicUrl);
  return { host: indexNow.host, key: indexNow.key, keyLocation: indexNowKeyUrl, urlList: urls };
}
