import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, joinCatalogCandidates, validateNameAliases } from '../src/lib/data.mjs';
import { renderHome, renderModel, renderCandidateModel } from '../src/render.mjs';

const data = loadDataset(), products = joinProducts(data), candidates = joinCatalogCandidates(data);
const ctx = { data, products, catalogCandidates: candidates, posts: [], base: '', siteUrl: 'https://example.invalid', repositoryUrl: 'https://github.com/p0s/china-bike-research', now: new Date('2026-10-27') };
const row = (html, id) => html.match(new RegExp(`<div class="catalog-row[^"]*"[^>]*data-id="${id}"[\\s\\S]*?(?=<div class="catalog-row|<div class="empty-state")`))?.[0];

test('verified alternate names stay visible beside the catalog name, not only in search', () => {
  for (const [locale, label] of [['en', 'Also known as'], ['zh-Hans', '又名'], ['de', 'Auch bekannt als'], ['es', 'También conocida como'], ['ru', 'Также известен как']]) {
    const html = renderHome({ ...ctx, locale });
    assert.match(row(html, 'pardus-super-sport-gen2-egr'), new RegExp(`<span class="product-fit product-aliases"><span>${label}</span> <b>SUPG2 SPORT</b></span>`), locale);
    assert.match(row(html, 'candidate-xds-ad7'), /<b>X-LAB AD7<\/b>/, locale);
    assert.doesNotMatch(row(html, 'candidate-xlab-rs9'), /product-aliases/, locale);
  }
});

test('the SUPG2 eGR page names the family and keeps the 105 build separate in every language', () => {
  const product = products.find((item) => item.variant.id === 'pardus-super-sport-gen2-egr');
  for (const [locale, label, note] of [
    ['en', 'Also known as', 'This catalog entry is the eGR build; parts from the official 105 page are not applied to it.'],
    ['zh-Hans', '又名', '本目录条目为 eGR 配置'],
    ['de', 'Auch bekannt als', 'Dieser Katalogeintrag ist die eGR-Ausstattung']
  ]) {
    const page = renderModel({ ...ctx, locale }, product);
    assert.match(page, /<h1>Super Sport Gen2 eGR<\/h1>/, locale);
    const line = page.match(/<p class="model-subline model-aliases">[\s\S]*?<\/p>/)?.[0] ?? '';
    assert.ok(line.includes(`<span>${label}</span> <b>SUPG2 SPORT</b>`), locale);
    assert.ok((page.match(/<p class="model-subline alias-note">([\s\S]*?)<\/p>/)?.[1] ?? '').includes(note), locale);
  }
  const ad7 = renderCandidateModel(ctx, candidates.find((entry) => entry.candidate.id === 'xds-ad7'));
  assert.match(ad7, /<h1>XDS 喜德盛 AD7<\/h1><p class="model-subline model-aliases"><span>Also known as<\/span> <b>X-LAB AD7<\/b><\/p>/);
});

test('aliases must be attested by the record evidence and cannot name another catalog record', () => {
  assert.deepEqual(validateNameAliases(data), []);
  const withPlatform = (changes) => ({ ...data, platforms: data.platforms.map((platform) => platform.id === 'pardus-super-sport-gen2' ? { ...platform, ...changes } : platform) });
  assert.ok(validateNameAliases(withPlatform({ aliases: ['SUPG3 SPORT'] })).some((error) => /SUPG3 SPORT is not attested/.test(error)));
  assert.ok(validateNameAliases(withPlatform({ aliases: ['MACH'] })).some((error) => /MACH also names platform:kung-mach/.test(error)));
  assert.ok(validateNameAliases(withPlatform({ aliases: ['Super Sport Gen2'] })).some((error) => /repeats its name/.test(error)));
  assert.ok(validateNameAliases(withPlatform({ aliases: undefined, alias_note: 'Orphan note' })).some((error) => /alias_note needs aliases/.test(error)));
});
