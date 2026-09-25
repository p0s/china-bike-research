import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyImageResponse, filterImageHealthTargets, formatImageHealthJson, imageHealthTargets, isBlockingImageResult } from '../scripts/image-health-report.mjs';
import { buildGapReport } from '../scripts/data-gaps.mjs';
import { imageHealthIsFreshAndHealthy } from '../src/lib/image-health.mjs';
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

test('image health report supports exact image filters and JSON results', () => {
  const targets = imageHealthTargets(loadDataset());
  const selected = filterImageHealthTargets(targets, ['camp-gx600-primary-image']);
  assert.deepEqual(selected.map(({ id }) => id), ['camp-gx600-primary-image']);
  assert.throws(() => filterImageHealthTargets(targets, ['not-a-real-image']), /unknown remote image id/);
  const json = JSON.parse(formatImageHealthJson([{
    id: 'camp-gx600-primary-image', url: 'https://example.com/bike.jpg', classification: 'healthy', status: 200, contentType: 'image/jpeg'
  }], '2026-09-24'));
  assert.equal(json.checked_at, '2026-09-24');
  assert.deepEqual(json.results[0], {
    id: 'camp-gx600-primary-image', url: 'https://example.com/bike.jpg', classification: 'healthy', status: 200, content_type: 'image/jpeg'
  });
});

test('only complete, healthy checks for current URLs within 30 days suppress image health gaps', () => {
  const image = {
    id: 'sample-image', hosting: { mode: 'remote', remote_url: 'https://example.com/bike.webp' },
    health_check: { checked_at: '2026-09-24', resources: [{ target_id: 'sample-image', url: 'https://example.com/bike.webp', classification: 'healthy', status: 200, content_type: 'image/webp' }] }
  };
  assert.equal(imageHealthIsFreshAndHealthy(image, '2026-09-24'), true);
  assert.equal(imageHealthIsFreshAndHealthy(image, '2026-10-24'), true);
  assert.equal(imageHealthIsFreshAndHealthy(image, '2026-10-25'), false);
  assert.equal(imageHealthIsFreshAndHealthy({ ...image, hosting: { ...image.hosting, remote_url: 'https://example.com/new.webp' } }, '2026-09-24'), false);
  assert.equal(imageHealthIsFreshAndHealthy({ ...image, health_check: { ...image.health_check, resources: [] } }, '2026-09-24'), false);
  assert.equal(imageHealthIsFreshAndHealthy({ ...image, health_check: { ...image.health_check, resources: [{ ...image.health_check.resources[0], classification: 'unreachable' }] } }, '2026-09-24'), false);
  assert.equal(imageHealthIsFreshAndHealthy({ ...image, health_check: { ...image.health_check, resources: [{ ...image.health_check.resources[0], url: 'https://example.com/changed.webp' }] } }, '2026-09-24'), false);
  assert.equal(imageHealthIsFreshAndHealthy({ ...image, health_check: { ...image.health_check, checked_at: '2026-09-25' } }, '2026-09-24'), false);
});

test('gap report suppresses only the covered remote image health gap', () => {
  const data = loadDataset();
  const image = data.images.find((item) => item.id === 'camp-gx600-primary-image');
  const url = image.hosting.remote_url;
  image.health_check = { checked_at: '2026-09-24', resources: [{
    target_id: image.id, url, classification: 'healthy', status: 200, content_type: 'image/jpeg'
  }] };
  const gaps = buildGapReport(data, '2026-09-24').records.find((record) => record.id === 'camp-gx600-pes').gaps;
  assert.equal(gaps.some((gap) => gap.code === 'image-health-unverified'), false);
  image.health_check.resources[0].classification = 'unreachable';
  const failedGaps = buildGapReport(data, '2026-09-24').records.find((record) => record.id === 'camp-gx600-pes').gaps;
  assert.equal(failedGaps.some((gap) => gap.code === 'image-health-unverified'), true);
});
