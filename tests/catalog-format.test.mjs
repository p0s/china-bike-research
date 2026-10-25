import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogClearance, clearanceParts, weightParts, weightBasisLabel, unsupportedTireLayouts } from '../assets/catalog-format.js';
import { pricePopoverLines } from '../assets/price-display.js';
import { translate } from '../assets/i18n.js';

test('selected drivetrain uses its own maximum and never borrows an unknown limit', () => {
  const frame = { tireClearance: '38/32 mm (1×/2×)', tireClearanceMaxMm: 38, tireClearanceByDrivetrain: { single: 38, double: 32 } };
  assert.equal(catalogClearance(frame).sortValue, 38);
  assert.equal(catalogClearance(frame, 'single').sortValue >= 35, true);
  assert.equal(catalogClearance(frame, 'double').sortValue >= 35, false);
  const unknown = { ...frame, tireClearanceByDrivetrain: { single: 53, double: null } };
  assert.deepEqual(catalogClearance(unknown, 'double'), { label: 'unknown 2×', sortValue: 0 });
  assert.deepEqual(catalogClearance({ tireClearance: '40 mm fitted', tireClearanceMaxMm: null }, 'double'), { label: '40 mm fitted', sortValue: 0 });
});

test('wheel and drivetrain pairs have distinct visible meanings', () => {
  assert.deepEqual(clearanceParts('38/32 mm (1×/2×)'), { main: '38 mm 1×', sub: '32 mm 2×' });
  const wheels = catalogClearance({ tireClearanceByWheel: { front: 56, rear: 52 }, tireClearanceMaxMm: 52 });
  assert.deepEqual(clearanceParts(wheels.label), { main: '56 mm front', sub: '52 mm rear' });
  assert.equal(wheels.sortValue, 52);
  assert.deepEqual(clearanceParts('53/unknown mm (1×/2×)'), { main: '53 mm 1×', sub: 'unknown 2×' });
});

test('weight qualifier describes the default claim, not a later video observation', () => {
  assert.equal(weightParts('720 g frame', 'frameset', 'Size 54, unpainted, excluding paint and metal hardware').sub, 'bare frame');
  assert.equal(weightParts('850 g frame', 'frameset', 'Manufacturer minimum; finish unpublished. Video field report: a painted frame weighed 1,041 g.').sub, 'frame');
  assert.equal(weightParts('920 g frame', 'frameset', 'Painted frame including hardware, size 58').sub, 'painted frame');
});

test('compact price disclosure keeps the date and build split without truncating decimal amounts', () => {
  assert.deepEqual(pricePopoverLines({ priceDate: '2026-10-24', priceDetails: 'Frameset price: ¥2,512.50. Estimated complete adds ¥6,000 for the selected build. Coupon terms are kept in the full record.' }), [
    'Price observed 2026-10-24.', 'Frameset price: ¥2,512.50.', 'Estimated complete adds ¥6,000 for the selected build.'
  ]);
});

test('new fit and evidence controls translate in both supported locales', () => {
  for (const locale of ['zh-Hans', 'de']) {
    for (const text of ['Tire fit for', 'Any drivetrain', '1× drivetrain', '2× drivetrain', 'Full evidence', 'Full price record and conditions', 'Trade-offs and buying checks', 'bare frame', '56 mm front', 'unknown 2×', 'Buying checks (7)']) {
      assert.notEqual(translate(text, locale), text, `${locale}: ${text}`);
    }
  }
});


test('weight finish labels ignore separate claims and later observations', () => {
  assert.equal(weightBasisLabel('Finished size-M frame including hardware and paint; manufacturer tolerance ±50 g. Raw frame claim is 980 g ±50 g excluding hardware and paint.'), 'painted frame');
  assert.equal(weightBasisLabel('Painted size-M Sahara Nude storefront example. The separate unpainted size-M claim is 750 g.'), 'painted frame');
  assert.equal(weightBasisLabel('Exact manufacturer frame-only claim; a separate size-56 painted frameset-system value is 1.46 kg.'), '');
  assert.equal(weightBasisLabel('Finish unspecified. Video field reports: a painted frame was weighed.'), '');
  assert.equal(weightBasisLabel('Unpainted default. Reviewer weigh-ins (videos): painted hardware included.'), 'bare frame');
});

test('known unsupported drivetrains cannot inherit a platform maximum', () => {
  for (const compatibility of ['1x-only', { mechanical: { double: false }, electronic: { single: true, double: false } }]) {
    const item = { tireClearance: '55/50 mm', tireClearanceMaxMm: 50, tireClearanceByWheel: { front: 55, rear: 50 }, tireLayoutUnsupported: unsupportedTireLayouts(compatibility) };
    assert.deepEqual(catalogClearance(item, 'double'), { label: '2× unsupported', sortValue: 0, unsupported: true });
    assert.equal(catalogClearance(item, 'single').sortValue, 50);
  }
});

test('numeric drivetrain pairs survive localized legacy label strings', () => {
  const pair = { tireClearance: '50／45 mm（单盘／双盘）', tireClearanceMaxMm: 50, tireClearanceByDrivetrain: { single: 50, double: 45 } };
  assert.deepEqual(clearanceParts(catalogClearance(pair).label), { main: '50 mm 1×', sub: '45 mm 2×' });
  const unknown = { ...pair, tireClearance: '53/unbekannt mm (1×/2×)', tireClearanceByDrivetrain: { single: 53, double: null } };
  assert.deepEqual(clearanceParts(catalogClearance(unknown).label), { main: '53 mm 1×', sub: 'unknown 2×' });
});

test('price popovers preserve structured qualifiers even when full prose mentions them', () => {
  assert.deepEqual(pricePopoverLines({ priceDate: '2026-10-24', chinaPrice: { official: true, conditional: true }, priceDetails: 'Official store promotion; complete conditions in the full record.' }), ['Price observed 2026-10-24.', 'Official price', 'conditional']);
});
