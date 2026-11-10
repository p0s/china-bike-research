import { translate } from '../../assets/i18n.js';
import fs from 'node:fs';
import { escapeAttr, escapeHtml, url } from './html.mjs';
import { localizedCredit } from './i18n.mjs';

const manifest = JSON.parse(fs.readFileSync(new URL('../../content/blog-images.json', import.meta.url), 'utf8'));
export const editorialImages = manifest.images;
export const blogPhotos = manifest.model_photos;

// The one remote guide photo admitted after review of its maker page, bytes, terms and privacy on 2026-11-08.
// Any other remote record, or any change to this one, fails until it is reviewed again.
const ADMITTED_REMOTE_PHOTOS = new Map([['elves-mori-aerox-official-embed', {
  model_ids: ['elves-mori-aerox-frameset'],
  platform_id: 'elves-mori-aerox',
  source_url: 'https://elvesbike.com/more.php?id=188&lm=47',
  remote_url: 'https://elvesbike.com/attach/202412/1734998874937741323.jpg',
  source_media_sha256: '31704d5aea66fdb28948466c656dcbda5b6f4ee550be19980d949fb552188ddf',
  source_media_bytes: 183148,
  width: 1300,
  height: 667,
  // Editor and document ids only, nothing personal; accepted for these exact bytes alone.
  embedded_metadata: 'reviewed-nonpersonal-editor-ids',
}]]);

function parseHttps(value, { query = false } = {}) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.href === value && !parsed.username && !parsed.password
      && !parsed.hash && (query || !parsed.search) ? parsed : null;
  } catch {
    return null;
  }
}

export function validateRemoteBlogPhoto(photo) {
  const admitted = ADMITTED_REMOTE_PHOTOS.get(photo.id);
  const { image, source } = photo.external ?? {};
  const remote = parseHttps(image?.hosting?.remote_url);
  const page = parseHttps(source?.url, { query: true });
  const { rights, privacy_review: review } = image ?? {};
  const sizes = [image?.width, image?.height, image?.source_media_bytes];
  const valid = admitted && remote && page && !photo.image_id
    && Object.keys(image.hosting).sort().join() === 'mode,remote_url' && !('srcset' in image) && !('variants' in image)
    && JSON.stringify(photo.model_ids) === JSON.stringify(admitted.model_ids) && image.platform_id === admitted.platform_id
    && remote.href === admitted.remote_url && page.href === admitted.source_url && remote.host === page.host
    && typeof source.source_id === 'string' && sizes.every((value) => Number.isSafeInteger(value) && value > 0)
    && /^[0-9a-f]{64}$/.test(image.source_media_sha256) && image.source_media_sha256 === admitted.source_media_sha256
    && image.source_media_bytes === admitted.source_media_bytes && image.width === admitted.width && image.height === admitted.height
    && rights?.status === 'official-page-embed' && rights.copyright_holder && rights.usage_note
    && parseHttps(rights.removal_route) && typeof rights.terms_source_id === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(review?.reviewed_at ?? '') && review.visual === 'no-faces-plates-accounts-locations'
    && [admitted.embedded_metadata, 'none-found'].includes(review.embedded_metadata)
    && ['en', 'zh-Hans', 'de'].every((locale) => photo.alt?.[locale] && photo.note?.[locale]);
  if (!valid) throw new Error(`Invalid remote blog photo: ${photo.id}`);
}

for (const photo of blogPhotos) {
  if (photo.external?.image?.hosting?.mode === 'remote') validateRemoteBlogPhoto(photo);
  else if (ADMITTED_REMOTE_PHOTOS.has(photo.id) || photo.external?.image?.hosting?.remote_url) throw new Error(`Invalid blog photo: ${photo.id}`);
}

// A remote photo's page and terms records must exist and live on the image's own host.
function remoteRecordsResolve(ctx, photo) {
  const { image, source } = photo.external;
  const host = new URL(image.hosting.remote_url).host;
  const page = ctx.data.sources.find((item) => item.id === source.source_id);
  const terms = ctx.data.sources.find((item) => item.id === image.rights.terms_source_id);
  return page?.url === source.url && Boolean(terms?.url) && parseHttps(terms.url, { query: true })?.host === host;
}

export function editorialImage(id) {
  const image = editorialImages.find((item) => item.id === id);
  if (!image) throw new Error(`Unknown editorial image: ${id}`);
  return image;
}

export function resolveBlogPhoto(ctx, id) {
  const photo = blogPhotos.find((item) => item.id === id);
  const image = photo?.external?.image ?? ctx.data.images.find((item) => item.id === photo?.image_id);
  const source = photo?.external?.source ?? ctx.data.sources.find((item) => item.id === image?.source_id);
  const local = image?.hosting.mode === 'local'
    && image.rights?.status === 'source-attributed-rehost'
    && image.hosting.local_path?.startsWith('/assets/images/sourced/');
  const remote = image?.hosting.mode === 'remote' && ADMITTED_REMOTE_PHOTOS.has(id) && remoteRecordsResolve(ctx, photo);
  if (!photo || !(local || remote) || image.buyer_visibility === 'omit'
    || !source?.url?.startsWith('https://')) {
    throw new Error(`Invalid blog photo: ${id}`);
  }
  return { ...photo, image, source };
}

export function postPhotos(post) {
  const selected = blogPhotos.filter((photo) => photo.model_ids.some((id) => post.model_ids.includes(id)) || post.photo_ids?.includes(photo.id));
  for (const id of post.photo_ids ?? []) if (!selected.some((photo) => photo.id === id)) throw new Error(`Unknown article photo: ${id}`);
  for (const id of post.model_ids) {
    if (!selected.some((photo) => photo.model_ids.includes(id))) throw new Error(`Missing blog photo for ${id}`);
  }
  return selected;
}

export function editorialImageMeta(ctx, id) {
  const header = editorialImage(id).header;
  const file = header.files.find((item) => item.purpose === 'social');
  return { image: url(ctx.base, file.path), imageAlt: header.alt[ctx.locale ?? 'en'] ?? translate(header.alt.en, ctx.locale), imageWidth: file.width, imageHeight: file.height, imageType: file.type };
}

function mascot(ctx, image) {
  const file = image.files.find((item) => item.purpose === 'mascot');
  return `<img class="blog-mascot" data-blog-mascot src="${url(ctx.base, file.path)}" width="${file.width}" height="${file.height}" alt="" aria-hidden="true" loading="lazy" decoding="async">`;
}

function renderPhoto(ctx, photo, image, modelIds) {
  const locale = ctx.locale ?? 'en';
  const zh = locale === 'zh-Hans';
  const links = modelIds.map((id) => `<a href="${url(ctx.base, `/models/${id}/`)}">${escapeHtml(id === 'twitter-v3-rs-sensah' ? 'RS / SENSAH' : id === 'twitter-v3-wheeltop-eds' ? 'WheelTop EDS' : zh ? '车型资料' : 'Model details')}</a>`).join(' · ');
  const hosting = photo.image.hosting;
  const remote = hosting.mode === 'remote';
  // A remote maker photo loads from the maker's site: no srcset, its reviewed size, and data-blog-remote so a
  // failed load removes the whole figure.
  const source = remote ? hosting.remote_url : url(ctx.base, hosting.local_path);
  const variants = remote ? [] : hosting.variants;
  const srcset = variants?.length
    ? ` srcset="${escapeAttr(variants.map((variant) => `${url(ctx.base, variant.url)} ${variant.width}w`).join(', '))}" sizes="(max-width: 760px) calc(100vw - 48px), 760px"`
    : '';
  const remoteAttributes = remote ? ` width="${photo.image.width}" height="${photo.image.height}" data-blog-remote` : '';
  return `<figure class="editorial-figure blog-model-photo" data-blog-photo="${photo.id}"><div class="blog-photo-scene"><img class="blog-bike-photo" data-blog-bike-image src="${escapeAttr(source)}"${srcset}${remoteAttributes} alt="${escapeAttr(photo.alt[locale] ?? translate(photo.alt.en, locale))}" referrerpolicy="no-referrer" loading="lazy" decoding="async">${mascot(ctx, image)}</div><figcaption><strong>${escapeHtml(photo.name)}</strong>${links ? ` · ${links}` : ''}<span class="blog-photo-note">${escapeHtml(photo.note[locale] ?? translate(photo.note.en, locale))}</span><a href="${escapeAttr(photo.source.url)}" rel="noreferrer">${escapeHtml(localizedCredit(photo.image.credit, locale))}</a><span class="blog-photo-status" data-blog-photo-status hidden>${zh ? '照片暂时无法加载，可打开来源查看。' : 'Photo unavailable; open the source to view it.'}</span></figcaption></figure>`;
}

export function renderEditorialImage(ctx, id, { card = false, banner = false, href = '' } = {}) {
  const header = editorialImage(id).header;
  const small = header.files.find((item) => item.purpose === 'card');
  const large = header.files.find((item) => item.purpose === 'hero');
  // Phone article cards show a 96 px thumbnail beside the title.
  const sizes = card ? '(max-width: 760px) 96px, 550px' : banner ? '(max-width: 1168px) calc(100vw - 48px), 1120px' : '(max-width: 1008px) calc(100vw - 48px), 960px';
  const img = `<img data-blog-header-image src="${url(ctx.base, card ? small.path : large.path)}" srcset="${url(ctx.base, small.path)} ${small.width}w, ${url(ctx.base, large.path)} ${large.width}w" sizes="${sizes}" width="${large.width}" height="${large.height}" alt="${escapeAttr(card ? '' : header.alt[ctx.locale ?? 'en'] ?? translate(header.alt.en, ctx.locale))}" loading="${card ? 'lazy' : 'eager'}" decoding="async"${card ? '' : ' fetchpriority="high"'}>`;
  return `<figure class="editorial-figure illustrated-header ${card ? 'article-card-image' : banner ? 'blog-banner' : 'article-cover'}">${href ? `<a href="${escapeAttr(href)}" tabindex="-1" aria-hidden="true">${img}</a>` : img}</figure>`;
}

export function renderPostPhotos(ctx, post, photoIds = postPhotos(post).map((photo) => photo.id)) {
  const image = editorialImage(post.image_id);
  const photos = postPhotos(post).filter((photo) => photoIds.includes(photo.id));
  return `<div class="blog-model-photos">${photos.map((photo) => renderPhoto(ctx, resolveBlogPhoto(ctx, photo.id), image, photo.model_ids.filter((id) => post.model_ids.includes(id)))).join('')}</div>`;
}

export function renderEditorialCredits(ctx) {
  const zh = ctx.locale === 'zh-Hans';
  const de = ctx.locale === 'de';
  const heading = zh ? '博客图片' : de ? 'Blog-Bilder' : 'Blog imagery';
  const text = zh ? '博客封面是小熊猫参与骑行、测量和装车的主题插画。文章内的车型照片来自下方所列厂家和零售商，并保留原始来源链接；大多数是本站提供的压缩展示图，图注注明直接从官网加载的照片则从制造商网站加载，详见隐私页。照片配置与文章对比车型不同时，图注会明确说明。小熊猫是 Chinese Bikes 的插画吉祥物。'
    : de ? 'Die Blog-Titelbilder sind thematische Illustrationen, in denen der Rote Panda Räder fährt, vermisst und aufbaut. In den Artikeln verlinken Modellfotos auf ihre Hersteller- oder Händlerquellen. Die meisten sind hier ausgelieferte optimierte Kopien; ein Foto, dessen Bildunterschrift sagt, dass es direkt von der Website des Herstellers geladen wird, lädt von dieser Website, wie die Datenschutzseite erklärt. Bildunterschriften nennen Unterschiede zwischen dem abgebildeten Aufbau und dem Vergleich im Artikel. Der Rote Panda ist das illustrierte Maskottchen von Chinese Bikes.'
    : 'The blog covers are themed illustrations featuring the red panda riding, measuring and building bikes. Inside each article, model photos link to their manufacturer or retailer sources. Most are optimized copies served here; a photo whose caption says it is shown from the maker’s website loads directly from that site, as the privacy page explains. Captions identify any differences between the pictured build and the article’s comparison. The red panda is the Chinese Bikes illustrated mascot.';
  const remoteNote = zh ? '直接从官网加载' : de ? 'direkt von der Herstellerwebsite geladen' : 'shown from the maker’s website';
  return `<section id="editorial-illustrations"><h2>${heading}</h2><p>${text}</p><ul>${blogPhotos.map((item) => { const photo = resolveBlogPhoto(ctx, item.id); return `<li>${escapeHtml(photo.name)} — <a href="${escapeAttr(photo.source.url)}" rel="noreferrer">${escapeHtml(localizedCredit(photo.image.credit, ctx.locale))}</a>${photo.image.hosting.mode === 'remote' ? ` (${remoteNote})` : ''}</li>`; }).join('')}</ul></section>`;
}
