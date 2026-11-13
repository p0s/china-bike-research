import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, validateDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { candidateIndexable } from '../src/lib/indexing.mjs';
import { renderHome, catalogSummaries, renderBikeBuilder, renderCandidateModel, renderModel } from '../src/render.mjs';
import { translate } from '../assets/i18n.js';

const data = loadDataset();
const products = joinProducts(data);
const entries = joinCatalogCandidates(data);
const context = { data, products, posts: [], base: '', siteUrl: 'https://chinesebikes.xyz', repositoryUrl: 'https://github.com/p0s/china-bike-research', now: new Date('2026-10-03T00:00:00Z') };
const find = id => entries.find(entry => entry.candidate.id === id);
const builder = JSON.parse(renderBikeBuilder(context).match(/id="build-configurator-data">([\s\S]*?)<\/script>/)[1]);

test('unmapped measurements remain references and cannot drive complete-bike weight comparisons', () => {
  const summaries = catalogSummaries(context);
  const home = renderHome(context);
  for (const [id, grams] of [
    ['merida-scultura-endurance-4000-community-lead', 8970],
    ['twitter-gravel-v3-2024-rs-carbon-wave', 9500],
    ['xds-ad500-2025', 9230],
    ['missing-china-price-van-rysel-rcr', 8000],
    ['pardus-spark-sport-pes', 8500]
  ]) {
    const entry = find(id);
    assert.equal(entry.candidate.facts.complete_weight_g, grams, id);
    const summary = summaries.find(item => item.id === entry.id);
    assert.equal(summary.weightGrams, undefined, id);
    assert.equal(summary.weight, undefined, id);
    const base = builder.bases.find(item => item.id === entry.id);
    if (base) assert.equal(base.baseWeightG, null, id);
    const row = home.match(new RegExp(`data-id="${entry.id}"[\\s\\S]*?(?=<div class="catalog-row|</section>)`))?.[0];
    assert.ok(row, id);
    assert.match(row, /class="catalog-cell weight-cell is-unknown"[^>]*>—<\/div>/, id);
    for (const locale of ['en', 'zh-Hans', 'de']) {
      const profile = renderCandidateModel({ ...context, locale }, entry);
      assert.ok(profile.includes(translate('Reference complete weight; exact build unresolved', locale)), id + locale);
      const headline = profile.match(/id="candidate-story-title">([^<]+)/)?.[1];
      assert.ok(!headline.includes(`${(grams / 1000).toFixed(1)} kg`), id + locale);
    }
  }
  assert.equal(summaries.find(item => item.id === 'candidate-missing-china-price-merida-scultura').weightGrams, 8200);
});

test('a newer-generation MSRP cannot price or sort the older custom Merida build', () => {
  const entry = find('merida-scultura-endurance-4000-community-lead');
  assert.equal(entry.price.amount_cny, 14800);
  assert.equal(entry.priceMidpoint, Infinity);
  const summary = catalogSummaries(context).find(item => item.id === entry.id);
  assert.equal(summary.priceLowCny, null);
  assert.equal(summary.priceHighCny, null);
  assert.equal(summary.chinaPrice, null);
  assert.equal(summary.priceUnavailable, true);
  const base = builder.bases.find(item => item.id === entry.id);
  assert.equal(base.priceLow, null);
  assert.equal(base.priceHigh, null);
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const home = renderHome({ ...context, locale });
    assert.match(home, /data-id="candidate-merida-scultura-endurance-4000-community-lead"[^>]*data-price-sort=""[^>]*data-price-filter=""/);
    const profile = renderCandidateModel({ ...context, locale }, entry);
    assert.ok(profile.includes('¥14,800'));
    assert.ok(profile.includes(translate('Reference only; exact build price unknown', locale)));
    assert.ok(profile.includes(translate('The retained price is not matched to this exact build; its purchase price remains unknown.', locale)));
  }
});

test('builder denial does not change an exact model’s catalog identity, SEO eligibility or price', () => {
  const fixture = structuredClone(data);
  const candidate = fixture.candidates.find(item => item.id === 'missing-china-price-merida-scultura');
  const before = find(candidate.id);
  candidate.comparison_eligibility = { builder_base: false, reviewed_at: '2026-10-03', note: 'Selected complete build is not yet linked.' };
  const after = joinCatalogCandidates(fixture).find(entry => entry.candidate.id === candidate.id);
  assert.equal(after.builderEligible, false);
  assert.equal(after.identifiableModel, before.identifiableModel);
  assert.equal(after.defaultVisible, before.defaultVisible);
  assert.equal(candidateIndexable(after), candidateIndexable(before));
  assert.deepEqual(after.price, before.price);
  const fixtureContext = { ...context, data: fixture };
  const summary = catalogSummaries(fixtureContext).find(item => item.id === after.id);
  assert.equal(summary.builderEligible, undefined);
  assert.equal(summary.priceLowCny, 16800);
});

test('recorded model, generation and package conflicts do not become exact builder bases', () => {
  for (const id of ['java-lampo-carbon-road', 'gito-wave', 'de-rosa-idol', 'cosmosworks-carbon-e-road', 'java-tt-frame-hydraulic', 'gios-aerolite', 'twitter-carbon-road-gravel-unknown', 'pardus-spark', 'giant-defy-advanced-sl1-community-lead', 'pardus-robin-evo-community-lead', 'pardus-spark-rs-community-lead', 'rolling-stone-comp', 'pardus-spark-sport-pes', 'sava-gelaro-sf', 'gito-carbon-aero-entry', 'gito-carbon-road-plus', 'twitter-gravel-v3-2024-rs-carbon-wave']) {
    const entry = find(id);
    assert.ok(entry, id + ' keeps its research profile');
    assert.ok(!builder.bases.some(base => base.id === entry.id), id);
    const summary = catalogSummaries(context).find(item => item.id === entry.id);
    assert.ok(summary, id);
    assert.equal(summary.builderEligible, undefined, id);
  }
});

test('Cockpit conflicts and distributor authority remain visible in all three languages', () => {
  for (const id of ['twitter-cyclone-electronic']) {
    const product = products.find(item => item.variant.id === id);
    for (const locale of ['en', 'zh-Hans', 'de']) {
      const profile = renderModel({ ...context, locale }, product);
      assert.ok(profile.includes(translate(product.variant.cockpit_status, locale)), id + locale);
      assert.ok(profile.includes('420×90'));
      assert.ok(profile.includes('400×90'));
    }
  }
  const source = data.sources.find(item => item.id === 'twitter-v3-wireless-official-2026-08-25');
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const profile = renderModel({ ...context, locale }, products.find(item => item.variant.id === 'twitter-v3-wheeltop-eds'));
    assert.ok(profile.includes(translate(source.authority_note, locale)), locale);
    assert.ok(profile.includes(translate('Historical source annotation:', locale)), locale);
  }
});

test('eligibility policies require a dated explanation and duplicate pointers must resolve', () => {
  const malformed = structuredClone(data);
  malformed.candidates[0].comparison_eligibility = { complete_weight: 'false', note: '' };
  malformed.candidates[1].existing_record_id = 'record-that-does-not-exist';
  const errors = validateDataset(malformed);
  assert.ok(errors.some(error => error.includes('invalid comparison_eligibility')));
  assert.ok(errors.some(error => error.includes('unresolved existing_record_id')));
  const pointer = data.candidates.find(item => item.id === 'missing-china-price-tsb-titan-super-bond-pioneer-one');
  assert.equal(pointer.existing_record_id, 'tsb-titan-super-bond-pioneer-one');
  assert.equal(pointer.pointer_history[0].existing_record_id, 'tsb-pioneer-one');
  assert.ok(!entries.some(entry => entry.candidate.id === pointer.id));
  assert.ok(entries.some(entry => entry.candidate.id === pointer.existing_record_id));
});

test('two retained records for one Cyclone R7120 trim link each other without losing either page, row or observation', () => {
  const pair = ['twitter-cyclone-gen3-7170', 'twitter-cyclone-r7120'];
  const summaries = catalogSummaries(context);
  for (const [id, twin] of [pair, [...pair].reverse()]) {
    const entry = find(id);
    assert.ok(entry, `${id}: still a catalog record`);
    assert.ok(summaries.some(summary => summary.id === `candidate-${id}`), `${id}: catalog row kept`);
    assert.equal(entry.candidate.same_identity_as.record_id, twin);
    for (const locale of ['en', 'zh-Hans', 'de']) {
      const html = renderCandidateModel({ ...context, locale }, entry);
      assert.ok(html.includes(`data-same-identity="${twin}"`) && html.includes(`/models/${twin}/`), `${id} ${locale}`);
      if (locale !== 'en') assert.match(html, /<span lang="en" data-original-language>Both records describe/);
    }
  }
  assert.equal(find(pair[0]).candidate.observed_price.amount_cny, 10961);
  assert.equal(find(pair[1]).candidate.observed_price.amount_cny, 7769);
  // A one-sided, self or unresolved link is rejected.
  for (const mutate of [
    d => { delete d.candidates.find(c => c.id === pair[1]).same_identity_as; },
    d => { d.candidates.find(c => c.id === pair[0]).same_identity_as.record_id = pair[0]; },
    d => { d.candidates.find(c => c.id === pair[0]).same_identity_as.record_id = 'missing-record'; },
    d => { d.candidates.find(c => c.id === pair[0]).same_identity_as.note = ' '; },
  ]) {
    const copy = structuredClone(data);
    mutate(copy);
    assert.ok(validateDataset(copy).some(error => error.includes('same_identity_as')));
  }
});

test('candidate identity is an explicit field, never inferred from wording', () => {
  // "LightCarbon … complete bike" once matched a generic-name pattern through its brand name.
  for (const id of ['lightcarbon-speed7-complete', 'phoenix-700c-carbon-e-road']) assert.equal(find(id).identifiableModel, true, id);
  // Records whose own status says the exact model is unresolved are unresolved, whatever the name says.
  const summaries = catalogSummaries(context);
  for (const id of ['gito-wave', 'java-lampo-carbon-road', 'my-way-custom-carbon-frame']) {
    const entry = find(id);
    assert.equal(entry.identifiableModel, false, id);
    assert.equal(candidateIndexable(entry), false, id);
    assert.equal(summaries.find(item => item.id === entry.id).priceUnavailable, true, id);
  }
  const fixture = structuredClone(data);
  const lead = fixture.candidates.find(item => item.id === 'lightcarbon-speed7-complete');
  lead.model_identity = 'unresolved';
  assert.equal(joinCatalogCandidates(fixture).find(entry => entry.candidate.id === lead.id).identifiableModel, false);
  lead.model_identity = 'maybe';
  assert.ok(validateDataset(fixture).some(error => error.includes('lightcarbon-speed7-complete: invalid model_identity')));
  // A status that already says the model is unknown cannot be overridden as identified.
  const queued = fixture.candidates.find(item => item.status === 'needs-exact-model');
  queued.model_identity = 'identified';
  assert.ok(validateDataset(fixture).some(error => error.includes(`${queued.id}: model_identity contradicts status`)));
  // Wording that sounds unresolved needs an explicit decision rather than a guess.
  delete fixture.candidates.find(item => item.id === 'gito-wave').model_identity;
  assert.ok(validateDataset(fixture).some(error => error.includes('gito-wave: name or status reads as an unresolved model')));
});

test('buyer-facing rewording of research notes keeps whole words and sentence case', () => {
  const page = id => renderCandidateModel(context, find(id)).replace(/<[^>]+>/g, ' ').replace(/&#039;/g, "'").replace(/\s+/g, ' ');
  const robin = page('pardus-robin-sport-pes');
  assert.match(robin, /reseller and modified-owner weights/);
  assert.doesNotMatch(robin, /repurchase source/);
  // An ordinary verb stays; only an instruction that starts a clause becomes "confirm".
  assert.match(page('west-biking-sl-one'), /does not provide R7120 component codes, verify a current R7170 Di2 option/);
  assert.match(page('cycletrack-time-tt'), /the photograph does not verify retained selected drivetrain/);
  assert.match(page('evolve-cima-road'), /subject to policy conditions; confirm the transaction channel and exclusions/);
  assert.doesNotMatch(page('de-rosa-idol'), /[a-z,] Confirm /);
});
