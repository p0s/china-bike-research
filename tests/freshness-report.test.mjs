import test from 'node:test';
import assert from 'node:assert/strict';
import { freshnessReport, freshnessMarkdown } from '../src/lib/freshness-report.mjs';
import { loadDataset } from '../src/lib/data.mjs';

const empty = { sources: [], videos: [], images: [], opinions: [], brands: [], candidates: [], groupsets: [], tires: [] };
const fixture = {
  ...empty,
  prices: [
    { id: 'old-catalog', variant_id: 'bike-a', observed_at: '2026-05-01', currency: 'CNY', amount_cny: 5000 },
    { id: 'offer-lapsing', variant_id: 'bike-a', observed_at: '2026-10-02', market_ids: ['us'], currency: 'USD', amount: 1699 },
    { id: 'offer-old', variant_id: 'bike-b', observed_at: '2026-08-01', market_ids: ['eu'], currency: 'EUR', amount: 1500 },
    { id: 'offer-replaced', variant_id: 'bike-b', observed_at: '2026-06-01', market_ids: ['eu'], currency: 'EUR', amount: 1400 },
    { id: 'offer-newer', variant_id: 'bike-b', observed_at: '2026-12-01', market_ids: ['eu'], currency: 'EUR', amount: 1450, supersedes: ['offer-replaced'] }
  ],
  wheelsets: [{ id: 'wheel-a', name: 'Wheel A', price_observations: [{ observed_at: '2026-07-01', amount: 1289, currency: 'USD' }] }],
  shoppingLinks: [{ name: 'Store', currency: 'USD', links: [{ record_id: 'bike-a', checked_at: '2026-11-06', price_low: 1299 }] }],
  exchangeRates: [{ id: 'ecb-old', rate_date: '2026-10-01', per_eur: { EUR: 1, USD: 1.1 } }, { id: 'ecb-new', rate_date: '2026-11-12', per_eur: { EUR: 1, USD: 1.1 } }]
};

test('the freshness report covers prices, component observations, store links, rates and lapsing offers', () => {
  const report = freshnessReport(fixture, new Date('2026-12-15T00:00:00Z'));
  const area = (name) => report.areas.find((item) => item.area === name);
  assert.equal(area('Catalog price').olderThan90Days, 1);
  assert.equal(area('Wheelset price').olderThan90Days, 1, 'component prices are covered, not only catalog prices');
  assert.equal(area('Store link').total, 1);
  assert.equal(report.exchangeRates.id, 'ecb-new');
  assert.equal(report.exchangeRates.freshness.days, 33);
  // Offers are selected for 90 days: one has lapsed, one lapses within 30 days, a superseded one is not reported.
  assert.deepEqual(report.offers.map((offer) => [offer.label, offer.selectedUntil, offer.expired]), [
    ['offer-old', '2026-10-30', true],
    ['offer-lapsing', '2026-12-31', false]
  ]);
  const markdown = freshnessMarkdown(report);
  assert.match(markdown, /Newest exchange-rate snapshot: 2026-11-12 \(33 days old\)/);
  assert.match(markdown, /\| Wheelset price \| wheel-a \| Wheel A \| USD 1289 \| 2026-07-01 \| 167 days \| Historical \|/);
  assert.match(markdown, /\| offer-old \| bike-b \| 2026-08-01 \| 2026-10-30 \| No longer selected \|/);
});

test('the freshness report reads the real dataset without refreshing any date', () => {
  const data = loadDataset();
  const before = JSON.stringify(data.prices);
  const report = freshnessReport(data, new Date('2026-11-13T00:00:00Z'));
  for (const name of ['Catalog price', 'Research-profile price', 'Groupset price', 'Wheelset price', 'Tire price', 'Store link', 'Exchange rates', 'Regional offer']) {
    assert.ok(report.areas.find((item) => item.area === name)?.total > 0, name);
  }
  assert.equal(JSON.stringify(data.prices), before);
});
