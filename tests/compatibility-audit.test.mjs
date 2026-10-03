import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadDataset,joinProducts,validateDataset,maxClearance} from '../src/lib/data.mjs';
import {renderBikeBuilder} from '../src/render.mjs';
import {numberOrNull} from '../assets/state-utils.js';
import {translate} from '../assets/i18n.js';
const data=loadDataset();
const ctx={data,products:joinProducts(data),posts:[],base:'',siteUrl:'https://chinesebikes.xyz',repositoryUrl:'https://github.com/p0s/china-bike-research'};
const script=fs.readFileSync(new URL('../assets/site.js',import.meta.url),'utf8');
const source=script.slice(script.indexOf('  function compatibilityMessages('),script.indexOf('  function updateUrl(',script.indexOf('  function compatibilityMessages(')));
const payload=locale=>JSON.parse(renderBikeBuilder({...ctx,locale}).match(/id="build-configurator-data">([\s\S]*?)<\/script>/)[1]);
const bases=payload('en').bases;
const base=id=>bases.find(x=>x.id===id);
function messages(id,width,layout='double',shifting='electronic',bottom=false) {
 return vm.runInNewContext(`(${source.trim()})(base,new Map())`,{numberOrNull,base:base(id),state:{selections:{}},selectedPart:slot=>slot==='tires'?{compatibility:{nominal_tire_width_mm:width}}:slot==='drivetrain'?{compatibility:{drivetrain_layout:layout,shifting_type:shifting}}:slot==='bottom-bracket'&&bottom?{compatibility:{accepted_frame_shells:['bb86']}}:null});
}
test('stock and fitted observations never become validated tire maxima',()=>{
 for(const id of ['camp-gx600-pes','twitter-v3-wheeltop-eds','candidate-xlab-rs9','candidate-triaero-a9']){
  const b=base(id);assert.ok(b,id);assert.equal(b.tireClearanceMm,null,id);
  const result=messages(id,35).join(' ');assert.match(result,/not recorded/);assert.doesNotMatch(result,/exceed/);
 }
 assert.equal(maxClearance(data.platforms.find(x=>x.id==='camp-gx700')),undefined);
});
test('per-layout CIMA, AF01 and nullable G21 maxima produce qualified boundary decisions',()=>{
 for(const id of ['evolve-cima-gr-frameset','af01-frameset']){
  assert.ok(!messages(id,50,'single').some(x=>/exceed/.test(x)));
  assert.match(messages(id,50).join(' '),/45 mm limit for 2×/);
  assert.ok(!messages(id,45).some(x=>/exceed/.test(x)));
 }
 assert.match(messages('yoeleo-altera-g21-frameset',35).join(' '),/not recorded/);
 assert.ok(!messages('yoeleo-altera-g21-frameset',53,'single').some(x=>/exceed/.test(x)));
 const unknown=messages('af01-frameset',50,null).join(' ');assert.match(unknown,/unknown layout has no confirmed maximum/);assert.doesNotMatch(unknown,/exceed/);
 const copy=structuredClone(data);copy.platforms.find(x=>x.id==='yoeleo-altera-g21').tire_clearance.drivetrain_limits_mm={single:null,double:null};assert.ok(validateDataset(copy).some(x=>/invalid drivetrain clearance limits/.test(x)));
 assert.deepEqual(validateDataset(data),[]);
});
test('CIMA exact supported shifting combinations constrain the selected drivetrain',()=>{
 assert.match(messages('evolve-cima-gr-frameset',35,'double','mechanical').join(' '),/manufacturer does not support/);
 for(const [layout,type] of [['single','mechanical'],['single','electronic'],['double','electronic']]) assert.ok(!messages('evolve-cima-gr-frameset',35,layout,type).some(x=>/does not support/.test(x)));
 assert.match(messages('evolve-cima-gr-frameset',35,'double',null).join(' '),/Confirm shifting/);
});
test('Voyager conservative threshold retains the unresolved manufacturer revision conflict',()=>{
 const result=messages('incolor-voyager-frameset',35).join(' ');assert.match(result,/32 mm limit for 2×/);assert.match(result,/revisions conflict/);assert.match(base('incolor-voyager-frameset').tireClearanceNote,/not a universal physical-limit/);
});
test('conflicting BB92 and BB86 evidence never certifies the selectable BB86 part',()=>{
 const id='candidate-twitter-gravel-v3-2024-rs-carbon-wave';assert.equal(base(id),undefined,'The unresolved original build stays withheld.');
 const facts=data.candidates.find(x=>'candidate-'+x.id===id).facts;
 const renderSource=fs.readFileSync(new URL('../src/render.mjs',import.meta.url),'utf8');
 const keySource=renderSource.slice(renderSource.indexOf('function builderBottomBracketKey('),renderSource.indexOf('function builderPriceBounds('));
 const key=vm.runInNewContext(`(${keySource.trim()})(value)`,{value:facts.bottom_bracket});assert.equal(key,null);
 const result=vm.runInNewContext(`(${source.trim()})(base,new Map())`,{numberOrNull,base:{bottomBracket:facts.bottom_bracket,bottomBracketKey:key,bottomBracketStatus:facts.bottom_bracket_standard.status},state:{selections:{}},selectedPart:slot=>slot==='bottom-bracket'?{compatibility:{accepted_frame_shells:['bb86']}}:null});
 assert.match(result.join(' '),/shell is unresolved or conflicting/);
});
test('current AF01 geometry correction retains the two original cells in history',()=>{
 const g=data.platforms.find(x=>x.id==='af01').frame.geometry;
 assert.equal(g.sizes.find(x=>x.size==='M').bb_drop_mm,78);assert.equal(g.sizes.find(x=>x.size==='L').head_angle_deg,71);
 assert.equal(g.prior_observations[0].sizes.find(x=>x.size==='M').bb_drop_mm,76);assert.equal(g.prior_observations[0].sizes.find(x=>x.size==='L').head_angle_deg,71.5);
});
test('critical compatibility warnings and partial limits keep meaning across locales',()=>{
 for(const locale of ['zh-Hans','de']){
  const p=payload(locale);const g21=p.bases.find(x=>x.id==='yoeleo-altera-g21-frameset');assert.equal(g21.tireClearanceByDrivetrain.double,null);
  for(const text of ['Bottom bracket shell is unresolved or conflicting; confirm the exact frame standard before selecting this part.','The manufacturer does not support this shifting type and chainring layout on the selected frame.','Tire clearance for the selected frame and drivetrain is not recorded; confirm it before buying.','53/unknown mm (1×/2×)']) assert.notEqual(translate(text,locale),text);
 }
});
