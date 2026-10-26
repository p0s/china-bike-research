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
  assert.match(html, /href="\/china-bike-research\/carbon-wheels\/" data-nav-wheels aria-current="page"><span class="nav-long">Carbon wheels<\/span>/);
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
      assert.equal(entry.includes(`data-article-video="${video.youtube_video_id}"`), video.target.wheelset_id === wheelset.id, `${video.id} in ${wheelset.id}`);
    }
  }
  assert.doesNotMatch(html, /youtube\.com\/embed|autoplay=1/);
  // Closed rows must not contact YouTube: players are created only after activation.
  assert.doesNotMatch(html, /<iframe/);
  assert.match(html, /<details class="groupset-row-details">[\s\S]*?<section class="wheelset-videos"><h3>Videos<\/h3>[\s\S]*?<button class="video-load-button"/);
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

test('the wheel table stays the default while use, sort, gallery and photo size re-arrange the same rows', () => {
  const html = renderCarbonWheels(ctx);
  assert.match(html, /<div class="wheels-toolbar" data-wheels-toolbar hidden>/);
  assert.match(html, /data-wheels-view-root data-view="table"/);
  assert.match(html, /data-wheels-view="table" aria-pressed="true"/);
  assert.match(html, /<option value="price">Price: low to high \(US\$ equivalent\)<\/option>/);
  assert.match(html, /<script type="module" src="\/china-bike-research\/assets\/wheels\.js"><\/script>/);
  // Every row carries its own sort keys; displayed prices keep their original currency.
  for (const wheelset of data.wheelsets) {
    const entry = html.match(new RegExp(`<tbody class="groupset-entry" id="${wheelset.id}"[^>]*>`))?.[0] ?? '';
    assert.match(entry, new RegExp(`data-use="${wheelset.use}" data-weight="${wheelset.weight.grams}"`), wheelset.id);
    assert.match(entry, /data-price-usd="\d+"/, wheelset.id);
  }
  // A wheelset image must be a reviewed exact-model local derivative.
  const first = data.wheelsets[0].id;
  assert.ok(withWheelset(first, (wheelset) => { wheelset.image = { source_id: wheelset.source_ids[0], subject_accuracy: 'exact-family', credit: 'Maker', alt: 'A wheelset photo for testing', reviewed_at: '2026-10-26' }; })
    .some((error) => error.includes('must show the exact model')));
  // Independent review notes render with their source and must cite a listed source.
  const reviewed = data.wheelsets.find((wheelset) => wheelset.independent_evidence?.length);
  assert.ok(reviewed, 'at least one wheelset carries an independent review note');
  const reviewedEntry = html.match(new RegExp(`<tbody class="groupset-entry" id="${reviewed.id}"[\\s\\S]*?</tbody>`))?.[0] ?? '';
  assert.match(reviewedEntry, /<h3>Independent reviews<\/h3>/);
  assert.ok(withWheelset(reviewed.id, (wheelset) => { wheelset.independent_evidence = [{ source_id: 'not-a-listed-source', summary: 'A review summary that is long enough.' }]; })
    .some((error) => error.includes('independent evidence must cite a listed source')));
  // Every image-bearing wheelset shows a linked local photo with alt text.
  for (const wheelset of data.wheelsets.filter((item) => item.image)) {
    assert.match(html, new RegExp(`<img src="/china-bike-research${wheelset.image.local_path}"[^>]*alt="[^"]{10,}"`), wheelset.id);
  }
});
