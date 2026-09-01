import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildCoverageReport,
  matchTranscript,
  normalizeCorpus,
  normalizeText,
  parseBilibiliJson,
  parseWebVtt,
  validateCorpus,
  validateMetadata
} from '../scripts/video-research.mjs';

test('WebVTT parsing preserves timestamps and removes markup', () => {
  const segments = parseWebVtt('WEBVTT\n\n00:00:01.000 --> 00:00:03.250\n<c.colorE5E5E5>Quick</c> Pro UR One\n\n');
  assert.deepEqual(segments, [{ start: 1, end: 3.25, text: 'Quick Pro UR One' }]);
});

test('Bilibili BCC and JSON3 captions normalize to the same segment shape', () => {
  assert.deepEqual(parseBilibiliJson({ body: [{ from: 2, to: 4.5, content: '碳纤维 车架' }] }), [{ start: 2, end: 4.5, text: '碳纤维 车架' }]);
  assert.deepEqual(parseBilibiliJson({ events: [{ tStartMs: 1000, dDurationMs: 2000, segs: [{ utf8: 'X-LAB AD8' }] }] }), [{ start: 1, end: 3, text: 'X-LAB AD8' }]);
});

test('normalization makes identifiers searchable while preserving Unicode', () => {
  assert.equal(normalizeText('  GTR—C6 / 50C  '), 'gtr-c6 50c');
  assert.equal(normalizeText('碳纤维 车架'), '碳纤维 车架');
});

test('metadata validation rejects private hosts, credentials, and malformed discovery leads', () => {
  const metadata = {
    platform: 'youtube', video_id: 'x', url: 'https://user:pass@example.com/x', channel_id: 'c', title: 'x', language: 'en',
    caption_source: 'automatic', status: 'captured', retrieved_at: '2026-09-01T00:00:00Z',
    discovery_mentions: [{ name: 'Quick Pro UR One', at_seconds: -1, basis: '' }]
  };
  const errors = validateMetadata(metadata);
  assert.ok(errors.some((error) => /allowed public video host|credentials/.test(error)));
  assert.ok(errors.some((error) => /discovery_mentions/.test(error)));
});

test('corpus normalization and exact alias matching stay bounded and local', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'china-bike-video-'));
  const dir = path.join(root, 'youtube', 'UC-test', 'video-test');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({
    platform: 'youtube', video_id: 'video-test', url: 'https://www.youtube.com/watch?v=video-test', channel_id: 'UC-test', title: 'Test',
    discovery_mentions: [{ name: 'Quick Pro UR One', at_seconds: 1, basis: 'public-description' }, { name: 'Unresolved Model 9', at_seconds: 5, basis: 'public-description' }],
    language: 'en', caption_source: 'automatic', status: 'captured', retrieved_at: '2026-09-01T00:00:00Z'
  }));
  fs.writeFileSync(path.join(dir, 'captions-original.vtt'), 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nQuick Pro UR One\n');
  assert.deepEqual(validateCorpus(root), []);
  assert.equal(normalizeCorpus(root).videos[0].segment_count, 1);
  const data = {
    brands: [{ id: 'quick-pro', name: 'Quick Pro' }], platforms: [], variants: [],
    candidates: [{ id: 'quick-pro-ur-one', model_id: 'quick-pro-ur-one', name: 'Quick Pro UR:ONE' }], exclusions: []
  };
  const report = buildCoverageReport(data, root, { maxModels: 2, maxGaps: 25 });
  const mention = report.videos[0].mentions.find((item) => item.id === 'quick-pro-ur-one');
  assert.equal(mention.evidence, 'caption-and-metadata');
  assert.equal(mention.classification, 'existing-candidate-context');
  assert.equal(report.unmatched_discovery_mentions[0].classification, 'new-or-ambiguous-lead');
  assert.equal(report.summary.unique_discovery_leads, 2);
  assert.equal(report.summary.cap_status, 'within-model-cap');
  assert.ok(matchTranscript([{ start: 0, end: 1, text: 'quick pro ur one' }], data).some((item) => item.id === 'quick-pro-ur-one'));
});

test('corpus validation rejects media, comment dumps, and path identity drift', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'china-bike-video-forbidden-'));
  const dir = path.join(root, 'youtube', 'channel', 'video');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'cookies.txt'), 'forbidden');
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({
    platform: 'youtube', video_id: 'different', url: 'https://www.youtube.com/watch?v=different', channel_id: 'channel', title: 'x', language: 'en',
    caption_source: 'none', status: 'no-captions', retrieved_at: '2026-09-01T00:00:00Z'
  }));
  const errors = validateCorpus(root);
  assert.ok(errors.some((error) => /forbidden raw\/media file/.test(error)));
  assert.ok(errors.some((error) => /video_id does not match corpus path/.test(error)));
});
