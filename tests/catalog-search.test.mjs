import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogSearchIndex, compileCatalogQuery, scoreCatalogSearch, matchesCatalogSearch } from '../assets/catalog-search.js';
import { loadDataset, joinProducts } from '../src/lib/data.mjs';
import { renderHome } from '../src/render.mjs';

const matches = (text, query) => matchesCatalogSearch(createCatalogSearchIndex(text), query);
const score = (text, query) => scoreCatalogSearch(createCatalogSearchIndex(text), compileCatalogQuery(query));

test('general fuzzy search handles missing, extra, replaced and transposed letters', () => {
  for (const [query, text] of [
    ['twittr', 'Twitter Gravel'], ['twittter', 'Twitter Gravel'], ['twittar', 'Twitter Gravel'],
    ['twtiter', 'Twitter Gravel'], ['shiamno', 'Shimano 105'], ['shmano', 'Shimano 105'],
    ['gravle', 'Gravel bike'], ['carbn', 'Carbon frame'], ['velobulid', 'Velo-Build'],
    ['lightcarbn', 'LightCarbon'], ['lightcrbn', 'LightCarbon'], ['winspcae', 'Winspace'],
    ['canyons', 'Canyon'], ['merdia', 'Merida'],
    ['shiamno', 'Shimano105 禧玛诺'], ['shiamno', '禧玛诺Shimano'],
  ]) {
    assert.ok(matches(text, query), `${query} → ${text}`);
    assert.ok(score(text, query) > 0, `${query} is labelled a close match`);
  }
});

test('direct matches rank before close matches, with fewer edits first', () => {
  assert.equal(score('Twitter Gravel', 'twitter'), 0);
  assert.equal(score('Twitter Gravel', 'twittr'), 1);
  assert.equal(score('LightCarbon', 'lightcrbn'), 2);
  assert.equal(score('X-LAB Shimano', 'xlabs'), 1, 'unrelated adjacent words cannot create a direct match');
  assert.equal(score('Light Carbon', 'lightcarbon'), 0, 'complete names can still be joined');
  assert.equal(score('Light Carbon', 'carbonlight'), Infinity, 'partial word joins are not search terms');
  const query = compileCatalogQuery('carbon');
  const ordered = ['Carbn frame', 'Carbon frame', 'Shimano'].map((name) => ({ name,
    score: scoreCatalogSearch(createCatalogSearchIndex(name), query) }))
    .filter((row) => Number.isFinite(row.score)).sort((a, b) => a.score - b.score).map((row) => row.name);
  assert.deepEqual(ordered, ['Carbon frame', 'Carbn frame']);
});

test('every search word is required and fuzziness is bounded', () => {
  assert.ok(matches('Twitter Gravel Shimano 105', 'shiamno twittr 105'));
  assert.equal(matches('Twitter Gravel Shimano 105', 'shiamno twittr 106'), false);
  assert.equal(matches('Twitter Gravel', 'twittr shimano'), false);
  assert.equal(matches('Shimano', 'shmno'), false, 'two edits in a short word are too broad');
  assert.equal(matches('CAMP road', 'lamp'), true);
  assert.equal(matches('CAMP road', 'cam'), true, 'direct partial searches remain useful');
  assert.equal(matches('CAMP road', 'cap'), false, 'short terms must not fuzzy-match');
  assert.equal(matches('SRAM GX Eagle', 'gry'), false);
  assert.equal(matches('喜德盛', '喜徳盛'), false);
  assert.equal(matches('Mechanical RX explicitly labelled', 'x lab'), false, 'short words cannot match arbitrary inner letters');
  assert.equal(matches('Carbon', 'z'.repeat(10000)), false, 'long input never enters edit distance');
});

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

test('a short word followed by a number searches as one model code', () => {
  assert.deepEqual(compileCatalogQuery('Super Sport Gen 2'), ['super', 'sport', 'gen2']);
  assert.deepEqual(compileCatalogQuery('RS 9 x-lab'), ['rs9', 'xlab']);
  assert.deepEqual(compileCatalogQuery('SUP G2'), ['sup', 'g2']);
  assert.deepEqual(compileCatalogQuery('105 Di2'), ['105', 'di2']);
  assert.ok(matches('Super Sport Gen2 eGR 1x12', 'super sport gen 2'));
  assert.ok(matches('PARDUS 瑞豹 Super Sport Gen 2', 'super sport gen2'));
  assert.equal(matches('Super Sport Gen2 eGR 1x12', 'super sport gen 1'), false, 'a lone digit cannot match 1x12');
  assert.equal(matches('X-LAB RS9 700x28C', 'xlab rs 8'), false, 'an adjacent model number cannot match a tire size');
});

test('verified alternate names find the one existing entry in every language', () => {
  const data = loadDataset();
  const products = joinProducts(data);
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const html = renderHome({ data, products, locale });
    const rows = [...html.matchAll(/data-product-row[^>]*data-id="([^"]+)"[^>]*data-search="([^"]*)"/g)]
      .map(([, id, text]) => ({ id, index: createCatalogSearchIndex(text) }));
    const find = (query) => rows.filter((row) => matchesCatalogSearch(row.index, query)).map((row) => row.id);
    for (const query of ['SUPG2', 'supg2 sport', 'SUP G2', 'Super Sport Gen2', 'Super Sport Gen 2', 'pardus supg2', '瑞豹 SUPG2']) {
      assert.deepEqual(find(query), ['pardus-super-sport-gen2-egr'], `${locale}: ${query}`);
    }
    for (const query of ['SUPG1', 'SUPG3', 'SUP G3', 'Super Sport Gen 1', 'Super Sport Gen3']) {
      assert.equal(find(query).includes('pardus-super-sport-gen2-egr'), false, `${locale}: ${query}`);
    }
    for (const [query, id] of [['KUNG MACH AERO', 'kung-mach-frameset'], ['攻队马赫', 'kung-mach-frameset'], ['龙卷风三代', 'twitter-cyclone-electronic'],
      ['Cyclone 3rd ET', 'twitter-cyclone-electronic'], ['Cyclone 3rd ET', 'twitter-cyclone-gen3-et'], ['X-LAB AD7', 'candidate-xds-ad7'],
      ['xlab ad 7', 'candidate-xds-ad7'], ['Light Shark QS91', 'candidate-qingsha-carbon-folding']]) {
      assert.ok(find(query).includes(id), `${locale}: ${query} → ${id}`);
    }
    assert.equal(find('xlab ad 8').includes('candidate-xds-ad7'), false, locale);
    assert.equal(find('xlab ad 7').includes('candidate-xlab-ad8'), false, locale);
  }
});

test('brand aliases reach the search key of every row for that brand', () => {
  const data = loadDataset();
  const brands = data.brands.map((brand) => brand.id === 'pardus' ? { ...brand, aliases: ['Ruibao Cycle'] } : brand);
  const aliased = { ...data, brands };
  const html = renderHome({ data: aliased, products: joinProducts(aliased), locale: 'en' });
  const ids = [...html.matchAll(/data-product-row[^>]*data-id="([^"]+)"[^>]*data-brand="pardus"[^>]*data-search="([^"]*)"/g)]
    .filter(([, , text]) => matchesCatalogSearch(createCatalogSearchIndex(text), 'ruibao')).map(([, id]) => id);
  assert.ok(ids.includes('pardus-super-sport-gen2-egr'));
  assert.ok(ids.includes('candidate-pardus-spark'));
});

test('general fuzzy queries and punctuation work on real catalog entries in every language', () => {
  const data = loadDataset();
  const products = joinProducts(data);
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const html = renderHome({ data, products, locale });
    const rows = [...html.matchAll(/data-product-row[^>]*data-id="([^"]+)"[^>]*data-search="([^"]*)"/g)]
      .map(([, id, text]) => ({ id, index: createCatalogSearchIndex(text) }));
    const find = (query) => rows.filter((row) => matchesCatalogSearch(row.index, query)).map((row) => row.id);
    const expected = find('x-lab');
    assert.ok(expected.includes('candidate-xlab-rs9'), locale);
    assert.ok(expected.includes('candidate-xlab-ad9'), locale);
    for (const query of ['xlab', 'xlabs', 'x lab', 'x labs', 'ＸＬＡＢ']) assert.deepEqual(find(query), expected, `${locale}: ${query}`);
    assert.deepEqual(find('RS9 xlabs'), ['candidate-xlab-rs9']);
    for (const [query, exact] of [['twittr', 'twitter'], ['shiamno', 'shimano'], ['winspcae', 'winspace'], ['velobulid', 'velobuild'], ['carbn', 'carbon']]) {
      const expectedIds = rows.filter((row) => row.index.tokens.includes(exact)).map((row) => row.id);
      assert.ok(expectedIds.length, `${locale}: ${exact} has recorded examples`);
      const actual = new Set(find(query));
      for (const id of expectedIds) assert.ok(actual.has(id), `${locale}: ${query} includes ${id}`);
    }
  }
});
