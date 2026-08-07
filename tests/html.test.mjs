import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, parseFrontmatter, renderMarkdown, url } from '../src/lib/html.mjs';

test('HTML escaping prevents markup injection', () => {
  assert.equal(escapeHtml('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
});

test('base-aware URLs work for GitHub project pages', () => {
  assert.equal(url('/china-carbon-bike-guide', '/models/example/'), '/china-carbon-bike-guide/models/example/');
  assert.equal(url('', '/'), '/');
});

test('guide frontmatter and markdown render without dependencies', () => {
  const parsed = parseFrontmatter('---\ntitle: Test\nreviewed: 2026-08-06\n---\n\n## Heading\n\n**Strong** text.');
  assert.equal(parsed.data.title, 'Test');
  assert.match(renderMarkdown(parsed.body), /<h2 id="heading">Heading<\/h2>/);
  assert.match(renderMarkdown(parsed.body), /<strong>Strong<\/strong>/);
});
