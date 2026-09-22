import test from 'node:test';
import assert from 'node:assert/strict';
import { translate, zh } from '../assets/i18n.js';
import { localePath, localizedHref, localizeHtml, localizeJson } from '../src/lib/i18n.mjs';
import { layout } from '../src/lib/html.mjs';
import { candidateIndexable } from '../src/lib/indexing.mjs';
import { loadDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { loadPosts, validatePostReferences, renderPost, renderBlogIndex, renderEvidenceTable } from '../src/lib/posts.mjs';
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
    assert.match(html, /data-original-language/);
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
