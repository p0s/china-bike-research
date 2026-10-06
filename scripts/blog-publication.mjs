import { LOCALES, LOCALE_PREFIXES } from '../src/lib/i18n.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {loadPosts} from '../src/lib/posts.mjs';
import {loadSchedule, nextPublication, preparePublication, nextWakeRule, scheduleSeries, nextPendingArticles} from '../src/lib/post-publication.mjs';
const root=path.resolve(import.meta.dirname,'..');
const scheduleFile=path.join(root,'content/post-schedule.json');
const stateFile=path.join(root,'.research/blog-publication-state.json');
const queue=loadSchedule(root,loadPosts(root));
const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{schema_version:1,receipts:{}};
const [command='status',slug,deployment]=process.argv.slice(2);
const write=(file,data)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(data,null,2)+'\n');fs.renameSync(file+'.tmp',file);};
const digest=text=>crypto.createHash('sha256').update(text).digest('hex');
// Verification must neither count as a visit nor receive per-visitor analytics markup.
const liveOptions=()=>({headers:{dnt:'1','sec-gpc':'1'},redirect:'error',signal:AbortSignal.timeout(30000)});
if(command==='status') {
 const next=nextPublication(queue,state.receipts);
 const progress=scheduleSeries(queue).map(series=>({id:series.id,total:series.entries.length,completed:series.entries.filter(entry=>entry.published_at&&state.receipts[entry.slug]?.published_at===entry.published_at).length}));
 console.log(JSON.stringify({...next,total:queue.entries.length,completed:progress.reduce((sum,item)=>sum+item.completed,0),series:progress,cadence:queue.delivery?{min_gap_minutes:120,max_gap_minutes:180,remaining:queue.entries.filter(entry=>!entry.published_at||state.receipts[entry.slug]?.published_at!==entry.published_at).length}:undefined,rrule:nextWakeRule(next)},null,2));
} else if(command==='prepare') {
 if(!slug || deployment) throw new Error('Usage: node scripts/blog-publication.mjs prepare EXACT-SLUG');
 write(scheduleFile,preparePublication(queue,state.receipts,slug));
 console.log('Prepared one due article. It is not confirmed published until PR merge, deployment and live verification.');
} else if(command==='confirm') {
 const next=nextPublication(queue,state.receipts);
 if(next.action!=='verify'||next.entry.slug!==slug||!deployment||!/^[a-f0-9-]{36}$/.test(deployment)) throw new Error('Usage: confirm NEXT-UNVERIFIED-SLUG CLOUDFLARE-VERSION-UUID');
 const proof=[];
 for(const prefix of LOCALES.map(locale => LOCALE_PREFIXES[locale])) {
  const route=prefix+'/blog/'+slug+'/';
  const local=fs.readFileSync(path.join(root,'dist',route,'index.html'),'utf8');
  const response=await fetch('https://chinesebikes.xyz'+route,liveOptions());
  const remote=await response.text();
  if(response.status!==200 || digest(local)!==digest(remote)) throw new Error('Live article does not match local production output: '+route);
  proof.push({route,sha256:digest(remote)});
 }
 const sitemapResponse=await fetch('https://chinesebikes.xyz/sitemap.xml',liveOptions());
 const sitemap=await sitemapResponse.text();
 if(sitemapResponse.status!==200||!proof.every(p=>sitemap.includes('https://chinesebikes.xyz'+p.route))) throw new Error('Live sitemap is missing the released article.');
 const indexProof=[],pendingProof=[];
 const drafts=queue.entries.filter(entry=>!entry.published_at);
 for(const prefix of LOCALES.map(locale=>LOCALE_PREFIXES[locale])) {
  const route=prefix+'/blog/';
  const response=await fetch('https://chinesebikes.xyz'+route,liveOptions());
  const index=await response.text();
  if(response.status!==200||!index.includes(prefix+'/blog/'+slug+'/')) throw new Error('Live blog index is missing the released article: '+route);
  indexProof.push({route,sha256:digest(index)});
  for(const draft of drafts) {
   const draftRoute=prefix+'/blog/'+draft.slug+'/';
   if(index.includes(draftRoute)||sitemap.includes('https://chinesebikes.xyz'+draftRoute)||fs.existsSync(path.join(root,'dist',draftRoute,'index.html'))) throw new Error('Unreleased article exposed early: '+draftRoute);
  }
  for(const draft of nextPendingArticles(queue)) {
   const draftRoute=prefix+'/blog/'+draft.slug+'/';
   const response=await fetch('https://chinesebikes.xyz'+draftRoute,liveOptions());
   if(response.status!==404) throw new Error('Next draft is publicly available: '+draftRoute);
   pendingProof.push({route:draftRoute,status:response.status});
  }
 }
 state.receipts[slug]={published_at:next.entry.published_at,verified_at:new Date().toISOString(),deployment_id:deployment,proof,index_proof:indexProof,sitemap_sha256:digest(sitemap),pending_proof:pendingProof};
 write(stateFile,state);
 const following=nextPublication(queue,state.receipts);
 console.log(JSON.stringify({confirmed:slug,next:following,rrule:nextWakeRule(following)},null,2));
} else throw new Error('Supported commands: status, prepare, confirm.');
