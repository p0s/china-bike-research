import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDataset } from '../src/lib/data.mjs';
import { summarizeResearchAttempts, validateResearchAttempts } from '../src/lib/research-attempts.mjs';

function main() {
  const data = loadDataset();
  const errors = validateResearchAttempts(data.researchAttempts, data);
  if (errors.length) {
    console.error(`Research-attempt validation failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  const summary = summarizeResearchAttempts(data.researchAttempts);
  if (process.argv.includes('--report')) console.log(JSON.stringify(summary, null, 2));
  else console.log(`Validated ${summary.atomic_fields} atomic research fields with ${summary.attempts['public-post']} public-post and ${summary.attempts.web} web attempts.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
