import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, joinCatalogCandidates, allInPriceFor } from '../src/lib/data.mjs';
import { priceEvidence } from '../src/lib/price-evidence.mjs';
import { chinaPriceBasis, regionalPricePayload } from '../src/lib/regional-prices.mjs';
import { regionalPrice } from '../assets/regional-prices.js';
import { catalogSummaries, renderBikeBuilder, renderCandidateModel } from '../src/render.mjs';
import { translate } from '../assets/i18n.js';
const data = loadDataset();
const ctx = {data, products:joinProducts(data), posts:[], base:'', siteUrl:'https://chinesebikes.xyz', repositoryUrl:'https://github.com/p0s/china-bike-research', now:new Date('2026-10-03T00:00:00Z')};
const candidates = joinCatalogCandidates(data);
const summaries = catalogSummaries(ctx);
const builder = JSON.parse(renderBikeBuilder(ctx).match(/id="build-configurator-data">([\s\S]*?)<\/script>/)[1]);
const entry = id => candidates.find(x => x.candidate.id === id);
const summary = id => summaries.find(x => x.id === 'candidate-'+id);
const base = id => builder.bases.find(x => x.id === 'candidate-'+id);
const payload = regionalPricePayload(data,'2026-10-03');

test('all nine foreign supplier and owner reference types stay out of planner purchase costs', () => {
  for (const id of ['lightcarbon-lcr014-d','lightcarbon-lcr015s-d','lightcarbon-lcr015-v','lightcarbon-lcr015-d','lightcarbon-lcr017s-d','lightcarbon-lcr017-d','lightcarbon-lcg071-pro','longteng-ltk266-d-sl','lightcarbon-lcr018-d']) {
    assert.equal(priceEvidence(entry(id).price).reference,true,id);
    assert.equal(base(id).priceLow,null,id);
    assert.match(base(id).priceNote,/enter the exact purchase price/,id);
    assert.equal(summary(id).chinaPrice,null,id);
    for (const locale of ['en','zh-Hans','de']) {
      const html = renderCandidateModel({...ctx,locale},entry(id));
      assert.ok(html.includes(translate('Foreign reference estimate',locale)),id+locale);
      if (entry(id).price.original_currency) assert.ok(html.includes(entry(id).price.original_currency),id+locale);
    }
  }
  assert.match(renderCandidateModel(ctx,entry('lightcarbon-lcr014-d')),/minimum order 10 sets/);
});

test('seven genuine conditional observations retain their amounts and visible structured qualifier', () => {
  for (const id of ['qingsha-carbon-folding','java-vittoria-er7-2026','upland-r70','camp-gx700','cinelli-pressure','laget-discovery-one-flagship']) {
    assert.equal(summary(id).chinaPrice.conditional,true,id);
    assert.match(summary(id).priceState,/conditional/i,id);
  }
  const tfsa = data.prices.find(p=>p.id==='tfsa-jh37-taobao-selected-2026-08-27');
  assert.equal(chinaPriceBasis([tfsa]).conditional,true);
  assert.equal(tfsa.listed_amount_cny,2730);
  assert.equal(tfsa.amount_cny,2512);
  const voyager = data.prices.find(p=>p.id==='incolor-voyager-taobao-2026-08-29');
  assert.equal(chinaPriceBasis([voyager]).conditional,false);
  assert.equal(priceEvidence({price_basis:'No coupon reduction included',conditions:'Unused coin incentive'}).conditional,false);
});

test('current Canyon quote replaces the primary conflict while preserving history and incomplete checkout', () => {
  const canyon = entry('missing-china-price-canyon-grail');
  assert.equal(canyon.price.amount_cny,13700);
  assert.equal(canyon.candidate.observed_price.low_cny,11700);
  assert.equal(canyon.candidate.prior_price_observations[0].high_cny,14700);
  assert.equal(base(canyon.candidate.id).priceLow,null);
  const shown = summary(canyon.candidate.id);
  assert.equal(shown.chinaPrice.low,13700);
  assert.equal(shown.chinaPrice.partial,true);
  assert.equal(regionalPrice(shown,{country:'CN',currency:'CNY'},payload).high,null);
  const html = renderCandidateModel(ctx,canyon);
  for(const text of ['¥13,700','¥11,700–14,700','CNY 749','VAT and customs excluded','member-only','size selection']) assert.ok(html.includes(text),text);
});

test('historical and unmatched prices stay readable without current purchase totals', () => {
  for(const id of ['voicevelo-g-major','xds-gt600']) {
    assert.equal(base(id).priceLow,null,id);
    assert.equal(summary(id).chinaPrice,null,id);
    assert.ok(entry(id).price.amount_cny || entry(id).price.low_cny,id);
  }
});

test('unsupported MTB frames keep frame references without the road build allowance or builder entry', () => {
  for(const id of ['icanian-p9','icanian-sn04']) {
    assert.equal(base(id),undefined,id);
    assert.equal(summary(id).priceLowCny,null,id);
    assert.equal(summary(id).priceHighCny,null,id);
    assert.equal(summary(id).estimated,undefined,id);
    assert.equal(summary(id).priceUnavailable,true,id);
    const html = renderCandidateModel(ctx,entry(id));
    assert.ok(html.includes('Complete build price unknown'));
    assert.ok(html.includes('Frame ¥'));
    assert.ok(!html.includes('estimate adds the adjustable'));
  }
});

test('Voyager starting floor cannot satisfy a strict maximum or provide a known selected-package cost', () => {
  const product=ctx.products.find(x=>x.variant.id==='incolor-voyager-frameset');
  const allIn=allInPriceFor(product.variant,product.latestPrice,data);
  assert.equal(allIn.low,13800);
  assert.equal(allIn.high,undefined);
  assert.equal(allIn.midpoint,Infinity);
  const shown=summaries.find(x=>x.id===product.variant.id);
  assert.equal(shown.chinaPrice.low,7800);
  assert.equal(shown.chinaPrice.high,null);
  assert.equal(shown.chinaPrice.starting,true);
  const projection=regionalPrice(shown,{country:'CN',currency:'CNY'},payload,6000);
  assert.equal(projection.low,null);
  assert.equal(projection.high,null);
  assert.equal(projection.display.nativeLow,13800);
  assert.equal(projection.display.starting,true);
  assert.equal(builder.bases.find(x=>x.id===product.variant.id).priceLow,null);
  assert.equal(chinaPriceBasis([{amount_cny:8000,currency:'CNY',observed_at:'2026-10-03'}]).high,8000);
});

test('all seven conditional observations require buyer-entered eligible planner quotes in every locale',()=>{
 const ids=['candidate-qingsha-carbon-folding','candidate-java-vittoria-er7-2026','candidate-upland-r70','candidate-camp-gx700','candidate-cinelli-pressure','candidate-laget-discovery-one-flagship','tfsa-jh37-frameset'];
 for(const locale of ['en','zh-Hans','de']){
  const payload=JSON.parse(renderBikeBuilder({...ctx,locale}).match(/id="build-configurator-data">([\s\S]*?)<\/script>/)[1]);
  for(const id of ids){
   const b=payload.bases.find(x=>x.id===id);assert.equal(b.priceLow,null,id+locale);assert.equal(b.priceHigh,null,id+locale);
   assert.ok(b.priceNote.includes('2026-08-')&&b.priceNote.includes('·'),id+locale);
   if(locale!=='en')assert.ok(!b.priceNote.startsWith('Conditional price'),id+locale);
  }
 }
 assert.match(builder.bases.find(x=>x.id==='candidate-qingsha-carbon-folding').priceNote,/First-order offer.*3,599/);
 assert.equal(priceEvidence({amount_cny:3599,conditional:true}).purchaseEligible,false);
});
test('the exact-source CFR707 gravel classification permits a quote-only gravel planner while MTB exclusions stay intact',()=>{
 const c=entry('carbonda-cfr707');assert.equal(c.category,'adventure-gravel');
 assert.equal(c.candidate.category_evidence.source_id,'carbonda-cfr707-official-2026-08-17');
 assert.equal(base('carbonda-cfr707').category,'gravel');assert.equal(base('carbonda-cfr707').priceLow,null);
 const html=renderCandidateModel(ctx,c);assert.doesNotMatch(html,/does not establish an MTB complete-build cost/);
 for(const id of ['icanian-p9','icanian-sn04'])assert.equal(base(id),undefined);
});

test('published and research planner bases treat only purchase-eligible latest prices as known inputs', () => {
  for (const locale of ['en', 'zh-Hans', 'de']) {
    const bases = new Map(JSON.parse(renderBikeBuilder({...ctx, locale}).match(/id="build-configurator-data">([\s\S]*?)<\/script>/)[1]).bases.map(b => [b.id, b]));
    for (const product of ctx.products) {
      const b = bases.get(product.variant.id), price = product.latestPrice;
      if (!b || !price) continue;
      if (priceEvidence(price).purchaseEligible) { assert.notEqual(b.priceLow, null, product.variant.id); continue; }
      assert.equal(b.priceLow, null, product.variant.id + locale);
      assert.equal(b.priceHigh, null, product.variant.id + locale);
      const e = priceEvidence(price);
      if (!e.starting && !e.partial) assert.ok(b.priceNote.includes(price.observed_at), `${product.variant.id} ${locale}: dated reference kept`);
      else assert.ok(b.priceNote, `${product.variant.id} ${locale}: quote instruction kept`);
    }
    // Converted official-store reference: amount, original currency and date stay visible; the buyer enters the quote.
    const graro = bases.get('ican-graro-frameset');
    // The original amount keeps its symbol, so interface languages cannot misread its separator.
    assert.ok(['¥6,023', 'US$899', '2026-09-23'].every(part => graro.priceNote.includes(part)), locale);
    assert.ok(bases.get('twitter-v3-2024-rs-sensah-alloy').priceNote.includes(translate('Historical listing', locale)), locale);
    if (locale !== 'en') assert.ok(!graro.priceNote.startsWith('Reference kept'), locale);
    assert.equal(bases.get('candidate-twitter-cyclone-gen3-7170')?.priceLow ?? null, null);
  }
});

test('planner subtotal, completeness and purchase-quote statuses are localized with numbers and unknowns intact', () => {
  for (const [english, chinese] of [
    ['¥4,518 known + 10 unknown', '¥4,518 已知 + 10 项未知'],
    ['¥4,518 base / known deltas + 3 unknown', '¥4,518 基础价／已知差额 + 3 项未知'],
    ['Complete price needs 10 more inputs; complete weight needs 6 more inputs.', '整车价格还需 10 项输入；整车重量还需 6 项输入。'],
    ['Purchase total needs 1 more input; projected weight needs 1 more input.', '购买总价还需 1 项输入；预计重量还需 1 项输入。'],
    ['Included in Shimano 105 R7170; not counted again.', '已包含在 Shimano 105 R7170 中，不重复计算。'],
  ]) assert.equal(translate(english, 'zh-Hans'), chinese);
  const english = ['Exact purchase price needed.', 'Converted reference price excluded; enter the exact purchase price.', 'Conflicting official prices excluded; enter the exact purchase price.'];
  for (const locale of ['zh-Hans', 'de']) {
    for (const note of english) assert.notEqual(translate(note, locale), note, `${locale}: ${note}`);
    const notes = JSON.parse(renderBikeBuilder({...ctx, locale}).match(/id="build-configurator-data">([\s\S]*?)<\/script>/)[1]).bases.map(b => b.priceNote);
    assert.ok(notes.every(note => !english.includes(note)), locale);
  }
});
