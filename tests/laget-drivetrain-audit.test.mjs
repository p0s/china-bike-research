import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { loadDataset, joinProducts, joinCatalogCandidates, validateDataset } from '../src/lib/data.mjs';
import { renderBikeBuilder, renderCandidateModel } from '../src/render.mjs';
import { numberOrNull } from '../assets/state-utils.js';
import { translate } from '../assets/i18n.js';
const data = loadDataset();
const ctx = { data, products: joinProducts(data), posts: [], base: '', siteUrl: 'https://chinesebikes.xyz', repositoryUrl: 'https://github.com/p0s/china-bike-research' };
const script = fs.readFileSync(new URL('../assets/site.js', import.meta.url), 'utf8');
const start = script.indexOf('  function compatibilityMessages(');
const source = script.slice(start, script.indexOf('  function updateUrl(', start));
const payload = JSON.parse(renderBikeBuilder({ ...ctx, locale: 'en' }).match(/id="build-configurator-data">([\s\S]*?)<\/script>/)[1]);
const base = id => payload.bases.find(item => item.id === `candidate-laget-discovery-one-${id}`);
const part = (teeth = 40, type = 'electronic', layout = 'single', wireless = true, maker = 'Shimano') => ({ maker, name: 'test drivetrain', compatibility: { drivetrain_layout: layout, shifting_type: type, largest_chainring_teeth: teeth, wireless_shifting: wireless } });
function messages(id, drivetrain) {
  return Array.from(vm.runInNewContext(`(${source.trim()})(base,new Map())`, { numberOrNull, base: base(id), state: { selections: {} }, selectedPart: slot => slot === 'drivetrain' ? drivetrain : null }));
}
test('LAGET flagship enforces wireless electronic 1x and the exact 40T boundary', () => {
  assert.deepEqual(messages('flagship', part()), []);
  assert.match(messages('flagship', part(41)).join(' '), /41T.*40T/);
  for (const p of [part(40, 'mechanical'), part(40, 'electronic', 'double'), part(40, 'mechanical', 'double')]) assert.match(messages('flagship', p).join(' '), /manufacturer does not support/);
  assert.match(messages('flagship', part(40, 'electronic', 'single', false)).join(' '), /recorded as wired/);
  assert.match(messages('flagship', part(40, 'electronic', 'single', null)).join(' '), /wireless-shifting requirement/);
  const p = part(); delete p.compatibility.largest_chainring_teeth;
  assert.match(messages('flagship', p).join(' '), /Confirm.*tooth count/);
  assert.match(messages('flagship', part(40, 'electronic', 'single', true, 'L-TWOO')).join(' '), /outside.*documented support/);
  assert.match(messages('flagship', part(40, 'electronic', 'single', true, '')).join(' '), /Confirm.*manufacturer/);
  assert.match(messages('flagship', null).join(' '), /Confirm shifting type/);
});
test('LAGET PRO allows documented 1× 44T for either shifting type and keeps 2× unknown', () => {
  for (const type of ['electronic', 'mechanical']) {
    assert.deepEqual(messages('pro', part(44, type, 'single', false, 'SRAM')), []);
    assert.match(messages('pro', part(45, type)).join(' '), /45T.*44T/);
    const unknown = messages('pro', part(44, type, 'double')).join(' ');
    assert.match(unknown, /not confirmed/); assert.doesNotMatch(unknown, /does not support/);
  }
  const defaultPart = data.buildParts.find(p => p.id === 'shimano-105-r7170-large-package');
  assert.match(messages('flagship', defaultPart).join(' '), /does not support/);
  const unknown = messages('pro', defaultPart).join(' ');
  assert.match(unknown, /not confirmed/); assert.doesNotMatch(unknown, /does not support/);
});
test('model facts, builder payload and critical warnings preserve source scope in all locales', () => {
  const entries = joinCatalogCandidates(data);
  for (const id of ['flagship', 'pro']) {
    const entry = entries.find(e => e.candidate.id === `laget-discovery-one-${id}`);
    assert.equal(base(id).drivetrainCompatibility.single_max_chainring_teeth, id === 'flagship' ? 40 : 44);
    for (const locale of ['en', 'zh-Hans', 'de']) {
      const html = renderCandidateModel({ ...ctx, locale }, entry);
      const note = translate(entry.candidate.drivetrain_compatibility.note, locale);
      assert.ok(html.includes(note), `${id}/${locale} source-qualified fact`);
      if (locale !== 'en') assert.notEqual(note, entry.candidate.drivetrain_compatibility.note);
      assert.doesNotMatch(html, /\[object Object\]/);
      if (id === 'pro') { assert.match(html, /3545905\.html/); assert.match(html, /317155\.html/); }
    }
  }
  const warnings = [...messages('flagship', part(41, 'electronic', 'single', null, 'L-TWOO')), ...messages('pro', part(44, 'electronic', 'double')), ...messages('flagship', null)];
  for (const locale of ['zh-Hans', 'de']) for (const warning of warnings) assert.notEqual(translate(warning, locale), warning, `${locale}: ${warning}`);
  assert.equal(data.candidates.find(c => c.id === 'laget-discovery-slr').drivetrain_compatibility, undefined);
});
test('new compatibility contracts reject malformed and falsely sourced support without changing legacy records', () => {
  assert.deepEqual(validateDataset(data), []);
  const mutate = fn => { const copy = structuredClone(data); fn(copy); assert.ok(validateDataset(copy).some(e => /drivetrain_compatibility|compatibility\./.test(e))); };
  for (const value of [0, 101, '40', 40.5]) mutate(copy => copy.candidates.find(c => c.id === 'laget-discovery-one-flagship').drivetrain_compatibility.single_max_chainring_teeth = value);
  for (const value of [undefined, 'unknown', 1]) mutate(copy => copy.candidates.find(c => c.id === 'laget-discovery-one-pro').drivetrain_compatibility.electronic.double = value);
  mutate(copy => copy.candidates.find(c => c.id === 'laget-discovery-one-pro').drivetrain_compatibility.source_id = 'unrecorded-source');
  mutate(copy => copy.candidates.find(c => c.id === 'laget-discovery-one-pro').drivetrain_compatibility.reviewed_at = '2026-02-30');
  mutate(copy => copy.candidates.find(c => c.id === 'laget-discovery-one-pro').drivetrain_compatibility.supported_manufacturers = []);
  mutate(copy => copy.candidates.find(c => c.id === 'laget-discovery-one-flagship').drivetrain_compatibility.electronic_wireless_only = 'true');
  for (const [key, value] of [['largest_chainring_teeth', '44'], ['wireless_shifting', 'yes'], ['drivetrain_layout', 'triple'], ['shifting_type', 'automatic']]) mutate(copy => copy.buildParts.find(p => p.slot === 'drivetrain').compatibility[key] = value);
});
test('all prior exact-model observations and price dates are retained unchanged', () => {
  const expected = {"flagship": "a05085309150c05ca4f03172576e30b51a2c588667483dd90fc73d03f2bf85bf", "pro": "405953b304e0e537561a52cc9c36566754a89c22ddefe648a280105c19a215ce"};
  for (const id of ['flagship', 'pro']) {
    const c = data.candidates.find(c => c.id === `laget-discovery-one-${id}`);
    const prior = c.audit_corrections.at(-1).prior_values;
    assert.equal(createHash('sha256').update(JSON.stringify(prior)).digest('hex'), expected[id]);
    assert.deepEqual(c.facts, prior.facts); assert.deepEqual(c.official_price, prior.official_price); assert.deepEqual(c.observed_price, prior.observed_price);
    assert.equal(c.official_price.observed_at, '2026-08-27');
  }
});
