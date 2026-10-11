import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadDataset, joinProducts } from '../src/lib/data.mjs';
import { mountScreen, renderMountEvidence, validateMountApproval } from '../src/lib/mount-evidence.mjs';
import { loadPosts, renderPost } from '../src/lib/posts.mjs';
const data=loadDataset(), products=joinProducts(data);
const ids=['carbonda-cfr696-frameset','lightcarbon-lcg071s-pro-frameset','spcycle-g028-frameset'];
const cfr=products.find(p=>p.variant.id===ids[0]).platform;
const post=loadPosts().find(p=>p.slug==='chinese-bike-for-bikepacking-mounts');
const ctx={data,products,posts:[post],base:'/preview',siteUrl:'https://example.invalid',repositoryUrl:'https://github.com/example/repo',now:new Date('2026-10-11T00:00:00Z')};
test('strict feature screen requires rack AND fender AND official 700C clearance ≥50',()=>{
 assert.equal(mountScreen(cfr),'pass');
 for(const key of ['rear_rack','fender']) for(const status of ['unknown','conflicted','contradicted']){
  const p=structuredClone(cfr); p.mount_approval[key].status=status; assert.equal(mountScreen(p),'pending');
 }
 for(const change of [{wheel_size:'650b'},{evidence:'owner'},{eligibility:'conditional'},{published_max_mm:null}]) assert.equal(mountScreen({...cfr,tire_clearance:{...cfr.tire_clearance,...change}}),'pending');
 assert.equal(mountScreen({...cfr,tire_clearance:{...cfr.tire_clearance,published_max_mm:49}}),'outside');
 assert.deepEqual(products.filter(p=>ids.includes(p.variant.id)).map(p=>mountScreen(p.platform)).sort(),['pass','pending','pending']);
});
test('unknown loads stay unknown and every approval or positive load has a linked source',()=>{
 assert.deepEqual(validateMountApproval(cfr,data.sources),[]);
 for(const mutate of [p=>p.mount_approval.fender.source_ids=['invented'],p=>p.mount_approval.reviewed_at='2026-02-30',p=>p.mount_approval.loads.rear_rack_kg=0,p=>p.mount_approval.loads.rear_rack_kg=-1,p=>p.mount_approval.loads.rear_rack_kg=25,p=>p.mount_approval.rear_rack.status='yes']){
  const p=structuredClone(cfr);mutate(p);assert.ok(validateMountApproval(p,data.sources).length);
 }
 for(const locale of ['en','zh-Hans','de']){
  const html=renderMountEvidence({...ctx,locale},ids);
  assert.equal((html.match(/scope="row"/g)||[]).length,3);
  assert.equal((html.match(/scope="col"/g)||[]).length,6);
  assert.match(html,/tabindex="0"/);assert.match(html,/25 kg/);assert.match(html,/3 kg/);assert.doesNotMatch(html,/0 kg/);
  assert.match(html,/\/preview\/models\/carbonda-cfr696-frameset\/#source-records/);
 }
});
test('guide preserves photos, dates and useful earlier analysis while adding paired reasoning and worksheet',()=>{
 assert.equal(post.datePublished,'2026-10-04');
 assert.equal(post.dateModified,'2026-10-11');
 assert.deepEqual(post.mount_matrix.model_ids,ids);
 for(const locale of ['en','zh-Hans','de']){
  const html=renderPost({...ctx,locale},post,[post]);
  assert.match(html,/id="verified-50mm-framesets"/);assert.match(html,/id="choose"/);
  assert.match(html,/article-table-mounts/);assert.match(html,/article-table-worksheet/);
  assert.match(html,/ican-graro/);assert.match(html,/lightcarbon-lcg071s-pro/);
  assert.ok(post.translations[locale].sections.find(s=>s.id==='map').worksheet.rows.length===4);
 }
});
test('road revision reconciliation preserves V1 and owner-price evidence instead of inventing package equivalence',()=>{
 const c=data.candidates.find(c=>c.id==='lightcarbon-lcr020-d');
 assert.equal(c.facts.frame_weight_g,1000);
 assert.equal(c.prior_specification_observations.at(-1).values.frame_weight_g,1100);
 assert.match(c.facts['geometry complete catalog table'],/V1/);
 assert.match(c.facts['geometry complete V5 catalog table'],/610:/);
 const a=data.candidates.find(c=>c.id==='lightcarbon-lcr018-d');
 assert.equal(a.observed_price.observed_at,'2026-08-29');assert.equal(a.alternative_builds[0].complete_weight_g,8600);
 assert.match(a.facts['manufacturer package'],/Bottom bracket is a paid option, not included/);
 assert.match(a.facts['current catalog conflict'],/616.4.*606.4/);
 assert.ok(!fs.readdirSync('content/posts').some(n=>n.includes('lcr018')&&n.includes('lcr020')));
});
