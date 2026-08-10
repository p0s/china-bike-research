import {
  categoryLabel,
  categoryFamily,
  categoryMetric,
  supportedCategories,
  clearanceLongLabel,
  evidenceLabel,
  formatAllInPrice,
  formatCny,
  formatPrice,
  freshness,
} from './lib/data.mjs';
import {
  escapeAttr,
  escapeHtml,
  layout,
  safeJson,
  url
} from './lib/html.mjs';

const description = 'A concise comparison of bicycles and frame builds available to riders in China.';

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
  const content = JSON.stringify(lines.filter(Boolean).map(String));
  return `<span class="tooltip"><button class="info-button" type="button" aria-label="${escapeAttr(label)}" aria-expanded="false" aria-controls="shared-tooltip" data-tooltip-lines="${escapeAttr(content)}"><span aria-hidden="true">i</span></button></span>`;
}

function buildAssumption(ctx) {
  return ctx.data.meta.frameset_build_assumption;
}

function sentenceLabel(value, labels = {}) {
  if (!value) return 'Unverified';
  const text = labels[value] ?? String(value).replaceAll('-', ' ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function confidenceLabel(value) {
  return sentenceLabel(value, {
    'low-medium': 'low–medium',
    'medium-low': 'medium–low',
    'medium-high': 'medium–high'
  });
}

function relationshipLabel(value) {
  return sentenceLabel(value, {
    'brand-identity-only': 'brand identity; factory not verified',
    'design-brand-unknown-factory': 'design brand; factory not verified',
    'brand-with-contract-or-integrated-production': 'brand with contract or integrated production'
  });
}

function availabilityLabel(value) {
  return sentenceLabel(value, {
    'direct-brand': 'brand direct',
    'direct-factory': 'factory direct',
    'mainland-and-direct': 'mainland retail and direct',
    'mainland-domestic': 'mainland domestic',
    'mainland-marketplace-observed': 'mainland marketplace observed',
    'preorder-direct': 'direct preorder'
  });
}

function warrantyLabel(value) {
  return sentenceLabel(value, { 'verify-exact-seller-and-sku': 'verify for the exact seller and SKU' });
}

function priceStatusLabel(status) {
  return sentenceLabel(status, {
    'approximate-current': 'approximate current price',
    'configuration-dependent': 'configuration-dependent price',
    'configuration-or-promotion-range': 'configuration or promotion range',
    historical: 'historical price',
    'historical-promo': 'historical promotion',
    'observed-current': 'observed current price',
    'official-current': 'official current price',
    'promotion-conditional': 'promotion-conditional price'
  });
}

function compactPriceStatus(status) {
  return {
    'approximate-current': 'Approx.',
    'configuration-dependent': 'Variable',
    'configuration-or-promotion-range': 'Variable',
    historical: 'Historical',
    'historical-promo': 'Historical promo',
    'observed-current': 'Observed',
    'official-current': 'Official',
    'promotion-conditional': 'Promo'
  }[status] ?? sentenceLabel(status);
}

function priceState(product) {
  const status = compactPriceStatus(product.latestPrice?.status);
  const date = product.latestPrice?.observed_at;
  return [status, date].filter(Boolean).join(' · ');
}

function priceStateClass(product) {
  const status = product.latestPrice?.status ?? '';
  if (status.startsWith('historical')) return 'is-historical';
  if (status.includes('promotion') || status.includes('configuration')) return 'is-conditional';
  return '';
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
  if (latestPrice?.status) lines.push(`Record status: ${priceStatusLabel(latestPrice.status)}.`);
  if (latestPrice?.conditions) lines.push(latestPrice.conditions);
  return lines;
}

function clearanceTooltipLines(product) {
  const clearance = product.platform.tire_clearance;
  if (!clearance) return ['Tire clearance is not a common comparison field for this category.'];
  return [
    `${clearanceLongLabel(product.platform)}.`,
    `Evidence: ${evidenceLabel(clearance.evidence)}.`,
    clearance.note,
    clearance.eligibility !== 'pass' ? `Eligibility: ${clearance.eligibility}. Verify the exact SKU before buying.` : ''
  ];
}

function drivetrainLabel(ctx, product) {
  if (product.variant.kind === 'frameset') return buildAssumption(ctx).drivetrain_label;
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

function weightSubline(product) {
  if (product.variant.kind === 'complete-bike') return product.variant.claimed_complete_weight_g ? 'Claimed' : '';
  return product.platform.frame.claimed_frame_weight_g ? 'Claimed frame weight' : '';
}

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
    `${relationshipLabel(product.brand.manufacturing.relationship)}; ${confidenceLabel(product.brand.manufacturing.confidence).toLowerCase()} evidence confidence.`
  ];
  return lines;
}

function recommendationFor(ctx, product) {
  return ctx.data.recommendations.find((item) => item.variant_id === product.variant.id) ?? null;
}

function recommendationLabel(recommendation) {
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

function recommendationBadge(recommendation) {
  if (!recommendation) return '';
  const label = recommendationLabel(recommendation);
  return `<span class="pick-flag"><span class="pick-pill">${escapeHtml(label)}</span>${infoTip(`Why ${label}`, [recommendation.price_label, recommendation.reason, recommendation.caveat ? `Caveat: ${recommendation.caveat}` : ''])}</span>`;
}

function bestForLabel(product) {
  const values = product.variant.editorial.best_for ?? [];
  if (values.length === 1 && values[0].toLowerCase() === categoryLabel(product.platform.category).toLowerCase()) return '';
  return values.join(' · ');
}

function statusFlag(product) {
  if (!product.platform.tire_clearance) return '';
  const eligibility = product.platform.tire_clearance.eligibility;
  if (eligibility === 'pass') return '';
  return `<span class="verify-flag">Verify${infoTip('Why this needs verification', clearanceTooltipLines(product))}</span>`;
}

function productImage(ctx, product, { hero = false, href = '' } = {}) {
  const accuracy = product.image?.display_accuracy ?? product.image?.subject_accuracy ?? 'illustrative';
  const needsNote = !['exact-variant', 'exact-platform'].includes(accuracy);
  const image = imageElement(ctx, product, { hero });
  const visual = href
    ? `<a class="product-image-link" href="${escapeAttr(href)}" data-model-link aria-label="View ${escapeAttr(product.brand.name)} ${escapeAttr(product.variant.name)} details">${image}</a>`
    : image;
  return `<span class="product-image ${hero ? 'hero-image' : ''}">${visual}${needsNote ? `<span class="image-info">${infoTip('About this image', [accuracyLabel(accuracy), product.image?.display_note ?? 'The image identifies the product family but may not show the exact listed components.'])}</span>` : ''}</span>`;
}

function productRow(ctx, product) {
  const { variant, platform, brand, allInPrice } = product;
  const metric = categoryMetric(platform);
  const searchable = [
    brand.name,
    brand.name_zh,
    variant.name,
    platform.name,
    platform.name_zh,
    categoryLabel(platform.category),
    platform.handlebar,
    drivetrainLabel(ctx, product),
    platform.frame.bottom_bracket,
    platform.frame.derailleur_hanger,
    metric.value,
    ...(variant.editorial.best_for ?? [])
  ].filter(Boolean).join(' ').toLowerCase();
  const recommendation = recommendationFor(ctx, product);
  const bestFor = bestForLabel(product);
  const brandLabel = `${brand.name}${brand.name_zh ? ` · ${brand.name_zh}` : ''}`;
  return `<div class="catalog-row" role="row" data-product-row data-id="${escapeAttr(variant.id)}" data-brand="${escapeAttr(brand.id)}" data-search="${escapeAttr(searchable)}" data-type="${escapeAttr(variant.kind)}" data-family="${escapeAttr(categoryFamily(platform.category))}" data-category="${escapeAttr(platform.category)}" data-handlebar="${escapeAttr(platform.handlebar)}" data-price-sort="${allInPrice.midpoint}" data-price-filter="${allInPrice.high ?? ''}" data-capability-sort="${metric.sortValue}" data-capability-kind="${escapeAttr(metric.kind)}" data-name="${escapeAttr(`${brand.name} ${variant.name}`.toLowerCase())}">
    <div class="compare-toggle" role="cell"><label><input type="checkbox" data-compare-id="${escapeAttr(variant.id)}"><span aria-hidden="true"></span><span class="sr-only">Select ${escapeHtml(brand.name)} ${escapeHtml(variant.name)} for comparison</span></label></div>
    <div class="catalog-product" role="cell">
      ${productImage(ctx, product, { href: url(ctx.base, `/models/${variant.id}/`) })}
      <span class="product-copy">
        <span class="product-meta"><button class="catalog-brand-filter" type="button" data-brand-filter="${escapeAttr(brand.id)}" aria-pressed="false" aria-label="${escapeAttr(brandLabel)} — filter catalog to this brand">${escapeHtml(brandLabel)}</button>${variant.kind === 'frameset' ? '<span class="type-pill">Frame estimate</span>' : ''}${recommendationBadge(recommendation)}${statusFlag(product)}</span>
        <strong class="product-name"><a href="${url(ctx.base, `/models/${variant.id}/`)}" data-model-link>${escapeHtml(variant.name)}</a></strong>
        ${bestFor ? `<span class="product-fit"><span>Best for</span> ${escapeHtml(bestFor)}</span>` : ''}
      </span>
    </div>
    <div class="catalog-cell price-cell" role="cell" data-label="Price"><span class="metric-main">${escapeHtml(formatAllInPrice(product))}${infoTip('Price details', priceTooltipLines(ctx, product))}</span><span class="metric-sub price-state ${priceStateClass(product)}">${escapeHtml(priceState(product))}</span></div>
    <div class="catalog-cell capability-cell" role="cell" data-label="${escapeAttr(metric.label)}"><span class="metric-main">${escapeHtml(metric.value)}${infoTip(`${metric.label} details`, metric.details)}</span></div>
    <div class="catalog-cell drivetrain-cell" role="cell" data-label="Drivetrain"><span class="metric-main compact-metric">${escapeHtml(drivetrainLabel(ctx, product))}</span><span class="metric-sub">${escapeHtml(drivetrainSubline(ctx, product))}</span></div>
    <div class="catalog-cell weight-cell" role="cell" data-label="Weight"><span class="metric-main">${escapeHtml(weightLabel(product))}</span><span class="metric-sub">${escapeHtml(weightSubline(product))}</span></div>
    <div class="catalog-cell frame-cell" role="cell" data-label="Frame"><span class="metric-main">${escapeHtml(frameStandard(product))}${infoTip('Frame details', frameTooltipLines(product))}</span></div>
    <div class="row-link-cell" role="cell"><a class="row-link" href="${url(ctx.base, `/models/${variant.id}/`)}" data-model-link aria-label="View ${escapeAttr(brand.name)} ${escapeAttr(variant.name)} details">›</a></div>
  </div>`;
}

function comparisonSummary(ctx, product) {
  const metric = categoryMetric(product.platform);
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
    priceState: priceState(product),
    priceDetails: priceTooltipLines(ctx, product).join(' '),
    categoryMetric: metric.value,
    categoryMetricLabel: metric.label,
    categoryMetricKind: metric.kind,
    categoryMetricDetails: metric.details.join(' '),
    drivetrain: drivetrainLabel(ctx, product),
    drivetrainSubline: drivetrainSubline(ctx, product),
    weight: weightLabel(product),
    weightSubline: weightSubline(product),
    frame: frameStandard(product),
    category: `${categoryLabel(product.platform.category)} · ${product.platform.handlebar}-bar`,
    internalFrameStorage: product.platform.internal_storage ? 'Yes' : 'No',
    mounts: product.platform.mounts?.join(', ') || 'None recorded',
    manufacturing: `${relationshipLabel(product.brand.manufacturing.relationship)} · ${confidenceLabel(product.brand.manufacturing.confidence)} confidence`,
    availability: availabilityLabel(product.platform.china_availability),
    bestFor: bestForLabel(product).replaceAll(' · ', ', ') || 'Not specified beyond category',
    verdict: product.variant.editorial.verdict,
    caveats: product.variant.editorial.caveats?.join('; ') || 'None recorded'
  };
}

function watchlistNote(ctx) {
  const priorities = new Map([['high', 0], ['medium', 1], ['low', 2]]);
  const sourceById = new Map(ctx.data.sources.map((source) => [source.id, source]));
  const visible = ctx.data.candidates.slice().sort((a, b) => {
    const priority = (priorities.get(a.research_priority) ?? 9) - (priorities.get(b.research_priority) ?? 9);
    if (priority) return priority;
    const reviewed = String(b.last_reviewed).localeCompare(String(a.last_reviewed));
    return reviewed || a.name.localeCompare(b.name);
  }).slice(0, 8);
  const remaining = Math.max(0, ctx.data.candidates.length - visible.length);
  const candidate = (item) => {
    const leads = (item.source_ids ?? []).map((id) => sourceById.get(id)).filter((source) => source?.type === 'community-report' && source.url);
    const evidence = leads.length
      ? `<small class="research-evidence">Community leads: ${leads.map((source) => `<a href="${escapeAttr(source.url)}" rel="noreferrer">${escapeHtml(source.title)}</a>`).join(' · ')}</small>`
      : '';
    return `<div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.why_interesting)}</span><small>Needs: ${escapeHtml(item.missing.join(' · '))}</small>${evidence}</div>`;
  };
  return `<details class="research-note"><summary>Research queue (${ctx.data.candidates.length} models)</summary><p class="research-summary">The structured backlog stays out of ranking until the exact model, current price, category-specific facts, or purchase route is verified. Community links are dated leads, not verified product facts.</p><div class="research-list">${visible.map(candidate).join('')}</div>${remaining ? `<p class="research-footnote">${remaining} more candidates remain in the repository research ledger.</p>` : ''}<p class="research-footnote"><a href="${ctx.repositoryUrl}/issues">Add evidence on GitHub</a>.</p></details>`;
}

function sourceUsages(ctx, product) {
  const sources = new Map(ctx.data.sources.map((source) => [source.id, source]));
  const usages = new Map();
  const add = (ids, role, reliabilityKey) => {
    for (const id of ids ?? []) {
      const source = sources.get(id);
      if (!source) continue;
      const usage = usages.get(id) ?? { source, roles: [] };
      if (!usage.roles.some((item) => item.role === role)) usage.roles.push({ role, reliabilityKey });
      usages.set(id, usage);
    }
  };
  add([...(product.variant.source_ids ?? []), ...(product.platform.source_ids ?? [])], 'Product facts', 'specification');
  add(product.prices.flatMap((price) => price.source_ids ?? []), 'Price', 'price');
  add(product.image?.source_id ? [product.image.source_id] : [], 'Image', 'identity');
  return [...usages.values()];
}

function sourceList(ctx, product) {
  const usages = sourceUsages(ctx, product);
  return `<div class="source-list"><p class="source-intro">Each source is labelled by what it supports. Confidence applies only to that role.</p>${usages.map(({ source, roles }) => {
    const roleLabels = roles.map(({ role }) => role).join(' · ');
    const confidence = roles.map(({ role, reliabilityKey }) => `${role}: ${confidenceLabel(source.reliability?.[reliabilityKey])}`).join(' · ');
    const unavailable = source.url ? '' : source.type === 'project-asset'
      ? '<span class="source-local">Project-owned local asset</span>'
      : '<span class="source-unavailable">Archived evidence; no public link</span>';
    return `<div class="source-item">${source.url ? `<a href="${escapeAttr(source.url)}" rel="noreferrer">${escapeHtml(source.title)}</a>` : `<strong>${escapeHtml(source.title)}</strong>`}<span>${escapeHtml(source.publisher)} · ${escapeHtml(sentenceLabel(source.type))} · ${escapeHtml(roleLabels)}</span><span>${escapeHtml(confidence)} · accessed ${escapeHtml(source.accessed_at)}</span>${unavailable}${source.notes ? `<p>${escapeHtml(source.notes)}</p>` : ''}</div>`;
  }).join('')}</div>`;
}

function videoFormatLabel(value) {
  return {
    'hands-on-review': 'Hands-on review',
    'long-term-review': 'Long-term review',
    'model-overview': 'Model overview',
    'build-and-ride': 'Build and ride'
  }[value] ?? sentenceLabel(value);
}

function videoRelationshipLabel(value) {
  return {
    'retailer-linked': 'Retailer-linked',
    'product-supplied': 'Product supplied',
    'publication-review': 'Publication review',
    'owner-review': 'Owner review'
  }[value] ?? sentenceLabel(value);
}

function videoContext(videos) {
  if (!videos?.length) return '';
  return `<section class="video-context" aria-labelledby="video-context-title">
    <div class="video-intro"><span>Selected video context</span><h2 id="video-context-title">Watch this platform</h2><p>Useful for seeing the bike and hearing ride or build context. The shown build may differ, and video commentary does not verify the current China price, exact BOM, or published specifications.</p></div>
    <div class="video-list">${videos.map((video) => `<article class="video-entry">
      <div class="video-shell" data-video-shell data-youtube-id="${escapeAttr(video.youtube_video_id)}" data-video-title="${escapeAttr(video.title)}">
        <button class="video-load" type="button" data-load-video aria-label="Load ${escapeAttr(video.title)} from YouTube"><span class="video-play" aria-hidden="true">▶</span><span><strong>Load video</strong><small>No YouTube request until you choose</small></span></button>
        <noscript><p>JavaScript is off. <a href="${escapeAttr(video.url)}" rel="noreferrer">Watch on YouTube</a>.</p></noscript>
      </div>
      <div class="video-copy"><div class="video-meta"><span>${escapeHtml(videoFormatLabel(video.format))}</span><span>${escapeHtml(videoRelationshipLabel(video.relationship))}</span></div><h3><a href="${escapeAttr(video.url)}" rel="noreferrer">${escapeHtml(video.title)}</a></h3><p>${escapeHtml(video.summary)}</p><small>${escapeHtml(video.channel_name)}${video.published_at ? ` · ${escapeHtml(video.published_at)}` : ''}. ${escapeHtml(video.disclosure)} <a href="${escapeAttr(video.disclosure_url)}" rel="noreferrer">Disclosure basis</a>.</small></div>
    </article>`).join('')}</div>
  </section>`;
}

function categorySelectOptions(ctx) {
  const canonical = (category) => category === 'gravel-adventure' ? 'adventure-gravel' : category;
  const published = new Set(ctx.products.map((product) => product.platform.category));
  const queued = new Set(ctx.data.candidates.flatMap((candidate) => String(candidate.category ?? '').split('|')).filter(Boolean).map(canonical));
  const categoryOrder = supportedCategories.map(canonical).filter((category, index, all) => all.indexOf(category) === index);
  const families = [
    ['road', 'Road bikes'],
    ['gravel', 'Gravel and all-road'],
    ['mtb', 'Mountain bikes'],
    ['e-road', 'E-road'],
    ['folding', 'Folding'],
    ['triathlon', 'Triathlon / time trial']
  ];
  const groups = families.map(([family, label]) => {
    const familyCategories = categoryOrder.filter((category) => categoryFamily(category) === family);
    const live = familyCategories.filter((category) => published.has(category));
    const research = familyCategories.filter((category) => !published.has(category) && queued.has(category));
    if (!live.length && !research.length) return '';
    if (!live.length) return `<optgroup label="${escapeAttr(label)}"><option disabled>${escapeHtml(label)} — research queue</option></optgroup>`;
    const options = [];
    if (live.length > 1) options.push(`<option value="family:${escapeAttr(family)}">All ${escapeHtml(label.toLowerCase())}</option>`);
    for (const category of live) options.push(`<option value="category:${escapeAttr(category)}">${escapeHtml(categoryLabel(category))}</option>`);
    for (const category of research) options.push(`<option disabled>${escapeHtml(categoryLabel(category))} — research queue</option>`);
    return `<optgroup label="${escapeAttr(label)}">${options.join('')}</optgroup>`;
  }).join('');
  const flatBar = ctx.products.some((product) => product.platform.handlebar === 'flat')
    ? '<optgroup label="Cockpit"><option value="handlebar:flat">Flat-bar bikes</option></optgroup>'
    : '';
  return `${groups}${flatBar}`;
}

function capabilitySelectOptions(ctx) {
  const kinds = new Set(ctx.products.map((product) => categoryMetric(product.platform).kind));
  const options = [];
  if (kinds.has('tire')) options.push('<option value="tire:40">Tire ≥40 mm</option><option value="tire:45">Tire ≥45 mm</option><option value="tire:50">Tire ≥50 mm</option>');
  if (kinds.has('suspension')) options.push('<option value="suspension:100">Suspension ≥100 mm</option><option value="suspension:150">Suspension ≥150 mm</option>');
  if (kinds.has('motor')) options.push('<option value="kind:motor">Motor system</option>');
  if (kinds.has('folding')) options.push('<option value="kind:folding">Folded-size data</option>');
  if (kinds.has('triathlon')) options.push('<option value="kind:triathlon">Triathlon / TT</option>');
  return options.join('');
}

export function renderHome(ctx) {
  const assumption = buildAssumption(ctx);
  const summaries = ctx.products.map((product) => comparisonSummary(ctx, product));
  const body = `<section class="catalog-intro"><div class="page intro-row"><div><h1>Bikes in China</h1><p>Compare China-market bikes and frameset builds by full-bike price, category, components, and evidence.</p></div><div class="assumption-note"><strong>Frameset estimates add ${formatCny(assumption.amount_cny)}</strong>${infoTip('Frameset build assumption', [assumption.summary, `Reviewed ${assumption.reviewed_at}.`])}</div></div></section>
  <section class="catalog-section" id="catalog"><div class="page" data-catalog-root>
    <div class="filter-bar filters-collapsed">
      <div class="filter-primary">
        <div class="search-box"><label class="sr-only" for="catalog-search">Search bikes</label><span aria-hidden="true">⌕</span><input id="catalog-search" type="search" placeholder="Search model, use or drivetrain" autocomplete="off" data-filter-search></div>
        <label class="compact-select category-select"><span>Category</span><select name="category" data-filter-category><option value="">All verified categories</option>${categorySelectOptions(ctx)}</select></label>
        <div class="segmented" role="group" aria-label="Product type" data-type-control><button type="button" data-type-value="" aria-pressed="true">All</button><button type="button" data-type-value="complete-bike" aria-pressed="false">Complete</button><button type="button" data-type-value="frameset" aria-pressed="false">Frame builds</button></div>
      </div>
      <button class="more-filters" type="button" data-more-filters aria-expanded="false" aria-controls="secondary-filters">More filters</button>
      <div class="filter-secondary" id="secondary-filters">
        <label class="compact-select"><span>Max price</span><select name="max-price" data-filter-price><option value="">Any</option><option value="6000">¥6,000</option><option value="8000">¥8,000</option><option value="10000">¥10,000</option><option value="15000">¥15,000</option><option value="20000">¥20,000</option></select></label>
        <label class="compact-select"><span>Capability</span><select name="capability" data-filter-capability><option value="">Any</option>${capabilitySelectOptions(ctx)}</select></label>
        <label class="compact-select"><span>Sort</span><select name="sort" data-sort><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name-asc">Bike: A to Z</option><option value="name-desc">Bike: Z to A</option><option value="capability-desc" disabled>Category fact: high to low</option><option value="capability-asc" disabled>Category fact: low to high</option></select></label>
        <div class="filter-actions"><button class="text-button" type="button" data-copy-catalog-view>Copy view</button><button class="reset-button" type="button" data-reset hidden>Clear</button></div>
      </div>
    </div>

    <section class="inline-compare" id="compare" data-inline-compare tabindex="-1" aria-labelledby="compare-title" hidden>
      <div class="compare-heading"><div><h2 id="compare-title">Compare</h2></div><div><button class="text-button" type="button" data-copy-comparison>Copy link</button><button class="text-button" type="button" data-close-compare>Close</button></div></div>
      <div data-compare-content></div>
    </section>

    <div class="catalog-meta"><span data-result-summary aria-live="polite" hidden><strong data-result-count>${ctx.products.length}</strong> matches<span data-result-context></span><span data-filter-notice></span></span><span>Select two to four bikes to compare</span></div>
    <div class="catalog-table" data-product-list role="table" aria-label="Bike comparison">
      <div class="catalog-head" role="row"><span role="columnheader" aria-label="Select"></span><span role="columnheader" aria-sort="none"><button class="catalog-sort-button" type="button" data-sort-heading="name"><span>Bike</span></button></span><span role="columnheader" aria-sort="ascending"><button class="catalog-sort-button" type="button" data-sort-heading="price"><span>Full-bike price</span></button></span><span role="columnheader" aria-sort="none"><button class="catalog-sort-button" type="button" data-sort-heading="capability" disabled><span data-capability-heading-label>Category fact</span></button></span><span role="columnheader">Drivetrain</span><span role="columnheader">Weight</span><span role="columnheader">Frame</span><span role="columnheader" aria-label="Details"></span></div>
      ${ctx.products.map((product) => productRow(ctx, product)).join('')}
      <div class="empty-state" data-empty hidden>No bikes match these filters.</div>
    </div>
    ${watchlistNote(ctx)}
    <script type="application/json" id="catalog-data">${safeJson(summaries)}</script>
  </div></section>`;
  return page(ctx, { current: 'catalog', path: '/', body });
}

export function renderModel(ctx, product) {
  const { variant, platform, brand, latestPrice, prices, videos } = product;
  const assumption = buildAssumption(ctx);
  const metric = categoryMetric(platform);
  const categoryQuestion = metric.kind === 'tire'
    ? '请提供安装目标外胎后的实测宽度、前叉/后下叉最小净空和轮圈内宽。'
    : metric.kind === 'suspension'
      ? '请提供前后悬挂行程、避震器是否包含、轮径、轴制式和完整车架包内容。'
      : metric.kind === 'motor'
        ? '请提供电机型号和功率、电池容量、助力控制方式、充电器和整车认证信息。'
        : metric.kind === 'folding'
          ? '请提供轮径、折叠尺寸、折叠铰链与锁止件、整车重量和完整 BOM。'
          : metric.kind === 'triathlon'
            ? '请提供计时把/座舱、储物系统、座管角度、轮组规格和适配身材范围。'
            : '请提供几何表、尺码建议、轮组规格和与该类别相关的兼容性信息。';
  const sellerMessage = `请确认 ${brand.name} ${variant.name} 的准确年份、配置和车架批次。请提供：\n1. 车架和前叉准确材料；\n2. ${categoryQuestion}\n3. 五通、桶轴和尾钩标准；\n4. 完整 BOM，不接受未经确认的同级替换；\n5. 车架序列号、国内质保主体和退换条件。`;
  const priceSubline = [variant.kind === 'frameset' ? 'Estimated complete build' : '', priceState(product)].filter(Boolean).join(' · ');
  const brandLabel = `${brand.name}${brand.name_zh ? ` · ${brand.name_zh}` : ''}`;
  const imageAccuracy = accuracyLabel(product.image?.display_accuracy ?? product.image?.subject_accuracy ?? 'illustrative');
  const detailFacts = [
    [metric.label, metric.value, infoTip(`${metric.label} details`, metric.details)],
    ['Drivetrain', drivetrainLabel(ctx, product), ''],
    [weightSubline(product) ? 'Claimed weight' : 'Weight', weightLabel(product), ''],
    ['Frame standard', frameStandard(product), ''],
    ['Category', `${categoryLabel(platform.category)} · ${platform.handlebar}-bar`, ''],
    ['Availability', availabilityLabel(platform.china_availability), '']
  ];
  const body = `<section class="model-page"><div class="page"><a class="back-link" href="${url(ctx.base, '/')}" data-catalog-back>← All bikes</a><div class="model-grid">
    <figure class="model-figure">${productImage(ctx, product, { hero: true })}<figcaption>${escapeHtml(product.image?.credit ?? 'Product image')} · ${escapeHtml(imageAccuracy)}${product.imageSource?.url ? ` · <a href="${escapeAttr(product.imageSource.url)}" rel="noreferrer">source</a>` : ''}</figcaption></figure>
    <div class="model-summary"><div class="model-brand"><a class="model-brand-filter" href="${url(ctx.base, '/')}?brand=${encodeURIComponent(brand.id)}#catalog" aria-label="${escapeAttr(brandLabel)} — show this brand in the catalog">${escapeHtml(brandLabel)}</a>${variant.kind === 'frameset' ? '<span class="type-pill">Frame estimate</span>' : ''}${statusFlag(product)}</div><h1>${escapeHtml(variant.name)}</h1><p class="model-verdict">${escapeHtml(variant.editorial.verdict)}</p><div class="model-price"><strong>${escapeHtml(formatAllInPrice(product))}</strong>${infoTip('Price details', priceTooltipLines(ctx, product))}<span>${escapeHtml(priceSubline)}</span></div><div class="model-actions"><button class="secondary-button model-compare-button" type="button" data-add-to-comparison data-product-id="${escapeAttr(variant.id)}" data-product-name="${escapeAttr(`${brand.name} ${variant.name}`)}">Add to comparison</button><a class="text-button" href="${url(ctx.base, '/')}#catalog" data-model-compare-link>Choose another bike</a></div><dl class="model-facts">${detailFacts.map(([label, value, tip]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}${tip}</dd></div>`).join('')}</dl></div>
  </div>
  <div class="model-content">
    <section class="decision-block"><div><h2>Why consider it</h2><ul>${variant.editorial.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div><div><h2>What to verify</h2><ul>${variant.editorial.caveats.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div></section>
    ${videoContext(videos)}
    <details class="detail-panel"><summary>Frame, category facts, support and manufacturing</summary><div class="detail-panel-body"><dl class="detail-list"><div><dt>Frame material</dt><dd>${escapeHtml(platform.frame.claimed_fiber ?? platform.frame.material)}</dd></div><div><dt>Cable routing</dt><dd>${escapeHtml(sentenceLabel(platform.frame.cable_routing ?? 'Not recorded'))}</dd></div><div><dt>${escapeHtml(metric.label)}</dt><dd>${escapeHtml(metric.value)}</dd></div><div><dt>Category evidence</dt><dd>${escapeHtml(metric.details.join(' ') || 'Not recorded')}</dd></div><div><dt>Internal frame storage</dt><dd>${platform.internal_storage ? 'Yes' : 'No'}</dd></div><div><dt>Mounts</dt><dd>${escapeHtml(platform.mounts?.join(', ') || 'None recorded')}</dd></div><div><dt>Manufacturing relationship</dt><dd>${escapeHtml(relationshipLabel(brand.manufacturing.relationship))}</dd></div><div><dt>Evidence confidence</dt><dd>${escapeHtml(confidenceLabel(brand.manufacturing.confidence))}</dd></div><div><dt>China purchase</dt><dd>${escapeHtml(availabilityLabel(platform.china_availability))}</dd></div><div><dt>Warranty</dt><dd>${escapeHtml(warrantyLabel(brand.china_support.warranty))}</dd></div></dl><p>${escapeHtml(brand.manufacturing.summary)}</p></div></details>
    <details class="detail-panel"><summary>Ask the seller in Chinese</summary><div class="detail-panel-body"><pre id="seller-message"><code>${escapeHtml(sellerMessage)}</code></pre><button class="secondary-button" type="button" data-copy-target="seller-message">Copy message</button></div></details>
    <details class="detail-panel"><summary>Price record and sources</summary><div class="detail-panel-body"><div class="price-records">${prices.map((price) => `<div><strong>${escapeHtml(formatPrice(price))}</strong><span>${escapeHtml(price.observed_at)} · ${escapeHtml(sentenceLabel(price.price_type))} · ${escapeHtml(priceStatusLabel(price.status))}</span>${price.conditions ? `<p>${escapeHtml(price.conditions)}</p>` : ''}</div>`).join('')}</div>${sourceList(ctx, product)}</div></details>
  </div></div></section>`;
  return page(ctx, {
    title: `${brand.name} ${variant.name}`,
    current: variant.kind === 'frameset' ? 'framesets' : 'catalog',
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
  const html = `<h2>What is compared</h2><p>The main list combines complete bikes and frameset-based builds where total cost can be compared honestly. Products are identified by exact category, model, generation, and configuration.</p><h2>Frameset price estimate</h2><p>Each published frameset currently receives the same fixed <strong>${formatCny(assumption.amount_cny)}</strong> allowance for ${escapeHtml(assumption.summary.toLowerCase())} It is an estimate, not a shopping cart or guarantee. Framesets remain candidates when this assumption would be materially misleading.</p><h2>Price details</h2><p>The visible price is the complete-bike price or the estimated complete-build price. The info button contains the underlying frame price, observation date, freshness, record status, conditions, and great-buy reference.</p><h2>Category-specific facts</h2><p>Gravel products expose tire clearance when the evidence supports it. MTB products use suspension travel, e-road products use motor and battery facts, folding products use fold or wheel data, and triathlon products use time-trial fit and storage facts. Unverified fields stay visibly unknown.</p><h2>Video context</h2><p>Selected model videos help buyers see a platform and hear build or ride context. They are secondary editorial material, not authority for a current price, exact BOM, specification, or recommendation. Commercial and product-supply relationships are labelled.</p><h2>Materials and manufacturing</h2><p>For carbon products, fiber labels such as T700, T800, or T1000 are not quality scores. Lay-up, compaction, curing, alignment, testing, traceability, and support matter more. Missing evidence increases uncertainty; it does not automatically mean a product is poor.</p><h2>Corrections</h2><p>Each change should identify the exact model or generation and include a source. <a href="${ctx.repositoryUrl}/issues">Submit a correction or price sighting on GitHub</a>.</p>`;
  return prosePage(ctx, { title: 'Methodology', desc: 'How prices, frameset estimates, specifications, and evidence are handled.', path: '/methodology/', current: 'methodology', html });
}

export function renderPrivacy(ctx) {
  const html = `<h2>Static site</h2><p>The site has no account, analytics, advertising tracker, newsletter, payment system, or backend. Bike selections are stored only in the visitor’s browser.</p><h2>Product images</h2><p>Some product photos load from their credited manufacturer or retailer host. The host receives a normal image request. Images use <code>referrerpolicy="no-referrer"</code>, and a local placeholder appears when a source image fails.</p><h2>Optional videos</h2><p>Model pages do not contact YouTube when they first load. A video request is made to YouTube’s privacy-enhanced <code>youtube-nocookie.com</code> embed only after the visitor presses “Load video”; videos do not autoplay. The separate “Watch on YouTube” link opens YouTube directly.</p><h2>Public contributions</h2><p>GitHub issues and pull requests are public. Remove names, account details, addresses, order IDs, payment information, faces, license plates, and location metadata before submitting screenshots or photos.</p>`;
  return prosePage(ctx, { title: 'Privacy', desc: 'No accounts or analytics; optional third-party media is disclosed.', path: '/privacy/', html });
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
