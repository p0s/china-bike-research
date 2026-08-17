import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadDataset } from '../src/lib/data.mjs';
import {
  createCoverageSnapshot,
  formatCoverageReport,
  mergeCoverageBaseline,
  validateBaselineTransition,
  validateCoverage
} from '../src/lib/coverage.mjs';

const root = path.resolve(import.meta.dirname, '..');
const baselinePath = path.join(root, 'data/coverage-baseline.json');
const retirementsPath = path.join(root, 'data/retired-records');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readBaseline() {
  return fs.existsSync(baselinePath) ? readJson(baselinePath) : null;
}

function readRetirements() {
  if (!fs.existsSync(retirementsPath)) return [];
  return fs.readdirSync(retirementsPath)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => readJson(path.join(retirementsPath, name)));
}

function readBaseBaseline() {
  const ref = process.env.COVERAGE_BASE_REF || 'HEAD';
  try {
    const output = execFileSync('git', ['show', `${ref}:data/coverage-baseline.json`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return JSON.parse(output);
  } catch {
    return null;
  }
}

function appendStepSummary(report) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) fs.appendFileSync(summaryPath, `${report}\n`, 'utf8');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function main() {
  const accept = process.argv.includes('--accept');
  const reportOnly = process.argv.includes('--report');
  const data = loadDataset();
  const current = createCoverageSnapshot(data);
  const existing = readBaseline();
  const retirements = readRetirements();

  if (accept) {
    if (existing) {
      const regressions = validateCoverage(data, current, existing, retirements, { requireCurrentBaseline: false });
      if (regressions.length) {
        console.error('Coverage baseline was not updated because regressions are unresolved:');
        for (const error of regressions) console.error(`- ${error}`);
        process.exitCode = 1;
        return;
      }
    }
    const merged = mergeCoverageBaseline(existing, current, today());
    const errors = [
      ...validateCoverage(data, current, merged, retirements),
      ...validateBaselineTransition(existing, merged)
    ];
    if (errors.length) {
      console.error('Generated coverage baseline is invalid:');
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
      return;
    }
    fs.writeFileSync(baselinePath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
    console.log(`Accepted monotonic coverage baseline for ${data.images.length} images and ${data.candidates.length + data.variants.length} catalog targets.`);
    return;
  }

  if (!existing) {
    console.error('Missing data/coverage-baseline.json. Run npm run coverage:accept.');
    process.exitCode = 1;
    return;
  }

  const base = readBaseBaseline();
  const errors = [
    ...validateCoverage(data, current, existing, retirements),
    ...validateBaselineTransition(base, existing)
  ];
  const report = formatCoverageReport({ current, base, retirements, errors });
  appendStepSummary(report);

  if (reportOnly) console.log(report);
  else if (errors.length) {
    console.error(`Coverage regression check failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
  } else {
    console.log(`Coverage protected: ${data.images.length} images, ${data.prices.length} price observations, ${data.sources.length} sources, and ${data.candidates.length} candidates.`);
  }
  if (errors.length) process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
