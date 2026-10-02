import test from 'node:test';
import assert from 'node:assert/strict';
import { marketForCountry, resolvePriceMarket, convertPrice, regionalPrice, selectRegionalOffer, formatMoneyRange } from '../assets/regional-prices.js';
import { regionalPricePayload, validateRegionalPricing } from '../src/lib/regional-prices.mjs';
import { loadDataset, joinProducts } from '../src/lib/data.mjs';
const data = loadDataset();
const payload = regionalPricePayload(data, '2026-10-02');
const bike = { id: 'sava-gelaro-s4-grx400', priceLowCny: 12089, priceHighCny: 12089 };
const frame = { id: 'winspace-g5-frameset', estimated: true, frameLow: 14914, frameHigh: 14914 };

test('explicit shopping choices precede country and browser hints', () => {
  assert.deepEqual(resolvePriceMarket({ requested: 'ca', stored: 'us', edgeCountry: 'DE', languages: ['en-US'] }), { market: 'ca', reason: 'link' });
  assert.deepEqual(resolvePriceMarket({ stored: 'gb', edgeCountry: 'DE' }), { market: 'gb', reason: 'saved' });
  assert.deepEqual(resolvePriceMarket({ edgeCountry: 'DE', languages: ['en-US'] }), { market: 'eu', reason: 'site' });
  assert.deepEqual(resolvePriceMarket({ languages: ['en-CA', 'en-US'] }), { market: 'ca', reason: 'browser' });
  assert.deepEqual(resolvePriceMarket({ requested: 'constructor', stored: 'bad', languages: ['not-a-locale', 'de'] }), { market: 'eu', reason: 'default' });
  assert.deepEqual(resolvePriceMarket({ edgeCountry: 'SG', languages: ['en-US'] }), { market: 'cn', reason: 'default' });
});

test('Europe and North America retain meaningful country and currency distinctions', () => {
  for (const [country, market] of [['DE', 'eu'], ['PL', 'eu'], ['GB', 'gb'], ['CH', 'europe'], ['NO', 'europe'], ['US', 'us'], ['CA', 'ca'], ['MX', 'mx'], ['PR', 'north-america'], ['CN', 'cn']]) assert.equal(marketForCountry(country), market);
  assert.equal(marketForCountry('XX'), null);
});

test('conversion uses dated ECB cross-rates, retaining unknowns and native currency', () => {
  assert.equal(convertPrice(7574.8, 'CNY', 'EUR', payload.rates), 1000);
  assert.equal(convertPrice(1000, 'EUR', 'USD', payload.rates), 1129.8);
  assert.equal(convertPrice(1699, 'USD', 'USD', null), 1699);
  assert.equal(convertPrice(null, 'CNY', 'EUR', payload.rates), null);
  assert.equal(convertPrice(100, 'ZZZ', 'EUR', payload.rates), null);
  assert.match(formatMoneyRange(1000, 1200, 'EUR', 'de', { approximate: true }), /^≈ .*€.*–.*€/);
});

test('exact US complete-bike listing replaces conversion; Canada cannot inherit it', () => {
  const us = regionalPrice(bike, 'us', payload, 5000);
  assert.equal(us.low, 1699);
  assert.equal(us.high, 1699);
  assert.equal(us.basis, 'offer');
  assert.equal(us.converted, false);
  const eu = regionalPrice(bike, 'eu', payload, 5000);
  assert.equal(eu.low, 1799 / 1.1298);
  assert.equal(eu.basis, 'offer');
  assert.equal(eu.converted, true); // The regional listing is USD, never invented EUR checkout evidence.
  const ca = regionalPrice(bike, 'ca', payload, 5000);
  assert.equal(ca.offer, null);
  assert.equal(ca.basis, 'catalog-reference');
  assert.equal(ca.low, 12089 / 7.5748 * 1.6095);
});

test('frame sticker offers never replace comparable complete-build references', () => {
  const result = regionalPrice(frame, 'us', payload, 5000);
  assert.equal(result.offer.amount, 2200);
  assert.equal(result.basis, 'build-reference');
  assert.equal(result.low, 19914 / 7.5748 * 1.1298);
  assert.notEqual(result.low, 2200);
  assert.equal(regionalPrice(frame, 'us', payload, 0).low, 14914 / 7.5748 * 1.1298);
  assert.equal(regionalPrice({ ...frame, priceUnavailable: true }, 'us', payload, 5000).low, null);
});

test('future and old offers fall back rather than becoming current quotes', () => {
  assert.equal(selectRegionalOffer(payload.offers, bike.id, 'us', 'complete-bike', '2026-10-01'), null);
  const old = regionalPrice(bike, 'us', { ...payload, asOf: '2027-01-01' }, 5000);
  assert.equal(old.offer, null);
  assert.equal(old.basis, 'catalog-reference');
});

test('new native offers cannot overwrite the existing CNY price history', () => {
  assert.deepEqual(validateRegionalPricing(data), []);
  const product = joinProducts(data).find((item) => item.variant.id === bike.id);
  assert.equal(product.latestPrice.currency, 'CNY');
  assert.ok(product.prices.every((price) => !price.market_ids));
  const broken = structuredClone(data);
  broken.prices.find((price) => price.market_ids).package_kind = 'frameset';
  assert.ok(validateRegionalPricing(broken).some((error) => error.includes('package must match')));
  broken.exchangeRates[0].per_eur.CAD = -1;
  assert.ok(validateRegionalPricing(broken).some((error) => error.includes('invalid CAD')));
});
