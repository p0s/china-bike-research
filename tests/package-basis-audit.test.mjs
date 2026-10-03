import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadDataset,joinProducts,joinCatalogCandidates,validateDataset} from '../src/lib/data.mjs';
import {renderBikeBuilder,renderCandidateModel} from '../src/render.mjs';
import {translate} from '../assets/i18n.js';
const data=loadDataset(),products=joinProducts(data),candidates=joinCatalogCandidates(data);
const ctx={data,products,base:'',posts:[],siteUrl:'https://chinesebikes.xyz',repositoryUrl:'https://github.com/p0s/china-bike-research'};
const payload=JSON.parse(renderBikeBuilder(ctx).match(/id="build-configurator-data">([\s\S]*?)<\/script>/)[1]);
const entry=id=>candidates.find(x=>x.candidate.id===id);
test('all 23 numeric published frame defaults retain their exact measurement bases',()=>{
 let checked=0;
 for(const p of products.filter(x=>x.variant.kind==='frameset')){
  const b=payload.bases.find(x=>x.id===p.variant.id);if(b.baseWeightG===null)continue;checked++;
  assert.match(b.weightBasis,/Frame only; fork and package hardware may be additional unknown weight/);
  const recorded=p.variant.claimed_frame_weight_basis??p.platform.frame.claimed_frame_weight_basis??p.platform.frame.claimed_frame_weight_g_by_size?.basis;
  if(recorded)assert.ok(b.weightBasis.includes(recorded),p.variant.id);
 }
 assert.equal(checked,23);
});
test('conservative maximum defaults keep size and finish distinct from another recorded example',()=>{
 const cima=payload.bases.find(x=>x.id==='evolve-cima-gr-frameset');assert.equal(cima.baseWeightG,940);assert.match(cima.weightBasis,/Conservative maximum.*XL — 940 g/);assert.match(cima.weightBasis,/Sahara Nude painted finish/);assert.match(cima.weightBasis,/Separate 820 g frame claim/);
 const elves=payload.bases.find(x=>x.id==='elves-mori-aerox-frameset');assert.equal(elves.baseWeightG,1080);assert.match(elves.weightBasis,/56 — 1080 g/);assert.match(elves.weightBasis,/unpainted and without metal parts/);assert.match(elves.weightBasis,/paint adds 80-180 g/);
});
test('only source-attributed included lists produce overlap advice; negated and optional prose cannot',()=>{
 const script=fs.readFileSync(new URL('../src/render.mjs',import.meta.url),'utf8');const source=script.slice(script.indexOf('function candidatePackageOverlapNote('),script.indexOf('function candidatePackageFacts('));
 for(const basis of ['frameset without cockpit','optional handlebar is extra','accessories are excluded','includes cockpit but package not selected']) assert.equal(vm.runInNewContext(`(${source.trim()})(entry)`,{entry:{kind:'frameset',price:{price_basis:basis}}}),'');
 for(const id of ['tavelo-arden'])assert.equal(vm.runInNewContext(`(${source.trim()})(entry)`,{entry:entry(id)}),'');
 const cima=vm.runInNewContext(`(${source.trim()})(entry)`,{entry:entry('evolve-cima-road')});assert.match(cima,/explicitly includes frame, fork, seatpost, essential parts/);assert.doesNotMatch(cima,/includes.*handlebar/);
});
test('three corrected exclusions and optional costs stay visible in all locales',()=>{
 for(const locale of ['en','zh-Hans','de'])for(const id of ['tavelo-arden','evolve-cima-road','lightcarbon-lcg071-pro']){
  const html=renderCandidateModel({...ctx,locale},entry(id));assert.match(html,/class="package-evidence"/);
  const label=id==='evolve-cima-road'?'Optional package parts':'Package exclusions';assert.ok(html.includes(translate(label,locale)));
 }
 const unknown=renderCandidateModel(ctx,entry('lightcarbon-lcr015-d'));assert.ok(unknown.includes('do not subtract component costs'));
});
test('structured lists keep package source and observed date and reject contradictory component states',()=>{
 for(const id of ['tavelo-arden','evolve-cima-road','lightcarbon-lcg071-pro','airwolf-yf-r003','seraph-tt-x68-new-udh','quick-pro-tr-one']){
  const e=entry(id),p=e.price.package_components;assert.ok(data.sources.some(x=>x.id===p.source_id));assert.equal(p.evidence_date,e.price.observed_at);
 }
 const copy=structuredClone(data);copy.candidates.find(x=>x.id==='tavelo-arden').observed_price.package_components.included=['cockpit/handlebar'];assert.ok(validateDataset(copy).some(x=>/invalid observed_price.package_components/.test(x)));
 assert.deepEqual(validateDataset(data),[]);
});

test('the dated USD629 owner package preserves exact inclusions and separately charged extras without confirming today’s quote',()=>{
 const e=entry('lightcarbon-lcg071-pro'),p=e.price;assert.equal(p.original_amount,629);assert.equal(p.observed_at,'2025-11-30');
 assert.deepEqual(p.package_components.included,['frame','fork','seatpost','clamp','headset spacers','thru-axles','HBR08 cockpit','Wahoo mount','storage bag']);
 assert.ok(!p.package_components.excluded.includes('accessories'));assert.deepEqual(p.separately_charged_items.map(x=>x.amount),[10,30,369,120,200,30]);
 assert.ok(p.package_components.unknown.includes('current quoted package'));assert.ok(p.package_components_history[0].prior_values.excluded.includes('accessories'));
 for(const locale of ['en','zh-Hans','de']){const html=renderCandidateModel({...ctx,locale},e);for(const text of ['Dated owner-reported package','Current package quote unverified','HBR08 cockpit','Wahoo mount','storage bag','Package exclusions'])assert.ok(html.includes(translate(text,locale)),text+locale);}
 const b=payload.bases.find(x=>x.id==='candidate-lightcarbon-lcg071-pro');assert.equal(b.priceLow,null);assert.deepEqual(b.included,[]);
});
