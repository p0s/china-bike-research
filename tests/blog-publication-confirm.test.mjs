import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

function confirmation(mismatch=false, missingIndex=false, exposedDraft=false) {
 const code=[
  "import fs from 'node:fs';import assert from 'node:assert/strict';",
  "const originalRead=fs.readFileSync;const queue=JSON.parse(originalRead('content/post-schedule.json','utf8'));fs.existsSync=file=>!String(file).includes('/dist/');",
  "const entry=queue.entries.find(entry=>entry.published_at);const slug=entry.slug;let written=false;const requested=[];",
  "fs.readFileSync=function(file,...args){if(String(file).endsWith('/.research/blog-publication-state.json'))return JSON.stringify({schema_version:1,receipts:{}});if(String(file).includes('/dist/'))return '<html>exact production article</html>';return originalRead.call(this,file,...args);};",
  "fs.mkdirSync=()=>{};fs.writeFileSync=()=>{written=true;};fs.renameSync=()=>{};",
  "globalThis.fetch=async(url,options)=>{assert.equal(options.headers.dnt,'1');assert.equal(options.headers['sec-gpc'],'1');assert.equal(options.redirect,'error');assert.ok(options.signal instanceof AbortSignal);requested.push(url);",
  "const isIndex=/\\/blog\\/$/.test(url);const prefix=new URL(url).pathname.replace(/\\/blog\\/$/,'');const current=url.endsWith('/blog/'+slug+'/');",
  "const html=url.endsWith('/sitemap.xml')?['','/zh','/de'].map(prefix=>'https://chinesebikes.xyz'+prefix+'/blog/'+slug+'/').join(' '):isIndex?"+
   (missingIndex?"(prefix==='/de'?'missing':prefix+'/blog/'+slug+'/')":"prefix+'/blog/'+slug+'/'")+":"+
   JSON.stringify(mismatch?'<html>different deployment</html>':'<html>exact production article</html>')+";return new Response(html,{status:!current&&!isIndex&&!url.endsWith('/sitemap.xml')?"+(exposedDraft?'200':'404')+":200});};",
  "process.argv=['node','blog-publication.mjs','confirm',slug,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'];",
  mismatch
   ? "await assert.rejects(import('./scripts/blog-publication.mjs'),/Live article does not match/);assert.equal(written,false);assert.equal(requested.length,1);"
   : missingIndex || exposedDraft
    ? "await assert.rejects(import('./scripts/blog-publication.mjs'),/"+(missingIndex?'Live blog index':'Next draft')+"/);assert.equal(written,false);"
    : "await import('./scripts/blog-publication.mjs');assert.equal(written,true);assert.equal(requested.filter(url=>/\\/blog\\/$/.test(url)).length,3);assert.equal(requested.length,13);"
 ].join('\n');
 return spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:path.resolve(import.meta.dirname,'..'),encoding:'utf8'});
}

test('live confirmation opts out of analytics for all languages, sitemap and index',()=>{
 const result=confirmation(false);assert.equal(result.status,0,result.stderr+'\n'+result.stdout);
});
test('a different live deployment cannot write a publication receipt',()=>{
 const result=confirmation(true);assert.equal(result.status,0,result.stderr);
});
test('a missing language index cannot write a publication receipt',()=>{
 const result=confirmation(false,true);assert.equal(result.status,0,result.stderr);
});
test('an exposed next draft cannot write a publication receipt',()=>{
 const result=confirmation(false,false,true);assert.equal(result.status,0,result.stderr);
});
