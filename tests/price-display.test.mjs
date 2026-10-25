import test from 'node:test';
import assert from 'node:assert/strict';
import { priceDisplay, priceAgeLabel, priceEvidenceLines, compactPriceBasis } from '../assets/price-display.js';
import { regionalPrice, formatMoneyRange } from '../assets/regional-prices.js';
import { translate } from '../assets/i18n.js';

const rates = { per_eur: { CNY: 8, EUR: 1, USD: 1.2 } };
const item = { id: 'example', priceLowCny: 3200, priceHighCny: 3200,
  chinaPrice: { low: 3199.25, high: 3199.25, date: '2026-10-01', conditional: true, comparable: true } };
const payload = { rates, offers: [], asOf: '2026-10-13' };

test('China references remain sortable separately without becoming overseas budget totals', () => {
  const result = regionalPrice(item, { country: 'HK', currency: 'USD' }, payload);
  assert.equal(result.low, null);
  assert.equal(result.high, null);
  assert.equal(result.chinaTotal.low, 3199.25 / 8 * 1.2);
  assert.equal(result.display.basis, 'china');
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const shown = priceDisplay(result, { currency: 'USD', locale, translate });
    assert.doesNotMatch(shown.basis, /2026-10-01/);
    assert.equal(shown.date, '2026-10-01');
    assert.equal(shown.tone, '');
    assert.doesNotMatch(shown.headline, /479[.,]89/);
  }
  assert.match(formatMoneyRange(3199.25, 3199.25, 'CNY', 'en', { exact: true }), /3,199.25/);
});

test('delivered totals lead the shared display and keep their own evidence date', () => {
  const result = { display: { low: 1700, high: 1700, basis: 'delivered', approximate: true },
    state: 'estimated', offer: { date: '2026-10-02' }, china: item.chinaPrice };
  const shown = priceDisplay(result, { currency: 'USD' });
  assert.equal(shown.headline, '≈ $1,700');
  assert.match(shown.basis, /^Delivered, seller estimate · China price/);
  assert.equal(shown.date, '2026-10-02');
  assert.doesNotMatch(shown.basis, /2026-10-02/);
  assert.equal(shown.tone, 'attention');
});

test('partial and starting prices stay out of China reference sorting and budgets', () => {
  for (const flag of ['partial', 'starting']) {
    const result = regionalPrice({ ...item, chinaPrice: { ...item.chinaPrice, [flag]: true } }, { country: 'CN', currency: 'CNY' }, payload);
    assert.equal(result.chinaTotal.low, null);
    assert.equal(result.low, null);
    assert.match(priceDisplay(result).basis, flag === 'partial' ? /total incomplete/ : /package unknown/);
  }
});

test('missing and reference-only prices preserve unknown totals and original dates', () => {
  const result = regionalPrice({ ...item, chinaPrice: null }, { country: 'DE', currency: 'EUR' }, payload);
  assert.equal(result.chinaTotal.low, null);
  assert.equal(result.low, null);
  const shown = priceDisplay(result, { currency: 'EUR', referenceDate: '2026-09-15', referenceLabel: 'Official FX estimate' });
  assert.match(shown.basis, /Official FX estimate/);
  assert.doesNotMatch(shown.basis, /2026-09-15/);
  assert.equal(shown.date, '2026-09-15');
  assert.equal(priceDisplay({ display: { low: null, high: null } }).headline, '—');
  assert.equal(priceAgeLabel('2026-06-01', '2026-10-13'), '4 mo old');
});


test('compact price rows retain dates and conditions in evidence without repetition', () => {
  const item = { priceDate: '2026-10-24', priceDetails: 'Coupon required; shipping excluded.' };
  assert.deepEqual(priceEvidenceLines(item), ['Price observed 2026-10-24.', item.priceDetails]);
  const dated = { ...item, priceDetails: 'Price observed 2026-10-24. Coupon required.' };
  assert.deepEqual(priceEvidenceLines(dated), ['Price observed 2026-10-24.', 'Coupon required.']);
  assert.equal(translate(priceEvidenceLines(dated)[0], 'de'), 'Preis erfasst am 2026-10-24.');
  assert.equal(translate(priceEvidenceLines(dated)[0], 'zh-Hans'), '报价记录于 2026-10-24。');
  assert.equal(compactPriceBasis('Historical · 2026-10-24 · conditional · 4 mo old'), 'Historical');
  assert.equal(priceDisplay({ display: {} }, { fallback: { headline: '—', basis: 'Historical · 2026-10-24' } }).basis, 'Historical');
});

test('secondary price qualifiers stay in details while incomplete totals stay visible', () => {
  const observed = { ...item, priceDate: '2026-06-01', priceDetails: 'Coupon required; shipping excluded.', chinaPrice: { ...item.chinaPrice, official: true, date: '2026-06-01' } };
  const result = regionalPrice(observed, { country: 'CN', currency: 'CNY' }, payload);
  const shown = priceDisplay(result, { today: '2026-10-25' });
  assert.equal(shown.basis, '');
  assert.equal(shown.tone, '');
  assert.equal(shown.stale, true);
  assert.deepEqual(priceEvidenceLines(observed), ['Price observed 2026-06-01.', 'Official price', 'Coupon required; shipping excluded.']);
  const converted = priceDisplay(regionalPrice(observed, { country: 'US', currency: 'USD' }, payload), { currency: 'USD', today: '2026-10-25' });
  assert.match(converted.basis, /^China ¥/);
  assert.doesNotMatch(converted.basis, /conditional|mo old|Official/);
  const frame = regionalPrice({ ...observed, estimated: true, frameLow: 3199.25 }, { country: 'CN', currency: 'CNY' }, payload, 6000);
  assert.match(priceDisplay(frame).headline, /^Est\./);
  assert.equal(priceDisplay(frame).basis, '');
});
