import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyImageResponse, imageHealthTargets, isBlockingImageResult } from '../scripts/image-health-report.mjs';
import { loadDataset } from '../src/lib/data.mjs';

test('remote image health distinguishes usable images from host blocking and bad content', () => {
  assert.equal(classifyImageResponse({ status: 200, contentType: 'image/webp' }), 'healthy');
  assert.equal(classifyImageResponse({ status: 403, contentType: 'text/html' }), 'host-blocked');
  assert.equal(classifyImageResponse({ status: 429, contentType: '' }), 'host-blocked');
  assert.equal(classifyImageResponse({ status: 200, contentType: 'text/html' }), 'wrong-content-type');
  assert.equal(classifyImageResponse({ status: 404, contentType: 'text/html' }), 'broken');
});

test('project-operated media failures block delivery while unrelated host blocking stays non-blocking', () => {
  assert.equal(isBlockingImageResult({
    url: 'https://china-bike-media.161-97-123-19.sslip.io/media/xhs/bike/a-card-w480.webp',
    classification: 'unreachable'
  }), true);
  assert.equal(isBlockingImageResult({
    url: 'https://example.invalid/image.webp',
    classification: 'host-blocked'
  }), false);
  assert.equal(isBlockingImageResult({
    url: 'https://example.invalid/image.webp',
    classification: 'wrong-content-type'
  }), true);
});

test('buyer-omitted PARDUS images are not health-check targets', () => {
  const ids = imageHealthTargets(loadDataset()).map((target) => target.id);
  assert.equal(ids.some((id) => id.startsWith('pardus-spark-family-cn-alt-color-primary-image')), false);
  assert.equal(ids.some((id) => id.startsWith('pardus-spark-sport-pes-cn-color-primary-image')), false);
});

test('official groupset embeds are health-check targets', () => {
  const targets = imageHealthTargets(loadDataset());
  const groupsetTargets = targets.filter((target) => target.id.startsWith('groupset:'));
  assert.equal(groupsetTargets.length, 10);
  assert.ok(groupsetTargets.every((target) => target.url.startsWith('https://')));
  assert.ok(groupsetTargets.some((target) => target.id === 'groupset:shimano-105-r7170'));
  assert.ok(groupsetTargets.some((target) => target.id === 'groupset:magene-qed-pes'));
});
