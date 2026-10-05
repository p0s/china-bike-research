import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadDataset} from '../src/lib/data.mjs';
const data=loadDataset();
const read=kind=>JSON.parse(fs.readFileSync(new URL(`../schemas/${kind}.schema.json`,import.meta.url),'utf8'));
function expand(schema,root) {
 if(schema.$ref)return expand(root.$defs[schema.$ref.split('/').at(-1)],root);
 return [schema,...['oneOf','anyOf','allOf'].flatMap(key=>(schema[key]??[]).flatMap(part=>expand(part,root)))];
}
function documented(value,schema,root,where='record') {
 const parts=expand(schema,root);
 if(Array.isArray(value)){const items=parts.find(part=>part.items)?.items;if(items)for(const item of value)documented(item,items,root,where+'[]');return;}
 if(!value||typeof value!=='object')return;
 const properties=Object.assign({},...parts.map(part=>part.properties??{}));
 assert.ok(parts.some(part=>part.additionalProperties===false),where+' requires a strict object boundary');
 for(const [key,item] of Object.entries(value)){assert.ok(properties[key],where+'.'+key+' is undocumented');documented(item,properties[key],root,where+'.'+key);}
}
test('every current image and video field is documented behind strict object boundaries',()=>{
 for(const kind of ['image','video']){const schema=read(kind);for(const record of data[kind+'s'])documented(record,schema,schema,record.id);}
});
test('public image contract retains gallery, provenance, privacy and separate responsive budgets',()=>{
 const schema=read('image');assert.deepEqual(schema.properties.role.enum,['primary','gallery']);
 assert.ok(schema.properties.rights.properties.status.enum.includes('source-attributed-rehost'));
 assert.equal(schema.properties.rights.additionalProperties,false);
 assert.equal(schema.$defs.variant.properties.width.maximum,1200);
 assert.equal(schema.$defs.variant.properties.bytes.maximum,400000);
 assert.ok(schema.allOf.some(rule=>rule.then?.required?.includes('privacy_review')));
 assert.ok(schema.$defs.quotationVariants.items.allOf.some(rule=>rule.then?.properties?.bytes?.maximum===40000));
 assert.ok(schema.$defs.quotationVariants.items.allOf.some(rule=>rule.then?.properties?.bytes?.maximum===88000));
});
test('public video contract documents both providers and every accepted relationship without a global YouTube requirement',()=>{
 const schema=read('video');assert.deepEqual(schema.properties.provider.enum,['youtube','xhs']);
 assert.ok(!schema.required.includes('youtube_video_id'));assert.ok(!schema.required.includes('channel_url'));
 for(const video of data.videos){assert.ok(schema.properties.relationship.enum.includes(video.relationship));assert.ok(schema.properties.provider.enum.includes(video.provider));}
 const youtube=schema.allOf.find(rule=>rule.if.properties.provider?.const==='youtube');
 const xhs=schema.allOf.find(rule=>rule.if.properties.provider?.const==='xhs');
 assert.deepEqual(youtube.then.required,['youtube_video_id','channel_url']);
 assert.deepEqual(xhs.then.required,['xhs_post_id','source_capture_archive','source_archive_sha256']);
 assert.ok(xhs.then.not.anyOf.some(rule=>rule.required.includes('timestamps')));
});
