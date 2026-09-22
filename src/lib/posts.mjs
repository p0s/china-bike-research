import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml, escapeAttr, url, layout } from './html.mjs';
import { formatPrice, formatAllInPrice, clearanceLongLabel, joinCatalogCandidates } from './data.mjs';
import { translate } from '../../assets/i18n.js';
import { collectionStructuredData, latestDate } from './seo.mjs';

export function loadPosts(root = fileURLToPath(new URL('../..', import.meta.url))) {
  const directory = path.join(root, 'content/posts');
  const posts = fs.readdirSync(directory).filter((name) => name.endsWith('.json')).sort().map((name) => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8')));
  const slugs = new Set();
  for (const post of posts) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) || slugs.has(post.slug)) throw new Error(`Invalid or duplicate article slug: ${post.slug}`);
    slugs.add(post.slug);
    for (const key of ['datePublished', 'dateModified']) if (!/^\d{4}-\d{2}-\d{2}$/.test(post[key])) throw new Error(`Invalid ${key}: ${post.slug}`);
    if (post.dateModified < post.datePublished) throw new Error(`Article modification precedes publication: ${post.slug}`);
    for (const locale of ['en', 'zh-Hans']) {
      const copy = post.translations[locale];
      if (!copy?.title || !copy.description || !copy.intro || copy.sections?.length < 3) throw new Error(`Incomplete ${locale} article: ${post.slug}`);
      if (new Set(copy.sections.map((section) => section.id)).size !== copy.sections.length) throw new Error(`Duplicate section ID: ${post.slug}`);
      if (!copy.sections.every((section) => /^[a-z0-9-]+$/.test(section.id) && section.heading && section.paragraphs?.length)) throw new Error(`Invalid section: ${post.slug}`);
    }
    if (post.translations.en.sections.map((s) => s.id).join() !== post.translations['zh-Hans'].sections.map((s) => s.id).join()) throw new Error(`Unpaired sections: ${post.slug}`);
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
function getModel(ctx, id) {
  const product = ctx.products.find((p) => p.variant.id === id);
  if (product) return { product, name: `${product.brand.name} ${product.variant.name}`, kind: product.variant.kind, price: product.latestPrice, clearance: clearanceLongLabel(product.platform), sources: product.sources };
  const candidate = (ctx.catalogCandidates ?? joinCatalogCandidates(ctx.data)).find((c) => c.candidate.id === id);
  if (!candidate) throw new Error(`Unresolved article model ${id}`);
  const facts = candidate.candidate.facts ?? {};
  const limits = facts.tire_clearance_drivetrain_limits_mm;
  const clearance = limits ? `${limits.single ?? '—'}/${limits.double ?? '—'} mm (1×/2×)` : facts.tire_clearance_mm ? `${facts.tire_clearance_mm} mm` : '—';
  return { candidate, name: candidate.candidate.name, kind: candidate.kind, price: candidate.price, clearance, sources: candidate.sources };
}
export function renderEvidenceTable(ctx, post) {
  const t = (en, zh) => bilingual(ctx, en, zh);
  const rows = post.model_ids.map((id) => {
    const model = getModel(ctx, id);
    const price = model.price;
    const basis = price?.price_type ?? price?.price_basis ?? 'Not recorded';
    const frameEstimate = model.kind === 'frameset' && model.product ? formatAllInPrice(model.product) : '';
    const condition = price?.conditions || price?.price_basis || '';
    return `<tr><th scope="row"><a href="${url(ctx.base, `/models/${id}/`)}">${escapeHtml(model.name)}</a>${model.candidate ? `<small>${t('Research-stage profile', '研究阶段资料')}</small>` : ''}</th><td>${model.kind === 'frameset' ? t('Frame package', '车架套餐') : t('Complete bike', '整车')}</td><td>${escapeHtml(formatPrice(price))}${frameEstimate ? `<small>${t('Build estimate:', '装车估算：')} ${escapeHtml(frameEstimate)}</small>` : ''}</td><td>${price?.observed_at ? `<time datetime="${escapeAttr(price.observed_at)}">${escapeHtml(price.observed_at)}</time>` : t('Not recorded', '暂无记录')}</td><td>${escapeHtml(translate(basis, ctx.locale))}${condition ? `<details class="price-conditions"><summary>${t('Original price conditions', '原始价格条件')}</summary><p lang="en" data-original-language>${escapeHtml(condition)}</p></details>` : ''}</td><td>${escapeHtml(model.clearance)}</td><td><a href="${url(ctx.base, `/models/${id}/`)}#source-records">${t('Evidence', '证据')}</a></td></tr>`;
  }).join('');
  return `<div class="article-table-wrap" role="region" tabindex="0" aria-label="${t('Dated model comparison', '有日期的车型对比')}"><table class="article-table"><caption>${t('Catalog evidence; prices are not live offers', '目录证据；价格不是实时报价')}</caption><thead><tr>${[t('Exact model', '具体车型'), t('Package', '价格对象'), t('Recorded CNY price', '人民币价格记录'), t('Observed', '观察日期'), t('Basis / conditions', '依据／条件'), t('Recorded clearance', '轮胎空间记录'), t('Sources', '来源')].map((label) => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div><p class="article-note">${t(`Frame-build estimates use the catalog’s reviewed ¥${ctx.data.meta.frameset_build_assumption.amount_cny.toLocaleString('en-US')} remaining-build allowance. A frame price is not a complete-bike price.`, `车架装车估算使用目录已复核的 ${ctx.data.meta.frameset_build_assumption.amount_cny.toLocaleString('en-US')} 元剩余装车预算。车架价不是整车价。`)}</p>`;
}
function sourceList(ctx, post) {
  const t = (en, zh) => bilingual(ctx, en, zh);
  const sources = post.source_ids.map((id) => ctx.data.sources.find((s) => s.id === id));
  return `<section class="article-sources" id="article-sources"><h2>${t('Sources and research limits', '来源与研究边界')}</h2><p>${t('The linked model records are the evidence trail for the comparison table. Original sources below retain their recorded access dates; they were not all revisited for this article. Archived observations without public URLs are identified rather than replaced with invented links.', '表格中的车型记录构成证据链。下方原始来源保留记录中的访问日期；撰写本文时并未全部重新访问。没有公开网址的归档观察会明确说明，不虚构链接。')}</p>${sources.length ? `<ul>${sources.map((source) => `<li>${source.url ? `<a href="${escapeAttr(source.url)}" rel="noreferrer">${escapeHtml(source.title)}</a>` : `<span>${escapeHtml(source.title)} (${t('archived observation; no public URL', '归档观察；无公开网址')})</span>`} · <time datetime="${escapeAttr(source.accessed_at)}">${escapeHtml(source.accessed_at)}</time></li>`).join('')}</ul>` : ''}<p>${t('Source-led desk research and AI-assisted synthesis/translation by China Bikes; not a hands-on product review. No new manufacturer testing, stock check or checkout verification is claimed. Corrections should identify the exact model and a source.', 'China Bikes 基于已有证据整理资料，并使用 AI 辅助归纳与翻译；这不是实物测评，也没有声称新做了厂家测试、库存检查或结算核实。纠错请注明具体车型及来源。')} <a href="${url(ctx.base, '/methodology/')}">${t('Research methodology', '研究方法')}</a>.</p></section>`;
}
function articleCard(ctx, post) {
  const copy = copyFor(post, ctx);
  return `<article class="article-card"><p class="section-label">${escapeHtml(translate(copy.audience, ctx.locale))}</p><h2><a href="${url(ctx.base, `/blog/${post.slug}/`)}">${escapeHtml(copy.title)}</a></h2><p>${escapeHtml(copy.description)}</p><time datetime="${post.dateModified}">${post.dateModified}</time></article>`;
}
function postLayout(ctx, options) {
  return layout({ base: ctx.base, siteUrl: ctx.siteUrl, repositoryUrl: ctx.repositoryUrl, locale: ctx.locale ?? 'en', googleSiteVerification: ctx.googleSiteVerification, current: 'blog', datasetUpdated: ctx.siteLastmod, catalogReviewed: ctx.data.meta.snapshot_date, ...options });
}
export function renderBlogIndex(ctx, posts) {
  const title = bilingual(ctx, 'Buying guides for bikes in China', '中国市场自行车购车指南');
  const description = bilingual(ctx, 'Practical, source-linked articles on Chinese bikes, exact builds, tire clearance and real purchase costs. Domestic buying first, international caveats included.', '围绕具体车型、轮胎空间和真实购车成本的实用文章，链接原始证据；优先服务国内购车，也说明海外购买的限制。');
  return postLayout(ctx, { title, description, path: '/blog/', structuredData: collectionStructuredData({ siteUrl: ctx.siteUrl, base: ctx.base, path: '/blog/', name: title, description, items: posts.map((p) => ({ name: copyFor(p, ctx).title, path: `/blog/${p.slug}/` })) }), body: `<section class="simple-page"><div class="page article-index"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${url(ctx.base, '/')}">Home</a></nav><h1>${title}</h1><p class="page-lede">${description}</p><p>${bilingual(ctx, 'These articles explain how to use the evidence—not which bike wins for everyone. Prices keep their own dates, and missing specifications remain unknown.', '这些文章解释如何使用证据，不宣称某辆车适合所有人。价格保留各自的日期，缺失规格继续标为未知。')}</p><div class="article-grid">${posts.map((post) => articleCard(ctx, post)).join('')}</div></div></section>` });
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
    citation: post.model_ids.map((id) => `${ctx.siteUrl}${url(ctx.base, `/models/${id}/`)}#source-records`)
  };
  const breadcrumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'China Bikes', item: `${ctx.siteUrl}${url(ctx.base, '/')}` },
    { '@type': 'ListItem', position: 2, name: bilingual(ctx, 'Buying guides', '购车指南'), item: `${ctx.siteUrl}${url(ctx.base, '/blog/')}` },
    { '@type': 'ListItem', position: 3, name: copy.title, item: absolute }
  ] };
  const body = `<section class="simple-page"><article class="page prose buyer-article"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${url(ctx.base, '/')}">Home</a><span aria-hidden="true"> / </span><a href="${url(ctx.base, '/blog/')}">Buying guides</a></nav><header><p class="section-label">${escapeHtml(translate(copy.audience, ctx.locale))}</p><h1>${escapeHtml(copy.title)}</h1><p class="page-lede">${escapeHtml(copy.intro)}</p><p class="article-byline">Written by <a href="${url(ctx.base, '/methodology/')}">China Bikes</a> · ${bilingual(ctx, 'Editorial date', '文章日期')} <time datetime="${post.datePublished}">${post.datePublished}</time>${modified !== post.datePublished ? ` · ${bilingual(ctx, 'Updated', '更新')} <time datetime="${modified}">${modified}</time>` : ''}</p></header><nav class="article-toc" aria-label="On this page"><strong>On this page</strong><ol>${copy.sections.map((s) => `<li><a href="#${s.id}">${escapeHtml(s.heading)}</a></li>`).join('')}</ol></nav>${copy.sections.map((s, index) => `<section id="${s.id}"><h2>${escapeHtml(s.heading)}</h2>${s.paragraphs.map((p) => `<p>${inline(p, ctx)}</p>`).join('')}${index === 0 ? renderEvidenceTable(ctx, post) : ''}</section>`).join('')}${sourceList(ctx, post)}<section class="related-articles"><h2>Related reading</h2><ul>${allPosts.filter((p) => p.slug !== post.slug).map((p) => `<li><a href="${url(ctx.base, `/blog/${p.slug}/`)}">${escapeHtml(copyFor(p, ctx).title)}</a></li>`).join('')}</ul></section></article></section>`;
  return postLayout(ctx, { title: copy.title, description: copy.description, path: route, ogType: 'article', structuredData: [schema, breadcrumbs], body });
}
export function relatedArticleLinks(ctx, id) {
  const posts = (ctx.posts ?? []).filter((post) => post.model_ids.includes(id));
  if (!posts.length) return '';
  return `<aside class="model-related-reading"><h2>Related reading</h2><ul>${posts.map((post) => `<li><a href="${url(ctx.base, `/blog/${post.slug}/`)}">${escapeHtml(copyFor(post, ctx).title)}</a></li>`).join('')}</ul></aside>`;
}
