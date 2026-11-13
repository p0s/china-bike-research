import fs from 'node:fs';
import path from 'node:path';
import { loadDataset } from '../src/lib/data.mjs';
import { freshnessReport, freshnessMarkdown } from '../src/lib/freshness-report.mjs';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const output = outputIndex >= 0 ? args[outputIndex + 1] : '';
const report = freshnessMarkdown(freshnessReport(loadDataset(), new Date()));
if (output) {
  const target = path.resolve(process.cwd(), output);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, report);
  console.log(`Wrote ${target}`);
} else process.stdout.write(report);
