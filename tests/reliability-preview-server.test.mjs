import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { createPreviewServer, parsePort, normalizeBase } from '../scripts/serve.mjs';

async function fixture(t, base='') {
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'bike-preview-'));
  const root=path.join(temp,'dist'); await fs.mkdir(root);
  await fs.writeFile(path.join(root,'index.html'),'<h1>Catalog</h1>');
  await fs.mkdir(path.join(root,'models')); await fs.writeFile(path.join(root,'models','index.html'),'Model index');
  await fs.mkdir(path.join(root,'empty'));
  await fs.mkdir(path.join(temp,'dist-private')); await fs.writeFile(path.join(temp,'dist-private','secret.txt'),'PRIVATE');
  await fs.symlink(path.join(temp,'dist-private'),path.join(root,'outside'),'dir');
  await fs.writeFile(path.join(root,'photo.webp'),'WEBP');
  await fs.writeFile(path.join(root,'app.mjs'),'export const n=1;');
  const server=createPreviewServer({root,base}); server.listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await fs.rm(temp,{recursive:true,force:true});});
  const get=(url,method='GET',headers={})=>new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port:server.address().port,path:url,method,headers},res=>{
      const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));
    });req.on('error',reject);req.end();
  });
  return {get,root};
}
test('GET, HEAD, MIME and cache revalidation',async t=>{
  const {get}=await fixture(t); const a=await get('/'); assert.equal(a.status,200);assert.match(a.body,/Catalog/);
  const h=await get('/','HEAD');assert.equal(h.body,'');assert.equal(h.headers['content-length'],String(Buffer.byteLength(a.body)));
  const cached=await get('/','GET',{'if-none-match':a.headers.etag});assert.equal(cached.status,304);assert.equal(cached.body,'');
  assert.equal((await get('/photo.webp')).headers['content-type'],'image/webp');
  assert.equal((await get('/app.mjs')).headers['content-type'],'text/javascript; charset=utf-8');
  assert.equal(a.headers['x-content-type-options'],'nosniff');
});
test('directory redirect preserves query; missing directory index and missing 404 do not crash',async t=>{
  const {get}=await fixture(t);const r=await get('/models?q=1');assert.equal(r.status,308);assert.equal(r.headers.location,'/models/?q=1');
  assert.equal((await get('/empty/')).status,404);assert.equal((await get('/missing')).status,404);assert.equal((await get('/')).status,200);
});
test('custom 404 status and HEAD behavior',async t=>{
  const {get,root}=await fixture(t);await fs.writeFile(path.join(root,'404.html'),'Custom missing');
  assert.deepEqual((await get('/none')).body,'Custom missing');assert.equal((await get('/404.html')).status,404);
  assert.equal((await get('/none','HEAD')).body,'');
});
test('sibling-directory traversal and external symlinks are forbidden',async t=>{
  const {get}=await fixture(t);
  for(const url of ['/%2e%2e%2fdist-private/secret.txt','/outside/secret.txt','/%2e%2e%2f%2e%2e%2fetc/passwd']) {
    const r=await get(url);assert.equal(r.status,403,url);assert.doesNotMatch(r.body,/PRIVATE/);
  }
});
test('malformed requests cannot crash the process',async t=>{
  const {get}=await fixture(t);
  for(const url of ['/%ZZ','/%00','/%5c..%5csecret','//example.invalid/'])assert.equal((await get(url)).status,400,url);
  assert.equal((await get('/','GET',{Host:'['})).status,200);assert.equal((await get('/')).status,200);
});
test('only read methods are allowed',async t=>{
  const {get}=await fixture(t);const r=await get('/','POST');assert.equal(r.status,405);assert.equal(r.headers.allow,'GET, HEAD');
});
test('GitHub Pages base is segment-safe and root redirects',async t=>{
  const {get}=await fixture(t,'/china-bike-research');
  assert.equal((await get('/')).headers.location,'/china-bike-research/');
  assert.equal((await get('/china-bike-research')).status,308);
  assert.equal((await get('/china-bike-research/')).status,200);
  assert.equal((await get('/china-bike-research-evil/')).status,404);
});
test('port and base configuration is validated',()=>{
  assert.equal(parsePort('0'),0);assert.equal(parsePort('65535'),65535);assert.equal(normalizeBase('/bike/'),'/bike');assert.equal(normalizeBase('/'),'');
  for(const value of [-1,'NaN','12.5','',65536,' 80 '])assert.throws(()=>parsePort(value));
  for(const value of ['../private','/bike//other','/a?b','https://example.com','/a/<b>'])assert.throws(()=>normalizeBase(value));
});
