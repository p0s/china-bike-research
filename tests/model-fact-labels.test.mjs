import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { renderModel, renderCandidateModel } from '../src/render.mjs';
import { escapeHtml } from '../src/lib/html.mjs';

const data = loadDataset(), products = joinProducts(data), candidates = joinCatalogCandidates(data);
const ctx = { data, products, base: '', siteUrl: 'https://example.invalid', repositoryUrl: 'https://github.com/p0s/china-bike-research', now: new Date('2026-10-05') };

test('alternative complete weight labels retain the literal value and conflicting basis in every language', () => {
  const entry = candidates.find(e => e.candidate.id === 'missing-china-price-van-rysel-rcr');
  for (const [locale, weight, basis, status] of [
    ['en', 'Alternative complete-weight reference', 'Alternative complete weight basis', 'Complete weight status'],
    ['zh-Hans', '另一整车重量参考', '备选整车重量依据', '整车重量状态'],
    ['de', 'Alternative Komplettgewichtsreferenz', 'Grundlage des alternativen Gesamtgewichts', 'Status des Gesamtgewichts']
  ]) {
    const html = renderCandidateModel({ ...ctx, locale }, entry);
    assert.ok(html.includes(`<dt>${weight}</dt><dd>${(entry.candidate.facts.complete_weight_alternative_g / 1000).toFixed(1)} kg</dd>`));
    assert.ok(html.includes(`<dt>${basis}</dt><dd>${escapeHtml(entry.candidate.facts.complete_weight_alternative_basis)}</dd>`));
    assert.ok(html.includes(`<dt>${status}</dt><dd>${escapeHtml(entry.candidate.facts.complete_weight_status)}</dd>`));
  }
});

test('new unmapped fact keys get readable labels while source values remain literal', () => {
  const entry = structuredClone(candidates.find(e => e.candidate.id === 'missing-china-price-van-rysel-rcr'));
  entry.candidate.facts.new_unmapped_fact_key = 'Original_value_WITH_underscores';
  const html = renderCandidateModel(ctx, entry);
  assert.match(html, /<dt>New unmapped fact key<\/dt><dd>Original_value_WITH_underscores<\/dd>/);
});

test('every model renders fact labels without raw underscore keys in all three languages', () => {
  assert.equal(products.length + candidates.length, 263);
  for (const locale of ['en', 'zh-Hans', 'de']) {
    for (const entry of [...products, ...candidates]) {
      const html = entry.variant ? renderModel({ ...ctx, locale }, entry) : renderCandidateModel({ ...ctx, locale }, entry);
      const facts = html.match(/<dl class="detail-list">([\s\S]*?)<\/dl>/g) ?? [];
      for (const section of facts) {
        const labels = [...section.matchAll(/<dt>([\s\S]*?)<\/dt>/g)].map(m => m[1]);
        assert.ok(labels.every(label => !label.includes('_')), `${locale}: ${entry.variant?.id ?? entry.candidate.id}`);
      }
    }
  }
});

// Label decoration must not promote previously detailed-only facts into the
// concise summary, whose selection still uses the original mapped labels.
test('humanizing detailed labels keeps summary membership unchanged', () => {
  const entry = candidates.find(e => e.candidate.id === 'icanian-p9');
  const html = renderCandidateModel(ctx, entry);
  const summary = html.match(/<dl class="model-facts">([\s\S]*?)<\/dl>/)[1];
  assert.doesNotMatch(summary, /27\.5×3\.0 or 29×2\.3/);
  assert.match(html, /<dt>Tire clearance<\/dt><dd>27\.5×3\.0 or 29×2\.3/);
});
