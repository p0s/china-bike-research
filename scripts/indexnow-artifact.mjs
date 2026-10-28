import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const deliveryArtifact = 'indexnow-delivery-state-v1';
export const deliverySnapshotStep = 'Snapshot IndexNow delivery state';
const repository = 'p0s/china-bike-research';
const workflow = '.github/workflows/deploy-cloudflare.yml';

async function githubJson(route, token, fetcher) {
  const response = await fetcher(`https://api.github.com/repos/${repository}${route}`, {
    redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ChineseBikes-IndexNow-State/1.0' }
  });
  if (response.status !== 200) { await response.body?.cancel(); throw new Error(`IndexNow state lookup failed with GitHub HTTP ${response.status}.`); }
  const reader = response.body.getReader();
  const chunks = []; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 2_000_000) throw new Error('IndexNow state lookup response is too large.');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function findDeliveryStateRun({ token, runId, repo, ref, fetcher = fetch }) {
  if (!token || repo !== repository || ref !== 'refs/heads/main' || !/^\d+$/.test(runId ?? '')) {
    throw new Error('IndexNow state lookup requires this repository\'s main production run and its existing GitHub token.');
  }
  const artifactsFor = async id => {
    const result = await githubJson(`/actions/runs/${id}/artifacts?per_page=100`, token, fetcher);
    if (!Array.isArray(result.artifacts) || result.total_count > 100) throw new Error('Invalid or unbounded IndexNow artifact inventory.');
    const matches = result.artifacts.filter(artifact => artifact.name === deliveryArtifact);
    if (matches.length > 1) throw new Error('Ambiguous IndexNow state artifact.');
    if (matches.some(artifact => artifact.expired || !Number.isInteger(artifact.size_in_bytes) || artifact.size_in_bytes > 8_000_000
      || !Number.isFinite(Date.parse(artifact.created_at)))) {
      throw new Error('IndexNow state artifact expired or exceeded its bound; recover it before notification.');
    }
    return matches[0] ?? null;
  };
  // Re-running the same hosted run must restore its previous acknowledgement too.
  const current = await artifactsFor(runId);
  const result = await githubJson('/actions/workflows/deploy-cloudflare.yml/runs?branch=main&status=completed&exclude_pull_requests=true&per_page=20', token, fetcher);
  if (!Array.isArray(result.workflow_runs)) throw new Error('Invalid IndexNow workflow history.');
  const runs = result.workflow_runs.filter(run => String(run.id) !== runId).slice(0, 20);
  let legacyPublisherSeen = false;
  for (const run of runs) {
    if (!Number.isSafeInteger(run.id) || run.head_branch !== 'main' || run.head_repository?.full_name !== repository
      || run.path !== workflow || !['push', 'workflow_dispatch'].includes(run.event)) {
      throw new Error('Unexpected IndexNow state provenance in workflow history.');
    }
    const prior = await artifactsFor(run.id);
    if (prior) return current && Date.parse(current.created_at) >= Date.parse(prior.created_at) ? runId : String(run.id);
    const jobs = await githubJson(`/actions/runs/${run.id}/jobs?filter=latest&per_page=100`, token, fetcher);
    if (!Array.isArray(jobs.jobs) || jobs.total_count > 100 || jobs.jobs.some(job => !Array.isArray(job.steps))) {
      throw new Error('Invalid or unbounded IndexNow job history.');
    }
    const snapshots = jobs.jobs.flatMap(job => job.steps).filter(step => step.name === deliverySnapshotStep);
    if (!snapshots.length) { legacyPublisherSeen = true; continue; }
    const steps = jobs.jobs.flatMap(job => job.steps);
    const deployed = steps.some(step => step.name === 'Deploy Worker and Static Assets' && step.conclusion === 'success');
    const notified = steps.some(step => step.name === 'Notify IndexNow of deployed public page changes' && step.conclusion && step.conclusion !== 'skipped');
    if (deployed || notified) {
      throw new Error('A previous IndexNow state operation has no saved artifact; recover it before notification.');
    }
    // A run that failed before state handling has no new notification state to restore.
  }
  if (runs.length === 20 && !current && !legacyPublisherSeen) throw new Error('No recoverable IndexNow state within the bounded workflow history.');
  return current ? runId : '';
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href) {
  try {
    const [option, output, ...extra] = process.argv.slice(2);
    if (option !== '--output' || !output || extra.length) throw new Error('Usage: indexnow-artifact.mjs --output GITHUB_OUTPUT');
    const runId = await findDeliveryStateRun({ token: process.env.GH_TOKEN, runId: process.env.GITHUB_RUN_ID,
      repo: process.env.GITHUB_REPOSITORY, ref: process.env.GITHUB_REF });
    fs.appendFileSync(output, `run-id=${runId}\n`);
    console.log(runId ? `Restore IndexNow delivery state from run ${runId}.` : 'Adopt the existing live baseline without a blanket submission.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
