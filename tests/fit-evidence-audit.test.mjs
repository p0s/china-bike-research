import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {loadDataset,joinProducts,joinCatalogCandidates,validateDataset} from '../src/lib/data.mjs';
import {catalogSummaries,renderCandidateModel,renderBikeBuilder} from '../src/render.mjs';
const data=loadDataset(),candidates=joinCatalogCandidates(data);const ctx={data,products:joinProducts(data),posts:[],base:'',siteUrl:'https://chinesebikes.xyz',repositoryUrl:'https://github.com/p0s/china-bike-research'};
const expected={"lightcarbon-lcr014-d":"3aac96743c861401647c47000f21785675a67b7ff8d6c5750bf7bf3af67f1e06","lightcarbon-lcr015-d":"337b6783aa7304ae663bc82114045c969444857f448c9646fb2a359831f62fdd","lightcarbon-lcr015-v":"f69638f056996441a5828961446f70ba6d8b125b2edf99e73b122c52bd72b7ba","lightcarbon-lcr015s-d":"3e2c1a9f33691416d09420c01764f00a8286cad3eb6b4afb5bbc6c6e33b11187","lightcarbon-lcg071-pro":"207086db2fb133b9b07ed1f3ba41ae81e86f06e0f199c809c4ed21ff62cead8e","lightcarbon-lcg074-d":"85bd73947fc344cd11c61522d250d34c952e6ae43dd58ed52ea244188138b72c"};
const entry=id=>candidates.find(x=>x.candidate.id===id);
test('all six inconsistent geometry records preserve their literal source fields and prohibit derived fit',()=>{
 const summaries=catalogSummaries(ctx);
 for(const [id,hash] of Object.entries(expected)){
  const e=entry(id),facts=Object.fromEntries(Object.entries(e.candidate.facts).filter(([k])=>k.includes('geometry')));
  assert.equal(createHash('sha256').update(JSON.stringify(facts)).digest('hex'),hash,id);
  assert.equal(e.candidate.geometry_evidence.derived_fit_eligible,false);
  assert.equal(summaries.find(x=>x.id==='candidate-'+id).geometryFitEligible,false);
  for(const locale of ['en','zh-Hans','de'])assert.match(renderCandidateModel({...ctx,locale},e),/class="geometry-evidence-warning" role="note"/);
 }
 assert.match(entry('lightcarbon-lcr014-d').candidate.geometry_evidence.note,/current LCR014-D page was blocked/);
});
test('source-inconsistent geometry cannot be marked fit-eligible by an invalid edit',()=>{
 const copy=structuredClone(data);copy.candidates.find(x=>x.id==='lightcarbon-lcr015-d').geometry_evidence.derived_fit_eligible=true;assert.ok(validateDataset(copy).some(x=>/invalid geometry_evidence/.test(x)));assert.deepEqual(validateDataset(data),[]);
});
test('current LCR018 labels stay distinct from the preserved unmapped historical labels',()=>{
 const c=entry('lightcarbon-lcr018-d').candidate;assert.match(c.facts.sizes,/47, 50, 52, 54, 56 and 58/);assert.equal(c.prior_specification_observations[0].value,'46, 49, 52, 55, 58 and 61');assert.equal(c.prior_specification_observations[0].status,'historical-unmapped-revision');
});
test('LCG074 approximate manufacturer travel claim preserves the prior unknown and does not transfer to siblings',()=>{
 const c=entry('lightcarbon-lcg074-d').candidate;assert.equal(c.suspension_evidence.claimed_travel_mm,20);assert.equal(c.suspension_evidence.approximate,true);assert.equal(c.suspension_evidence.independent_measurement,false);assert.match(c.prior_specification_observations[0].value,/travel is not published/);
 assert.equal(entry('lightcarbon-lcg087s-d').candidate.suspension_evidence,undefined);
});
test('Graro verdict recognizes the retained six-size chart without inventing fit certainty',()=>{
 const p=ctx.products.find(x=>x.variant.id==='ican-graro-frameset');assert.equal(p.platform.frame.geometry.sizes.length,6);assert.match(p.variant.editorial.verdict,/geometry chart for six sizes/);assert.doesNotMatch(p.variant.editorial.verdict,/missing numeric geometry/);assert.match(p.variant.editorial.prior_editorial_observations[0].verdict,/missing numeric geometry/);assert.match(p.variant.editorial.verdict,/Confirm generation/);
});
test('the exact standard LCG087S fork exception survives model and builder rendering',()=>{
 const c=entry('lightcarbon-lcg087s-d').candidate;assert.equal(c.fork_caliper_evidence.standard_fork_weight_g,509);assert.equal(c.fork_caliper_evidence.standard_fork_tolerance_g,15);assert.equal(c.fork_caliper_evidence.recommended_optional_fork,'FK073');
 for(const locale of ['en','zh-Hans','de']){
  const html=renderCandidateModel({...ctx,locale},entry(c.id));assert.ok(html.includes('FK073'));assert.ok(html.includes('L-TWOO'));
  const bases=JSON.parse(renderBikeBuilder({...ctx,locale}).match(/id="build-configurator-data">([\s\S]*?)<\/script>/)[1]).bases;
  const b=bases.find(x=>x.id==='candidate-'+c.id);assert.match(b.forkCaliperNote,/FK073/);assert.match(b.forkCaliperNote,/L-TWOO/);
 }
 assert.equal(entry('lightcarbon-lcg087-d').candidate.fork_caliper_evidence,undefined);
});
