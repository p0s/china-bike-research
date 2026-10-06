import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadPosts } from '../src/lib/posts.mjs';
import { validateSchedule, nextPublication } from '../src/lib/post-publication.mjs';

const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(file + '.tmp', file);
};

export function activateSeries(root, now = new Date()) {
  const scheduleFile = path.join(root, 'content/post-schedule.json');
  const journalFile = path.join(root, '.research/blog-series-activation.json');
  const stateFile = path.join(root, '.research/blog-publication-state.json');
  const queue = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));
  const posts = loadPosts(root);
  if ([2, 3].includes(queue.schema_version)) {
    validateSchedule(queue, posts);
    return { activated: false, reason: 'The additional series is already scheduled.' };
  }
  const original = posts.filter(post => post.series_id !== 'october-2026');
  validateSchedule(queue, original);
  const receipts = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')).receipts : {};
  if (nextPublication(queue, receipts, now).action === 'verify') throw new Error('Finish the prepared release before activating another series.');
  const additional = posts.filter(post => post.series_id === 'october-2026');
  if (additional.length !== 100 || additional.some(post => post.editorial_review?.status !== 'reviewed' || !['draft', 'scheduled'].includes(post.publication_status))) throw new Error('Exactly 100 complete, reviewed new articles are required.');
  const slugs = additional.map(post => post.slug).sort();
  let journal = fs.existsSync(journalFile) ? JSON.parse(fs.readFileSync(journalFile, 'utf8')) : null;
  if (journal && JSON.stringify(journal.slugs) !== JSON.stringify(slugs)) throw new Error('Activation recovery has a different article set.');
  if (!journal) {
    journal = { ready_at: new Date(Math.ceil(+now / 1000) * 1000).toISOString(), slugs };
    write(journalFile, journal);
  }
  // Order comes from the reviewed editorial plan, not filesystem or title sorting.
  const ordered = [...additional].sort((a, b) => a.series_order - b.series_order);
  if (ordered.some((post, index) => post.series_order !== index + 1)) throw new Error('Reviewed series needs unique orders 1 through 100.');
  const updated = {
    schema_version: 2, timezone: 'Asia/Singapore',
    series: [{ id: 'september-2026' }, { id: 'october-2026', cadence_minutes: 480, ready_at: journal.ready_at }],
    entries: [
      ...queue.entries.map(entry => ({ ...entry, series_id: 'september-2026' })),
      ...ordered.map((post, index) => ({ series_id: 'october-2026', slug: post.slug, scheduled_at: new Date(Date.parse(journal.ready_at) + (index + 1) * 480 * 60000).toISOString(), gap_minutes: index ? 480 : 0, published_at: null }))
    ]
  };
  const scheduled = additional.map(post => ({ ...post, publication_status: 'scheduled' }));
  validateSchedule(updated, [...original, ...scheduled]);
  // An interrupted source update fails the build closed. Rerunning recovers the same journal.
  for (const post of scheduled) write(path.join(root, 'content/posts', post.slug + '.json'), post);
  write(scheduleFile, updated);
  return { activated: true, total: 100, first_due_at: updated.entries[20].scheduled_at, interval_minutes: 480 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.length !== 2) throw new Error('Usage: node scripts/blog-series-activate.mjs');
  console.log(JSON.stringify(activateSeries(path.resolve(import.meta.dirname, '..')), null, 2));
}
