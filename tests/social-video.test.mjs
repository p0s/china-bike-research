import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { loadPosts, renderPost, renderBlogIndex } from '../src/lib/posts.mjs';
import { loadSchedule, publishedPosts } from '../src/lib/post-publication.mjs';
import { renderCandidateModel, renderMethodology, renderModel, render404 } from '../src/render.mjs';
import {
  CLIP_LIMITS, auditSocialVideoPages, clipErrors, inspectMp4, loadSocialVideoManifest, socialVideoClip,
  validateSocialVideoAssets
} from '../src/lib/social-video.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = loadSocialVideoManifest(root);
const coverage = JSON.parse(fs.readFileSync(new URL('../content/social-video/coverage.json', import.meta.url), 'utf8'));
const data = loadDataset();
const products = joinProducts(data);
const candidates = joinCatalogCandidates(data);
const allPosts = loadPosts();
const posts = publishedPosts(allPosts, loadSchedule(root, allPosts));
const siteUrl = 'https://example.github.io';
const base = '/china-bike-research';
const ctx = { data, products, catalogCandidates: candidates, posts, base, siteUrl, repositoryUrl: 'https://github.com/example/china-bike-research', siteLastmod: '2026-10-29', now: new Date('2026-10-29T00:00:00Z') };
const fallback = manifest.fallback;
const shownPhoto = (image) => image?.hosting?.mode === 'local' && image.media_type !== 'project-placeholder' && image.buyer_visibility !== 'omit';
const ogVideo = (html) => [...html.matchAll(/<meta property="og:video" content="([^"]+)">/g)].map((match) => match[1]);
const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

test('every committed clip matches its manifest, budget and MP4 contract', () => {
  assert.deepEqual(validateSocialVideoAssets(root), []);
  assert.ok(fallback && fallback.kind === 'brand' && !fallback.source);
  for (const clip of [...manifest.clips, fallback]) {
    assert.ok(clip.bytes <= CLIP_LIMITS.ceilingBytes, clip.file);
    assert.ok(clip.crf >= manifest.design.settings.crf && clip.crf <= manifest.design.settings.max_crf, clip.file);
    assert.deepEqual([clip.width, clip.height, clip.fps, clip.frames, clip.duration_s], [960, 540, 24, 96, 4]);
  }
  const kit = JSON.parse(fs.readFileSync(new URL('../content/social-video/riding-mascot-kit.json', import.meta.url), 'utf8'));
  assert.equal(sha(fs.readFileSync(new URL(`../content/social-video/${kit.file}`, import.meta.url))), kit.sha256);
  assert.equal(manifest.design.settings.kit.sha256, kit.sha256);
});

test('clips are shared: one per distinct still, keyed by its content hash, with reviewed provenance', () => {
  const sources = manifest.clips.map((clip) => clip.source.sha256);
  assert.equal(new Set(sources).size, sources.length);
  const imageIds = new Set(data.images.map((image) => image.id));
  for (const clip of manifest.clips) {
    if (clip.kind === 'photo') {
      assert.ok(clip.images.length > 0 && clip.images.every((id) => imageIds.has(id)), clip.file);
      for (const id of clip.images) {
        const record = data.images.find((image) => image.id === id);
        assert.equal(record.rights.status, 'source-attributed-rehost', id);
        assert.ok(record.privacy_review?.reviewed_at && record.credit, id);
      }
    } else {
      assert.equal(clip.kind, 'cover');
      assert.ok(clip.editorial_image, clip.file);
    }
    const [x, y, w, h] = clip.layout.still;
    assert.ok(w <= clip.source.width && h <= clip.source.height, `${clip.file}: still is never upscaled`);
    assert.ok(Math.abs(w / h - clip.source.width / clip.source.height) < 0.02, `${clip.file}: still keeps its aspect ratio (uncropped)`);
    assert.ok(x >= 0 && y >= 0 && x + w <= 960 && y + h <= 540);
  }
});

test('frozen coverage is complete: every route with a still had its own clip when authored', () => {
  const sources = new Set(manifest.clips.map((clip) => clip.source.sha256));
  const routes = Object.entries(coverage.routes);
  assert.ok(!('/404.html' in coverage.routes));
  for (const [route, entry] of routes) if (entry.source) assert.ok(sources.has(entry.source), `${route} has no clip`);
  assert.equal(coverage.totals.routes, routes.length);
  assert.equal(coverage.totals.image_specific_clips, manifest.clips.length);
  assert.equal(coverage.totals.routes_with_fallback, routes.filter(([, entry]) => entry.kind !== 'home' && !entry.source).length);
});

test('pages select the clip for their own still, share it across languages, and fall back safely', () => {
  const withPhoto = products.find((product) => shownPhoto(product.image));
  const pages = ['en', 'zh-Hans', 'de'].map((locale) => renderModel({ ...ctx, locale }, withPhoto));
  const urls = pages.map((page) => ogVideo(page));
  assert.ok(urls.every((list) => list.length === 1 && list[0] === urls[0][0]));
  assert.match(urls[0][0], new RegExp(`^${siteUrl}${base}/assets/social-video/photo-[0-9a-f]{16}\\.mp4$`));
  assert.ok(pages[0].includes('<meta property="og:video:type" content="video/mp4"><meta property="og:video:width" content="960"><meta property="og:video:height" content="540">'));

  const post = posts[0];
  const postPages = ['en', 'zh-Hans', 'de'].map((locale) => renderPost({ ...ctx, locale }, post, posts));
  assert.ok(postPages.every((page) => ogVideo(page)[0] === ogVideo(postPages[0])[0]));
  assert.match(ogVideo(postPages[0])[0], /\/assets\/social-video\/cover-[0-9a-f]{16}\.mp4$/);
  assert.match(ogVideo(renderBlogIndex(ctx, posts))[0], /\/assets\/social-video\/cover-[0-9a-f]{16}\.mp4$/);

  const withoutPhoto = candidates.find((entry) => !entry.image);
  assert.deepEqual(ogVideo(renderCandidateModel(ctx, withoutPhoto)), [`${siteUrl}${base}/${fallback.file}`]);
  assert.deepEqual(ogVideo(renderMethodology(ctx)), [`${siteUrl}${base}/${fallback.file}`]);
  assert.deepEqual(ogVideo(render404(ctx)), []);
});

test('selection is content-addressed and never yields a broken URL', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'social-video-'));
  fs.mkdirSync(path.join(temporary, 'assets/images'), { recursive: true });
  fs.writeFileSync(path.join(temporary, 'assets/images/a.avif'), 'still A');
  fs.writeFileSync(path.join(temporary, 'assets/images/a-copy.avif'), 'still A');
  fs.writeFileSync(path.join(temporary, 'assets/images/b.avif'), 'still B');
  const clip = { file: 'assets/social-video/photo-a.mp4', width: 960, height: 540, source: { sha256: sha(Buffer.from('still A')) } };
  const fixture = { clips: [clip], fallback: { file: 'assets/social-video/brand-x.mp4', width: 960, height: 540 } };
  const pick = (image, prefix = '') => socialVideoClip(prefix, image, { root: temporary, data: fixture });
  assert.equal(pick('/assets/images/a.avif'), clip);
  assert.equal(pick('/base/assets/images/a-copy.avif', '/base'), clip, 'identical bytes at another path share the clip');
  assert.equal(pick('/assets/images/b.avif'), fixture.fallback, 'a still without a clip uses the fallback');
  assert.equal(pick('/assets/images/missing.avif'), fixture.fallback);
  assert.equal(pick('https://example.com/assets/images/a.avif'), fixture.fallback);
  assert.equal(pick('/assets/../../etc/hosts'), fixture.fallback);
  assert.equal(pick(''), fixture.fallback);
  fs.rmSync(temporary, { recursive: true, force: true });
});

test('MP4 checks catch wrong hashes, dimensions, frame counts and non-fast-start files', () => {
  const buffer = fs.readFileSync(path.join(root, fallback.file));
  assert.deepEqual(clipErrors(buffer, fallback), []);
  const info = inspectMp4(buffer);
  assert.deepEqual(info.tracks.map((track) => [track.handler, track.codec, track.profile, track.level, track.width, track.height, track.frames, track.fps]),
    [['vide', 'avc1', 100, 31, 960, 540, 96, 24]]);
  assert.equal(info.metadataItems, 0);
  assert.match(clipErrors(buffer, { ...fallback, sha256: '0'.repeat(64) }).join(), /SHA-256/);
  assert.match(clipErrors(buffer, { ...fallback, width: 1280 }).join(), /recorded dimensions/);
  assert.match(clipErrors(buffer.subarray(0, 4000), fallback).join(), /invalid|SHA-256/);
  // Move moov after mdat: same bytes otherwise, but players must download everything before starting.
  const boxes = [];
  for (let at = 0; at < buffer.length; at += buffer.readUInt32BE(at)) boxes.push(buffer.subarray(at, at + buffer.readUInt32BE(at)));
  const late = Buffer.concat([...boxes.filter((box) => box.toString('latin1', 4, 8) !== 'moov'), boxes.find((box) => box.toString('latin1', 4, 8) === 'moov')]);
  assert.match(clipErrors(late, { ...fallback, sha256: sha(late), bytes: late.length }).join(), /fast-start/);
});

test('the page audit rejects missing, duplicate, mixed or loaded clips and silent fallbacks', () => {
  const clip = manifest.clips.find((item) => item.kind === 'cover');
  const prefix = `${siteUrl}${base}/`;
  const head = (file, extra = '') => `<meta property="og:image" content="${prefix}${clip.source.path}"><meta property="og:video" content="${prefix}${file}"><meta property="og:video:secure_url" content="${prefix}${file}"><meta property="og:video:type" content="video/mp4"><meta property="og:video:width" content="960"><meta property="og:video:height" content="540">${extra}`;
  const page = (route, html, canonical = route) => ({ route, canonical, html });
  const audit = (pages, frozen = null) => auditSocialVideoPages(pages, { siteUrl, base, root, coverage: frozen }).errors.join('\n');
  assert.equal(audit([page('/blog/x/', head(clip.file))]), '');
  assert.match(audit([page('/blog/x/', head(clip.file) + head(clip.file))]), /exactly one/);
  assert.match(audit([page('/blog/x/', head(clip.file).replace('video/mp4', 'text/html'))]), /exactly one/);
  assert.match(audit([page('/blog/x/', head(clip.file, `<video src="/${clip.file}"></video>`))]), /references a video file/);
  assert.match(audit([page('/blog/x/', head(fallback.file))]), /does not match its preview still/);
  assert.match(audit([page('/blog/x/', head(clip.file)), page('/de/blog/x/', head(manifest.clips.find((item) => item !== clip).file), '/blog/x/')]), /different clips|does not match/);
  assert.match(audit([page('/404.html', head(clip.file))]), /error pages/);
  // A still that coverage froze with a clip must not drop to the fallback when its manifest entry disappears.
  const withoutEntry = { ...manifest, clips: manifest.clips.filter((item) => item !== clip) };
  const frozen = { routes: { '/blog/x/': { source: clip.source.sha256 } } };
  const errors = auditSocialVideoPages([page('/blog/x/', head(fallback.file))], { siteUrl, base, root, data: withoutEntry, coverage: frozen }).errors;
  assert.match(errors.join(), /manifest omission/);
});

test('ordinary pages, scripts and styles never load the clips', () => {
  for (const name of fs.readdirSync(new URL('../assets', import.meta.url))) {
    if (!/\.(?:js|css)$/.test(name)) continue;
    assert.doesNotMatch(fs.readFileSync(new URL(`../assets/${name}`, import.meta.url), 'utf8'), /social-video|\.mp4\b|<video/i, name);
  }
  const withPhoto = products.find((product) => shownPhoto(product.image));
  const body = renderModel(ctx, withPhoto).replace(/<meta property="og:video[^>]*>/g, '');
  assert.doesNotMatch(body, /social-video|\.mp4\b|<video/i);
});
