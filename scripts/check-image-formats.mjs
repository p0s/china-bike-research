import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAvif } from '../src/lib/image-format.mjs';

const root = path.resolve(import.meta.dirname, '..');
const compatibilityAssets = new Set([
  'assets/branding/favicon-32.png',
  'assets/branding/apple-touch-icon.png',
  'assets/social-preview.png',
  // Retained historical social preview; it is not used as a browser image.
  'assets/blog/everyday-road-bike-with-fenders-mascot-cover-6410e6e765-1200.jpg'
]);

export function validateImageFormats(repositoryRoot = root) {
  const allowed = new Set(compatibilityAssets);
  const manifest = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'content/blog-images.json'), 'utf8'));
  for (const image of manifest.images) {
    for (const file of image.header?.files ?? []) {
      if (file.purpose === 'social' && file.type === 'image/jpeg' && /^\/assets\/blog\/[a-z0-9-]+\.jpg$/.test(file.path)) {
        allowed.add(file.path.slice(1));
      }
    }
  }
  const errors = [];
  let count = 0;
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      const relative = path.relative(repositoryRoot, file).split(path.sep).join('/');
      const extension = path.extname(file).toLowerCase();
      if (extension === '.avif') {
        count++;
        if (!isAvif(fs.readFileSync(file))) errors.push(`${relative}: invalid AVIF file type`);
      } else if (['.webp', '.png', '.jpg', '.jpeg', '.gif', '.heic'].includes(extension) && !allowed.has(relative)) {
        errors.push(`${relative}: browser raster assets must be AVIF; run the media authoring workflow`);
      }
    }
  }
  walk(path.join(repositoryRoot, 'assets'));
  return { count, errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { count, errors } = validateImageFormats();
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`Image format policy passed: ${count} AVIF assets; explicit social/icon compatibility exceptions only.`);
}
