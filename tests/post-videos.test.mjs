import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts } from '../src/lib/data.mjs';
import { loadPosts, renderPost } from '../src/lib/posts.mjs';
import { loadSchedule, publishedPosts } from '../src/lib/post-publication.mjs';
import { postVideos, validatePostVideoReferences } from '../src/lib/post-videos.mjs';
import { renderVideoEntries } from '../src/lib/videos.mjs';
import { escapeHtml } from '../src/lib/html.mjs';
import { postPhotos } from '../src/lib/editorial-images.mjs';
import { translate } from '../assets/i18n.js';

const data = loadDataset(), products = joinProducts(data), posts = loadPosts();
const visible = publishedPosts(posts, loadSchedule(process.cwd(), posts));
const ctx = { data, products, posts: visible, siteUrl: 'https://chinesebikes.xyz', siteLastmod: '2026-10-02' };
const videoById = new Map([...data.videos, ...postVideos.article_only_videos].map((video) => [video.id, video]));

test('article curation has valid localized placements and does not release drafts or change catalog media', () => {
  assert.doesNotThrow(() => validatePostVideoReferences(posts, data.videos));
  for (const slug of Object.keys(postVideos.articles)) assert.ok(visible.some((post) => post.slug === slug));
  for (const video of postVideos.article_only_videos) {
    assert.ok(!data.videos.some((record) => record.id === video.id));
    assert.equal(video.target, undefined);
    assert.equal(video.match, undefined);
  }
});

for (const locale of ['en', 'zh-Hans', 'de']) for (const base of ['', '/china-bike-research']) {
  test(`article players preserve source identity, localized context, disclosure and fallbacks: ${locale} ${base || '/'}`, () => {
    for (const post of visible) {
      const html = renderPost({ ...ctx, locale, base }, post, visible);
      const placements = postVideos.articles[post.slug] ?? [];
      assert.equal([...html.matchAll(/<iframe /g)].length, 0);
      assert.equal([...html.matchAll(/data-article-video=/g)].length, placements.length);
      if (!placements.length) assert.doesNotMatch(html, /class="article-videos"/);
      for (const placement of placements) {
        const video = videoById.get(placement.video_id);
        const start = html.indexOf(`<section id="${placement.section_id}">`);
        const embed = html.indexOf(`data-article-video="${video.youtube_video_id}"`);
        assert.ok(start >= 0 && embed > start && embed < html.indexOf('</section>', start));
        assert.ok(html.includes(escapeHtml(placement.context[locale])));
        assert.ok(html.includes(escapeHtml(video.title)));
        assert.ok(html.includes(escapeHtml(translate(video.disclosure, locale))));
        assert.ok(html.includes(`class="video-fallback" href="${video.url}"`));
        for (const takeaway of video.takeaways ?? []) assert.ok(html.includes(escapeHtml(takeaway.text)), 'Reviewed highlights stay readable before player activation');
        assert.match(html.slice(embed, html.indexOf('</div>', embed)), /class="video-load-button" type="button" aria-label="[^"]+" hidden/);
        assert.match(html, /data-original-language lang="en"/);
      }
      assert.doesNotMatch(html, /autoplay|youtube-nocookie\.com|<iframe/);
      assert.equal([...html.matchAll(/data-blog-bike-image/g)].length, postPhotos(post).length, `Retain model photographs: ${post.slug}`);
    }
  });
}

test('model players retain their existing lazy embed and metadata', () => {
  const video = data.videos.find((video) => video.provider === 'youtube');
  const html = renderVideoEntries([video]);
  assert.ok(html.includes(`https://www.youtube-nocookie.com/embed/${video.youtube_video_id}?rel=0`));
  assert.match(html, /loading="lazy"/);
  assert.doesNotMatch(html, /data-article-video|autoplay/);
  for (const text of [video.title, video.summary, video.disclosure]) assert.ok(html.includes(escapeHtml(text)));
});

test('article-only independent reviews retain the same transcript gate as model videos', () => {
  const registry = structuredClone(postVideos);
  const item = registry.article_only_videos[0];
  item.format = 'hands-on-review';
  item.relationship = 'publication-review';
  item.transcript = { status: 'auto-captions', method: 'youtube-player-captions', language: 'en', checked_at: '2026-10-26', evidence_sha256: 'a'.repeat(64) };
  item.takeaways = [{ kind: 'build', text: 'The shown custom build uses a separately chosen cockpit.' }];
  assert.doesNotThrow(() => validatePostVideoReferences(posts, data.videos, registry));
  delete item.transcript.evidence_sha256;
  assert.throws(() => validatePostVideoReferences(posts, data.videos, registry), /video evidence/);
  item.transcript = undefined;
  assert.throws(() => validatePostVideoReferences(posts, data.videos, registry), /video evidence/);
});

test('workshop and explainer footage has its own label and does not imply equipment approval', () => {
  for (const [format, label] of [['workshop-guide', 'Workshop guide'], ['topic-explainer', 'Topic explainer']]) {
    const registry = structuredClone(postVideos);
    const item = registry.article_only_videos.find(video => video.takeaways?.length);
    item.format = format;
    assert.doesNotThrow(() => validatePostVideoReferences(posts, data.videos, registry));
    const html = renderVideoEntries([item], { article: true });
    assert.ok(html.includes(label));
    assert.ok(html.includes('general guidance, not approval of your exact equipment'));
    assert.doesNotMatch(html, /points apply to the build shown/);
    item.format = 'unclassified-guide';
    assert.throws(() => validatePostVideoReferences(posts, data.videos, registry), /video context/);
  }
});

test('invalid video identities, missing context, duplicated placements and XHS embeds fail before publication', () => {
  const mutate = (change) => { const registry = structuredClone(postVideos); change(registry); return registry; };
  const first = (registry) => Object.values(registry.articles)[0];
  const invalid = [
    mutate((registry) => { first(registry)[0].video_id = 'unknown-video'; }),
    mutate((registry) => { first(registry)[0].video_id = data.videos.find((video) => video.provider === 'xhs').id; }),
    mutate((registry) => { first(registry)[0].section_id = 'missing-section'; }),
    mutate((registry) => { delete first(registry)[0].context.de; }),
    mutate((registry) => { first(registry).push(first(registry)[0]); }),
    mutate((registry) => { registry.article_only_videos[0].youtube_video_id = 'bad" onload="alert(1)'; }),
    mutate((registry) => { registry.article_only_videos[0].url = 'https://elsewhere.invalid/watch'; }),
    mutate((registry) => { registry.article_only_videos[0].target = { platform_id: 'twitter-gravel-v3' }; })
  ];
  for (const registry of invalid) assert.throws(() => validatePostVideoReferences(posts, data.videos, registry));
  assert.throws(() => renderVideoEntries([{ ...postVideos.article_only_videos[0], youtube_video_id: '../unsafe' }]));
});
