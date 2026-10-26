import test from 'node:test';
import assert from 'node:assert/strict';
import { numberOrNull, numericInput, normalizeSelection, compareNumbers, restoreBuildState, COMPARISON_SELECTION_LIMIT, regionalHold, regionalHoldBlocks, writeRegionalHold, BUDGET_KEYS, buildCurrencies, parseMoneyInput, moneyInputParam } from '../assets/state-utils.js';
import { formatRequestedBudget } from '../assets/regional-prices.js';
const data = {
  bases: [{ id: 'frame-a', kind: 'frameset' }, { id: 'bike-b', kind: 'complete-bike' }],
  slots: ['drivetrain', 'wheelset'],
  parts: [{ id: 'group-a', slot: 'drivetrain', default: true }, { id: 'wheel-a', slot: 'wheelset', default: true }],
};
const restore = (query = '', saved = {}, options) => restoreBuildState(data, new URLSearchParams(query), saved, options);
for (const value of ['', ' ', '\t', null, undefined, true, false, [], {}, NaN, Infinity, -1, '-1', '0x10', '1,000', 'Infinity', '1e999', Number.MAX_VALUE, '=1+1']) {
  test(`unknown/non-decimal input is not zero: ${String(value)}`, () => assert.equal(numberOrNull(value), null));
}
for (const [value, expected] of [[0,0],['0',0],['0.00',0],[' 1.25 ',1.25],['.5',.5],['1e3',1000],['1e-2',.01],[1200,1200]]) {
  test(`accept nonnegative decimal ${String(value)}`, () => assert.equal(numberOrNull(value), expected));
}
test('numeric input canonicalizes while retaining a real zero', () => {
  assert.equal(numericInput(' 000 '), '0'); assert.equal(numericInput(false), '');
});
test('comparison normalization validates, deduplicates and preserves order', () => {
  assert.deepEqual(normalizeSelection('bike-b,bike-b,<x>,frame-a,unknown', { validIds: new Set(['frame-a','bike-b']) }), ['bike-b','frame-a']);
  assert.equal(normalizeSelection(Array.from({length:20},(_,i)=>`bike-${i}`)).length, COMPARISON_SELECTION_LIMIT);
});
for (const direction of ['asc', 'desc']) test(`unknown sort values are last: ${direction}`, () => {
  const values = ['', 10, null, 0, '40', undefined];
  assert.deepEqual(values.filter(v=>v!==undefined).sort((a,b)=>compareNumbers(a,b,direction)), direction==='asc' ? [0,10,'40','',null] : ['40',10,0,'',null]);
});
test('shared URL does not inherit a recipient draft', () => {
  const saved = { baseId:'frame-a', selections:{drivetrain:'custom'},custom:{drivetrain:{price:'9999'}}, baseCustom:{weight:'300',packageWeight:'600'} };
  const result = restore('base=frame-a', saved);
  assert.equal(result.selections.drivetrain,'group-a'); assert.equal(result.custom.drivetrain.price,''); assert.equal(result.baseCustom.weight,''); assert.equal(result.baseCustom.packageWeight,'');
});
test('bare planner can resume its local draft', () => {
  const result = restore('', {baseId:'bike-b',selections:{wheelset:'custom'},custom:{wheelset:{price:'5',weight:'1'}},baseCustom:{}});
  assert.equal(result.baseId,'bike-b'); assert.equal(result.selections.wheelset,'custom'); assert.equal(result.custom.wheelset.price,'5');
});
test('history restore never reuses current local draft', () => {
  assert.equal(restore('',{baseId:'bike-b'},{allowStored:false}).baseId,'frame-a');
});
test('unknown base and wrong-slot component fall back deterministically', () => {
  const result = restore('base=nonexistent&part-drivetrain=wheel-a');
  assert.equal(result.baseId,'frame-a'); assert.equal(result.selections.drivetrain,'group-a');
  assert.equal(result.unavailableStartingPoint, true);
});
test('an unavailable saved base is disclosed without copying its custom weight into the fallback', () => {
  const result = restore('', {baseId:'removed-base', baseCustom:{weight:'8970', price:'14800'}});
  assert.equal(result.unavailableStartingPoint, true);
  assert.equal(result.baseCustom.weight, '');
  assert.equal(result.baseCustom.price, '');
  assert.equal(restore('base=bike-b').unavailableStartingPoint, undefined);
  assert.equal(restore().unavailableStartingPoint, undefined);
});
test('complete-bike defaults remain included, not re-purchased', () => {
  assert.deepEqual(restore('base=bike-b').selections,{drivetrain:'included',wheelset:'included'});
  assert.equal(restore('base=frame-a&part-drivetrain=included').selections.drivetrain,'group-a');
});
test('buyer zero, package remainder and exact removed weight survive explicit URL', () => {
  const result=restore('base=bike-b&part-wheelset=custom&price-wheelset=0&weight-wheelset=750&removed-wheelset=950&packageWeight=600');
  assert.deepEqual(result.custom.wheelset,{price:'0',priceCurrency:'CNY',weight:'750',removedWeight:'950'}); assert.equal(result.baseCustom.packageWeight,'600');
});
test('malformed storage cannot become zero or inject a selection', () => {
  for (const saved of [null,[],false,'text',{schemaVersion:100,baseId:'bike-b'}]) assert.equal(restore('',saved).baseId,'frame-a');
  const result=restore('',{baseId:'frame-a',custom:{wheelset:{price:true,weight:[],removedWeight:{}}}});
  assert.deepEqual(result.custom.wheelset,{price:'',priceCurrency:'',weight:'',removedWeight:''});
});
test('inherited storage fields are ignored', () => assert.equal(restore('',Object.create({baseId:'bike-b'})).baseId,'frame-a'));
test('partial URL is explicit even when it only names a part', () => {
  const result=restore('part-drivetrain=custom',{baseId:'bike-b'});
  assert.equal(result.baseId,'frame-a'); assert.equal(result.selections.drivetrain,'custom');
});
test('buyer-confirmed frameset package inclusion is explicit, never an inferred default', () => {
  assert.equal(restore('base=frame-a&part-wheelset=in-base').selections.wheelset,'in-base');
  assert.equal(restore('base=bike-b&part-wheelset=in-base').selections.wheelset,'included');
  assert.equal(restore('base=frame-a').selections.wheelset,'wheel-a');
});

test('unavailable request survives a saved draft round trip and component edits', () => {
  const initial = restore('base=removed-base&part-wheelset=custom&price-wheelset=5');
  assert.equal(initial.requestedBaseId, 'removed-base');
  const resumed = restore('', JSON.parse(JSON.stringify(initial)));
  assert.equal(resumed.requestedBaseId, 'removed-base');
  assert.equal(resumed.unavailableStartingPoint, true);
  assert.equal(resumed.custom.wheelset.price, '5');
});
test('explicit replacement URL supersedes an unavailable local draft', () => {
  const result = restore('base=bike-b', restore('base=removed-base'));
  assert.equal(result.baseId, 'bike-b');
  assert.equal(result.requestedBaseId, undefined);
  assert.equal(result.unavailableStartingPoint, undefined);
});
test('legacy frame URLs and drafts retain the unavailable requested identity', () => {
  for (const result of [restore('frame=removed-base'), restore('', {frameId:'removed-base'})]) {
    assert.equal(result.requestedBaseId, 'removed-base');
    assert.equal(result.unavailableStartingPoint, true);
  }
});

test('a failed regional payload keeps an explicit foreign budget and destination instead of broadening results', () => {
  const link = 'max=2000&maxCurrency=EUR&ship=DE&compare=bike-a,bike-b';
  const hold = regionalHold(new URLSearchParams(link), { destination: true, country: 'DE' });
  assert.deepEqual(hold.limit, { amount: 2000, currency: 'EUR' });
  assert.equal(regionalHoldBlocks(hold), true); // unresolved delivered totals never pass the budget
  // The fallback writer would otherwise canonicalize to China/CNY and drop the ceiling.
  const url = new URL('https://example.test/?compare=bike-a%2Cbike-b&ship=CN&currency=CNY');
  writeRegionalHold(url, hold);
  assert.equal(url.searchParams.get('ship'), 'DE');
  assert.equal(url.searchParams.get('currency'), null);
  assert.equal(url.searchParams.get('max'), '2000');
  assert.equal(url.searchParams.get('maxCurrency'), 'EUR');
  assert.equal(url.searchParams.get('compare'), 'bike-a,bike-b');
  // Reload and history read the same link back to the same hold.
  assert.deepEqual(regionalHold(url.searchParams, { destination: true, country: 'DE' }), { ...hold, kept: hold.kept.filter(([key]) => key !== 'compare') });
});

test('regional holds release only on explicit budget or listing changes', () => {
  const hold = regionalHold(new URLSearchParams('ship=US&area=remote&currency=USD&max=900&maxCurrency=USD&listing=1'), { destination: true, country: 'US' });
  assert.equal(hold.listing, true);
  hold.limit = null; // the shopper removed or retyped the budget
  assert.equal(regionalHoldBlocks(hold, null), true); // listing is still unresolved
  hold.listing = false;
  assert.equal(regionalHoldBlocks(hold, null), false);
  assert.equal(regionalHoldBlocks(hold, 5000), true); // a typed CNY budget cannot be checked against a foreign delivery
  const url = new URL('https://example.test/?ship=CN&currency=CNY&max=5000&maxCurrency=CNY&listing=1');
  writeRegionalHold(url, hold);
  assert.deepEqual([...url.searchParams], [['max', '5000'], ['maxCurrency', 'CNY'], ['listing', '1'], ['ship', 'US'], ['currency', 'USD'], ['area', 'remote']]);
  const links = new URL('https://example.test/models/x/?ship=CN&currency=CNY&build=1');
  writeRegionalHold(links, hold, ['ship', 'currency', 'area']);
  assert.equal(links.search, '?build=1&ship=US&currency=USD&area=remote');
});

test('China CNY budgets still apply offline; links without regional choices gain none', () => {
  const china = regionalHold(new URLSearchParams('ship=CN&max=8000&maxCurrency=CNY'));
  assert.equal(china.limit, null);
  assert.equal(regionalHoldBlocks(china, 8000), false);
  const plain = new URL('https://example.test/?q=gravel&ship=CN&currency=CNY');
  writeRegionalHold(plain, regionalHold(new URLSearchParams('q=gravel')));
  assert.equal(plain.search, '?q=gravel');
  const eurOnly = regionalHold(new URLSearchParams('max=500&maxCurrency=EUR'));
  assert.deepEqual(eurOnly.limit, { amount: 500, currency: 'EUR' });
  assert.equal(regionalHoldBlocks(eurOnly), true);
});

test('comparison links keep a held destination and currency when regional prices fail', () => {
  const hold = regionalHold(new URLSearchParams('max=2000&maxCurrency=EUR&ship=DE&currency=EUR'), { destination: true, country: 'DE' });
  // The comparison writer sets fallback China values first; the hold restores the link's own values.
  const url = new URL('https://example.test/?compare=bike-a%2Cbike-b&ship=CN&currency=CNY&max=2000&maxCurrency=EUR&diff=1');
  writeRegionalHold(url, hold);
  assert.deepEqual([url.searchParams.get('ship'), url.searchParams.get('currency'), url.searchParams.get('max'), url.searchParams.get('maxCurrency')], ['DE', 'EUR', '2000', 'EUR']);
  assert.equal(url.searchParams.get('compare'), 'bike-a,bike-b');
  assert.equal(url.searchParams.get('diff'), '1');
});

test('a malformed budget currency is held as typed, readable and never broadens results', () => {
  for (const code of ['EURO', 'eur', '<b>', '']) assert.doesNotThrow(() => formatRequestedBudget(2000, code, 'de'), code);
  assert.equal(formatRequestedBudget(2000, 'EURO'), '2000 EURO');
  assert.equal(formatRequestedBudget(2000, 'X'.repeat(80)).length, 5 + 24);
  assert.match(formatRequestedBudget(2000, 'EUR', 'en'), /€2,000/);
  // Regional prices failed: the destination and the raw code stay, and no row passes.
  const failed = regionalHold(new URLSearchParams('max=2000&maxCurrency=EURO&ship=DE'), { destination: true, country: 'DE' });
  assert.deepEqual(failed.limit, { amount: 2000, currency: 'EURO' });
  assert.equal(regionalHoldBlocks(failed), true);
  // Regional prices loaded but no rate converts EURO: only the budget is held; delivery choices stay with the page.
  const budget = regionalHold(new URLSearchParams('max=2000&maxCurrency=EURO&ship=DE&currency=EUR'), { keys: BUDGET_KEYS });
  assert.equal(regionalHoldBlocks(budget), true);
  const url = new URL('https://example.test/?ship=DE&currency=EUR&area=');
  writeRegionalHold(url, budget);
  assert.deepEqual([...url.searchParams], [['ship', 'DE'], ['currency', 'EUR'], ['area', ''], ['max', '2000'], ['maxCurrency', 'EURO']]);
  const links = new URL('https://example.test/models/x/?ship=DE&currency=EUR');
  writeRegionalHold(links, budget, ['ship', 'currency', 'area']);
  assert.equal(links.search, '?ship=DE&currency=EUR');
  budget.limit = null; // the shopper retyped or cleared the budget
  assert.equal(regionalHoldBlocks(budget, 9000), false);
});

// Build planner currencies (2026-10-26): each amount keeps the currency it was entered in.
const ratedData = { ...data, rates: { date: '2026-10-01', perEur: { EUR: 1, USD: 1.1298, GBP: 0.85373, CAD: 1.6095, CNY: 7.5748, MXN: 20.5251 } } };
const restoreRated = (query = '', saved = {}, options) => restoreBuildState(ratedData, new URLSearchParams(query), saved, options);

test('planner money inputs keep their currency; plain numbers stay legacy yuan', () => {
  assert.deepEqual(parseMoneyInput('1500'), { amount: '1500', currency: 'CNY' });
  assert.deepEqual(parseMoneyInput('1500USD'), { amount: '1500', currency: 'USD' });
  assert.deepEqual(parseMoneyInput(' 1499.99 eur '), { amount: '1499.99', currency: 'EUR' });
  assert.deepEqual(parseMoneyInput('0GBP'), { amount: '0', currency: 'GBP' });
  for (const value of ['1500JPY', 'USD', '', '-5USD', '1,500USD', '1500USDX', null, true, {}]) assert.deepEqual(parseMoneyInput(value), { amount: '', currency: '' }, String(value));
  assert.equal(moneyInputParam('1500', 'CNY'), '1500');
  assert.equal(moneyInputParam('1499.99', 'EUR'), '1499.99EUR');
  assert.equal(moneyInputParam('', 'USD'), '');
  // Older planner code reads a marked amount as unknown, never as yuan.
  assert.equal(numberOrNull('1500USD'), null);
});

test('planner currencies need a dated rate for the currency and for yuan', () => {
  assert.deepEqual(buildCurrencies(ratedData.rates), ['EUR', 'USD', 'GBP', 'CAD', 'MXN', 'CNY']);
  assert.deepEqual(buildCurrencies(null), ['CNY']);
  assert.deepEqual(buildCurrencies({ perEur: { EUR: 1, USD: 1.1 } }), ['CNY']);
  assert.deepEqual(buildCurrencies({ perEur: { EUR: 1, CNY: 7.5, USD: 0 } }), ['EUR', 'CNY']);
});

test('planner currency: the link’s own, then the saved planner or catalog currency, else yuan', () => {
  assert.equal(restoreRated('base=frame-a&currency=EUR', { schemaVersion: 3, currency: 'GBP' }, { preferredCurrency: 'USD' }).currency, 'EUR');
  // A link without a currency shows the visitor's saved currency; its plan and yuan amounts stay the link's.
  const shared = restoreRated('base=frame-a&price-wheelset=800', { schemaVersion: 3, baseId: 'frame-a', currency: 'GBP', selections: { drivetrain: 'custom' }, custom: { drivetrain: { price: '9', priceCurrency: 'GBP' } } }, { preferredCurrency: 'USD' });
  assert.deepEqual([shared.currency, shared.selections.drivetrain, shared.custom.drivetrain.price, shared.custom.wheelset.price, shared.custom.wheelset.priceCurrency], ['GBP', 'group-a', '', '800', 'CNY']);
  assert.equal(restoreRated('base=frame-a', {}, { preferredCurrency: 'USD' }).currency, 'USD');
  // History entries carry their currency; restoring one never reads storage.
  assert.equal(restoreRated('base=frame-a', { schemaVersion: 3, currency: 'GBP' }, { allowStored: false, preferredCurrency: 'USD' }).currency, 'CNY');
  assert.equal(restoreRated('', { schemaVersion: 3, baseId: 'frame-a', currency: 'GBP' }, { preferredCurrency: 'USD' }).currency, 'GBP');
  assert.equal(restoreRated('', { baseId: 'frame-a' }, { preferredCurrency: 'USD' }).currency, 'USD');
  assert.equal(restoreRated('', {}, { preferredCurrency: 'JPY' }).currency, 'CNY');
  assert.equal(restoreRated('currency=JPY').currency, 'CNY');
  assert.equal(restore('currency=EUR').currency, 'CNY', 'without rates only yuan works');
  // A currency alone is a display choice, not a shared plan: the bare visit still resumes its draft.
  const resumed = restoreRated('currency=EUR', { schemaVersion: 3, baseId: 'bike-b', currency: 'USD' });
  assert.equal(resumed.baseId, 'bike-b');
  assert.equal(resumed.currency, 'EUR');
});

test('planner amounts keep their entered currency across display changes, links and drafts', () => {
  const query = 'base=bike-b&part-wheelset=custom&price-wheelset=1500USD&basePrice=9000';
  for (const currency of ['', 'EUR', 'USD', 'CNY']) {
    const state = restoreRated(`${query}${currency ? `&currency=${currency}` : ''}`);
    assert.deepEqual([state.custom.wheelset.price, state.custom.wheelset.priceCurrency], ['1500', 'USD'], currency);
    assert.deepEqual([state.baseCustom.price, state.baseCustom.priceCurrency], ['9000', 'CNY'], currency);
  }
  // Schema 2 drafts stored yuan; schema 3 drafts carry each amount's currency.
  const legacy = restoreRated('', { schemaVersion: 2, baseId: 'bike-b', custom: { wheelset: { price: '800' } }, baseCustom: { price: '9000' } });
  assert.deepEqual([legacy.custom.wheelset.price, legacy.custom.wheelset.priceCurrency, legacy.baseCustom.priceCurrency], ['800', 'CNY', 'CNY']);
  const current = restoreRated('', JSON.parse(JSON.stringify(restoreRated(`${query}&currency=EUR`))));
  assert.equal(current.schemaVersion, 3);
  assert.deepEqual([current.currency, current.custom.wheelset.price, current.custom.wheelset.priceCurrency], ['EUR', '1500', 'USD']);
  // A schema 3 amount without a valid currency is unknown, not yuan.
  const unmarked = restoreRated('', { schemaVersion: 3, baseId: 'bike-b', custom: { wheelset: { price: '800', priceCurrency: 'XYZ' } } });
  assert.deepEqual([unmarked.custom.wheelset.price, unmarked.custom.wheelset.priceCurrency], ['', '']);
});
