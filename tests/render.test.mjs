import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { escapeHtml } from '../src/lib/html.mjs';
import { clarifyMainlandInDisplayHtml } from '../src/lib/i18n.mjs';
import { priceEvidenceLines } from '../assets/price-display.js';
import { loadDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { loadPosts } from '../src/lib/posts.mjs';
import { loadSchedule, publishedPosts } from '../src/lib/post-publication.mjs';
import { renderHome, catalogSummaries, renderModel, renderCandidateModel, renderBikeBuilder, renderElectronicGroupsets, renderImagePolicy, renderImageSources, renderMethodology, renderPrivacy } from '../src/render.mjs';

const data = loadDataset();
const products = joinProducts(data);
const candidates = joinCatalogCandidates(data);
const allPosts = loadPosts();
const posts = publishedPosts(allPosts, loadSchedule(new URL('..', import.meta.url).pathname, allPosts));
const homeContext = {
  data,
  products,
  posts,
  base: '/china-bike-research',
  repositoryUrl: 'https://github.com/example/china-bike-research',
  siteUrl: 'https://example.github.io',
  siteLastmod: '2026-08-28',
  now: new Date('2026-08-07T00:00:00Z')
};
const html = renderHome(homeContext);

test('model decision panels describe price thresholds without claiming the current price is below them', () => {
  for (const [id, kind, amount] of [['camp-gx600-pes', 'Complete-bike', '¥5,600'], ['af01-frameset', 'Frameset', '¥6,200']]) {
    const product = products.find((item) => item.variant.id === id);
    assert.ok(product.latestPrice.amount_cny > product.variant.editorial.price_thresholds_cny.great_buy_below);
    const detail = renderModel(homeContext, product);
    assert.ok(detail.includes(`${kind} good-buy reference: below ${amount}`));
    assert.doesNotMatch(detail, /Below this model’s/);
    for (const locale of ['zh-Hans', 'de']) {
      assert.doesNotMatch(renderModel({ ...homeContext, locale }, product), /good-buy reference|Below this model’s/);
    }
  }
});

test('homepage opens on the catalog without guide teasers or curated card sections', () => {
  const catalog = html.indexOf('class="catalog-section"');
  assert.ok(catalog > 0);
  assert.doesNotMatch(html, /class="homepage-articles|class="curated-picks|class="catalog-jump"|class="article-card"/);
  // Price and frame-build settings open from the header chip and apply to the catalog.
  const settings = html.match(/<div class="settings-panel" id="price-settings-panel"[\s\S]*?<\/div>\s*<\/div>\s*<div class="header-actions">/)?.[0] ?? '';
  assert.match(settings, /data-frameset-build-preset/);
  assert.match(settings, /data-ship-country/);
  assert.match(html, /data-settings-toggle/);
  assert.ok(html.indexOf('<h1>Compare Chinese bikes and frame builds</h1>') > catalog);
  assert.match(html, /data-show-all-models/);
  assert.equal((html.match(/data-product-row/g) ?? []).length, products.length + candidates.length);
});

test('Blog stays one header and footer link away in every locale and drafts never appear', () => {
  for (const [locale, prefix, label] of [['en', '', 'Blog'], ['zh-Hans', '/zh', '博客'], ['de', '/de', 'Blog'], ['es', '/es', 'Blog'], ['ru', '/ru', 'Блог']]) {
    const localized = renderHome({ ...homeContext, locale });
    const blogPrefix = ['es', 'ru'].includes(locale) ? '' : prefix;
    assert.ok(localized.includes(`href="/china-bike-research${blogPrefix}/blog/" data-nav-blog>${label}</a>`), locale);
    assert.ok(localized.includes(`href="/china-bike-research${blogPrefix}/blog/">${label}</a>`), locale);
    assert.ok(localized.includes(`action="/china-bike-research${prefix}/#catalog"`), locale);
    for (const draft of allPosts.filter((post) => !posts.some((published) => published.slug === post.slug))) {
      assert.ok(!localized.includes(`/blog/${draft.slug}/`));
    }
  }
});

test('homepage is the unified bike and frame-build comparison', () => {
  assert.match(html, /data-catalog-root/);
  assert.match(html, /data-inline-compare/);
  assert.match(html, /Frame build/);
  assert.match(html, /Est\. ¥9,987/);
  assert.match(html, /Max full-bike price/);
  assert.match(html, /placeholder="Search model, brand, drivetrain or 中文名"[^>]*data-filter-search/);
  assert.match(html, /class="product-fit">Gravel<\/span>/);
  assert.match(html, /Select two to ten bikes to compare/);
  assert.match(html, /type="application\/ld\+json">[\s\S]*"@type":"WebSite"/);
  assert.doesNotMatch(html, /"itemListElement"/);
});

test('homepage exposes crawlable evidence-led discovery without duplicating the catalog', () => {
  assert.match(html, /Dataset updated <time datetime="2026-08-28">2026-08-28<\/time>; catalog-wide review <time datetime="2026-08-08">2026-08-08<\/time>/);
  assert.doesNotMatch(html.match(/<section class="catalog-intro">[\s\S]*?<\/section>/)?.[0] ?? '', /Dataset updated/);
  assert.match(html, /Chinese Bikes compares Chinese road, gravel, and carbon-bike options using dated China-market prices/);
  assert.match(html, /href="\/china-bike-research\/brands\/">Brands<\/a>/);
  assert.match(html, /href="\/china-bike-research\/complete-bikes\/">Complete bikes<\/a>/);
  assert.match(html, /href="\/china-bike-research\/framesets\/">Framesets<\/a>/);
  assert.match(html, /href="\/china-bike-research\/prices\/">Price ranges<\/a>/);
});

test('homepage social preview is project-owned, crop-sized, and fully described', () => {
  assert.match(html, /property="og:image" content="https:\/\/example.github.io\/china-bike-research\/assets\/social-preview.png"/);
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /property="og:image:height" content="630"/);
  assert.match(html, /property="og:image:type" content="image\/png"/);
  assert.match(html, /og:image:alt" content="AI-generated wind-tunnel editorial scene with one iridescent aero bike on a test rig and six unbranded bikes behind glass; not exact-model photography"/);
  const preview = fs.readFileSync(new URL('../assets/social-preview.png', import.meta.url));
  assert.equal(preview.subarray(1, 4).toString(), 'PNG');
  assert.equal(preview.readUInt32BE(16), 1200);
  assert.equal(preview.readUInt32BE(20), 630);
  assert.ok(preview.byteLength < 1_250_000);
  const provenance = JSON.parse(fs.readFileSync(new URL('../assets/social-preview.provenance.json', import.meta.url), 'utf8'));
  assert.equal(provenance.generation.input_images, 'none');
  assert.equal(provenance.composition.bike_count, 7);
  assert.equal(provenance.output.sha256, '6fd7276fc98792a925df1dc4ef5a2efa151608267b7ac80cb55b079828d7ad87');
  assert.deepEqual(provenance.output.dimensions, { width: 1200, height: 630 });
});

test('every homepage locale adds the project-made MP4 link preview and keeps the image fallback', () => {
  const provenance = JSON.parse(fs.readFileSync(new URL('../assets/social-video/home-switchback-signature.provenance.json', import.meta.url), 'utf8'));
  const { path: asset, sha256, bytes, dimensions } = provenance.output;
  const clip = fs.readFileSync(new URL(`../${asset}`, import.meta.url));
  assert.equal(crypto.createHash('sha256').update(clip).digest('hex'), sha256);
  assert.ok(asset.endsWith(`-${sha256.slice(0, 10)}.mp4`));
  assert.equal(clip.byteLength, bytes);
  assert.ok(clip.byteLength < 1_000_000);
  const boxes = [];
  for (let at = 0; at < clip.byteLength; at += clip.readUInt32BE(at)) boxes.push(clip.toString('latin1', at + 4, at + 8));
  assert.ok(boxes.indexOf('moov') > -1 && boxes.indexOf('moov') < boxes.indexOf('mdat'), 'fast start: moov precedes mdat');
  assert.deepEqual([...clip.toString('latin1').matchAll(/hdlr[\s\S]{8}(vide|soun)/g)].map((match) => match[1]), ['vide']);
  assert.deepEqual(dimensions, { width: 960, height: 540 });
  const absolute = `https://example.github.io/china-bike-research/${asset}`;
  for (const locale of ['en', 'zh-Hans', 'de', 'es', 'ru']) {
    const page = locale === 'en' ? html : renderHome({ ...homeContext, locale });
    assert.ok(page.includes(`<meta property="og:video" content="${absolute}"><meta property="og:video:secure_url" content="${absolute}"><meta property="og:video:type" content="video/mp4"><meta property="og:video:width" content="960"><meta property="og:video:height" content="540">`), locale);
    assert.match(page, /property="og:image" content="https:\/\/example.github.io\/china-bike-research\/assets\/social-preview.png"/);
    assert.match(page, /name="twitter:card" content="summary_large_image"/);
  }
  // Other routes never reuse the homepage clip; a page without a preview still shares the branded fallback.
  const methodology = renderMethodology(homeContext);
  const { fallback } = JSON.parse(fs.readFileSync(new URL('../assets/social-video/manifest.json', import.meta.url), 'utf8'));
  assert.ok(methodology.includes(`<meta property="og:video" content="https://example.github.io/china-bike-research/${fallback.file}">`));
  assert.doesNotMatch(methodology, /home-switchback-signature/);
});

test('theme control follows the OS by default and exposes only light and dark choices', () => {
  const client = fs.readFileSync(new URL('../assets/site.js', import.meta.url), 'utf8');
  const styles = fs.readFileSync(new URL('../assets/site.css', import.meta.url), 'utf8');
  assert.match(html, /data-theme-control/);
  assert.match(client, /const themeModes = \['light', 'dark'\]/);
  assert.match(client, /localStorage\.setItem\(themeStorageKey, selected\)/);
  assert.match(client, /delete document\.documentElement\.dataset\.theme/);
  assert.match(styles, /:root\[data-theme="dark"\]/);
  assert.match(styles, /@media \(prefers-color-scheme: dark\)[\s\S]*:root:not\(\[data-theme\]\)/);
  assert.match(styles, /--image-surface: #e6eae4/);
});

test('homepage offers compact criteria-led comparison starting points', () => {
  assert.match(html, /id="starting-points-title">Starting points<\/h2>/);
  assert.doesNotMatch(html, /Three focused shortlists—not a universal score or a recommendation ranking/);
  for (const group of ['affordable-carbon-aero', 'electronic-gravel', 'wide-tire-aero']) {
    assert.match(html, new RegExp(`data-curated-group="${group}"`));
  }
  for (const id of [
    'candidate-cycletrack-phantom-rx24', 'twitter-cyclone-gen3-et', 'candidate-camp-ace-qed',
    'twitter-v3-wheeltop-eds', 'pardus-super-sport-gen2-egr', 'incolor-voyager-frameset',
    'incolor-speedster-sr-frameset', 'candidate-lightcarbon-lcr018-d', 'candidate-tavelo-arden'
  ]) {
    assert.match(html, new RegExp(`(?:models\\/${id}\\/|compare=[^"#]*${id})`));
  }
  assert.match(html, /compare=incolor-speedster-sr-frameset%2Ccandidate-lightcarbon-lcr018-d%2Ccandidate-tavelo-arden%2Cpardus-super-sport-gen2-egr&amp;start=wide-tire-aero#compare/);
  assert.match(html, /compare=twitter-v3-wheeltop-eds%2Cpardus-super-sport-gen2-egr%2Cincolor-voyager-frameset&amp;start=electronic-gravel#compare/);
  assert.match(html, /data-criteria="Aero-shaped road and all-road frames with documented 38–40 mm maximum tire clearance[^"]*Aero shaping is not a measured drag result\."/);
  assert.doesNotMatch(html, /Compare the three|three-bike comparison/);
});

test('homepage comparison payload keeps frameset pricing dynamic without serializing inactive fields', () => {
  assert.match(html, /id="catalog-data" data-src="\/china-bike-research\/data\/home-catalog-en\.json\?v=regional-v1"/);
  const payload = catalogSummaries({ data, products });
  const frameset = payload.find((item) => item.estimated === true);
  const complete = payload.find((item) => item.type === 'Complete bike');
  const cosmosworks = payload.find((item) => item.id === 'candidate-cosmosworks-carbon-e-road');
  assert.ok(frameset && Number.isFinite(frameset.frameLow) && Number.isFinite(frameset.frameHigh));
  assert.ok(complete);
  assert.equal(cosmosworks.priceDetails, 'Recorded basis: coupon.');
  assert.doesNotMatch(cosmosworks.priceDetails, /NOMAD|Oi!/);
  assert.equal('estimated' in complete, false);
  assert.equal('frameLow' in complete, false);
  assert.equal('frameHigh' in complete, false);
  assert.ok(payload.every((item) => item.estimated === true || (!('frameLow' in item) && !('frameHigh' in item))));
  assert.ok(payload.every((item) => !('buildBaseId' in item)));
});

test('comparison client renders accessible move controls and persists their order in the URL', () => {
  const client = fs.readFileSync(new URL('../assets/site.js', import.meta.url), 'utf8');
  assert.match(client, /import \{ moveSelectionId \} from '\.\/compare-state\.js'/);
  assert.match(client, /Move \$\{label\} left/);
  assert.match(client, /Move \$\{label\} right/);
  assert.equal((client.match(/dataset\.moveCompare = item\.id/g) ?? []).length, 2);
  assert.match(client, /searchParams\.set\('compare', selection\.join\(','\)\)/);
  assert.match(client, /The comparison link keeps this order/);
});

test('products without verified photos omit the image region and social placeholder', () => {
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-17T00:00:00Z')
  };
  const frameset = products.find((item) => item.variant.id === 'lightcarbon-speedz-frameset');
  const complete = products.find((item) => item.variant.id === 'lightcarbon-speedz-complete');
  const framesetDetail = renderModel(context, frameset);
  const completeDetail = renderModel(context, complete);

  assert.match(framesetDetail, /class="model-grid has-no-image"/);
  assert.match(completeDetail, /class="model-grid has-no-image"/);
  assert.doesNotMatch(framesetDetail, /assets\/images\/placeholders|<figure class="model-figure"|property="og:image"/);
  assert.doesNotMatch(completeDetail, /assets\/images\/placeholders|<figure class="model-figure"|property="og:image"/);
  assert.doesNotMatch(renderImageSources(context), /project-placeholder|Project-owned product image placeholders|assets\/images\/placeholders/);
});

test('homepage omits developer-facing dashboards and legacy sections', () => {
  assert.doesNotMatch(html, /decision-ready configurations/i);
  assert.doesNotMatch(html, /Current quick picks/i);
  assert.doesNotMatch(html, /<h2[^>]*>Guides</i);
  assert.doesNotMatch(html, />Watchlist</i);
  assert.doesNotMatch(html, /href="[^"]*\/compare\//i);
  assert.doesNotMatch(html, /href="[^"]*\/guides\//i);
});

test('candidate leads share the catalog without a separate research queue', () => {
  assert.match(html, /PARDUS 瑞豹 Spark Sport PES/);
  assert.match(html, /Winspace SLC3\.0 frameset/);
  assert.match(html, /data-stage="candidate" data-default-visible="true" data-id="candidate-pardus-spark-sport-pes"/);
  assert.match(html, /data-id="candidate-missing-china-price-winspace-slc3"/);
  assert.match(html, /data-id="candidate-xds-gt350"[\s\S]*?<span class="product-image">[\s\S]*?<img[^>]+src="\/china-bike-research\/assets\/images\/sourced\/retailer\/xds-gt350-primary-image\/[^\"]+"[^>]+alt="XDS GT350 gravel bike shown from the drive side"/);
  assert.match(html, /<button[^>]*data-calculated-price[^>]*>¥8,597<\/button><\/div>/);
  assert.match(html, /data-id="candidate-pardus-spark-sport-pes"[\s\S]*?<span class="product-meta">/);
  assert.match(html, /href="\/china-bike-research\/models\/missing-china-price-winspace-slc3\/" data-model-link/);
  assert.match(html, /data-show-all-models aria-pressed="false"/);
  assert.doesNotMatch(html, /Research queue/);
  assert.doesNotMatch(html, /Needs:/);
  assert.doesNotMatch(html, /data-id="pardus-spark-sport-pes"/);
  assert.doesNotMatch(html, /data-id="winspace-slc3"/);
});

test('candidate bikes have concise internal research profiles with visible facts and unknowns', () => {
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-17T00:00:00Z')
  };
  const quick = candidates.find((entry) => entry.candidate.id === 'quick-pro-er-one');
  const quickDetail = renderCandidateModel(context, quick);
  assert.match(quickDetail, /<h1>Quick Pro ER:ONE<\/h1>/);
  assert.match(quickDetail, /Official global model/);
  assert.match(quickDetail, /<section class="model-story"[^>]*>[\s\S]*Specifications and evidence/);
  assert.doesNotMatch(quickDetail, /The short version/);
  assert.match(quickDetail, /Est\. ¥33,940 is a dated currency conversion/);
  assert.match(quickDetail, /Shimano Ultegra R8170 Di2 2×12/);
  assert.match(quickDetail, /Buying context/);
  assert.match(quickDetail, /About Quick/);
  assert.match(quickDetail, /Price record and sources/);
  assert.match(quickDetail, /property="og:type" content="product"/);
  assert.match(quickDetail, /"@type":"Thing"/);
  assert.doesNotMatch(quickDetail, /"@type":"Product"/);
  assert.doesNotMatch(quickDetail, /"offers":/);
  assert.doesNotMatch(quickDetail, /Ask the seller in Chinese|Seller\/authenticity|Current seller/);

  const sparse = candidates.find((entry) => entry.candidate.id === 'airwolf-yfr068');
  const sparseDetail = renderCandidateModel(context, sparse);
  assert.match(sparseDetail, /Frame ¥4,025 · Official FX estimate · 2026-09-01/);
  assert.match(sparseDetail, /Est\. ¥10,025 estimate adds the adjustable ¥6,000 build allowance/);
  assert.match(sparseDetail, /Airwolf YFR068 \/ A5/);
  assert.match(sparseDetail, /40 mm/);
  assert.match(sparseDetail, /Frame weight basis/);
  assert.doesNotMatch(sparseDetail, /Frame_weight_basis/);
  assert.match(sparseDetail, /Identity not confirmed/);
  assert.match(sparseDetail, /property="og:type" content="website"/);
  assert.doesNotMatch(sparseDetail, /"@type":"Thing"|"@type":"Product"/);

  const airwolfPriceReference = candidates.find((entry) => entry.candidate.id === 'airwolf-yf-r003');
  const airwolfPriceDetail = renderCandidateModel(context, airwolfPriceReference);
  assert.match(airwolfPriceDetail, /Frame package ¥9,644 · Foreign seller FX estimate · 2026-09-25/);
  assert.match(airwolfPriceDetail, /currency conversion of a foreign seller listing, not a confirmed mainland China checkout price/);
  assert.match(airwolfPriceDetail, /adjust the allowance to avoid double-counting included parts/);
  assert.doesNotMatch(airwolfPriceDetail, /Official FX estimate/);

  const oldTwitterCarbon = candidates.find((entry) => entry.candidate.id === 'twitter-gravel-v3-2024-rs-carbon-wave');
  const oldTwitterCarbonDetail = renderCandidateModel(context, oldTwitterCarbon);
  assert.match(oldTwitterCarbonDetail, /<strong>Not sold new<\/strong><span>Superseded by 2025 Gravel V3<\/span>/);
  assert.match(oldTwitterCarbonDetail, /Superseded model/);
  assert.match(oldTwitterCarbonDetail, /This 2024 version is no longer sold new\. It was superseded by the 2025 Gravel V3/);
  assert.match(oldTwitterCarbonDetail, /Product image via public marketplace listing mirror · Exact frame platform/);
  assert.match(oldTwitterCarbonDetail, /data-image-gallery/);
  assert.equal((oldTwitterCarbonDetail.match(/data-gallery-thumb/g) ?? []).length, 4);
  assert.match(oldTwitterCarbonDetail, /TWITTER 骓特 Gravel V3 2024 RS 2×12/);
  assert.doesNotMatch(oldTwitterCarbonDetail, /<h1>[^<]*carbon-wave/i);
  assert.match(oldTwitterCarbonDetail, /Silver full-bike view \(1 of 4\)/);
  assert.match(oldTwitterCarbonDetail, /Alternate-color full-bike view/);
  assert.match(oldTwitterCarbonDetail, /Mechanical cockpit detail/);
  assert.match(oldTwitterCarbonDetail, /Hydraulic caliper detail/);
  assert.match(oldTwitterCarbonDetail, /TWITTER Gravel V3 public listing images/);
  assert.doesNotMatch(oldTwitterCarbonDetail, /Price not verified/);
});

test('sparse candidate pages read as concise model articles without repeating empty-state copy', () => {
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-29T00:00:00Z')
  };
  const cyclone = candidates.find((entry) => entry.candidate.id === 'twitter-cyclone-sport');
  const detail = renderCandidateModel(context, cyclone);
  assert.match(detail, />Overview<\/h2>/);
  assert.match(detail, /Specifications and evidence/);
  assert.match(detail, /Buying context/);
  assert.match(detail, /About Twitter/i);
  assert.doesNotMatch(detail, /The short version|No model-specific hardware facts are verified yet|research-stage profile/i);
});

test('candidate model pages keep alternative trims separate from the reference row', () => {
  const xlab = joinCatalogCandidates(data).find((entry) => entry.candidate.id === 'xlab-ad8');
  const detail = renderCandidateModel({
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-27T00:00:00Z')
  }, xlab);
  assert.match(detail, /Other documented builds/);
  assert.match(detail, /not mixed into the catalog reference row/);
  assert.match(detail, /Taobao standard Astana 105 Di2 build/);
  assert.match(detail, /¥21,980/);
  assert.match(detail, /Custom size-L R7170 build/);
});

test('candidate details expose frame material and stiffness evidence without inventing a score', () => {
  const cloned = structuredClone(data);
  const candidate = cloned.candidates.find((item) => item.id === 'xlab-ad8');
  candidate.facts.frame_material = 'Toray T800 and M40X carbon';
  candidate.facts.stiffness_evidence = 'Manufacturer comparison; test protocol not published.';
  const entry = joinCatalogCandidates(cloned).find((item) => item.candidate.id === candidate.id);
  const detail = renderCandidateModel({ data: cloned, products: joinProducts(cloned), base: '/', repositoryUrl: 'https://github.com/example/china-bike-research', siteUrl: 'https://example.com', now: new Date('2026-08-27T00:00:00Z') }, entry);
  assert.match(detail, /<dt>Frame material<\/dt><dd>Toray T800 and M40X carbon<\/dd>/);
  assert.match(detail, /<dt>Stiffness evidence<\/dt><dd>Manufacturer comparison; test protocol not published\.<\/dd>/);
  assert.doesNotMatch(detail, /stiffness score/i);
});

test('candidate fitted tire observations are labeled and are not sorted as verified maximum clearance', () => {
  const entry = candidates.find((item) => item.candidate.id === 'triaero-a9');
  const detail = renderCandidateModel({ data, products, base: '/', repositoryUrl: 'https://github.com/example/china-bike-research', siteUrl: 'https://example.com', now: new Date('2026-09-24T00:00:00Z') }, entry);
  assert.match(detail, /28 mm fitted/);
  assert.match(detail, /Manufacturer-confirmed maximum tire clearance/);
  const idOffset = html.indexOf('data-id="candidate-triaero-a9"');
  assert.notEqual(idOffset, -1);
  const openingTag = html.slice(html.lastIndexOf('<div', idOffset), html.indexOf('>', idOffset) + 1);
  assert.doesNotMatch(openingTag, /data-tire-clearance-sort=/);

  const rs9 = candidates.find((item) => item.candidate.id === 'xlab-rs9');
  const rs9Detail = renderCandidateModel({ data, products, base: '/', repositoryUrl: 'https://github.com/example/china-bike-research', siteUrl: 'https://example.com', now: new Date('2026-09-24T00:00:00Z') }, rs9);
  assert.match(rs9Detail, /32 mm fitted/);
  const rs9IdOffset = html.indexOf('data-id="candidate-xlab-rs9"');
  assert.notEqual(rs9IdOffset, -1);
  const rs9OpeningTag = html.slice(html.lastIndexOf('<div', rs9IdOffset), html.indexOf('>', rs9IdOffset) + 1);
  assert.doesNotMatch(rs9OpeningTag, /data-tire-clearance-sort=/);
});

test('candidates without a recorded category show an honest unknown instead of undefined', () => {
  const entry = candidates.find((item) => item.candidate.id === 'velobuild-cx-002-2023');
  const detail = renderCandidateModel({
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-24T00:00:00Z')
  }, entry);
  assert.match(detail, /<dt>Category<\/dt><dd>Category not confirmed<\/dd>/);
  assert.doesNotMatch(detail, />undefined</);
});

test('published frame pages show exact-model galleries and component weight context', () => {
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-25T00:00:00Z')
  };
  const quick = products.find((entry) => entry.variant.id === 'quick-gr-one-frameset');
  const quickDetail = renderModel(context, quick);
  assert.match(quickDetail, /data-image-gallery/);
  assert.equal((quickDetail.match(/data-gallery-thumb/g) ?? []).length, 6);
  assert.match(quickDetail, /Ice Crack Silver/);
  assert.match(quickDetail, /<dt>Frame weight<\/dt><dd>919 g<\/dd>/);
  assert.match(quickDetail, /<dt>Fork weight<\/dt><dd>459 g<\/dd>/);
  assert.match(quickDetail, /<dt>Seatpost weight<\/dt><dd>169 g<\/dd>/);
  assert.match(quickDetail, /5 sizes \(XS\/426–XL\/546\) · stack 524–599 mm · reach 370–405 mm/);
  assert.match(quickDetail, /property="og:type" content="product"/);
  assert.match(quickDetail, /<dt>Tire clearance<\/dt><dd>/);
  assert.doesNotMatch(quickDetail, /"@type":"Product"/);
  assert.doesNotMatch(quickDetail, /"offers":/);

  const incolor = products.find((entry) => entry.variant.id === 'incolor-voyager-frameset');
  const incolorDetail = renderModel(context, incolor);
  assert.equal((incolorDetail.match(/data-gallery-thumb/g) ?? []).length, 7);
  assert.match(incolorDetail, /Est\. ¥13,800/);
  assert.match(incolorDetail, /5 sizes \(45–57\) · stack 515–580 mm · reach 358–397 mm/);
});

test('shared frameset platforms render variant-specific weight, basis, and carbon lay-up', () => {
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-29T00:00:00Z')
  };
  const sr = products.find((entry) => entry.variant.id === 'incolor-speedster-sr-frameset');
  const srPlus = products.find((entry) => entry.variant.id === 'incolor-speedster-sr-plus-frameset');

  assert.ok(sr);
  assert.ok(srPlus);
  const srDetail = renderModel(context, sr);
  const srPlusDetail = renderModel(context, srPlus);
  assert.match(srDetail, /<dt>Weight<\/dt><dd>785 g · bare frame/);
  assert.match(srDetail, /<dt>Weight basis<\/dt><dd>Size 54, unpainted, excluding paint and metal hardware<\/dd>/);
  assert.match(srDetail, /<dt>Frame material<\/dt><dd>M60 \+ T800 carbon<\/dd>/);
  assert.match(srPlusDetail, /<dt>Weight<\/dt><dd>720 g · bare frame/);
  assert.match(srPlusDetail, /<dt>Frame material<\/dt><dd>80T pitch-based \+ T1100 carbon<\/dd>/);
  assert.match(srPlusDetail, />Overview<\/h2>/);
  assert.doesNotMatch(srPlusDetail, /frame frame/);
  assert.match(html, /data-id="incolor-speedster-sr-frameset"[\s\S]*?785 g[\s\S]*?<span class="metric-sub">bare frame<\/span>/);
  assert.match(html, /data-id="incolor-speedster-sr-plus-frameset"[\s\S]*?720 g[\s\S]*?<span class="metric-sub">bare frame<\/span>/);
});

test('complete-bike pages expose researched build components and weight basis without another profile section', () => {
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-26T00:00:00Z')
  };
  const gx600 = products.find((entry) => entry.variant.id === 'camp-gx600-pes');
  const gx600Detail = renderModel(context, gx600);
  assert.match(gx600Detail, /<dt>Weight basis<\/dt><dd>Official small-size complete-bike weight excluding pedals and small accessories<\/dd>/);
  assert.match(gx600Detail, /<dt>Drivetrain build<\/dt><dd>Shifters: Magene PES 12-speed wireless trigger shifter · RD: Magene PES 12-speed · Crank: Yuyong 42T aluminum integrated-axle crank · Cassette: HR 12-speed 11–45T · Chain: 12-speed; manufacturer\/model not specified<\/dd>/);
  assert.match(gx600Detail, /<dt>Brakes<\/dt><dd>Hydraulic disc · Calipers: Tektro hydraulic<\/dd>/);

  const gx700 = products.find((entry) => entry.variant.id === 'camp-gx700-grx820');
  const gx700Detail = renderModel(context, gx700);
  assert.match(gx700Detail, /45 mm stock/);
  assert.match(gx700Detail, /Shifters: ST-RX820 · RD: RD-RX822 · Crank: FC-RX610 36T · Cassette: CS-M6100 12-speed 10–51T/);
});

test('exact-variant bottom-bracket labels render without filling the shared platform field', () => {
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-09-24T00:00:00Z')
  };
  const s4 = products.find((entry) => entry.variant.id === 'sava-gelaro-s4-grx400');
  const s8 = products.find((entry) => entry.variant.id === 'sava-gelaro-s8');
  assert.equal(s4.variant.bottom_bracket, 'BBT47');
  assert.equal(s4.platform.frame.bottom_bracket, undefined);
  assert.match(renderModel(context, s4), /<dt>Bottom bracket<\/dt><dd>BBT47<\/dd>/);
  assert.doesNotMatch(renderModel(context, s8), /BBT47/);
});

test('superseded published bikes show availability instead of a historical price headline', () => {
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-21T00:00:00Z')
  };
  const oldTwitterAlloy = products.find((entry) => entry.variant.id === 'twitter-v3-2024-rs-sensah-alloy');
  const detail = renderModel(context, oldTwitterAlloy);
  assert.match(detail, /<strong>Not sold new<\/strong>/);
  assert.match(detail, /Superseded by 2025 Gravel V3/);
  assert.match(detail, /Historical price for a superseded model/);
  assert.match(detail, /¥3,991[\s\S]*Historical listing option · Historical price for a superseded model/);
  assert.doesNotMatch(detail, /The recorded complete-bike price is ¥3,991/);
});

test('candidate rows expose verified complete-bike facts and honest FX estimates', () => {
  // FX references sort by the labelled amount buyers see but never supply a budget value.
  assert.match(html, /data-id="candidate-quick-pro-er-one"[^>]*data-type="complete-bike"[^>]*data-price-sort="\d+(?:\.\d+)?"[^>]*data-price-filter=""/);
  assert.match(html, /Quick Pro ER:ONE[\s\S]*?≈ ¥33,940[\s\S]*?Official FX estimate[\s\S]*?Shimano Ultegra R8170 Di2 2×12[\s\S]*?7\.1 kg[\s\S]*?T1100\/M65 monocoque carbon/);
  assert.match(html, /data-id="candidate-missing-china-price-quick-pro-xr-one"[^>]*data-tire-clearance-sort="50"/);
  assert.match(html, /Quick Pro XR:ONE GRX Di2 1×12[\s\S]*?<div class="catalog-cell tire-clearance-cell" role="cell">50 mm<\/div>/);
  assert.match(html, /data-id="candidate-missing-china-price-x-lab-xds-gt8"[^>]*data-price-sort="21980"[^>]*data-tire-clearance-sort="55"/);
  assert.match(html, /X-LAB GT8 GRX Di2[\s\S]*?¥21,980[\s\S]*?8\.8 kg[\s\S]*?Toray T800 carbon/);
  assert.match(html, /data-id="candidate-specialized-roubaix-sl8-sport-105"[^>]*data-price-sort="\d+(?:\.\d+)?"[^>]*data-price-filter=""[^>]*data-tire-clearance-sort="40"/);
  assert.match(html, /Specialized 2025 Roubaix SL8 Sport Shimano 105[\s\S]*?≈ ¥23,519[\s\S]*?Official FX estimate[\s\S]*?Shimano 105 R7100\/R7120 mechanical 2×12[\s\S]*?9\.1 kg[\s\S]*?FACT 10R carbon/);
  assert.match(html, /data-id="candidate-missing-china-price-winspace-slc3"[^>]*data-type="frameset"[^>]*data-frame-price-low="9800"[^>]*data-frame-price-high="9800"/);
  assert.match(html, /Winspace SLC3\.0 frameset[\s\S]*?Est\. ¥15,800[\s\S]*?Official FX estimate/);
  assert.match(html, /data-id="candidate-missing-china-price-giant-defy-advanced"[^>]*data-type="complete-bike"[^>]*data-price-sort="14800"[^>]*data-price-filter="14800"/);
  assert.match(html, /Giant Defy Advanced 2[\s\S]*?¥14,800[\s\S]*?38 mm/);
  assert.match(html, /data-id="candidate-missing-china-price-giant-defy-advanced"[^>]*data-tire-clearance-sort="38"/);
  assert.match(html, /data-id="candidate-missing-china-price-trek-domane"[^>]*data-tire-clearance-sort="38"/);
  assert.match(html, /data-id="candidate-missing-china-price-specialized-roubaix-sl8"[^>]*data-tire-clearance-sort="40"/);
  assert.match(html, /data-id="candidate-missing-china-price-merida-scultura"[^>]*data-type="complete-bike"[^>]*data-price-sort="16800"[^>]*data-price-filter="16800"/);
  assert.match(html, /Merida SCULTURA 6000 25[\s\S]*?¥16,800[\s\S]*?Shimano 105 Di2 2×12[\s\S]*?8\.2 kg/);
  assert.match(html, /Merida Scultura Endurance 4000[\s\S]*?Exact build price unknown[\s\S]*?Unmatched price retained as reference/);
  assert.match(html, /Canyon Grail CF 7[\s\S]*?¥13,700[\s\S]*?total incomplete/);
  assert.match(html, /TSB \/ Titan Super Bond 泰世邦 PIONEER ONE[\s\S]*?Est\. ¥27,900/);
});

test('candidate detail preserves official price conflicts and direct source links', () => {
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-17T00:00:00Z')
  };
  const canyon = candidates.find((entry) => entry.candidate.id === 'missing-china-price-canyon-grail');
  const canyonDetail = renderCandidateModel(context, canyon);
  assert.match(canyonDetail, /Official price conflict/);
  assert.doesNotMatch(canyonDetail, /Observed market record/);

  const direct = structuredClone(candidates.find((entry) => entry.candidate.id === 'tsb-titan-super-bond-pioneer-one'));
  direct.candidate.source_url = 'https://example.com/direct-source';
  const directDetail = renderCandidateModel(context, direct);
  assert.match(directDetail, /Direct candidate link:/);
});

test('frameset package details warn when the recorded price includes build parts', () => {
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-17T00:00:00Z')
  };
  const quick = candidates.find((entry) => entry.candidate.id === 'quick-pro-tr-one');
  const detail = renderCandidateModel(context, quick);
  assert.match(detail, /package explicitly includes frame, cockpit\/handlebar, accessories/);
  assert.match(detail, /adjust the allowance to avoid double-counting/);
});

test('local builds use the live repository for public contribution links', () => {
  const buildSource = fs.readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
  assert.match(buildSource, /https:\/\/github\.com\/p0s\/china-bike-research/);
  assert.doesNotMatch(buildSource, /github\.com\/your-org\/your-repo/);
});

test('category-specific details stay accessible while price state is visible', () => {
  assert.match(html, /data-price-details="2026-08-08"[^>]*aria-expanded="false"/);
  assert.doesNotMatch(html, /data-capability-kind="tire"/);
  assert.match(html, /data-id="twitter-v3-wheeltop-eds"[^>]*data-capability-kind="discipline"/);
  assert.doesNotMatch(html.match(/<div class="catalog-row[^>]*data-id="twitter-v3-wheeltop-eds"[^>]*>/)[0], /data-tire-clearance-sort=/);
  assert.match(html, /aria-label="Format details"/);
  assert.match(html, /type="number"[^>]*data-filter-tire/);
  assert.match(html, /data-filter-tire-unknown/);
  assert.match(html, /data-filter-complete-weight/);
  assert.match(html, /data-filter-frame-weight/);
  assert.ok(catalogSummaries({ data, products }).some((item) => item.weightGrams === 9900 && item.weightKind === 'complete'));
  assert.match(html, /data-filter-drivetrain/);
  assert.match(html, /data-filter-frame/);
  assert.match(html, /data-filter-panel/);
  assert.match(html, /data-filter-chips/);
  assert.doesNotMatch(html, /data-filter-capability/);
  assert.match(html, /data-category-value="family:mtb"[^>]*>Mountain bikes<\/button>/);
  assert.match(html, /data-category-value="category:e-road"[^>]*>E-road<\/button>/);
  assert.match(html, /data-category-value="category:folding"[^>]*>Folding<\/button>/);
  assert.doesNotMatch(html, /handlebar:flat|Flat-bar bikes/);
  assert.match(html, /data-category-values="[^"]*\bfamily:mtb\b[^"]*\bcategory:e-road\b/);
  assert.doesNotMatch(html, /research queue/i);
  assert.match(html, /Triathlon/);
  assert.match(html, /role="tooltip"/);
  assert.equal((html.match(/role="tooltip"/g) ?? []).length, 1);
  assert.match(html, /data-tooltip-lines=/);
  assert.match(html, /aria-controls="shared-tooltip"/);
  assert.match(html, /role="status" aria-live="polite" id="copy-status"/);
  assert.match(html, /data-result-summary aria-live="polite"/);
  assert.doesNotMatch(html, /class="metric-sub price-state[^"]*">[^<]*conditional/);
  assert.match(html, /data-filter-category/);
  assert.match(html, /Category fact/);
  assert.match(html, /role="columnheader" aria-sort="none"><span class="catalog-heading-tools"><button class="catalog-sort-button" type="button" data-sort-heading="name"/);
  // The default "complete profiles first" order is not a single-column sort.
  assert.match(html, /role="columnheader" aria-sort="none"><span class="catalog-heading-tools"><button class="catalog-sort-button" type="button" data-sort-heading="price"/);
  assert.match(html, /<option value="published-asc">Complete profiles first<\/option><option value="price-asc">Price: low to high<\/option><option value="price-desc">Price: high to low<\/option><option value="name-asc">/);
  assert.doesNotMatch(html, /china-asc|Published first|data-china-sort/);
  assert.match(html, /data-sort-heading="capability" disabled/);
  assert.match(html, /data-sort-heading="tire"><span>Tires<\/span>/);
  assert.match(html, /data-filter-heading="tire"/);
  assert.match(html, /<option value="tire-desc">Tire clearance: high to low<\/option>/);
  assert.match(html, /<option value="price-asc">Price: low to high<\/option>/);
  assert.match(html, /<option value="name-desc">Bike: Z to A<\/option>/);
  assert.match(html, /<option value="capability-desc" disabled>Category fact: high to low<\/option>/);
  assert.doesNotMatch(html, /data-filter-style/);
  assert.doesNotMatch(html, /class="metric-sub">Claimed<\/span>/);
  assert.match(html, /data-id="scott-addict-rc-40"[^>]*data-family="road"/);
  assert.doesNotMatch(html, /data-id="scott-addict-rc-40"[^>]*data-tire-clearance-sort=/);
  assert.doesNotMatch(html, /Why Best value|class="pick-flag"|class="verify-flag"/);
  const valueModel = renderModel({ data, products, base: '' }, products.find((item) => item.variant.id === 'twitter-v3-wheeltop-eds'));
  assert.match(valueModel, /Wireless electronic hydraulic 2×12, carbon frame\/fork\/cockpit, and T47/);
  assert.match(valueModel, /<summary>Value assessment<\/summary>/);
});

test('model evidence labels claims, source roles, confidence, and inaccessible snapshots', () => {
  const product = products.find((item) => item.variant.id === 'twitter-v3-wheeltop-eds');
  const detail = renderModel({
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-09T00:00:00Z')
  }, product);
  assert.match(detail, /<dt>Weight<\/dt><dd>9\.9 kg/);
  assert.match(detail, /Each source is labelled by what it supports/);
  assert.match(detail, /Twitter Bike USA · Regional distributor storefront · Image/);
  assert.match(detail, /Regional US distributor source/);
  assert.match(detail, /Historical source annotation:/);
  assert.match(detail, /Image: High/);
  assert.match(detail, /Archived evidence; no public link/);
  assert.match(detail, /<section class="model-story"[^>]*>[\s\S]*>Overview<\/h2>/);
  assert.doesNotMatch(detail, /The short version/);
  assert.match(detail, /¥4,951/);
  assert.match(detail, /Best for:<\/strong> electronic shifting value, budget performance, drop-bar gravel/);
  assert.match(detail, /<section class="detail-section specification-snapshot"[^>]*>[\s\S]*Specifications and evidence/);
  assert.match(detail, /Ride and buying context/);
  assert.match(detail, /About Twitter/i);
  assert.doesNotMatch(detail, /Ask the seller in Chinese|seller-message/);
  assert.doesNotMatch(detail, /<details class="detail-panel"><summary>Frame, category facts/);

  const placeholderProduct = products.find((item) => item.variant.id === 'elves-falath-r7170');
  const placeholderDetail = renderModel({
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-09T00:00:00Z')
  }, placeholderProduct);
  assert.doesNotMatch(placeholderDetail, /Project-owned product image placeholders|Project-owned local asset/);

  const falath = products.find((item) => item.variant.id === 'elves-falath-r7170');
  const falathDetail = renderModel({
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-09T00:00:00Z')
  }, falath);
  assert.match(falathDetail, /<dt>Weight<\/dt><dd>1,080 g · frame/);
  assert.match(falathDetail, /<dt>Frame weight<\/dt><dd>1,080 g<\/dd>/);
});

test('only external manufacturer and shop product-page links receive the outbound action marker', () => {
  const baseProduct = products.find((item) => item.variant.id === 'lightcarbon-speedz-frameset');
  const sources = [
    ['test-manufacturer-product', 'manufacturer-product-page', 'https://maker.example/bike'],
    ['test-retailer-product', 'retailer-product-page', 'https://shop.example/bike'],
    ['test-manufacturer-policy', 'manufacturer-warranty-page', 'https://maker.example/warranty'],
    ['test-marketplace-snapshot', 'public-marketplace-listing-mirror', 'https://forum.example/listing'],
    ['test-internal-product', 'official-product-page', 'https://chinesebikes.xyz/models/internal/']
  ].map(([id, type, url]) => ({
    id,
    type,
    url,
    title: id,
    publisher: 'Test publisher',
    accessed_at: '2026-09-28',
    reliability: { identity: 'high', specification: 'high', price: 'high' }
  }));
  const context = {
    data: { ...data, sources: [...data.sources, ...sources] },
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-09-28T00:00:00Z')
  };
  const product = {
    ...baseProduct,
    variant: { ...baseProduct.variant, source_ids: sources.map((source) => source.id) },
    platform: { ...baseProduct.platform, source_ids: [] },
    prices: [],
    image: null
  };
  const detail = renderModel(context, product);

  assert.equal((detail.match(/data-analytics-action="product_outbound_click"/g) ?? []).length, 2);
  assert.match(detail, /href="https:\/\/maker\.example\/bike" rel="noreferrer" data-analytics-action="product_outbound_click"/);
  assert.match(detail, /href="https:\/\/shop\.example\/bike" rel="noreferrer" data-analytics-action="product_outbound_click"/);
  assert.match(detail, /href="https:\/\/maker\.example\/warranty" rel="noreferrer"/);
  assert.doesNotMatch(detail, /href="https:\/\/maker\.example\/warranty" rel="noreferrer" data-analytics-action/);
  assert.doesNotMatch(detail, /href="https:\/\/forum\.example\/listing" rel="noreferrer" data-analytics-action/);
  assert.doesNotMatch(detail, /href="https:\/\/chinesebikes\.xyz\/models\/internal\/" rel="noreferrer" data-analytics-action/);
});

test('primary navigation reflects catalog and exact model context', () => {
  assert.match(html, /data-nav-catalog aria-current="page"/);
  assert.doesNotMatch(html, /data-nav-framesets aria-current="page"/);

  const complete = products.find((item) => item.variant.kind === 'complete-bike');
  const frameset = products.find((item) => item.variant.kind === 'frameset');
  assert.ok(complete);
  assert.ok(frameset);
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-09T00:00:00Z')
  };
  const completeDetail = renderModel(context, complete);
  const framesetDetail = renderModel(context, frameset);
  // Frame builds are part of the one catalog; Framesets is no longer a header destination.
  assert.match(completeDetail, /data-nav-catalog aria-current="page"/);
  assert.match(framesetDetail, /data-nav-catalog aria-current="page"/);
  assert.doesNotMatch(framesetDetail, /data-nav-framesets/);
  assert.match(framesetDetail, /href="\/china-bike-research\/framesets\/">Framesets<\/a>/);
});

test('build configurator renders every required slot with sourced package data', () => {
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-27T00:00:00Z')
  };
  const builder = renderBikeBuilder(context);
  assert.match(builder, /data-nav-builder aria-current="page"/);
  assert.match(builder, /<h1>Configure a bike<\/h1>/);
  assert.equal((builder.match(/data-build-slot=/g) ?? []).length, 15);
  assert.match(builder, /data-build-base/);
  assert.match(builder, /Published catalog/);
  assert.doesNotMatch(builder, /<optgroup label="Research-stage catalog">/);
  assert.match(builder, /· research stage/);
  assert.match(builder, /Keep included bike part/);
  assert.match(builder, /data-build-base-price/);
  assert.match(builder, /data-build-base-weight/);
  assert.match(builder, /data-build-removed-weight/);
  assert.match(builder, /Shimano 105 Di2 R7170 large package/);
  assert.match(builder, /Elitewheels Marvel G35 wheelset/);
  assert.match(builder, /data-build-total-price/);
  assert.match(builder, /data-build-total-weight/);
  assert.match(builder, /data-build-custom-price-field/);
  assert.match(builder, /data-build-custom-weight-field/);
  assert.doesNotMatch(builder, /<a data-build-part-source/);
  assert.match(builder, /href="\/china-bike-research\/methodology\/" data-build-part-source hidden/);
  assert.match(builder, /"covers":\["brakes","crankset","cassette","chain"\]/);
  assert.match(builder, /"priceCny":4150/);
  assert.match(builder, /"weightG":1460/);
  assert.match(builder, /"schemaVersion":2/);
  assert.match(builder, /"kind":"complete-bike"/);
  assert.match(builder, /"kind":"frameset"/);
  assert.match(builder, /"id":"candidate-quick-pro-er-one"[\s\S]*?"priceLow":null,"priceHigh":null,"priceNote":"Converted reference price excluded; enter the exact purchase price\."/);
  assert.match(builder, /"id":"candidate-missing-china-price-canyon-grail"[\s\S]*?"priceLow":null,"priceHigh":null,"priceNote":"Reference or incomplete purchase price excluded; enter the exact purchase quote\."/);
  assert.match(builder, /https:\/\/www\.elite-wheels\.com\/wp-content\/uploads/);
  assert.doesNotMatch(builder, /No attributable mainland price|No exact mainland package captured/);
});

test('buyer controls preserve strict budget, category evidence, and valid row semantics', () => {
  // Budgets use the dated domestic China price, not the newer foreign conversion.
  assert.match(html, /data-id="sava-gelaro-s4-grx400"[^>]*data-price-filter="7999"/);
  assert.match(html, /Triathlon storage \/ boxes: Unknown\./);
  assert.ok(catalogSummaries({ data, products }).some((item) => item.internalFrameStorage === 'No'));
  assert.doesNotMatch(html, /<article class="catalog-row" role="row"/);
  assert.match(html, /<div class="catalog-row" role="row"/);
  assert.match(html, /<div class="compare-toggle" role="cell"><label>/);
  assert.doesNotMatch(html, /<label class="compare-toggle" role="cell">/);
  assert.match(html, /data-filter-notice/);
});

test('brand names expose an exact, base-safe catalog filter', () => {
  assert.match(html, /data-brand="twitter"/);
  assert.match(html, /data-brand-filter="twitter" aria-pressed="false" aria-label="Twitter · 骓特 — filter catalog to this brand"/);
  assert.match(html, /data-result-context/);
  assert.match(html, /class="product-image-link" href="\/china-bike-research\/models\/twitter-v3-wheeltop-eds\/" data-model-link>/);
  const photoLinks = [...html.matchAll(/<a class="product-image-link"[^>]*>([\s\S]*?)<\/a>/g)];
  assert.ok(photoLinks.length > 0);
  assert.ok(photoLinks.every(([, image]) => /alt="[^"]+"/.test(image)), 'photo links keep an accessible name from the image description');
  assert.match(html, /<input type="hidden" name="category" value="" data-filter-category/);
  assert.match(html, /data-id="candidate-basso-venta-disc" data-brand="candidate-brand-basso"/);
  assert.match(html, /data-brand-filter="candidate-brand-basso" aria-pressed="false" aria-label="BASSO — filter catalog to this brand"/);

  const product = products.find((item) => item.variant.id === 'twitter-v3-wheeltop-eds');
  const detail = renderModel({
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-07T00:00:00Z')
  }, product);
  assert.match(detail, /href="\/china-bike-research\/?\?brand=twitter#catalog"/);
  assert.match(detail, /aria-label="Twitter · 骓特 — show this brand in the catalog"/);
  assert.match(detail, /data-catalog-back/);
  assert.match(detail, /data-add-to-comparison/);
  assert.match(detail, /data-model-compare-link/);
});

test('model pages pair visible breadcrumbs with source and freshness context', () => {
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-28T00:00:00Z')
  };
  const product = products.find((item) => item.variant.id === 'twitter-v3-wheeltop-eds');
  const detail = renderModel(context, product);
  assert.match(detail, /<nav class="breadcrumbs" aria-label="Breadcrumb">[\s\S]*Complete bikes[\s\S]*aria-current="page"/);
  assert.match(detail, /data-catalog-back/);
  assert.match(detail, /Evidence reviewed through <time datetime="2026-09-25">/);
  assert.match(detail, /href="#source-records">View sources<\/a>/);
  assert.match(detail, /<details class="detail-panel" id="source-records" open>/);
});

test('methodology visibly supports its Dataset and DataDownload schema', () => {
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    siteLastmod: '2026-08-28',
    now: new Date('2026-08-28T00:00:00Z')
  };
  const methodology = renderMethodology(context);
  assert.match(methodology, /Dataset and freshness/);
  assert.match(methodology, /href="\/china-bike-research\/data\/catalog\.json">Catalog JSON<\/a>/);
  assert.match(methodology, /href="\/china-bike-research\/data\/catalog\.csv">Catalog CSV<\/a>/);
  assert.match(methodology, /"@type":"Dataset"/);
  assert.match(methodology, /"creator":\{"@type":"Organization","name":"Chinese Bikes"/);
  assert.match(methodology, /"@type":"DataDownload"/);
  assert.doesNotMatch(methodology, /"offers"|"@type":"Product"/);
});

test('frameset totals expose the reviewed default as a buyer-editable calculator', () => {
  assert.match(html, /id="frameset-build-preset" data-frameset-build-preset/);
  assert.match(html, /105 Di2 plan · \+¥6,000/);
  assert.match(html, /Ultegra Di2 plan · \+¥7,900/);
  assert.match(html, /value="magene-qed" data-build-manual="true" data-groupset-id="magene-qed-pes">Magene QED plan · enter allowance/);
  assert.match(html, /value="wheeltop-eds-tx-2x" data-build-manual="true" data-groupset-id="wheeltop-eds-tx">WheelTop EDS TX 2× plan · enter allowance/);
  assert.match(html, /Custom allowance/);
  assert.match(html, /data-build-custom hidden/);
  assert.match(html, /id="frameset-build-allowance" type="number" min="0" max="100000" step="500"[^>]*value="6000"[^>]*data-frameset-build-allowance/);
  assert.match(html, /parts already included in that package remain in the frame price/);
  assert.match(html, /No attributable mainland China consumer price is recorded/);
  assert.match(html, /cover a 2× hydraulic shift-and-brake kit, not every remaining complete-build part/);
  assert.match(html, /data-id="lightcarbon-lcg071s-pro-frameset"[^>]*data-frame-price-low="3987" data-frame-price-high="3987"/);
  assert.match(html, /<button[^>]*data-calculated-price[^>]*>Est\. ¥9,987<\/button>/);
  assert.match(html, /data-price-details="\d{4}-\d{2}-\d{2}"/);
  assert.match(html, /data-stage="candidate"[^>]*data-id="candidate-hi-light-g0"[^>]*data-price-sort="[^"]+" data-price-filter="[^"]+" data-frame-price-low="[^"]+" data-frame-price-high="[^"]+"/);
  assert.match(html, /data-id="candidate-hi-light-g0"[\s\S]*?<button[^>]*data-calculated-price[^>]*>Est\. ¥[\d,]+(?:–[\d,]+)?<\/button><\/div>/);
  assert.doesNotMatch(html, /data-copy-catalog-view|>Copy view</);

  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-17T00:00:00Z')
  };
  const publishedFrame = products.find((item) => item.variant.id === 'lightcarbon-lcg071s-pro-frameset');
  const publishedDetail = renderModel(context, publishedFrame);
  assert.match(publishedDetail, /data-model-frame-price-low="3987" data-model-frame-price-high="3987" data-model-default-allowance="6000"/);
  assert.match(publishedDetail, /data-model-calculated-price>Est\. ¥9,987/);
  assert.match(publishedDetail, /data-evidence-href="#source-records"/);
  assert.match(publishedDetail, /Included package/);
  assert.doesNotMatch(publishedDetail, /<dt>Drivetrain<\/dt>/);

  const candidateFrame = candidates.find((entry) => entry.candidate.id === 'quick-pro-tr-one');
  const candidateDetail = renderCandidateModel(context, candidateFrame);
  assert.match(candidateDetail, /data-model-frame-price-low="21800" data-model-frame-price-high="21800" data-model-default-allowance="6000"/);
  assert.match(candidateDetail, /data-model-calculated-price>Est\. ¥27,800/);
  assert.match(candidateDetail, /Frame package ¥21,800/);
  assert.match(candidateDetail, /recorded ¥21,800 frame package price/);
  assert.doesNotMatch(candidateDetail, /<dt>Drivetrain<\/dt>/);
  assert.doesNotMatch(html, /Electronic 2×12 standard build/);

  const buildSource = fs.readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
  assert.match(buildSource, /variant\.drivetrain \? `\$\{variant\.drivetrain\.brand\}/);
  assert.doesNotMatch(buildSource, /frameset_build_assumption\.drivetrain_label/);
});

test('failed PARDUS duplicate images stay out of every buyer-facing surface', () => {
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-24T00:00:00Z')
  };
  for (const id of ['pardus-spark-sport-pes', 'pardus-spark']) {
    const entry = candidates.find((item) => item.candidate.id === id);
    const detail = renderCandidateModel(context, entry);
    if (id === 'pardus-spark') assert.match(detail, /class="model-grid has-no-image"/);
    else assert.match(detail, /assets\/images\/sourced\/xhs\/pardus-spark-sport-pes\//);
    assert.doesNotMatch(detail, /c048095/);
  }
  assert.doesNotMatch(html, /c048095/);
  assert.doesNotMatch(renderImageSources(context), /c048095/);
});

test('buyer-facing copy does not expose internal evidence or status enums', () => {
  const product = products.find((item) => item.variant.id === 'sava-a7l-r7100');
  const detail = renderModel({
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-09T00:00:00Z')
  }, product);
  assert.match(detail, /current exact model manufacturer evidence/);
  assert.match(detail, /Promotion-conditional price/);
  assert.match(detail, /Specifications and evidence/);
  assert.match(detail, /700C carbon wheelset, 24H/);
  assert.match(detail, /5 sizes \(440–560\) · stack 509\.3–580\.5 mm · reach 358\.4–390\.3 mm/);
  assert.match(detail, /Current exact SAVA global-direct storefront lists US\$1,699.*add-to-cart/);
  assert.doesNotMatch(detail, /snapshot-classification|from_image|medium-low|promotion-conditional/);
});

test('model videos embed YouTube directly without autoplay and retain disclosure', () => {
  const product = products.find((item) => item.variant.id === 'yoeleo-altera-g21-frameset');
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-09T00:00:00Z')
  };
  const detail = renderModel(context, product);
  assert.match(detail, /<h2 id="video-context-title">Videos<\/h2>/);
  assert.doesNotMatch(detail, /Selected video context|Useful for seeing the bike|video commentary does not verify/);
  assert.match(detail, /<iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/jmdVakRJPQ8\?rel=0"/);
  assert.match(detail, /loading="lazy" referrerpolicy="strict-origin-when-cross-origin"/);
  assert.match(detail, /Retailer-linked/);
  assert.match(detail, /Disclosure basis/);
  assert.match(detail, /href="https:\/\/www\.youtube\.com\/watch\?v=jmdVakRJPQ8" rel="noreferrer"/);
  assert.doesNotMatch(detail, /autoplay=1|data-load-video|Play video/);
  // The project link-preview clip supersedes YouTube's player metadata; the evidence players above stay.
  assert.match(detail, /<meta property="og:video" content="https:\/\/example\.github\.io\/china-bike-research\/assets\/social-video\/(?:photo|brand)-[0-9a-f]{16}\.mp4"><meta property="og:video:secure_url" content="[^"]+"><meta property="og:video:type" content="video\/mp4"><meta property="og:video:width" content="960"><meta property="og:video:height" content="540">/);
  assert.equal(detail.match(/property="og:video"/g).length, 1);
  assert.match(detail, /property="og:image" content="https:\/\/example\.github\.io\//);
  assert.doesNotMatch(detail, /og:video:type" content="text\/html"|youtube\.com\/embed\/|twitter:player/);
  const withoutVideo = products.find((item) => !item.videos.some((video) => video.provider === 'youtube'));
  assert.equal(renderModel(context, withoutVideo).match(/property="og:video" content="[^"]+\.mp4"/g).length, 1);

  const privacy = renderPrivacy(context);
  assert.match(privacy, /compare_open when the comparison opens/);
  assert.match(privacy, /product_outbound_click/);
  assert.match(privacy, /Comparison events exclude selected bike lists/);
  assert.match(privacy, /Product-link actions include only public catalog context, without visitor details/);
  assert.match(privacy, /Umami live data remains for 13 months; encrypted backups expire within 30 days of live removal/);
  assert.match(privacy, /page_engaged once when a page stays visible for at least 10 seconds/);
  assert.match(privacy, /page_visible once when a page has been visible for a total of 10 seconds/);
  assert.match(privacy, /Neither signal identifies a verified human/);
  assert.match(privacy, /These technical counts carry no visitor or page details/);
  assert.match(privacy, /page request itself does not create a Google identifier or send a site_open event/);
  assert.match(privacy, /both stored identifiers exist/);
  assert.match(privacy, /Do Not Track, Global Privacy Control, and the opt-out below suppress both analytics streams/);
  assert.match(privacy, /Opt out of optional analytics/);

  const localizedPrivacy = renderPrivacy({ ...context, locale: 'zh-Hans' });
  assert.match(localizedPrivacy, /可选流量分析/);
  assert.match(localizedPrivacy, /compare_open/);
  assert.match(localizedPrivacy, /实时数据保留 13 个月/);
  assert.match(localizedPrivacy, /页面请求本身不会创建 Google 标识或发送 site_open/);
  assert.match(localizedPrivacy, /两种信号都不代表已验证的真人/);
  assert.match(localizedPrivacy, /这些技术计数不包含访问者或页面信息/);
  assert.match(localizedPrivacy, /外部媒体/);

  const client = fs.readFileSync(new URL('../assets/site.js', import.meta.url), 'utf8');
  const openComparison = client.slice(client.indexOf('function openComparison('), client.indexOf('function closeComparison('));
  assert.match(openComparison, /const wasOpen = !comparePanel\.hidden/);
  assert.match(openComparison, /if \(!wasOpen\) sendComparisonOpenedEvent\(\{ comparisonCount: selection.length \}\)/);
  assert.match(privacy, /youtube-nocookie\.com/);
  assert.match(privacy, /may contact YouTube when the page loads or the video comes into view/);
  assert.doesNotMatch(privacy, /XHS video links|only after you choose to load/);

  const imagePolicy = renderImagePolicy(context);
  assert.match(imagePolicy, /Displayed product photos are optimized copies served by this site/);
  assert.match(imagePolicy, /When a source image is unavailable or its model cannot be verified, we leave the photo out/);
  assert.match(imagePolicy, /Browse image sources and credits/);
});

test('candidate videos render as disclosed context with timestamp links', () => {
  const entry = candidates.find((item) => item.candidate.id === 'quick-pro-ur-one');
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-09-02T00:00:00Z')
  };
  const detail = renderCandidateModel(context, entry);
  assert.match(detail, /Quick Pro UR One Full Review in Beijing, China/);
  assert.match(detail, /<h2 id="video-context-title">Videos<\/h2>/);
  assert.match(detail, /Publication review/);
  assert.match(detail, /Specifications · 1:06/);
  assert.match(detail, /watch\?v=rRZ6zr4hfow&amp;t=66/);
  assert.match(detail, /<iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/rRZ6zr4hfow\?rel=0"/);
  assert.doesNotMatch(detail, /data-load-video|autoplay=1/);
  assert.match(detail, /<meta property="og:video" content="[^"]+\/assets\/social-video\/(?:photo|brand)-[0-9a-f]{16}\.mp4">/);
  assert.doesNotMatch(detail, /youtube\.com\/embed\//);
});

test('XHS video records do not display as links or an empty video section', () => {
  const ad9 = candidates.find((item) => item.candidate.id === 'xlab-ad9');
  const entry = { ...ad9, videos: ad9.videos.filter((video) => video.provider === 'xhs') };
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-09-29T00:00:00Z')
  };
  const detail = renderCandidateModel(context, entry);
  assert.doesNotMatch(detail, /class="video-context"|class="video-external-list"|og:video:type" content="text\/html"/);
  assert.doesNotMatch(detail, /href="https:\/\/www\.xiaohongshu\.com\/explore\/69e8f860000000001f001363"/);

  const youtube = data.videos.find((video) => video.provider === 'youtube');
  const mixed = renderCandidateModel(context, { ...entry, videos: [youtube, ...entry.videos] });
  assert.match(mixed, /<iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\//);
  assert.doesNotMatch(mixed, /class="video-external-list"|href="https:\/\/www\.xiaohongshu\.com\/explore\/69e8f860000000001f001363"/);
});


test('generic project copy is category-neutral', () => {
  assert.match(html, /<h1>Compare Chinese bikes and frame builds<\/h1>/);
  assert.doesNotMatch(html, /Carbon bikes in China|Gravel and all-road bikes|above 38 mm/i);
});

test('groupsets are one image-led comparison and a primary destination', () => {
  const context = {
    data,
    products,
    base: '/china-bike-research',
    repositoryUrl: 'https://github.com/example/china-bike-research',
    siteUrl: 'https://example.github.io',
    now: new Date('2026-08-25T00:00:00Z')
  };
  const reference = renderElectronicGroupsets(context);
  const styles = fs.readFileSync(new URL('../assets/site.css', import.meta.url), 'utf8');
  const wheelTopProduct = products.find((item) => item.variant.id === 'twitter-cyclone-electronic');
  const detail = renderModel(context, wheelTopProduct);
  assert.match(reference, /<h1>Electronic groupsets in China<\/h1>/);
  assert.equal((reference.match(/<table\b/g) ?? []).length, 1);
  assert.equal((reference.match(/data-groupset-entry/g) ?? []).length, 13);
  assert.equal((reference.match(/class="groupset-row-details"/g) ?? []).length, 13);
  assert.equal((reference.match(/class="product-image groupset-image"/g) ?? []).length, 10);
  assert.match(reference, /<th>System<\/th><th>Use<\/th><th>Gearing<\/th><th>Setup<\/th><th>Price<\/th>/);
  assert.match(reference, /L-TWOO · 蓝图/);
  assert.match(reference, /WheelTop · Wheeltop/);
  assert.match(reference, /QED disc-brake core groupset 1,150 g; PES disc-brake core groupset 1,250 g/);
  assert.match(reference, /¥4,150–4,200/);
  // Different seller packages are never spanned as one range; the lowest is named.
  assert.doesNotMatch(reference, /¥2,369–3,219/);
  assert.match(reference, /from ¥2,369<\/strong><span>1× alloy-lever kit · Taobao options · 2026-08-24<\/span><span class="groupset-official-price">from €549 official store · cable-brake shift groupset · 2026-10-26<\/span>/);
  assert.match(reference, /¥3,480/);
  assert.match(reference, /SRAM GX AXS \/ Eagle Transmission/);
  assert.match(reference, /L-TWOO eRX-TT/);
  assert.match(reference, /Package & weight/);
  assert.match(reference, /How package labels and prices are normalized/);
  assert.match(reference, /referrerpolicy="no-referrer" data-product-image/);
  assert.match(reference, /id="shimano-grx-rx825"[\s\S]*?<td data-label="Price" data-column="price"><span class="groupset-no-price">No dated price<\/span><\/td>/);
  assert.doesNotMatch(reference, /No attributable mainland price|No exact mainland package captured|current maximum unresolved/);
  assert.doesNotMatch(reference, /Established benchmarks|Chinese electronic systems|Other disciplines/);
  assert.doesNotMatch(reference, /groupset-details|<article class="groupset-detail"/);
  assert.doesNotMatch(reference, /href="undefined"/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.groupset-summary-row \{ display: grid/);
  assert.match(styles, /\.groupset-summary-row > td::before \{ content: attr\(data-label\)/);
  assert.match(styles, /\.groupset-summary-row > td:empty \{ display: none/);
  assert.match(detail, /href="\/china-bike-research\/electronic-shifting\/">system reference<\/a>/);
  assert.match(html, /<footer[\s\S]*?href="\/china-bike-research\/electronic-shifting\/">Groupsets<\/a>/);
  const primaryNav = html.match(/<nav id="main-nav"[\s\S]*?<\/nav>/)?.[0] ?? '';
  assert.equal((primaryNav.match(/<a\b/g) ?? []).length, 6);
  assert.match(primaryNav, /href="\/china-bike-research\/geometry\/"/);
  assert.match(primaryNav, />Blog<\/a>/);
  // Groupsets and wheels are components, not tools; both groups stay inline until the row is crowded.
  assert.match(primaryNav, />Bikes<\/a>[\s\S]*data-nav-group="components"[\s\S]*data-nav-group-toggle hidden>Components<\/button>[\s\S]*>Groupsets<\/a>[\s\S]*>Carbon wheels<\/span>[\s\S]*data-nav-group="tools"[\s\S]*data-nav-group-toggle hidden>Tools<\/button>[\s\S]*>Geometry<\/a>[\s\S]*>Build planner<\/span>[\s\S]*>Blog<\/a>/);
  assert.match(primaryNav, /<span class="nav-short" aria-hidden="true">Planner<\/span>/);
  assert.doesNotMatch(primaryNav, /Methodology|GitHub/);
  const referenceNav = reference.match(/<nav id="main-nav"[\s\S]*?<\/nav>/)?.[0] ?? '';
  assert.match(referenceNav, /data-nav-groupsets aria-current="page"/);
});

test('Arden candidate keeps drivetrain clearance in catalog, profile and planner', () => {
  const entry = candidates.find((item) => item.candidate.id === 'tavelo-arden');
  const context = { data, products, base: '/china-bike-research', repositoryUrl: 'https://github.com/p0s/china-bike-research' };
  const row = html.match(/<div class="catalog-row is-candidate"[^>]*data-id="candidate-tavelo-arden"[\s\S]*?(?=<div class="catalog-row|<\/div>\s*<\/div>\s*<\/section>)/)?.[0];
  assert.ok(row);
  assert.match(row, /38 mm 1×<\/span><span class="metric-sub">34 mm 2×<\/span>/);
  assert.match(row, /data-tire-clearance-sort="38"/);
  const profile = renderCandidateModel(context, entry);
  assert.match(profile, /38\/34 mm \(1×\/2×\)/);
  assert.doesNotMatch(profile, /\[object Object\]|38 mm tire clearance/);
  const builder = renderBikeBuilder(context);
  const payload = JSON.parse(builder.match(/id="build-configurator-data">([\s\S]*?)<\/script>/)[1]);
  const base = payload.bases.find((item) => item.id === entry.id);
  assert.deepEqual(base.tireClearanceByDrivetrain, { single: 38, double: 34 });
  assert.equal(base.tireClearanceLabel, '38/34 mm (1×/2×)');
});


test('model decision panel links the exact purchase route instead of a broad availability claim', () => {
  const product = products.find(item => item.variant.id === 'twitter-v3-wheeltop-eds');
  const detail = renderModel(homeContext, product);
  const panel = detail.match(/<dl class="model-facts">[\s\S]*?<\/dl>/)[0];
  assert.match(panel, /Where to buy<\/dt><dd><a href="#model-purchase-route">Purchase route and checks<\/a>/);
  assert.match(detail, /id="model-purchase-route">The official US store/);
  assert.match(detail, /Mainland(?: China)? stock and checkout remain unverified/);
  assert.doesNotMatch(panel, /Domestic sales in mainland China/);
  assert.doesNotMatch(detail, /unpublished\. frame;/);
});


test('catalog price dates stay in accessible evidence and not repeated in the visible subline', () => {
  const sublines = [...html.matchAll(/class="metric-sub price-state[^"]*">([^<]*)</g)];
  assert.ok(sublines.length > 0);
  assert.ok(sublines.every(([, text]) => !/\d{4}-\d{2}-\d{2}/.test(text)));
  assert.match(html, /data-price-details="2026-08-08"/);
  const priced = catalogSummaries({ data, products }).filter((item) => item.priceDate);
  assert.ok(priced.length > 20);
  assert.ok(priced.every((item) => priceEvidenceLines(item).join(' ').includes(item.priceDate)));
});


test('compact model presentation retains complete source observations and editorial caveats', () => {
  const escape = (value) => clarifyMainlandInDisplayHtml(escapeHtml(value));
  for (const product of products) {
    const detail = renderModel({ data, products, base: '' }, product);
    for (const report of product.platform.tire_clearance?.field_reports ?? []) {
      assert.ok(detail.includes(escape(report.summary)), `${product.variant.id}: complete field observation`);
      assert.ok(detail.includes(escape(report.configuration)), `${product.variant.id}: tested setup`);
    }
    for (const caveat of product.variant.editorial.caveats ?? []) {
      assert.ok(detail.includes(escape(String(caveat).trim().replace(/[.;]+$/, ''))), `${product.variant.id}: buying caveat`);
    }
    for (const price of product.prices) {
      if (price.conditions) assert.ok(detail.includes(escape(price.conditions)), `${product.variant.id}: price conditions`);
    }
    assert.match(detail, /id="frame-evidence"/);
    if (product.platform.tire_clearance) assert.match(detail, /id="tire-clearance-evidence"/);
  }
});
