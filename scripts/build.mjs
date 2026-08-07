import fs from 'node:fs';
import path from 'node:path';
import {
  loadDataset,
  joinProducts,
  validateDataset,
  formatPrice,
  maxClearance,
  clearanceLabel
} from '../src/lib/data.mjs';
import { parseFrontmatter } from '../src/lib/html.mjs';
import {
  renderHome,
  renderExplorerPage,
  renderModel,
  renderBrandsIndex,
  renderBrand,
  renderCompare,
  renderResearch,
  renderGuidesIndex,
  renderGuide,
  renderMethodology,
  renderPrivacy,
  renderContribute,
  renderAbout,
  render404
} from '../src/render.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const githubRepository = process.env.GITHUB_REPOSITORY ?? '';
const [owner = '', repository = ''] = githubRepository.split('/');
const projectBase = repository && !repository.endsWith('.github.io') ? `/${repository}` : '';
const rawBase = process.env.PUBLIC_BASE_PATH ?? (process.env.GITHUB_ACTIONS === 'true' ? projectBase : '');
const base = rawBase ? `/${rawBase.replace(/^\/+|\/+$/g, '')}` : '';
const siteUrl = (process.env.PUBLIC_SITE_URL ?? (owner ? `https://${owner}.github.io` : 'https://example.invalid')).replace(/\/$/, '');
const repositoryUrl = (process.env.PUBLIC_REPOSITORY_URL ?? (githubRepository ? `https://github.com/${githubRepository}` : 'https://github.com/OWNER/china-carbon-bike-guide')).replace(/\/$/, '');

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
function xml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

const data = loadDataset();
const errors = validateDataset(data);
if (errors.length) {
  console.error(`Data validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
const products = joinProducts(data);
const now = new Date();
const ctx = { data, products, base, siteUrl, repositoryUrl, now };

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
copyDir(path.join(root, 'assets'), path.join(dist, 'assets'));
write('.nojekyll', '');

const guideDir = path.join(root, 'content/guides');
const guides = fs.readdirSync(guideDir)
  .filter((name) => name.endsWith('.md'))
  .sort()
  .map((name) => {
    const slug = name.replace(/\.md$/, '');
    const { data: frontmatter, body } = parseFrontmatter(fs.readFileSync(path.join(guideDir, name), 'utf8'));
    return {
      slug,
      title: frontmatter.title ?? slug,
      description: frontmatter.description ?? '',
      reviewed: frontmatter.reviewed ?? data.meta.snapshot_date,
      body
    };
  });

const pages = new Map();
function add(route, html, includeInSitemap = true) {
  const file = routeFile(route);
  write(file, html);
  pages.set(route, { file, includeInSitemap });
}

add('/', renderHome(ctx));
add('/bikes/', renderExplorerPage(ctx, 'complete-bike'));
add('/frames/', renderExplorerPage(ctx, 'frameset'));
add('/compare/', renderCompare(ctx));
add('/brands/', renderBrandsIndex(ctx));
for (const brand of data.brands) {
  if (products.some((product) => product.brand.id === brand.id)) add(`/brands/${brand.id}/`, renderBrand(ctx, brand));
}
for (const product of products) add(`/models/${product.variant.id}/`, renderModel(ctx, product));
add('/guides/', renderGuidesIndex(ctx, guides));
for (const guide of guides) add(`/guides/${guide.slug}/`, renderGuide(ctx, guide));
add('/research/', renderResearch(ctx));
add('/methodology/', renderMethodology(ctx));
add('/privacy/', renderPrivacy(ctx));
add('/contribute/', renderContribute(ctx));
add('/about/', renderAbout(ctx));
add('/404.html', render404(ctx), false);

const catalog = {
  generated_at: new Date().toISOString(),
  snapshot_date: data.meta.snapshot_date,
  scope: data.meta.scope,
  license: 'CC BY 4.0',
  products: products.map(({ brand, platform, variant, prices, sources }) => ({
    id: variant.id,
    brand: { id: brand.id, name: brand.name, name_zh: brand.name_zh ?? null },
    platform,
    variant,
    prices,
    sources: sources.map(({ id, type, title, publisher, language, accessed_at, url, reliability, notes }) => ({ id, type, title, publisher, language, accessed_at, url, reliability, notes }))
  }))
};
write('data/catalog.json', `${JSON.stringify(catalog, null, 2)}\n`);
write('data/sources.json', `${JSON.stringify({ generated_at: catalog.generated_at, sources: data.sources }, null, 2)}\n`);
write('data/build-profiles.json', `${JSON.stringify({ generated_at: catalog.generated_at, build_profiles: data.buildProfiles }, null, 2)}\n`);

const headers = [
  'id','brand','brand_zh','model','kind','category','handlebar','price_cny','price_label','price_date','price_type','price_status',
  'clearance_mm','clearance_label','clearance_note','clearance_evidence','eligibility','bottom_bracket','hanger','storage','frame_weight_g','complete_weight_g',
  'drivetrain','manufacturing_relationship','manufacturing_confidence','china_availability','verdict','model_url'
];
const rows = products.map(({ brand, platform, variant, latestPrice }) => {
  const value = latestPrice?.amount_cny ?? latestPrice?.low_cny ?? '';
  return [
    variant.id, brand.name, brand.name_zh ?? '', variant.name, variant.kind, platform.category, platform.handlebar,
    value, formatPrice(latestPrice), latestPrice?.observed_at ?? '', latestPrice?.price_type ?? '', latestPrice?.status ?? '',
    maxClearance(platform) ?? '', clearanceLabel(platform), platform.tire_clearance.note, platform.tire_clearance.evidence, platform.tire_clearance.eligibility,
    platform.frame.bottom_bracket, platform.frame.derailleur_hanger, platform.internal_storage ? 'yes' : 'no',
    platform.frame.claimed_frame_weight_g ?? '', variant.claimed_complete_weight_g ?? '',
    variant.drivetrain ? `${variant.drivetrain.brand} ${variant.drivetrain.model} ${variant.drivetrain.speeds}` : 'frameset',
    brand.manufacturing.relationship, brand.manufacturing.confidence, platform.china_availability, variant.editorial.verdict,
    `${siteUrl}${base}/models/${variant.id}/`
  ];
});
write('data/catalog.csv', `${headers.map(csvCell).join(',')}\n${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`);

const sitemapRoutes = [...pages.entries()].filter(([, info]) => info.includeInSitemap).map(([route]) => route);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRoutes.map((route) => `  <url><loc>${xml(`${siteUrl}${base}${route}`)}</loc><lastmod>${data.meta.snapshot_date}</lastmod></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${siteUrl}${base}/sitemap.xml\n`);
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
    guides: guides.length,
    pages: pages.size
  }
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
for (const [route, info] of pages) {
  const file = path.join(dist, info.file);
  const html = fs.readFileSync(file, 'utf8');
  const pageUrl = `https://local.invalid${base}${route}`;
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
