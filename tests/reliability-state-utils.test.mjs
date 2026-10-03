import test from 'node:test';
import assert from 'node:assert/strict';
import { numberOrNull, numericInput, normalizeSelection, compareNumbers, restoreBuildState, COMPARISON_SELECTION_LIMIT } from '../assets/state-utils.js';
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
  assert.deepEqual(result.custom.wheelset,{price:'0',weight:'750',removedWeight:'950'}); assert.equal(result.baseCustom.packageWeight,'600');
});
test('malformed storage cannot become zero or inject a selection', () => {
  for (const saved of [null,[],false,'text',{schemaVersion:100,baseId:'bike-b'}]) assert.equal(restore('',saved).baseId,'frame-a');
  const result=restore('',{baseId:'frame-a',custom:{wheelset:{price:true,weight:[],removedWeight:{}}}});
  assert.deepEqual(result.custom.wheelset,{price:'',weight:'',removedWeight:''});
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
