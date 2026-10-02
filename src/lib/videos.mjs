import { escapeAttr, escapeHtml } from './html.mjs';

const formatLabels = {
  'hands-on-review': 'Hands-on review', 'long-term-review': 'Long-term review',
  'model-overview': 'Model overview', 'build-and-ride': 'Build and ride'
};
const relationshipLabels = {
  'retailer-linked': 'Retailer-linked', 'brand-published': 'Brand video',
  unknown: 'Relationship unknown', 'product-supplied': 'Product supplied',
  'publication-review': 'Publication review', 'owner-review': 'Owner review',
  'community-post': 'Community post'
};
const label = (value, labels) => labels[value] ?? value.replaceAll('-', ' ').replace(/^./, (c) => c.toUpperCase());

export function validateYouTubeEmbed(video) {
  if (video.provider !== 'youtube' || !/^[A-Za-z0-9_-]{11}$/.test(video.youtube_video_id)
    || video.url !== `https://www.youtube.com/watch?v=${video.youtube_video_id}`) throw new Error(`Invalid YouTube embed: ${video.id}`);
}

export function renderVideoEntries(videos, { contexts = new Map(), article = false, playerLabel = 'YouTube video', watchLabel = 'Watch on YouTube' } = {}) {
  const heading = article ? 'h4' : 'h3';
  return videos.filter((video) => video.provider === 'youtube').map((video) => {
    validateYouTubeEmbed(video);
    const original = article ? ` data-original-language lang="${escapeAttr(video.language)}"` : '';
    return `<article class="video-entry">
      <div class="video-shell">
        <iframe src="https://www.youtube-nocookie.com/embed/${escapeAttr(video.youtube_video_id)}?rel=0" title="${escapeAttr(video.title)} — ${escapeAttr(playerLabel)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      </div>
      <div class="video-copy"><div class="video-meta"><span>${escapeHtml(label(video.format, formatLabels))}</span><span>${escapeHtml(label(video.relationship, relationshipLabels))}</span></div><${heading}${original}><a href="${escapeAttr(video.url)}" rel="noreferrer">${escapeHtml(video.title)}</a></${heading}><p>${escapeHtml(contexts.get(video.id) ?? video.summary)}</p>${video.timestamps?.length ? `<div class="video-timestamps" aria-label="Video sections">${video.timestamps.map((timestamp) => `<a href="${escapeAttr(video.url)}&amp;t=${Math.max(0, Math.floor(timestamp.at_seconds))}" rel="noreferrer">${escapeHtml(timestamp.label)} · ${Math.floor(timestamp.at_seconds / 60)}:${String(Math.floor(timestamp.at_seconds % 60)).padStart(2, '0')}</a>`).join('')}</div>` : ''}<small>${escapeHtml(video.channel_name)}${video.published_at ? ` · ${escapeHtml(video.published_at)}` : ''}. <span>${escapeHtml(video.disclosure)}</span> <a href="${escapeAttr(video.disclosure_url)}" rel="noreferrer">Disclosure basis</a>.</small>${article ? `<a class="video-fallback" href="${escapeAttr(video.url)}" rel="noreferrer">${escapeHtml(watchLabel)} <span aria-hidden="true">↗</span></a>` : ''}</div>
    </article>`;
  }).join('');
}
