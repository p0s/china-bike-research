import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadDataset, joinProducts, joinCatalogCandidates, validateDataset } from '../src/lib/data.mjs';
import { catalogSummaries, renderBikeBuilder, renderCandidateModel } from '../src/render.mjs';
import { translate } from '../assets/i18n.js';

const data = loadDataset();
const id = 'missing-china-price-van-rysel-rcr';
const context = (dataset = data, locale = 'en') => ({ data: dataset, products: joinProducts(dataset), posts: [], base: '', locale, siteUrl: 'https://chinesebikes.xyz', repositoryUrl: 'https://github.com/p0s/china-bike-research', now: new Date('2026-10-05') });
const entryFor = (dataset, candidateId) => joinCatalogCandidates(dataset).find(e => e.candidate.id === candidateId);
const entry = entryFor(data, id);
const builder = ctx => JSON.parse(renderBikeBuilder(ctx).match(/id="build-configurator-data">([\s\S]*?)<\/script>/)[1]);
const summary = (ctx, candidateId) => catalogSummaries(ctx).find(e => e.id === 'candidate-' + candidateId);
const story = html => html.match(/id="candidate-story-title">([\s\S]*?)<\/h2>/)[1];
const lede = html => html.match(/class="model-story-lede">([\s\S]*?)<\/p>/)[1];

test('unresolved UK complete and frame weights stay out of all localized headlines and planner inputs', () => {
  assert.equal(entry.candidate.comparison_eligibility.complete_weight, false);
  assert.equal(entry.candidate.comparison_eligibility.frame_weight, false);
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const ctx = context(data, locale), html = renderCandidateModel(ctx, entry);
    for (const text of [story(html), lede(html), html.match(/<meta name="description" content="([^"]*)"/)[1]]) {
      assert.doesNotMatch(text, /830|8[.,][02]\s*kg|8000|8200/, locale);
    }
    const shown = summary(ctx, id);
    assert.equal(shown.weightGrams, undefined);
    assert.equal(shown.weight, undefined);
    assert.doesNotMatch(shown.frame, /830/);
    assert.equal(builder(ctx).bases.find(e => e.id === entry.id).baseWeightG, null);
    for (const label of ['Reference complete weight; exact build unresolved', 'Reference frame weight; exact build unresolved', 'Alternative complete-weight reference', 'Regional build scope']) {
      assert.ok(html.includes(translate(label, locale)), label + locale);
      if (locale !== 'en') assert.notEqual(translate(label, locale), label);
    }
    for (const value of ['8.0 kg', '8.2 kg', '830 g']) assert.ok(html.includes(value), value + locale);
    assert.ok(html.includes(translate(entry.candidate.facts.regional_build_scope, locale)), locale);
    if (locale !== 'en') assert.notEqual(translate(entry.candidate.facts.regional_build_scope, locale), entry.candidate.facts.regional_build_scope);
  }
});

test('frame exclusion also suppresses frameset decisions while eligible frame behavior is retained', () => {
  const frameId = 'lightcarbon-lcr018-d', initial = entryFor(data, frameId);
  const grams = initial.candidate.facts.frame_weight_g;
  assert.ok(Number.isFinite(grams));
  assert.equal(summary(context(), frameId).weightGrams, grams);
  assert.equal(builder(context()).bases.find(e => e.id === initial.id).baseWeightG, grams);
  const changed = structuredClone(data), candidate = changed.candidates.find(e => e.id === frameId);
  candidate.comparison_eligibility = { frame_weight: false, note: 'Test an unresolved exact frame reference.', reviewed_at: '2026-10-05' };
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const ctx = context(changed, locale), model = renderCandidateModel(ctx, entryFor(changed, frameId));
    assert.equal(summary(ctx, frameId).weightGrams, undefined);
    assert.equal(summary(ctx, frameId).weight, undefined);
    assert.equal(builder(ctx).bases.find(e => e.id === initial.id).baseWeightG, null);
    assert.doesNotMatch(story(model), new RegExp(String(grams)));
    assert.ok(model.includes(translate('Reference frame weight; exact build unresolved', locale)));
    assert.ok(model.includes(new Intl.NumberFormat('en-US').format(grams) + ' g'));
  }
});

test('frame-weight eligibility requires a dated boolean decision', () => {
  assert.deepEqual(validateDataset(data), []);
  for (const bad of ['false', 0, null]) {
    const changed = structuredClone(data);
    changed.candidates.find(e => e.id === id).comparison_eligibility.frame_weight = bad;
    assert.ok(validateDataset(changed).some(e => e.includes('candidate ' + id + ': invalid comparison_eligibility')));
  }
});

test('exact UK wheel, fork and fitted-tyre observations keep their scopes without inventing a mainland build', () => {
  const facts = entry.candidate.facts;
  assert.match(facts.wheels, /Hadron Classic 470.*Classic 625.*62 mm/);
  assert.match(facts.fork, /HM carbon fork material.*420 g gross fork.*inclusions and measurement protocol are unstated/);
  assert.match(facts.fork, /470 number identifies.*wheel model/);
  assert.match(facts.frame_weight_basis, /generic RCR 830 g.*1,010 g gross RCR-F Pro.*neither value is selected/);
  assert.match(facts.tires, /Aero 111 front \/ GP5000 S TR rear.*26 mm front \/ 28 mm rear/);
  assert.equal(facts.tire_clearance_mm, 32);
  assert.match(facts.tire_clearance_basis, /32 mm maximum.*26 mm front \/ 28 mm rear.*separate observations/);
  assert.match(facts.powermeter, /descriptions align.*mainland component package is unverified/);
  assert.match(facts.regional_build_scope, /UK product references only.*do not establish the mainland China build/);
  for (const sourceId of entry.candidate.audit_corrections.at(-1).source_ids) {
    const source = data.sources.find(e => e.id === sourceId);
    assert.equal(source.accessed_at, '2026-10-05');
    assert.match(source.url, /358179/);
    assert.match(source.notes, /mainland/);
  }
});

test('every prior Van Rysel field and all price observations survive the correction exactly', () => {
  const prior = entry.candidate.audit_corrections.at(-1).prior_values;
  assert.equal(createHash('sha256').update(JSON.stringify(prior)).digest('hex'), '00790cd8e8ff6f000f8ccd5294abd56e8c2e4e255e138c2ed7f69481b5e51cdf');
  assert.deepEqual(entry.candidate.observed_price, prior.observed_price);
  assert.equal(entry.candidate.observed_price.amount_cny, 19999);
  assert.equal(entry.candidate.observed_price.observed_at, '2026-08-20');
  for (const key of ['complete_weight_g', 'complete_weight_alternative_g', 'frame_weight_g', 'complete_weight_basis', 'complete_weight_alternative_basis']) assert.deepEqual(entry.candidate.facts[key], prior.facts[key], key);
  for (const sourceId of prior.source_ids) assert.ok(entry.candidate.source_ids.includes(sourceId), sourceId);
  assert.equal(prior.comparison_eligibility.reviewed_at, '2026-10-03');
});
