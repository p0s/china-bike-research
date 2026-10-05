import test from 'node:test';
import assert from 'node:assert/strict';
import {isCalendarDate} from '../src/lib/calendar-date.mjs';
import {loadDataset,validateDataset} from '../src/lib/data.mjs';
import {validateImageHealthCheck,imageHealthIsFreshAndHealthy} from '../src/lib/image-health.mjs';
const data=loadDataset();

test('evidence dates obey calendar month lengths and Gregorian century leap years',()=>{
  for(const date of ['2026-02-28','2024-02-29','2000-02-29','2400-02-29','1900-02-28','2100-02-28','2026-04-30','2026-12-31']) assert.equal(isCalendarDate(date),true,date);
  for(const date of ['2026-02-29','2026-02-30','2024-02-30','1900-02-29','2100-02-29','2026-04-31','2026-06-31','2026-09-31','2026-11-31','2026-00-01','2026-13-01','2026-01-00','2026-01-32','2026-2-28','2026-02-28T00:00:00Z',null,20260228]) assert.equal(isCalendarDate(date),false,String(date));
});

test('image review, evidence and privacy dates reject calendar rollover through the dataset validator',()=>{
  for(const field of ['reviewed_at','review_evidence','privacy_review']){
    const copy=structuredClone(data);
    const image=copy.images.find(image=>field==='reviewed_at'||image[field]?.reviewed_at);
    assert.ok(image,field);
    if(field==='reviewed_at')image.reviewed_at='2026-02-30';else image[field].reviewed_at='2026-02-30';
    assert.ok(validateDataset(copy).some(error=>error.includes(`image ${image.id}:`)&&/review|privacy/.test(error)),field);
  }
});

test('video dates reject impossible days while accepting valid leap-day evidence without rewriting it',()=>{
  for(const field of ['accessed_at','published_at']){
    const copy=structuredClone(data),video=copy.videos[0];video[field]='2026-02-30';
    assert.ok(validateDataset(copy).includes(`video ${video.id}: invalid ${field}`),field);
    video[field]='2024-02-29';assert.deepEqual(validateDataset(copy),[]);
    assert.equal(video[field],'2024-02-29');
  }
});

test('invalid remote-image health dates cannot validate or authorize a fresh healthy resource',()=>{
  const image={id:'calendar-health',hosting:{mode:'remote',remote_url:'https://example.com/photo.webp'},health_check:{checked_at:'2024-02-29',resources:[{target_id:'calendar-health',url:'https://example.com/photo.webp',classification:'healthy',status:200,content_type:'image/webp'}]}};
  assert.deepEqual(validateImageHealthCheck(image),[]);
  assert.equal(imageHealthIsFreshAndHealthy(image,'2024-03-01'),true);
  image.health_check.checked_at='2026-02-30';
  assert.deepEqual(validateImageHealthCheck(image),['image calendar-health: invalid health_check.checked_at']);
  assert.equal(imageHealthIsFreshAndHealthy(image,'2026-03-02'),false);
  image.health_check.checked_at='2026-02-28';
  assert.equal(imageHealthIsFreshAndHealthy(image,'2026-02-30'),false);
});
