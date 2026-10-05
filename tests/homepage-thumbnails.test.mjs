import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { escapeAttr, escapeHtml } from '../src/lib/html.mjs';
import { renderHome } from '../src/render.mjs';

const data = loadDataset();
const products = joinProducts(data);
const catalogCandidates = joinCatalogCandidates(data);
const context = { data, products, catalogCandidates, posts: [], base: '/preview', siteUrl: 'https://example.invalid', repositoryUrl: 'https://github.com/p0s/china-bike-research' };
const groups = [
  ['affordable-carbon-aero', ['candidate-cycletrack-phantom-rx24', 'twitter-cyclone-gen3-et', 'candidate-camp-ace-qed']],
  ['electronic-gravel', ['twitter-v3-wheeltop-eds', 'pardus-super-sport-gen2-egr', 'incolor-voyager-frameset']],
  ['wide-tire-aero', ['incolor-speedster-sr-frameset', 'candidate-lightcarbon-lcr018-d', 'candidate-tavelo-arden']]
];
const entries = new Map([...products.map(p => [p.variant.id, p]), ...catalogCandidates.map(e => [e.id, e])]);
const picks = ctx => renderHome(ctx).match(/<section class="curated-picks page"[\s\S]*?<\/section>/)[0];

test('homepage shortlists reuse exact reviewed card assets, order, sources and full image notes', () => {
  const html = picks(context);
  assert.equal((html.match(/<img /g) ?? []).length, 9);
  for (const [group, ids] of groups) {
    const article = html.match(new RegExp(`<article class="curated-group" data-curated-group="${group}">([\\s\\S]*?)<\\/article>`))[1];
    const choices = [...article.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1]);
    assert.equal(choices.length, ids.length);
    ids.forEach((id, index) => {
      const entry = entries.get(id), image = entry.image, choice = choices[index];
      const modelId = entry.variant?.id ?? entry.candidate.id;
      const card = image.hosting.variants.find(v => v.purpose === 'card');
      assert.ok(choice.includes(`href="/preview/models/${modelId}/"`), id);
      assert.ok(choice.includes(`src="/preview${card.url}"`), id);
      assert.ok(!choice.includes(image.hosting.local_path), id);
      assert.ok(choice.includes(`alt="${escapeAttr(image.alt)}"`), id);
      assert.ok(choice.includes(`width="${card.width}" height="${card.height}" loading="lazy" decoding="async"`), id);
      assert.ok(choice.includes(escapeHtml(image.display_note)), id);
      assert.ok(choice.includes('<details class="curated-image-note"><summary>Accuracy</summary>'), id);
      assert.ok(choice.includes(escapeHtml(image.credit)), id);
      assert.ok(choice.includes(`href="${escapeAttr(image.source_media_page_url ?? entry.imageSource.url)}" rel="noreferrer"`), id);
    });
    assert.ok(article.includes(`compare=${ids.join('%2C')}#compare`));
  }
});

test('unavailable, hidden and remote shortlist images omit only the image and preserve model facts', () => {
  const originalFacts = picks(context).match(/<a href="\/preview\/models\/lightcarbon-lcr018-d\/">LightCarbon LCR018-D<\/a><span>([^<]+)<\/span>/)[1];
  for (const image of [undefined, { ...entries.get('candidate-lightcarbon-lcr018-d').image, buyer_visibility: 'omit' }, { ...entries.get('candidate-lightcarbon-lcr018-d').image, hosting: { mode: 'remote', remote_url: 'https://example.invalid/unverified.webp' } }]) {
    const html = picks({ ...context, catalogCandidates: catalogCandidates.map(e => e.id === 'candidate-lightcarbon-lcr018-d' ? { ...e, image } : e) });
    const choice = html.match(/<li><div class="curated-copy"><a href="\/preview\/models\/lightcarbon-lcr018-d\/">([\s\S]*?)<\/li>/)?.[1];
    assert.ok(choice?.includes('LightCarbon LCR018-D'));
    assert.ok(choice?.includes(originalFacts));
    assert.equal((html.match(/<img /g) ?? []).length, 8);
    assert.ok(!html.includes('unverified.webp'));
    assert.ok(html.includes('compare=incolor-speedster-sr-frameset%2Ccandidate-lightcarbon-lcr018-d%2Ccandidate-tavelo-arden#compare'));
  }
});

test('shortlist card assets and model links retain locale and deployment-base routing', () => {
  for (const [locale, prefix] of [['en', ''], ['zh-Hans', '/zh'], ['de', '/de']]) {
    const html = picks({ ...context, locale });
    assert.equal((html.match(/<img /g) ?? []).length, 9);
    assert.ok(html.includes(`href="/preview${prefix}/models/lightcarbon-lcr018-d/"`));
    assert.ok(html.includes(`src="/preview${entries.get('candidate-lightcarbon-lcr018-d').image.hosting.variants.find(v => v.purpose === 'card').url}"`));
  }
});
