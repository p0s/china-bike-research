import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadDataset, joinProducts, joinCatalogCandidates, validateDataset } from '../src/lib/data.mjs';
import { catalogSummaries, renderCandidateModel } from '../src/render.mjs';
import { translate } from '../assets/i18n.js';
const data = loadDataset();
const entry = joinCatalogCandidates(data).find(x => x.candidate.id === 'pardus-robin-sport-pes');
const source = data.sources.find(x => x.id === entry.candidate.geometry_evidence.source_id);
const rows = source.geometry_table.rows_as_printed;
const ctx = { data, products: joinProducts(data), posts: [], base: '', siteUrl: 'https://chinesebikes.xyz', repositoryUrl: 'https://github.com/p0s/china-bike-research' };
test('PES preserves all literal chart cells while excluding a conflict beyond rounding from derived fit', () => {
  assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'), '3f56c1bffae305dc397e22213c96a4ea48a4074d14c8ca24a85306ad46ffcd98');
  for (const i of [0, 1]) {
    const fc = rows['Front centre'][i], rc = rows.Chainstay[i], drop = rows['BB drop'][i];
    const minimum = Math.sqrt((fc - .5) ** 2 - (drop + .5) ** 2) + Math.sqrt((rc - .5) ** 2 - (drop + .5) ** 2);
    assert.ok(minimum > rows.Wheelbase[i] + .5, source.geometry_table.size_columns[i]);
  }
  assert.equal(entry.candidate.geometry_evidence.derived_fit_eligible, false);
  assert.equal(catalogSummaries(ctx).find(x => x.id === entry.id).geometryFitEligible, false);
  assert.deepEqual(validateDataset(data), []);
  const invalid = structuredClone(data);
  invalid.candidates.find(x => x.id === entry.candidate.id).geometry_evidence.derived_fit_eligible = true;
  assert.ok(validateDataset(invalid).some(x => /invalid geometry_evidence/.test(x)));
});
test('PES model warning is visible and localized while maximum, fitted tyres and printed cells remain separate', () => {
  const note = entry.candidate.geometry_evidence.note;
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const html = renderCandidateModel({ ...ctx, locale }, entry);
    assert.match(html, /class="geometry-evidence-warning" role="note"/);
    assert.ok(html.includes(translate(note, locale)), locale);
    if (locale !== 'en') assert.notEqual(translate(note, locale), note);
    assert.match(html, /974 \/ 981 \/ 986/);
    assert.match(html, /700×40C/);
    assert.match(html, /700×28C/);
  }
});
