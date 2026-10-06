import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadPosts } from '../src/lib/posts.mjs';
import { loadSchedule, validateSchedule, acceleratePublication, nextPublication } from '../src/lib/post-publication.mjs';

const digest = text => createHash('sha256').update(text).digest('hex');
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(file + '.tmp', file);
};

export function activateCadence(root, now = new Date()) {
  const file = path.join(root, 'content/post-schedule.json');
  const journalFile = path.join(root, '.research/blog-cadence-activation.json');
  const posts = loadPosts(root);
  const queue = loadSchedule(root, posts);
  if (queue.schema_version === 3) return { activated: false, reason: 'Two-to-three-hour delivery is already active.' };
  const state = JSON.parse(fs.readFileSync(path.join(root, '.research/blog-publication-state.json'), 'utf8'));
  if (nextPublication(queue, state.receipts, now).action === 'verify') throw new Error('Finish the prepared release before changing delivery cadence.');
  const before = digest(fs.readFileSync(file));
  let journal = fs.existsSync(journalFile) ? JSON.parse(fs.readFileSync(journalFile, 'utf8')) : null;
  if (journal && journal.before_sha256 !== before) throw new Error('Cadence recovery has a different source schedule.');
  if (!journal) {
    journal = { before_sha256: before, queue: acceleratePublication(queue, state.receipts, now) };
    validateSchedule(journal.queue, posts);
    write(journalFile, journal);
  }
  validateSchedule(journal.queue, posts);
  write(file, journal.queue);
  return { activated: true, remaining: journal.queue.delivery.entries.length, min_gap_minutes: 120, max_gap_minutes: 180, next: nextPublication(journal.queue, state.receipts, now) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.length !== 2) throw new Error('Usage: node scripts/blog-cadence-activate.mjs');
  console.log(JSON.stringify(activateCadence(path.resolve(import.meta.dirname, '..')), null, 2));
}
