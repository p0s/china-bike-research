import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {activateSeries} from '../scripts/blog-series-activate.mjs';
import {loadPosts} from '../src/lib/posts.mjs';
import {loadSchedule,publishedPosts,scheduleSeries} from '../src/lib/post-publication.mjs';
const root=path.resolve(import.meta.dirname,'..');
const originals=loadPosts(root).filter(p=>p.series_id!=='october-2026');
const source=JSON.parse(fs.readFileSync(path.join(root,'content/post-schedule.json'),'utf8'));
const old={schema_version:1,timezone:'Asia/Singapore',entries:scheduleSeries(source).find(s=>s.id==='september-2026').entries.map(({series_id,...entry})=>entry)};
function fixture(t,count=100){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'china-bikes-activate-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.mkdirSync(path.join(dir,'content/posts'),{recursive:true});
 fs.mkdirSync(path.join(dir,'.research'));
 fs.writeFileSync(path.join(dir,'content/post-schedule.json'),JSON.stringify(old));
 const receipts=Object.fromEntries(old.entries.filter(e=>e.published_at).map(e=>[e.slug,{published_at:e.published_at,verified_at:new Date(Date.parse(e.published_at)+60000).toISOString()}]));
 fs.writeFileSync(path.join(dir,'.research/blog-publication-state.json'),JSON.stringify({receipts}));
 for(const p of originals)fs.writeFileSync(path.join(dir,'content/posts',p.slug+'.json'),JSON.stringify(p));
 for(let i=0;i<count;i++){
  const p={...structuredClone(originals[0]),slug:`fresh-article-${i+1}`,series_id:'october-2026',series_order:i+1,publication_status:'draft',editorial_review:{status:'reviewed',reviewed_at:'2026-10-04T03:00:00.000Z'}};
  fs.writeFileSync(path.join(dir,'content/posts',p.slug+'.json'),JSON.stringify(p));
 }
 return dir;
}

test('activation refuses a missing article before changing the calendar or source states',t=>{
 const dir=fixture(t,99),file=path.join(dir,'content/post-schedule.json'),before=fs.readFileSync(file,'utf8');
 assert.throws(()=>activateSeries(dir,new Date('2026-10-04T04:00:00Z')),/Exactly 100/);
 assert.equal(fs.readFileSync(file,'utf8'),before);
 assert.ok(loadPosts(dir).filter(p=>p.series_id==='october-2026').every(p=>p.publication_status==='draft'));
});

test('activation preserves the old calendar and schedules all reviewed articles in editorial order',t=>{
 const dir=fixture(t),now=new Date('2026-10-04T04:00:00Z');
 const result=activateSeries(dir,now);
 assert.deepEqual(result,{activated:true,total:100,first_due_at:'2026-10-04T12:00:00.000Z',interval_minutes:480});
 const posts=loadPosts(dir),queue=loadSchedule(dir,posts);
 assert.deepEqual(queue.entries.slice(0,20).map(({series_id,...e})=>e),old.entries);
 assert.deepEqual(queue.entries.slice(20).map(e=>e.slug),Array.from({length:100},(_,i)=>`fresh-article-${i+1}`));
 assert.equal(queue.entries[119].scheduled_at,'2026-11-06T12:00:00.000Z');
 assert.ok(publishedPosts(posts,queue,new Date('2030-01-01')).every(p=>p.series_id!=='october-2026'));
 const before=fs.readFileSync(path.join(dir,'content/post-schedule.json'),'utf8');
 assert.equal(activateSeries(dir,new Date('2026-10-05T04:00:00Z')).activated,false);
 assert.equal(fs.readFileSync(path.join(dir,'content/post-schedule.json'),'utf8'),before);
});

test('an interrupted activation recovers its first date rather than rerandomizing',t=>{
 const dir=fixture(t),ready='2026-10-04T04:00:00.000Z';
 const additional=loadPosts(dir).filter(p=>p.series_id==='october-2026');
 fs.writeFileSync(path.join(dir,'.research/blog-series-activation.json'),JSON.stringify({ready_at:ready,slugs:additional.map(p=>p.slug).sort()}));
 const changed={...additional[0],publication_status:'scheduled'};
 fs.writeFileSync(path.join(dir,'content/posts',changed.slug+'.json'),JSON.stringify(changed));
 assert.throws(()=>loadSchedule(dir,loadPosts(dir)),/every scheduled article/);
 assert.equal(activateSeries(dir,new Date('2026-10-04T06:00:00Z')).first_due_at,'2026-10-04T12:00:00.000Z');
 loadSchedule(dir,loadPosts(dir));
});
