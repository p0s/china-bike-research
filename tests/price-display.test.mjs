import test from 'node:test';
import assert from 'node:assert/strict';
import { priceDisplay, priceAgeLabel } from '../assets/price-display.js';
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
    assert.match(shown.basis, /2026-10-01/);
    assert.equal(shown.tone, 'attention');
    assert.doesNotMatch(shown.headline, /479[.,]89/);
  }
  assert.match(formatMoneyRange(3199.25, 3199.25, 'CNY', 'en', { exact: true }), /3,199.25/);
});

test('delivered totals lead the shared display and keep their own evidence date', () => {
  const result = { display: { low: 1700, high: 1700, basis: 'delivered', approximate: true },
    state: 'estimated', offer: { date: '2026-10-02' }, china: item.chinaPrice };
  const shown = priceDisplay(result, { currency: 'USD' });
  assert.equal(shown.headline, '≈ $1,700');
  assert.match(shown.basis, /^Delivered, seller estimate · 2026-10-02 · China price/);
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
  assert.match(priceDisplay(result, { currency: 'EUR', referenceDate: '2026-09-15', referenceLabel: 'Official FX estimate' }).basis, /Official FX estimate.*2026-09-15/);
  assert.equal(priceDisplay({ display: { low: null, high: null } }).headline, '—');
  assert.equal(priceAgeLabel('2026-06-01', '2026-10-13'), '4 mo old');
});
