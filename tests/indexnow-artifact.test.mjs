import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { findDeliveryStateRun, deliveryArtifact, deliverySnapshotStep } from '../scripts/indexnow-artifact.mjs';

const context = { token: 'fake-test-token', runId: '100', repo: 'p0s/china-bike-research', ref: 'refs/heads/main' };
const run = (id, extra = {}) => ({ id, head_branch: 'main', head_repository: { full_name: context.repo },
  path: '.github/workflows/deploy-cloudflare.yml', event: 'push', ...extra });
const artifact = (extra = {}) => ({ name: deliveryArtifact, expired: false, size_in_bytes: 500,
  created_at: '2026-10-12T00:00:00Z', ...extra });
function transport({ runs = [run(99)], artifacts = {}, steps = {}, status = 200 } = {}, calls = []) {
  return async (target, options) => {
    calls.push(target);
    assert.equal(options.method, undefined); // State discovery can only read GitHub.
    assert.equal(options.redirect, 'error'); assert.ok(options.signal);
    assert.equal(options.headers.Authorization, 'Bearer fake-test-token');
    const url = new URL(target);
    assert.equal(url.origin, 'https://api.github.com');
    assert.ok(url.pathname.startsWith('/repos/p0s/china-bike-research/actions/'));
    if (status !== 200) return new Response('', { status });
    if (url.pathname.endsWith('/deploy-cloudflare.yml/runs')) return Response.json({ workflow_runs: runs });
    const id = url.pathname.match(/\/runs\/(\d+)\//)?.[1];
    if (url.pathname.endsWith('/artifacts')) return Response.json({ total_count: (artifacts[id] ?? []).length, artifacts: artifacts[id] ?? [] });
    assert.ok(url.pathname.endsWith('/jobs'));
    return Response.json({ total_count: 1, jobs: [{ steps: steps[id] ?? [{ name: 'Snapshot public pages before deployment', conclusion: 'success' }] }] });
  };
}

test('hosted state restores the preceding exact publisher artifact, including notification failures', async () => {
  const calls = [];
  assert.equal(await findDeliveryStateRun({ ...context, fetcher: transport({ artifacts: { 99: [artifact()] } }, calls) }), '99');
  assert.equal(calls.length, 3);
});

test('reruns reuse their acknowledgement, but an older rerun cannot replace newer production state', async () => {
  assert.equal(await findDeliveryStateRun({ ...context, fetcher: transport({ artifacts: {
    100: [artifact({ created_at: '2026-10-12T01:00:00Z' })], 99: [artifact()]
  } }) }), '100');
  assert.equal(await findDeliveryStateRun({ ...context, fetcher: transport({ artifacts: {
    100: [artifact()], 99: [artifact({ created_at: '2026-10-12T01:00:00Z' })]
  } }) }), '99');
});

test('first adoption is permitted only before the durable publisher existed', async () => {
  assert.equal(await findDeliveryStateRun({ ...context, fetcher: transport() }), '');
});

test('rerunning a legacy workflow cannot hide an earlier durable artifact', async () => {
  assert.equal(await findDeliveryStateRun({ ...context, fetcher: transport({ runs: [run(99), run(98)], artifacts: { 98: [artifact()] } }) }), '98');
});

test('a build that failed before deployment does not hide the preceding saved state', async () => {
  assert.equal(await findDeliveryStateRun({ ...context, fetcher: transport({ runs: [run(99), run(98)], artifacts: { 98: [artifact()] },
    steps: { 99: [{ name: deliverySnapshotStep, conclusion: 'skipped' }, { name: 'Deploy Worker and Static Assets', conclusion: 'skipped' }] } }) }), '98');
});

test('missing or expired state after a production operation fails closed instead of silently adopting live pages', async () => {
  for (const steps of [
    [{ name: deliverySnapshotStep, conclusion: 'success' }, { name: 'Deploy Worker and Static Assets', conclusion: 'success' }],
    [{ name: deliverySnapshotStep, conclusion: 'success' }, { name: 'Notify IndexNow of deployed public page changes', conclusion: 'failure' }]
  ]) {
    await assert.rejects(findDeliveryStateRun({ ...context, fetcher: transport({ steps: { 99: steps } }) }), /no saved artifact/);
  }
  for (const item of [artifact({ expired: true }), artifact({ size_in_bytes: 8_000_001 }), artifact({ created_at: 'invalid' })]) {
    await assert.rejects(findDeliveryStateRun({ ...context, fetcher: transport({ artifacts: { 99: [item] } }) }), /expired or exceeded/);
  }
  await assert.rejects(findDeliveryStateRun({ ...context, fetcher: transport({ artifacts: { 99: [artifact(), artifact()] } }) }), /Ambiguous/);
});

test('preview, foreign repository and unrelated workflow state cannot authorize restoration', async () => {
  for (const override of [{ ref: 'refs/heads/preview' }, { repo: 'other/repository' }, { token: '' }, { runId: '100\nrun-id=bad' }]) {
    await assert.rejects(findDeliveryStateRun({ ...context, ...override, fetcher: async () => assert.fail('invalid context must not fetch') }));
  }
  for (const override of [{ head_branch: 'preview' }, { head_repository: { full_name: 'fork/repository' } },
    { path: '.github/workflows/other.yml' }, { event: 'pull_request' }]) {
    await assert.rejects(findDeliveryStateRun({ ...context, fetcher: transport({ runs: [run(99, override)] }) }), /provenance/);
  }
});

test('state discovery errors and its twenty-run bound are explicit, without any write requests', async () => {
  await assert.rejects(findDeliveryStateRun({ ...context, fetcher: transport({ status: 403 }) }), /GitHub HTTP 403/);
  const runs = Array.from({ length: 20 }, (_, i) => run(99 - i));
  const steps = Object.fromEntries(runs.map(({ id }) => [id, [{ name: deliverySnapshotStep, conclusion: 'skipped' }]]));
  await assert.rejects(findDeliveryStateRun({ ...context, fetcher: transport({ runs, steps }) }), /bounded workflow history/);
});

test('the one existing publisher gates POST on successful production deployment and preserves state even on failure', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/deploy-cloudflare.yml', import.meta.url), 'utf8');
  assert.match(workflow, /if: vars\.CLOUDFLARE_DEPLOY_ENABLED == 'true' && github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /permissions:\n  contents: read\n  actions: read/);
  const notify = workflow.slice(workflow.indexOf('- name: Notify IndexNow'), workflow.indexOf('- name: Save IndexNow'));
  assert.match(notify, /if: steps\.deploy\.outcome == 'success' && steps\.indexnow-snapshot\.outcome == 'success'/);
  assert.equal((workflow.match(/run: node scripts\/indexnow\.mjs notify/g) ?? []).length, 1);
  assert.match(workflow, /- name: Save IndexNow delivery state\n        if: always\(\) && steps\.indexnow-snapshot\.outcome == 'success'/);
  assert.match(workflow, /path: \$\{\{ runner.temp \}\}\/indexnow-state\/state.json/);
  assert.match(workflow, /retention-days: 90/);
  assert.ok(workflow.indexOf('- name: Restore IndexNow') < workflow.indexOf('- name: Snapshot IndexNow'));
  assert.ok(workflow.indexOf('- name: Snapshot IndexNow') < workflow.indexOf('- name: Deploy Worker'));
});
