import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyImageResponse, isBlockingImageResult } from '../scripts/image-health-report.mjs';

test('remote image health distinguishes usable images from host blocking and bad content', () => {
  assert.equal(classifyImageResponse({ status: 200, contentType: 'image/webp' }), 'healthy');
  assert.equal(classifyImageResponse({ status: 403, contentType: 'text/html' }), 'host-blocked');
  assert.equal(classifyImageResponse({ status: 429, contentType: '' }), 'host-blocked');
  assert.equal(classifyImageResponse({ status: 200, contentType: 'text/html' }), 'wrong-content-type');
  assert.equal(classifyImageResponse({ status: 404, contentType: 'text/html' }), 'broken');
});

test('project-operated media failures block delivery while unrelated host blocking can fall back', () => {
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
