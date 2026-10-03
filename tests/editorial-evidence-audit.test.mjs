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
 assert.equal(source.type,'secondary-ai-video-summary-index');assert.equal(source.accessed_at,'2026-08-30');assert.match(source.notes,/8\.80 kg size-490.*with pedals.*8\.36 kg size-450 pedal-excluded/);assert.match(source.notes,/Original playback\/transcript.*unverified/);
 assert.equal(entry.candidate.facts.complete_weight_g,undefined);assert.match(entry.candidate.facts.complete_weight,/8\.3 kg bare/);assert.match(entry.candidate.facts.stiffness_evidence,/secondary AI-generated.*unverified/);
 assert.equal(entry.candidate.observed_price.low_cny,8999);assert.equal(entry.candidate.observed_price.high_cny,9597.25);assert.equal(entry.candidate.observed_at,'2026-08-08');
 for(const locale of locales){const html=renderCandidateModel({...ctx,locale},entry);assert.match(html,locale==='en'?/secondary AI-generated summary/:locale==='zh-Hans'?/AI 转述摘要/:/sekundäre KI-Zusammenfassung/);}
});
test('chronology corrections preserve prior passages and schedules without releasing any of the three drafts',()=>{
 const queue=loadSchedule(new URL('..',import.meta.url).pathname,posts);
 const visible=publishedPosts(posts,queue,new Date('2026-10-03T12:00:00.000Z')).map(p=>p.slug);
 for(const slug of ['buy-yoeleo-bike','buy-elves-bike','chinese-bike-shipping-times']){
  const p=post(slug);assert.equal(p.publication_status,'scheduled');assert.ok(!visible.includes(slug));assert.equal(p.datePublished,'2026-09-22');assert.equal(p.researched_at,'2026-09-22');
  assert.equal(p.audit_corrections.at(-1).reviewed_at,'2026-10-03');for(const locale of locales)assert.ok(p.audit_corrections.at(-1).prior_values.passages[locale]);
 }
 assert.equal(data.sources.find(x=>x.id==='smzdm-shimano-di2-market-observations-2026-08-24').accessed_at,'2026-08-24');
});
