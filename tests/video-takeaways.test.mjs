import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, validateClearanceFieldReports, validateVideoEvidence } from '../src/lib/data.mjs';
import { catalogSummaries, renderModel } from '../src/render.mjs';
import { renderVideoEntries } from '../src/lib/videos.mjs';

const data = loadDataset();
const products = joinProducts(data);
const ctx = { data, products, catalogCandidates: [], posts: [], base: '', locale: 'en', siteUrl: 'https://example.invalid', repositoryUrl: 'https://github.com/p0s/china-bike-research', siteLastmod: '2026-10-24' };
const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '');
const video = (overrides = {}) => ({
  id: 'creator-frame-build', provider: 'youtube', youtube_video_id: 'AAAAAAAAAAA', url: 'https://www.youtube.com/watch?v=AAAAAAAAAAA',
  title: 'Frame build', channel_name: 'Creator', channel_url: 'https://www.youtube.com/@creator', language: 'en', accessed_at: '2026-10-24',
  target: { platform_id: 'frame-a' }, match: 'exact-platform', format: 'build-and-ride', relationship: 'owner-review',
  disclosure: 'Owner-published build with no stated sponsorship.', disclosure_url: 'https://www.youtube.com/watch?v=AAAAAAAAAAA',
  summary: 'Owner build of the exact frame with a weigh-in and fit notes.', ...overrides
});
const transcript = { status: 'auto-captions', method: 'youtube-transcript-panel', language: 'en', checked_at: '2026-10-24' };
const takeaway = { kind: 'measured', at_seconds: 75, text: 'The painted size 54 frame weighed 910 g with hardware.' };

test('takeaways require a reviewed transcript and a known kind', () => {
  assert.deepEqual(validateVideoEvidence(video({ transcript, takeaways: [takeaway] }), isDate), []);
  assert.match(validateVideoEvidence(video({ takeaways: [takeaway] }), isDate).join(), /reviewed transcript/);
  assert.match(validateVideoEvidence(video({ transcript: { ...transcript, status: 'unavailable' }, takeaways: [takeaway] }), isDate).join(), /reviewed transcript/);
  assert.match(validateVideoEvidence(video({ transcript, takeaways: [{ ...takeaway, kind: 'verdict' }] }), isDate).join(), /invalid takeaway/);
  assert.match(validateVideoEvidence(video({ transcript, takeaways: Array(9).fill(takeaway) }), isDate).join(), /one to eight/);
});

test('takeaways render below the player with kind, timestamp and English-original marker', () => {
  const html = renderVideoEntries([video({ transcript, takeaways: [takeaway] })]);
  assert.match(html, /<div class="video-takeaways"><h4>Takeaways<\/h4>/);
  assert.match(html, /<span class="video-takeaway-kind">Measured<\/span><a href="https:\/\/www\.youtube\.com\/watch\?v=AAAAAAAAAAA&amp;t=75" rel="noreferrer">1:15<\/a>/);
  assert.match(html, /<span data-original-language lang="en">The painted size 54/);
  assert.doesNotMatch(renderVideoEntries([video({ transcript, takeaways: [takeaway] })], { article: true, takeaways: false }), /video-takeaways/);
});

test('clearance field reports must cite a transcript-checked video of the same platform', () => {
  const platform = { id: 'frame-a', tire_clearance: { field_reports: [{ video_id: 'creator-frame-build', at_seconds: 60, configuration: 'Size 54 frame with 2× drivetrain', short: 'Owner: 35 mm tight', summary: 'A 35 mm tire rubbed the front derailleur on this build.' }] } };
  const withTranscript = { variants: [], videos: [video({ transcript })] };
  assert.deepEqual(validateClearanceFieldReports(platform, withTranscript, isDate), []);
  assert.match(validateClearanceFieldReports(platform, { variants: [], videos: [video()] }, isDate).join(), /reviewed transcript/);
  assert.match(validateClearanceFieldReports(platform, { variants: [], videos: [video({ transcript, target: { platform_id: 'frame-b' } })] }, isDate).join(), /video of this platform/);
});

test('the Incolor Speedster reviewer fit check stays beside the official maximum', () => {
  const product = products.find((item) => item.variant.id === 'incolor-speedster-sr-plus-frameset');
  const html = renderModel(ctx, product);
  assert.match(html, /<dd>38\/32 mm \(1×\/2×\)/);
  assert.match(html, /class="fact-field-report">Reviewer fit check: 38 mm unlikely, 35 mm tight · <a href="https:\/\/www\.youtube\.com\/watch\?v=H7SQgMrzg8Y&amp;t=952"/);
  assert.match(html, /Field check \(Crafted Cycles video, 15:52\)/);
  const summary = catalogSummaries(ctx).find((item) => item.id === product.variant.id);
  assert.equal(summary.tireClearance, '38/32 mm (1×/2×)');
  assert.equal(summary.tireClearanceFieldReport, 'Reviewer fit check: 38 mm unlikely, 35 mm tight');
  assert.equal(product.platform.tire_clearance.published_max_mm, 38, 'the official maximum is preserved');
});
