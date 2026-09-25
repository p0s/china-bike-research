import { execFileSync, spawnSync } from 'node:child_process';
import { findCloudflareAccountIds } from './cloudflare-account-privacy.mjs';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

let base = process.argv[2] || process.env.COVERAGE_BASE_REF;
const head = process.argv[3] || 'HEAD';
if (!base) {
  console.log('Outgoing privacy scan skipped: supply a base ref to check a push or pull request.');
  process.exit(0);
}
if (/^0+$/.test(base)) {
  try { base = git('merge-base', 'origin/main', head).trim(); }
  catch { base = git('rev-parse', `${head}^`).trim(); }
}

const findings = [];
const messages = git('log', '--format=%B', `${base}..${head}`);
if (findCloudflareAccountIds(messages).length) findings.push('commit message');
const commits = git('rev-list', '--reverse', `${base}..${head}`).trim();
for (const commit of commits ? commits.split('\n') : []) {
  const changedPaths = execFileSync('git',
    ['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', '-m', '--no-renames', '-z', commit],
    { maxBuffer: 32 * 1024 * 1024 }).toString('utf8').split('\0').filter(Boolean);
  for (const file of new Set(changedPaths)) {
    const exists = spawnSync('git', ['cat-file', '-e', `${commit}:${file}`]);
    if (exists.status !== 0) continue; // Deleted in this commit.
    const result = spawnSync('git', ['show', `${commit}:${file}`], { maxBuffer: 32 * 1024 * 1024 });
    if (result.error || result.status !== 0) throw result.error || new Error(`Cannot read ${commit}:${file}`);
    if (result.stdout.includes(0)) continue;
    if (findCloudflareAccountIds(result.stdout.toString('utf8')).length) findings.push(`${commit.slice(0, 12)}:${file}`);
  }
}
if (findings.length) {
  console.error(`Outgoing privacy scan blocked ${findings.length} object(s): ${findings.join(', ')}`);
  process.exit(1);
}
console.log(`Outgoing privacy scan passed for commits after ${base.slice(0, 12)}.`);
