import fs from 'node:fs';
import path from 'node:path';
import {
  loadDataset,
  joinProducts,
  joinCatalogCandidates,
  validateDataset,
  categoryMetric,
  formatAllInPrice,
  formatPrice,
  maxClearance,
  clearanceLongLabel
} from '../src/lib/data.mjs';
import {
  renderHome,
  renderModel,
  renderCandidateModel,
  renderBikeBuilder,
  renderElectronicGroupsets,
  renderLandingPage,
  renderMethodology,
  renderPrivacy,
  renderImagePolicy,
  renderImageSources,
  render404
} from '../src/render.mjs';
import { buildLandingPages } from '../src/lib/landings.mjs';
import { latestDate, sitemapXml } from '../src/lib/seo.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const githubRepository = process.env.GITHUB_REPOSITORY ?? '';
const [owner = '', repository = ''] = githubRepository.split('/');
const projectBase = repository && !repository.endsWith('.github.io') ? `/${repository}` : '';
const rawBase = process.env.PUBLIC_BASE_PATH ?? (process.env.GITHUB_ACTIONS === 'true' ? projectBase : '');
const base = rawBase ? `/${rawBase.replace(/^\/+|\/+$/g, '')}` : '';
const siteUrl = (process.env.PUBLIC_SITE_URL ?? (owner ? `https://${owner}.github.io` : 'https://example.invalid')).replace(/\/$/, '');
const repositoryUrl = (process.env.PUBLIC_REPOSITORY_URL ?? (githubRepository ? `https://github.com/${githubRepository}` : 'https://github.com/p0s/china-bike-research')).replace(/\/$/, '');

function ensureDir(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); }
function write(relative, content) {
  const file = path.join(dist, relative);
  ensureDir(file);
  fs.writeFileSync(file, content);
}
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}
function routeFile(route) {
  if (route === '/') return 'index.html';
  if (route.endsWith('.html')) return route.slice(1);
  return `${route.replace(/^\//, '').replace(/\/$/, '')}/index.html`;
}
function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
const data = loadDataset();
const errors = validateDataset(data);
if (errors.length) {
  console.error(`Data validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
const products = joinProducts(data);
const candidates = joinCatalogCandidates(data);
const siteLastmod = latestDate([
  data.meta.snapshot_date,
  data.brands.map((item) => item.last_reviewed),
  data.platforms.map((item) => item.last_reviewed),
  data.candidates.map((item) => item.last_reviewed),
  data.prices.map((item) => item.observed_at),
  data.sources.map((item) => item.accessed_at)
], data.meta.snapshot_date);
const productLastmod = (product) => latestDate([
  product.brand.last_reviewed,
  product.platform.last_reviewed,
  product.prices.map((item) => item.observed_at),
  product.sources.map((item) => item.accessed_at)
], data.meta.snapshot_date);
const candidateLastmod = (entry) => latestDate([
  entry.candidate.last_reviewed,
  entry.price?.observed_at,
  entry.sources.map((item) => item.accessed_at)
], data.meta.snapshot_date);
const productEvidenceDates = new Map(products.map((product) => [product.variant.id, productLastmod(product)]));
const candidateEvidenceDates = new Map(candidates.map((entry) => [entry.candidate.id, candidateLastmod(entry)]));
const landings = buildLandingPages({ products });
const ctx = {
  data,
  products,
  base,
  siteUrl,
  repositoryUrl,
  now: new Date(),
  siteLastmod,
  productEvidenceDates,
  candidateEvidenceDates,
  brandLandingIds: new Set(landings.brandPages.map((entry) => entry.id))
};
const landingLastmod = (landing) => latestDate([
  landing.brand?.last_reviewed,
  landing.products.map((product) => productEvidenceDates.get(product.variant.id))
], siteLastmod);

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
copyDir(path.join(root, 'assets'), path.join(dist, 'assets'));
write('.nojekyll', '');

const pages = new Map();
function add(route, html, includeInSitemap = true, metadata = {}) {
  const file = routeFile(route);
  write(file, html);
  pages.set(route, { file, includeInSitemap, ...metadata });
}

add('/', renderHome(ctx), true, { lastmod: siteLastmod });
for (const landing of landings.pages) {
  const lastmod = landingLastmod(landing);
  add(landing.route, renderLandingPage(ctx, { ...landing, lastmod }), true, { lastmod });
}
for (const product of products) add(`/models/${product.variant.id}/`, renderModel(ctx, product), true, { lastmod: productLastmod(product) });
for (const candidate of candidates) add(`/models/${candidate.candidate.id}/`, renderCandidateModel(ctx, candidate), candidate.defaultVisible, { lastmod: candidateLastmod(candidate) });
add('/methodology/', renderMethodology(ctx), true, { lastmod: siteLastmod });
add('/build/', renderBikeBuilder(ctx), true, { lastmod: siteLastmod });
add('/electronic-shifting/', renderElectronicGroupsets(ctx), true, { lastmod: siteLastmod });
add('/privacy/', renderPrivacy(ctx), true, { lastmod: siteLastmod });
add('/image-policy/', renderImagePolicy(ctx), true, { lastmod: siteLastmod });
add('/image-sources/', renderImageSources(ctx), true, { lastmod: siteLastmod });
add('/404.html', render404(ctx), false);

const catalog = {
  generated_at: new Date().toISOString(),
  snapshot_date: data.meta.snapshot_date,
  scope: data.meta.scope,
  frameset_build_assumption: data.meta.frameset_build_assumption,
  license: 'CC BY 4.0',
  products: products.map(({ brand, platform, variant, prices, latestPrice, allInPrice, sources, image, imageSource, videos }) => ({
    id: variant.id,
    brand: { id: brand.id, name: brand.name, name_zh: brand.name_zh ?? null },
    platform,
    variant,
    prices,
    latest_price: latestPrice,
    display_price: {
      label: formatAllInPrice({ allInPrice }),
      ...allInPrice
    },
    image,
    image_source: imageSource ? { id: imageSource.id, type: imageSource.type, title: imageSource.title, publisher: imageSource.publisher, url: imageSource.url ?? null } : null,
    videos,
    sources: sources.map(({ id, type, title, publisher, language, accessed_at, url, reliability, notes }) => ({ id, type, title, publisher, language, accessed_at, url, reliability, notes }))
  }))
};
write('data/catalog.json', `${JSON.stringify(catalog, null, 2)}\n`);
write('data/sources.json', `${JSON.stringify({ generated_at: catalog.generated_at, sources: data.sources }, null, 2)}\n`);
write('data/images.json', `${JSON.stringify({ generated_at: catalog.generated_at, images: data.images.filter((image) => image.buyer_visibility !== 'omit') }, null, 2)}\n`);
write('data/videos.json', `${JSON.stringify({ generated_at: catalog.generated_at, videos: data.videos }, null, 2)}\n`);
write('data/groupsets.json', `${JSON.stringify({ generated_at: catalog.generated_at, groupsets: data.groupsets }, null, 2)}\n`);
write('data/build-parts.json', `${JSON.stringify({ generated_at: catalog.generated_at, build_parts: data.buildParts }, null, 2)}\n`);

const headers = [
  'id','brand','brand_zh','model','type','category','handlebar',
  'complete_price_low_cny','complete_price_high_cny','complete_price_label','is_estimate','frameset_price_label','price_date','price_status',
  'clearance_mm','clearance_label','clearance_note','clearance_evidence','eligibility',
  'category_metric_label','category_metric','category_metric_details','bottom_bracket','hanger','storage','frame_weight_g','complete_weight_g','drivetrain',
  'manufacturing_relationship','manufacturing_confidence','china_availability','verdict','image_url','image_source','model_url'
];
const rows = products.map(({ brand, platform, variant, latestPrice, allInPrice, image, imageSource }) => {
  const metric = categoryMetric(platform);
  const clearance = platform.tire_clearance ?? {};
  return [
  variant.id, brand.name, brand.name_zh ?? '', variant.name, variant.kind, platform.category, platform.handlebar,
  allInPrice.low ?? '', allInPrice.high ?? '', formatAllInPrice({ allInPrice }), allInPrice.estimated ? 'yes' : 'no', variant.kind === 'frameset' ? formatPrice(latestPrice) : '', latestPrice?.observed_at ?? '', latestPrice?.status ?? '',
  maxClearance(platform) ?? '', clearanceLongLabel(platform), clearance.note ?? '', clearance.evidence ?? '', clearance.eligibility ?? '',
  metric.label, metric.value, metric.details.join(' '),
  platform.frame.bottom_bracket, platform.frame.derailleur_hanger, platform.internal_storage ? 'yes' : 'no',
  platform.frame.claimed_frame_weight_g ?? '', variant.claimed_complete_weight_g ?? '',
  variant.drivetrain ? `${variant.drivetrain.brand} ${variant.drivetrain.model} ${variant.drivetrain.speeds}` : '',
  brand.manufacturing.relationship, brand.manufacturing.confidence, platform.china_availability, variant.editorial.verdict,
  image?.hosting.mode === 'remote' ? image.hosting.remote_url : image ? `${siteUrl}${base}${image.hosting.local_path}` : '',
  imageSource?.url ?? '', `${siteUrl}${base}/models/${variant.id}/`
  ];
});
write('data/catalog.csv', `${headers.map(csvCell).join(',')}\n${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`);

write('sitemap.xml', sitemapXml({ siteUrl, base, pages, fallbackLastmod: data.meta.snapshot_date }));
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${siteUrl}${base}/sitemap.xml\n`);
const homeHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
// The 247-row unified catalog with production project-base links, typed filters,
// and Build handoff measured 882,764 bytes and 6,791 elements on 2026-08-29.
// These limits retain modest growth headroom while
// keeping the full candidate set available without a second page or client-side
// data fetch.
const performanceBudget = { home_html_bytes: 895_000, home_elements: 7_100 };
const performance = {
  home_html_bytes: Buffer.byteLength(homeHtml),
  home_elements: (homeHtml.match(/<[a-z][^>]*>/gi) ?? []).length
};
for (const [metric, limit] of Object.entries(performanceBudget)) {
  if (performance[metric] > limit) {
    console.error(`Performance budget exceeded: ${metric} is ${performance[metric]}, limit ${limit}.`);
    process.exit(1);
  }
}
write('build-manifest.json', `${JSON.stringify({
  generated_at: catalog.generated_at,
  base,
  site_url: siteUrl,
  repository_url: repositoryUrl,
  counts: {
    brands: data.brands.length,
    platforms: data.platforms.length,
    variants: data.variants.length,
    prices: data.prices.length,
    sources: data.sources.length,
    images: data.images.length,
    videos: data.videos.length,
    groupsets: data.groupsets.length,
    build_parts: data.buildParts.length,
    pages: pages.size
  },
  performance,
  performance_budget: performanceBudget
}, null, 2)}\n`);

function routeToExistingPath(pathname) {
  let local = decodeURIComponent(pathname);
  if (base && local.startsWith(base)) local = local.slice(base.length) || '/';
  if (!local.startsWith('/')) local = `/${local}`;
  if (local === '/') return path.join(dist, 'index.html');
  const withoutSlash = local.replace(/^\//, '');
  if (local.endsWith('/')) return path.join(dist, withoutSlash, 'index.html');
  return path.join(dist, withoutSlash);
}

const linkErrors = [];
for (const [, info] of pages) {
  const file = path.join(dist, info.file);
  const html = fs.readFileSync(file, 'utf8');
  const pageUrl = `https://local.invalid${base}/${info.file === 'index.html' ? '' : info.file}`;
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (!value || value.startsWith('#') || /^(?:mailto:|tel:|javascript:|data:)/i.test(value)) continue;
    let resolved;
    try { resolved = new URL(value, pageUrl); } catch { linkErrors.push(`${info.file}: invalid link ${value}`); continue; }
    if (resolved.origin !== 'https://local.invalid') continue;
    const target = routeToExistingPath(resolved.pathname);
    if (!fs.existsSync(target)) linkErrors.push(`${info.file}: missing internal target ${value} -> ${path.relative(dist, target)}`);
  }
}
if (linkErrors.length) {
  console.error(`Internal link validation failed with ${linkErrors.length} error(s):`);
  for (const error of linkErrors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Built ${pages.size} pages for ${products.length} products.`);
console.log(`Base path: ${base || '/'}`);
console.log(`Output: ${dist}`);
