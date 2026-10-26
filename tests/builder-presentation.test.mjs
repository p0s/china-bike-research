import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialBuildPresentation, buildComposition } from '../assets/builder-presentation.js';
import { restoreBuildState } from '../assets/state-utils.js';
import { loadDataset, joinProducts } from '../src/lib/data.mjs';
import { renderBikeBuilder } from '../src/render.mjs';

const data = {
  slots: ['drivetrain', 'brakes', 'saddle'],
  bases: [{ id: 'frame', kind: 'frameset', priceLow: 100, baseWeightG: 1000 }],
  parts: [{ id: 'package', slot: 'drivetrain', default: true, maker: 'Maker', name: 'Package', covers: ['brakes'], priceCny: 10, weightG: 200, priceDate: '2026-08-01', weightBasis: 'Claimed package weight' }]
};

test('initial frameset presentation counts the package once and retains unknown remainder and parts', () => {
  const before = structuredClone(data);
  const view = initialBuildPresentation(data);
  assert.equal(view.price, '¥110 known + 1 unknown');
  assert.equal(view.weight, '1.20 kg known + 2 unknown');
  assert.equal(view.rows.get('brakes').weight, 'Counted once');
  assert.equal(view.rows.get('saddle').customHidden, false);
  assert.equal(view.state.baseCustom.packageWeight, '');
  assert.match(view.rows.get('drivetrain').basis, /2026-08-01.*Claimed package weight/);
  assert.deepEqual(data, before);
});

test('initial complete-bike presentation retains included parts without adding package totals', () => {
  const complete = { ...data, bases: [{ id: 'bike', kind: 'complete-bike', priceLow: 500, baseWeightG: 7000 }] };
  const view = initialBuildPresentation(complete);
  assert.equal(view.price, '¥500');
  assert.equal(view.weight, '7.00 kg');
  assert.equal(view.rows.get('drivetrain').included, true);
  assert.equal(view.completeness, 'Purchase price and every replacement weight delta are resolved.');
});

test('static defaults do not alter restored explicit or unavailable starting points', () => {
  initialBuildPresentation(data);
  const explicit = restoreBuildState(data, new URLSearchParams('base=frame&packageWeight=0&part-saddle=custom&price-saddle=0'));
  assert.equal(explicit.baseCustom.packageWeight, '0');
  assert.equal(explicit.custom.saddle.price, '0');
  const unavailable = restoreBuildState(data, new URLSearchParams('base=missing-frame'));
  assert.equal(unavailable.requestedBaseId, 'missing-frame');
  assert.equal(unavailable.unavailableStartingPoint, true);
});

test('a complete-bike initial base keeps every included option selected in the static HTML', () => {
  const catalog = loadDataset();
  const product = joinProducts(catalog).find(item => item.variant.kind === 'complete-bike');
  const html = renderBikeBuilder({ data: catalog, products: [product], base: '', locale: 'en', siteUrl: 'https://example.invalid', repositoryUrl: 'https://github.com/p0s/china-bike-research' });
  assert.equal((html.match(/<option value="included" selected>/g) ?? []).length, catalog.buildParts.length ? 15 : 0);
  assert.match(html, /data-build-summary-kicker>Purchase \+ upgrades<\/span>/);
  assert.match(html, /data-build-package-weight-field hidden/);
});

test('the static builder is a named disabled preview until shared-state initialization succeeds', () => {
  const catalog = loadDataset();
  const products = joinProducts(catalog);
  for (const [locale, preview, ready, qualification] of [
    ['en', 'Static default preview', 'Editing ready', 'Editing, shared links and saved drafts require JavaScript to finish loading.'],
    ['zh-Hans', '默认配置的静态预览', '已可编辑', '编辑功能、分享链接及已保存草稿须等待 JavaScript 加载完成。'],
    ['de', 'Statische Vorschau der Standardkonfiguration', 'Bearbeitung bereit', 'Bearbeitung, geteilte Links und gespeicherte Entwürfe benötigen vollständig geladenes JavaScript.']
  ]) {
    const html = renderBikeBuilder({ data: catalog, products, base: '', locale, siteUrl: 'https://example.invalid', repositoryUrl: 'https://github.com/p0s/china-bike-research' });
    assert.match(html, /<fieldset[^>]*data-bike-builder disabled aria-describedby="builder-preview-note">/);
    assert.ok(html.includes(`<strong data-build-static-label>${preview}</strong>`));
    assert.ok(html.includes(`<strong data-build-ready-label aria-hidden="true">${ready}</strong>`));
    assert.ok(html.includes(qualification));
    assert.match(html, /data-build-total-price>[^<]+<\/dd>/, 'the labeled default remains readable');
  }
});

test('planner lists base facts as rows, offers jumps to missing inputs and keeps the base on reset', () => {
  const catalog = loadDataset();
  const products = joinProducts(catalog);
  const html = renderBikeBuilder({ data: catalog, products, base: '', locale: 'en', siteUrl: 'https://example.invalid', repositoryUrl: 'https://github.com/p0s/china-bike-research' });
  assert.match(html, /<dl class="builder-base-facts" data-build-base-facts><div><dt>Type<\/dt><dd>/);
  assert.match(html, /<div class="build-todo" data-build-todo hidden><p data-build-todo-price><strong>Prices to enter<\/strong><\/p><p data-build-todo-weight><strong>Weights to enter<\/strong><\/p><\/div>/);
  assert.match(html, /data-build-reset>Reset parts</);
  const script = readFileSync(new URL('../assets/site.js', import.meta.url), 'utf8');
  const reset = script.slice(script.indexOf("root.querySelector('[data-build-reset]')"), script.indexOf("addEventListener('popstate', () => {\n    state = restoreBuildState"));
  assert.doesNotMatch(reset, /state\.baseId = firstBaseId/, 'reset must not switch the chosen starting point');
  assert.doesNotMatch(reset, /state\.baseCustom = /, 'reset keeps the entered base quote and weights');
  assert.match(script, /function renderTodo\(missingPrices, missingWeights, isComplete\)/);
});

test('composition marks converted price groups as approximate and keeps unknowns out of the sum', () => {
  const composition = buildComposition({
    isComplete: false, basePrice: 150, basePriceConverted: true, baseWeight: 1000,
    slots: [
      { slot: 'drivetrain', state: 'known', price: 300, priceConverted: false, weight: 2400 },
      { slot: 'wheelset', state: 'partial', price: 1300, priceConverted: true, weight: null },
      { slot: 'saddle', state: 'open', price: null, priceConverted: false, weight: null }
    ]
  });
  const segment = (id) => composition.price.segments.find((item) => item.id === id);
  assert.deepEqual([segment('base').approximate, segment('drivetrain').approximate, segment('wheels').approximate, segment('finishing').approximate], [true, false, true, false]);
  assert.equal(composition.price.known, 1750);
  assert.equal(composition.price.unknown, 1);
  assert.equal(composition.weight.segments.every((item) => !item.approximate), true);
});

test('the static planner names its yuan default, every supported currency and the dated rate', () => {
  const catalog = loadDataset();
  const products = joinProducts(catalog);
  const ctx = { data: catalog, products, base: '', siteUrl: 'https://example.invalid', repositoryUrl: 'https://github.com/p0s/china-bike-research' };
  const html = renderBikeBuilder({ ...ctx, locale: 'en' });
  const payload = JSON.parse(html.match(/id="build-configurator-data">([\s\S]*?)<\/script>/)[1]);
  assert.equal(payload.schemaVersion, 2);
  assert.match(payload.rates.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(payload.rates.perEur.EUR, 1);
  assert.ok(payload.rates.perEur.CNY > 0 && payload.rates.perEur.USD > 0);
  assert.match(html, /<label class="builder-currency"><span>Currency<\/span><select data-build-currency><option value="EUR">EUR<\/option><option value="USD">USD<\/option><option value="GBP">GBP<\/option><option value="CAD">CAD<\/option><option value="MXN">MXN<\/option><option value="CNY" selected>CNY<\/option><\/select><\/label>/);
  assert.match(html, /<dt data-build-total-label>(?:Full build price|Purchase \+ upgrades)<\/dt>/);
  assert.ok(html.includes(`<time datetime="${payload.rates.date}">${payload.rates.date}</time>`));
  assert.match(html, /data-build-currency-note hidden>/);
  assert.match(html, /<span data-build-price-label>Price<\/span> <span class="builder-currency-code" data-build-price-currency>CNY<\/span><\/span><input type="number" min="0" max="200000" step="any" inputmode="decimal" data-build-custom-price>/);
  assert.match(html, /Base price <span class="builder-currency-code" data-build-base-price-currency>CNY<\/span>/);
  for (const [locale, label, note] of [['es', 'Moneda', 'Los importes conservan la moneda'], ['ru', 'Валюта', 'Суммы сохраняют валюту'], ['de', 'Währung', 'Beträge behalten die Währung'], ['zh-Hans', '币种', '金额保留记录或输入时的币种']]) {
    const localized = renderBikeBuilder({ ...ctx, locale });
    assert.ok(localized.includes(`<label class="builder-currency"><span>${label}</span>`), locale);
    assert.ok(localized.includes(note), locale);
  }
});
