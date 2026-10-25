import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, validateClearanceFieldReports, validateVideoEvidence } from '../src/lib/data.mjs';
import { catalogSummaries, renderModel, renderBikeBuilder } from '../src/render.mjs';
import { localizeHtml } from '../src/lib/i18n.mjs';
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
  assert.match(html, /<dd>38 mm 1× · 32 mm 2×/);
  assert.match(html, /class="fact-field-report"><span>SR\+ 2× review: ~32.5 mm measured, little room<\/span> · <a href="https:\/\/www\.youtube\.com\/watch\?v=H7SQgMrzg8Y&amp;t=952"/);
  assert.match(html, /Field check \(Crafted Cycles video, 15:52\)/);
  assert.match(html, /expected 35 mm to be tight; neither was test-fitted/);
  assert.match(html, /A 1× setup and the SR were not tested/);
  assert.match(html, /Front-derailleur, rim and tire choice affect fit/);
  const summary = catalogSummaries(ctx).find((item) => item.id === product.variant.id);
  assert.equal(summary.tireClearance, '38/32 mm (1×/2×)');
  assert.equal(summary.tireClearanceFieldReport, 'SR+ 2× review: ~32.5 mm measured, little room');
  assert.equal(product.platform.tire_clearance.published_max_mm, 38, 'the official maximum is preserved');
  const sr = products.find((item) => item.variant.id === 'incolor-speedster-sr-frameset');
  assert.match(renderModel(ctx, sr), /SR tire fit was not tested/);
  assert.equal(catalogSummaries(ctx).find((item) => item.id === sr.variant.id).tireClearanceFieldReport, summary.tireClearanceFieldReport, 'shared-platform display retains the tested SR+ identity');
});

test('localized clearance labels and expanded hints preserve the tested setup and uncertainty', () => {
  const product = products.find((item) => item.variant.id === 'incolor-speedster-sr-plus-frameset');
  for (const [locale, short, untested] of [
    ['zh-Hans', 'SR+ 双盘评测：实测胎宽约 32.5 mm，余量很小', '两者均未试装'],
    ['de', 'SR+ 2× im Test: ~32,5 mm gemessen, wenig Platz', 'beides wurde nicht montiert']
  ]) {
    const localCtx = { ...ctx, locale };
    const html = localizeHtml(renderModel(localCtx, product), localCtx);
    assert.ok(html.includes(`<span>${short}</span>`), `${locale}: short label beside source link`);
    assert.ok(html.includes(untested), `${locale}: estimates remain untested`);
    assert.ok(html.includes('H7SQgMrzg8Y&amp;t=952'), `${locale}: timestamp preserved`);
    const builder = renderBikeBuilder(localCtx);
    const payload = JSON.parse(builder.match(/<script[^>]+id="build-configurator-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
    const base = payload.bases.find((item) => item.id === product.variant.id);
    assert.ok(base.tireClearanceNote.includes(untested), `${locale}: builder caveat translated`);
  }
});

test('reviewer-measured weights cite a transcript-checked video of the same platform and render beside claimed weights', async () => {
  const { validateMeasuredWeights } = await import('../src/lib/data.mjs');
  const platform = { id: 'frame-a', frame: { measured_weights: [{ part: 'frame', grams: 1111, size: '54', basis: 'mounting bolts fitted', video_id: 'creator-frame-build', at_seconds: 309 }] } };
  assert.deepEqual(validateMeasuredWeights(platform, { variants: [], videos: [video({ transcript })] }), []);
  assert.match(validateMeasuredWeights(platform, { variants: [], videos: [video()] }).join(), /reviewed transcript/);
  assert.match(validateMeasuredWeights({ ...platform, frame: { measured_weights: [{ ...platform.frame.measured_weights[0], part: 'wheel' }] } }, { variants: [], videos: [video({ transcript })] }).join(), /invalid measured weight/);
  const graro = products.find((item) => item.platform.id === 'ican-graro');
  assert.match(renderModel(ctx, graro), /Reviewer-measured weights<\/dt><dd>1,020 g frame, size 54, [^<]*\(Hambini video, 2:05\)/);
});
