import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, validateDataset } from '../src/lib/data.mjs';
import { renderCarbonWheels, renderBikeBuilder, renderHome } from '../src/render.mjs';

const data = loadDataset();
const products = joinProducts(data);
const ctx = {
  data,
  products,
  posts: [],
  base: '/china-bike-research',
  repositoryUrl: 'https://github.com/example/china-bike-research',
  siteUrl: 'https://example.github.io',
  siteLastmod: '2026-10-20',
  now: new Date('2026-10-20T00:00:00Z')
};
const withWheelset = (id, change) => {
  const copy = structuredClone(data);
  change(copy.wheelsets.find((wheelset) => wheelset.id === id));
  return validateDataset(copy);
};

test('wheelset records validate safety and fit fields', () => {
  assert.ok(data.wheelsets.length >= 6);
  assert.ok(withWheelset('elitewheels-drive-g36', (wheelset) => { wheelset.rim.bead = 'hookless'; })
    .some((error) => /hookless rim needs a published max_pressure\.psi/.test(error)));
  assert.ok(withWheelset('elitewheels-drive-g36', (wheelset) => { wheelset.compatibility.freehubs = ['hg-road', 'xd-mtb']; })
    .some((error) => /compatibility\.freehubs must use known freehub ids/.test(error)));
  assert.ok(withWheelset('elitewheels-drive-g36', (wheelset) => { wheelset.load_limit.scope = 'rider-and-bike'; })
    .some((error) => /invalid load_limit\.scope/.test(error)));
  assert.ok(withWheelset('elitewheels-drive-g36', (wheelset) => { wheelset.id = 'elitewheels-marvel-g35-wheelset'; })
    .some((error) => /id collides with a build part/.test(error)));
});

test('carbon wheels reference renders one table with row details and no mainland price claim', () => {
  const html = renderCarbonWheels(ctx);
  assert.equal((html.match(/data-wheelset-entry/g) ?? []).length, data.wheelsets.length);
  assert.match(html, /<thead><tr><th>Wheelset<\/th><th>Use<\/th><th>Rim<\/th><th>Weight<\/th><th>Fit<\/th><th>Price<\/th><\/tr><\/thead>/);
  assert.match(html, /<strong>US\$839<\/strong><span>Official direct store · 2026-10-20<\/span>/);
  assert.match(html, /Bead not stated · tubeless ready/);
  assert.match(html, /120 kg system limit/);
  assert.match(html, /Rotor mount not stated · 12x100 \/ 12x142 mm/);
  assert.doesNotMatch(html, /¥\d/);
  assert.match(html, /href="\/china-bike-research\/carbon-wheels\/" data-nav-wheels aria-current="page">Carbon wheels<\/a>/);
});

test('wheelset videos are exact, capped and embedded only inside their own row details', () => {
  const wheelsetVideos = data.videos.filter((video) => video.target.wheelset_id);
  assert.ok(wheelsetVideos.length >= 1);
  assert.ok(wheelsetVideos.every((video) => video.match === 'exact-wheelset' && video.provider === 'youtube'));
  const retarget = (change) => {
    const copy = structuredClone(data);
    change(copy.videos.find((video) => video.id === 'lovemtb-elitewheels-drive-g36-tech-check'));
    return validateDataset(copy);
  };
  assert.ok(retarget((video) => { video.match = 'exact-platform'; }).some((error) => /wheelset target must use exact-wheelset match/.test(error)));
  assert.ok(retarget((video) => { video.target.wheelset_id = 'elitewheels-drive-50d-ii'; }).some((error) => /wheelset elitewheels-drive-50d-ii: more than two curated videos/.test(error)));
  assert.ok(retarget((video) => { video.target = { wheelset_id: 'missing-wheelset' }; }).some((error) => /missing wheelset missing-wheelset/.test(error)));

  const html = renderCarbonWheels(ctx);
  for (const wheelset of data.wheelsets) {
    const entry = html.match(new RegExp(`<tbody class="groupset-entry" id="${wheelset.id}"[\\s\\S]*?</tbody>`))[0];
    for (const video of wheelsetVideos) {
      assert.equal(entry.includes(`youtube-nocookie.com/embed/${video.youtube_video_id}`), video.target.wheelset_id === wheelset.id, `${video.id} in ${wheelset.id}`);
    }
  }
  assert.doesNotMatch(html, /youtube\.com\/embed|autoplay=1/);
  assert.match(html, /<details class="groupset-row-details">[\s\S]*?<section class="wheelset-videos"><h3>Videos<\/h3>[\s\S]*?loading="lazy"/);
});

test('carbon wheels reference is localized and linked from every page', () => {
  assert.match(renderCarbonWheels({ ...ctx, locale: 'zh-Hans' }), /<h1>中国品牌碳纤维轮组<\/h1>[\s\S]*系统限重 120 kg/);
  assert.match(renderCarbonWheels({ ...ctx, locale: 'de' }), /<h1>Chinesische Carbon-Laufradsätze<\/h1>[\s\S]*120 kg Systemgewicht/);
  assert.match(renderHome(ctx), /<footer[\s\S]*?href="\/china-bike-research\/carbon-wheels\/">Carbon wheels<\/a>/);
});

test('build planner offers each wheelset with weight and fit but no invented China price', () => {
  const payload = JSON.parse(renderBikeBuilder(ctx).match(/id="build-configurator-data">([\s\S]*?)<\/script>/)[1]);
  for (const wheelset of data.wheelsets) {
    const part = payload.parts.find((item) => item.id === wheelset.id);
    assert.ok(part, wheelset.id);
    assert.equal(part.slot, 'wheelset');
    assert.equal(part.default, false);
    assert.equal(part.priceCny, null);
    assert.equal(part.weightG, wheelset.weight.grams);
    assert.deepEqual(part.compatibility.freehubs, wheelset.compatibility.freehubs);
    assert.match(part.note, /is not a mainland China price; enter a China quote\./);
    assert.equal(part.note.includes('Rotor mount is not stated'), wheelset.compatibility.rotor_mount === null);
  }
});
