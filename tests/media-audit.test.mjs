import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadDataset,joinProducts,joinCatalogCandidates} from '../src/lib/data.mjs';
import {renderModel,renderCandidateModel} from '../src/render.mjs';
import {translate} from '../assets/i18n.js';
import {createCoverageSnapshot,validateCoverage} from '../src/lib/coverage.mjs';
import {localizeHtml} from '../src/lib/i18n.mjs';
const data=loadDataset(),products=joinProducts(data),candidates=joinCatalogCandidates(data);
const ctx={data,products,posts:[],base:'',siteUrl:'https://chinesebikes.xyz',repositoryUrl:'https://github.com/p0s/china-bike-research'};
test('S-PRO selects its separate-stem manufacturer reference and excludes unproved PRO cockpit photographs',()=>{
 const p=products.find(p=>p.platform.id==='lightcarbon-lcg071s-pro');
 assert.equal(p.image.id,'lightcarbon-lcg071s-pro-gallery-2026-10-03-01');
 assert.equal(p.image.subject_accuracy,'exact-platform');
 assert.match(p.image.display_note,/do not establish.*mainland package/);
 for(const id of ['lightcarbon-lcg071s-pro-primary-image','lightcarbon-lcg071s-pro-legacy-2-gallery']){
  assert.equal(data.images.find(i=>i.id===id).buyer_visibility,'omit');
  assert.ok(!p.galleryImages.some(i=>i.id===id));
 }
});
test('SCOTT size chart and different-generation Giant photo remain provenance, never product heroes',()=>{
 for(const id of ['scott-foil-rc-10','missing-china-price-giant-tcr-advanced']){
  const entry=candidates.find(c=>c.candidate.id===id);assert.equal(entry.image,null);
  assert.doesNotMatch(renderCandidateModel(ctx,entry),/data-product-image/);
  const image=data.images.find(i=>i.candidate_id===id);assert.equal(image.buyer_visibility,'omit');assert.ok(image.hosting.variants.length);
  assert.ok(image.audit_corrections[0].prior_values.subject_accuracy.startsWith('exact-'));
 }
 assert.match(data.images.find(i=>i.id==='scott-foil-rc-10-primary-image').alt,/chart.*without a bicycle/);
});
test('LOOK glass-fibre detail is attributed to the product page while prior PDF wording survives',()=>{
 for(const id of ['look-765-optimum-platform-material-stiffness-2026-08-30','look-765-optimum-platform-release-recheck-2026-09-23']){
  const source=data.sources.find(s=>s.id===id);assert.match(source.notes,/belongs to.*product\/outlet page.*not this PDF/);
  assert.match(source.notes,/20% more compliance/);assert.match(source.audit_corrections[0].prior_values.notes,/glass/);
 }
 assert.match(data.sources.find(s=>s.id==='look-765-optimum-105-di2-official-2026-08-17').notes,/supports the carbon\/glass/);
});
test('reviewed image caveats and gallery descriptions translate through the real HTML display contract',()=>{
 const product=products.find(p=>p.platform.id==='lightcarbon-lcg071s-pro');const html=renderModel(ctx,product);
 for(const locale of ['zh-Hans','de']){
  const result=localizeHtml(html,{locale,base:'',siteUrl:ctx.siteUrl});
  for(const text of ['Frameset view 1',product.image.display_note,'Manufacturer sample complete build. The pictured drivetrain, size, weight and sale package are unverified; it does not establish the retained mainland configuration.'])assert.notEqual(translate(text,locale),text);
  assert.match(result,/data-gallery-note-text/);assert.doesNotMatch(result,/data-gallery-note="Official frameset/);
  assert.doesNotMatch(result,/data-gallery-alt="LCG071S-PRO — Frameset view/);
  assert.doesNotMatch(result,/aria-label="Show Frameset view/);
 }
 const script=fs.readFileSync(new URL('../assets/site.js',import.meta.url),'utf8');
 assert.match(script,/note.textContent = button.dataset.galleryNote/);
});

test('image-quality corrections never excuse visible images, lost prior evidence or unrelated protection loss',()=>{
 const baseline=JSON.parse(fs.readFileSync(new URL('../data/coverage-baseline.json',import.meta.url),'utf8'));
 const retirements=fs.readdirSync(new URL('../data/retired-records/',import.meta.url)).filter(x=>x.endsWith('.json')).map(x=>JSON.parse(fs.readFileSync(new URL(`../data/retired-records/${x}`,import.meta.url),'utf8')));
 const errors=dataset=>validateCoverage(dataset,createCoverageSnapshot(dataset),baseline,retirements,{requireCurrentBaseline:false});
 assert.deepEqual(errors(data),[]);
 for(const id of ['giant-tcr-advanced-primary-image','scott-foil-rc-10-primary-image','lightcarbon-lcg071s-pro-primary-image','lightcarbon-lcg071s-pro-legacy-2-gallery']){
  for(const mutation of ['visible','history','target']){
   const changed=structuredClone(data),image=changed.images.find(x=>x.id===id);
   if(mutation==='visible')image.buyer_visibility='show';
   if(mutation==='history')delete image.audit_corrections;
   if(mutation==='target'){delete image.platform_id;image.candidate_id=image.candidate_id==='scott-foil-rc-10'?'missing-china-price-giant-tcr-advanced':'scott-foil-rc-10';}
   assert.ok(errors(changed).some(x=>/omission|protected field|changed target/.test(x)),`${id}: ${mutation}`);
  }
 }
});
