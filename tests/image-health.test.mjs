import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyImageResponse } from '../scripts/image-health-report.mjs';

test('remote image health distinguishes usable images from host blocking and bad content', () => {
  assert.equal(classifyImageResponse({ status: 200, contentType: 'image/webp' }), 'healthy');
  assert.equal(classifyImageResponse({ status: 403, contentType: 'text/html' }), 'host-blocked');
  assert.equal(classifyImageResponse({ status: 429, contentType: '' }), 'host-blocked');
  assert.equal(classifyImageResponse({ status: 200, contentType: 'text/html' }), 'wrong-content-type');
  assert.equal(classifyImageResponse({ status: 404, contentType: 'text/html' }), 'broken');
});
