import fs from 'node:fs';
import { escapeAttr, escapeHtml, url } from './html.mjs';

export const editorialImages = JSON.parse(fs.readFileSync(new URL('../../content/blog-images.json', import.meta.url), 'utf8')).images;

export function editorialImage(id) {
  const image = editorialImages.find((item) => item.id === id);
  if (!image) throw new Error(`Unknown editorial image: ${id}`);
  return image;
}

export function editorialImageMeta(ctx, id) {
  const image = editorialImage(id);
  const file = image.files.find((item) => item.purpose === 'social');
  return { image: url(ctx.base, file.path), imageAlt: image.alt[ctx.locale ?? 'en'], imageWidth: file.width, imageHeight: file.height, imageType: file.type };
}

export function renderEditorialImage(ctx, id, { card = false, banner = false } = {}) {
  const image = editorialImage(id);
  const small = image.files.find((item) => item.purpose === 'card');
  const large = image.files.find((item) => item.purpose === 'hero');
  const alt = image.alt[ctx.locale ?? 'en'];
  const credit = ctx.locale === 'zh-Hans' ? 'China Bikes · AI 生成插图' : 'China Bikes · AI-generated illustration';
  const sizes = card ? '(max-width: 760px) calc(100vw - 48px), 520px' : banner ? '(max-width: 1168px) calc(100vw - 48px), 1120px' : '(max-width: 1008px) calc(100vw - 48px), 960px';
  const img = `<img data-editorial-image src="${url(ctx.base, card ? small.path : large.path)}" srcset="${url(ctx.base, small.path)} ${small.width}w, ${url(ctx.base, large.path)} ${large.width}w" sizes="${sizes}" width="${large.width}" height="${large.height}" alt="${escapeAttr(card ? '' : alt)}" loading="${card ? 'lazy' : 'eager'}" decoding="async"${card ? '' : ' fetchpriority="high"'}>`;
  if (card) return `<span class="article-card-image">${img}</span>`;
  return `<figure class="editorial-figure${banner ? ' blog-banner' : ' article-cover'}">${img}<figcaption><a href="${url(ctx.base, '/image-sources/#editorial-illustrations')}">${escapeHtml(credit)}</a></figcaption></figure>`;
}

export function renderEditorialCredits(ctx) {
  const zh = ctx.locale === 'zh-Hans';
  return `<section id="editorial-illustrations"><h2>${zh ? '文章插图' : 'Editorial illustrations'}</h2><p>${zh ? '博客横幅和文章封面由 China Bikes 使用 AI 生成，属于主题插图，不代表文中具体车型，也不作为规格证据。' : 'Blog banners and covers were created by China Bikes using AI. They illustrate each topic and do not depict the exact models discussed or serve as specification evidence.'}</p><ul>${editorialImages.map((image) => `<li><a href="${url(ctx.base, image.files.find((file) => file.purpose === 'hero').path)}">${escapeHtml(image.alt[ctx.locale ?? 'en'])}</a></li>`).join('')}</ul></section>`;
}
