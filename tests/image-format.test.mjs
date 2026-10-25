import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isAvif } from '../src/lib/image-format.mjs';
import { validateImageFormats } from '../scripts/check-image-formats.mjs';

test('AVIF identification rejects renamed WebP, truncated boxes and unrelated HEIF', () => {
  const ftyp = Buffer.from('0000001c667479706176696600000000617669666d6966316d696166', 'hex');
  assert.equal(isAvif(ftyp), true);
  assert.equal(isAvif(Buffer.from('RIFF0000WEBP')), false);
  assert.equal(isAvif(ftyp.subarray(0, 20)), false);
  assert.equal(isAvif(Buffer.from(ftyp.toString('hex').replaceAll('61766966', '68656963'), 'hex')), false);
});

test('future browser WebP assets fail while a declared JPEG social preview is allowed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bike-image-policy-'));
  try {
    fs.mkdirSync(path.join(root, 'content'));
    fs.mkdirSync(path.join(root, 'assets/blog'), { recursive: true });
    fs.writeFileSync(path.join(root, 'content/blog-images.json'), JSON.stringify({ images: [{ header: { files: [{ purpose: 'social', type: 'image/jpeg', path: '/assets/blog/example-1200.jpg' }] } }] }));
    fs.writeFileSync(path.join(root, 'assets/blog/example-1200.jpg'), 'fixture');
    assert.deepEqual(validateImageFormats(root).errors, []);
    fs.writeFileSync(path.join(root, 'assets/blog/unconverted.webp'), 'fixture');
    assert.match(validateImageFormats(root).errors.join('\n'), /unconverted.webp: browser raster assets must be AVIF/);
    fs.writeFileSync(path.join(root, 'assets/blog/renamed.avif'), 'RIFF0000WEBP');
    assert.match(validateImageFormats(root).errors.join('\n'), /renamed.avif: invalid AVIF/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
