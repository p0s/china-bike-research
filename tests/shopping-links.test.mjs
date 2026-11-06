import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, joinCatalogCandidates, validateDataset } from '../src/lib/data.mjs';
import { SHOPPING_DISCLOSURE, shoppingLinksFor, validateShoppingLinks } from '../src/lib/shopping-links.mjs';
import { renderHome, renderModel, renderCandidateModel, renderElectronicGroupsets, renderMethodology, renderPrivacy } from '../src/render.mjs';

const data = loadDataset();
const products = joinProducts(data);
const candidates = joinCatalogCandidates(data);
const context = {
  data,
  products,
  base: '/china-bike-research',
  repositoryUrl: 'https://github.com/example/china-bike-research',
  siteUrl: 'https://example.github.io',
  now: new Date('2026-11-06T00:00:00Z')
};
const merchant = data.shoppingLinks.find((item) => item.id === 'twitter-bikes-usa');
const linkFor = (type, id) => merchant.links.find((link) => link.record_type === type && link.record_id === id);
const sponsoredLinks = (html) => html.match(/<a [^>]*rel="sponsored noreferrer"[^>]*>/g) ?? [];
const jsonLd = (html) => (html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) ?? []).join('');
// Validation runs against a copy so a deliberate defect never leaks into the shared dataset.
const withLinks = (mutate) => {
  const copy = structuredClone(merchant);
  mutate(copy);
  return validateShoppingLinks({ ...data, shoppingLinks: [copy] }, '2026-11-06');
};

test('store links validate against exact current records and the store referral format', () => {
  assert.deepEqual(validateShoppingLinks(data, '2026-11-06'), []);
  assert.deepEqual(validateDataset(data), []);
  for (const link of merchant.links) {
    const target = new URL(link.url);
    assert.equal(`${target.origin}${target.pathname}`, link.product_url);
    assert.deepEqual([...target.searchParams.keys()], [merchant.referral_parameter]);
  }
  assert.match(withLinks((copy) => { copy.links[0].url += '&utm_source=site'; }).join(), /only the referral parameter/);
  assert.match(withLinks((copy) => { copy.links[0].url = copy.links[0].url.replace(/=[^=]+$/, '=otherCode1'); }).join(), /different referral codes/);
  assert.match(withLinks((copy) => { copy.links[0].record_id = 'twitter-v3-2024-rs-sensah-alloy'; }).join(), /superseded generations get no store link/);
  assert.match(withLinks((copy) => { delete copy.links[0].store_option; }).join(), /exact builds need the store option/);
  assert.match(withLinks((copy) => { copy.links[0].checked_at = '2026-11-07'; }).join(), /invalid checked_at/);
  assert.match(withLinks((copy) => { copy.links[0].product_url = 'https://example.com/products/x'; }).join(), /canonical https product page/);
  assert.match(withLinks((copy) => { copy.relationship = 'partner'; }).join(), /disclosed as commission/);
  assert.match(withLinks((copy) => { copy.links.push(copy.links[0]); }).join(), /duplicate link/);
});

test('model pages show one disclosed store link beside the purchase route, outside structured data', () => {
  const product = products.find((item) => item.variant.id === 'twitter-v3-wheeltop-eds');
  const link = linkFor('variant', 'twitter-v3-wheeltop-eds');
  const html = renderModel(context, product);
  assert.deepEqual(sponsoredLinks(html), [`<a href="${link.url}" rel="sponsored noreferrer">`]);
  assert.match(html, /<dt>Where to buy<\/dt><dd><span class="shop-link">/);
  assert.ok(html.includes('<strong>US$1,489–1,529</strong>'));
  assert.ok(html.includes('<span>Store option:</span> <span class="shop-link-option" data-original-language>WheelTop EDS TX 2*12 Speed (Wireless)</span>'));
  assert.ok(html.includes('<span>Price observed 2026-11-06.</span>'));
  assert.ok(html.includes(SHOPPING_DISCLOSURE));
  assert.match(html, /<a href="#model-purchase-route">Purchase route and checks<\/a>/);
  // The referral link is never a citation, offer or structured-data fact.
  assert.equal(jsonLd(html).includes('bg_ref'), false);
  assert.equal(/"@type":"Offer"/.test(jsonLd(html)), false);
  assert.equal((html.match(/bg_ref=/g) ?? []).length, 1);
  for (const locale of ['zh-Hans', 'de']) {
    const localized = renderModel({ ...context, locale }, product);
    assert.equal(sponsoredLinks(localized).length, 1, locale);
    assert.equal(localized.includes(SHOPPING_DISCLOSURE), false, locale);
    assert.ok(localized.includes('WheelTop EDS TX 2*12 Speed (Wireless)'), locale);
  }
  assert.ok(renderModel({ ...context, locale: 'zh-Hans' }, product).includes('通过此链接购买，我们可能获得佣金；这不影响我们的比较。'));
  assert.ok(renderModel({ ...context, locale: 'de' }, product).includes('Bei Käufen über diesen Link erhalten wir möglicherweise eine Provision.'));
});

test('only exact matches get store links; superseded and unmatched records keep none', () => {
  const superseded = products.find((item) => item.variant.id === 'twitter-v3-2024-rs-sensah-alloy');
  assert.equal(sponsoredLinks(renderModel(context, superseded)).length, 0);
  const other = products.find((item) => item.variant.id === 'camp-gx600-pes');
  assert.equal(sponsoredLinks(renderModel(context, other)).length, 0);
  const unresolved = candidates.find((entry) => entry.candidate.id === 'twitter-r10-pro-gen3');
  assert.equal(sponsoredLinks(renderCandidateModel(context, unresolved)).length, 0);
  // Both records of one exact build point to the same store option.
  assert.equal(linkFor('variant', 'twitter-cyclone-electronic').url, linkFor('variant', 'twitter-cyclone-gen3-et').url);
  assert.equal(shoppingLinksFor(data, 'variant', 'twitter-v3-rs-sensah').length, 1);
});

test('research profiles name their match scope and model-level links start from the lowest build', () => {
  const x7 = candidates.find((entry) => entry.candidate.id === 'twitter-x7');
  const html = renderCandidateModel(context, x7);
  assert.equal(sponsoredLinks(html).length, 1);
  assert.match(html, /<dt>Where to buy<\/dt><dd><span class="shop-link">/);
  assert.ok(html.includes('<strong>from US$1,949</strong>'));
  assert.ok(html.includes('The store lists five X7 builds; the retained prices on this profile are not matched to one of them.'));
  assert.ok(renderCandidateModel({ ...context, locale: 'zh-Hans' }, x7).includes('US$1,949 起'));
  const r18 = candidates.find((entry) => entry.candidate.id === 'cyctrac-r18');
  assert.ok(renderCandidateModel(context, r18).includes('SHIMANO 105 Di2 R7170 - 2×12 Speed'));
});

test('the groupset reference links the exact package in its row details in every interface language', () => {
  const link = linkFor('groupset', 'wheeltop-eds-tx');
  const english = renderElectronicGroupsets(context);
  assert.deepEqual(sponsoredLinks(english), [`<a href="${link.url}" rel="sponsored noreferrer">`]);
  assert.match(english, /<section><h3>Where to buy<\/h3><span class="shop-link">/);
  assert.ok(english.includes('<strong>US$510</strong>'));
  for (const [locale, disclosure] of [['es', 'Podemos ganar una comisión'], ['ru', 'Мы можем получить комиссию'], ['de', 'Bei Käufen über diesen Link'], ['zh-Hans', '我们可能获得佣金']]) {
    const localized = renderElectronicGroupsets({ ...context, locale });
    assert.equal(sponsoredLinks(localized).length, 1, locale);
    assert.ok(localized.includes(disclosure), locale);
  }
});

test('catalog rows, comparison data and rankings carry no store links', () => {
  const home = renderHome({ ...context, siteLastmod: '2026-11-06' });
  assert.equal(home.includes('bg_ref'), false);
  assert.equal(home.includes('sponsored'), false);
});

test('methodology and privacy explain store links once', () => {
  const methodology = renderMethodology(context);
  assert.match(methodology, /<h2 id="store-links">Store links<\/h2>/);
  assert.match(methodology, /Store links do not change which bikes are listed, their order, catalog prices, verdicts or buying checks\./);
  const privacy = renderPrivacy(context);
  assert.match(privacy, /<h2 id="store-links">Store links<\/h2>/);
  assert.match(privacy, /does not count clicks on them/);
  for (const locale of ['zh-Hans', 'de']) {
    assert.equal(renderMethodology({ ...context, locale }).includes('Store links do not change'), false, locale);
    assert.equal(renderPrivacy({ ...context, locale }).includes('carry the store\'s referral code'), false, locale);
  }
});
