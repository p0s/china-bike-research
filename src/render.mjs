import {
  clearanceLabel,
  clearanceLongLabel,
  formatAllInPrice,
  formatCny,
  formatPrice,
  freshness,
  maxClearance
} from './lib/data.mjs';
import {
  escapeAttr,
  escapeHtml,
  layout,
  safeJson,
  url
} from './lib/html.mjs';

const description = 'A concise comparison of bicycles and frame builds available to riders in China.';
let tooltipIndex = 0;

function page(ctx, { title = '', current = '', path = '/', description: desc = description, body, noindex = false, image = '', imageAlt = '' }) {
  return layout({
    base: ctx.base,
    repositoryUrl: ctx.repositoryUrl,
    siteUrl: ctx.siteUrl,
    title,
    current,
    path,
    description: desc,
    body,
    noindex,
    image,
    imageAlt
  });
}

function fallbackImage(ctx, product) {
  return url(ctx.base, product.variant.kind === 'complete-bike'
    ? '/assets/images/placeholders/complete-bike.svg'
    : '/assets/images/placeholders/frameset.svg');
}

function imageUrl(ctx, image) {
  if (!image) return '';
  return image.hosting.mode === 'remote'
    ? image.hosting.remote_url
    : url(ctx.base, image.hosting.local_path);
}

function accuracyLabel(accuracy) {
  return {
    'exact-variant': 'Exact configuration shown',
    'exact-platform': 'Exact frame platform',
    'same-platform': 'Same frame platform; components may differ',
    'same-model-different-color': 'Exact model; color may differ',
    'same-model-different-market-build': 'Same model name; regional build differs',
    illustrative: 'Project placeholder; not a product photo'
  }[accuracy] ?? 'Image status unclassified';
}

function imageElement(ctx, product, { hero = false, className = '' } = {}) {
  const source = imageUrl(ctx, product.image) || fallbackImage(ctx, product);
  const fallback = fallbackImage(ctx, product);
  const alt = product.image?.alt ?? `${product.brand.name} ${product.variant.name}`;
  const remote = product.image?.hosting.mode === 'remote';
  return `<img class="${escapeAttr(className)}" src="${escapeAttr(source)}" alt="${escapeAttr(alt)}" width="1200" height="800" ${hero ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async"${remote ? ' referrerpolicy="no-referrer"' : ''} data-product-image data-fallback="${escapeAttr(fallback)}">`;
}

function infoTip(label, lines) {
  const id = `tooltip-${++tooltipIndex}`;
  const content = lines.filter(Boolean).map((line) => `<span>${escapeHtml(line)}</span>`).join('');
  return `<span class="tooltip"><button class="info-button" type="button" aria-label="${escapeAttr(label)}" aria-describedby="${id}">i</button><span class="tooltip-content" role="tooltip" id="${id}">${content}</span></span>`;
}

function buildAssumption(ctx) {
  return ctx.data.meta.frameset_build_assumption;
}

function priceTooltipLines(ctx, product) {
  const { variant, latestPrice, allInPrice } = product;
  const fresh = freshness(latestPrice?.observed_at, ctx.now);
  const threshold = variant.editorial.price_thresholds_cny?.great_buy_below;
  const lines = [];
  if (variant.kind === 'frameset') {
    lines.push(`Frameset price: ${formatPrice(latestPrice)}.`);
    lines.push(`Estimated complete adds a fixed ${formatCny(allInPrice.buildAmount)} ${buildAssumption(ctx).label}.`);
    if (threshold) lines.push(`Great-buy reference: below ${formatCny(threshold + allInPrice.buildAmount)} complete (${formatCny(threshold)} frameset).`);
  } else if (threshold) {
    lines.push(`Great-buy reference: below ${formatCny(threshold)}.`);
  }
  if (latestPrice?.observed_at) lines.push(`Price observed ${latestPrice.observed_at}; ${fresh.label.toLowerCase()} as of this snapshot.`);
  if (latestPrice?.status) lines.push(`Record status: ${latestPrice.status.replaceAll('-', ' ')}.`);
  if (latestPrice?.conditions) lines.push(latestPrice.conditions);
  return lines;
}

function clearanceTooltipLines(product) {
  const clearance = product.platform.tire_clearance;
  return [
    `${clearanceLongLabel(product.platform)}.`,
    `Evidence: ${clearance.evidence.replaceAll('-', ' ')}.`,
    clearance.note,
    clearance.eligibility !== 'pass' ? `Eligibility: ${clearance.eligibility}. Verify the exact SKU before buying.` : ''
  ];
}

function drivetrainLabel(ctx, product) {
  if (product.variant.kind === 'frameset') return 'Assumed electronic 2×12';
  const drivetrain = product.variant.drivetrain;
  if (!drivetrain) return 'Not recorded';
  return `${drivetrain.brand} ${drivetrain.model}`;
}

function drivetrainSubline(ctx, product) {
  if (product.variant.kind === 'frameset') return '';
  const drivetrain = product.variant.drivetrain;
  return drivetrain ? `${drivetrain.speeds} · ${drivetrain.shifting.replaceAll('-', ' ')}` : '';
}

function weightLabel(product) {
  if (product.variant.kind === 'complete-bike') {
    return product.variant.claimed_complete_weight_g
      ? `${(product.variant.claimed_complete_weight_g / 1000).toFixed(1)} kg`
      : '—';
  }
  return product.platform.frame.claimed_frame_weight_g
    ? `${new Intl.NumberFormat('en-US').format(product.platform.frame.claimed_frame_weight_g)} g frame`
    : '—';
}

function weightSubline() { return ''; }

function frameStandard(product) {
  const frame = product.platform.frame;
  const parts = [];
  if (frame.bottom_bracket && frame.bottom_bracket !== 'unknown') parts.push(frame.bottom_bracket);
  if (frame.derailleur_hanger === 'UDH') parts.push('UDH');
  return parts.join(' · ') || '—';
}

function frameTooltipLines(product) {
  const { frame } = product.platform;
  const lines = [
    `Bottom bracket: ${frame.bottom_bracket ?? 'unknown'}.`,
    `Derailleur hanger: ${frame.derailleur_hanger ?? 'unknown'}.`,
    frame.claimed_fiber ? `Carbon claim: ${frame.claimed_fiber}.` : '',
    frame.cable_routing ? `Cable routing: ${frame.cable_routing.replaceAll('-', ' ')}.` : '',
    product.platform.internal_storage ? 'Internal frame storage.' : '',
    product.platform.mounts?.length ? `Mounts: ${product.platform.mounts.join(', ')}.` : '',
    `${product.brand.manufacturing.relationship.replaceAll('-', ' ')}; evidence confidence ${product.brand.manufacturing.confidence}.`
  ];
  return lines;
}

function recommendationLabel(ctx, product) {
  const recommendation = ctx.data.recommendations.find((item) => item.variant_id === product.variant.id);
  if (!recommendation) return '';
  const labels = {
    'cheapest-traceable-complete': 'Cheapest complete',
    'best-complete-value': 'Best value',
    'best-shimano-budget': 'Shimano pick',
    'best-budget-frame': 'Budget frame pick',
    'best-premium-package': 'Versatile premium',
    'best-premium-race-value': 'Race value'
  };
  return labels[recommendation.id] ?? recommendation.title;
}

function statusFlag(product) {
  const eligibility = product.platform.tire_clearance.eligibility;
  if (eligibility === 'pass') return '';
  return `<span class="verify-flag">Verify${infoTip('Why this needs verification', clearanceTooltipLines(product))}</span>`;
}

function productImage(ctx, product, { hero = false } = {}) {
  const accuracy = product.image?.display_accuracy ?? product.image?.subject_accuracy ?? 'illustrative';
  const needsNote = !['exact-variant', 'exact-platform'].includes(accuracy);
  return `<span class="product-image ${hero ? 'hero-image' : ''}">${imageElement(ctx, product, { hero })}${needsNote ? `<span class="image-info">${infoTip('About this image', [accuracyLabel(accuracy), product.image?.display_note ?? 'The image identifies the product family but may not show the exact listed components.'])}</span>` : ''}</span>`;
}

function productRow(ctx, product) {
  const { variant, platform, brand, allInPrice } = product;
  const max = maxClearance(platform) ?? 0;
  const searchable = [
    brand.name,
    brand.name_zh,
    variant.name,
    platform.name,
    platform.name_zh,
    platform.category,
    platform.handlebar,
    drivetrainLabel(ctx, product),
    platform.frame.bottom_bracket,
    platform.frame.derailleur_hanger,
    ...(variant.editorial.best_for ?? [])
  ].filter(Boolean).join(' ').toLowerCase();
  const recommended = recommendationLabel(ctx, product);
  return `<article class="catalog-row" role="row" data-product-row data-id="${escapeAttr(variant.id)}" data-search="${escapeAttr(searchable)}" data-type="${escapeAttr(variant.kind)}" data-category="${escapeAttr(platform.category)}" data-handlebar="${escapeAttr(platform.handlebar)}" data-price-sort="${allInPrice.midpoint}" data-price-filter="${allInPrice.low ?? ''}" data-clearance="${max}" data-name="${escapeAttr(`${brand.name} ${variant.name}`.toLowerCase())}">
    <label class="compare-toggle" role="cell"><input type="checkbox" data-compare-id="${escapeAttr(variant.id)}"><span aria-hidden="true"></span><span class="sr-only">Select ${escapeHtml(brand.name)} ${escapeHtml(variant.name)} for comparison</span></label>
    <div class="catalog-product" role="cell">
      ${productImage(ctx, product)}
      <span class="product-copy">
        <span class="product-meta"><span>${escapeHtml(brand.name)}${brand.name_zh ? ` · ${escapeHtml(brand.name_zh)}` : ''}</span>${variant.kind === 'frameset' ? '<span class="type-pill">Frame estimate</span>' : ''}${recommended ? `<span class="pick-pill">${escapeHtml(recommended)}</span>` : ''}${statusFlag(product)}</span>
        <strong class="product-name"><a href="${url(ctx.base, `/models/${variant.id}/`)}">${escapeHtml(variant.name)}</a></strong>
      </span>
    </div>
    <div class="catalog-cell price-cell" role="cell" data-label="Price"><span class="metric-main">${escapeHtml(formatAllInPrice(product))}${infoTip('Price details', priceTooltipLines(ctx, product))}</span></div>
    <div class="catalog-cell clearance-cell" role="cell" data-label="Clearance"><span class="metric-main">${escapeHtml(clearanceLabel(platform))}${infoTip('Tire-clearance details', clearanceTooltipLines(product))}</span></div>
    <div class="catalog-cell drivetrain-cell" role="cell" data-label="Drivetrain"><span class="metric-main compact-metric">${escapeHtml(drivetrainLabel(ctx, product))}</span><span class="metric-sub">${escapeHtml(drivetrainSubline(ctx, product))}</span></div>
    <div class="catalog-cell weight-cell" role="cell" data-label="Weight"><span class="metric-main">${escapeHtml(weightLabel(product))}</span><span class="metric-sub">${escapeHtml(weightSubline(product))}</span></div>
    <div class="catalog-cell frame-cell" role="cell" data-label="Frame"><span class="metric-main">${escapeHtml(frameStandard(product))}${infoTip('Frame details', frameTooltipLines(product))}</span></div>
    <div class="row-link-cell" role="cell"><a class="row-link" href="${url(ctx.base, `/models/${variant.id}/`)}" aria-label="View ${escapeAttr(brand.name)} ${escapeAttr(variant.name)} details">›</a></div>
  </article>`;
}

function comparisonSummary(ctx, product) {
  return {
    id: product.variant.id,
    brand: product.brand.name,
    name: product.variant.name,
    url: url(ctx.base, `/models/${product.variant.id}/`),
    image: imageUrl(ctx, product.image) || fallbackImage(ctx, product),
    imageFallback: fallbackImage(ctx, product),
    imageAlt: product.image?.alt ?? `${product.brand.name} ${product.variant.name}`,
    imageRemote: product.image?.hosting.mode === 'remote',
    type: product.variant.kind === 'frameset' ? 'Frame estimate' : 'Complete bike',
    price: formatAllInPrice(product),
    priceDetails: priceTooltipLines(ctx, product).join(' '),
    clearance: clearanceLabel(product.platform),
    clearanceDetails: clearanceTooltipLines(product).join(' '),
    drivetrain: drivetrainLabel(ctx, product),
    drivetrainSubline: drivetrainSubline(ctx, product),
    weight: weightLabel(product),
    weightSubline: weightSubline(product),
    frame: frameStandard(product),
    category: `${product.platform.category.replaceAll('-', ' ')} · ${product.platform.handlebar}-bar`,
    storage: product.platform.internal_storage ? 'Yes' : 'No',
    mounts: product.platform.mounts?.join(', ') || 'None recorded',
    manufacturing: `${product.brand.manufacturing.relationship.replaceAll('-', ' ')} · confidence ${product.brand.manufacturing.confidence}`,
    availability: product.platform.china_availability.replaceAll('-', ' '),
    bestFor: product.variant.editorial.best_for?.join(', ') || 'Not specified',
    verdict: product.variant.editorial.verdict,
    caveats: product.variant.editorial.caveats?.join('; ') || 'None recorded'
  };
}

function watchlistNote(ctx) {
  return `<details class="research-note"><summary>Models still being verified</summary><div class="research-list">${ctx.data.candidates.map((item) => `<div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.why_interesting)}</span><small>Needs: ${escapeHtml(item.missing.join(' · '))}</small></div>`).join('')}</div><p class="research-footnote">These are not ranked until the exact model, current price, clearance, or manufacturer can be verified. <a href="${ctx.repositoryUrl}/issues">Add evidence on GitHub</a>.</p></details>`;
}

function sourceList(sources) {
  return `<div class="source-list">${sources.map((source) => `<div class="source-item">${source.url ? `<a href="${escapeAttr(source.url)}" rel="noreferrer">${escapeHtml(source.title)}</a>` : `<strong>${escapeHtml(source.title)}</strong>`}<span>${escapeHtml(source.publisher)} · accessed ${escapeHtml(source.accessed_at)}</span>${source.notes ? `<p>${escapeHtml(source.notes)}</p>` : ''}</div>`).join('')}</div>`;
}

export function renderHome(ctx) {
  const categories = [...new Set(ctx.products.map((product) => product.platform.category))].sort();
  const assumption = buildAssumption(ctx);
  const summaries = ctx.products.map((product) => comparisonSummary(ctx, product));
  const body = `<section class="catalog-intro"><div class="page intro-row"><div><h1>Bikes in China</h1><p>Compare China-market bikes and frameset builds by full-bike price, category, components, and evidence.</p></div><div class="assumption-note"><strong>Frameset estimates add ${formatCny(assumption.amount_cny)}</strong>${infoTip('Frameset build assumption', [assumption.summary, `Reviewed ${assumption.reviewed_at}.`])}</div></div></section>
  <section class="catalog-section" id="catalog"><div class="page" data-catalog-root>
    <div class="filter-bar">
      <div class="search-box"><label class="sr-only" for="catalog-search">Search bikes</label><span aria-hidden="true">⌕</span><input id="catalog-search" type="search" placeholder="Search brand, model or drivetrain" autocomplete="off" data-filter-search></div>
      <div class="segmented" role="group" aria-label="Product type" data-type-control><button type="button" data-type-value="" aria-pressed="true">All</button><button type="button" data-type-value="complete-bike" aria-pressed="false">Complete</button><button type="button" data-type-value="frameset" aria-pressed="false">Frame builds</button></div>
      <label class="compact-select"><span>Max price</span><select data-filter-price><option value="">Any</option><option value="6000">¥6,000</option><option value="8000">¥8,000</option><option value="10000">¥10,000</option><option value="15000">¥15,000</option><option value="20000">¥20,000</option></select></label>
      <label class="compact-select"><span>Min tire</span><select data-filter-clearance><option value="0">Any</option><option value="40">40 mm</option><option value="45">45 mm</option><option value="50">50 mm</option><option value="55">55 mm</option></select></label>
      <label class="compact-select"><span>Style</span><select data-filter-style><option value="">Any</option>${categories.map((category) => `<option value="category:${escapeAttr(category)}">${escapeHtml(category.replaceAll('-', ' '))}</option>`).join('')}<option value="handlebar:flat">flat-bar</option></select></label>
      <label class="compact-select"><span>Sort</span><select data-sort><option value="price">Price</option><option value="clearance">Tire clearance</option><option value="name">Brand</option></select></label>
      <button class="reset-button" type="button" data-reset hidden>Clear</button>
    </div>

    <section class="inline-compare" id="compare" data-inline-compare hidden>
      <div class="compare-heading"><div><h2>Compare</h2></div><div><button class="text-button" type="button" data-copy-comparison>Copy link</button><button class="text-button" type="button" data-close-compare>Close</button></div></div>
      <div data-compare-content></div>
    </section>

    <div class="catalog-meta"><span data-result-summary aria-live="polite" hidden><strong data-result-count>${ctx.products.length}</strong> matches</span><span>Select two to four bikes to compare</span></div>
    <div class="catalog-table" data-product-list role="table" aria-label="Bike comparison">
      <div class="catalog-head" role="row"><span role="columnheader" aria-label="Select"></span><span role="columnheader">Bike</span><span role="columnheader">Full-bike price</span><span role="columnheader">Tire</span><span role="columnheader">Drivetrain</span><span role="columnheader">Weight</span><span role="columnheader">Frame</span><span role="columnheader" aria-label="Details"></span></div>
      ${ctx.products.map((product) => productRow(ctx, product)).join('')}
      <div class="empty-state" data-empty hidden>No bikes match these filters.</div>
    </div>
    ${watchlistNote(ctx)}
    <script type="application/json" id="catalog-data">${safeJson(summaries)}</script>
  </div></section>`;
  return page(ctx, { current: 'catalog', path: '/', body });
}

export function renderModel(ctx, product) {
  const { variant, platform, brand, latestPrice, prices, sources } = product;
  const assumption = buildAssumption(ctx);
  const max = maxClearance(platform) ?? 40;
  const sellerMessage = `请确认 ${brand.name} ${variant.name} 的准确年份、配置和车架批次。请提供：\n1. 车架和前叉准确材料；\n2. 原装轮圈内宽；\n3. 安装标称 ${max}C 外胎后的实测宽度；\n4. 前叉、后下叉和座管位置的最小剩余净空；\n5. 五通、桶轴和尾钩标准；\n6. 完整 BOM，不接受未经确认的同级替换；\n7. 车架序列号、国内质保主体和退换条件。`;
  const priceSubline = variant.kind === 'frameset' ? 'Estimated complete build' : '';
  const imageAccuracy = accuracyLabel(product.image?.display_accuracy ?? product.image?.subject_accuracy ?? 'illustrative');
  const detailFacts = [
    ['Tire clearance', clearanceLabel(platform), infoTip('Tire-clearance details', clearanceTooltipLines(product))],
    ['Drivetrain', drivetrainLabel(ctx, product), ''],
    ['Weight', weightLabel(product), ''],
    ['Frame standard', frameStandard(product), ''],
    ['Category', `${platform.category.replaceAll('-', ' ')} · ${platform.handlebar}-bar`, ''],
    ['Availability', platform.china_availability.replaceAll('-', ' '), '']
  ];
  const body = `<section class="model-page"><div class="page"><a class="back-link" href="${url(ctx.base, '/')}">← All bikes</a><div class="model-grid">
    <figure class="model-figure">${productImage(ctx, product, { hero: true })}<figcaption>${escapeHtml(product.image?.credit ?? 'Product image')} · ${escapeHtml(imageAccuracy)}${product.imageSource?.url ? ` · <a href="${escapeAttr(product.imageSource.url)}" rel="noreferrer">source</a>` : ''}</figcaption></figure>
    <div class="model-summary"><div class="model-brand">${escapeHtml(brand.name)}${brand.name_zh ? ` · ${escapeHtml(brand.name_zh)}` : ''}${variant.kind === 'frameset' ? '<span class="type-pill">Frame estimate</span>' : ''}${statusFlag(product)}</div><h1>${escapeHtml(variant.name)}</h1><p class="model-verdict">${escapeHtml(variant.editorial.verdict)}</p><div class="model-price"><strong>${escapeHtml(formatAllInPrice(product))}</strong>${infoTip('Price details', priceTooltipLines(ctx, product))}<span>${escapeHtml(priceSubline)}</span></div><dl class="model-facts">${detailFacts.map(([label, value, tip]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}${tip}</dd></div>`).join('')}</dl></div>
  </div>
  <div class="model-content">
    <section class="decision-block"><div><h2>Why consider it</h2><ul>${variant.editorial.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div><div><h2>What to verify</h2><ul>${variant.editorial.caveats.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div></section>
    <details class="detail-panel"><summary>Frame, support and manufacturing</summary><div class="detail-panel-body"><dl class="detail-list"><div><dt>Frame material</dt><dd>${escapeHtml(platform.frame.claimed_fiber ?? platform.frame.material)}</dd></div><div><dt>Cable routing</dt><dd>${escapeHtml(platform.frame.cable_routing ?? 'Not recorded')}</dd></div><div><dt>Storage</dt><dd>${platform.internal_storage ? 'Yes' : 'No'}</dd></div><div><dt>Mounts</dt><dd>${escapeHtml(platform.mounts?.join(', ') || 'None recorded')}</dd></div><div><dt>Manufacturing relationship</dt><dd>${escapeHtml(brand.manufacturing.relationship.replaceAll('-', ' '))}</dd></div><div><dt>Evidence confidence</dt><dd>${escapeHtml(brand.manufacturing.confidence)}</dd></div><div><dt>China purchase</dt><dd>${escapeHtml(brand.china_support.domestic_purchase?.replaceAll('-', ' ') ?? 'unknown')}</dd></div><div><dt>Warranty</dt><dd>${escapeHtml(brand.china_support.warranty?.replaceAll('-', ' ') ?? 'verify')}</dd></div></dl><p>${escapeHtml(brand.manufacturing.summary)}</p></div></details>
    <details class="detail-panel"><summary>Ask the seller in Chinese</summary><div class="detail-panel-body"><pre id="seller-message"><code>${escapeHtml(sellerMessage)}</code></pre><button class="secondary-button" type="button" data-copy-target="seller-message">Copy message</button></div></details>
    <details class="detail-panel"><summary>Price record and sources</summary><div class="detail-panel-body"><div class="price-records">${prices.map((price) => `<div><strong>${escapeHtml(formatPrice(price))}</strong><span>${escapeHtml(price.observed_at)} · ${escapeHtml(price.price_type.replaceAll('-', ' '))} · ${escapeHtml(price.status.replaceAll('-', ' '))}</span>${price.conditions ? `<p>${escapeHtml(price.conditions)}</p>` : ''}</div>`).join('')}</div>${sourceList(sources)}</div></details>
  </div></div></section>`;
  return page(ctx, {
    title: `${brand.name} ${variant.name}`,
    path: `/models/${variant.id}/`,
    description: variant.editorial.verdict,
    image: imageUrl(ctx, product.image) || fallbackImage(ctx, product),
    imageAlt: product.image?.alt ?? `${brand.name} ${variant.name}`,
    body
  });
}

function prosePage(ctx, { title, desc, path, html, current = '' }) {
  return page(ctx, {
    title,
    current,
    path,
    description: desc,
    body: `<section class="simple-page"><article class="page prose"><h1>${escapeHtml(title)}</h1><p class="page-lede">${escapeHtml(desc)}</p>${html}</article></section>`
  });
}

export function renderMethodology(ctx) {
  const assumption = buildAssumption(ctx);
  const html = `<h2>What is compared</h2><p>The main list combines complete bikes and frameset-based builds where total cost can be compared honestly. Products are identified by exact category, model, generation, and configuration.</p><h2>Frameset price estimate</h2><p>Each published frameset currently receives the same fixed <strong>${formatCny(assumption.amount_cny)}</strong> allowance for ${escapeHtml(assumption.summary.toLowerCase())} It is an estimate, not a shopping cart or guarantee. Framesets remain candidates when this assumption would be materially misleading.</p><h2>Price details</h2><p>The visible price is the complete-bike price or the estimated complete-build price. The info button contains the underlying frame price, observation date, freshness, record status, conditions, and great-buy reference.</p><h2>Specifications</h2><p>The catalog shows a compact common core and adds category-specific facts only when useful. Tire clearance is one example; other categories may require different compatibility or performance fields.</p><h2>Materials and manufacturing</h2><p>For carbon products, fiber labels such as T700, T800, or T1000 are not quality scores. Lay-up, compaction, curing, alignment, testing, traceability, and support matter more. Missing evidence increases uncertainty; it does not automatically mean a product is poor.</p><h2>Corrections</h2><p>Each change should identify the exact model or generation and include a source. <a href="${ctx.repositoryUrl}/issues">Submit a correction or price sighting on GitHub</a>.</p>`;
  return prosePage(ctx, { title: 'Methodology', desc: 'How prices, frameset estimates, specifications, and evidence are handled.', path: '/methodology/', current: 'methodology', html });
}

export function renderPrivacy(ctx) {
  const html = `<h2>Static site</h2><p>The site has no account, analytics, advertising tracker, newsletter, payment system, or backend. Bike selections are stored only in the visitor’s browser.</p><h2>Product images</h2><p>Some product photos load from their credited manufacturer or retailer host. The host receives a normal image request. Images use <code>referrerpolicy="no-referrer"</code>, and a local placeholder appears when a source image fails.</p><h2>Public contributions</h2><p>GitHub issues and pull requests are public. Remove names, account details, addresses, order IDs, payment information, faces, license plates, and location metadata before submitting screenshots or photos.</p>`;
  return prosePage(ctx, { title: 'Privacy', desc: 'No accounts or analytics; third-party product images are disclosed.', path: '/privacy/', html });
}

export function renderImagePolicy(ctx) {
  const html = `<h2>Image use</h2><p>The repository stores structured credits and remote image URLs rather than copying third-party product photography. Product images remain the property of their credited owners.</p><h2>Accuracy</h2><p>An image can show the exact configuration, the exact frame platform, the same platform with different components, another color, or another regional build. When the image is not exact, the catalog shows an information marker.</p><h2>Fallbacks and corrections</h2><p>A project-owned placeholder replaces broken external images. Use <a href="${ctx.repositoryUrl}/issues">GitHub issues</a> to report a broken link, attribution concern, inaccurate image, or a rights-cleared replacement.</p><p><a href="${url(ctx.base, '/image-sources/')}">See every image source and credit.</a></p>`;
  return prosePage(ctx, { title: 'Product images', desc: 'How product photos are sourced, labelled and replaced when unavailable.', path: '/image-policy/', html });
}

export function renderImageSources(ctx) {
  const platforms = new Map(ctx.data.platforms.map((item) => [item.id, item]));
  const brands = new Map(ctx.data.brands.map((item) => [item.id, item]));
  const sources = new Map(ctx.data.sources.map((item) => [item.id, item]));
  const firstProductByPlatform = new Map();
  for (const product of ctx.products) if (!firstProductByPlatform.has(product.platform.id)) firstProductByPlatform.set(product.platform.id, product);
  const entries = ctx.data.images.map((image) => {
    const platform = platforms.get(image.platform_id);
    const brand = brands.get(platform.brand_id);
    const source = sources.get(image.source_id);
    return { image, platform, brand, source, product: firstProductByPlatform.get(image.platform_id) };
  }).sort((a, b) => `${a.brand.name} ${a.platform.name}`.localeCompare(`${b.brand.name} ${b.platform.name}`));
  const html = `<div class="credit-list">${entries.map(({ image, platform, brand, source, product }) => `<article><a class="credit-image" href="${url(ctx.base, `/models/${product.variant.id}/`)}">${imageElement(ctx, { ...product, image })}</a><div><h2>${escapeHtml(brand.name)} ${escapeHtml(platform.name)}</h2><p>${escapeHtml(image.credit)} · ${escapeHtml(accuracyLabel(image.subject_accuracy))}</p>${source?.url ? `<a href="${escapeAttr(source.url)}" rel="noreferrer">Original source</a>` : ''}</div></article>`).join('')}</div>`;
  return prosePage(ctx, { title: 'Image credits', desc: 'Source and exactness for every product visual used by the catalog.', path: '/image-sources/', html });
}

export function render404(ctx) {
  return page(ctx, { title: 'Page not found', path: '/404.html', noindex: true, body: `<section class="simple-page"><div class="page prose"><h1>Page not found</h1><p class="page-lede">The bike or route may have moved.</p><p><a class="primary-button" href="${url(ctx.base, '/')}">Return to all bikes</a></p></div></section>` });
}
