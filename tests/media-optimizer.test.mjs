import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  immutableFileName,
  isWithin,
  parseArguments,
  qualitySteps,
  validateSlug,
  widthSteps
} from '../scripts/optimize-image.mjs';

test('media optimizer accepts only explicit absolute-friendly arguments and safe slugs', () => {
  assert.deepEqual(parseArguments([
    '--input', '/private/tmp/source.webp',
    '--output', '/private/tmp/media/xhs',
    '--slug', 'pardus-robin-evo'
  ]), {
    input: '/private/tmp/source.webp',
    output: '/private/tmp/media/xhs',
    slug: 'pardus-robin-evo'
  });
  assert.throws(() => parseArguments(['--input', '/tmp/a']), /missing --output/);
  assert.throws(() => validateSlug('../bike'), /kebab-case/);
  assert.throws(() => validateSlug('Bike_Name'), /kebab-case/);
});

test('media optimizer selects high quality first and progressively smaller dimensions', () => {
  assert.deepEqual(qualitySteps(72, 60, 4), [72, 68, 64, 60]);
  assert.deepEqual(qualitySteps(71, 60, 4), [71, 67, 63, 60]);
  assert.deepEqual(widthSteps(1200, 800, 1040), [1040, 880, 800]);
  assert.deepEqual(widthSteps(480, 360, 320), [320]);
});

test('media optimizer uses content-addressed immutable names', () => {
  const digest = 'a'.repeat(64);
  assert.equal(immutableFileName({ purpose: 'card', width: 480, sha256: digest }), 'aaaaaaaaaaaaaaaa-card-w480.webp');
  assert.throws(() => immutableFileName({ purpose: 'full', width: 480, sha256: digest }), /unsupported/);
});

test('path-boundary checks distinguish descendants from prefix lookalikes', () => {
  const root = path.resolve('/private/tmp/media');
  assert.equal(isWithin(path.join(root, 'xhs/image.webp'), root), true);
  assert.equal(isWithin('/private/tmp/media-other/image.webp', root), false);
});
