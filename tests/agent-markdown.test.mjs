import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { catalogSummaries, renderCandidateModel, renderModel } from '../src/render.mjs';
import { localizedCatalogPayload } from '../src/lib/i18n.mjs';
import { CONTENT_SIGNAL, DATASET_RIGHTS, HOME_TABLE_LABELS, homeMarkdown, htmlToMarkdown, llmsTxt, markdownPath, pageMarkdown, robotsTxt } from '../src/lib/agent-markdown.mjs';
import { CONTENT_SIGNAL as WORKER_CONTENT_SIGNAL } from '../worker/markdown.mjs';

const siteUrl = 'https://chinesebikes.xyz';
const data = loadDataset(), products = joinProducts(data), catalogCandidates = joinCatalogCandidates(data);
const ctx = { data, products, catalogCandidates, base: '', siteUrl, repositoryUrl: 'https://github.com/p0s/china-bike-research', now: new Date('2026-10-30') };
const decode = (value) => value.replaceAll('&quot;', '"').replaceAll('&#039;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const markdownUrl = (value) => new URL(decode(value)).href.replace(/[()]/g, (character) => character === '(' ? '%28' : '%29');

test('converter keeps reading content and evidence lines, and drops page controls', () => {
  const html = `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li aria-current="page">Bike</li></ol></nav>
<nav class="model-sections" aria-label="On this page"><a href="#overview">Overview</a></nav>
<h1>Bike <span aria-hidden="true">✓</span></h1>
<p class="evidence-context"><span>Reviewed through <time datetime="2026-10-24">2026-10-24</time>.</span><span><a href="#source-records">View sources</a><span aria-hidden="true"> · </span><a href="/methodology/">Methodology</a></span><span hidden>internal</span></p>
<dl class="model-facts"><div><dt>Weight</dt><dd>1,200 g<span class="tooltip"><button class="info-button" type="button" aria-label="Weight basis" data-tooltip-lines="[&quot;Painted size M.&quot;,&quot;Hardware included.&quot;]">i</button></span></dd></div><div><dt>Frame</dt><dd><span class="tooltip"><button class="fact-button" type="button" aria-label="T47 — Frame details" data-tooltip-lines="[&quot;T800 claimed&quot;]">T47</button></span></dd></div></dl>
<button type="button">Add to comparison</button>
<form><label>Price <input name="price"></label><select><option>Choice</option></select><p>Default preview kept.</p></form>
<script>window.secret = 1</script><svg><text>chart label</text></svg>
<p>T800*M46 standover_mm _lead_ [note] <i>/</i> 1&lt;2 &amp; <b>bold</b> <code>a|b</code><br>Second line</p>
<p>- not a list</p>
<figure><img src="/assets/bike.avif" alt="Exact bike"><figcaption>Photo © Maker · <a href="https://maker.example/p?id=1&amp;x=(2)">source</a></figcaption></figure>
<details><summary>Buying checks (1)</summary><ul><li>Confirm the seller</li></ul></details>
<iframe src="https://www.youtube-nocookie.com/embed/x" title="Video"></iframe>`;
  assert.equal(htmlToMarkdown(html, { base: `${siteUrl}/models/bike/` }), `[Home](https://chinesebikes.xyz/) › Bike

# Bike

Reviewed through 2026-10-24. [View sources](https://chinesebikes.xyz/models/bike/#source-records) [Methodology](https://chinesebikes.xyz/methodology/)

- **Weight:** 1,200 g (Weight basis: Painted size M. Hardware included.)
- **Frame:** T47 (Frame details: T800 claimed)

Default preview kept.

T800\\*M46 standover_mm \\_lead\\_ \\[note\\] / 1<2 & **bold** \`a|b\`
Second line

\\- not a list

![Exact bike](https://chinesebikes.xyz/assets/bike.avif)

Photo © Maker · [source](https://maker.example/p?id=1&x=%282%29)

**Buying checks (1)**

- Confirm the seller`);
});

test('tables keep their header, and full-width detail rows become sections between table segments', () => {
  const html = `<table><caption>Systems</caption><thead><tr><th>System</th><th>Price</th></tr></thead><tbody>
<tr><td>105 | Di2</td><td>¥4,150<br><small>2026-08-19</small></td></tr>
<tr><td colspan="2"><details><summary>Details</summary><section><h3>Fit</h3><dl><div><dt>Freehub</dt><dd>HG</dd></div></dl></section></details></td></tr>
<tr><td>GRX</td><td>—</td></tr></tbody></table>
<table><tr><td>Only</td><td>row</td></tr></table>
<table><thead><tr><th>Empty</th></tr></thead><tbody></tbody></table>
<div><dl><dt>Inline</dt><dd><ul><li>a</li><li>b</li></ul></dd></dl></div>`;
  assert.equal(htmlToMarkdown(html), `**Systems**

| System | Price |
| --- | --- |
| 105 \\| Di2 | ¥4,150 2026-08-19 |

**Details**

### Fit

- **Freehub:** HG

| System | Price |
| --- | --- |
| GRX | — |

| Only | row |
| --- | --- |

- **Inline:** a; b`);
  assert.equal(markdownPath('zh/models/bike/index.html'), 'zh/models/bike/index.md');
  assert.equal(markdownPath('404.html'), '404.md');
});

test('every model profile keeps its robots policy, dated evidence, popover lines and source links', () => {
  for (const entry of [...products, ...catalogCandidates]) {
    const id = entry.variant?.id ?? entry.candidate.id;
    const html = entry.variant ? renderModel(ctx, entry) : renderCandidateModel(ctx, entry);
    const canonical = `${siteUrl}/models/${id}/`;
    const markdown = pageMarkdown(html, { canonical, lastmod: '2026-10-29' });
    const plain = markdown.replaceAll('\\', '');
    const robots = /<meta name="robots" content="([^"]+)">/.exec(html)[1];
    assert.ok(markdown.startsWith('---\ntitle: '), id);
    assert.ok(markdown.includes(`\ncanonical: "${canonical}"\n`), id);
    assert.ok(markdown.includes(`\nrobots: "${robots}"\n`), id);
    assert.ok(markdown.includes(`\nrights: ${JSON.stringify(DATASET_RIGHTS)}\n`), id);
    assert.doesNotMatch(markdown, /<\/?(?:div|span|button|input|select|svg|script)\b/, id);
    const main = html.slice(html.indexOf('<main id="content">'), html.indexOf('</main>'));
    for (const [, date] of main.matchAll(/<time datetime="([^"]+)"/g)) assert.ok(markdown.includes(date), `${id} ${date}`);
    for (const [, lines] of main.matchAll(/data-tooltip-lines="([^"]*)"/g)) {
      for (const line of JSON.parse(decode(lines))) assert.ok(plain.includes(String(line).trim()), `${id} ${line}`);
    }
    const sources = main.slice(main.indexOf('id="source-records"'));
    for (const [, href] of sources.matchAll(/<a\b[^>]*\shref="(https:[^"]+)"/g)) assert.ok(markdown.includes(`(${markdownUrl(href)})`), `${id} ${href}`);
  }
});

test('catalog Markdown lists every localized row with its model link, and leads after Partial profiles', () => {
  const html = '<!doctype html><html lang="zh-Hans"><head><title>Chinese Bikes</title><meta name="description" content="Catalog"><meta name="robots" content="index,follow,max-image-preview:large"></head><body><main id="content"><header class="catalog-header"><h1>对比</h1><p class="catalog-scope">价格说明 <a href="/zh/methodology/">资料来源说明</a></p></header></main></body></html>';
  for (const locale of ['en', 'zh-Hans', 'de', 'es', 'ru']) {
    const records = localizedCatalogPayload(catalogSummaries({ ...ctx, locale }), { base: '', locale, siteUrl });
    const translated = localizedCatalogPayload(HOME_TABLE_LABELS.map((label) => ({ label })), { base: '', locale, siteUrl });
    const labels = Object.fromEntries(HOME_TABLE_LABELS.map((label, index) => [label, translated[index].label]));
    if (locale !== 'en') for (const label of HOME_TABLE_LABELS) assert.notEqual(labels[label], label, `${locale} translates ${label}`);
    const canonical = `${siteUrl}/${locale === 'en' ? '' : `${locale === 'zh-Hans' ? 'zh' : locale}/`}`;
    const markdown = homeMarkdown(html, records, { canonical, lastmod: '2026-10-29', labels });
    assert.equal(markdown.split('\n').filter((line) => line.startsWith('| [')).length, records.length);
    assert.equal(markdown.split(`| ${HOME_TABLE_LABELS.slice(0, 8).map((label) => labels[label]).join(' | ')} |`).length, 3, locale);
    const divider = markdown.indexOf(`\n**${labels['Partial profiles']}**\n`);
    assert.ok(divider > 0, locale);
    for (const record of records) {
      const at = markdown.indexOf(`](${new URL(record.url, siteUrl).href}) |`);
      assert.ok(at > 0 && (record.stage === 'candidate') === (at > divider), `${locale} ${record.id}`);
    }
    assert.ok(markdown.includes(`# 对比\n\n价格说明 [资料来源说明](${siteUrl}/zh/methodology/)`));
  }
});

test('robots.txt, the Worker and llms.txt share one content signal with no training preference', () => {
  assert.equal(WORKER_CONTENT_SIGNAL, CONTENT_SIGNAL);
  assert.doesNotMatch(CONTENT_SIGNAL, /ai-train/);
  const robots = robotsTxt(`${siteUrl}/sitemap.xml`);
  assert.match(robots, /^User-agent: \*\nAllow: \/\nContent-Signal: search=yes, ai-input=yes\nSitemap: https:\/\/chinesebikes\.xyz\/sitemap\.xml\n$/m);
  assert.equal(robots.split('\n').filter((line) => line && !line.startsWith('#')).length, 4);
  const llms = llmsTxt({ siteUrl, base: '/china-bike-research', repositoryUrl: ctx.repositoryUrl, has: (path) => path !== '/ru/' });
  assert.match(llms, /^# Chinese Bikes\n\n> Independent comparison/);
  assert.ok(llms.includes(DATASET_RIGHTS));
  assert.ok(llms.includes('`Accept: text/markdown`'));
  assert.equal(/[^\x00-\x7f]/.test(llms), false, 'llms.txt is served as text/plain without a charset');
  assert.equal(llms.includes('/ru/'), false, 'unpublished targets are omitted');
  for (const [, href] of llms.matchAll(/\]\(([^)]+)\)/g)) {
    assert.ok(href.startsWith(`${siteUrl}/china-bike-research/`) || href.startsWith(ctx.repositoryUrl), href);
  }
});
