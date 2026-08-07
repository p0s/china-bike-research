import fs from 'node:fs';
import path from 'node:path';
import { loadDataset, freshness, formatPrice } from '../src/lib/data.mjs';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const output = outputIndex >= 0 ? args[outputIndex + 1] : '';
const data = loadDataset();
const now = new Date();
const rows = [...data.prices]
  .map((price) => ({ ...price, freshness: freshness(price.observed_at, now) }))
  .sort((a,b) => (b.freshness.days ?? 0) - (a.freshness.days ?? 0));
const stale = rows.filter((item) => ['historical','old'].includes(item.freshness.key));
const report = `# Data freshness report\n\nGenerated: ${now.toISOString()}\n\n- Total price records: ${rows.length}\n- Historical or old: ${stale.length}\n- Current or recent: ${rows.length - stale.length}\n\n## Historical and old price records\n\n${stale.length ? `| Variant | Price | Observed | Age | Status |\n|---|---:|---:|---:|---|\n${stale.map((item) => `| ${item.variant_id} | ${formatPrice(item)} | ${item.observed_at} | ${item.freshness.days} days | ${item.freshness.label} |`).join('\n')}\n` : 'None.\n'}\n## Review guidance\n\nHistorical records remain useful as history, but buyer-facing recommendations should prefer a newer exact observation or explicitly label the old value.\n`;
if (output) {
  const target = path.resolve(process.cwd(), output);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, report);
  console.log(`Wrote ${target}`);
} else process.stdout.write(report);
