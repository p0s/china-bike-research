import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, validateDataset } from '../src/lib/data.mjs';
import { renderHome, renderTires } from '../src/render.mjs';
import { INTERFACE_ROUTES } from '../src/lib/i18n.mjs';
import { translate } from '../assets/i18n.js';
import { BUDGET_CNY_PER_TIRE, OWNER_ASPECTS, OWNER_RATING_MIN, OWNER_STATUSES, budgetPrice, budgetShortlist, comparableRollingTest, issueSources, measuredWetGrip, ownerCheckStatus, ownerRating, ownerRatings, referenceSize, sizeWidths, tireGroups, tireShortlists, wetEvidenceStatus } from '../src/lib/tires.mjs';

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
    // Wet evidence: a lab score, a wet note, or a coded owner row that describes wet riding.
    if (tireGroups(tire).wet) assert.ok(fits(tire, 20, 40) && (measuredWetGrip(tire) !== null || tire.wet_notes.length || (tire.owner_evidence?.reports ?? []).some((report) => report.codes.wet)), tire.id);
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
  assert.match(html, /<thead><tr><th>Tire<\/th><th>Use<\/th><th>Widths<\/th><th>Weight<\/th><th>Lab test<\/th><th>Price<\/th><th>Owners<\/th><\/tr><\/thead>/);
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

test('tire photos are exact remote embeds with a listed source, rights and privacy review', () => {
  const official = firstId((tire) => tire.image?.kind === 'official' && tire.image.thumb_url);
  const post = firstId((tire) => tire.image?.kind === 'public-post');
  rejects(official, (tire) => { tire.image.subject_accuracy = 'same-family'; }, 'tire photos must show the exact model');
  rejects(official, (tire) => { tire.image.source_id = 'not-a-listed-source'; }, 'image source must be a listed source');
  rejects(official, (tire) => { tire.image.remote_url = 'https://images.example.com/tire.jpg'; }, "image must load from its source page's host or reviewed media host");
  rejects(official, (tire) => { tire.image.remote_url = `${tire.image.remote_url.split('?')[0]}?utm_source=x`; }, 'image.remote_url must be an HTTPS file URL with resizing parameters only');
  rejects(official, (tire) => { tire.image.thumb_url = tire.image.remote_url.split('?')[0].replace(/[^/]+$/, 'another-tire.jpg'); }, 'image.thumb_url must be a resized copy of the same file on the same host');
  rejects(official, (tire) => { tire.image.width = 80; }, 'image needs reviewed dimensions of at least 120 px');
  rejects(official, (tire) => { delete tire.image.source_media_sha256; }, "image needs the reviewed file's hash and size");
  // A remote embed never claims a local-reuse licence, and every photo names a removal route.
  rejects(official, (tire) => { tire.image.rights.status = 'local-reuse'; }, 'incomplete image rights record');
  rejects(official, (tire) => { delete tire.image.rights.removal_route; }, 'incomplete image rights record');
  rejects(official, (tire) => { tire.image.privacy_review.visual = 'not-checked'; }, 'incomplete image privacy review');
  rejects(post, (tire) => { tire.image.kind = 'official'; tire.image.rights.status = 'official-page-embed'; }, 'image source type does not match its kind');
  rejects(post, (tire, copy) => { copy.sources.find((source) => source.id === tire.image.source_id).url += '?xsec_token=x'; }, 'a public-post photo needs a canonical XHS post link');
  // The photo ledger lists every tire once, and its status follows the tire record.
  const [ledger] = data.tireImages;
  rejects(official, (tire, copy) => { copy.tireImages[0].entries = copy.tireImages[0].entries.filter((entry) => entry.tire_id !== tire.id); }, `tire image ledger ${ledger.id}: tire ${official} is missing`);
  rejects(official, (tire) => { delete tire.image; }, `tire image ledger ${ledger.id}: ${official} status does not match its record`);
  rejects(official, (tire, copy) => { copy.tireImages[0].entries.find((entry) => entry.tire_id === tire.id).reason = ''; }, `tire image ledger ${ledger.id}: ${official} needs a status and reason`);
});

test('tire rows show a lazy exact photo with credit and source, and coverage lists every missing photo', () => {
  const html = renderTires(ctx);
  const sourcesById = new Map(data.sources.map((source) => [source.id, source]));
  for (const tire of data.tires) {
    const entry = html.match(new RegExp(`<tbody class="groupset-entry tire-entry" id="${tire.id}"[\\s\\S]*?</details></td></tr></tbody>`))?.[0] ?? '';
    if (!tire.image) {
      assert.doesNotMatch(entry, /has-image|tire-photo|data-product-image/, tire.id);
      continue;
    }
    const { image } = tire;
    const src = (image.thumb_url ?? image.remote_url).replaceAll('&', '&amp;');
    // The thumbnail sits in the row identity, loads lazily and sends no referrer; it is not a link.
    assert.ok(entry.includes(`<div class="groupset-identity has-image"><span class="product-image groupset-image tire-image"><img src="${src}"`), tire.id);
    assert.match(entry, /loading="lazy" decoding="async" referrerpolicy="no-referrer" data-product-image>/, tire.id);
    const figure = entry.match(/<figure class="tire-photo">[\s\S]*?<\/figure>/)?.[0] ?? '';
    assert.ok(figure.includes({ official: 'Maker photo', retailer: 'Retailer photo', 'public-post': 'Photo from an XHS post' }[image.kind]), tire.id);
    assert.ok(figure.includes(`href="${sourcesById.get(image.source_id).url.replaceAll('&', '&amp;')}" rel="noreferrer">Original source</a>`), tire.id);
    assert.match(entry, /<span class="groupset-image-credit"><span>Photo<\/span> /, tire.id);
  }
  const ledger = [...data.tireImages].sort((a, b) => b.as_of.localeCompare(a.as_of))[0];
  const count = (status) => ledger.entries.filter((entry) => entry.status === status).length;
  assert.equal(count('official') + count('retailer') + count('public-post') + count('missing'), data.tires.length);
  assert.ok(html.includes(`<h3>Photos</h3><p><strong>${count('official')} maker · ${count('retailer')} retailer · ${count('public-post')} XHS post · ${count('missing')} without a photo</strong>`));
  for (const entry of ledger.entries.filter((item) => item.status === 'missing')) assert.ok(html.includes(`<a href="#${entry.tire_id}">`), entry.tire_id);
  for (const [locale, label] of [['zh-Hans', '小红书帖子图片'], ['de', 'Foto aus einem XHS-Beitrag'], ['es', 'Foto de una publicación de XHS'], ['ru', 'Фото из публикации XHS']]) {
    assert.equal(translate('Photo from an XHS post', locale), label, locale);
    assert.notEqual(translate('1 maker · 2 retailer · 3 XHS post · 4 without a photo', locale), '1 maker · 2 retailer · 3 XHS post · 4 without a photo', locale);
  }
});

test('the tire reference is an interface route in every language', () => {
  assert.ok(INTERFACE_ROUTES.includes('/tires/'));
  assert.match(renderTires({ ...ctx, locale: 'zh-Hans' }), /<h1>公路车外胎<\/h1>[\s\S]*对比起点/);
  assert.match(renderTires({ ...ctx, locale: 'de' }), /<h1>Rennradreifen<\/h1>[\s\S]*Niedrigster gemessener Rollwiderstand/);
  assert.match(renderTires({ ...ctx, locale: 'es' }), /<h1>Neumáticos de carretera<\/h1>/);
  assert.match(renderTires({ ...ctx, locale: 'ru' }), /<h1>Шоссейные шины<\/h1>/);
});

test('owner ratings need five owners per aspect and map shares to coarse word bands', () => {
  const counts = (favourable, mixed, unfavourable) => ({ favourable, mixed, unfavourable });
  assert.equal(OWNER_RATING_MIN, 5);
  assert.equal(ownerRating(counts(4, 0, 0)), null);
  assert.deepEqual(ownerRating(counts(5, 0, 0)), { band: 'favourable', depth: 'limited' });
  assert.equal(ownerRating(counts(4, 1, 0)).band, 'favourable');
  assert.equal(ownerRating(counts(4, 0, 1)).band, 'mostly-favourable');
  assert.equal(ownerRating(counts(3, 0, 2)).band, 'mixed');
  assert.equal(ownerRating(counts(2, 0, 3)).band, 'mixed');
  assert.equal(ownerRating(counts(1, 0, 4)).band, 'mostly-unfavourable');
  assert.equal(ownerRating(counts(0, 1, 4)).band, 'unfavourable');
  assert.equal(ownerRating(counts(6, 2, 2)).depth, 'moderate');
  assert.equal(ownerRating(counts(15, 3, 2)).depth, 'larger');
  // Five generic ownership reports cannot rate wet grip: each aspect needs its own sample.
  const row = (codes) => ({ source_ids: ['s'], width_mm: 28, setup: null, codes, summary: 'x' });
  const tire = { owner_evidence: { coded_at: '2026-11-03', screening_note: 'x', reports: [...Array(5)].map(() => row({ overall: 'favourable' })).concat(row({ wet: 'unfavourable' })) } };
  const summary = ownerRatings(tire);
  assert.equal(summary.owners, 6);
  assert.deepEqual(summary.rated, ['overall']);
  assert.equal(summary.aspects.wet.n, 1);
  assert.equal(summary.aspects.wet.rating, null);
  assert.equal(ownerRatings({}).coded, false);
});

test('owner rows are construction-specific, sourced and free of links or handles', () => {
  const coded = firstId((tire) => tire.owner_evidence?.reports.length);
  const tubeType = firstId((tire) => tire.construction === 'tube-type' && tire.owner_evidence?.reports.length);
  rejects(coded, (tire) => { tire.owner_evidence.reports[0].codes = { braking: 'favourable' }; }, 'owner rows need known aspect codes');
  rejects(coded, (tire) => { tire.owner_evidence.reports[0].codes = { overall: 'great' }; }, 'owner rows need known aspect codes');
  rejects(coded, (tire) => { tire.owner_evidence.reports[0].source_ids = ['not-a-listed-source']; }, 'owner rows need listed sources');
  rejects(coded, (tire) => { tire.owner_evidence.reports[0].summary = 'See https://example.com for details'; }, 'owner rows need a summary without links or handles');
  rejects(coded, (tire) => { tire.owner_evidence.reports[0].summary = 'Reported by @rider'; }, 'owner rows need a summary without links or handles');
  rejects(coded, (tire) => { tire.owner_evidence.reports[0].published_at = '06-26'; }, 'owner row date must be a full date');
  rejects(tubeType, (tire) => { tire.owner_evidence.reports[0].setup = 'tubeless'; }, 'a tube-type tire cannot have a tubeless owner row');
  rejects(coded, (tire) => { tire.community = [{ source_id: tire.owner_evidence.reports[0].source_ids[0], stance: 'mixed', published_at: '2026-01-01', summary: 'x' }]; }, 'a post is either coded owner by owner or kept as a post note');
  rejects(coded, (tire) => { delete tire.owner_evidence.screening_note; }, 'owner evidence needs a coding date, screening note and reports');
  // The checked-source ledger: known routes once each, counted routes carry a bounded owner count.
  const owners = (count) => [...Array(count)].map(() => ({ source_ids: ['s'], width_mm: null, setup: null, codes: { overall: 'favourable' }, summary: 'x' }));
  rejects(coded, (tire) => { tire.owner_evidence.checks = [{ route: 'reddit', outcome: 'none' }]; }, 'owner checks need distinct known routes');
  rejects(coded, (tire) => { tire.owner_evidence.checks = [{ route: 'sigma-sports', outcome: 'counted', owners: 1 }, { route: 'sigma-sports', outcome: 'none' }]; }, 'owner checks need distinct known routes');
  rejects(coded, (tire) => { tire.owner_evidence.checks = [{ route: 'sigma-sports', outcome: 'counted' }]; }, 'only a counted route carries an owner count within the coded rows');
  rejects(coded, (tire) => { tire.owner_evidence.checks = [{ route: 'sigma-sports', outcome: 'counted', owners: 99 }]; }, 'only a counted route carries an owner count within the coded rows');
  rejects(coded, (tire) => { tire.owner_evidence.checks = [{ route: 'bike-components', outcome: 'blocked', note: 'see https://example.com' }]; }, 'owner check notes must be plain text');
  rejects(coded, (tire) => { tire.owner_evidence.checks = [{ route: 'bike-components', outcome: 'not-listed' }]; }, 'coded rows need a counted route');
  const evidence = (reports, checks) => ({ owner_evidence: { coded_at: '2026-11-03', screening_note: 'x', reports, checks } });
  assert.equal(ownerCheckStatus({}), 'unchecked');
  assert.equal(ownerCheckStatus(evidence(owners(5), [{ route: 'sigma-sports', outcome: 'counted', owners: 5 }])), 'rated');
  assert.equal(ownerCheckStatus(evidence(owners(2), [{ route: 'sigma-sports', outcome: 'counted', owners: 2 }])), 'below');
  assert.equal(ownerCheckStatus(evidence([], [{ route: 'sigma-sports', outcome: 'not-listed' }, { route: 'xiaohongshu', outcome: 'pending' }])), 'pending');
  assert.equal(ownerCheckStatus(evidence([], [{ route: 'bike-components', outcome: 'blocked', note: 'HTTP 403' }])), 'blocked');
  assert.equal(ownerCheckStatus(evidence([], [{ route: 'bike-components', outcome: 'blocked' }, { route: 'sigma-sports', outcome: 'none' }])), 'none');
});

test('the Owners column and row details show ratings, counts and unknowns honestly', () => {
  const html = renderTires(ctx);
  assert.match(html, /<option value="owners">Most owners coded<\/option>/);
  for (const tire of data.tires) {
    const entry = html.match(new RegExp(`<tbody class="groupset-entry tire-entry" id="${tire.id}"[\\s\\S]*?</details></td></tr></tbody>`))?.[0] ?? '';
    const cell = entry.match(/<td data-label="Owners" data-column="owners">[\s\S]*?<\/td>/)?.[0] ?? '';
    const summary = ownerRatings(tire);
    if (!summary.coded) {
      assert.equal(cell, '<td data-label="Owners" data-column="owners"><strong>—</strong></td>', tire.id);
      assert.doesNotMatch(entry, /tire-owner-ratings|data-owners=/, tire.id);
      continue;
    }
    // Only tires with counted owners carry an owner count for sorting; others sort last.
    if (summary.owners) assert.match(entry, new RegExp(`data-owners="${summary.owners}"`), tire.id);
    else assert.doesNotMatch(entry, /data-owners=/, tire.id);
    assert.match(entry, /<section class="tire-owner-ratings"><h3>Owner ratings<\/h3>/, tire.id);
    assert.match(entry, /not star ratings given by owners\. An aspect is rated only when at least 5 owners describe it; 5 is an entry threshold, not proof\./, tire.id);
    // A checked tire without a counted owner shows its ledger, not an empty aspect table.
    if (!summary.owners) assert.doesNotMatch(entry, /tire-owner-table/, tire.id);
    for (const aspect of summary.owners ? OWNER_ASPECTS : []) {
      const { n, rating } = summary.aspects[aspect];
      // Too few owners show a count without a rating; no report stays unknown, never zero.
      if (!rating) assert.match(entry, n ? /<span>Not rated<\/span><\/td><td>\d+ owners? <span>/ : /<span>No owner report<\/span><\/td><td>—<\/td>/, `${tire.id} ${aspect}`);
    }
    if (summary.rated.length) assert.match(cell, /<strong>(Favourable|Mostly favourable|Mixed|Mostly unfavourable|Unfavourable)<\/strong><span>[^<]+ · \d+ owners/, tire.id);
    else assert.match(cell, /<strong>Not rated yet<\/strong>/, tire.id);
  }
  const statuses = Object.fromEntries(OWNER_STATUSES.map((status) => [status, data.tires.filter((tire) => ownerCheckStatus(tire) === status).length]));
  assert.ok(html.includes(`<h3>Owner ratings</h3><p><strong>${statuses.rated} with a rated aspect · ${statuses.below} below the threshold · ${statuses.none} with no eligible owner found · ${statuses.blocked} access blocked · ${statuses.pending} awaiting Xiaohongshu research · ${statuses.unchecked} not yet checked</strong></p>`));
  assert.equal(Object.values(statuses).reduce((sum, n) => sum + n, 0), data.tires.length);
  // Owner ratings never become structured-data ratings.
  assert.doesNotMatch(html, /aggregateRating|ratingValue/);
  for (const locale of ['zh-Hans', 'de', 'es', 'ru']) {
    for (const text of ['Owners', 'Owner ratings', 'Overall verdict', 'Wet grip', 'Mostly favourable', 'Not rated yet', 'Post notes', '7 owners', '5 favourable', 'Most owners coded', 'limited evidence']) {
      assert.notEqual(translate(text, locale), text, `${locale}: ${text}`);
    }
  }
});
