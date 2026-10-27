import test from 'node:test';
import assert from 'node:assert/strict';
import {loadDataset,joinProducts,joinCatalogCandidates} from '../src/lib/data.mjs';
import {loadPosts,renderPost} from '../src/lib/posts.mjs';
import {loadSchedule,publishedPosts} from '../src/lib/post-publication.mjs';
import {renderElectronicGroupsets,renderCandidateModel} from '../src/render.mjs';
const data=loadDataset(),posts=loadPosts(),products=joinProducts(data),candidates=joinCatalogCandidates(data);
const ctx={data,products,catalogCandidates:candidates,posts,base:'',siteUrl:'https://chinesebikes.xyz',repositoryUrl:'https://github.com/p0s/china-bike-research'};
const post=slug=>posts.find(p=>p.slug===slug);
const locales=['en','zh-Hans','de'];
test('YOELEO distinguishes the May2021 report from the December2020 order in all three draft locales',()=>{
 const p=post('buy-yoeleo-bike');
 for(const locale of locales){
  const text=p.translations[locale].sections.find(s=>s.id==='owners').paragraphs[0];
  assert.match(text,/2020/);assert.match(text,/2021/);assert.match(text,/23/);assert.match(text,/Switzerland|瑞士|Schweiz/);assert.match(text,/ALTERA G21/);
  const html=renderPost({...ctx,locale},p,posts);assert.ok(html.includes(text.split('](https://chinertown.com/index.php?topic=3237.0)')[1]));
 }
 assert.match(p.translations.en.sections.find(s=>s.id==='owners').paragraphs[0],/May 2021.*December 23, 2020.*March 23, 2021/);
});
test('both Elves draft passages keep seller attribution, pending tracking and unverified carrier handover in every locale',()=>{
 for(const slug of ['buy-elves-bike','chinese-bike-shipping-times'])for(const locale of locales){
  const p=post(slug),section=p.translations[locale].sections.find(s=>s.id===(slug==='buy-elves-bike'?'owners':'examples'));
  const text=section.paragraphs[0];assert.match(text,/seller|卖家|Verkäufer/);assert.match(text,/tracking|追踪|Tracking/);assert.match(text,/unverified|not independently confirmed|未.*核实|未获独立确认|nicht unabhängig bestätigt|unbestätigt/);assert.match(text,/2026/);
  assert.ok(p.audit_corrections.at(-1).prior_values.passages[locale]);
 }
});
test('historical3570/5000 leads retain amounts, capture dates, original citations and headline exclusion while visible provenance is qualified',()=>{
 for(const [id,amount] of [['shimano-105-r7170',3570],['shimano-road-di2-r8170-r9270',5000]]){
  const g=data.groupsets.find(x=>x.id===id),o=g.price_observations.find(x=>x.amount===amount);
  assert.equal(o.observed_at,'2026-08-24');assert.equal(o.headline,false);assert.equal(o.source_id,'smzdm-shimano-di2-market-observations-2026-08-24');
  assert.equal(o.verification_status,'unresolved-supplied-secondary-lead');assert.equal(o.provenance_review.current_citation_reproduces_amount,false);assert.match(o.conditions,/does not reproduce/);
  const prior=g.audit_corrections.at(-1).prior_values.price_observations[0];assert.equal(prior.amount,o.amount);assert.equal(prior.observed_at,o.observed_at);assert.ok(o.conditions.startsWith(prior.conditions));
 }
 assert.equal(data.groupsets.find(x=>x.id==='shimano-road-di2-r8170-r9270').price_observations.find(x=>x.amount===6050).observed_at,'2026-08-20');
 for(const locale of locales){const html=renderElectronicGroupsets({...ctx,locale});assert.match(html,/¥3,570/);assert.match(html,/¥5,000/);assert.match(html,locale==='en'?/cited page does not reproduce/:locale==='zh-Hans'?/引用页面未复现/:/zitierte Seite gibt diesen Betrag nicht wieder/);}
});
test('R70 stiffness is an unverified AI intermediary lead, with different weighted builds kept separate',()=>{
 const source=data.sources.find(x=>x.id==='upland-r70-independent-review-2026-08-30'),entry=candidates.find(x=>x.candidate.id==='upland-r70');
 assert.equal(source.type,'secondary-ai-video-summary-index');assert.equal(source.accessed_at,'2026-08-30');assert.match(source.notes,/8\.8 kg tested build with pedals.*8\.36 kg official reference/);assert.match(source.notes,/different sizes.*neither.*establishes exact size labels/);assert.doesNotMatch(source.notes,/size[- ](?:490|450)/);assert.match(source.audit_corrections.at(-1).prior_values.notes,/size-490/);assert.match(source.notes,/Original playback\/transcript.*unverified/);
 assert.equal(entry.candidate.facts.complete_weight_g,undefined);assert.match(entry.candidate.facts.complete_weight,/8\.3 kg bare/);assert.match(entry.candidate.facts.stiffness_evidence,/secondary AI-generated.*unverified/);
 assert.equal(entry.candidate.observed_price.low_cny,8999);assert.equal(entry.candidate.observed_price.high_cny,9597.25);assert.equal(entry.candidate.observed_at,'2026-08-08');
 for(const locale of locales){const html=renderCandidateModel({...ctx,locale},entry);assert.match(html,locale==='en'?/secondary AI-generated summary/:locale==='zh-Hans'?/AI 转述摘要/:/sekundäre KI-Zusammenfassung/);}
});
test('chronology corrections preserve prior passages and historical visibility after scheduled releases',()=>{
 const queue=loadSchedule(new URL('..',import.meta.url).pathname,posts);
 const visible=publishedPosts(posts,queue,new Date('2026-10-03T12:00:00.000Z')).map(p=>p.slug);
 for(const slug of ['buy-yoeleo-bike','buy-elves-bike','chinese-bike-shipping-times']){
  const p=post(slug);assert.equal(p.publication_status,'scheduled');assert.ok(!visible.includes(slug));assert.equal(p.datePublished,'2026-09-22');assert.ok(p.researched_at>='2026-09-22'&&p.researched_at<=p.dateModified);
  const chronology=p.audit_corrections.find(c=>c.reviewed_at==='2026-10-03');assert.ok(chronology);for(const locale of locales)assert.ok(chronology.prior_values.passages[locale]);
  for(const c of p.audit_corrections)for(const locale of locales)assert.ok(c.prior_values.passages[locale],slug+c.reviewed_at); // later corrections keep their history too
 }
 assert.equal(data.sources.find(x=>x.id==='smzdm-shimano-di2-market-observations-2026-08-24').accessed_at,'2026-08-24');
});
test('dated manufacturer-page claims cite recorded checks and keep their prior wording',()=>{
 const sources=new Map(data.sources.map(s=>[s.id,s]));
 for(const [slug,id] of [['brake-rotor-size-and-frame-approval','ican-graro-official-recheck-2026-10-22'],['seatpost-offset-and-saddle-rails','lightcarbon-lcr018-d-official-recheck-2026-10-22'],['one-by-vs-two-by-gravel','ican-graro-official-recheck-2026-10-22'],['subcompact-vs-compact-road-gearing','ican-graro-official-recheck-2026-10-22'],['choosing-bike-when-specs-unknown','twitter-v3-25yr-store-recheck-2026-10-22'],['when-geometry-chart-does-not-add-up','lightcarbon-lcr018-d-official-recheck-2026-10-22']]){
  const p=post(slug),text=JSON.stringify(p.translations);
  assert.equal(sources.get(id).accessed_at,'2026-10-22',id);
  assert.doesNotMatch(text,/October (4|10|14)\b|10月(4|10|14)日|\b(4|10|14)\. Oktober/,slug);
  assert.match(text,/October 22, 2026/,slug);
  const corrections=p.audit_corrections.filter(c=>c.reviewed_at==='2026-10-22');
  assert.ok(corrections.length&&corrections.every(c=>c.reason.length>40&&locales.every(l=>c.prior_values.passages[l])),slug);
  assert.match(JSON.stringify(corrections.map(c=>c.prior_values.passages)),/October (4|10|14)\b/,slug);
 }
 const brochure=sources.get('incolor-speedster-brochure-2026-08-29').url;
 for(const l of locales)assert.ok(post('incolor-speedster-sr-vs-sr-plus').translations[l].sections[0].paragraphs[0].includes(`](${brochure})`),l);
});
test('the source-supported Elves quiet-season shortening stays visible in every language',()=>{
 const p=post('buy-elves-bike'),source=data.sources.find(s=>s.id==='elves-terms-recheck-2026-10-22');
 assert.match(source.notes,/quieter times of the year when this estimate is significantly reduced/);
 assert.ok(p.source_ids.includes(source.id));
 const text=l=>p.translations[l].sections[1].paragraphs[0];
 assert.match(text('en'),/quieter times of the year can significantly reduce/);assert.match(text('zh-Hans'),/淡季可能缩短/);assert.match(text('de'),/ruhigeren Zeiten des Jahres/);
 const latest=p.audit_corrections.at(-1);assert.doesNotMatch(latest.reason,/unrecorded/);assert.match(latest.prior_values.passages['zh-Hans'],/淡季可能缩短/);
 assert.doesNotMatch(post('brake-rotor-size-and-frame-approval').translations.de.sections[1].paragraphs[0],/steht[^.]*steht/);
});
test('dated 2026-10-22 policy and reference readbacks back only articles that cite the same URL',()=>{
 const sources=new Map(data.sources.map(s=>[s.id,s]));let linked=0;
 for(const p of posts)for(const id of p.source_ids??[]){
  const s=sources.get(id);if(!s||!/-2026-10-22$/.test(id)||!s.url)continue;linked++;
  assert.equal(s.accessed_at,'2026-10-22',id);assert.match(s.notes,/^Live rendered-page readback on 2026-10-22(?:\.| of\b)/,id);
  assert.ok(JSON.stringify(p.translations).includes(s.url)||(p.editorial_references??[]).includes(s.url),`${p.slug} does not cite ${s.url}`);
 }
 assert.ok(linked>=24,String(linked));
});
