import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPosts,renderPost,renderBlogIndex,relatedArticleLinks} from '../src/lib/posts.mjs';
import {loadSchedule,validateSchedule,publishedPosts,nextPublication,preparePublication,oneShotRule} from '../src/lib/post-publication.mjs';
import {loadDataset,joinProducts,joinCatalogCandidates} from '../src/lib/data.mjs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const posts=loadPosts(root),queue=loadSchedule(root,posts);
const start=new Date(queue.entries[0].scheduled_at);
const data=loadDataset();
const ctx={data,products:joinProducts(data),catalogCandidates:joinCatalogCandidates(data),base:'',siteUrl:'https://chinesebikes.xyz',siteLastmod:data.meta.snapshot_date};
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
 assert.equal(visible.length,4);
 const html=renderBlogIndex({...ctx,posts:visible},visible);
 for(const e of queue.entries)assert.ok(!html.includes('/blog/'+e.slug+'/'));
 assert.equal(relatedArticleLinks({...ctx,posts:visible},'seka-spear-rdc'),'');
});
test('release preparation rejects early, wrong-order and duplicate requests',()=>{
 const slug=queue.entries[0].slug;
 assert.throws(()=>preparePublication(queue,{},slug,new Date(+start-1)),/Not due/);
 assert.throws(()=>preparePublication(queue,{},queue.entries[1].slug,start),/Not due/);
 const ready=preparePublication(queue,{},slug,start);
 assert.equal(publishedPosts(posts,ready,start).length,5);
 assert.equal(publishedPosts(posts,ready,new Date(+start-1)).length,4);
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
 assert.equal(publishedPosts(posts,current,new Date('2030-01-01')).length,24);
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
 assert.equal(oneShotRule(start.toISOString()),'RRULE:FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=25;BYHOUR=20;BYMINUTE=20;BYSECOND=0;COUNT=1');
 assert.equal(oneShotRule('2026-12-31T18:04:00.000Z'),'RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1;BYHOUR=2;BYMINUTE=4;BYSECOND=0;COUNT=1');
});
