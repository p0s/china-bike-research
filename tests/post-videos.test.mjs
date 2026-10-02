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
      const placements = postVideos.articles[post.slug];
      assert.equal([...html.matchAll(/<iframe /g)].length, placements.length);
      for (const placement of placements) {
        const video = videoById.get(placement.video_id);
        const start = html.indexOf(`<section id="${placement.section_id}">`);
        const embed = html.indexOf(`https://www.youtube-nocookie.com/embed/${video.youtube_video_id}?rel=0`);
        assert.ok(start >= 0 && embed > start && embed < html.indexOf('</section>', start));
        assert.ok(html.includes(escapeHtml(placement.context[locale])));
        assert.ok(html.includes(escapeHtml(video.title)));
        assert.ok(html.includes(escapeHtml(translate(video.disclosure, locale))));
        assert.ok(html.includes(`class="video-fallback" href="${video.url}"`));
        assert.match(html.slice(embed, html.indexOf('</iframe>', embed)), /loading="lazy"/);
        assert.match(html, /data-original-language lang="en"/);
      }
      assert.doesNotMatch(html, /autoplay|youtube\.com\/embed|<iframe src="[^h]/);
      assert.equal([...html.matchAll(/data-blog-bike-image/g)].length, postPhotos(post).length, `Retain model photographs: ${post.slug}`);
    }
  });
}

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
