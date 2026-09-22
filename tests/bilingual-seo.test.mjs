import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { editorialImages, blogPhotos, postPhotos, resolveBlogPhoto } from '../src/lib/editorial-images.mjs';
import { translate, zh } from '../assets/i18n.js';
import { localePath, localizedHref, localizeHtml, localizeJson } from '../src/lib/i18n.mjs';
import { layout, escapeAttr, escapeHtml } from '../src/lib/html.mjs';
import { candidateIndexable } from '../src/lib/indexing.mjs';
import { loadDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { loadPosts, validatePostReferences, renderPost, renderBlogIndex, renderEvidenceTable } from '../src/lib/posts.mjs';
import { renderBuildExample } from '../src/lib/post-comparisons.mjs';
import { renderCandidateModel, renderModel } from '../src/render.mjs';
const data = loadDataset();
const products = joinProducts(data);
const candidates = joinCatalogCandidates(data);
const posts = loadPosts();
const siteUrl = 'https://china-bikes.p0s.eu';
const ctx = { data, products, catalogCandidates: candidates, posts, base: '', siteUrl, repositoryUrl: 'https://github.com/p0s/china-bike-research', siteLastmod: '2026-09-05' };
const schemas = (html) => [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)].map((m) => JSON.parse(m[1]));

test('locale paths retain English routes and give Chinese independent paths', () => {
  assert.equal(localePath('/', 'en'), '/');
  assert.equal(localePath('/', 'zh-Hans'), '/zh/');
  assert.equal(localePath('/models/test/', 'zh-Hans'), '/zh/models/test/');
});
for (const base of ['', '/china-bike-research']) test(`localized links are base-safe: ${base || '/'}`, () => {
  const options = { base, locale: 'zh-Hans', siteUrl };
  assert.equal(localizedHref(`${base}/models/test/?x=1#sources`, options), `${base}/zh/models/test/?x=1#sources`);
  assert.equal(localizedHref(`${siteUrl}${base}/blog/test/`, options), `${siteUrl}${base}/zh/blog/test/`);
  for (const unchanged of [`${base}/assets/logo.svg`, `${base}/data/catalog.json`, `${base}/zh/models/test/`, '//elsewhere.invalid/models/test/', 'https://manufacturer.invalid/models/test/', '#same-page']) {
    assert.equal(localizedHref(unchanged, options), unchanged);
  }
});
for (const base of ['', '/china-bike-research']) for (const locale of ['en', 'zh-Hans']) test(`self canonical and reciprocal hreflang ${base || '/'} ${locale}`, () => {
  const html = layout({ ...ctx, base, locale, title: 'Buying guides', description: 'Recorded bike evidence', path: '/blog/', body: '<h1>Buying guides</h1>' });
  const prefix = locale === 'zh-Hans' ? '/zh' : '';
  assert.ok(html.includes(`<link rel="canonical" href="${siteUrl}${base}${prefix}/blog/">`));
  assert.ok(html.includes(`hreflang="en" href="${siteUrl}${base}/blog/"`));
  assert.ok(html.includes(`hreflang="zh-Hans" href="${siteUrl}${base}/zh/blog/"`));
  assert.ok(html.includes(`hreflang="x-default" href="${siteUrl}${base}/blog/"`));
  assert.ok(html.includes(`<html lang="${locale}">`));
  assert.ok(html.includes(`data-base="${base}${prefix}"`));
  assert.ok(html.includes(`src="${base}/assets/site.js"`));
  assert.ok(html.includes(`data-language-switch href="${base}${locale === 'en' ? '/zh' : ''}/blog/"`));
});
test('noindex pages stay crawlable but do not advertise indexable language alternates', () => {
  const html = layout({ ...ctx, locale: 'zh-Hans', noindex: true, path: '/models/unfinished/', body: '' });
  assert.match(html, /content="noindex,follow"/);
  assert.doesNotMatch(html, /rel="alternate"/);
});
test('verification token is optional and escaped', () => {
  assert.doesNotMatch(layout({ ...ctx, body: '' }), /name="google-site-verification"/);
  assert.match(layout({ ...ctx, body: '', googleSiteVerification: 'public-token"<>&' }), /content="public-token&quot;&lt;&gt;&amp;"/);
});
test('translation preserves original-source quotations, HTML entities, raw script content and stable identifiers', () => {
  const original = '<p data-original-language lang="en">Framesets &amp; Build</p><p>Home</p><p>A &gt; B</p><script>const x = "Home";</script><style>.Home{color:inherit}</style>';
  const html = localizeHtml(original, { locale: 'zh-Hans', siteUrl });
  assert.match(html, /<p data-original-language lang="en">Framesets &amp; Build<\/p>/);
  assert.match(html, /<p>首页<\/p>/);
  assert.ok(html.includes('A &gt; B'));
  assert.ok(html.includes('const x = "Home";'));
  const json = localizeJson({ id: 'home', type: 'Frameset', category: 'road', label: 'Framesets', url: `${siteUrl}/models/bike/`, citation: [`${siteUrl}/models/bike/#source-records`], inLanguage: 'en' }, { locale: 'zh-Hans', siteUrl });
  assert.equal(json.id, 'home'); assert.equal(json.category, 'road'); assert.equal(json.type, 'Frameset');
  assert.equal(json.label, translate('Framesets', 'zh-Hans'));
  assert.equal(json.url, `${siteUrl}/zh/models/bike/`);
  assert.equal(json.citation[0], `${siteUrl}/zh/models/bike/#source-records`);
  assert.equal(json.inLanguage, 'zh-Hans');
});
test('every published model has a reviewed Chinese verdict without rewriting the original data', () => {
  assert.equal(products.length, 41);
  for (const { variant } of products) {
    assert.ok(zh[variant.editorial.verdict], `Missing native summary for ${variant.id}`);
    assert.match(translate(variant.editorial.verdict, 'zh-Hans'), /[\u3400-\u9fff]/);
  }
});
test('research indexing is an evidence gate, not just catalog visibility', () => {
  const qualified = { identifiableModel: true, defaultVisible: true, candidate: { status: 'research', facts: { frame: 'carbon', tires: '40C', frame_weight_g: 1000 } }, sources: [{ url: 'https://maker.invalid/exact-model' }] };
  assert.equal(candidateIndexable(qualified), true);
  assert.equal(candidateIndexable({ ...qualified, defaultVisible: false }), false);
  assert.equal(candidateIndexable({ ...qualified, identifiableModel: false }), false);
  assert.equal(candidateIndexable({ ...qualified, sources: [] }), false);
  assert.equal(candidateIndexable({ ...qualified, candidate: { status: 'model-unclear', facts: qualified.candidate.facts } }), false);
  assert.equal(candidateIndexable({ ...qualified, candidate: { facts: { frame: 'unknown', tires: 'not confirmed', frame_weight_g: 0 } } }), false);
  assert.ok(candidates.some(candidateIndexable), 'Retain genuinely useful research pages');
  assert.ok(candidates.some((entry) => !candidateIndexable(entry)), 'Do not index every unfinished research page');
});
test('a real low-evidence profile is noindex while useful model and original records remain available', () => {
  const candidate = candidates.find((entry) => !candidateIndexable(entry));
  const html = renderCandidateModel({ ...ctx, locale: 'zh-Hans' }, candidate);
  assert.match(html, /noindex,follow/);
  assert.match(html, /data-original-language/);
  assert.match(html, /原始研究说明/);
  const productHtml = renderModel({ ...ctx, locale: 'zh-Hans' }, products[0]);
  assert.match(productHtml, /index,follow,max-image-preview:large/);
  assert.match(productHtml, /尚未逐条翻译/);
});
test('four bilingual articles have valid stable identities and only known evidence references', () => {
  assert.equal(posts.length, 4);
  assert.doesNotThrow(() => validatePostReferences(posts, data, products));
  for (const post of posts) {
    assert.match(post.translations['zh-Hans'].title, /[\u3400-\u9fff]/);
    for (const locale of ['en', 'zh-Hans']) assert.ok(post.translations[locale].sections.length >= 3);
  }
  assert.throws(() => validatePostReferences([{ ...posts[0], model_ids: ['not-a-real-model'] }], data, products));
});
for (const locale of ['en', 'zh-Hans']) test(`articles render genuine byline, dated evidence and matching structured data: ${locale}`, () => {
  for (const post of posts) {
    const html = renderPost({ ...ctx, locale }, post, posts);
    const schema = schemas(html).find((item) => item['@type'] === 'BlogPosting');
    assert.equal(schema.headline, post.translations[locale].title);
    assert.equal(schema.inLanguage, locale);
    assert.equal(schema.url, `${siteUrl}${localePath(`/blog/${post.slug}/`, locale)}`);
    assert.equal(schema.author.name, 'China Bikes');
    assert.equal(schema.author['@type'], 'Organization');
    assert.equal(schema.datePublished, post.datePublished);
    assert.ok(!('aggregateRating' in schema)); assert.ok(!('offers' in schema));
    assert.doesNotMatch(html, /<details\b/);
    for (const id of post.model_ids) assert.ok(html.includes(`${localePath(`/models/${id}/`, locale)}#source-records`));
  }
  const index = renderBlogIndex({ ...ctx, locale }, posts);
  for (const post of posts) assert.ok(index.includes(localePath(`/blog/${post.slug}/`, locale)));
});
test('gravel evidence table derives the exact recorded price and date, never today as a price date', () => {
  const post = posts.find((item) => item.slug === 'gravel-bikes-around-5000-yuan');
  const table = renderEvidenceTable(ctx, post);
  assert.ok(table.includes('¥4,951')); assert.ok(table.includes('2026-08-08'));
  assert.ok(table.includes('¥3,991')); assert.ok(table.includes('2026-08-05'));
  assert.ok(table.includes('¥4,999')); assert.ok(table.includes('2026-08-25'));
  assert.ok(!table.includes('2026-09-18'));
});

test('article comparisons use topic-specific facts and keep unknown drivetrain limits unknown', () => {
  const clearance = posts.find((post) => post.comparison.kind === 'clearance');
  const table = renderEvidenceTable(ctx, clearance);
  const rows = [...table.matchAll(/<tr>(.*?)<\/tr>/g)].map((match) => match[1]);
  const incolor = rows.find((row) => row.includes('/models/incolor-speedster-sr-frameset/'));
  const tavelo = rows.find((row) => row.includes('/models/tavelo-arden/'));
  const lightcarbon = rows.find((row) => row.includes('/models/lightcarbon-lcr018-d/'));
  assert.ok(incolor.includes('<td>38 mm</td><td>32 mm</td>'));
  assert.ok(tavelo.includes('<td>38 mm</td><td>34 mm</td>'));
  assert.ok(lightcarbon.includes('<td>—</td><td>—</td>'));
  assert.ok(lightcarbon.includes('<strong>38 mm</strong>'));
  assert.ok(!table.includes('Recorded price'));
  const gravel = renderEvidenceTable(ctx, posts.find((post) => post.comparison.kind === 'gravel'));
  assert.ok(gravel.includes('2×12') && gravel.includes('1×12'));
  assert.ok(gravel.includes('different measurement conditions'));
  assert.ok(!/remaining-build allowance|observed-search-card|public-market-observation/.test(gravel));
});

test('worked budget derives its subtotal and preserves missing costs instead of inventing a complete total', () => {
  const html = renderBuildExample(ctx);
  assert.ok(html.includes('¥11,950'));
  assert.ok(html.includes('¥1,850'));
  assert.ok(html.includes('Still to quote'));
  const changed = structuredClone(data);
  changed.buildParts.find((part) => part.id === 'shimano-105-r7170-large-package').price_observation.amount_cny = 5000;
  assert.ok(renderBuildExample({...ctx, data:changed}).includes('¥12,800'));
  delete changed.buildParts.find((part) => part.id === 'shimano-105-r7170-large-package').price_observation;
  const missing = renderBuildExample({...ctx, data:changed});
  assert.ok(missing.includes('no complete subtotal can be calculated'));
  assert.ok(!missing.includes('¥11,950'));
});

for (const locale of ['en', 'zh-Hans']) test(`article photos stay beside their assigned discussion and worksheets do not imply zero costs: ${locale}`, () => {
  for (const post of posts) {
    const html = renderPost({...ctx, locale}, post, posts);
    for (const placement of post.photo_sections) {
      const section = html.split(`<section id="${placement.section_id}">`)[1].split('</section>')[0];
      for (const id of placement.ids) assert.ok(section.includes(`data-blog-photo="${id}"`));
    }
    assert.ok(html.indexOf('class="page-lede"') < html.indexOf('article-cover'));
  }
  const importer = posts.find((post) => post.comparison.kind === 'price-basis');
  const html = renderPost({...ctx, locale}, importer, posts);
  const worksheet = html.split('class="article-table article-table-worksheet"')[1].split('</table>')[0];
  assert.ok(!/¥0|>0<|Total|总计/.test(worksheet));
});

test('mascot cutouts and illustrated headers have provenance and immutable optimized files', () => {
  assert.equal(editorialImages.length, 5);
  assert.equal(new Set(editorialImages.map((image) => image.id)).size, 5);
  for (const image of editorialImages) {
    assert.equal(image.source.kind, 'project-generated');
    assert.ok(image.alt.en && image.alt['zh-Hans'] && image.prompt);
    assert.deepEqual(image.files.map((file) => file.purpose), ['mascot']);
    assert.equal(image.header.source.kind, 'project-generated');
    assert.ok(image.header.prompt && image.header.alt.en && image.header.alt['zh-Hans']);
    assert.match(image.header.alt.en, /red panda/);
    assert.deepEqual(image.header.files.map((file) => file.purpose), ['card', 'hero', 'social']);
    for (const file of [...image.files, ...image.header.files]) {
      assert.match(file.path, /^\/assets\/blog\/[a-z0-9-]+\.(webp|jpg)$/);
      const bytes = fs.readFileSync(new URL('..' + file.path, import.meta.url));
      assert.equal(bytes.length, file.bytes);
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), file.sha256);
      assert.ok(file.bytes < (['mascot', 'card'].includes(file.purpose) ? 70000 : 300000));
      assert.equal(file.width, {mascot:480,card:640,hero:1600,social:1200}[file.purpose]);
      assert.ok(file.height > 0);
    }
  }
});
test('every referenced model has an attributable remote photo and shared trims are explicit', () => {
  for (const post of posts) {
    for (const photo of postPhotos(post)) {
      const resolved = resolveBlogPhoto(ctx, photo.id);
      assert.ok(photo.alt.en && photo.alt['zh-Hans'] && photo.note.en && photo.note['zh-Hans']);
      assert.equal(resolved.image.hosting.mode, 'remote');
      const targetIds = resolved.image.candidate_id ? [resolved.image.candidate_id]
        : data.variants.filter((variant) => variant.platform_id === resolved.image.platform_id).map((variant) => variant.id);
      for (const id of photo.model_ids) assert.ok(targetIds.includes(id), 'Photo must match the actual model platform');
    }
  }
  const gravel = posts.find((post) => post.slug === 'gravel-bikes-around-5000-yuan');
  assert.equal(postPhotos(gravel).length, 2, 'One platform photo can identify both Twitter builds');
  assert.match(blogPhotos.find((photo) => photo.id === 'twitter-gravel-v3').note.en, /pictured components differ/);
  assert.match(blogPhotos.find((photo) => photo.id === 'pardus-super-sport-gen2').note.en, /Shimano 105.*eGR/);
  assert.throws(() => postPhotos({model_ids:['unmapped-model']}));
  assert.throws(() => resolveBlogPhoto({...ctx,data:{...data,images:[]}}, blogPhotos[0].id));
});
for (const base of ['', '/china-bike-research']) for (const locale of ['en', 'zh-Hans']) test(`illustrated headers and real inline model photos stay distinct: ${base || '/'} ${locale}`, () => {
  const options = { ...ctx, base, locale };
  const index = renderBlogIndex(options, posts);
  assert.equal((index.match(/data-blog-header-image/g) || []).length, 5);
  assert.equal((index.match(/data-blog-bike-image/g) || []).length, 0);
  assert.equal((index.match(/data-blog-mascot/g) || []).length, 0);
  assert.ok(index.includes('class="editorial-figure illustrated-header blog-banner"'));
  assert.ok(!index.includes('/zh/assets/'));
  for (const post of posts) {
    const html = renderPost(options, post, posts);
    const image = editorialImages.find((item) => item.id === post.image_id);
    const hero = image.header.files.find((file) => file.purpose === 'hero');
    const social = image.header.files.find((file) => file.purpose === 'social');
    const expected = siteUrl + base + social.path;
    const schema = schemas(html).find((item) => item['@type'] === 'BlogPosting');
    assert.equal(schema.image, expected);
    assert.ok(html.includes(`property="og:image" content="${escapeAttr(expected)}"`));
    assert.ok(html.includes(`name="twitter:image" content="${escapeAttr(expected)}"`));
    assert.ok(html.includes(`src="${base}${image.files[0].path}"`));
    assert.ok(html.includes(`src="${base}${hero.path}"`));
    assert.ok(html.includes(`alt="${escapeAttr(image.header.alt[locale])}"`));
    assert.ok(html.includes('fetchpriority="high"'));
    assert.ok(!/AI-generated illustration|AI 生成插图/.test(html));
    assert.ok(!html.includes('/zh/assets/'));
    assert.ok(!html.includes('class="section-label"'));
    assert.equal((html.match(/data-blog-header-image/g) || []).length, 1);
    assert.equal((html.match(/data-blog-bike-image/g) || []).length, postPhotos(post).length);
    const cover = html.match(/<figure class="editorial-figure illustrated-header article-cover">([\s\S]*?)<\/figure>/)?.[1];
    assert.ok(cover && !/data-blog-bike-image|data-blog-mascot|figcaption/.test(cover));
    const body = html.slice(html.indexOf('class="blog-model-photos"'));
    for (const item of postPhotos(post)) {
      const resolved = resolveBlogPhoto(options, item.id);
      assert.ok(body.includes(`data-blog-photo="${item.id}"`));
      assert.ok(body.includes(escapeAttr(resolved.source.url)));
      assert.ok(body.includes(escapeHtml(item.note[locale])));
      for (const id of item.model_ids.filter((id) => post.model_ids.includes(id)))
        assert.ok(body.includes(base + localePath(`/models/${id}/`, locale)));
    }
  }
});
