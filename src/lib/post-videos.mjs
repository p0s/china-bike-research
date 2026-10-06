import fs from 'node:fs';
import { LOCALES } from './i18n.mjs';
import { escapeAttr, escapeHtml } from './html.mjs';
import { renderVideoEntries, validateYouTubeEmbed } from './videos.mjs';

export const postVideos = JSON.parse(fs.readFileSync(new URL('../../content/blog-videos.json', import.meta.url), 'utf8'));

export function validatePostVideoReferences(posts, catalogVideos, registry = postVideos) {
  if (registry.schema_version !== 1 || !Array.isArray(registry.article_only_videos) || !registry.articles || typeof registry.articles !== 'object') throw new Error('Invalid article video registry');
  const videos = new Map((catalogVideos ?? []).map((video) => [video.id, video]));
  for (const video of registry.article_only_videos) {
    validateYouTubeEmbed(video);
    if (videos.has(video.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(video.id)) throw new Error(`Duplicate or invalid article video: ${video.id}`);
    for (const field of ['title', 'channel_name', 'language', 'summary', 'disclosure']) if (typeof video[field] !== 'string' || !video[field].trim()) throw new Error(`Missing article video ${field}: ${video.id}`);
    for (const field of ['published_at', 'accessed_at']) if (!/^\d{4}-\d{2}-\d{2}$/.test(video[field]) || !Number.isFinite(Date.parse(video[field]))) throw new Error(`Invalid article video ${field}: ${video.id}`);
    const channel = new URL(video.channel_url);
    if (channel.protocol !== 'https:' || channel.hostname !== 'www.youtube.com' || !/^\/(?:channel\/UC[A-Za-z0-9_-]+|@[A-Za-z0-9_.-]+)$/.test(channel.pathname) || channel.search || channel.hash || channel.username || channel.password) throw new Error(`Invalid article video channel: ${video.id}`);
    if (video.disclosure_url !== video.url || video.format !== 'model-overview' || video.relationship !== 'retailer-linked' || video.target || video.match) throw new Error(`Invalid article-only video context: ${video.id}`);
    if ([...videos.values()].some((known) => known.youtube_video_id === video.youtube_video_id)) throw new Error(`Duplicate article YouTube video: ${video.id}`);
    videos.set(video.id, video);
  }
  for (const [slug, placements] of Object.entries(registry.articles)) {
    const post = posts.find((post) => post.slug === slug);
    if (!post || !Array.isArray(placements) || !placements.length) throw new Error(`Unknown article or empty video placement: ${slug}`);
    const seen = new Set();
    for (const placement of placements) {
      const video = videos.get(placement.video_id);
      if (!video || video.provider !== 'youtube') throw new Error(`Unknown YouTube article video: ${slug} / ${placement.video_id}`);
      validateYouTubeEmbed(video);
      if (seen.has(video.id) || !LOCALES.every((locale) => post.translations[locale].sections.some((section) => section.id === placement.section_id))) throw new Error(`Duplicate video or unknown article section: ${slug}`);
      if (!LOCALES.every((locale) => typeof placement.context?.[locale] === 'string' && placement.context[locale].trim().length >= 30)) throw new Error(`Missing localized video context: ${slug}`);
      seen.add(video.id);
    }
  }
  const used = new Set(Object.values(registry.articles).flat().map((placement) => placement.video_id));
  if (registry.article_only_videos.some((video) => !used.has(video.id))) throw new Error('Unplaced article-only video');
}

export function renderPostVideos(ctx, post, sectionId) {
  const placements = (postVideos.articles[post.slug] ?? []).filter((placement) => placement.section_id === sectionId);
  if (!placements.length) return '';
  const locale = ctx.locale ?? 'en';
  const labels = {
    en: ['Related video', 'Related videos', 'Video titles in the original language', 'YouTube video', 'Watch on YouTube', 'Load video'],
    'zh-Hans': ['相关视频', '相关视频', '视频标题保留原文', 'YouTube 视频', '在 YouTube 观看', '加载视频'],
    de: ['Passendes Video', 'Passende Videos', 'Videotitel in der Originalsprache', 'YouTube-Video', 'Auf YouTube ansehen', 'Video laden']
  }[locale];
  const byId = new Map([...(ctx.data.videos ?? []), ...postVideos.article_only_videos].map((video) => [video.id, video]));
  const videos = placements.map((placement) => {
    const video = byId.get(placement.video_id);
    if (!video) throw new Error(`Missing article video: ${placement.video_id}`);
    return video;
  });
  const contexts = new Map(placements.map((placement) => [placement.video_id, placement.context[locale]]));
  const id = `videos-${sectionId}`;
  return `<aside class="article-videos" aria-labelledby="${escapeAttr(id)}"><h3 id="${escapeAttr(id)}">${escapeHtml(labels[placements.length > 1 ? 1 : 0])}</h3><small class="article-video-language">${escapeHtml(labels[2])}</small><div class="video-list">${renderVideoEntries(videos, { contexts, article: true, playerLabel: labels[3], watchLabel: labels[4], loadLabel: labels[5] })}</div></aside>`;
}
