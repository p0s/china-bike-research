import fs from 'node:fs';
import path from 'node:path';

const iso = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
export function validateSchedule(queue, posts) {
  if (queue.schema_version !== 1 || queue.timezone !== 'Asia/Singapore' || queue.entries?.length !== 20) throw new Error('Expected the authorized twenty-post schedule.');
  const drafts = posts.filter(p => p.publication_status === 'scheduled');
  if (drafts.length !== 20 || new Set(queue.entries.map(e=>e.slug)).size !== 20) throw new Error('Schedule must cover twenty unique drafts.');
  let pending = false;
  for (const [index, entry] of queue.entries.entries()) {
    if (!drafts.some(p=>p.slug === entry.slug) || !iso(entry.scheduled_at)) throw new Error('Unknown draft or invalid schedule date.');
    if (!Number.isInteger(entry.gap_minutes) || (index === 0 ? entry.gap_minutes !== 0 : entry.gap_minutes < 2880 || entry.gap_minutes > 7200)) throw new Error('Release intervals must be two to five days.');
    if (index && Date.parse(entry.scheduled_at) - Date.parse(queue.entries[index-1].scheduled_at) !== entry.gap_minutes * 60000) throw new Error('Schedule dates disagree with fixed intervals.');
    if (entry.published_at !== null) {
      if (pending || !iso(entry.published_at) || Date.parse(entry.published_at) < Date.parse(entry.scheduled_at)) throw new Error('Early or out-of-order publication.');
      if (index && Date.parse(entry.published_at) - Date.parse(queue.entries[index-1].published_at) < entry.gap_minutes * 60000) throw new Error('Publication intervals cannot be compressed.');
    } else pending = true;
  }
  if (queue.entries[0].scheduled_at !== '2026-09-25T12:20:00.000Z') throw new Error('First release must remain September 25, 2026 at 20:20 Singapore time.');
  return queue;
}

export function loadSchedule(root, posts) {
  return validateSchedule(JSON.parse(fs.readFileSync(path.join(root, 'content/post-schedule.json'), 'utf8')), posts);
}

export function publishedPosts(posts, queue, now = new Date()) {
  validateSchedule(queue, posts);
  return posts.flatMap(post => {
    if (!post.publication_status) return [post];
    if (post.publication_status !== 'scheduled') throw new Error('Unknown article publication state.');
    const entry = queue.entries.find(e=>e.slug === post.slug);
    if (!entry?.published_at || Date.parse(entry.published_at) > +now) return [];
    const date = entry.published_at.slice(0,10);
    return [{...post, datePublished:date, dateModified:post.dateModified > date ? post.dateModified : date}];
  }).sort((a,b)=>b.datePublished.localeCompare(a.datePublished) || a.slug.localeCompare(b.slug));
}

export function nextPublication(queue, receipts = {}, now = new Date()) {
  // A committed release must be proven live before advancing to another article.
  for (const entry of queue.entries) {
    if (entry.published_at && receipts[entry.slug]?.published_at !== entry.published_at) return {action:'verify', entry};
  }
  const index=queue.entries.findIndex(e=>!e.published_at);
  if(index < 0) return {action:'complete'};
  const entry=queue.entries[index];
  const previous=index ? receipts[queue.entries[index-1].slug] : null;
  if(previous && !iso(previous.verified_at)) throw new Error('Invalid previous publication receipt.');
  const due=Math.max(Date.parse(entry.scheduled_at), previous ? Date.parse(previous.verified_at)+entry.gap_minutes*60000 : 0);
  return {action:+now>=due?'publish':'wait', entry, due_at:new Date(due).toISOString()};
}

export function preparePublication(queue, receipts, slug, now = new Date()) {
  const next=nextPublication(queue, receipts, now);
  if(next.action!=='publish' || next.entry.slug!==slug) throw new Error(`Not due: ${next.action} ${next.entry?.slug ?? ''} ${next.due_at ?? ''}`);
  const updated=structuredClone(queue);
  updated.entries.find(e=>e.slug===slug).published_at=now.toISOString();
  return updated;
}

export function oneShotRule(timestamp) {
  if(!iso(timestamp)) throw new Error('Invalid wake timestamp.');
  const local=new Date(Date.parse(timestamp)+8*3600000);
  return `RRULE:FREQ=YEARLY;BYMONTH=${local.getUTCMonth()+1};BYMONTHDAY=${local.getUTCDate()};BYHOUR=${local.getUTCHours()};BYMINUTE=${local.getUTCMinutes()};BYSECOND=${local.getUTCSeconds()};COUNT=1`;
}
