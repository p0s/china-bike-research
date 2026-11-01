import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, validateDataset } from '../src/lib/data.mjs';
import { renderHome, renderTires } from '../src/render.mjs';
import { INTERFACE_ROUTES } from '../src/lib/i18n.mjs';
import { translate } from '../assets/i18n.js';
import { BUDGET_CNY_PER_TIRE, budgetPrice, budgetShortlist, comparableRollingTest, issueSources, measuredWetGrip, referenceSize, sizeWidths, tireGroups, tireShortlists, wetEvidenceStatus } from '../src/lib/tires.mjs';

const data = loadDataset();
const products = joinProducts(data);
const ctx = {
  data,
  products,
  posts: [],
  base: '/china-bike-research',
  repositoryUrl: 'https://github.com/example/china-bike-research',
  siteUrl: 'https://example.github.io',
  siteLastmod: '2026-11-01',
  now: new Date('2026-11-01T00:00:00Z')
};
const firstId = (predicate) => data.tires.find(predicate).id;
const tubeless = firstId((tire) => tire.hookless === 'approved');
const withTire = (id, change) => {
  const copy = structuredClone(data);
  change(copy.tires.find((tire) => tire.id === id), copy);
  return validateDataset(copy);
};
const rejects = (id, change, message) => assert.ok(withTire(id, change).some((error) => error.includes(message)), message);

test('tire records validate safety, evidence and ledger rules', () => {
  assert.ok(data.tires.length >= 10);
  assert.deepEqual(validateDataset(data).filter((error) => error.startsWith('tire')), []);
  rejects(tubeless, (tire) => { delete tire.hookless_note; }, "a hookless status needs the maker's note");
  rejects(tubeless, (tire) => { tire.construction = 'tube-type'; }, 'only tubeless-ready tires can be hookless approved');
  rejects(tubeless, (tire) => { tire.tests[0].rr_psi = 100; }, 'rolling resistance needs its band pressure');
  rejects(tubeless, (tire) => { tire.tests[0].source_id = 'not-a-listed-source'; }, 'test must cite a listed source');
  rejects(tubeless, (tire) => { tire.origin = { group: 'mainland-china', country: 'China', basis: 'x' }; }, 'mainland-China origin must name Mainland China');
  rejects(tubeless, (tire) => { tire.price_observations = [{ ...tire.price_observations[0], package: 'box' }]; }, 'invalid price region or package');
  rejects(tubeless, (tire) => { tire.status = 'discontinued'; }, 'only current tires are compared');
  rejects(tubeless, (tire, copy) => { copy.tireCoverage[0].candidates = copy.tireCoverage[0].candidates.filter((item) => item.record_id !== tire.id); }, `tire ${tubeless} must appear once as an included candidate`);
  rejects(tubeless, (tire, copy) => { copy.tireCoverage[0].candidates.push({ brand_id: 'continental', name: 'Phantom', disposition: 'included', reason: 'Test.' }); }, 'included candidate Phantom needs a tire record');
  rejects(tubeless, (tire, copy) => { copy.tireCoverage[0].candidates[0].reason = ''; }, 'needs a disposition and reason');
});

test('width groups, reference sizes and comparable tests follow their stated rules', () => {
  const fits = (tire, low, high) => tire.sizes.some((size) => sizeWidths(size).every((width) => width >= low && width <= high));
  for (const tire of data.tires) {
    assert.equal(tireGroups(tire).road, fits(tire, 25, 35), tire.id);
    if (tireGroups(tire).wet) assert.ok(fits(tire, 20, 40) && (measuredWetGrip(tire) !== null || tire.wet_notes.length), tire.id);
    const reference = referenceSize(tire);
    assert.ok(tire.sizes.includes(reference), tire.id);
    if (tire.sizes.some((size) => size.width_mm === 28)) assert.equal(reference.width_mm, 28, tire.id);
    const comparable = comparableRollingTest(tire);
    if (comparable) assert.ok(comparable.measured_width_mm >= 28 && comparable.measured_width_mm <= 30 && comparable.rr_psi === 72, tire.id);
  }
  // A tire without any 20-40 mm width or any wet evidence is not in the wet group.
  const sample = structuredClone(data.tires.find((tire) => tire.tests.length));
  sample.tests = sample.tests.map((item) => ({ ...item, wet_grip: null }));
  sample.wet_notes = [];
  assert.equal(tireGroups(sample).wet, false);
});

test('dual-width labels stay literal and count toward a group only when both numbers fit', () => {
  const sample = structuredClone(data.tires[0]);
  sample.sizes = [{ width_mm: null, width_label_mm: [23, 25], weight_g: 260 }];
  assert.equal(tireGroups(sample).road, false);
  sample.sizes.push({ width_mm: null, width_label_mm: [25, 28], weight_g: 300 });
  assert.equal(tireGroups(sample).road, true);
  assert.deepEqual(referenceSize(sample).width_label_mm, [25, 28]);
  const dual = firstId((tire) => tire.sizes.some((size) => size.width_label_mm));
  const labelled = (tire) => tire.sizes.find((size) => size.width_label_mm);
  rejects(dual, (tire) => { labelled(tire).width_label_mm = [28, 25]; }, 'a dual-width label needs two ascending widths');
  rejects(dual, (tire) => { labelled(tire).width_mm = 28; }, 'a dual-width label must not claim one width or ETRTO');
  rejects(dual, (tire) => { labelled(tire).etrto = '28-622'; }, 'a dual-width label must not claim one width or ETRTO');
  const html = renderTires(ctx);
  const entry = html.match(new RegExp(`<tbody class="groupset-entry tire-entry" id="${dual}"[\\s\\S]*?</details></td></tr></tbody>`))?.[0] ?? '';
  const label = labelled(data.tires.find((tire) => tire.id === dual)).width_label_mm.join('/');
  assert.ok(entry.includes(`<th scope="row">${label} mm</th><td>—</td>`), 'the size table shows the literal label without an ETRTO');
});

test('tire detail headings are translated in every interface language', () => {
  for (const [locale, heading] of [['zh-Hans', '尺码'], ['de', 'Größen'], ['es', 'Medidas'], ['ru', 'Размеры']]) {
    assert.equal(translate('Sizes', locale), heading, locale);
  }
});

test('starting points are criteria-led lists, not a universal ranking', () => {
  const lists = tireShortlists(data.tires);
  const rr = lists.fastest.map((item) => item.test.rr_w);
  assert.deepEqual(rr, [...rr].sort((a, b) => a - b));
  assert.ok(lists.balanced.every((item) => item.test.rr_w <= 12 && item.test.puncture_tread >= 45));
  assert.ok(lists.wetGrip.every((item) => item.grip >= 80));
  assert.ok(lists.allSeason.every((item) => item.tire.use === 'all-season'));
  assert.ok(lists.chinese.every((item) => item.tire.origin.group !== 'international'));
  const html = renderTires(ctx);
  assert.match(html, /<h2 id="tire-starting-points">Starting points<\/h2>/);
  assert.match(html, /Static wet grip of at least 80/);
  assert.match(html, /It is not a braking-distance or cornering certification, and rim-brake pads, rims and rotors are separate\./);
  assert.match(html, /missing evidence is not a negative result\. No list promises that a tire fits your frame or rim\./);
  assert.doesNotMatch(html, /score out of|overall score|best tire overall/i);
});

test('the budget all-season starting point counts only verified one-tire prices and states its verdict', () => {
  const { qualifying, unverified } = budgetShortlist(data.tires);
  assert.ok(qualifying.length + unverified.length > 0);
  for (const item of [...qualifying, ...unverified]) {
    assert.notEqual(item.tire.origin.group, 'international', item.tire.id);
    assert.ok(tireGroups(item.tire).road, item.tire.id);
    assert.equal(item.price.currency, 'CNY', item.tire.id);
    assert.ok(item.price.amount <= BUDGET_CNY_PER_TIRE, item.tire.id);
  }
  assert.ok(qualifying.every((item) => item.price.package === 'single'));
  // A listing that does not say one tire or a pair is shown apart and never qualifies.
  assert.ok(unverified.every((item) => item.price.package === 'unstated' && !item.allSeason && !budgetPrice(item.tire)));
  for (const item of qualifying.filter((entry) => entry.allSeason)) {
    assert.ok((item.wet === 'measured' && item.grip >= 80) || item.wet === 'consistent', item.tire.id);
    assert.ok(item.issues.casing < 2, item.tire.id);
  }
  const html = renderTires(ctx);
  assert.match(html, /<div class="tire-budget" id="budget"><h3>Budget all-season: up to CNY 250 per tire<\/h3>/);
  assert.match(html, qualifying.some((item) => item.allSeason) ? /meet both evidence thresholds/ : /None of these tires has enough wet-road evidence to be called a proven all-season choice yet\./);
  assert.match(html, /Tread pattern, four-season marketing and seller copy are not wet evidence\./);
  for (const item of qualifying) assert.match(html, new RegExp(`<li><a href="#${item.tire.id}">[^<]+</a> (?:<strong>Supported all-season choice</strong> )?<span>¥[\\d,.]+ per tire</span>`), item.tire.id);
  for (const item of unverified) assert.match(html, new RegExp(`<li><a href="#${item.tire.id}">[^<]+</a> <span>¥[\\d,.]+ listing, one tire or pair not stated</span>`), item.tire.id);
  for (const locale of ['zh-Hans', 'de', 'es', 'ru']) {
    for (const text of ['Budget all-season: up to CNY 250 per tire', 'Owner wet reports conflict', 'No owner wet report found', '¥165 per tire', '¥198 listing, one tire or pair not stated', '2 reports of bulging or casing failure', '1 report of bead or rim-fit problems', 'No durability or fit problem report found']) {
      assert.notEqual(translate(text, locale), text, `${locale}: ${text}`);
    }
  }
});

test('owner wet reports are classified by stance, never by tread or marketing', () => {
  const tire = (wetNotes, tests = []) => ({ wet_notes: wetNotes, tests });
  const owner = (stance) => ({ kind: 'community report', stance, summary: 'x', source_id: 's' });
  assert.equal(wetEvidenceStatus(tire([])), 'none');
  assert.equal(wetEvidenceStatus(tire([{ kind: 'seller claim', summary: 'drains water', source_id: 's' }])), 'none');
  assert.equal(wetEvidenceStatus(tire([owner('positive')])), 'single');
  assert.equal(wetEvidenceStatus(tire([owner('positive'), owner('positive')])), 'consistent');
  assert.equal(wetEvidenceStatus(tire([owner('positive'), owner('negative')])), 'conflicting');
  assert.equal(wetEvidenceStatus(tire([owner('mixed')])), 'conflicting');
  assert.equal(wetEvidenceStatus(tire([owner('negative')])), 'unfavourable');
  assert.equal(wetEvidenceStatus(tire([owner('negative')], [{ wet_grip: 77 }])), 'measured');
  // Durability issues count distinct sources, not repeated reports from one post.
  const reports = { community: [{ source_id: 'a', issues: ['casing'] }, { source_id: 'a', issues: ['casing'] }, { source_id: 'b', issues: ['casing', 'wear'] }] };
  assert.equal(issueSources(reports, 'casing'), 2);
  assert.equal(issueSources(reports, 'punctures'), 0);
  const ownerWet = firstId((item) => item.wet_notes.some((note) => note.kind === 'community report'));
  rejects(ownerWet, (item) => { delete item.wet_notes.find((note) => note.kind === 'community report').stance; }, 'only owner wet reports carry a stance, and they need one');
  rejects(tubeless, (item) => { item.wet_notes = [{ kind: 'official', summary: 'x', source_id: item.source_ids[0], stance: 'positive' }]; }, 'only owner wet reports carry a stance, and they need one');
  const withIssues = firstId((item) => item.community.some((report) => report.issues));
  rejects(withIssues, (item) => { item.community.find((report) => report.issues).issues = ['bulges']; }, 'owner report issues must be distinct known issues');
});

test('the tire table renders one row per record with origin, evidence and price basis', () => {
  const html = renderTires(ctx);
  assert.equal((html.match(/data-tire-entry/g) ?? []).length, data.tires.length);
  assert.match(html, /<thead><tr><th>Tire<\/th><th>Use<\/th><th>Widths<\/th><th>Weight<\/th><th>Lab test<\/th><th>Price<\/th><\/tr><\/thead>/);
  assert.match(html, /<div class="wheels-toolbar tires-toolbar" data-tires-toolbar hidden>/);
  assert.match(html, /<script type="module" src="\/china-bike-research\/assets\/tires\.js"><\/script>/);
  for (const tire of data.tires) {
    // Each row ends after its details cell; the size table inside has its own tbody.
    const entry = html.match(new RegExp(`<tbody class="groupset-entry tire-entry" id="${tire.id}"[\\s\\S]*?</details></td></tr></tbody>`))?.[0] ?? '';
    assert.ok(entry, tire.id);
    assert.match(entry, new RegExp(`data-origin="${tire.origin.group}" data-construction="${tire.construction}"`), tire.id);
    // A tire without a lab test shows the quiet unknown dash, never an invented figure.
    if (!tire.tests.length) assert.match(entry, /<td data-label="Lab test" data-column="tests"><strong>—<\/strong>/, tire.id);
    if (!tire.price_observations.length) assert.match(entry, /<td data-label="Price" data-column="price"><strong>—<\/strong>/, tire.id);
    for (const observation of tire.price_observations) assert.ok(entry.includes(observation.conditions.replaceAll("'", '&#039;')), `${tire.id} keeps price conditions`);
  }
  assert.match(html, /<details class="reference-guide tire-coverage" id="coverage"><summary>Coverage: \d+ candidates from \d+ brands, as of \d{4}-\d{2}-\d{2}<\/summary>/);
  assert.match(html, /tire-disposition-unresolved/);
  assert.match(html, /href="\/china-bike-research\/tires\/" data-nav-tires aria-current="page">Tires<\/a>/);
  // Tires never become bike catalog rows.
  const home = renderHome(ctx);
  assert.match(home, /<footer[\s\S]*?href="\/china-bike-research\/tires\/">Road tires<\/a>/);
  for (const tire of data.tires) assert.doesNotMatch(home, new RegExp(`data-id="${tire.id}"`));
});

test('the tire reference is an interface route in every language', () => {
  assert.ok(INTERFACE_ROUTES.includes('/tires/'));
  assert.match(renderTires({ ...ctx, locale: 'zh-Hans' }), /<h1>公路车外胎<\/h1>[\s\S]*对比起点/);
  assert.match(renderTires({ ...ctx, locale: 'de' }), /<h1>Rennradreifen<\/h1>[\s\S]*Niedrigster gemessener Rollwiderstand/);
  assert.match(renderTires({ ...ctx, locale: 'es' }), /<h1>Neumáticos de carretera<\/h1>/);
  assert.match(renderTires({ ...ctx, locale: 'ru' }), /<h1>Шоссейные шины<\/h1>/);
});
