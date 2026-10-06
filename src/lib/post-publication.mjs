import fs from 'node:fs';
import path from 'node:path';
import { randomInt } from 'node:crypto';

const iso = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const legacyStart = '2026-09-25T12:20:00.000Z';
const authorized = {
  'september-2026': { count: 20, cadence: 'random', min: 2880, max: 7200 },
  'october-2026': { count: 100, cadence: 'fixed', min: 480, max: 480 }
};

export function scheduleSeries(queue) {
  if (queue.schema_version === 1) return [{ id: 'september-2026', entries: queue.entries }];
  if (![2, 3].includes(queue.schema_version) || !Array.isArray(queue.series) || queue.series.length !== 2 || new Set(queue.series.map(s => s.id)).size !== 2 || queue.series.some(s => !authorized[s.id])) throw new Error('Unknown editorial series.');
  return queue.series.map(series => ({ ...series, entries: queue.entries.filter(entry => entry.series_id === series.id) }));
}

export function validateSchedule(queue, posts) {
  if (queue.timezone !== 'Asia/Singapore' || !Array.isArray(queue.entries)) throw new Error('Invalid publication schedule.');
  const series = scheduleSeries(queue);
  const accelerated = queue.schema_version === 3;
  const deliverySlugs = new Set(accelerated ? queue.delivery?.entries?.map(entry => entry.slug) : []);
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
        if (pending || !iso(entry.published_at) || (!deliverySlugs.has(entry.slug) && Date.parse(entry.published_at) < Date.parse(entry.scheduled_at))) throw new Error('Early or out-of-order publication.');
        if (index && !deliverySlugs.has(entry.slug) && Date.parse(entry.published_at) - Date.parse(item.entries[index - 1].published_at) < entry.gap_minutes * 60000) throw new Error('Publication intervals cannot be compressed.');
      } else pending = true;
    }
    if (item.id === 'september-2026' && item.entries[0].scheduled_at !== legacyStart) throw new Error('The original first release must remain unchanged.');
  }
  if (accelerated) validateDeliveryPlan(queue, series);
  else if (queue.delivery) throw new Error('Accelerated delivery requires schedule version 3.');
  return queue;
}

function validateDeliveryPlan(queue, series) {
  const plan = queue.delivery;
  if (!plan || plan.cadence !== 'random' || plan.min_gap_minutes !== 120 || plan.max_gap_minutes !== 180 || !iso(plan.activated_at) || !Array.isArray(plan.entries) || !plan.entries.length) throw new Error('Invalid two-to-three-hour delivery plan.');
  const slugs = new Set(plan.entries.map(entry => entry.slug));
  if (slugs.size !== plan.entries.length) throw new Error('Duplicate delivery article.');
  for (const entry of queue.entries) {
    if (!slugs.has(entry.slug) && (!entry.published_at || Date.parse(entry.published_at) >= Date.parse(plan.activated_at))) throw new Error('Delivery plan must cover every remaining article.');
  }
  for (const item of series) {
    const expected = item.entries.filter(entry => slugs.has(entry.slug)).map(entry => entry.slug);
    const actual = plan.entries.filter(entry => item.entries.some(original => original.slug === entry.slug)).map(entry => entry.slug);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Delivery must preserve each series editorial order.');
  }
  let pending = false;
  for (const [index, slot] of plan.entries.entries()) {
    const entry = queue.entries.find(entry => entry.slug === slot.slug);
    if (!entry || !iso(slot.scheduled_at) || !Number.isInteger(slot.gap_minutes) || (index === 0 ? slot.gap_minutes !== 0 : slot.gap_minutes < 120 || slot.gap_minutes > 180)) throw new Error('Invalid accelerated delivery slot.');
    const expected = index ? Date.parse(plan.entries[index - 1].scheduled_at) + slot.gap_minutes * 60000 : Date.parse(plan.activated_at);
    if (Date.parse(slot.scheduled_at) !== expected) throw new Error('Delivery dates disagree with selected intervals.');
    if (entry.published_at) {
      if (pending || Date.parse(entry.published_at) < expected) throw new Error('Early or out-of-order accelerated publication.');
      if (index && Date.parse(entry.published_at) - Date.parse(queue.entries.find(entry => entry.slug === plan.entries[index - 1].slug).published_at) < slot.gap_minutes * 60000) throw new Error('Accelerated publication intervals cannot be compressed.');
    } else pending = true;
  }
}

// One migration fixes the random slots. Later wakes never rerandomize them.
export function acceleratePublication(queue, receipts = {}, now = new Date(), chooseGap = () => randomInt(120, 181)) {
  if (queue.schema_version === 3) return structuredClone(queue);
  if (queue.schema_version !== 2) throw new Error('Activate the reviewed hundred before changing delivery cadence.');
  if (nextPublication(queue, receipts, now).action === 'verify') throw new Error('Finish the prepared release before changing delivery cadence.');
  const remaining = queue.entries.filter(entry => !entry.published_at).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at) || a.slug.localeCompare(b.slug));
  if (!remaining.length) throw new Error('All articles are already published.');
  const updated = structuredClone(queue);
  let due = Math.ceil(+now / 1000) * 1000;
  updated.schema_version = 3;
  updated.delivery = {
    cadence: 'random', min_gap_minutes: 120, max_gap_minutes: 180,
    activated_at: new Date(due).toISOString(),
    entries: remaining.map((entry, index) => {
      const gap = index ? chooseGap() : 0;
      if (!Number.isInteger(gap) || (index && (gap < 120 || gap > 180))) throw new Error('Delivery gap must be 120 to 180 minutes.');
      due += gap * 60000;
      return { slug: entry.slug, gap_minutes: gap, scheduled_at: new Date(due).toISOString() };
    })
  };
  return updated;
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
  if (queue.schema_version === 3) {
    const index = queue.delivery.entries.findIndex(slot => !queue.entries.find(entry => entry.slug === slot.slug).published_at);
    if (index < 0) return { action: 'complete' };
    const slot = queue.delivery.entries[index];
    const entry = queue.entries.find(entry => entry.slug === slot.slug);
    const previous = index ? receipts[queue.delivery.entries[index - 1].slug] : null;
    const due = Math.max(Date.parse(slot.scheduled_at), previous ? Date.parse(previous.verified_at) + slot.gap_minutes * 60000 : 0);
    return { action: +now >= due ? 'publish' : 'wait', entry, series_id: entry.series_id, due_at: new Date(due).toISOString(), interval_minutes: slot.gap_minutes };
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
