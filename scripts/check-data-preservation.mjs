import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function originalLinesRetained(before, after) {
  const lines = after.split('\n');
  let index = 0;
  for (const line of before.split('\n')) {
    while (index < lines.length && lines[index] !== line) index++;
    if (index === lines.length) return false;
    index++;
  }
  return true;
}

// This batch is additive. A changed claim must be retained, with any correction
// added separately; the ordinary coverage guard alone does not protect values.
export function preservationIssues(before, after, location = '$') {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (Array.isArray(before)) {
    if (!Array.isArray(after)) return [`${location}: array removed or replaced`];
    const used = new Set();
    const issues = [];
    for (const [index, value] of before.entries()) {
      const match = after.findIndex((candidate, i) => !used.has(i)
        && (!object(value) || !value.id || candidate?.id === value.id)
        && preservationIssues(value, candidate, `${location}[${index}]`).length === 0);
      if (match < 0) issues.push(`${location}[${index}]: original array item missing or changed`);
      else used.add(match);
    }
    return issues;
  }
  if (object(before)) {
    if (!object(after)) return [`${location}: object removed or replaced`];
    return Object.entries(before).flatMap(([key, value]) => Object.hasOwn(after, key)
      ? preservationIssues(value, after[key], `${location}.${key}`)
      : [`${location}.${key}: original field missing`]);
  }
  return [`${location}: original value changed (${JSON.stringify(before)} → ${JSON.stringify(after)})`];
}

function frozenFiles(base) {
  const listing = execFileSync('git', ['ls-tree', '-r', '-z', base, '--', 'data', 'assets'], { cwd: root }).toString();
  const entries = listing.split('\0').filter(Boolean).map((line) => {
    const [header, file] = line.split('\t');
    const [mode, type, blob] = header.split(' ');
    if (type !== 'blob' || mode === '120000') throw new Error(`Unsupported frozen entry: ${file}`);
    return { file, blob };
  });
  const bytes = execFileSync('git', ['cat-file', '--batch'], {
    cwd: root, input: entries.map((entry) => entry.blob).join('\n') + '\n',
    maxBuffer: 256 * 1024 * 1024
  });
  let offset = 0;
  return entries.map((entry) => {
    const end = bytes.indexOf(10, offset);
    const [blob, type, size] = bytes.subarray(offset, end).toString().split(' ');
    if (blob !== entry.blob || type !== 'blob') throw new Error(`Unexpected Git blob: ${entry.file}`);
    const content = bytes.subarray(end + 1, end + 1 + Number(size));
    offset = end + 2 + Number(size);
    return { ...entry, bytes: content.length, sha256: digest(content), content };
  });
}

function main() {
  const args = process.argv.slice(2);
  const value = (name) => args[args.indexOf(name) + 1];
  if (!args.includes('--base')) throw new Error('Required: --base IMMUTABLE_COMMIT');
  const base = execFileSync('git', ['rev-parse', '--verify', `${value('--base')}^{commit}`], { cwd: root, encoding: 'utf8' }).trim();
  const frozen = frozenFiles(base);
  const manifest = { base_commit: base, files: frozen.map(({ content, ...entry }) => entry) };
  if (args.includes('--freeze')) {
    fs.writeFileSync(value('--freeze'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  }
  if (args.includes('--manifest')) {
    const expected = JSON.parse(fs.readFileSync(value('--manifest'), 'utf8'));
    if (JSON.stringify(expected) !== JSON.stringify(manifest)) throw new Error('Frozen manifest does not match the immutable base');
  }
  const issues = [];
  let unchanged = 0;
  let additive = 0;
  let translations = 0;
  for (const entry of frozen) {
    const file = path.join(root, entry.file);
    if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
      issues.push(`${entry.file}: frozen file removed or replaced`);
      continue;
    }
    const current = fs.readFileSync(file);
    if (digest(current) === entry.sha256) { unchanged++; continue; }
    // The generated coverage inventory has its own monotonic transition gate.
    // It is hashed in the frozen manifest, but its counters are not source facts.
    if (entry.file === 'data/coverage-baseline.json') continue;
    if (entry.file === 'assets/i18n.js' && originalLinesRetained(entry.content.toString(), current.toString())) {
      translations++;
      continue;
    }
    if (entry.file.startsWith('data/') && entry.file.endsWith('.json')) {
      const errors = preservationIssues(JSON.parse(entry.content), JSON.parse(current), entry.file);
      issues.push(...errors);
      if (!errors.length) additive++;
    } else issues.push(`${entry.file}: frozen asset or non-JSON data changed`);
  }
  console.log(JSON.stringify({ base_commit: base, frozen_files: frozen.length, unchanged_files: unchanged,
    additive_json_files: additive, additive_translation_files: translations,
    coverage_baseline: 'checked separately by npm run coverage:check', losses: issues }, null, 2));
  if (issues.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
