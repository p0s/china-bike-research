import test from 'node:test';
import assert from 'node:assert/strict';
import { translate } from '../assets/i18n.js';
import { de } from '../assets/i18n-de.js';
import { bindAnalyticsChoices } from '../assets/analytics-choice.js';
import { LOCALES, localePath, routeLocale, localizedHref, localizeHtml, localizedCatalogPayload } from '../src/lib/i18n.mjs';
import { layout } from '../src/lib/html.mjs';
import { loadDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { loadPosts, renderPost } from '../src/lib/posts.mjs';
import { editorialImages, blogPhotos } from '../src/lib/editorial-images.mjs';
import { catalogSummaries, renderCandidateModel, renderModel, renderPrivacy } from '../src/render.mjs';
import { handleRequest, isEligibleDocumentPath } from '../worker/index.mjs';

const data = loadDataset();
const products = joinProducts(data);
const catalogCandidates = joinCatalogCandidates(data);
const posts = loadPosts();
const siteUrl = 'https://chinesebikes.xyz';
const ctx = { data, products, catalogCandidates, posts, base: '', locale: 'de', siteUrl, repositoryUrl: 'https://github.com/p0s/china-bike-research', siteLastmod: '2026-09-05' };
const schemas = (html) => [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)].map((match) => JSON.parse(match[1]));

for (const base of ['', '/china-bike-research']) test(`German routes, language switches and consent forms retain the deployment base: ${base || '/'}`, () => {
  assert.deepEqual(LOCALES, ['en', 'zh-Hans', 'de']);
  assert.equal(localePath('/', 'de'), '/de/');
  assert.equal(routeLocale('/de/models/test/'), 'de');
  assert.equal(localizedHref(`${base}/models/test/?compare=one#sources`, { ...ctx, base }), `${base}/de/models/test/?compare=one#sources`);
  for (const path of ['/assets/site.js', '/data/catalog.json', '/zh/blog/', '/de/blog/']) {
    assert.equal(localizedHref(base + path, { ...ctx, base }), base + path);
  }
  const html = layout({ ...ctx, base, path: '/blog/', title: 'Buying guides', description: 'Recorded bike evidence', body: '<h1>Buying guides</h1>' });
  assert.ok(html.includes(`<link rel="canonical" href="${siteUrl}${base}/de/blog/">`));
  assert.ok(html.includes('<html lang="de">'));
  for (const locale of LOCALES) assert.ok(html.includes(`hreflang="${locale}" href="${siteUrl}${base}${localePath('/blog/', locale)}"`));
  assert.ok(html.includes(`data-language-switch href="${base}/blog/"`));
  assert.ok(html.includes(`data-language-switch href="${base}/zh/blog/"`));
  assert.ok(html.includes('<h1>Kaufleitfäden</h1>'));
  const privacy = renderPrivacy({ ...ctx, base });
  assert.ok(privacy.includes(`action="${base}/analytics/opt-in?lang=de"`));
  assert.ok(privacy.includes(`action="${base}/analytics/opt-out?lang=de"`));
  assert.ok(privacy.includes('Analyse erlauben'));
});

test('German localization translates exposed tooltip data but preserves identities, numbers, source quotations and external URLs', () => {
  const html = localizeHtml('<p data-original-language lang="en">Framesets &amp; Build</p><button data-tooltip-lines="[&quot;Frame&quot;,&quot;Price not verified&quot;]">Home</button><script>const x = "Home";</script>', ctx);
  assert.ok(html.includes('<p data-original-language lang="en">Framesets &amp; Build</p>'));
  assert.ok(html.includes('data-tooltip-lines="[&quot;Rahmen&quot;,&quot;Preis nicht verifiziert&quot;]"'));
  assert.ok(html.includes('const x = "Home";'));
  const before = structuredClone(data);
  const summaries = catalogSummaries(ctx);
  const localized = localizedCatalogPayload(summaries, ctx);
  for (let i = 0; i < summaries.length; i++) {
    for (const key of ['id', 'buildBaseKind', 'weightGrams', 'frameLow', 'frameHigh']) assert.deepEqual(localized[i][key], summaries[i][key]);
    if (summaries[i].stage === 'published') assert.equal(localized[i].bestFor, data.variants.find((variant) => variant.id === summaries[i].id).editorial.best_for.map((value) => translate(value, 'de')).join(', ') || 'Keine Angabe über die Kategorie hinaus');
  }
  assert.deepEqual(data, before);
  const record = localizedCatalogPayload({ id: 'home', category: 'road', price: 4951, label: 'Framesets', url: siteUrl + '/models/example/', source_url: 'https://maker.invalid/de/' }, ctx);
  assert.deepEqual(record, { id: 'home', category: 'road', price: 4951, label: 'Rahmensets', url: siteUrl + '/de/models/example/', source_url: 'https://maker.invalid/de/' });
  assert.equal(translate('3 matches', 'de'), '3 Treffer');
  assert.equal(translate('Move Test Model right', 'de'), 'Test Model nach rechts');
});

test('every published model has a German verdict and buying advice; research profiles disclose original evidence', () => {
  for (const product of products) {
    const editorial = product.variant.editorial;
    for (const field of ['verdict', 'best_for', 'strengths', 'caveats']) {
      for (const value of [].concat(editorial[field] ?? [])) {
        const phrase = field === 'best_for' || field === 'verdict' ? value : value.trim().replace(/[.;]+$/, '');
        assert.ok(de[phrase], `Missing German ${field}: ${product.variant.id}: ${phrase}`);
      }
    }
    const html = renderModel(ctx, product);
    assert.ok(html.includes('Originalbelege'));
    assert.doesNotMatch(html, /The displayed .* build allowance|Best suited to /);
    const review = schemas(html).find((entry) => entry['@type'] === 'Review');
    if (review) {
      assert.equal(review.inLanguage, 'de');
      assert.equal(review.reviewBody, translate(editorial.verdict, 'de'));
    }
  }
  for (const candidate of catalogCandidates) {
    const html = renderCandidateModel(ctx, candidate);
    assert.ok(html.includes('Rechercheprofil.'));
    assert.ok(html.includes('data-original-language'));
    assert.ok(html.includes('Originale Recherchehinweise (Englisch)'));
    assert.doesNotMatch(html, /The displayed .* build allowance|complete-bike lead under review/);
  }
});

test('German dynamic build totals keep missing inputs and compatibility warnings explicit', () => {
  assert.equal(translate('¥17,318 known + 9 unknown', 'de'), '¥17,318 bekannt + 9 unbekannt');
  assert.equal(translate('Complete price needs 9 more inputs; complete weight needs 6 more inputs.', 'de'), 'Gesamtpreis: 9 fehlende Eingaben; Gesamtgewicht: 6 fehlende Eingaben.');
  assert.equal(translate("35 mm tires exceed the frame's published 32 mm limit for 2×.", 'de'), '35-mm-Reifen überschreiten die veröffentlichte Rahmengrenze 32 mm bei 2×.');
  assert.equal(translate('Included in Test package; not counted again.', 'de'), 'In Test package enthalten; nicht erneut gezählt.');
  const combined = translate('Purchase total needs 0 more inputs; projected weight needs 1 more input. Removed parts exceed the whole-bike weight; check units and avoid counting removed components twice.', 'de');
  assert.match(combined, /erwartetes Gewicht: 1 fehlende Eingaben/);
  assert.match(combined, /Ausgebaute Teile übersteigen das Gesamtgewicht/);
});

test('all 25 German articles preserve section anchors, model citations, dates and publication state', () => {
  assert.equal(posts.length, 25);
  for (const post of posts) {
    const copy = post.translations.de;
    assert.notEqual(copy.title, post.translations.en.title);
    assert.deepEqual(copy.sections.map((section) => section.id), post.translations.en.sections.map((section) => section.id));
    const html = renderPost(ctx, post, posts);
    const schema = schemas(html).find((entry) => entry['@type'] === 'BlogPosting');
    assert.equal(schema.headline, copy.title);
    assert.equal(schema.description, copy.description);
    assert.equal(schema.inLanguage, 'de');
    assert.equal(schema.datePublished, post.datePublished);
    assert.equal(schema.url, `${siteUrl}/de/blog/${post.slug}/`);
    for (const section of copy.sections) assert.ok(html.includes(`id="${section.id}"`));
    for (const id of post.model_ids) assert.ok(html.includes(`/de/models/${id}/#source-records`));
  }
  for (const image of editorialImages) assert.ok(image.header.alt.de);
  for (const photo of blogPhotos) assert.ok(photo.alt.de && photo.note.de);
});

const env = { GA4_ENABLED: 'true', GA4_MEASUREMENT_ID: 'G-TEST12345', GA4_API_SECRET: 'test-secret', ASSETS: { fetch: async () => new Response('<html lang="de"><body>Test</body></html>', { headers: { 'content-type': 'text/html' } }) } };
function request(path, init = {}) {
  const req = new Request(siteUrl + path, init);
  Object.defineProperty(req, 'cf', { value: { country: 'DE' } });
  return req;
}
test('German pages and preference responses keep the consent gate and cookies unchanged', async () => {
  for (const path of ['/de/', '/de/build/', '/de/blog/example/', '/de/models/example/']) assert.equal(isEligibleDocumentPath(path), true);
  const waits = [];
  const response = await handleRequest(request('/de/'), env, { waitUntil: (task) => waits.push(task) });
  const html = await response.text();
  assert.equal(waits.length, 0);
  assert.ok(html.includes('Analyse erlauben'));
  assert.ok(html.includes('action="/analytics/opt-in?lang=de"'));
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  for (const choice of ['in', 'out']) {
    const saved = await handleRequest(request(`/analytics/opt-${choice}?lang=de`, { method: 'POST', headers: { origin: siteUrl } }), env);
    const body = await saved.text();
    assert.equal(saved.status, 200);
    assert.ok(body.includes('<html lang="de">'));
    assert.ok(body.includes('Analyseauswahl gespeichert'));
    assert.ok(body.includes('href="/de/privacy/"'));
    const cookies = saved.headers.getSetCookie();
    assert.ok(cookies.some((cookie) => cookie.startsWith(choice === 'in' ? 'p0s_analytics_consent=v1;' : 'p0s_analytics_optout=1;')));
    assert.ok(cookies.every((cookie) => cookie.includes('Secure;') && cookie.includes('SameSite=Lax')));
  }
});

test('German browser choices retain only the recognized language query and report failed saves in German', async () => {
  let listener;
  const status = { hidden: true };
  const button = { disabled: false };
  const doc = { documentElement: { lang: 'de' }, addEventListener: (_, fn) => { listener = fn; }, querySelector: (selector) => selector === '[data-analytics-choice-status]' ? status : null };
  const called = [];
  const win = { document: doc, location: { origin: siteUrl }, fetch: async (url) => { called.push(url); return new Response(null, { status: 500 }); } };
  bindAnalyticsChoices(win);
  await listener({ target: { action: siteUrl + '/analytics/opt-in?lang=de&untrusted=discard', matches: () => true, parentElement: { querySelectorAll: () => [button] } }, preventDefault() {} });
  assert.deepEqual(called, ['/analytics/opt-in?lang=de']);
  assert.equal(status.hidden, false);
  assert.match(status.textContent, /Auswahl konnte nicht gespeichert/);
  assert.equal(button.disabled, false);
});
