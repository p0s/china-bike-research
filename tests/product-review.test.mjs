import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, joinCatalogCandidates, validateDataset } from '../src/lib/data.mjs';
import { renderModel, renderCandidateModel } from '../src/render.mjs';
import { sourceEditorialReview, editorialReviewIssues } from '../src/lib/editorial-review.mjs';
import { auditProductReview } from '../src/lib/seo-review-audit.mjs';

const data = loadDataset();
const products = joinProducts(data);
const pilot = ['ican-graro-frameset', 'incolor-speedster-sr-frameset', 'incolor-speedster-sr-plus-frameset', 'twitter-v3-wheeltop-eds', 'winspace-g5-frameset'];
const context = { data, products, base: '/guide', siteUrl: 'https://bikes.example', repositoryUrl: 'https://github.com/example/bikes', now: new Date('2026-09-29T00:00:00Z') };
const graph = (html) => JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1])['@graph'];

test('only five explicitly reviewed exact variants opt in; no automatic promotion from a price or verdict', () => {
  assert.deepEqual(data.variants.filter((variant) => variant.editorial.review).map((variant) => variant.id).sort(), pilot);
  assert.equal(sourceEditorialReview({ verdict: 'A recommendation', strengths: ['A strength'], caveats: ['A caveat'] }), null);
  const fallback = renderModel(context, products.find((product) => product.variant.id === 'af01-frameset'));
  assert.ok(graph(fallback).some((node) => node['@type'] === 'Thing'));
  assert.ok(!graph(fallback).some((node) => node['@type'] === 'Product'));
  const candidate = joinCatalogCandidates(data).find((entry) => entry.candidate.id === 'camp-ace-qed');
  const profile = renderCandidateModel(context, candidate);
  assert.ok(graph(profile).some((node) => node['@type'] === 'Thing'));
  assert.ok(!graph(profile).some((node) => node['@type'] === 'Product'));
});

test('pilot review content, attribution, language and anchors match rendered English and Chinese pages', () => {
  for (const locale of ['en', 'zh-Hans']) {
    for (const id of pilot) {
      const product = products.find((item) => item.variant.id === id);
      const html = renderModel({ ...context, locale }, product);
      const node = graph(html).find((item) => item['@type'] === 'Product');
      assert.ok(node, `${id} ${locale}`);
      const pageUrl = `${context.siteUrl}${context.base}${locale === 'zh-Hans' ? '/zh' : ''}/models/${id}/`;
      assert.deepEqual(auditProductReview(node, html, { pageUrl, locale }), [], `${id} ${locale}`);
      assert.equal(node.review.positiveNotes.itemListElement.length, product.variant.editorial.strengths.length);
      assert.equal(node.review.negativeNotes.itemListElement.length, product.variant.editorial.caveats.length);
      for (const key of ['offers', 'aggregateRating', 'price', 'datePublished', 'dateModified']) assert.ok(!(key in node));
      assert.ok(!('reviewRating' in node.review));
      assert.ok(!('datePublished' in node.review));
    }
  }
});

test('review opt-in rejects missing, duplicate, or unattributed editorial content', () => {
  const editorial = structuredClone(data.variants.find((variant) => variant.id === pilot[0]).editorial);
  assert.throws(() => sourceEditorialReview({ ...editorial, review: {} }), /author/);
  assert.throws(() => sourceEditorialReview({ ...editorial, verdict: ' ' }), /verdict/);
  assert.throws(() => sourceEditorialReview({ ...editorial, caveats: [] }), /caveats/);
  assert.throws(() => sourceEditorialReview({ ...editorial, caveats: [editorial.strengths[0]] }), /distinct/);
  assert.deepEqual(editorialReviewIssues(null), []);
  const missingSources = structuredClone(data);
  missingSources.variants.find((variant) => variant.id === pilot[0]).source_ids = [];
  assert.ok(validateDataset(missingSources).some((issue) => issue.includes(`${pilot[0]}: editorial review needs a public source`)));
});

test('generated-HTML audit rejects invented ratings, invisible notes, missing disclosure and broken review links', () => {
  const product = products.find((item) => item.variant.id === pilot[0]);
  const html = renderModel(context, product);
  const node = graph(html).find((item) => item['@type'] === 'Product');
  const options = { pageUrl: node.url };
  const changed = structuredClone(node);
  changed.review.positiveNotes.itemListElement[0].name = 'An invented result hidden from the reader';
  changed.review.reviewRating = { '@type': 'Rating', ratingValue: 5 };
  changed.review.url = 'https://other.example/';
  const errors = auditProductReview(changed, html.replace('data-review-basis="source-research"', ''), options);
  assert.ok(errors.some((issue) => issue.includes('ratings')));
  assert.ok(errors.some((issue) => issue.includes('visible ordered')));
  assert.ok(errors.some((issue) => issue.includes('research basis')));
  assert.ok(errors.some((issue) => issue.includes('linked editorial')));
  assert.ok(auditProductReview(node, html, { ...options, noindex: true }).some((issue) => issue.includes('indexable')));
});
