import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPosts,renderPost,renderBlogIndex,relatedArticleLinks} from '../src/lib/posts.mjs';
import {loadSchedule,validateSchedule,publishedPosts,nextPublication,preparePublication,oneShotRule,scheduleSeries,nextWakeRule,acceleratePublication} from '../src/lib/post-publication.mjs';
import {loadDataset,joinProducts,joinCatalogCandidates} from '../src/lib/data.mjs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const allPosts=loadPosts(root),committedQueue=loadSchedule(root,allPosts);
const posts=allPosts.filter(post=>post.series_id!=='october-2026');
const queue={schema_version:1,timezone:'Asia/Singapore',entries:structuredClone(scheduleSeries(committedQueue).find(series=>series.id==='september-2026').entries)};
for(const entry of queue.entries)entry.published_at=null;
const start=new Date(queue.entries[0].scheduled_at);
const data=loadDataset();
const ctx={data,products:joinProducts(data),catalogCandidates:joinCatalogCandidates(data),base:'',siteUrl:'https://chinesebikes.xyz',siteLastmod:data.meta.snapshot_date};
test('the committed queue remains valid as releases are prepared',()=>{
 const prepared=committedQueue.entries.filter(entry=>entry.published_at!==null).length;
 assert.equal(publishedPosts(allPosts,committedQueue,new Date('2030-01-01T00:00:00Z')).length,5+prepared);
 assert.equal(nextPublication(committedQueue,{},new Date('2030-01-01')).action,prepared?'verify':'publish');
});
test('the fixed twenty-entry calendar starts three days after the request and preserves every random gap',()=>{
 assert.equal(queue.entries.length,20);
 assert.equal(start.toISOString(),'2026-09-25T12:20:00.000Z');
 assert.equal(new Set(queue.entries.map(e=>e.gap_minutes)).size>10,true);
 assert.throws(()=>validateSchedule({...queue,entries:queue.entries.slice(1)},posts));
 const early=structuredClone(queue);early.entries[0].published_at='2026-09-24T12:20:00Z';
 assert.throws(()=>validateSchedule(early,posts));
 const reordered=structuredClone(queue);reordered.entries[1].published_at=reordered.entries[1].scheduled_at;
 assert.throws(()=>validateSchedule(reordered,posts));
});
test('time alone never publishes a draft, even after the entire calendar has passed',()=>{
 const visible=publishedPosts(posts,queue,new Date('2030-01-01T00:00:00Z'));
 assert.equal(visible.length,5);
 const html=renderBlogIndex({...ctx,posts:visible},visible);
 for(const e of queue.entries)assert.ok(!html.includes('/blog/'+e.slug+'/'));
 assert.equal(relatedArticleLinks({...ctx,posts:visible},'seka-spear-rdc'),'');
});
test('release preparation rejects early, wrong-order and duplicate requests',()=>{
 const slug=queue.entries[0].slug;
 assert.throws(()=>preparePublication(queue,{},slug,new Date(+start-1)),/Not due/);
 assert.throws(()=>preparePublication(queue,{},queue.entries[1].slug,start),/Not due/);
 const ready=preparePublication(queue,{},slug,start);
 assert.equal(publishedPosts(posts,ready,start).length,6);
 assert.equal(publishedPosts(posts,ready,new Date(+start-1)).length,5);
 assert.throws(()=>preparePublication(ready,{},slug,start),/verify/);
 assert.equal(nextPublication(ready,{},new Date('2030-01-01')).action,'verify');
});
test('delayed verified delivery shifts the next due time and prevents catch-up bursts',()=>{
 const ready=preparePublication(queue,{},queue.entries[0].slug,start);
 const receipt={published_at:start.toISOString(),verified_at:'2026-10-01T10:00:00.000Z'};
 const receipts={[queue.entries[0].slug]:receipt};
 const expected=Date.parse(receipt.verified_at)+queue.entries[1].gap_minutes*60000;
 assert.equal(nextPublication(ready,receipts,new Date(expected-1)).action,'wait');
 assert.equal(nextPublication(ready,receipts,new Date(expected)).action,'publish');
 assert.equal(nextPublication(ready,receipts,new Date(expected)).due_at,new Date(expected).toISOString());
});
test('all twenty releases require their own receipt, then terminate',()=>{
 let current=structuredClone(queue),receipts={},now=start;
 for(const entry of queue.entries){
   const next=nextPublication(current,receipts,new Date('2030-01-01'));
   now=new Date(next.due_at);
   current=preparePublication(current,receipts,entry.slug,now);
   validateSchedule(current,posts);
   assert.equal(nextPublication(current,receipts,now).action,'verify');
   receipts[entry.slug]={published_at:now.toISOString(),verified_at:now.toISOString()};
 }
 assert.equal(publishedPosts(posts,current,new Date('2030-01-01')).length,25);
 assert.equal(nextPublication(current,receipts).action,'complete');
 assert.throws(()=>preparePublication(current,receipts,queue.entries[0].slug),/complete/);
});
test('draft links remain plain text until their target is published',()=>{
 const visible=publishedPosts(posts,queue);
 const post=structuredClone(visible[0]);
 post.translations.en.sections[0].paragraphs.push('[Future guide](/blog/buy-seka-bike/)');
 const html=renderPost({...ctx,posts:visible},post,visible);
 assert.ok(html.includes('Future guide'));
 assert.ok(!html.includes('href="/blog/buy-seka-bike/"'));
});
test('scheduler instructions encode the Singapore wall clock without a DTSTART override',()=>{
 assert.equal(oneShotRule(start.toISOString()),'RRULE:FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=25;BYHOUR=20;BYMINUTE=20;BYSECOND=0;BYSETPOS=1;COUNT=1');
 assert.equal(oneShotRule('2026-12-31T18:04:00.000Z'),'RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1;BYHOUR=2;BYMINUTE=4;BYSECOND=0;BYSETPOS=1;COUNT=1');
});

function expandedFixture() {
 const old=structuredClone(queue.entries);
 const prepared=scheduleSeries(committedQueue).find(series=>series.id==='september-2026').entries;
 for(let i=0;i<2;i++)old[i].published_at=prepared[i].published_at??prepared[i].scheduled_at;
 const ready='2026-10-04T04:00:00.000Z',start='2026-10-04T12:00:00.000Z';
 const additional=Array.from({length:100},(_,i)=>({...structuredClone(posts[0]),slug:`new-reader-question-${i+1}`,series_id:'october-2026',publication_status:'scheduled',editorial_review:{status:'reviewed',reviewed_at:ready}}));
 const entries=[...old.map(entry=>({...entry,series_id:'september-2026'})),...additional.map((post,i)=>({series_id:'october-2026',slug:post.slug,scheduled_at:new Date(Date.parse(start)+i*480*60000).toISOString(),gap_minutes:i?480:0,published_at:null}))];
 const expanded={schema_version:2,timezone:'Asia/Singapore',series:[{id:'september-2026'},{id:'october-2026',cadence_minutes:480,ready_at:ready}],entries};
 const receipts=Object.fromEntries(old.slice(0,2).map(e=>[e.slug,{published_at:e.published_at,verified_at:new Date(Date.parse(e.published_at)+60000).toISOString()}]));
 return {queue:expanded,posts:[...posts,...additional],receipts,start};
}

test('the additional hundred cannot enter the queue with missing review, wrong count or short intervals',()=>{
 const f=expandedFixture();validateSchedule(f.queue,f.posts);
 const unreviewed=structuredClone(f.posts);delete unreviewed.at(-1).editorial_review;
 assert.throws(()=>validateSchedule(f.queue,unreviewed),/review/);
 const missing=structuredClone(f.queue);missing.entries.pop();
 assert.throws(()=>validateSchedule(missing,f.posts));
 const short=structuredClone(f.queue);short.entries[21].gap_minutes=479;
 assert.throws(()=>validateSchedule(short,f.posts),/interval/);
 const early=structuredClone(f.queue);early.series[1].ready_at=early.entries[20].scheduled_at;
 assert.throws(()=>validateSchedule(early,f.posts),/ready/);
});

test('unqueued authored drafts stay hidden and removing their state fails closed',()=>{
 const f=expandedFixture();const draft={...structuredClone(f.posts.at(-1)),slug:'not-yet-queued',publication_status:'draft'};
 assert.equal(publishedPosts([...f.posts,draft],f.queue,new Date('2030-01-01')).some(p=>p.slug===draft.slug),false);
 delete draft.publication_status;
 assert.throws(()=>publishedPosts([...f.posts,draft],f.queue),/explicit draft/);
});

test('one coordinator chooses the earliest due series and blocks both on unverified delivery',()=>{
 const f=expandedFixture(),now=new Date(f.start);
 const next=nextPublication(f.queue,f.receipts,now);
 assert.equal(next.series_id,'october-2026');
 assert.throws(()=>preparePublication(f.queue,f.receipts,f.queue.entries[2].slug,now),/Not due/);
 const prepared=preparePublication(f.queue,f.receipts,next.entry.slug,now);
 assert.equal(nextPublication(prepared,f.receipts,new Date('2030-01-01')).action,'verify');
 assert.throws(()=>preparePublication(prepared,f.receipts,f.queue.entries[2].slug,new Date('2030-01-01')),/verify/);
 assert.deepEqual(scheduleSeries(prepared)[0].entries.map(e=>e.gap_minutes),queue.entries.map(e=>e.gap_minutes));
});

test('a delayed new release leaves at least eight hours after actual verification',()=>{
 const f=expandedFixture(),start=new Date(f.start),slug=f.queue.entries[20].slug;
 const prepared=preparePublication(f.queue,f.receipts,slug,start);
 const verified='2026-10-04T15:30:00.000Z';
 const receipts={...f.receipts,[slug]:{published_at:start.toISOString(),verified_at:verified}};
 const expected=Date.parse(verified)+480*60000;
 assert.equal(nextPublication(prepared,receipts,new Date(expected-1)).action,'wait');
 assert.equal(nextPublication(prepared,receipts,new Date(expected)).entry.slug,f.queue.entries[21].slug);
 assert.equal(nextPublication(prepared,receipts,new Date(expected)).due_at,new Date(expected).toISOString());
 assert.throws(()=>preparePublication(prepared,receipts,f.queue.entries[21].slug,new Date(expected-1)),/Not due/);
});

test('an overdue next series uses a future one-shot instead of a past annual selector',()=>{
 const now=new Date('2026-10-04T12:00:00.000Z');
 assert.equal(nextWakeRule({due_at:'2026-10-03T12:00:00.000Z'},now),oneShotRule('2026-10-04T12:01:00.000Z'));
 assert.equal(nextWakeRule({action:'complete'},now),null);
});

function acceleratedFixture(gap = 150) {
 const f = expandedFixture();
 const now = new Date('2026-10-06T00:00:00.000Z');
 f.queue = acceleratePublication(f.queue, f.receipts, now, () => gap);
 validateSchedule(f.queue, f.posts);
 return {...f, now};
}

test('accelerating the remaining queue preserves prior releases and the original calendars',()=>{
 const old = expandedFixture(), before = structuredClone(old.queue.entries);
 const f = acceleratedFixture();
 assert.deepEqual(f.queue.entries, before);
 assert.equal(f.queue.delivery.entries.length, 118);
 assert.equal(f.queue.delivery.entries[0].scheduled_at, f.now.toISOString());
 assert.equal(nextPublication(f.queue, f.receipts, f.now).action, 'publish');
 assert.equal(publishedPosts(f.posts, f.queue, f.now).length, 7);
 assert.deepEqual(acceleratePublication(f.queue, f.receipts, new Date('2030-01-01'), () => 180), f.queue);
});

test('the shared delivery queue blocks both series until its exact release is verified',()=>{
 const f = acceleratedFixture(), next = nextPublication(f.queue, f.receipts, f.now);
 const prepared = preparePublication(f.queue, f.receipts, next.entry.slug, f.now);
 validateSchedule(prepared, f.posts);
 assert.equal(nextPublication(prepared, f.receipts, new Date('2030-01-01')).action, 'verify');
 assert.throws(() => preparePublication(prepared, f.receipts, f.queue.delivery.entries[1].slug, new Date('2030-01-01')), /verify/);
});

test('two-to-three-hour intervals apply across series after actual live confirmation',()=>{
 const f = acceleratedFixture();
 const first = nextPublication(f.queue, f.receipts, f.now);
 const prepared = preparePublication(f.queue, f.receipts, first.entry.slug, f.now);
 const verified = '2026-10-07T10:00:00.000Z';
 const receipts = {...f.receipts, [first.entry.slug]: {published_at: f.now.toISOString(), verified_at: verified}};
 const expected = new Date(Date.parse(verified) + 150 * 60000);
 assert.equal(nextPublication(prepared, receipts, new Date(+expected - 1)).action, 'wait');
 const next = nextPublication(prepared, receipts, expected);
 assert.equal(next.action, 'publish');
 assert.equal(next.due_at, expected.toISOString());
 assert.equal(next.interval_minutes, 150);
 assert.throws(() => preparePublication(prepared, receipts, next.entry.slug, new Date(+expected - 1)), /Not due/);
});

test('accelerated delivery rejects missing articles, reordering, short or inconsistent gaps and early releases',()=>{
 for (const mutate of [
   q => {q.delivery.entries.pop();},
   q => {q.delivery.entries[1].slug = q.delivery.entries[0].slug;},
   q => {q.delivery.entries[1].gap_minutes = 119;},
   q => {q.delivery.entries[1].gap_minutes = 181;},
   q => {q.delivery.entries[1].scheduled_at = q.delivery.entries[0].scheduled_at;},
   q => {q.entries.find(e => e.slug === q.delivery.entries[0].slug).published_at = '2026-10-05T23:59:59.000Z';},
   q => {q.entries.find(e => e.slug === q.delivery.entries[1].slug).published_at = q.delivery.entries[1].scheduled_at;}
 ]) {
   const f = acceleratedFixture();mutate(f.queue);
   assert.throws(() => validateSchedule(f.queue, f.posts));
 }
 const f = expandedFixture();
 assert.throws(() => acceleratePublication(f.queue, f.receipts, new Date(f.start), () => 119), /120 to 180/);
 const prepared = preparePublication(f.queue, f.receipts, nextPublication(f.queue, f.receipts, new Date(f.start)).entry.slug, new Date(f.start));
 assert.throws(() => acceleratePublication(prepared, f.receipts), /prepared release/);
});

test('the entire accelerated queue delivers once per selected gap and ends only after every receipt',()=>{
 const f = acceleratedFixture(120);let current = f.queue;const receipts = {...f.receipts};
 for (const slot of current.delivery.entries) {
   const next = nextPublication(current, receipts, new Date('2030-01-01'));
   assert.equal(next.entry.slug, slot.slug);
   const now = new Date(next.due_at);
   current = preparePublication(current, receipts, slot.slug, now);
   validateSchedule(current, f.posts);
   assert.equal(nextPublication(current, receipts, now).action, 'verify');
   receipts[slot.slug] = {published_at: now.toISOString(), verified_at: new Date(+now + 20 * 60000).toISOString()};
 }
 assert.equal(nextPublication(current, receipts).action, 'complete');
 assert.equal(nextWakeRule(nextPublication(current, receipts)), null);
 assert.equal(publishedPosts(f.posts, current, new Date('2030-01-01')).length, 125);
});
