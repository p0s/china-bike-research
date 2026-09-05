import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createBuildOutput, internalRouteTarget } from '../src/lib/build-output.mjs';
function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bike-output-'));
  fs.mkdirSync(path.join(root,'dist'));fs.writeFileSync(path.join(root,'dist','index.html'),'previous good build');
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;
}
test('discarding a failed build preserves existing output',t=>{
  const root=fixture(t), output=createBuildOutput(root);fs.writeFileSync(path.join(output.directory,'partial'),'broken');output.discard();
  assert.equal(fs.readFileSync(path.join(root,'dist','index.html'),'utf8'),'previous good build');assert.equal(fs.existsSync(output.directory),false);
});
test('publish replaces output only after checks; cleanup does not delete published site',t=>{
  const root=fixture(t),output=createBuildOutput(root);fs.writeFileSync(path.join(output.directory,'index.html'),'new checked build');output.publish();output.discard();
  assert.equal(fs.readFileSync(path.join(root,'dist','index.html'),'utf8'),'new checked build');assert.deepEqual(fs.readdirSync(root),['dist']);assert.throws(()=>output.publish());
});
test('rename failure rolls back old output',t=>{
  const root=fixture(t),output=createBuildOutput(root);const original=fs.renameSync;
  t.mock.method(fs,'renameSync',(from,to)=>{if(from===output.directory)throw Error('simulated disk error');return original(from,to)});
  assert.throws(()=>output.publish(),/simulated disk error/);
  assert.equal(fs.readFileSync(path.join(root,'dist','index.html'),'utf8'),'previous good build');output.discard();
});
test('first build publishes without an existing dist',t=>{
  const root=fixture(t);fs.rmSync(path.join(root,'dist'),{recursive:true});const output=createBuildOutput(root);fs.writeFileSync(path.join(output.directory,'index.html'),'first');output.publish();assert.equal(fs.existsSync(path.join(root,'dist','index.html')),true);
});
test('internal routes match an exact base and remain inside output',()=>{
  const root=path.resolve('/tmp/dist');
  assert.equal(internalRouteTarget(root,'/bikes','/bikes/models/frame/'),path.join(root,'models/frame/index.html'));
  assert.equal(internalRouteTarget(root,'','/'),path.join(root,'index.html'));
  for(const url of ['/bikes-other/a','/bikes/%ZZ','/bikes/%00','/bikes/%2e%2e%2fsecret','/bikes/%5csecret'])assert.equal(internalRouteTarget(root,'/bikes',url),null,url);
});
