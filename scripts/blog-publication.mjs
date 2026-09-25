import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {loadPosts} from '../src/lib/posts.mjs';
import {loadSchedule, nextPublication, preparePublication, oneShotRule} from '../src/lib/post-publication.mjs';
const root=path.resolve(import.meta.dirname,'..');
const scheduleFile=path.join(root,'content/post-schedule.json');
const stateFile=path.join(root,'.research/blog-publication-state.json');
const queue=loadSchedule(root,loadPosts(root));
const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{schema_version:1,receipts:{}};
const [command='status',slug,deployment]=process.argv.slice(2);
const write=(file,data)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(data,null,2)+'\n');fs.renameSync(file+'.tmp',file);};
const digest=text=>crypto.createHash('sha256').update(text).digest('hex');
if(command==='status') {
 const next=nextPublication(queue,state.receipts);
 console.log(JSON.stringify({...next,completed:Object.keys(state.receipts).length,rrule:next.due_at?oneShotRule(next.due_at):null},null,2));
} else if(command==='prepare') {
 if(!slug || deployment) throw new Error('Usage: node scripts/blog-publication.mjs prepare EXACT-SLUG');
 write(scheduleFile,preparePublication(queue,state.receipts,slug));
 console.log('Prepared one due article. It is not confirmed published until PR merge, deployment and live verification.');
} else if(command==='confirm') {
 const next=nextPublication(queue,state.receipts);
 if(next.action!=='verify'||next.entry.slug!==slug||!deployment||!/^[a-f0-9-]{36}$/.test(deployment)) throw new Error('Usage: confirm NEXT-UNVERIFIED-SLUG CLOUDFLARE-VERSION-UUID');
 const proof=[];
 for(const prefix of ['', '/zh']) {
  const route=prefix+'/blog/'+slug+'/';
  const local=fs.readFileSync(path.join(root,'dist',route,'index.html'),'utf8');
  const response=await fetch('https://chinesebikes.xyz'+route,{redirect:'error',signal:AbortSignal.timeout(30000)});
  const remote=await response.text();
  if(response.status!==200 || digest(local)!==digest(remote)) throw new Error('Live article does not match local production output: '+route);
  proof.push({route,sha256:digest(remote)});
 }
 const sitemapResponse=await fetch('https://chinesebikes.xyz/sitemap.xml',{redirect:'error',signal:AbortSignal.timeout(30000)});
 const sitemap=await sitemapResponse.text();
 if(sitemapResponse.status!==200||!proof.every(p=>sitemap.includes('https://chinesebikes.xyz'+p.route))) throw new Error('Live sitemap is missing the released article.');
 const indexResponse=await fetch('https://chinesebikes.xyz/blog/',{redirect:'error',signal:AbortSignal.timeout(30000)});
 const index=await indexResponse.text();
 if(indexResponse.status!==200||!index.includes('/blog/'+slug+'/')) throw new Error('Live blog index is missing the released article.');
 state.receipts[slug]={published_at:next.entry.published_at,verified_at:new Date().toISOString(),deployment_id:deployment,proof};
 write(stateFile,state);
 const following=nextPublication(queue,state.receipts);
 console.log(JSON.stringify({confirmed:slug,next:following,rrule:following.due_at?oneShotRule(following.due_at):null},null,2));
} else throw new Error('Supported commands: status, prepare, confirm.');
