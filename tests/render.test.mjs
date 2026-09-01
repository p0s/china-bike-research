import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { renderHome, renderModel, renderCandidateModel, renderBikeBuilder, renderElectronicGroupsets, renderImagePolicy, renderImageSources, renderMethodology, renderPrivacy } from '../src/render.mjs';

const data = loadDataset();
const products = joinProducts(data);
const candidates = joinCatalogCandidates(data);
const html = renderHome({
  data,
  products,
  base: '/china-bike-research',
  repositoryUrl: 'https://github.com/example/china-bike-research',
  siteUrl: 'https://example.github.io',
  siteLastmod: '2026-08-28',
  now: new Date('2026-08-07T00:00:00Z')
});

test('homepage is the unified bike and frame-build comparison', () => {
  assert.match(html, /data-catalog-root/);
  assert.match(html, /data-inline-compare/);
  assert.match(html, /Frame estimate/);
  assert.match(html, /Est\. ¥9,200–10,900/);
  assert.match(html, /Full-bike price/);
  assert.match(html, /placeholder="Search model, use or drivetrain"/);
  assert.match(html, /class="product-fit"><span>Best for<\/span>/);
  assert.match(html, /Select two to ten bikes to compare/);
  assert.match(html, /type="application\/ld\+json">[\s\S]*"@type":"WebSite"/);
  assert.doesNotMatch(html, /"itemListElement"/);
});

test('homepage exposes crawlable evidence-led discovery without duplicating the catalog', () => {
  assert.match(html, /Dataset updated <time datetime="2026-08-28">2026-08-28<\/time>; catalog-wide review <time datetime="2026-08-08">2026-08-08<\/time>/);
  assert.doesNotMatch(html.match(/<section class="catalog-intro">[\s\S]*?<\/section>/)?.[0] ?? '', /Dataset updated/);
  assert.match(html, /China Bikes compares Chinese road, gravel, and carbon-bike options using dated China-market prices/);
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

test('theme control supports system, light, and dark without delaying first paint', () => {
  const client = fs.readFileSync(new URL('../assets/site.js', import.meta.url), 'utf8');
  const styles = fs.readFileSync(new URL('../assets/site.css', import.meta.url), 'utf8');
  assert.match(html, /data-theme-control/);
  assert.match(client, /const themeModes = \['system', 'light', 'dark'\]/);
  assert.match(client, /localStorage\.setItem\(themeStorageKey, selected\)/);
  assert.match(client, /delete document\.documentElement\.dataset\.theme/);
  assert.match(styles, /:root\[data-theme="dark"\]/);
  assert.match(styles, /@media \(prefers-color-scheme: dark\)[\s\S]*:root:not\(\[data-theme\]\)/);
  assert.match(styles, /--image-surface: #e6eae4/);
});

test('homepage offers compact criteria-led comparison starting points', () => {
  assert.match(html, /Top bikes, with the criteria shown/);
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
  assert.match(html, /compare=incolor-speedster-sr-frameset%2Ccandidate-lightcarbon-lcr018-d%2Ccandidate-tavelo-arden#compare/);
  assert.match(html, /Research<\/span>/);
});

test('homepage comparison payload keeps frameset pricing dynamic without serializing inactive fields', () => {
  const payload = JSON.parse(html.match(/<script type="application\/json" id="catalog-data">([^<]+)<\/script>/)?.[1] ?? '[]');
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
  assert.doesNotMatch(html, />Guides</i);
  assert.doesNotMatch(html, />Watchlist</i);
  assert.doesNotMatch(html, /href="[^"]*\/compare\//i);
  assert.doesNotMatch(html, /href="[^"]*\/guides\//i);
});

test('candidate leads share the catalog without a separate research queue', () => {
  assert.match(html, /PARDUS 瑞豹 Spark Sport PES/);
  assert.match(html, /Winspace SLC3\.0 frameset/);
  assert.match(html, /data-stage="candidate" data-default-visible="true" data-id="candidate-pardus-spark-sport-pes"/);
  assert.match(html, /data-id="candidate-missing-china-price-winspace-slc3"/);
  assert.match(html, /data-id="candidate-xds-gt350"[\s\S]*?<span class="product-image">[\s\S]*?<img[^>]+alt="XDS GT350 gravel bike shown from the drive side"[^>]+referrerpolicy="no-referrer"/);
  assert.match(html, /<span class="metric-main">¥8,597<\/span><span class="metric-sub price-state">Observed · 2026-08-08<\/span>/);
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
  assert.match(quickDetail, /Est\. ¥33,900 is a dated currency conversion/);
  assert.match(quickDetail, /Shimano Ultegra R8170 Di2 2×12/);
  assert.match(quickDetail, /Buying context/);
  assert.match(quickDetail, /About Quick/);
  assert.match(quickDetail, /Price record and sources/);
  assert.match(quickDetail, /property="og:type" content="product"/);
  assert.match(quickDetail, /"@type":"Product"/);
  assert.doesNotMatch(quickDetail, /"offers":/);
  assert.doesNotMatch(quickDetail, /Ask the seller in Chinese|Seller\/authenticity|Current seller/);

  const sparse = candidates.find((entry) => entry.candidate.id === 'airwolf-yfr068');
  const sparseDetail = renderCandidateModel(context, sparse);
  assert.match(sparseDetail, /Price not verified/);
  assert.match(sparseDetail, /Airwolf YFR068 \/ A5/);
  assert.match(sparseDetail, /40 mm/);
  assert.match(sparseDetail, /Frame weight basis/);
  assert.doesNotMatch(sparseDetail, /Frame_weight_basis/);
  assert.match(sparseDetail, /Identity not confirmed/);
  assert.match(sparseDetail, /property="og:type" content="website"/);
  assert.doesNotMatch(sparseDetail, /"@type":"Product"/);

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
  assert.match(detail, /¥3,387 complete-bike lead under review/);
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

test('candidates without a recorded category show an honest unknown instead of undefined', () => {
  const entry = candidates.find((item) => item.candidate.id === 'carbonda-cfr707');
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
  assert.equal((quickDetail.match(/data-gallery-thumb/g) ?? []).length, 4);
  assert.match(quickDetail, /Ice Crack Silver/);
  assert.match(quickDetail, /<dt>Frame weight<\/dt><dd>919 g<\/dd>/);
  assert.match(quickDetail, /<dt>Fork weight<\/dt><dd>459 g<\/dd>/);
  assert.match(quickDetail, /<dt>Seatpost weight<\/dt><dd>169 g<\/dd>/);
  assert.match(quickDetail, /5 sizes \(XS\/426–XL\/546\) · stack 524–599 mm · reach 370–405 mm/);
  assert.match(quickDetail, /property="og:type" content="product"/);
  assert.match(quickDetail, /"name":"Maximum tire clearance"/);
  assert.doesNotMatch(quickDetail, /"offers":/);

  const incolor = products.find((entry) => entry.variant.id === 'incolor-voyager-frameset');
  const incolorDetail = renderModel(context, incolor);
  assert.equal((incolorDetail.match(/data-gallery-thumb/g) ?? []).length, 6);
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
  assert.match(srDetail, /<dt>Weight<\/dt><dd>785 g frame<\/dd>/);
  assert.match(srDetail, /<dt>Weight basis<\/dt><dd>Size 54, unpainted, excluding paint and metal hardware<\/dd>/);
  assert.match(srDetail, /<dt>Frame material<\/dt><dd>M60 \+ T800 carbon<\/dd>/);
  assert.match(srPlusDetail, /<dt>Weight<\/dt><dd>720 g frame<\/dd>/);
  assert.match(srPlusDetail, /<dt>Frame material<\/dt><dd>80T pitch-based \+ T1100 carbon<\/dd>/);
  assert.match(srPlusDetail, />720 g frame with 38 mm tire clearance<\/h2>/);
  assert.doesNotMatch(srPlusDetail, /frame frame/);
  assert.match(html, /data-id="incolor-speedster-sr-frameset"[\s\S]*?785 g frame/);
  assert.match(html, /data-id="incolor-speedster-sr-plus-frameset"[\s\S]*?720 g frame/);
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
  assert.match(gx600Detail, /<dt>Drivetrain build<\/dt><dd>Crank: Yuyong 42T aluminum integrated-axle crank · Cassette: HR 12-speed 11–45T<\/dd>/);
  assert.match(gx600Detail, /<dt>Brakes<\/dt><dd>Hydraulic disc · Calipers: Tektro hydraulic<\/dd>/);

  const gx700 = products.find((entry) => entry.variant.id === 'camp-gx700-grx820');
  const gx700Detail = renderModel(context, gx700);
  assert.match(gx700Detail, /45 mm stock/);
  assert.match(gx700Detail, /Shifters: ST-RX820 · RD: RD-RX822 · Crank: FC-RX610 36T · Cassette: CS-M6100 12-speed 10–51T/);
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
  assert.match(detail, /The dated price record below is historical only/);
  assert.match(detail, /¥3,991[\s\S]*Historical listing option · Historical price for a superseded model/);
  assert.doesNotMatch(detail, /The recorded complete-bike price is ¥3,991/);
});

test('candidate rows expose verified complete-bike facts and honest FX estimates', () => {
  assert.match(html, /data-id="candidate-quick-pro-er-one"[^>]*data-type="complete-bike"[^>]*data-price-sort="33900"[^>]*data-price-filter="33900"/);
  assert.match(html, /Quick Pro ER:ONE[\s\S]*?Est\. ¥33,900[\s\S]*?Official FX estimate · 2026-08-17[\s\S]*?Shimano Ultegra R8170 Di2 2×12[\s\S]*?7\.1 kg[\s\S]*?T1100\/M65 monocoque carbon/);
  assert.match(html, /data-id="candidate-missing-china-price-quick-pro-xr-one"[^>]*data-tire-clearance-sort="50"/);
  assert.match(html, /Quick Pro XR:ONE GRX Di2 1×12[\s\S]*?<div class="catalog-cell tire-clearance-cell" role="cell">50 mm<\/div>/);
  assert.match(html, /data-id="candidate-missing-china-price-x-lab-xds-gt8"[^>]*data-price-sort="21980"[^>]*data-tire-clearance-sort="55"/);
  assert.match(html, /X-LAB GT8 GRX Di2[\s\S]*?¥21,980[\s\S]*?Observed · 2026-08-21[\s\S]*?8\.8 kg[\s\S]*?Toray T800 carbon/);
  assert.match(html, /data-id="candidate-specialized-roubaix-sl8-sport-105"[^>]*data-price-sort="23763"[^>]*data-tire-clearance-sort="40"/);
  assert.match(html, /Specialized 2025 Roubaix SL8 Sport Shimano 105[\s\S]*?Est\. ¥23,763[\s\S]*?Shimano 105 R7100\/R7120 mechanical 2×12[\s\S]*?9\.1 kg[\s\S]*?FACT 10R carbon/);
  assert.match(html, /data-id="candidate-missing-china-price-winspace-slc3"[^>]*data-type="frameset"[^>]*data-frame-price-low="9800"[^>]*data-frame-price-high="9800"/);
  assert.match(html, /Winspace SLC3\.0 frameset[\s\S]*?Est\. ¥15,800[\s\S]*?Frame ¥9,800 · Official FX estimate/);
  assert.match(html, /data-id="candidate-missing-china-price-giant-defy-advanced"[^>]*data-type="complete-bike"[^>]*data-price-sort="14800"[^>]*data-price-filter="14800"/);
  assert.match(html, /Giant Defy Advanced 2[\s\S]*?¥14,800[\s\S]*?Official · 2026-08-17[\s\S]*?38 mm/);
  assert.match(html, /data-id="candidate-missing-china-price-giant-defy-advanced"[^>]*data-tire-clearance-sort="38"/);
  assert.match(html, /data-id="candidate-missing-china-price-trek-domane"[^>]*data-tire-clearance-sort="38"/);
  assert.match(html, /data-id="candidate-missing-china-price-specialized-roubaix-sl8"[^>]*data-tire-clearance-sort="40"/);
  assert.match(html, /data-id="candidate-missing-china-price-merida-scultura"[^>]*data-type="complete-bike"[^>]*data-price-sort="16800"[^>]*data-price-filter="16800"/);
  assert.match(html, /Merida SCULTURA 6000 25[\s\S]*?¥16,800[\s\S]*?Shimano 105 Di2 2×12[\s\S]*?8\.2 kg/);
  assert.match(html, /Merida Scultura Endurance 4000[\s\S]*?¥14,800[\s\S]*?Official · 2026-08-17/);
  assert.match(html, /Canyon Grail CF 7[\s\S]*?¥11,700–14,700[\s\S]*?Official price conflict · 2026-08-17/);
  assert.match(html, /TSB \/ Titan Super Bond 泰世邦 PIONEER ONE[\s\S]*?Est\. ¥27,900[\s\S]*?Frame ¥21,900 · Official · 2026-08-17/);
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
  assert.match(detail, /package mentions cockpit\/handlebar and accessories/);
  assert.match(detail, /adjust the allowance to avoid double-counting/);
});

test('local builds use the live repository for public contribution links', () => {
  const buildSource = fs.readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
  assert.match(buildSource, /https:\/\/github\.com\/p0s\/china-bike-research/);
  assert.doesNotMatch(buildSource, /github\.com\/your-org\/your-repo/);
});

test('category-specific details stay accessible while price state is visible', () => {
  assert.match(html, /aria-label="Price details"/);
  assert.doesNotMatch(html, /data-capability-kind="tire"/);
  assert.match(html, /data-id="twitter-v3-wheeltop-eds"[^>]*data-capability-kind="discipline"[^>]*data-tire-clearance-sort="45"/);
  assert.match(html, /aria-label="Format details"/);
  assert.match(html, /type="number"[^>]*data-filter-tire/);
  assert.match(html, /data-filter-tire-unknown/);
  assert.match(html, /data-filter-complete-weight/);
  assert.match(html, /data-filter-frame-weight/);
  assert.match(html, /"weightGrams":9900,"weightKind":"complete"/);
  assert.match(html, /data-filter-drivetrain/);
  assert.match(html, /data-filter-frame/);
  assert.match(html, /data-filter-panel/);
  assert.match(html, /data-filter-chips/);
  assert.doesNotMatch(html, /data-filter-capability/);
  assert.match(html, /<option value="family:mtb">All mountain bikes<\/option>/);
  assert.match(html, /<option value="category:e-road">E-road<\/option>/);
  assert.match(html, /<option value="category:folding">Folding<\/option>/);
  assert.doesNotMatch(html, /research queue/i);
  assert.match(html, /Triathlon/);
  assert.match(html, /role="tooltip"/);
  assert.equal((html.match(/role="tooltip"/g) ?? []).length, 1);
  assert.match(html, /data-tooltip-lines=/);
  assert.match(html, /aria-controls="shared-tooltip"/);
  assert.match(html, /role="status" aria-live="polite" id="copy-status"/);
  assert.match(html, /data-result-summary aria-live="polite" hidden/);
  assert.match(html, /class="metric-sub price-state [^"]*">Promo · 2026-08-08<\/span>/);
  assert.match(html, /data-filter-category/);
  assert.match(html, /Category fact/);
  assert.match(html, /role="columnheader" aria-sort="none"><span class="catalog-heading-tools"><button class="catalog-sort-button" type="button" data-sort-heading="name"/);
  assert.match(html, /role="columnheader" aria-sort="ascending"><span class="catalog-heading-tools"><button class="catalog-sort-button" type="button" data-sort-heading="price"/);
  assert.match(html, /data-sort-heading="capability" disabled/);
  assert.match(html, /data-sort-heading="tire"><span>Tire clearance<\/span>/);
  assert.match(html, /data-filter-heading="tire"/);
  assert.match(html, /<option value="tire-desc">Tire clearance: high to low<\/option>/);
  assert.match(html, /<option value="price-asc">Price: low to high<\/option>/);
  assert.match(html, /<option value="name-desc">Bike: Z to A<\/option>/);
  assert.match(html, /<option value="capability-desc" disabled>Category fact: high to low<\/option>/);
  assert.doesNotMatch(html, /data-filter-style/);
  assert.doesNotMatch(html, /class="metric-sub">Claimed<\/span>/);
  assert.match(html, /data-id="scott-addict-rc-40"[^>]*data-family="road"[^>]*data-tire-clearance-sort="38"/);
  assert.match(html, /Why Best value/);
  assert.match(html, /Wireless electronic hydraulic 2×12, carbon frame\/fork\/cockpit, and T47/);
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
  assert.match(detail, /<dt>Weight<\/dt><dd>9\.9 kg<\/dd>/);
  assert.match(detail, /Each source is labelled by what it supports/);
  assert.match(detail, /Twitter Bikes · Manufacturer product page · Product facts · Image/);
  assert.match(detail, /Product facts: Medium–high · Image: High/);
  assert.match(detail, /Archived evidence; no public link/);
  assert.match(detail, /<section class="model-story"[^>]*>[\s\S]*9\.9 kg complete bike/);
  assert.doesNotMatch(detail, /The short version/);
  assert.match(detail, /The recorded complete-bike price is ¥4,951/);
  assert.match(detail, /Best suited to electronic shifting value, budget performance, drop-bar gravel/);
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
  assert.match(falathDetail, /<dt>Weight<\/dt><dd>1,080 g frame<\/dd>/);
  assert.match(falathDetail, /<dt>Frame weight<\/dt><dd>1,080 g<\/dd>/);
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
  assert.match(completeDetail, /data-nav-catalog aria-current="page"/);
  assert.doesNotMatch(completeDetail, /data-nav-framesets aria-current="page"/);
  assert.doesNotMatch(framesetDetail, /data-nav-catalog aria-current="page"/);
  assert.match(framesetDetail, /data-nav-framesets aria-current="page"/);
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
  assert.match(builder, /"id":"candidate-missing-china-price-canyon-grail"[\s\S]*?"priceLow":null,"priceHigh":null,"priceNote":"Conflicting official prices excluded; enter the exact purchase price\."/);
  assert.match(builder, /https:\/\/www\.elite-wheels\.com\/wp-content\/uploads/);
  assert.doesNotMatch(builder, /No attributable mainland price|No exact mainland package captured/);
});

test('buyer controls preserve strict budget, category evidence, and valid row semantics', () => {
  assert.match(html, /data-id="sava-gelaro-s4-grx400"[^>]*data-price-filter="7999"/);
  assert.match(html, /Triathlon storage \/ boxes: Unknown\./);
  assert.match(html, /"internalFrameStorage":"No"/);
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
  assert.match(html, /class="product-image-link" href="\/china-bike-research\/models\/twitter-v3-wheeltop-eds\/" data-model-link aria-label="View Twitter Gravel V3 WheelTop EDS 2×12 details"/);
  assert.match(html, /select name="category" data-filter-category/);
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
  assert.match(detail, /Evidence reviewed through <time datetime="2026-08-29">/);
  assert.match(detail, /href="#source-records">View sources<\/a>/);
  assert.match(detail, /<details class="detail-panel" id="source-records">/);
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
  assert.match(html, /No attributable mainland consumer price is recorded/);
  assert.match(html, /cover a 2× hydraulic shift-and-brake kit, not every remaining complete-build part/);
  assert.match(html, /data-id="lightcarbon-lcg071s-pro-frameset"[^>]*data-frame-price-low="3200" data-frame-price-high="4900"/);
  assert.match(html, /<span data-calculated-price>Est\. ¥9,200–10,900<\/span>/);
  assert.match(html, /data-frameset-price-tip=""/);
  assert.match(html, /data-stage="candidate"[^>]*data-id="candidate-hi-light-g0"[^>]*data-price-sort="[^"]+" data-price-filter="[^"]+" data-frame-price-low="[^"]+" data-frame-price-high="[^"]+"/);
  assert.match(html, /data-id="candidate-hi-light-g0"[\s\S]*?<span class="metric-main" data-calculated-price>Est\. ¥[\d,]+(?:–[\d,]+)?<\/span><span class="metric-sub price-state">Frame ¥/);
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
  assert.match(publishedDetail, /data-model-frame-price-low="3200" data-model-frame-price-high="4900" data-model-default-allowance="6000"/);
  assert.match(publishedDetail, /data-model-calculated-price>Est\. ¥9,200–10,900/);
  assert.match(publishedDetail, /data-model-price-brief/);
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
    assert.match(detail, /class="model-grid has-no-image"/);
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
  assert.match(detail, /Official global-direct checkout at US\$1,699/);
  assert.doesNotMatch(detail, /snapshot-classification|from_image|medium-low|promotion-conditional/);
});

test('model videos are exact, disclosed, and privacy-preserving before interaction', () => {
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
  assert.match(detail, /Selected video context/);
  assert.match(detail, /data-video-shell data-youtube-id="jmdVakRJPQ8" data-video-title="\$1278 for a frame THIS GOOD! The Yoeleo G21 Altera"/);
  assert.match(detail, /No YouTube request until you choose/);
  assert.match(detail, /Retailer-linked/);
  assert.match(detail, /Disclosure basis/);
  assert.match(detail, /href="https:\/\/www\.youtube\.com\/watch\?v=jmdVakRJPQ8" rel="noreferrer"/);
  assert.doesNotMatch(detail, /<iframe|youtube-nocookie\.com\/embed/);

  const privacy = renderPrivacy(context);
  assert.match(privacy, /youtube-nocookie\.com/);
  assert.match(privacy, /only after the visitor presses/);
  assert.match(privacy, /videos do not autoplay/);

  const imagePolicy = renderImagePolicy(context);
  assert.match(imagePolicy, /Selected XHS, Taobao, and Xianyu images/);
  assert.match(imagePolicy, /identity-safe canonical source URL/);
  assert.match(imagePolicy, /Share, referral, invite, tracking, session, and account parameters are removed/);
});


test('generic project copy is category-neutral', () => {
  assert.match(html, /<h1>Bikes in China<\/h1>/);
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
  assert.match(reference, /<th>System<\/th><th>Use<\/th><th>Gearing<\/th><th>Setup<\/th><th>China price<\/th>/);
  assert.match(reference, /L-TWOO · 蓝图/);
  assert.match(reference, /WheelTop · Wheeltop/);
  assert.match(reference, /QED disc-brake core groupset 1,150 g; PES disc-brake core groupset 1,250 g/);
  assert.match(reference, /¥4,150–4,200/);
  assert.match(reference, /¥2,369–3,219/);
  assert.match(reference, /¥3,480/);
  assert.match(reference, /SRAM GX AXS \/ Eagle Transmission/);
  assert.match(reference, /L-TWOO eRX-TT/);
  assert.match(reference, /Package & weight/);
  assert.match(reference, /How package labels and prices are normalized/);
  assert.match(reference, /referrerpolicy="no-referrer" data-product-image/);
  assert.match(reference, /id="shimano-grx-rx825"[\s\S]*?<td data-label="China price" data-column="price"><\/td>/);
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
  assert.equal((primaryNav.match(/<a\b/g) ?? []).length, 4);
  assert.match(primaryNav, />Bikes<\/a>[\s\S]*>Framesets<\/a>[\s\S]*>Build<\/a>[\s\S]*>Groupsets<\/a>/);
  assert.doesNotMatch(primaryNav, /Methodology|GitHub/);
  const referenceNav = reference.match(/<nav id="main-nav"[\s\S]*?<\/nav>/)?.[0] ?? '';
  assert.match(referenceNav, /data-nav-groupsets aria-current="page"/);
});
