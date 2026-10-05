import fs from 'node:fs';
import path from 'node:path';

const iso = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const legacyStart = '2026-09-25T12:20:00.000Z';
const authorized = {
  'september-2026': { count: 20, cadence: 'random', min: 2880, max: 7200 },
  'october-2026': { count: 100, cadence: 'fixed', min: 480, max: 480 }
};

export function scheduleSeries(queue) {
  if (queue.schema_version === 1) return [{ id: 'september-2026', entries: queue.entries }];
  if (queue.schema_version !== 2 || !Array.isArray(queue.series) || queue.series.length !== 2 || new Set(queue.series.map(s => s.id)).size !== 2 || queue.series.some(s => !authorized[s.id])) throw new Error('Unknown editorial series.');
  return queue.series.map(series => ({ ...series, entries: queue.entries.filter(entry => entry.series_id === series.id) }));
}

export function validateSchedule(queue, posts) {
  if (queue.timezone !== 'Asia/Singapore' || !Array.isArray(queue.entries)) throw new Error('Invalid publication schedule.');
  const series = scheduleSeries(queue);
  const drafts = posts.filter(post => post.publication_status === 'scheduled');
  if (drafts.length !== queue.entries.length || new Set(queue.entries.map(e => e.slug)).size !== queue.entries.length) throw new Error('Schedule must cover every scheduled article exactly once.');
  if (series.reduce((count, s) => count + s.entries.length, 0) !== queue.entries.length) throw new Error('Article belongs to an unknown series.');
  for (const post of posts) {
    if (post.series_id === 'october-2026' && !['draft', 'scheduled'].includes(post.publication_status)) throw new Error('New-series articles require an explicit draft or scheduled state.');
    if (post.publication_status && !['draft', 'scheduled'].includes(post.publication_status)) throw new Error('Unknown article publication state.');
  }
  for (const item of series) {
    const rule = authorized[item.id];
    if (item.entries.length !== rule.count) throw new Error(`Expected ${rule.count} articles in ${item.id}.`);
    if (item.id === 'october-2026' && (item.cadence_minutes !== 480 || !iso(item.ready_at) || Date.parse(item.entries[0].scheduled_at) < Date.parse(item.ready_at) + 480 * 60000)) throw new Error('New series must be ready before its eight-hour schedule starts.');
    let pending = false;
    for (const [index, entry] of item.entries.entries()) {
      const post = drafts.find(p => p.slug === entry.slug);
      if (!post || !iso(entry.scheduled_at)) throw new Error('Unknown draft or invalid schedule date.');
      if (item.id === 'october-2026' && (post.series_id !== item.id || post.editorial_review?.status !== 'reviewed' || !iso(post.editorial_review.reviewed_at))) throw new Error('Every new article needs its completed editorial review before scheduling.');
      if (!Number.isInteger(entry.gap_minutes) || (index === 0 ? entry.gap_minutes !== 0 : entry.gap_minutes < rule.min || entry.gap_minutes > rule.max)) throw new Error(`Invalid interval for ${item.id}.`);
      if (index && Date.parse(entry.scheduled_at) - Date.parse(item.entries[index - 1].scheduled_at) !== entry.gap_minutes * 60000) throw new Error('Schedule dates disagree with fixed intervals.');
      if (entry.published_at !== null) {
        if (pending || !iso(entry.published_at) || Date.parse(entry.published_at) < Date.parse(entry.scheduled_at)) throw new Error('Early or out-of-order publication.');
        if (index && Date.parse(entry.published_at) - Date.parse(item.entries[index - 1].published_at) < entry.gap_minutes * 60000) throw new Error('Publication intervals cannot be compressed.');
      } else pending = true;
    }
    if (item.id === 'september-2026' && item.entries[0].scheduled_at !== legacyStart) throw new Error('The original first release must remain unchanged.');
  }
  return queue;
}

export function loadSchedule(root, posts) {
  return validateSchedule(JSON.parse(fs.readFileSync(path.join(root, 'content/post-schedule.json'), 'utf8')), posts);
}

export function publishedPosts(posts, queue, now = new Date()) {
  validateSchedule(queue, posts);
  return posts.flatMap(post => {
    if (!post.publication_status) return [post];
    if (post.publication_status === 'draft') return [];
    const entry = queue.entries.find(e => e.slug === post.slug);
    if (!entry?.published_at || Date.parse(entry.published_at) > +now) return [];
    const date = entry.published_at.slice(0, 10);
    return [{ ...post, datePublished: date, dateModified: post.dateModified > date ? post.dateModified : date }];
  }).sort((a, b) => b.datePublished.localeCompare(a.datePublished) || a.slug.localeCompare(b.slug));
}

export function nextPendingArticles(queue) {
  return scheduleSeries(queue).flatMap(series => {
    const entry = series.entries.find(e => !e.published_at);
    return entry ? [entry] : [];
  });
}

export function nextPublication(queue, receipts = {}, now = new Date()) {
  // Recovery blocks every queue, including another otherwise-due series.
  for (const entry of queue.entries) {
    const receipt = receipts[entry.slug];
    if (entry.published_at && receipt?.published_at !== entry.published_at) return { action: 'verify', entry };
    if (receipt && (!iso(receipt.published_at) || !iso(receipt.verified_at) || receipt.published_at !== entry.published_at || Date.parse(receipt.verified_at) < Date.parse(receipt.published_at))) throw new Error('Invalid publication receipt.');
  }
  const candidates = scheduleSeries(queue).flatMap(series => {
    const index = series.entries.findIndex(e => !e.published_at);
    if (index < 0) return [];
    const entry = series.entries[index];
    const previous = index ? receipts[series.entries[index - 1].slug] : null;
    const due = Math.max(Date.parse(entry.scheduled_at), previous ? Date.parse(previous.verified_at) + entry.gap_minutes * 60000 : 0);
    return [{ action: +now >= due ? 'publish' : 'wait', entry, series_id: series.id, due_at: new Date(due).toISOString() }];
  });
  return candidates.sort((a, b) => a.due_at.localeCompare(b.due_at) || a.entry.slug.localeCompare(b.entry.slug))[0] ?? { action: 'complete' };
}

export function preparePublication(queue, receipts, slug, now = new Date()) {
  const next = nextPublication(queue, receipts, now);
  if (next.action !== 'publish' || next.entry.slug !== slug) throw new Error(`Not due: ${next.action} ${next.entry?.slug ?? ''} ${next.due_at ?? ''}`);
  const updated = structuredClone(queue);
  updated.entries.find(e => e.slug === slug).published_at = now.toISOString();
  return updated;
}

export function oneShotRule(timestamp) {
  if (!iso(timestamp)) throw new Error('Invalid wake timestamp.');
  const local = new Date(Math.ceil(Date.parse(timestamp) / 1000) * 1000 + 8 * 3600000);
  // BYSETPOS selects the sole match and keeps calendar rules on the app's
  // local-wall-clock path. Without it, yearly rules use RFC UTC semantics.
  return `RRULE:FREQ=YEARLY;BYMONTH=${local.getUTCMonth() + 1};BYMONTHDAY=${local.getUTCDate()};BYHOUR=${local.getUTCHours()};BYMINUTE=${local.getUTCMinutes()};BYSECOND=${local.getUTCSeconds()};BYSETPOS=1;COUNT=1`;
}

export function nextWakeRule(next, now = new Date()) {
  if (!next.due_at) return null;
  // Independent series can both be due. Rearm a future wake, never a past annual date.
  return oneShotRule(new Date(Math.max(Date.parse(next.due_at), +now + 60000)).toISOString());
}
