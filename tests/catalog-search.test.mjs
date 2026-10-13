import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCatalogSearch, matchesCatalogSearch } from '../assets/catalog-search.js';
import { loadDataset, joinProducts } from '../src/lib/data.mjs';
import { renderHome } from '../src/render.mjs';

const matches = (text, query) => matchesCatalogSearch(normalizeCatalogSearch(text), query);

test('search accepts punctuated, spaced, full-width and plural X-LAB spellings', () => {
  for (const query of ['x-lab', 'xlab', 'xlabs', 'x lab', 'x labs', 'X–LAB', 'ＸＬＡＢＳ', 'x-labs rs9', 'RS9 xlab']) {
    assert.ok(matches('XDS / X-LAB 喜德盛 RS9', query), query);
    assert.equal(matches('SEKA EXAERO GR', query), false, query);
  }
});

test('search matches all terms in any order, without requiring an exact phrase', () => {
  assert.ok(matches('Twitter Gravel V3 WheelTop EDS 2×12', 'wheeltop twitter'));
  assert.ok(matches('Twitter Gravel V3 WheelTop EDS 2×12', 'v-3 2x12'));
  assert.ok(matches('LightCarbon LCG071S PRO', 'light carbon 071s'));
  assert.ok(matches('Séká EXAERO GR', 'seka'));
  assert.ok(matches('X-LAB 喜德盛 RS9', '喜德盛 rs9'));
  assert.equal(matches('Twitter Gravel V3 WheelTop EDS', 'twitter shimano'), false);
});

test('search does not stem model suffixes or invent model matches', () => {
  assert.equal(matches('LightCarbon LCG071 PRO', '071s'), false);
  assert.equal(matches('X-LAB AD9', 'rs9 xlab'), false);
  assert.equal(matches('X-LAB RS9', 'xlabs rs8'), false);
  assert.ok(matches('X-LAB RS9', ''));
});

test('all X-LAB query forms find the same real catalog entries in each language', () => {
  const data = loadDataset();
  const products = joinProducts(data);
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const html = renderHome({ data, products, locale });
    const rows = [...html.matchAll(/data-product-row[^>]*data-id="([^"]+)"[^>]*data-search="([^"]*)"/g)]
      .map(([, id, text]) => ({ id, index: normalizeCatalogSearch(text) }));
    const find = (query) => rows.filter((row) => matchesCatalogSearch(row.index, query)).map((row) => row.id);
    const expected = find('x-lab');
    assert.ok(expected.includes('candidate-xlab-rs9'), locale);
    assert.ok(expected.includes('candidate-xlab-ad9'), locale);
    for (const query of ['xlab', 'xlabs', 'x lab', 'x labs', 'ＸＬＡＢ']) assert.deepEqual(find(query), expected, `${locale}: ${query}`);
    assert.deepEqual(find('RS9 xlabs'), ['candidate-xlab-rs9']);
  }
});
