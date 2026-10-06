import test from 'node:test';
import assert from 'node:assert/strict';
import { initialBuildPresentation } from '../assets/builder-presentation.js';
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
