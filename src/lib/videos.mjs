import { escapeAttr, escapeHtml } from './html.mjs';

const formatLabels = {
  'hands-on-review': 'Hands-on review', 'long-term-review': 'Long-term review',
  'model-overview': 'Model overview', 'build-and-ride': 'Build and ride',
  'workshop-guide': 'Workshop guide', 'topic-explainer': 'Topic explainer'
};
const relationshipLabels = {
  'retailer-linked': 'Retailer-linked', 'brand-published': 'Brand video',
  unknown: 'Relationship unknown', 'product-supplied': 'Product supplied',
  'publication-review': 'Publication review', 'owner-review': 'Owner review',
  'community-post': 'Community post'
};
const takeawayKindLabels = {
  measured: 'Measured', fit: 'Fit check', build: 'Build note', ride: 'Ride impression',
  quality: 'Finish and faults', support: 'Support', price: 'Price at publication', claim: 'Repeats a maker claim'
};
const transcriptLabels = { 'creator-captions': 'Creator captions reviewed', 'auto-captions': 'Automatic captions reviewed' };
const label = (value, labels) => labels[value] ?? value.replaceAll('-', ' ').replace(/^./, (c) => c.toUpperCase());

export function validateYouTubeEmbed(video) {
  if (video.provider !== 'youtube' || !/^[A-Za-z0-9_-]{11}$/.test(video.youtube_video_id)
    || video.url !== `https://www.youtube.com/watch?v=${video.youtube_video_id}`) throw new Error(`Invalid YouTube embed: ${video.id}`);
}

// The first featured YouTube video with a verified record of YouTube's own og:video player metadata.
export function openGraphVideo(videos = []) {
  const video = videos.find((item) => item.provider === 'youtube' && item.open_graph_player);
  if (!video) return null;
  validateYouTubeEmbed(video);
  const { type, width, height } = video.open_graph_player;
  return { url: `https://www.youtube.com/embed/${video.youtube_video_id}`, type, width, height };
}

export const clockLabel = (seconds) => {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
};
export const timestampUrl = (video, seconds) => `${video.url}&t=${Math.max(0, Math.floor(seconds))}`;

// Paraphrased, transcript-checked points shown below the player; each keeps its
// kind so measurements, fit checks and opinions never read as one another.
export function renderVideoTakeaways(video) {
  if (!video.takeaways?.length) return '';
  const basis = transcriptLabels[video.transcript?.status] ?? '';
  const scope = ['workshop-guide', 'topic-explainer'].includes(video.format)
    ? 'Paraphrased by China Bikes; general guidance, not approval of your exact equipment.'
    : 'Paraphrased by China Bikes; points apply to the build shown, not to every size or trim.';
  return `<div class="video-takeaways"><h4>Takeaways</h4><ul>${video.takeaways.map((item) => `<li><span class="video-takeaway-kind">${escapeHtml(label(item.kind, takeawayKindLabels))}</span>${Number.isFinite(item.at_seconds) ? `<a href="${escapeAttr(timestampUrl(video, item.at_seconds))}" rel="noreferrer">${escapeHtml(clockLabel(item.at_seconds))}</a>` : ''}<span data-original-language lang="en">${escapeHtml(item.text)}</span></li>`).join('')}</ul><small>${basis ? `<span>${escapeHtml(basis)}</span> ${escapeHtml(video.transcript.checked_at)}. ` : ''}<span>${escapeHtml(scope)}</span></small></div>`;
}

export function renderVideoEntries(videos, { contexts = new Map(), article = false, playerLabel = 'YouTube video', watchLabel = 'Watch on YouTube', loadLabel = 'Load video', takeaways = true } = {}) {
  const heading = article ? 'h4' : 'h3';
  return videos.filter((video) => video.provider === 'youtube').map((video) => {
    validateYouTubeEmbed(video);
    const original = article ? ` data-original-language lang="${escapeAttr(video.language)}"` : '';
    return `<article class="video-entry"${takeaways ? ` id="video-${escapeAttr(video.id)}"` : ''}>
      <div class="video-shell"${article ? ` data-article-video="${escapeAttr(video.youtube_video_id)}" data-player-title="${escapeAttr(video.title)} — ${escapeAttr(playerLabel)}"` : ''}>
        ${article ? `<a class="video-load-fallback" href="${escapeAttr(video.url)}" rel="noreferrer">${escapeHtml(watchLabel)} <span aria-hidden="true">↗</span></a><button class="video-load-button" type="button" aria-label="${escapeAttr(`${loadLabel}: ${video.title}`)}" hidden><span class="video-play-icon" aria-hidden="true">▶</span><span>${escapeHtml(loadLabel)}</span></button>` : `<iframe src="https://www.youtube-nocookie.com/embed/${escapeAttr(video.youtube_video_id)}?rel=0" title="${escapeAttr(video.title)} — ${escapeAttr(playerLabel)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`}
      </div>
      <div class="video-copy"><div class="video-meta"><span>${escapeHtml(label(video.format, formatLabels))}</span><span>${escapeHtml(label(video.relationship, relationshipLabels))}</span></div><${heading}${original}><a href="${escapeAttr(video.url)}" rel="noreferrer">${escapeHtml(video.title)}</a></${heading}><p>${escapeHtml(contexts.get(video.id) ?? video.summary)}</p>${video.timestamps?.length ? `<div class="video-timestamps" aria-label="Video sections">${video.timestamps.map((timestamp) => `<a href="${escapeAttr(timestampUrl(video, timestamp.at_seconds))}" rel="noreferrer">${escapeHtml(timestamp.label)} · ${clockLabel(timestamp.at_seconds)}</a>`).join('')}</div>` : ''}<small>${escapeHtml(video.channel_name)}${video.published_at ? ` · ${escapeHtml(video.published_at)}` : ''}. <span>${escapeHtml(video.disclosure)}</span> <a href="${escapeAttr(video.disclosure_url)}" rel="noreferrer">Disclosure basis</a>.</small>${article ? `<a class="video-fallback" href="${escapeAttr(video.url)}" rel="noreferrer">${escapeHtml(watchLabel)} <span aria-hidden="true">↗</span></a>` : ''}</div>
      ${takeaways ? renderVideoTakeaways(video) : ''}
    </article>`;
  }).join('');
}
