import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { loadPosts } from '../src/lib/posts.mjs';
import { renderCandidateModel } from '../src/render.mjs';
import { clarifyMainlandInDisplayHtml } from '../src/lib/i18n.mjs';
import { escapeHtml } from '../src/lib/html.mjs';
const data = loadDataset();
const catalogCandidates = joinCatalogCandidates(data);
const ctx = { data, products: joinProducts(data), catalogCandidates, posts: loadPosts(), base: '', siteUrl: 'https://chinesebikes.xyz', repositoryUrl: 'https://github.com/p0s/china-bike-research' };
for (const slug of ['camp-ace-gen3-105', 'lightcarbon-lcr020-d', 'spect-mira', 'laget-aero-one']) {
  for (const locale of ['en', 'zh-Hans', 'de']) test(`${slug} ${locale}: approved model brief and localized guide`, () => {
    const entry = catalogCandidates.find(x => x.candidate.id === slug);
    const copy = entry.candidate.page_copy[locale];
    const html = renderCandidateModel({ ...ctx, locale }, entry);
    assert.ok(html.includes(escapeHtml(copy.title)));
    assert.ok(html.includes(clarifyMainlandInDisplayHtml(escapeHtml(copy.opening))));
    assert.ok(html.includes(clarifyMainlandInDisplayHtml(escapeHtml(copy.buyer_checks))));
    assert.ok(html.includes(`href="${copy.guide_path}"`));
    assert.ok(html.includes('id="source-records"'));
    assert.ok(html.includes(`https://chinesebikes.xyz/${locale === 'en' ? '' : locale === 'de' ? 'de/' : 'zh/'}models/${slug}/`));
  });
}
test('other candidates retain existing rendering without buyer-copy section', () => {
  const entry = catalogCandidates.find(x => !x.candidate.page_copy);
  assert.ok(!renderCandidateModel(ctx, entry).includes('model-buyer-checks-title'));
});
