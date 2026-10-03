import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDestination, convertPrice, regionalPrice, selectRegionalOffer, formatMoneyRange, chinaDifference, DESTINATION_GROUPS } from '../assets/regional-prices.js';
import { chinaPriceBasis, regionalPricePayload, validateRegionalPricing } from '../src/lib/regional-prices.mjs';
import { loadDataset, joinProducts } from '../src/lib/data.mjs';
const data = loadDataset();
const payload = regionalPricePayload(data, '2026-10-03');
const product = joinProducts(data).find((item) => item.variant.id === 'sava-gelaro-s4-grx400');
const bike = { id: product.variant.id, priceLowCny: 12089, priceHighCny: 12089, chinaPrice: chinaPriceBasis(product.prices, payload.asOf) };
const preferences = (country, currency = 'USD', area = '') => ({ country, currency, area });

test('new delivery evidence is available under the actual UTC build cutoff', () => {
  const current = regionalPricePayload(data);
  for (const offer of current.offers.filter((item) => item.delivery)) assert.ok(offer.date <= current.asOf);
});

test('manual shipping destinations precede every inferred hint', () => {
  assert.deepEqual(resolveDestination({ requested: 'CA', stored: 'US', edgeCountry: 'DE', timeZone: 'Asia/Shanghai', languages: ['en-US'] }), { country: 'CA', reason: 'link' });
  assert.deepEqual(resolveDestination({ stored: 'GB', edgeCountry: 'DE' }), { country: 'GB', reason: 'saved' });
  assert.deepEqual(resolveDestination({ edgeCountry: 'DE', timeZone: 'Asia/Shanghai', languages: ['zh-CN'] }), { country: 'DE', reason: 'suggested' });
});
test('timezones only suggest countries and never treat a UTC offset as China', () => {
  assert.equal(resolveDestination({ timeZone: 'Asia/Shanghai', languages: ['en-US'] }).country, 'CN');
  assert.equal(resolveDestination({ timeZone: 'Asia/Singapore', languages: ['zh-CN'] }).country, 'SG');
  assert.equal(resolveDestination({ timeZone: 'Etc/GMT-8', languages: ['de'] }).country, '');
  assert.equal(resolveDestination({ languages: ['en-CA', 'en-US'] }).country, 'CA');
  assert.equal(resolveDestination({ requested: 'constructor', edgeCountry: 'XX' }).country, '');
  assert.equal(resolveDestination({ edgeCountry: 'SG', languages: ['en-US'] }).country, 'SG');
});
test('legacy country markets stay usable without inventing a country for Europe', () => {
  assert.deepEqual(resolveDestination({ legacyMarket: 'cn' }), { country: 'CN', reason: 'link' });
  assert.equal(resolveDestination({ legacyMarket: 'eu' }).country, '');
  const countries = Object.values(DESTINATION_GROUPS).flat();
  assert.equal(countries.length, new Set(countries).size);
});
test('display currency uses dated cross-rates independently of destination', () => {
  assert.equal(convertPrice(7574.8, 'CNY', 'EUR', payload.rates), 1000);
  assert.equal(convertPrice(1000, 'EUR', 'USD', payload.rates), 1129.8);
  assert.equal(convertPrice(null, 'CNY', 'EUR', payload.rates), null);
  assert.equal(convertPrice(100, 'ZZZ', 'EUR', payload.rates), null);
  assert.match(formatMoneyRange(1000, 1200, 'EUR', 'de', { approximate: true }), /^≈ .*€.*–.*€/);
});
test('China basis selects a genuine domestic observation, not the latest foreign conversion', () => {
  assert.equal(product.latestPrice.amount_cny, 12089);
  assert.equal(bike.chinaPrice.low, 7999);
  assert.equal(bike.chinaPrice.date, '2026-08-08');
  assert.equal(bike.chinaPrice.conditional, true);
  assert.equal(chinaPriceBasis([product.latestPrice]), null);
  assert.equal(chinaPriceBasis([{ amount_cny: 100, original_currency: 'USD', observed_at: '2026-10-03' }]), null);
  assert.equal(chinaPriceBasis([{ amount_cny: 100, observed_at: '2026-10-04' }], '2026-10-03'), null);
});
test('US delivery needs an explicit supported area; partial listings have no numeric budget total', () => {
  const partial = regionalPrice(bike, preferences('US'), payload);
  assert.equal(partial.state, 'partial');
  assert.equal(partial.listAmount, 1699);
  assert.equal(partial.low, null);
  assert.equal(partial.difference, null);
  const supported = regionalPrice(bike, preferences('US', 'USD', 'contiguous'), payload);
  assert.equal(supported.state, 'estimated');
  assert.equal(supported.low, 1699);
  // A conditional China offer cannot certify a delivered-price difference.
  assert.equal(supported.difference, null);
  assert.equal(regionalPrice(bike, preferences('US', 'USD', 'remote'), payload).state, 'unavailable');
});
test('destination restrictions override old broad EU observations', () => {
  const germany = regionalPrice(bike, preferences('DE', 'EUR'), payload);
  assert.equal(germany.state, 'unavailable');
  assert.equal(germany.low, null);
  assert.equal(germany.offer.id, 'sava-gelaro-s4-factory-delivery-2026-10-03');
  assert.equal(germany.difference, null);
  const denmark = regionalPrice(bike, preferences('DK', 'EUR'), payload);
  assert.equal(denmark.state, 'estimated');
  assert.equal(denmark.low, 1799 / 1.1298);
  assert.equal(regionalPrice(bike, preferences('IE', 'EUR'), payload).state, 'partial');
  assert.equal(regionalPrice(bike, preferences('CA', 'CAD'), payload).offer, null);
});
test('percentage denominator is delivered cost and handles higher China prices and ranges', () => {
  assert.deepEqual(chinaDifference(1600, 1600, 1200, 1200), { low: 25, high: 25 });
  assert.deepEqual(chinaDifference(1000, 1000, 1200, 1200), { low: -19.999999999999996, high: -19.999999999999996 });
  const range = chinaDifference(1500, 1600, 1000, 1200);
  assert.ok(Math.abs(range.low - 20) < 1e-8);
  assert.equal(range.high, 37.5);
  assert.equal(chinaDifference(0, 0, 100, 100), null);
  assert.equal(chinaDifference(null, 1600, 100, 100), null);
});
test('missing, stale and reference-only China evidence cannot produce a percentage', () => {
  for (const chinaPrice of [null, { ...bike.chinaPrice, date: '2026-06-01' }, { ...bike.chinaPrice, comparable: false }]) {
    assert.equal(regionalPrice({ ...bike, chinaPrice }, preferences('GB', 'GBP'), payload).difference, null);
  }
});
test('China buyers see a domestic value; missing domestic evidence remains unknown', () => {
  const cn = regionalPrice(bike, preferences('CN', 'CNY'), payload);
  assert.equal(cn.low, 7999);
  assert.equal(cn.offer, null);
  assert.equal(cn.difference, null);
  assert.equal(regionalPrice({ ...bike, chinaPrice: null }, preferences('CN', 'CNY'), payload).low, null);
});
test('unknown and partial delivery totals promote domestic references without inventing a budget total', () => {
  for (const destination of [preferences('DE', 'EUR'), preferences('US'), preferences('CA', 'CAD'), preferences('', 'USD')]) {
    const result = regionalPrice(bike, destination, payload);
    assert.equal(result.display.basis, 'china');
    assert.equal(result.display.low, convertPrice(7999, 'CNY', destination.currency, payload.rates));
    assert.equal(result.display.nativeLow, 7999);
    assert.equal(result.display.approximate, true);
    assert.equal(result.low, null);
    assert.equal(result.high, null);
    assert.equal(result.difference, null);
  }
  const delivered = regionalPrice(bike, preferences('US', 'USD', 'contiguous'), payload);
  assert.equal(delivered.display.basis, 'delivered');
  assert.equal(delivered.display.low, 1699);
});
test('foreign catalog references never become domestic China prices, including for China shoppers', () => {
  for (const country of ['DE', 'CN']) {
    const result = regionalPrice({ ...bike, chinaPrice: null }, preferences(country, 'USD'), payload);
    assert.equal(result.display.basis, 'reference');
    assert.equal(result.display.low, convertPrice(12089, 'CNY', 'USD', payload.rates));
    assert.equal(result.display.nativeLow, 12089);
    assert.equal(result.low, null);
    assert.equal(result.difference, null);
  }
});
test('frameset fallback shows the complete planning amount while keeping the frame quote separate', () => {
  const frame = { id: 'winspace-g5-frameset', estimated: true, frameLow: 14756, frameHigh: 14756 };
  const reference = regionalPrice(frame, preferences('US', 'USD', 'contiguous'), payload, 6000);
  assert.equal(reference.display.basis, 'build-reference');
  assert.equal(reference.display.nativeLow, 20756);
  assert.equal(reference.offer.amount, 2200);
  assert.equal(reference.low, null);
  const domestic = regionalPrice({ ...frame, chinaPrice: { ...bike.chinaPrice, low: 5000, high: 5500 } }, preferences('DE', 'EUR'), payload, 7000);
  assert.equal(domestic.display.basis, 'china-build');
  assert.equal(domestic.display.nativeLow, 12000);
  assert.equal(domestic.display.nativeHigh, 12500);
  assert.equal(domestic.display.low, convertPrice(12000, 'CNY', 'EUR', payload.rates));
  assert.equal(domestic.low, null);
  assert.equal(domestic.difference, null);
});
test('unavailable evidence remains empty even when the record has a numeric reference', () => {
  const result = regionalPrice({ ...bike, priceUnavailable: true }, preferences('DE', 'EUR'), payload);
  assert.equal(result.display.low, null);
  assert.equal(result.display.high, null);
});
test('frameset offers never become complete-build delivered prices or percentages', () => {
  const frame = { id: 'winspace-g5-frameset', estimated: true, frameLow: 14756, frameHigh: 14756 };
  const result = regionalPrice(frame, preferences('US', 'USD', 'contiguous'), payload, 6000);
  assert.equal(result.state, 'build-unknown');
  assert.equal(result.offer.amount, 2200);
  assert.equal(result.low, null);
  assert.equal(result.difference, null);
  assert.equal(result.referenceLow, 20756 / 7.5748 * 1.1298);
});
test('superseded and future prices never become current delivery quotes', () => {
  assert.equal(selectRegionalOffer(payload.offers, bike.id, 'US', 'complete-bike', '2026-10-01'), null);
  assert.equal(regionalPrice(bike, preferences('US'), { ...payload, asOf: '2027-01-03' }).offer, null);
  const unavailable = regionalPrice({ ...bike, priceUnavailable: true }, preferences('US', 'USD', 'contiguous'), payload);
  assert.equal(unavailable.low, null);
  assert.equal(unavailable.offer, null);
});
test('a documented all-charge delivery quote is distinct from a seller estimate', () => {
  const offer = structuredClone(payload.offers.find((item) => item.id === 'sava-gelaro-s4-us-delivery-2026-10-03'));
  offer.delivery.status = 'confirmed';
  offer.delivery.total_low = 1800;
  offer.delivery.total_high = 1800;
  const result = regionalPrice(bike, preferences('US', 'USD', 'contiguous'), { ...payload, offers: [offer] });
  assert.equal(result.state, 'confirmed');
  assert.equal(result.low, 1800);
});
test('validation rejects incomplete delivered claims and country/package mismatches', () => {
  assert.deepEqual(validateRegionalPricing(data), []);
  const broken = structuredClone(data);
  const offer = broken.prices.find((item) => item.delivery);
  offer.delivery.status = 'confirmed';
  offer.delivery.shipping_included = false;
  offer.delivery.country_ids = ['XX'];
  offer.package_kind = 'frameset';
  const errors = validateRegionalPricing(broken);
  assert.ok(errors.some((error) => error.includes('incomplete delivered total')));
  assert.ok(errors.some((error) => error.includes('confirmed totals need')));
  assert.ok(errors.some((error) => error.includes('invalid delivery country')));
  assert.ok(errors.some((error) => error.includes('package must match')));
});
test('native observations append without replacing CNY catalog or build history', () => {
  assert.equal(data.prices.filter((price) => !price.market_ids).length, 77);
  assert.ok(product.prices.every((price) => !price.market_ids));
  assert.equal(product.latestPrice.currency, 'CNY');
});
