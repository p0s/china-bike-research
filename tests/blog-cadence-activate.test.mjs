import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadPosts } from '../src/lib/posts.mjs';
import { activateCadence } from '../scripts/blog-cadence-activate.mjs';
import { activateSeries } from '../scripts/blog-series-activate.mjs';

const root = path.resolve(import.meta.dirname, '..');
function fixture(t, missingReceipt = false) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'china-bikes-cadence-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  fs.mkdirSync(path.join(dir, 'content/posts'), {recursive: true});
  fs.mkdirSync(path.join(dir, '.research'), {recursive: true});
  const queue = JSON.parse(fs.readFileSync(path.join(root, 'content/post-schedule.json'), 'utf8'));
  queue.schema_version = 2;delete queue.delivery;
  for (const entry of queue.entries) entry.published_at = null;
  const original = queue.entries.filter(entry => entry.series_id === 'september-2026');
  for (const entry of original.slice(0, 2)) entry.published_at = entry.scheduled_at;
  const receipts = Object.fromEntries(original.slice(0, missingReceipt ? 1 : 2).map(entry => [entry.slug, {published_at: entry.published_at, verified_at: new Date(Date.parse(entry.published_at) + 60000).toISOString()}]));
  fs.writeFileSync(path.join(dir, 'content/post-schedule.json'), JSON.stringify(queue));
  fs.writeFileSync(path.join(dir, '.research/blog-publication-state.json'), JSON.stringify({schema_version: 1, receipts}));
  for (const post of loadPosts(root)) fs.writeFileSync(path.join(dir, 'content/posts', post.slug + '.json'), JSON.stringify(post));
  return {dir, file: path.join(dir, 'content/post-schedule.json'), queue};
}

test('cadence activation preserves historical entries, schedules both series, and is idempotent', t => {
  const f = fixture(t), now = new Date('2026-10-06T00:00:00.000Z');
  const stateBefore = fs.readFileSync(path.join(f.dir, '.research/blog-publication-state.json'), 'utf8');
  const result = activateCadence(f.dir, now);
  assert.equal(result.remaining, 118);
  const migrated = JSON.parse(fs.readFileSync(f.file, 'utf8'));
  assert.deepEqual(migrated.entries, f.queue.entries);
  assert.ok(migrated.delivery.entries.slice(1).every(slot => slot.gap_minutes >= 120 && slot.gap_minutes <= 180));
  const before = fs.readFileSync(f.file, 'utf8');
  assert.equal(activateCadence(f.dir, new Date('2026-10-08')).activated, false);
  assert.equal(activateSeries(f.dir, new Date('2026-10-08')).activated, false);
  assert.equal(fs.readFileSync(f.file, 'utf8'), before);
  assert.equal(fs.readFileSync(path.join(f.dir, '.research/blog-publication-state.json'), 'utf8'), stateBefore);
});

test('a missing live receipt blocks cadence activation before any schedule or journal write', t => {
  const f = fixture(t, true), before = fs.readFileSync(f.file, 'utf8');
  assert.throws(() => activateCadence(f.dir, new Date('2026-10-06')), /prepared release/);
  assert.equal(fs.readFileSync(f.file, 'utf8'), before);
  assert.equal(fs.existsSync(path.join(f.dir, '.research/blog-cadence-activation.json')), false);
});

test('an interrupted cadence migration resumes the same random plan and refuses changed input', t => {
  const f = fixture(t), rename = fs.renameSync;
  fs.renameSync = (from, to) => {
    if (to === f.file) throw new Error('simulated interruption');
    return rename(from, to);
  };
  try { assert.throws(() => activateCadence(f.dir, new Date('2026-10-06')), /interruption/); }
  finally { fs.renameSync = rename; }
  const journal = JSON.parse(fs.readFileSync(path.join(f.dir, '.research/blog-cadence-activation.json'), 'utf8'));
  const original = fs.readFileSync(f.file, 'utf8');
  fs.writeFileSync(f.file, original + '\n');
  assert.throws(() => activateCadence(f.dir, new Date('2026-10-07')), /different source schedule/);
  fs.writeFileSync(f.file, original);
  assert.equal(activateCadence(f.dir, new Date('2026-10-07')).activated, true);
  assert.deepEqual(JSON.parse(fs.readFileSync(f.file, 'utf8')), journal.queue);
});
