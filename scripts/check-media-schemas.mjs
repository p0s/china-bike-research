import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadDataset,validateDataset} from '../src/lib/data.mjs';
const require=createRequire(import.meta.url);
let Ajv;
try { Ajv=require(process.env.MEDIA_SCHEMA_VALIDATOR_MODULE || 'ajv/dist/2020.js').default; }
catch { throw new Error('Supply an existing Ajv draft-2020 validator through MEDIA_SCHEMA_VALIDATOR_MODULE; this check does not install dependencies.'); }
const ajv=new Ajv({allErrors:true,strict:false});
ajv.addFormat('date',value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value);
ajv.addFormat('uri',value=>{try{return Boolean(new URL(value).protocol);}catch{return false;}});
const data=loadDataset();
assert.deepEqual(validateDataset(data),[]);
const validators={};
for(const kind of ['image','video']) {
 const schema=JSON.parse(fs.readFileSync(new URL(`../schemas/${kind}.schema.json`,import.meta.url),'utf8'));
 assert.equal(ajv.validateSchema(schema),true,JSON.stringify(ajv.errors));
 validators[kind]=ajv.compile(schema);
 for(const record of data[`${kind}s`])assert.equal(validators[kind](record),true,`${record.id}: ${JSON.stringify(validators[kind].errors)}`);
}
const photo=data.images.find(image=>image.hosting.local_path?.startsWith('/assets/images/sourced/official/'));
const youtube=data.videos.find(video=>video.provider==='youtube');
const xhs=data.videos.find(video=>video.provider==='xhs');
let rejected=0,crossChecks=0;
function reject(kind,record,mutate,runtime=true) {
 const changed=structuredClone(record);mutate(changed);
 assert.equal(validators[kind](changed),false,`${record.id}: malformed fixture accepted by schema`);
 if(runtime) {const copy=structuredClone(data);copy[`${kind}s`]=copy[`${kind}s`].map(item=>item.id===record.id?changed:item);assert.ok(validateDataset(copy).some(error=>error.includes(record.id)),`${record.id}: malformed fixture accepted by runtime`);}
 rejected++;
}
for(const mutate of [
 image=>{image.undocumented_field=true;},
])reject('image',photo,mutate,false);
for(const mutate of [
 image=>{image.candidate_id=data.candidates[0].id;},
 image=>{delete image.privacy_review;},
 image=>{image.rights.status='official-page-embed';},
 image=>{image.hosting.variants[0].sha256='invalid';},
 image=>{image.hosting.variants.find(v=>v.purpose==='card').bytes=100001;},
 image=>{image.hosting.variants.find(v=>v.purpose==='card').width=481;},
 image=>{image.hosting.variants.find(v=>v.purpose==='detail').bytes=400001;},
 image=>{image.hosting.variants[1].purpose=image.hosting.variants[0].purpose;},
 image=>{image.source_media_url='http://example.com/photo.webp';},
 image=>{image.editorial_quotation.removal_route='http://example.com/removal';},
 image=>{image.editorial_quotation.no_license_asserted=false;},
])reject('image',photo,mutate);
for(const mutate of [
 video=>{video.provider='unknown';},
 video=>{video.youtube_video_id='bad';},
 video=>{video.channel_url='http://www.youtube.com/channel/test';},
 video=>{video.target={platform_id:data.platforms[0].id,candidate_id:data.candidates[0].id};},
 video=>{video.match=video.match==='exact-platform'?'exact-variant':'exact-platform';},
])reject('video',youtube,mutate);
for(const mutate of [
 video=>{delete video.source_archive_sha256;},
 video=>{video.xhs_post_id='invalid';},
 video=>{video.url+='?tracking=unsafe';},
 video=>{video.youtube_video_id=youtube.youtube_video_id;},
 video=>{video.timestamps=[];},
])reject('video',xhs,mutate);
for(const [kind,record,mutate] of [
 ['image',photo,image=>{image.hosting.local_path=image.hosting.variants.find(v=>v.purpose==='card').url;}],
 ['video',youtube,video=>{video.url='https://www.youtube.com/watch?v=abcdefghijk';if(video.youtube_video_id==='abcdefghijk')video.url='https://www.youtube.com/watch?v=ABCDEFGHIJK';}],
 ['video',xhs,video=>{video.disclosure_url='https://www.xiaohongshu.com/explore/000000000000000000000000';}],
]) {
 const changed=structuredClone(record);mutate(changed);
 assert.equal(validators[kind](changed),true,'Sibling comparisons remain executable checks');
 const copy=structuredClone(data);copy[`${kind}s`]=copy[`${kind}s`].map(item=>item.id===record.id?changed:item);
 assert.ok(validateDataset(copy).some(error=>error.includes(record.id)));crossChecks++;
}
console.log(`Media schemas passed: ${data.images.length} images, ${data.videos.length} videos; ${rejected} malformed fixtures rejected; ${crossChecks} sibling-value checks retained in runtime.`);
