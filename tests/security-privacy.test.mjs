import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { findCloudflareAccountIds } from '../scripts/cloudflare-account-privacy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Cloudflare account IDs are blocked in config forms but references and unrelated hashes remain valid', () => {
  const value = '0123456789abcdef'.repeat(2);
  assert.equal(findCloudflareAccountIds(`{"account_id": "${value}"}`).length, 1);
  assert.equal(findCloudflareAccountIds(`accountId: ${value}`).length, 1);
  assert.equal(findCloudflareAccountIds(`CLOUDFLARE_ACCOUNT_ID=${value}`).length, 1);
  assert.equal(findCloudflareAccountIds('accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}').length, 0);
  assert.equal(findCloudflareAccountIds(`checksum: ${value}`).length, 0);
});

test('privacy CLI scans JSONC-shaped input and reports no matched value', () => {
  const value = '0123456789abcdef'.repeat(2);
  const result = spawnSync(process.execPath, ['scripts/check-privacy.mjs', '--stdin'], {
    cwd: root, input: `{"account_id": "${value}"}`, encoding: 'utf8'
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Cloudflare account ID/);
  assert.doesNotMatch(result.stderr, new RegExp(value));
});

test('outgoing scan catches an ID added and removed before the branch tip', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'china-bikes-privacy-'));
  const script = path.join(root, 'scripts/check-outgoing-privacy.mjs');
  const value = '0123456789abcdef'.repeat(2);
  function git(...args) {
    return execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
  }
  function commit(message) {
    git('add', '.');
    git('-c', 'commit.gpgsign=false', '-c', 'user.name=Privacy Test', '-c', 'user.email=privacy@example.com', 'commit', '-m', message);
  }
  try {
    git('init', '-q');
    fs.writeFileSync(path.join(directory, 'wrangler.jsonc'), '{"name":"test"}\n');
    commit('base');
    const base = git('rev-parse', 'HEAD');
    fs.writeFileSync(path.join(directory, 'wrangler.jsonc'), `{"account_id":"${value}"}\n`);
    commit('temporary ID');
    fs.writeFileSync(path.join(directory, 'wrangler.jsonc'), '{"name":"test"}\n');
    commit('remove ID');
    const result = spawnSync(process.execPath, [script, base], { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /wrangler\.jsonc/);
    assert.doesNotMatch(result.stderr, new RegExp(value));
    const cleanBase = git('rev-parse', 'HEAD');
    fs.writeFileSync(path.join(directory, 'revived.jsonc'), git('show', 'HEAD^:wrangler.jsonc'));
    commit('reuse a historical blob under another path');
    const reused = spawnSync(process.execPath, [script, cleanBase], { cwd: directory, encoding: 'utf8' });
    assert.equal(reused.status, 1);
    assert.match(reused.stderr, /revived\.jsonc/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
