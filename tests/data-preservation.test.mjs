import test from 'node:test';
import assert from 'node:assert/strict';
import { preservationIssues, originalLinesRetained } from '../scripts/check-data-preservation.mjs';

test('additions retain original source links, facts and dated observations', () => {
  const before = { source_ids: ['official'], weight: 950, observations: [{ id: 'old', amount: 4200, date: '2026-08-06' }] };
  const after = { source_ids: ['new', 'official'], weight: 950, review: 'qualified', observations: [{ id: 'new', amount: 4500 }, { id: 'old', amount: 4200, date: '2026-08-06', note: 'historical' }] };
  assert.deepEqual(preservationIssues(before, after), []);
});

test('unchanged record counts cannot hide replaced facts or refreshed dates', () => {
  assert.equal(preservationIssues({ weight: 950, date: '2026-08-06' }, { weight: 900, date: '2026-09-30' }).length, 2);
});

test('record identity does not excuse a removed nested claim', () => {
  assert.equal(preservationIssues([{ id: 'frame', geometry: { wheelbase: 963.7 } }], [{ id: 'frame', geometry: {} }]).length, 1);
});

test('duplicate old observations each require a retained witness', () => {
  assert.equal(preservationIssues(['claim', 'claim'], ['claim']).length, 1);
});

test('changing unknowns or primitive types requires preservation too', () => {
  assert.equal(preservationIssues({ maximum: null, price: 4200 }, { maximum: 50, price: '4200' }).length, 2);
});

test('translations may be inserted without replacing or dropping original lines', () => {
  assert.equal(originalLinesRetained('dictionary\nold\nend\n', 'dictionary\nnew\nold\nend\n'), true);
  assert.equal(originalLinesRetained('dictionary\nold\nend\n', 'dictionary\nreplacement\nend\n'), false);
  assert.equal(originalLinesRetained('old\nold\n', 'old\n'), false);
});
