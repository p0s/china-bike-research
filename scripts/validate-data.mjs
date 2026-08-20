import { loadDataset, validateDataset } from '../src/lib/data.mjs';

const data = loadDataset();
const errors = validateDataset(data);
if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Validated ${data.brands.length} brands, ${data.platforms.length} platforms, ${data.variants.length} variants, ${data.prices.length} prices, ${data.sources.length} sources, ${data.images.length} primary image records, ${data.videos.length} curated videos, ${data.candidates.length} candidates, and ${data.researchAttempts.length} atomic research records.`);
