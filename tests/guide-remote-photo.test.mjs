import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { blogPhotos, postPhotos, renderPostPhotos, resolveBlogPhoto, validateRemoteBlogPhoto } from '../src/lib/editorial-images.mjs';
import { escapeHtml } from '../src/lib/html.mjs';
import { loadDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { loadPosts } from '../src/lib/posts.mjs';
import { renderImageSources, renderPrivacy } from '../src/render.mjs';

const data = loadDataset();
const posts = loadPosts();
const ctx = { data, products: joinProducts(data), catalogCandidates: joinCatalogCandidates(data), posts, base: '', siteUrl: 'https://chinesebikes.xyz', repositoryUrl: 'https://github.com/p0s/china-bike-research', siteLastmod: '2026-09-05' };
const id = 'elves-mori-aerox-official-embed';
const photo = blogPhotos.find((item) => item.id === id);
const remoteUrl = 'https://elvesbike.com/attach/202412/1734998874937741323.jpg';
const changed = (change) => {
  const next = structuredClone(photo);
  change(next);
  return next;
};

test('only the reviewed Mori AeroX record passes the remote guide photo contract', () => {
  assert.doesNotThrow(() => validateRemoteBlogPhoto(photo));
  assert.deepEqual(blogPhotos.filter((item) => item.external?.image?.hosting?.mode === 'remote').map((item) => item.id), [id]);
  const invalid = {
    'not admitted': (p) => { p.id = 'elves-vanyar-remote'; },
    'local path beside remote': (p) => { p.external.image.hosting.local_path = '/assets/images/sourced/x.avif'; },
    'variants': (p) => { p.external.image.variants = []; },
    'srcset': (p) => { p.external.image.srcset = 'x.jpg 1x'; },
    'image id': (p) => { p.image_id = 'elves-mori-aerox-primary-image'; },
    'plain http': (p) => { p.external.image.hosting.remote_url = remoteUrl.replace('https:', 'http:'); },
    'query': (p) => { p.external.image.hosting.remote_url = `${remoteUrl}?w=900`; },
    'fragment': (p) => { p.external.image.hosting.remote_url = `${remoteUrl}#photo`; },
    'credentials': (p) => { p.external.image.hosting.remote_url = remoteUrl.replace('https://', 'https://user:pass@'); },
    'other image host': (p) => { p.external.image.hosting.remote_url = remoteUrl.replace('elvesbike.com', 'uk.elvesbike.com'); },
    'other page host': (p) => { p.external.source.url = 'https://uk.elvesbike.com/products/elves-mori-aerox-carbon-aero-gravel-framesets'; },
    'other model': (p) => { p.model_ids = ['elves-falath-r7170']; },
    'other platform': (p) => { p.external.image.platform_id = 'elves-falath-r7170'; },
    'changed bytes': (p) => { p.external.image.source_media_bytes += 1; },
    'changed hash': (p) => { p.external.image.source_media_sha256 = '0'.repeat(64); },
    'missing width': (p) => { delete p.external.image.width; },
    'fractional height': (p) => { p.external.image.height = 667.5; },
    'missing rights': (p) => { delete p.external.image.rights; },
    'other rights status': (p) => { p.external.image.rights.status = 'source-attributed-rehost'; },
    'missing terms source': (p) => { delete p.external.image.rights.terms_source_id; },
    'missing page source': (p) => { delete p.external.source.source_id; },
    'missing privacy review': (p) => { delete p.external.image.privacy_review; },
    'generic metadata category': (p) => { p.external.image.privacy_review.embedded_metadata = 'editor-ids-only'; },
    'missing German caption': (p) => { delete p.note.de; },
  };
  for (const [name, change] of Object.entries(invalid)) {
    assert.throws(() => validateRemoteBlogPhoto(changed(change)), /Invalid remote blog photo/, name);
  }
});

test('the remote guide photo resolves only with its page and terms records on the image host', () => {
  assert.equal(resolveBlogPhoto(ctx, id).image.hosting.remote_url, remoteUrl);
  const without = (sourceId) => ({ ...ctx, data: { ...data, sources: data.sources.filter((source) => source.id !== sourceId) } });
  assert.equal(photo.external.source.source_id, 'elves-mori-aerox-technical-2026-08-25');
  assert.equal(photo.external.image.rights.terms_source_id, 'elves-terms-recheck-2026-10-22');
  assert.throws(() => resolveBlogPhoto(without('elves-mori-aerox-technical-2026-08-25'), id), /Invalid blog photo/);
  assert.throws(() => resolveBlogPhoto(without('elves-terms-recheck-2026-10-22'), id), /Invalid blog photo/);
  const moved = (sourceId, url) => ({ ...ctx, data: { ...data, sources: data.sources.map((source) => source.id === sourceId ? { ...source, url } : source) } });
  assert.throws(() => resolveBlogPhoto(moved('elves-terms-recheck-2026-10-22', 'https://uk.elvesbike.com/pages/terms'), id), /Invalid blog photo/);
  assert.throws(() => resolveBlogPhoto(moved('elves-mori-aerox-technical-2026-08-25', 'https://elvesbike.com/more.php?id=189&lm=47'), id), /Invalid blog photo/);
});

test('the remote guide photo renders from the maker host with its reviewed size, no referrer and no srcset', () => {
  const post = posts.find((item) => item.slug === 'buy-elves-bike');
  assert.deepEqual(postPhotos(post).map((item) => item.id), ['elves-falath-evo', id]);
  assert.deepEqual(post.photo_sections.find((placement) => placement.ids.includes(id)).section_id, 'choose');
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const html = renderPostPhotos({ ...ctx, locale }, post);
    const figure = html.match(new RegExp(`<figure[^>]*data-blog-photo="${id}"[\\s\\S]*?</figure>`))[0];
    const image = figure.match(/<img class="blog-bike-photo"[^>]*>/)[0];
    assert.ok(image.includes(`src="${remoteUrl}"`), locale);
    for (const attribute of ['width="1300"', 'height="667"', 'loading="lazy"', 'decoding="async"', 'referrerpolicy="no-referrer"', 'data-blog-remote']) {
      assert.ok(image.includes(attribute), `${locale}: ${attribute}`);
    }
    assert.ok(!image.includes('srcset'), locale);
    assert.ok(figure.includes(escapeHtml(photo.note[locale])), locale);
    assert.ok(figure.includes('href="https://elvesbike.com/more.php?id=188&amp;lm=47"'), locale);
    const local = html.match(/<figure[^>]*data-blog-photo="elves-falath-evo"[\s\S]*?<\/figure>/)[0];
    assert.ok(local.includes('srcset=') && !local.includes('data-blog-remote') && !local.includes('elvesbike.com/attach'), locale);
  }
});

test('privacy and image credits disclose maker-hosted guide photos in three languages', () => {
  const expected = {
    en: { privacy: ['some blog guides', 'the website receives your IP address and browser details, and any cookies your browser allows for it'], credits: ['shown from the maker’s website loads directly from that site', '(shown from the maker’s website)'] },
    'zh-Hans': { privacy: ['部分博客指南', '该网站会收到你的 IP 地址和浏览器信息，以及你的浏览器允许发送给它的 Cookie'], credits: ['图注注明直接从官网加载的照片则从制造商网站加载', '(直接从官网加载)'] },
    de: { privacy: ['einige Blog-Ratgeber', 'die Website erhält deine IP-Adresse und Browserangaben sowie alle Cookies, die dein Browser für sie zulässt'], credits: ['direkt von der Website des Herstellers geladen wird', '(direkt von der Herstellerwebsite geladen)'] },
  };
  for (const [locale, phrases] of Object.entries(expected)) {
    const privacy = renderPrivacy({ ...ctx, locale });
    for (const phrase of phrases.privacy) assert.ok(privacy.includes(phrase), `${locale}: ${phrase}`);
    assert.doesNotMatch(privacy, /cookies? (?:cannot|can't|are not|will not) (?:be )?sent/i);
    const credits = renderImageSources({ ...ctx, locale });
    for (const phrase of phrases.credits) assert.ok(credits.includes(escapeHtml(phrase)), `${locale}: ${phrase}`);
    assert.ok(credits.includes('href="https://elvesbike.com/more.php?id=188&amp;lm=47"'), locale);
  }
});

// The image failure handler from assets/site.js, run against a small fake DOM.
const script = fs.readFileSync(new URL('../assets/site.js', import.meta.url), 'utf8');
const handler = script.slice(
  script.indexOf("  document.querySelectorAll('[data-blog-header-image], [data-blog-bike-image], [data-blog-mascot]')"),
  script.indexOf('  // Model galleries are one slideshow.'),
);

class FakeElement {
  constructor(attributes = {}, classes = []) {
    this.attributes = attributes;
    this.classes = new Set(classes);
    this.children = [];
    this.parentElement = null;
    this.hidden = false;
    this.listeners = {};
  }
  append(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  get classList() {
    return { add: (name) => this.classes.add(name), contains: (name) => this.classes.has(name) };
  }
  hasAttribute(name) { return name in this.attributes; }
  matches(selector) { return selector.startsWith('.') ? this.classes.has(selector.slice(1)) : this.hasAttribute(selector.slice(1, -1)); }
  closest(selector) {
    for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node;
    return null;
  }
  querySelector(selector) {
    for (const child of this.children) {
      const found = child.matches(selector) ? child : child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
  remove() {
    if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }
  addEventListener(name, listener) { this.listeners[name] = listener; }
}

function photoPage({ remote, failedBeforeScript }) {
  const article = new FakeElement();
  const group = article.append(new FakeElement({}, ['blog-model-photos']));
  const figure = group.append(new FakeElement({ 'data-blog-photo': '' }, ['blog-model-photo']));
  const scene = figure.append(new FakeElement({}, ['blog-photo-scene']));
  const image = scene.append(new FakeElement({ 'data-blog-bike-image': '', ...(remote ? { 'data-blog-remote': '' } : {}) }));
  const status = figure.append(new FakeElement()).append(new FakeElement({ 'data-blog-photo-status': '' }));
  status.hidden = true;
  Object.assign(image, failedBeforeScript ? { complete: true, currentSrc: 'https://example.test/photo.jpg', naturalWidth: 0 } : { complete: false, currentSrc: '', naturalWidth: 0 });
  vm.runInNewContext(handler, { document: { querySelectorAll: () => [image] } });
  return { article, group, figure, scene, image, status };
}

test('a failed maker-hosted photo is removed with its caption; local photos keep their status line', () => {
  assert.ok(handler.includes('data-blog-remote'));
  for (const failedBeforeScript of [false, true]) {
    const remote = photoPage({ remote: true, failedBeforeScript });
    if (!failedBeforeScript) {
      assert.equal(remote.article.children.length, 1, 'nothing removed before the error');
      remote.image.listeners.error();
    }
    assert.equal(remote.figure.parentElement, null, `remote figure removed (${failedBeforeScript ? 'already failed' : 'error event'})`);
    assert.equal(remote.article.children.length, 0, 'the emptied photo group is removed too');

    const local = photoPage({ remote: false, failedBeforeScript });
    if (!failedBeforeScript) local.image.listeners.error();
    assert.equal(local.figure.parentElement, local.group, 'local figure stays');
    assert.equal(local.image.hidden, true);
    assert.ok(local.scene.classes.has('is-unavailable'));
    assert.equal(local.status.hidden, false);
  }
});

test('a failed remote photo leaves other photos in its group in place', () => {
  const article = new FakeElement();
  const group = article.append(new FakeElement({}, ['blog-model-photos']));
  const localFigure = group.append(new FakeElement({ 'data-blog-photo': '' }));
  const remoteFigure = group.append(new FakeElement({ 'data-blog-photo': '' }));
  const image = remoteFigure.append(new FakeElement({}, ['blog-photo-scene'])).append(new FakeElement({ 'data-blog-bike-image': '', 'data-blog-remote': '' }));
  Object.assign(image, { complete: true, currentSrc: 'https://example.test/photo.jpg', naturalWidth: 0 });
  vm.runInNewContext(handler, { document: { querySelectorAll: () => [image] } });
  assert.deepEqual(group.children, [localFigure]);
  assert.equal(group.parentElement, article);
});
