import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { escapeAttr } from '../src/lib/html.mjs';
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
const row = (html, id) => html.match(new RegExp(`<div class="catalog-row[^"]*"[^>]*data-id="${id}"[\\s\\S]*?(?=<div class="catalog-row|<div class="empty-state")`))?.[0];

// Criteria-led starting points open their ordered comparison; they are not a ranking.
test('starting points open their ordered three-bike comparison with visible criteria in every locale', () => {
  for (const [locale, prefix] of [['en', ''], ['zh-Hans', '/zh'], ['de', '/de']]) {
    const html = renderHome({ ...context, locale });
    const rail = html.match(/<section class="rail-section rail-starting-points"[\s\S]*?<\/section>/)[0];
    for (const [group, ids] of groups) {
      const link = rail.match(new RegExp(`<a class="starting-point" href="([^"]+)" data-curated-group="${group}" data-criteria="([^"]+)"`));
      assert.ok(link, `${group} ${locale}`);
      assert.ok(link[1].startsWith(`/preview${prefix}/?compare=${ids.join('%2C')}&amp;start=${group}#compare`), `${group} ${locale}`);
      assert.ok(link[2].length > 40, group);
    }
    assert.doesNotMatch(rail, /<img /);
  }
});

test('catalog rows reuse exact reviewed card assets with alt text, dimensions and lazy loading', () => {
  const html = renderHome(context);
  for (const [, ids] of groups) for (const id of ids) {
    const entry = entries.get(id), image = entry.image, card = image.hosting.variants.find(v => v.purpose === 'card');
    const markup = row(html, id);
    assert.ok(markup, id);
    assert.ok(markup.includes(`src="/preview${card.url}"`), id);
    assert.ok(!markup.includes(image.hosting.local_path), id);
    assert.ok(markup.includes(`alt="${escapeAttr(image.alt)}"`), id);
    assert.ok(markup.includes('loading="lazy"'), id);
  }
});

test('unavailable and hidden catalog images omit only the image and keep the row facts', () => {
  const id = 'candidate-lightcarbon-lcr018-d';
  const original = row(renderHome(context), id);
  for (const image of [undefined, { ...entries.get(id).image, buyer_visibility: 'omit' }]) {
    const html = renderHome({ ...context, catalogCandidates: catalogCandidates.map(e => e.id === id ? { ...e, image } : e) });
    const markup = row(html, id);
    assert.ok(markup.includes('LightCarbon LCR018-D'));
    assert.ok(!markup.includes('<img '));
    assert.ok(!markup.includes('placeholders'));
    assert.equal(markup.match(/<div class="catalog-cell price-cell"[\s\S]*?<\/div>/)[0], original.match(/<div class="catalog-cell price-cell"[\s\S]*?<\/div>/)[0]);
  }
});
