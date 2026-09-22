import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml, escapeAttr, url, layout } from './html.mjs';
import { renderEvidenceTable, renderBuildExample } from './post-comparisons.mjs';
import { collectionStructuredData, latestDate } from './seo.mjs';
import { editorialImage, editorialImageMeta, renderEditorialImage, renderPostPhotos, postPhotos } from './editorial-images.mjs';
export { renderEvidenceTable } from './post-comparisons.mjs';

export function loadPosts(root = fileURLToPath(new URL('../..', import.meta.url))) {
  const directory = path.join(root, 'content/posts');
  const posts = fs.readdirSync(directory).filter((name) => name.endsWith('.json')).sort().map((name) => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8')));
  const slugs = new Set();
  for (const post of posts) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) || slugs.has(post.slug)) throw new Error(`Invalid or duplicate article slug: ${post.slug}`);
    slugs.add(post.slug);
    editorialImage(post.image_id);
    postPhotos(post);
    for (const key of ['datePublished', 'dateModified']) if (!/^\d{4}-\d{2}-\d{2}$/.test(post[key])) throw new Error(`Invalid ${key}: ${post.slug}`);
    if (post.dateModified < post.datePublished) throw new Error(`Article modification precedes publication: ${post.slug}`);
    for (const locale of ['en', 'zh-Hans']) {
      const copy = post.translations[locale];
      if (!copy?.title || !copy.description || !copy.intro || copy.sections?.length < 3) throw new Error(`Incomplete ${locale} article: ${post.slug}`);
      if (new Set(copy.sections.map((section) => section.id)).size !== copy.sections.length) throw new Error(`Duplicate section ID: ${post.slug}`);
      if (!copy.sections.every((section) => /^[a-z0-9-]+$/.test(section.id) && section.heading && section.paragraphs?.length)) throw new Error(`Invalid section: ${post.slug}`);
      if (!post.model_ids.every((id) => typeof copy.table_notes?.[id] === 'string' && copy.table_notes[id])) throw new Error(`Missing comparison context: ${post.slug}`);
      for (const section of copy.sections) {
        if (section.bullets && (!Array.isArray(section.bullets) || !section.bullets.every((item) => typeof item === 'string' && item))) throw new Error(`Invalid article list: ${post.slug}`);
        if (section.worksheet && (!section.worksheet.caption || !Array.isArray(section.worksheet.columns) || !section.worksheet.columns.every((cell) => typeof cell === 'string' && cell) || !section.worksheet.rows?.length || !section.worksheet.rows.every((row) => row.length === section.worksheet.columns.length && row.every((cell) => typeof cell === 'string')))) throw new Error(`Invalid worksheet: ${post.slug}`);
      }
    }
    if (post.translations.en.sections.map((s) => s.id).join() !== post.translations['zh-Hans'].sections.map((s) => s.id).join()) throw new Error(`Unpaired sections: ${post.slug}`);
    const sections = new Set(post.translations.en.sections.map((section) => section.id));
    if (!['gravel', 'clearance', 'build', 'price-basis'].includes(post.comparison?.kind) || !sections.has(post.comparison.section_id)) throw new Error(`Invalid comparison placement: ${post.slug}`);
    const placements = post.photo_sections ?? [];
    const placed = placements.flatMap((placement) => placement.ids);
    const expected = postPhotos(post).map((photo) => photo.id);
    if (placements.some((placement) => !sections.has(placement.section_id)) || new Set(placed).size !== placed.length || placed.length !== expected.length || placed.some((id) => !expected.includes(id))) throw new Error(`Invalid photo placement: ${post.slug}`);
    if (post.example && (post.example.kind !== 'build-budget' || !sections.has(post.example.section_id) || !post.model_ids.includes('incolor-voyager-frameset'))) throw new Error(`Invalid worked example: ${post.slug}`);
  }
  return posts;
}
export function validatePostReferences(posts, data, products) {
  const modelIds = new Set([...products.map((p) => p.variant.id), ...data.candidates.map((c) => c.id)]);
  const sourceIds = new Set(data.sources.map((s) => s.id));
  for (const post of posts) {
    for (const id of post.model_ids) if (!modelIds.has(id)) throw new Error(`Article ${post.slug} references unknown model ${id}`);
    for (const id of post.source_ids) if (!sourceIds.has(id)) throw new Error(`Article ${post.slug} references unknown source ${id}`);
  }
}
export function postLastmod(ctx, post) {
  return latestDate([post.dateModified, ...post.model_ids.map((id) => ctx.productEvidenceDates?.get(id) ?? ctx.candidateEvidenceDates?.get(id))], post.dateModified);
}
function inline(value, ctx) {
  // Intentionally tiny, escaped inline syntax. No raw HTML, remote embeds or scripts.
  return value.split(/(\[[^\]]+\]\([^)]+\))/g).map((part) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!match) return escapeHtml(part);
    const [, label, target] = match;
    if (!(target.startsWith('/') && !target.startsWith('//')) && !target.startsWith('https://')) throw new Error(`Unsafe article link: ${target}`);
    return `<a href="${escapeAttr(target.startsWith('/') ? url(ctx.base, target) : target)}">${escapeHtml(label)}</a>`;
  }).join('');
}
function copyFor(post, ctx) { return post.translations[ctx.locale ?? 'en']; }
function bilingual(ctx, en, zh) { return ctx.locale === 'zh-Hans' ? zh : en; }
function sourceList(ctx, post) {
  const t = (en, zh) => bilingual(ctx, en, zh);
  return `<section class="article-sources" id="article-sources"><h2>${t('Sources and method', '来源与方法')}</h2><p>${t('China Bikes compiled this guide from linked model records and sources, with AI-assisted editing and translation. It is desk research, not a hands-on test. Prices and specifications retain their own evidence dates; this edit did not recheck stock or checkout prices.', 'China Bikes 根据车型记录与来源整理本文，并使用 AI 辅助编辑和翻译。这是资料研究，不是实物测试。价格和规格保留各自的证据日期，本次编辑未重新核实库存或结算价。')} <a href="${url(ctx.base, '/methodology/')}">${t('Research methodology', '研究方法')}</a>.</p></section>`;
}
function renderSection(ctx, post, section) {
  const worksheet = section.worksheet;
  const photos = post.photo_sections.filter((placement) => placement.section_id === section.id).flatMap((placement) => placement.ids);
  return `<section id="${section.id}"><h2>${escapeHtml(section.heading)}</h2>${section.paragraphs.map((paragraph) => `<p>${inline(paragraph, ctx)}</p>`).join('')}${section.bullets?.length ? `<ul class="article-checklist">${section.bullets.map((item) => `<li>${inline(item, ctx)}</li>`).join('')}</ul>` : ''}${post.comparison.section_id === section.id ? renderEvidenceTable(ctx, post) : ''}${post.example?.section_id === section.id ? renderBuildExample(ctx) : ''}${worksheet ? `<div class="article-table-wrap" role="region" tabindex="0" aria-label="${escapeAttr(worksheet.caption)}"><table class="article-table article-table-worksheet"><caption>${escapeHtml(worksheet.caption)}</caption><thead><tr>${worksheet.columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${worksheet.rows.map((row) => `<tr><th scope="row">${escapeHtml(row[0])}</th>${row.slice(1).map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}${photos.length ? renderPostPhotos(ctx, post, photos) : ''}</section>`;
}
function articleCard(ctx, post) {
  const copy = copyFor(post, ctx);
  return `<article class="article-card">${renderEditorialImage(ctx, post.image_id, { card: true, href: url(ctx.base, `/blog/${post.slug}/`) })}<h2><a href="${url(ctx.base, `/blog/${post.slug}/`)}">${escapeHtml(copy.title)}</a></h2><p>${escapeHtml(copy.description)}</p><time datetime="${post.dateModified}">${post.dateModified}</time></article>`;
}
function postLayout(ctx, options) {
  return layout({ base: ctx.base, siteUrl: ctx.siteUrl, repositoryUrl: ctx.repositoryUrl, locale: ctx.locale ?? 'en', googleSiteVerification: ctx.googleSiteVerification, current: 'blog', datasetUpdated: ctx.siteLastmod, catalogReviewed: ctx.data.meta.snapshot_date, ...options });
}
export function renderBlogIndex(ctx, posts) {
  const title = bilingual(ctx, 'Buying guides for bikes in China', '中国市场自行车购车指南');
  const description = bilingual(ctx, 'Practical, source-linked articles on Chinese bikes, exact builds, tire clearance and real purchase costs.', '围绕具体车型、轮胎空间和真实购车成本的实用文章，链接原始证据。');
  return postLayout(ctx, { title, description, path: '/blog/', ...editorialImageMeta(ctx, 'cycling-guides-banner'), structuredData: collectionStructuredData({ siteUrl: ctx.siteUrl, base: ctx.base, path: '/blog/', name: title, description, items: posts.map((p) => ({ name: copyFor(p, ctx).title, path: `/blog/${p.slug}/` })) }), body: `<section class="simple-page"><div class="page article-index"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${url(ctx.base, '/')}">Home</a></nav><h1>${title}</h1><p class="page-lede">${description}</p>${renderEditorialImage(ctx, 'cycling-guides-banner', { banner: true })}<div class="article-grid">${posts.map((post) => articleCard(ctx, post)).join('')}</div></div></section>` });
}
export function renderPost(ctx, post, allPosts) {
  const copy = copyFor(post, ctx);
  const route = `/blog/${post.slug}/`;
  const absolute = `${ctx.siteUrl}${url(ctx.base, route)}`;
  const modified = postLastmod(ctx, post);
  const schema = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', '@id': `${absolute}#article`, url: absolute,
    mainEntityOfPage: { '@type': 'WebPage', '@id': absolute }, headline: copy.title, description: copy.description,
    inLanguage: ctx.locale ?? 'en', datePublished: post.datePublished, dateModified: modified,
    author: { '@type': 'Organization', name: 'China Bikes', url: `${ctx.siteUrl}${url(ctx.base, '/methodology/')}` },
    publisher: { '@type': 'Organization', name: 'China Bikes', url: `${ctx.siteUrl}${url(ctx.base, '/')}` },
    isAccessibleForFree: true,
    image: `${ctx.siteUrl}${editorialImageMeta(ctx, post.image_id).image}`,
    citation: post.model_ids.map((id) => `${ctx.siteUrl}${url(ctx.base, `/models/${id}/`)}#source-records`)
  };
  const breadcrumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'China Bikes', item: `${ctx.siteUrl}${url(ctx.base, '/')}` },
    { '@type': 'ListItem', position: 2, name: bilingual(ctx, 'Buying guides', '购车指南'), item: `${ctx.siteUrl}${url(ctx.base, '/blog/')}` },
    { '@type': 'ListItem', position: 3, name: copy.title, item: absolute }
  ] };
  const body = `<section class="simple-page"><article class="page prose buyer-article"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${url(ctx.base, '/')}">Home</a><span aria-hidden="true"> / </span><a href="${url(ctx.base, '/blog/')}">Buying guides</a></nav><header><h1>${escapeHtml(copy.title)}</h1><p class="page-lede">${escapeHtml(copy.intro)}</p><p class="article-byline">Written by <a href="${url(ctx.base, '/methodology/')}">China Bikes</a> · ${bilingual(ctx, 'Editorial date', '文章日期')} <time datetime="${post.datePublished}">${post.datePublished}</time>${modified !== post.datePublished ? ` · ${bilingual(ctx, 'Updated', '更新')} <time datetime="${modified}">${modified}</time>` : ''}</p></header>${renderEditorialImage(ctx, post.image_id)}<nav class="article-toc" aria-label="On this page"><strong>On this page</strong><ol>${copy.sections.map((s) => `<li><a href="#${s.id}">${escapeHtml(s.heading)}</a></li>`).join('')}</ol></nav>${copy.sections.map((section) => renderSection(ctx, post, section)).join('')}${sourceList(ctx, post)}<section class="related-articles"><h2>Related reading</h2><ul>${allPosts.filter((p) => p.slug !== post.slug).map((p) => `<li><a href="${url(ctx.base, `/blog/${p.slug}/`)}">${escapeHtml(copyFor(p, ctx).title)}</a></li>`).join('')}</ul></section></article></section>`;
  return postLayout(ctx, { title: copy.title, description: copy.description, path: route, ...editorialImageMeta(ctx, post.image_id), ogType: 'article', structuredData: [schema, breadcrumbs], body });
}
export function relatedArticleLinks(ctx, id) {
  const posts = (ctx.posts ?? []).filter((post) => post.model_ids.includes(id));
  if (!posts.length) return '';
  return `<aside class="model-related-reading"><h2>Related reading</h2><ul>${posts.map((post) => `<li><a href="${url(ctx.base, `/blog/${post.slug}/`)}">${escapeHtml(copyFor(post, ctx).title)}</a></li>`).join('')}</ul></aside>`;
}
