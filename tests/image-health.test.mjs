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

test('official groupset images are local and no remote images remain health-check targets', () => {
  const data = loadDataset();
  assert.equal(imageHealthTargets(data).length, 0);
  assert.equal(data.groupsets.filter((groupset) => groupset.image?.local_path).length, 10);
  assert.ok(data.groupsets.every((groupset) => !groupset.image?.remote_url));
});

test('legacy remote image health filters and JSON results remain deterministic', () => {
  const targets = [{ id: 'sample-image', url: 'https://example.com/bike.jpg' }];
  const selected = filterImageHealthTargets(targets, ['sample-image']);
  assert.deepEqual(selected.map(({ id }) => id), ['sample-image']);
  assert.throws(() => filterImageHealthTargets(targets, ['not-a-real-image']), /unknown remote image id/);
  const json = JSON.parse(formatImageHealthJson([{
    id: 'sample-image', url: 'https://example.com/bike.jpg', classification: 'healthy', status: 200, contentType: 'image/jpeg'
  }], '2026-09-24'));
  assert.equal(json.checked_at, '2026-09-24');
  assert.deepEqual(json.results[0], {
    id: 'sample-image', url: 'https://example.com/bike.jpg', classification: 'healthy', status: 200, content_type: 'image/jpeg'
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

test('a representative GX600 photo closes the missing-image gap but keeps exactness unresolved', () => {
  const data = loadDataset();
  const image = data.images.find((item) => item.id === 'camp-gx600-primary-image');
  assert.equal(image.buyer_visibility, 'omit');
  const gaps = buildGapReport(data, '2026-09-24').records.find((record) => record.id === 'camp-gx600-pes').gaps;
  assert.ok(!gaps.some((gap) => gap.code === 'image-missing'));
  assert.ok(gaps.some((gap) => gap.code === 'image-exactness'));
  assert.ok(!gaps.some((gap) => gap.code === 'image-health-unverified'));
});
