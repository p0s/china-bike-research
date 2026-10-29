import test from 'node:test';
import assert from 'node:assert/strict';
import { relatedPosts } from '../src/lib/posts.mjs';

const post = (slug, model_ids = [], text = '') => ({ slug, model_ids, translations: { en: { sections: [{ paragraphs: [text] }] } } });

test('an article without catalog models lists the guides it links to first, in link order', () => {
  const draft = post('draft', [], 'See [D](/blog/d/) and [B](/blog/b/#check), then [D again](/blog/d/).');
  const all = [post('a', ['m1']), post('b'), post('c', ['m2']), post('d'), post('e'), draft];
  assert.deepEqual(relatedPosts(draft, all).map((p) => p.slug), ['d', 'b', 'a', 'c']);
});

test('articles with catalog models keep shared-model ranking and the existing tie order', () => {
  const article = post('x', ['m2'], 'Links such as [D](/blog/d/) do not change this ranking.');
  const all = [post('a', ['m1']), post('b', ['m2']), post('c', ['m1', 'm2']), post('d', [], 'Links [A](/blog/a/).'), article];
  assert.deepEqual(relatedPosts(article, all).map((p) => p.slug), ['b', 'c', 'a', 'd']);
});
