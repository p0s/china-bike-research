import fs from 'node:fs';
import { escapeAttr, escapeHtml, url } from './html.mjs';

const manifest = JSON.parse(fs.readFileSync(new URL('../../content/blog-images.json', import.meta.url), 'utf8'));
export const editorialImages = manifest.images;
export const blogPhotos = manifest.model_photos;

export function editorialImage(id) {
  const image = editorialImages.find((item) => item.id === id);
  if (!image) throw new Error(`Unknown editorial image: ${id}`);
  return image;
}

export function resolveBlogPhoto(ctx, id) {
  const photo = blogPhotos.find((item) => item.id === id);
  const image = ctx.data.images.find((item) => item.id === photo?.image_id);
  const source = ctx.data.sources.find((item) => item.id === image?.source_id);
  if (!photo || image?.hosting.mode !== 'remote' || image.buyer_visibility === 'omit'
    || !['official-page-embed', 'retailer-page-embed'].includes(image.rights?.status)
    || !image.hosting.remote_url?.startsWith('https://') || !source?.url?.startsWith('https://')) {
    throw new Error(`Invalid remote blog photo: ${id}`);
  }
  return { ...photo, image, source };
}

export function postPhotos(post) {
  const selected = blogPhotos.filter((photo) => photo.model_ids.some((id) => post.model_ids.includes(id)));
  for (const id of post.model_ids) {
    if (!selected.some((photo) => photo.model_ids.includes(id))) throw new Error(`Missing blog photo for ${id}`);
  }
  return selected;
}

export function editorialImageMeta(ctx, id) {
  const header = editorialImage(id).header;
  const file = header.files.find((item) => item.purpose === 'social');
  return { image: url(ctx.base, file.path), imageAlt: header.alt[ctx.locale ?? 'en'], imageWidth: file.width, imageHeight: file.height, imageType: file.type };
}

function mascot(ctx, image) {
  const file = image.files.find((item) => item.purpose === 'mascot');
  return `<img class="blog-mascot" data-blog-mascot src="${url(ctx.base, file.path)}" width="${file.width}" height="${file.height}" alt="" aria-hidden="true" loading="lazy" decoding="async">`;
}

function renderPhoto(ctx, photo, image, modelIds) {
  const locale = ctx.locale ?? 'en';
  const zh = locale === 'zh-Hans';
  const links = modelIds.map((id) => `<a href="${url(ctx.base, `/models/${id}/`)}">${escapeHtml(id === 'twitter-v3-rs-sensah' ? 'RS / SENSAH' : id === 'twitter-v3-wheeltop-eds' ? 'WheelTop EDS' : zh ? '车型资料' : 'Model details')}</a>`).join(' · ');
  return `<figure class="editorial-figure blog-model-photo" data-blog-photo="${photo.id}"><div class="blog-photo-scene"><img class="blog-bike-photo" data-blog-bike-image src="${escapeAttr(photo.image.hosting.remote_url)}" alt="${escapeAttr(photo.alt[locale])}" referrerpolicy="no-referrer" loading="lazy" decoding="async">${mascot(ctx, image)}</div><figcaption><strong>${escapeHtml(photo.name)}</strong>${links ? ` · ${links}` : ''}<span class="blog-photo-note">${escapeHtml(photo.note[locale])}</span><a href="${escapeAttr(photo.source.url)}" rel="noreferrer">${escapeHtml(photo.image.credit)}</a><span class="blog-photo-status" data-blog-photo-status hidden>${zh ? '照片暂时无法加载，可打开来源查看。' : 'Photo unavailable; open the source to view it.'}</span></figcaption></figure>`;
}

export function renderEditorialImage(ctx, id, { card = false, banner = false, href = '' } = {}) {
  const header = editorialImage(id).header;
  const small = header.files.find((item) => item.purpose === 'card');
  const large = header.files.find((item) => item.purpose === 'hero');
  const sizes = card ? '(max-width: 760px) calc(100vw - 48px), 550px' : banner ? '(max-width: 1168px) calc(100vw - 48px), 1120px' : '(max-width: 1008px) calc(100vw - 48px), 960px';
  const img = `<img data-blog-header-image src="${url(ctx.base, card ? small.path : large.path)}" srcset="${url(ctx.base, small.path)} ${small.width}w, ${url(ctx.base, large.path)} ${large.width}w" sizes="${sizes}" width="${large.width}" height="${large.height}" alt="${escapeAttr(card ? '' : header.alt[ctx.locale ?? 'en'])}" loading="${card ? 'lazy' : 'eager'}" decoding="async"${card ? '' : ' fetchpriority="high"'}>`;
  return `<figure class="editorial-figure illustrated-header ${card ? 'article-card-image' : banner ? 'blog-banner' : 'article-cover'}">${href ? `<a href="${escapeAttr(href)}" tabindex="-1" aria-hidden="true">${img}</a>` : img}</figure>`;
}

export function renderPostPhotos(ctx, post, photoIds = postPhotos(post).map((photo) => photo.id)) {
  const image = editorialImage(post.image_id);
  const photos = postPhotos(post).filter((photo) => photoIds.includes(photo.id));
  return `<div class="blog-model-photos">${photos.map((photo) => renderPhoto(ctx, resolveBlogPhoto(ctx, photo.id), image, photo.model_ids.filter((id) => post.model_ids.includes(id)))).join('')}</div>`;
}

export function renderEditorialCredits(ctx) {
  const zh = ctx.locale === 'zh-Hans';
  return `<section id="editorial-illustrations"><h2>${zh ? '博客图片' : 'Blog imagery'}</h2><p>${zh ? '博客封面是小熊猫参与骑行、测量和装车的主题插画。文章内的车型照片来自下方所列厂家和零售商，以远程方式展示并保留原始来源链接。照片配置与文章对比车型不同时，图注会明确说明。小熊猫是 China Bikes 的插画吉祥物。' : 'The blog covers are themed illustrations featuring the red panda riding, measuring and building bikes. Inside each article, model photos come from the manufacturers and retailers listed below, with links to their original sources. Captions identify any differences between the pictured build and the article’s comparison. The red panda is the China Bikes illustrated mascot.'}</p><ul>${blogPhotos.map((item) => { const photo = resolveBlogPhoto(ctx, item.id); return `<li>${escapeHtml(photo.name)} — <a href="${escapeAttr(photo.source.url)}" rel="noreferrer">${escapeHtml(photo.image.credit)}</a></li>`; }).join('')}</ul></section>`;
}
