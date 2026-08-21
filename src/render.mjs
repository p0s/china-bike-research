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
  formatRange,
  freshness,
  joinCatalogCandidates,
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

function responsiveImage(image, { hero = false, comparison = false } = {}) {
  const variants = image?.hosting?.variants;
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const sorted = [...variants].sort((a, b) => a.width - b.width);
  const largest = sorted.at(-1);
  return {
    width: largest.width,
    height: largest.height,
    srcset: sorted.map((variant) => `${variant.url} ${variant.width}w`).join(', '),
    sizes: comparison
      ? '120px'
      : hero
        ? '(max-width: 720px) calc(100vw - 24px), 680px'
        : '(max-width: 720px) 132px, 156px'
  };
}

function responsiveAttributes(image, options) {
  const responsive = responsiveImage(image, options);
  if (!responsive) return { width: 1200, height: 800, attributes: '' };
  return {
    ...responsive,
    attributes: ` srcset="${escapeAttr(responsive.srcset)}" sizes="${escapeAttr(responsive.sizes)}"`
  };
}

function comparisonImageFields(image) {
  const responsive = responsiveImage(image, { comparison: true });
  return responsive ? {
    imageSrcset: responsive.srcset,
    imageSizes: responsive.sizes,
    imageWidth: responsive.width,
    imageHeight: responsive.height
  } : {};
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

function imageUsageLabel(image) {
  return image?.rights?.status === 'public-post-quotation'
    ? 'Compressed editorial quotation; no license asserted'
    : '';
}

function imageElement(ctx, product, { hero = false, className = '' } = {}) {
  const fallback = fallbackImage(ctx, product);
  const placeholder = product.image?.media_type === 'project-placeholder';
  const source = placeholder ? fallback : imageUrl(ctx, product.image) || fallback;
  const alt = placeholder
    ? `Illustrated placeholder for ${product.brand.name} ${product.variant.name}; verified product photo unavailable`
    : product.image?.alt ?? `${product.brand.name} ${product.variant.name}`;
  const remote = !placeholder && product.image?.hosting.mode === 'remote';
  const classes = [className, placeholder ? 'is-placeholder' : ''].filter(Boolean).join(' ');
  const responsive = responsiveAttributes(placeholder ? null : product.image, { hero });
  return `<img class="${escapeAttr(classes)}" src="${escapeAttr(source)}"${responsive.attributes} alt="${escapeAttr(alt)}" width="${responsive.width}" height="${responsive.height}" ${hero ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async"${remote ? ' referrerpolicy="no-referrer"' : ''} data-product-image data-fallback="${escapeAttr(fallback)}">`;
}

function candidateFallback(ctx, entry) {
  return url(ctx.base, entry.kind === 'frameset'
    ? '/assets/images/placeholders/frameset.svg'
    : '/assets/images/placeholders/complete-bike.svg');
}

function candidateImageElement(ctx, entry, { hero = false, image = entry.image, className = '', decorative = false, galleryHero = false } = {}) {
  const fallback = candidateFallback(ctx, entry);
  const placeholder = image?.media_type === 'project-placeholder';
  const source = placeholder ? fallback : imageUrl(ctx, image) || fallback;
  const alt = decorative
    ? ''
    : placeholder
    ? `Illustrated placeholder for ${entry.candidate.name}; verified product photo unavailable`
    : image?.alt ?? `${entry.candidate.name} candidate image`;
  const remote = !placeholder && image?.hosting.mode === 'remote';
  const classes = [className, placeholder ? 'is-placeholder' : ''].filter(Boolean).join(' ');
  const responsive = responsiveAttributes(placeholder ? null : image, { hero });
  return `<img${classes ? ` class="${escapeAttr(classes)}"` : ''} src="${escapeAttr(source)}"${responsive.attributes} alt="${escapeAttr(alt)}" width="${responsive.width}" height="${responsive.height}" ${hero ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async"${remote ? ' referrerpolicy="no-referrer"' : ''}${decorative ? ' aria-hidden="true"' : ''}${galleryHero ? ' data-gallery-hero' : ''} data-product-image data-fallback="${escapeAttr(fallback)}">`;
}

function candidateImage(ctx, entry) {
  if (!entry.image) return '';
  const accuracy = entry.image.subject_accuracy ?? 'illustrative';
  const needsNote = !['exact-variant', 'exact-platform'].includes(accuracy);
  const detailUrl = url(ctx.base, `/models/${entry.candidate.id}/`);
  const visual = `<a class="product-image-link" href="${detailUrl}" data-model-link aria-label="View ${escapeAttr(entry.candidate.name)} research profile">${candidateImageElement(ctx, entry)}</a>`;
  return `<span class="product-image">${visual}${needsNote ? `<span class="image-info">${infoTip('About this image', [accuracyLabel(accuracy), entry.image.display_note ?? 'The image identifies the model but may not show the exact listed components.'])}</span>` : ''}</span>`;
}

function candidateGalleryFigure(ctx, entry) {
  const primary = entry.image;
  const images = [primary, ...(entry.galleryImages ?? [])].filter(Boolean);
  const primaryAccuracy = accuracyLabel(primary?.display_accuracy ?? primary?.subject_accuracy ?? 'illustrative');
  const primarySource = entry.imageSource;
  if (images.length < 2) {
    const usage = imageUsageLabel(primary);
    return `<figure class="model-figure"><span class="product-image hero-image">${candidateImageElement(ctx, entry, { hero: true })}</span><figcaption><span data-image-caption-status>${escapeHtml(primary?.credit ?? 'Project placeholder')} · ${escapeHtml(primaryAccuracy)}${usage ? ` · ${escapeHtml(usage)}` : ''}</span>${primarySource?.url ? ` · <a href="${escapeAttr(primarySource.url)}" rel="noreferrer">source</a>` : ''}</figcaption></figure>`;
  }

  const imageSource = (image) => image === primary ? primarySource : image.source;
  const caption = (image, index) => [
    image.credit ?? 'Product image',
    accuracyLabel(image.display_accuracy ?? image.subject_accuracy ?? 'illustrative'),
    imageUsageLabel(image),
    `${image.label ?? `View ${index + 1}`} (${index + 1} of ${images.length})`
  ].filter(Boolean).join(' · ');
  const thumbs = images.map((image, index) => {
    const source = imageSource(image);
    const accuracy = accuracyLabel(image.display_accuracy ?? image.subject_accuracy ?? 'illustrative');
    return `<button class="gallery-thumb" type="button" aria-label="Show ${escapeAttr(image.label ?? `product image ${index + 1}`)} — ${escapeAttr(accuracy)}" aria-pressed="${index === 0}" data-gallery-thumb data-gallery-src="${escapeAttr(imageUrl(ctx, image))}" data-gallery-alt="${escapeAttr(image.alt ?? entry.candidate.name)}" data-gallery-caption="${escapeAttr(caption(image, index))}" data-gallery-source="${escapeAttr(source?.url ?? '')}" data-gallery-remote="${image.hosting?.mode === 'remote'}"${image.display_note ? ` title="${escapeAttr(image.display_note)}"` : ''}>${candidateImageElement(ctx, entry, { image, className: 'gallery-thumb-image', decorative: true })}</button>`;
  }).join('');
  return `<figure class="model-figure model-gallery" data-image-gallery><span class="product-image hero-image">${candidateImageElement(ctx, entry, { hero: true, className: 'gallery-hero-image', galleryHero: true })}</span><div class="model-gallery-strip" role="group" aria-label="Product image views">${thumbs}</div><figcaption aria-live="polite"><span data-image-caption-status data-gallery-caption>${escapeHtml(caption(primary, 0))}</span>${primarySource?.url ? ` · <a href="${escapeAttr(primarySource.url)}" rel="noreferrer" data-gallery-source-link>source</a>` : '<a href="#" rel="noreferrer" data-gallery-source-link hidden>source</a>'}</figcaption></figure>`;
}

function infoTip(label, lines, attributes = {}) {
  const content = JSON.stringify(lines.filter(Boolean).map(String));
  const extra = Object.entries(attributes)
    .map(([name, value]) => ` ${escapeAttr(name)}="${escapeAttr(value)}"`)
    .join('');
  return `<span class="tooltip"><button class="info-button" type="button" aria-label="${escapeAttr(label)}" aria-expanded="false" aria-controls="shared-tooltip" data-tooltip-lines="${escapeAttr(content)}"${extra}><span aria-hidden="true">i</span></button></span>`;
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
    'discontinued-superseded': 'discontinued; superseded by the 2025 Gravel V3',
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
    'historical-superseded': 'historical price for a superseded model',
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
    'historical-superseded': 'Historical · superseded',
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

function platformIsSuperseded(product) {
  return product.platform.status === 'superseded';
}

function successorLabel(record, fallback = 'newer generation') {
  return record?.successor?.label ?? fallback;
}

function publishedPriceLabel(product) {
  return platformIsSuperseded(product) ? 'Not sold new' : formatAllInPrice(product);
}

function publishedPriceState(product) {
  return platformIsSuperseded(product)
    ? `Superseded by ${successorLabel(product.platform)}`
    : priceState(product);
}

function priceTooltipLines(ctx, product) {
  const { variant, latestPrice, allInPrice } = product;
  const fresh = freshness(latestPrice?.observed_at, ctx.now);
  const threshold = platformIsSuperseded(product) ? null : variant.editorial.price_thresholds_cny?.great_buy_below;
  const lines = [];
  if (platformIsSuperseded(product)) lines.push(`This version is no longer sold new and was superseded by the ${successorLabel(product.platform)}.`);
  if (variant.kind === 'frameset') {
    lines.push(`Frameset price: ${formatPrice(latestPrice)}.`);
    lines.push(`Estimated complete adds a fixed ${formatCny(allInPrice.buildAmount)} ${buildAssumption(ctx).label}.`);
    if (variant.included?.length) lines.push(`Recorded package includes: ${variant.included.join(', ')}.`);
    if (threshold) lines.push(`Great-buy reference: below ${formatCny(threshold + allInPrice.buildAmount)} complete (${formatCny(threshold)} frameset).`);
  } else if (threshold) {
    lines.push(`Great-buy reference: below ${formatCny(threshold)}.`);
  }
  if (latestPrice?.observed_at) {
    lines.push(latestPrice.status?.startsWith('historical')
      ? `Historical price observed ${latestPrice.observed_at}.`
      : `Price observed ${latestPrice.observed_at}; ${fresh.label.toLowerCase()} as of this snapshot.`);
  }
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
    if (product.variant.claimed_complete_weight_g) return `${(product.variant.claimed_complete_weight_g / 1000).toFixed(1)} kg`;
    return product.variant.claimed_frame_weight_g
      ? `${new Intl.NumberFormat('en-US').format(product.variant.claimed_frame_weight_g)} g frame`
      : '—';
  }
  return product.platform.frame.claimed_frame_weight_g
    ? `${new Intl.NumberFormat('en-US').format(product.platform.frame.claimed_frame_weight_g)} g frame`
    : '—';
}

function weightSubline(product) {
  if (product.variant.kind === 'complete-bike') {
    if (product.variant.claimed_complete_weight_g) return 'Claimed';
    return product.variant.claimed_frame_weight_g ? 'Claimed frame weight' : '';
  }
  return product.platform.frame.claimed_frame_weight_g ? 'Claimed frame weight' : '';
}

function frameStandard(product) {
  const frame = product.platform.frame;
  const parts = [];
  if (frame.bottom_bracket && frame.bottom_bracket !== 'unknown') parts.push(frame.bottom_bracket);
  if (frame.derailleur_hanger === 'UDH') parts.push('UDH');
  return parts.join(' · ') || '—';
}

function componentDescription(component) {
  if (!component) return '';
  if (typeof component === 'string') return component;
  if (component.description) return component.description;
  const values = [
    component.rim_material ? `${sentenceLabel(component.rim_material)} rims` : '',
    Number.isFinite(component.depth_mm) ? `${component.depth_mm} mm depth` : '',
    component.dimensions ?? '',
    component.material ? `${sentenceLabel(component.material)}${component.integrated ? ' integrated' : ''}` : '',
    component.flare ? 'flared' : ''
  ].filter(Boolean);
  return values.join(' · ');
}

function geometrySummary(platform) {
  const sizes = platform.frame?.geometry?.sizes;
  if (!Array.isArray(sizes) || sizes.length === 0) return '';
  const first = sizes[0];
  const last = sizes.at(-1);
  const reach = sizes.map((size) => size.reach_mm).filter(Number.isFinite);
  const stack = sizes.map((size) => size.stack_mm).filter(Number.isFinite);
  const parts = [`${sizes.length} sizes (${first.size}–${last.size})`];
  if (stack.length === sizes.length) parts.push(`stack ${Math.min(...stack)}–${Math.max(...stack)} mm`);
  if (reach.length === sizes.length) parts.push(`reach ${Math.min(...reach)}–${Math.max(...reach)} mm`);
  return parts.join(' · ');
}

function publishedSpecificationRows(product) {
  const frameWeight = product.variant.claimed_frame_weight_g
    ?? product.platform.frame?.claimed_frame_weight_g;
  const rows = [
    ['Bottom bracket', product.platform.frame?.bottom_bracket === 'unknown' ? '' : product.platform.frame?.bottom_bracket],
    ['Claimed frame weight', Number.isFinite(frameWeight) ? `${new Intl.NumberFormat('en-US').format(frameWeight)} g` : ''],
    ['Included package', product.variant.kind === 'frameset' ? product.variant.included?.join(', ') : ''],
    ['Wheels', componentDescription(product.variant.wheels)],
    ['Tires', product.variant.tires],
    ['Cockpit', componentDescription(product.variant.cockpit)],
    ['Fit range', geometrySummary(product.platform)],
    ['Purchase route', product.variant.purchase_route]
  ];
  return rows.filter(([, value]) => value);
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
  const superseded = platformIsSuperseded(product);
  const bestFor = bestForLabel(product);
  const brandLabel = `${brand.name}${brand.name_zh ? ` · ${brand.name_zh}` : ''}`;
  const framesetData = variant.kind === 'frameset'
    ? ` data-frame-price-low="${allInPrice.frameLow}" data-frame-price-high="${allInPrice.frameHigh}"`
    : '';
  const priceTipAttributes = variant.kind === 'frameset'
    ? { 'data-frameset-price-tip': '', 'data-frame-threshold': variant.editorial.price_thresholds_cny?.great_buy_below ?? '' }
    : {};
  return `<div class="catalog-row" role="row" data-product-row data-id="${escapeAttr(variant.id)}" data-brand="${escapeAttr(brand.id)}" data-search="${escapeAttr(searchable)}" data-type="${escapeAttr(variant.kind)}" data-family="${escapeAttr(categoryFamily(platform.category))}" data-category="${escapeAttr(platform.category)}" data-handlebar="${escapeAttr(platform.handlebar)}" data-price-sort="${superseded ? '' : allInPrice.midpoint}" data-price-filter="${superseded ? '' : allInPrice.high ?? ''}" data-capability-sort="${metric.sortValue}" data-capability-kind="${escapeAttr(metric.kind)}" data-name="${escapeAttr(`${brand.name} ${variant.name}`.toLowerCase())}"${framesetData}>
    <div class="compare-toggle" role="cell"><label><input type="checkbox" data-compare-id="${escapeAttr(variant.id)}"><span aria-hidden="true"></span><span class="sr-only">Select ${escapeHtml(brand.name)} ${escapeHtml(variant.name)} for comparison</span></label></div>
    <div class="catalog-product" role="cell">
      ${productImage(ctx, product, { href: url(ctx.base, `/models/${variant.id}/`) })}
      <span class="product-copy">
        <span class="product-meta"><button class="catalog-brand-filter" type="button" data-brand-filter="${escapeAttr(brand.id)}" aria-pressed="false" aria-label="${escapeAttr(brandLabel)} — filter catalog to this brand">${escapeHtml(brandLabel)}</button>${variant.kind === 'frameset' ? '<span class="type-pill">Frame estimate</span>' : ''}${recommendationBadge(recommendation)}${statusFlag(product)}</span>
        <strong class="product-name"><a href="${url(ctx.base, `/models/${variant.id}/`)}" data-model-link>${escapeHtml(variant.name)}</a></strong>
        ${bestFor ? `<span class="product-fit"><span>Best for</span> ${escapeHtml(bestFor)}</span>` : ''}
      </span>
    </div>
    <div class="catalog-cell price-cell" role="cell" data-label="Price"><span class="metric-main"><span data-calculated-price>${escapeHtml(publishedPriceLabel(product))}</span>${infoTip('Price details', priceTooltipLines(ctx, product), priceTipAttributes)}</span><span class="metric-sub price-state ${priceStateClass(product)}">${escapeHtml(publishedPriceState(product))}</span></div>
    <div class="catalog-cell capability-cell" role="cell" data-label="${escapeAttr(metric.label)}"><span class="metric-main">${escapeHtml(metric.value)}${infoTip(`${metric.label} details`, metric.details)}</span></div>
    <div class="catalog-cell drivetrain-cell" role="cell" data-label="Drivetrain"><span class="metric-main compact-metric">${escapeHtml(drivetrainLabel(ctx, product))}</span><span class="metric-sub">${escapeHtml(drivetrainSubline(ctx, product))}</span></div>
    <div class="catalog-cell weight-cell" role="cell" data-label="Weight"><span class="metric-main">${escapeHtml(weightLabel(product))}</span><span class="metric-sub">${escapeHtml(weightSubline(product))}</span></div>
    <div class="catalog-cell frame-cell" role="cell" data-label="Frame"><span class="metric-main">${escapeHtml(frameStandard(product))}${infoTip('Frame details', frameTooltipLines(product))}</span></div>
    <div class="row-link-cell" role="cell"><a class="row-link" href="${url(ctx.base, `/models/${variant.id}/`)}" data-model-link aria-label="View ${escapeAttr(brand.name)} ${escapeAttr(variant.name)} details">›</a></div>
  </div>`;
}

function candidateMetric(entry) {
  const category = entry.category;
  const family = categoryFamily(category);
  const kind = family === 'gravel'
    ? 'tire'
    : family === 'mtb'
      ? 'suspension'
      : category === 'e-road'
        ? 'motor'
        : category === 'folding'
          ? 'folding'
          : category === 'triathlon'
            ? 'triathlon'
            : 'discipline';
  const label = kind === 'tire'
    ? 'Tire'
    : kind === 'suspension'
      ? 'Suspension'
      : kind === 'motor'
        ? 'Motor'
        : kind === 'folding'
          ? 'Fold'
          : kind === 'triathlon'
            ? 'Format'
            : 'Use';
  const tireClearance = entry.candidate.facts?.tire_clearance_mm;
  return {
    label,
    value: kind === 'tire' && Number.isFinite(tireClearance) ? `${tireClearance} mm` : category ? categoryLabel(category) : '—',
    sortValue: kind === 'tire' && Number.isFinite(tireClearance) ? tireClearance : 0,
    kind,
    details: kind === 'tire' && Number.isFinite(tireClearance) ? 'Official maximum tire clearance.' : ''
  };
}

function candidatePriceBounds(entry) {
  if (!entry.price) return {};
  const low = entry.price.amount_cny ?? entry.price.low_cny;
  const high = entry.price.amount_cny ?? entry.price.high_cny ?? low;
  return { low, high };
}

function candidateFramePriceTerm(entry) {
  return /package|cockpit|accessor/i.test(entry.price?.price_basis ?? '') ? 'Frame package' : 'Frame';
}

function candidatePriceLabel(ctx, entry) {
  if (!entry.price) return entry.candidate.status === 'superseded' ? 'Not sold new' : '—';
  if (entry.kind !== 'frameset') {
    const price = formatPrice(entry.price);
    return entry.price.price_type === 'reference-conversion' ? `Est. ${price}` : price;
  }
  const { low, high } = candidatePriceBounds(entry);
  if (!Number.isFinite(low)) return '—';
  const allowance = buildAssumption(ctx).amount_cny;
  return formatRange(low + allowance, high + allowance, { estimated: true });
}

function candidatePriceState(entry) {
  if (!entry.price) {
    return entry.candidate.status === 'superseded'
      ? `Superseded by ${successorLabel(entry.candidate)}`
      : '';
  }
  const priceType = entry.price.price_type ?? '';
  const basis = priceType === 'reference-conversion'
    ? 'Official FX estimate'
    : priceType === 'official-conflict'
      ? 'Official price conflict'
      : entry.priceKind === 'official' || priceType.startsWith('official-') ? 'Official' : 'Observed';
  const framePrice = entry.kind === 'frameset' ? `${candidateFramePriceTerm(entry)} ${formatPrice(entry.price)}` : '';
  return [framePrice, basis, entry.price.observed_at].filter(Boolean).join(' · ');
}

function candidatePriceRecordLabel(entry) {
  const priceType = entry.price?.price_type ?? '';
  if (priceType === 'reference-conversion') return 'Official FX estimate';
  if (priceType === 'official-conflict') return 'Official price conflict';
  if (entry.priceKind === 'official' || priceType.startsWith('official-')) return 'Official reference';
  return 'Observed market record';
}

function candidatePackageOverlapNote(entry) {
  if (entry.kind !== 'frameset' || !entry.price) return '';
  const basis = `${entry.price.price_basis ?? ''} ${entry.price.conditions ?? ''}`;
  const included = [];
  if (/cockpit|handlebar/i.test(basis)) included.push('cockpit/handlebar');
  if (/accessor/i.test(basis)) included.push('accessories');
  if (/seatpost/i.test(basis)) included.push('seatpost');
  if (!included.length) return '';
  return `The recorded package mentions ${included.join(' and ')}; adjust the allowance to avoid double-counting included parts.`;
}

function candidateRow(ctx, entry) {
  const { candidate, brand } = entry;
  const metric = candidateMetric(entry);
  const facts = candidate.facts ?? {};
  const searchable = [
    candidate.name,
    brand?.name,
    brand?.name_zh,
    facts.drivetrain,
    facts.frame,
    facts.bottom_bracket,
    ...entry.categories.map(categoryLabel)
  ].filter(Boolean).join(' ').toLowerCase();
  const detailUrl = url(ctx.base, `/models/${candidate.id}/`);
  const sourceName = `<a href="${detailUrl}" data-model-link>${escapeHtml(candidate.name)}</a>`;
  const { low: frameLow, high: frameHigh } = candidatePriceBounds(entry);
  const allowance = buildAssumption(ctx).amount_cny;
  const isPricedFrameset = entry.kind === 'frameset' && Number.isFinite(frameLow);
  const priceHigh = entry.kind === 'complete-bike'
    ? entry.price?.amount_cny ?? entry.price?.high_cny ?? entry.price?.low_cny ?? ''
    : isPricedFrameset ? frameHigh + allowance : '';
  const priceSort = Number.isFinite(entry.priceMidpoint)
    ? entry.priceMidpoint + (isPricedFrameset ? allowance : 0)
    : '';
  const framePriceData = isPricedFrameset
    ? ` data-frame-price-low="${frameLow}" data-frame-price-high="${frameHigh}"`
    : '';
  const priceLabelData = isPricedFrameset ? ' data-calculated-price' : '';
  const type = entry.kind === 'frameset' ? '<span class="type-pill">Frameset</span>' : '';
  const brandLabel = brand ? `${brand.name}${brand.name_zh ? ` · ${brand.name_zh}` : ''}` : '';
  const brandButton = brand
    ? `<button class="catalog-brand-filter" type="button" data-brand-filter="${escapeAttr(brand.id)}" aria-pressed="false" aria-label="${escapeAttr(brandLabel)} — filter catalog to this brand">${escapeHtml(brandLabel)}</button>`
    : '';
  const weight = Number.isFinite(facts.complete_weight_g)
    ? `${(facts.complete_weight_g / 1000).toFixed(1)} kg`
    : entry.kind === 'frameset' && Number.isFinite(facts.frame_weight_g)
      ? `${new Intl.NumberFormat('en-US').format(facts.frame_weight_g)} g frame`
      : '—';
  const weightState = Number.isFinite(facts.complete_weight_g) ? '<span class="metric-sub">Claimed</span>' : '';
  const frame = facts.frame ?? candidate.manufacturing ?? '—';
  return `<div class="catalog-row is-candidate" role="row" data-product-row data-stage="candidate" data-default-visible="${entry.defaultVisible}" data-id="${escapeAttr(entry.id)}" data-brand="${escapeAttr(brand?.id ?? '')}" data-search="${escapeAttr(searchable)}" data-type="${escapeAttr(entry.kind)}" data-family="${escapeAttr(categoryFamily(entry.category))}" data-category="${escapeAttr(entry.categories.join('|'))}" data-handlebar="" data-price-sort="${priceSort}" data-price-filter="${priceHigh}"${framePriceData} data-capability-sort="${metric.sortValue}" data-capability-kind="${escapeAttr(metric.kind)}" data-name="${escapeAttr(candidate.name.toLowerCase())}"${entry.defaultVisible ? '' : ' hidden'}>
    <div class="compare-toggle" role="cell"><label><input type="checkbox" data-compare-id="${escapeAttr(entry.id)}"><span aria-hidden="true"></span><span class="sr-only">Select ${escapeHtml(candidate.name)} for comparison</span></label></div>
    <div class="catalog-product" role="cell">
      ${candidateImage(ctx, entry)}
      <span class="product-copy">
        ${brandButton || type ? `<span class="product-meta">${brandButton}${type}</span>` : ''}
        <strong class="product-name">${sourceName}</strong>
        ${entry.category ? `<span class="product-fit">${escapeHtml(entry.categories.map(categoryLabel).join(' · '))}</span>` : ''}
      </span>
    </div>
    <div class="catalog-cell price-cell" role="cell" data-label="Full-bike price"><span class="metric-main"${priceLabelData}>${escapeHtml(candidatePriceLabel(ctx, entry))}</span><span class="metric-sub price-state">${escapeHtml(candidatePriceState(entry))}</span></div>
    <div class="catalog-cell capability-cell" role="cell" data-label="${escapeAttr(metric.label)}"><span class="metric-main">${escapeHtml(metric.value)}</span></div>
    <div class="catalog-cell drivetrain-cell" role="cell" data-label="Drivetrain">${escapeHtml(facts.drivetrain ?? '—')}</div>
    <div class="catalog-cell weight-cell" role="cell" data-label="Weight">${escapeHtml(weight)}${weightState}</div>
    <div class="catalog-cell frame-cell" role="cell" data-label="Frame">${escapeHtml(frame)}</div>
    <div class="row-link-cell" role="cell"><a href="${detailUrl}" data-model-link aria-label="View ${escapeAttr(candidate.name)} research profile">→</a></div>
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
    imageRemote: product.image?.hosting.mode === 'remote',
    ...comparisonImageFields(product.image),
    type: product.variant.kind === 'frameset' ? 'Frame estimate' : 'Complete bike',
    price: publishedPriceLabel(product),
    estimated: product.allInPrice.estimated,
    frameLow: product.allInPrice.frameLow,
    frameHigh: product.allInPrice.frameHigh,
    greatBuyFrameThreshold: platformIsSuperseded(product) ? null : product.variant.editorial.price_thresholds_cny?.great_buy_below ?? null,
    priceState: publishedPriceState(product),
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

function candidateComparisonSummary(ctx, entry) {
  const metric = candidateMetric(entry);
  const { low: frameLow, high: frameHigh } = candidatePriceBounds(entry);
  const estimated = entry.kind === 'frameset' && Number.isFinite(frameLow);
  const assumption = buildAssumption(ctx);
  const fallback = candidateFallback(ctx, entry);
  const image = imageUrl(ctx, entry.image) || fallback;
  const facts = entry.candidate.facts ?? {};
  const weight = Number.isFinite(facts.complete_weight_g)
    ? `${(facts.complete_weight_g / 1000).toFixed(1)} kg`
    : entry.kind === 'frameset' && Number.isFinite(facts.frame_weight_g)
      ? `${new Intl.NumberFormat('en-US').format(facts.frame_weight_g)} g frame`
      : '—';
  const priceDetails = entry.candidate.status === 'superseded'
    ? candidatePublicText(entry.candidate.availability_note)
    : estimated
    ? `Frameset price: ${formatPrice(entry.price)}. Estimated complete adds a fixed ${formatCny(assumption.amount_cny)} ${assumption.label}.`
    : entry.candidate.source_note ?? '';
  const frame = facts.frame ?? entry.candidate.manufacturing;
  return {
    id: entry.id,
    url: url(ctx.base, `/models/${entry.candidate.id}/`),
    name: entry.candidate.name,
    image,
    imageRemote: entry.image?.hosting.mode === 'remote',
    ...comparisonImageFields(entry.image),
    type: entry.kind === 'frameset' ? 'Frame estimate' : entry.kind === 'complete-bike' ? 'Complete bike' : 'Bike',
    price: candidatePriceLabel(ctx, entry),
    estimated,
    frameLow: estimated ? frameLow : null,
    frameHigh: estimated ? frameHigh : null,
    priceState: candidatePriceState(entry),
    ...(priceDetails ? { priceDetails } : {}),
    categoryMetric: metric.value,
    categoryMetricLabel: metric.label,
    categoryMetricKind: metric.kind,
    ...(facts.drivetrain ? { drivetrain: facts.drivetrain } : {}),
    ...(weight !== '—' ? { weight } : {}),
    ...(Number.isFinite(facts.complete_weight_g) ? { weightSubline: 'Claimed' } : {}),
    ...(frame ? { frame } : {}),
    category: entry.categories.map(categoryLabel).join(' · ') || '—',
    ...(entry.candidate.manufacturing ? { manufacturing: entry.candidate.manufacturing } : {})
  };
}

function candidatePublicText(value) {
  return String(value ?? '')
    .replace(/seller\/authenticity and final checkout price/gi, 'Authenticity, final checkout price, and purchase terms')
    .replace(/current seller/gi, 'Current purchase route')
    .replace(/written by seller/gi, 'stated by the purchase source')
    .replace(/seller photo/gi, 'listing photo')
    .replace(/seller/gi, 'purchase source')
    .replace(/;\s*verify\s+/gi, '; ')
    .replace(/\bverify\s+/gi, 'Confirm ')
    .trim();
}

function candidateFactRows(entry) {
  const labels = {
    drivetrain: 'Drivetrain',
    brakes: 'Brakes',
    frame: 'Frame',
    bottom_bracket: 'Bottom bracket',
    wheels: 'Wheels',
    tires: 'Tires',
    cockpit: 'Cockpit',
    sizes: 'Sizes',
    storage: 'Storage',
    mounts: 'Mounts',
    complete_weight_g: 'Claimed complete weight',
    frame_weight_g: 'Claimed frame weight',
    tire_clearance_mm: 'Tire clearance'
  };
  return Object.entries(entry.candidate.facts ?? {}).map(([key, value]) => {
    const formatted = key === 'complete_weight_g'
      ? `${(value / 1000).toFixed(1)} kg`
      : key === 'frame_weight_g'
        ? `${new Intl.NumberFormat('en-US').format(value)} g`
        : key === 'tire_clearance_mm'
          ? `${value} mm`
          : value;
    return [labels[key] ?? sentenceLabel(key), String(formatted)];
  });
}

function candidateSourceList(entry) {
  const sources = new Map((entry.sources ?? []).map((source) => [source.id, source]));
  if (entry.imageSource) sources.set(entry.imageSource.id, entry.imageSource);
  const directUrl = entry.candidate.source_url;
  const directLink = directUrl && ![...sources.values()].some((source) => source.url === directUrl)
    ? `<p class="source-direct-link">Direct candidate link: <a href="${escapeAttr(directUrl)}" rel="noreferrer">open recorded source</a></p>`
    : '';
  if (!sources.size && !directLink) return '<p class="source-intro">No public source link is recorded yet.</p>';
  return `<div class="source-list"><p class="source-intro">These sources support this research-stage profile; individual claims retain the confidence of their cited source.</p>${directLink}${[...sources.values()].map((source) => {
    const confidence = ['identity', 'specification', 'price']
      .filter((key) => source.reliability?.[key])
      .map((key) => `${sentenceLabel(key)}: ${confidenceLabel(source.reliability[key])}`)
      .join(' · ');
    const unavailable = source.url ? '' : '<span class="source-unavailable">Archived evidence; no public link</span>';
    return `<div class="source-item">${source.url ? `<a href="${escapeAttr(source.url)}" rel="noreferrer">${escapeHtml(source.title)}</a>` : `<strong>${escapeHtml(source.title)}</strong>`}<span>${escapeHtml(source.publisher)} · ${escapeHtml(sentenceLabel(source.type))}</span>${confidence ? `<span>${escapeHtml(confidence)} · accessed ${escapeHtml(source.accessed_at)}</span>` : `<span>Accessed ${escapeHtml(source.accessed_at)}</span>`}${unavailable}${source.notes ? `<p>${escapeHtml(candidatePublicText(source.notes))}</p>` : ''}</div>`;
  }).join('')}</div>`;
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

function categorySelectOptions(ctx, candidates) {
  const canonical = (category) => category === 'gravel-adventure' ? 'adventure-gravel' : category;
  const available = new Set([
    ...ctx.products.map((product) => product.platform.category),
    ...candidates.flatMap((entry) => entry.categories)
  ].map(canonical));
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
    const live = categoryOrder.filter((category) => categoryFamily(category) === family && available.has(category));
    if (!live.length) return '';
    const options = [];
    if (live.length > 1) options.push(`<option value="family:${escapeAttr(family)}">All ${escapeHtml(label.toLowerCase())}</option>`);
    for (const category of live) options.push(`<option value="category:${escapeAttr(category)}">${escapeHtml(categoryLabel(category))}</option>`);
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
  const candidates = joinCatalogCandidates(ctx.data);
  const defaultCandidateCount = candidates.filter((entry) => entry.defaultVisible).length;
  const summaries = [
    ...ctx.products.map((product) => comparisonSummary(ctx, product)),
    ...candidates.map((entry) => candidateComparisonSummary(ctx, entry))
  ];
  const rows = [
    ...ctx.products.map((product) => ({
      price: platformIsSuperseded(product) ? Number.POSITIVE_INFINITY : product.allInPrice.midpoint,
      html: productRow(ctx, product)
    })),
    ...candidates.map((entry) => ({
      price: entry.priceMidpoint + (entry.kind === 'frameset' && Number.isFinite(entry.priceMidpoint) ? assumption.amount_cny : 0),
      html: candidateRow(ctx, entry)
    }))
  ].sort((a, b) => a.price - b.price);
  const body = `<section class="catalog-intro"><div class="page intro-row"><div><h1>Bikes in China</h1><p>Compare China-market bikes and frame builds by price, category, and known specifications.</p></div><label class="assumption-note" for="frameset-build-allowance"><strong>Frameset build</strong><span>+ ¥</span><input id="frameset-build-allowance" type="number" min="0" max="100000" step="500" inputmode="numeric" value="${assumption.amount_cny}" data-frameset-build-allowance data-default-value="${assumption.amount_cny}" aria-label="Frameset build allowance in yuan">${infoTip('Frameset build assumption', [assumption.summary, `The reviewed default is ${formatCny(assumption.amount_cny)} as of ${assumption.reviewed_at}. Edit this amount to compare your own build.`])}</label></div></section>
  <section class="catalog-section" id="catalog"><div class="page" data-catalog-root data-complete-bike-fallback="${url(ctx.base, '/assets/images/placeholders/complete-bike.svg')}" data-frameset-fallback="${url(ctx.base, '/assets/images/placeholders/frameset.svg')}">
    <div class="filter-bar filters-collapsed">
      <div class="filter-primary">
        <div class="search-box"><label class="sr-only" for="catalog-search">Search bikes</label><span aria-hidden="true">⌕</span><input id="catalog-search" type="search" placeholder="Search model, use or drivetrain" autocomplete="off" data-filter-search></div>
        <label class="compact-select category-select"><span>Category</span><select name="category" data-filter-category><option value="">All categories</option>${categorySelectOptions(ctx, candidates)}</select></label>
        <div class="segmented" role="group" aria-label="Product type" data-type-control><button type="button" data-type-value="" aria-pressed="true">All</button><button type="button" data-type-value="complete-bike" aria-pressed="false">Complete</button><button type="button" data-type-value="frameset" aria-pressed="false">Frame builds</button></div>
      </div>
      <button class="more-filters" type="button" data-more-filters aria-expanded="false" aria-controls="secondary-filters">More filters</button>
      <div class="filter-secondary" id="secondary-filters">
        <label class="compact-select"><span>Max price</span><select name="max-price" data-filter-price><option value="">Any</option><option value="6000">¥6,000</option><option value="8000">¥8,000</option><option value="10000">¥10,000</option><option value="15000">¥15,000</option><option value="20000">¥20,000</option></select></label>
        <label class="compact-select"><span>Capability</span><select name="capability" data-filter-capability><option value="">Any</option>${capabilitySelectOptions(ctx)}</select></label>
        <label class="compact-select"><span>Sort</span><select name="sort" data-sort><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name-asc">Bike: A to Z</option><option value="name-desc">Bike: Z to A</option><option value="capability-desc" disabled>Category fact: high to low</option><option value="capability-asc" disabled>Category fact: low to high</option></select></label>
        <div class="filter-actions"><button class="reset-button" type="button" data-reset hidden>Clear</button></div>
      </div>
    </div>

    <section class="inline-compare" id="compare" data-inline-compare tabindex="-1" aria-labelledby="compare-title" hidden>
      <div class="compare-heading"><div><h2 id="compare-title">Compare</h2></div><div><button class="text-button" type="button" data-copy-comparison>Copy link</button><button class="text-button" type="button" data-close-compare>Close</button></div></div>
      <div data-compare-content></div>
    </section>

    <div class="catalog-meta"><span data-result-summary aria-live="polite" hidden><strong data-result-count>${ctx.products.length + defaultCandidateCount}</strong> matches<span data-result-context></span><span data-filter-notice></span></span><div class="catalog-meta-actions"><span class="catalog-selection-hint">Select two to four bikes to compare</span><button class="text-button catalog-scope-button" type="button" data-show-all-models aria-pressed="false" aria-controls="catalog-rows">Show all models</button></div></div>
    <div class="catalog-table" id="catalog-rows" data-product-list role="table" aria-label="Bike comparison">
      <div class="catalog-head" role="row"><span role="columnheader" aria-label="Select"></span><span role="columnheader" aria-sort="none"><button class="catalog-sort-button" type="button" data-sort-heading="name"><span>Bike</span></button></span><span role="columnheader" aria-sort="ascending"><button class="catalog-sort-button" type="button" data-sort-heading="price"><span>Full-bike price</span></button></span><span role="columnheader" aria-sort="none"><button class="catalog-sort-button" type="button" data-sort-heading="capability" disabled><span data-capability-heading-label>Category fact</span></button></span><span role="columnheader">Drivetrain</span><span role="columnheader">Weight</span><span role="columnheader">Frame</span><span role="columnheader" aria-label="Details"></span></div>
      ${rows.map((row) => row.html).join('')}
      <div class="empty-state" data-empty hidden>No bikes match these filters.</div>
    </div>
    <script type="application/json" id="catalog-data">${safeJson(summaries)}</script>
  </div></section>`;
  return page(ctx, { current: 'catalog', path: '/', body });
}

export function renderModel(ctx, product) {
  const { variant, platform, brand, latestPrice, prices, videos } = product;
  const assumption = buildAssumption(ctx);
  const metric = categoryMetric(platform);
  const superseded = platformIsSuperseded(product);
  const priceSubline = superseded
    ? publishedPriceState(product)
    : [variant.kind === 'frameset' ? 'Estimated complete build' : '', priceState(product)].filter(Boolean).join(' · ');
  const brandLabel = `${brand.name}${brand.name_zh ? ` · ${brand.name_zh}` : ''}`;
  const imageAccuracy = accuracyLabel(product.image?.display_accuracy ?? product.image?.subject_accuracy ?? 'illustrative');
  const bestFor = variant.editorial.best_for?.join(', ');
  const weight = weightLabel(product);
  const frameMaterial = platform.frame.claimed_fiber ?? platform.frame.material;
  const keyHardware = [
    `${frameMaterial} frame`,
    variant.kind === 'complete-bike' ? drivetrainLabel(ctx, product) : null,
    weight !== '—' ? `${weight} claimed weight` : null,
    metric.kind !== 'discipline' && metric.value !== '—' ? `${metric.label.toLowerCase()} ${metric.value}` : null
  ].filter(Boolean).join('; ');
  const priceBrief = superseded
    ? `This version is no longer sold new and was superseded by the ${successorLabel(platform)}. The dated price record below is historical only.`
    : variant.kind === 'frameset'
    ? `The displayed ${formatAllInPrice(product)} estimate adds the adjustable ${formatCny(assumption.amount_cny)} build allowance to the latest frame price.`
    : `The recorded complete-bike price is ${formatAllInPrice(product)}; the dated price record below preserves its channel and conditions.`;
  const modelPriceAttributes = variant.kind === 'frameset'
    ? ` data-model-frame-price-low="${product.allInPrice.frameLow}" data-model-frame-price-high="${product.allInPrice.frameHigh}" data-model-default-allowance="${assumption.amount_cny}"`
    : '';
  const detailFacts = [
    [metric.label, metric.value, infoTip(`${metric.label} details`, metric.details)],
    ['Drivetrain', drivetrainLabel(ctx, product), ''],
    [weightSubline(product) ? 'Claimed weight' : 'Weight', weightLabel(product), ''],
    ['Frame standard', frameStandard(product), ''],
    ['Category', `${categoryLabel(platform.category)} · ${platform.handlebar}-bar`, ''],
    ['Availability', availabilityLabel(platform.china_availability), '']
  ];
  const specificationRows = publishedSpecificationRows(product);
  const body = `<section class="model-page"><div class="page"><a class="back-link" href="${url(ctx.base, '/')}" data-catalog-back>← All bikes</a><div class="model-grid">
    <figure class="model-figure">${productImage(ctx, product, { hero: true })}<figcaption><span data-image-caption-status>${escapeHtml(product.image?.credit ?? 'Product image')} · ${escapeHtml(imageAccuracy)}${imageUsageLabel(product.image) ? ` · ${escapeHtml(imageUsageLabel(product.image))}` : ''}</span>${product.imageSource?.url ? ` · <a href="${escapeAttr(product.imageSource.url)}" rel="noreferrer">source</a>` : ''}</figcaption></figure>
    <div class="model-summary"><div class="model-brand"><a class="model-brand-filter" href="${url(ctx.base, '/')}?brand=${encodeURIComponent(brand.id)}#catalog" aria-label="${escapeAttr(brandLabel)} — show this brand in the catalog">${escapeHtml(brandLabel)}</a>${variant.kind === 'frameset' ? '<span class="type-pill">Frame estimate</span>' : ''}${statusFlag(product)}</div><h1>${escapeHtml(variant.name)}</h1><div class="model-price"${modelPriceAttributes}><strong${variant.kind === 'frameset' ? ' data-model-calculated-price' : ''}>${escapeHtml(publishedPriceLabel(product))}</strong>${infoTip('Price details', priceTooltipLines(ctx, product))}<span>${escapeHtml(priceSubline)}</span></div><div class="model-actions"><button class="secondary-button model-compare-button" type="button" data-add-to-comparison data-product-id="${escapeAttr(variant.id)}" data-product-name="${escapeAttr(`${brand.name} ${variant.name}`)}">Add to comparison</button><a class="text-button" href="${url(ctx.base, '/')}#catalog" data-model-compare-link>Choose another bike</a></div><dl class="model-facts">${detailFacts.map(([label, value, tip]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}${tip}</dd></div>`).join('')}</dl></div>
  </div>
  <div class="model-content">
    <section class="bike-brief" aria-labelledby="bike-brief-title"><h2 id="bike-brief-title">The short version</h2><p class="bike-brief-lede">${escapeHtml(variant.editorial.verdict)}</p><p${variant.kind === 'frameset' ? ' data-model-price-brief' : ''}>${escapeHtml(priceBrief)}${bestFor ? ` Best suited to ${escapeHtml(bestFor)}.` : ''}</p><p><strong>Key hardware:</strong> ${escapeHtml(keyHardware)}.</p></section>
    ${specificationRows.length ? `<section class="detail-section specification-snapshot" aria-labelledby="specification-snapshot-title"><h2 id="specification-snapshot-title">Specification snapshot</h2><dl class="detail-list">${specificationRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl></section>` : ''}
    <section class="decision-block"><div><h2>Strengths</h2><ul>${variant.editorial.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div><div><h2>Trade-offs and unknowns</h2><ul>${variant.editorial.caveats.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div></section>
    <section class="detail-section" aria-labelledby="key-details-title"><h2 id="key-details-title">Key details</h2><dl class="detail-list"><div><dt>Frame material</dt><dd>${escapeHtml(platform.frame.claimed_fiber ?? platform.frame.material)}</dd></div><div><dt>Cable routing</dt><dd>${escapeHtml(sentenceLabel(platform.frame.cable_routing ?? 'Not recorded'))}</dd></div><div><dt>${escapeHtml(metric.label)}</dt><dd>${escapeHtml(metric.value)}</dd></div><div><dt>Category evidence</dt><dd>${escapeHtml(metric.details.join(' ') || 'Not recorded')}</dd></div><div><dt>Internal frame storage</dt><dd>${platform.internal_storage ? 'Yes' : 'No'}</dd></div><div><dt>Mounts</dt><dd>${escapeHtml(platform.mounts?.join(', ') || 'None recorded')}</dd></div><div><dt>Manufacturing relationship</dt><dd>${escapeHtml(relationshipLabel(brand.manufacturing.relationship))}</dd></div><div><dt>Evidence confidence</dt><dd>${escapeHtml(confidenceLabel(brand.manufacturing.confidence))}</dd></div><div><dt>China purchase</dt><dd>${escapeHtml(availabilityLabel(platform.china_availability))}</dd></div><div><dt>Warranty</dt><dd>${escapeHtml(warrantyLabel(brand.china_support.warranty))}</dd></div></dl><p>${escapeHtml(brand.manufacturing.summary)}</p></section>
    ${videoContext(videos)}
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

function candidateMaturityLabel(status) {
  if (String(status).startsWith('official-mainland')) return 'Official mainland model';
  if (String(status).startsWith('official-global')) return 'Official global model';
  if (['exact-trim-unproven', 'exact-build-unproven', 'split-variant-before-publish'].includes(status)) return 'Exact configuration not confirmed';
  if (status === 'missing-china-price') return 'China price not verified';
  if (status === 'old-stock-only') return 'Old-stock lead';
  if (status === 'superseded') return 'Superseded model';
  if (['needs-exact-model', 'needs-provenance', 'needs-provenance-and-price'].includes(status)) return 'Identity not confirmed';
  return 'Research profile';
}

export function renderCandidateModel(ctx, entry) {
  const { candidate, brand } = entry;
  const facts = candidateFactRows(entry);
  const reason = candidatePublicText(candidate.why_interesting) || 'This bike is tracked while its exact configuration and market evidence are completed.';
  const missing = (candidate.missing ?? []).map(candidatePublicText).filter(Boolean);
  const maturity = candidateMaturityLabel(candidate.status);
  const brandLabel = brand ? `${brand.name}${brand.name_zh ? ` · ${brand.name_zh}` : ''}` : 'Brand not confirmed';
  const category = entry.categories.map(categoryLabel).join(' · ') || 'Category not confirmed';
  const isSuperseded = candidate.status === 'superseded';
  const price = entry.price || isSuperseded ? candidatePriceLabel(ctx, entry) : 'Price not verified';
  const priceState = candidatePriceState(entry);
  const assumption = buildAssumption(ctx);
  const priceBrief = !entry.price
    ? isSuperseded
      ? candidatePublicText(candidate.availability_note) || `This version is no longer sold new and was superseded by the ${successorLabel(candidate)}.`
      : 'No defensible price is recorded yet.'
    : entry.kind === 'frameset'
      ? `The displayed ${candidatePriceLabel(ctx, entry)} estimate adds the adjustable ${formatCny(assumption.amount_cny)} build allowance to the recorded ${formatPrice(entry.price)} ${candidateFramePriceTerm(entry).toLowerCase()} price.${candidatePackageOverlapNote(entry) ? ` ${candidatePackageOverlapNote(entry)}` : ''}`
      : entry.price.price_type === 'reference-conversion'
        ? `${candidatePriceLabel(ctx, entry)} is a dated currency conversion of an official non-mainland price, not a confirmed China checkout price.`
        : `The recorded complete-bike price is ${candidatePriceLabel(ctx, entry)}; its date and basis remain visible below.`;
  const keyHardware = facts.slice(0, 5).map(([label, value]) => `${label.toLowerCase()} ${value}`).join('; ');
  const sourceNote = candidate.source_note ? candidatePublicText(candidate.source_note) : '';
  const type = entry.kind === 'frameset' ? 'Frame estimate' : entry.kind === 'complete-bike' ? 'Complete bike' : 'Bike lead';
  const { low: frameLow, high: frameHigh } = candidatePriceBounds(entry);
  const modelPriceAttributes = entry.kind === 'frameset' && Number.isFinite(frameLow)
    ? ` data-model-frame-price-low="${frameLow}" data-model-frame-price-high="${frameHigh}" data-model-default-allowance="${assumption.amount_cny}"`
    : '';
  const pageTitle = brand?.name && candidate.name.toLowerCase().startsWith(brand.name.toLowerCase())
    ? candidate.name
    : `${brand?.name ? `${brand.name} ` : ''}${candidate.name}`;
  const body = `<section class="model-page candidate-model-page"><div class="page"><a class="back-link" href="${url(ctx.base, '/')}" data-catalog-back>← All bikes</a><div class="model-grid">
    ${candidateGalleryFigure(ctx, entry)}
    <div class="model-summary"><div class="model-brand">${brand ? `<a class="model-brand-filter" href="${url(ctx.base, '/')}?brand=${encodeURIComponent(brand.id)}#catalog" aria-label="${escapeAttr(brandLabel)} — show this brand in the catalog">${escapeHtml(brandLabel)}</a>` : `<span>${escapeHtml(brandLabel)}</span>`}<span class="type-pill">${escapeHtml(type)}</span><span class="status-pill">${escapeHtml(maturity)}</span></div><h1>${escapeHtml(candidate.name)}</h1><div class="model-price"${modelPriceAttributes}><strong${modelPriceAttributes ? ' data-model-calculated-price' : ''}>${escapeHtml(price)}</strong>${priceState ? `<span>${escapeHtml(priceState)}</span>` : ''}</div><div class="model-actions"><button class="secondary-button model-compare-button" type="button" data-add-to-comparison data-product-id="${escapeAttr(entry.id)}" data-product-name="${escapeAttr(candidate.name)}">Add to comparison</button><a class="text-button" href="${url(ctx.base, '/')}#catalog" data-model-compare-link>Choose another bike</a></div><dl class="model-facts"><div><dt>Category</dt><dd>${escapeHtml(category)}</dd></div><div><dt>Profile status</dt><dd>${escapeHtml(maturity)}</dd></div>${facts.slice(0, 4).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl></div>
  </div>
  <div class="model-content">
    <section class="bike-brief" aria-labelledby="candidate-brief-title"><h2 id="candidate-brief-title">The short version</h2><p class="bike-brief-lede">${escapeHtml(reason)}</p><p${modelPriceAttributes ? ' data-model-price-brief' : ''}>${escapeHtml(priceBrief)}</p>${keyHardware ? `<p><strong>Key hardware:</strong> ${escapeHtml(keyHardware)}.</p>` : ''}<p class="research-profile-note">This is a research-stage profile. Useful exact-model evidence is shown, but unresolved fields prevent it from being treated as a publication-ready recommendation.</p></section>
    <section class="decision-block"><div><h2>What is known</h2>${facts.length ? `<ul>${facts.map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`).join('')}</ul>` : '<p>No model-specific hardware facts are verified yet.</p>'}</div><div><h2>Trade-offs and unknowns</h2>${missing.length ? `<ul>${missing.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>No additional evidence gaps are documented.</p>'}</div></section>
    <section class="detail-section" aria-labelledby="candidate-key-details-title"><h2 id="candidate-key-details-title">Key details</h2><dl class="detail-list"><div><dt>Product type</dt><dd>${escapeHtml(type)}</dd></div><div><dt>Category</dt><dd>${escapeHtml(category)}</dd></div><div><dt>Evidence maturity</dt><dd>${escapeHtml(maturity)}</dd></div><div><dt>Price basis</dt><dd>${escapeHtml(priceState || 'Not recorded')}</dd></div>${candidate.manufacturing ? `<div><dt>Manufacturing note</dt><dd>${escapeHtml(candidatePublicText(candidate.manufacturing))}</dd></div>` : ''}</dl>${sourceNote ? `<p>${escapeHtml(sourceNote)}</p>` : ''}</section>
    <details class="detail-panel"><summary>Price record and sources</summary><div class="detail-panel-body">${entry.price ? `<div class="price-records"><div><strong>${escapeHtml(formatPrice(entry.price))}</strong><span>${escapeHtml(entry.price.observed_at ?? 'Date not recorded')} · ${escapeHtml(candidatePriceRecordLabel(entry))}</span></div></div>` : ''}${candidateSourceList(entry)}</div></details>
  </div></div></section>`;
  return page(ctx, {
    title: pageTitle,
    current: 'catalog',
    path: `/models/${candidate.id}/`,
    description: reason,
    image: imageUrl(ctx, entry.image) || candidateFallback(ctx, entry),
    imageAlt: entry.image?.alt ?? candidate.name,
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
  const html = `<h2>What is compared</h2><p>The main list combines complete bikes and frameset-based builds where total cost can be compared honestly. Products are identified by exact category, model, generation, and configuration.</p><h2>Frameset price estimate</h2><p>Each published frameset currently receives the same fixed <strong>${formatCny(assumption.amount_cny)}</strong> allowance for ${escapeHtml(assumption.summary.toLowerCase())} It is an estimate, not a shopping cart or guarantee. Framesets remain candidates when this assumption would be materially misleading.</p><h2>Price details</h2><p>The visible price is the complete-bike price or the estimated complete-build price. The info button contains the underlying frame or included-package price, observation date, freshness, record status, conditions, and great-buy reference.</p><h2>Category-specific facts</h2><p>Gravel products expose tire clearance when the evidence supports it. MTB products use suspension travel, e-road products use motor and battery facts, folding products use fold or wheel data, and triathlon products use time-trial fit and storage facts. Unverified fields stay visibly unknown.</p><h2>Video context</h2><p>Selected model videos help buyers see a platform and hear build or ride context. They are secondary editorial material, not authority for a current price, exact BOM, specification, or recommendation. Commercial and product-supply relationships are labelled.</p><h2>Materials and manufacturing</h2><p>For carbon products, fiber labels such as T700, T800, or T1000 are not quality scores. Lay-up, compaction, curing, alignment, testing, traceability, and support matter more. Missing evidence increases uncertainty; it does not automatically mean a product is poor.</p><h2>Corrections</h2><p>Each change should identify the exact model or generation and include a source. <a href="${ctx.repositoryUrl}/issues">Submit a correction or price sighting on GitHub</a>.</p>`;
  return prosePage(ctx, { title: 'Methodology', desc: 'How prices, frameset estimates, specifications, and evidence are handled.', path: '/methodology/', current: 'methodology', html });
}

export function renderPrivacy(ctx) {
  const html = `<h2>Static site</h2><p>The site has no account, analytics, advertising tracker, newsletter, payment system, or backend. Bike selections and the optional frameset allowance are stored only in the visitor’s browser.</p><h2>Product images</h2><p>Some product photos load from their credited manufacturer or retailer, which receives a normal image request. Selected public-post quotations load from the project’s separate Contabo media origin. That service disables application access logs and serves only sanitized, metadata-free WebP derivatives, but the VPS and network providers still process a normal HTTPS request. Images use <code>referrerpolicy="no-referrer"</code>, and a local project placeholder appears when a source fails.</p><h2>Optional videos</h2><p>Model pages do not contact YouTube when they first load. A video request is made to YouTube’s privacy-enhanced <code>youtube-nocookie.com</code> embed only after the visitor presses “Load video”; videos do not autoplay. The separate “Watch on YouTube” link opens YouTube directly.</p><h2>Public contributions</h2><p>GitHub issues and pull requests are public. Remove names, account details, addresses, order IDs, payment information, faces, license plates, and location metadata before submitting screenshots or photos. A removal request may identify the model and source URL without publishing private contact details.</p>`;
  return prosePage(ctx, { title: 'Privacy', desc: 'No accounts or analytics; optional third-party media is disclosed.', path: '/privacy/', html });
}

export function renderImagePolicy(ctx) {
  const html = `<h2>Image use</h2><p>The public repository stores structured credits and remote URLs, never third-party image files. Manufacturer images are preferred. A selected public XHS photo may be served from the project’s external media origin only as one compressed editorial quotation supporting direct model identification and commentary. Copyright remains with the original owner, the exact post stays linked, and no license or universal right to reuse is implied.</p><h2>Quotation limits</h2><p>Public availability and attribution alone are not enough. A quoted photo must be secondary to the profile, limited to the purpose, stripped of metadata and visible personal identifiers, and recorded with content hashes and a privacy review. When that rationale is uncertain, the project uses its own placeholder.</p><h2>Accuracy</h2><p>An image can show the exact configuration, the exact frame platform, the same platform with different components, another color, or another regional build. When the image is not exact, the catalog shows an information marker.</p><h2>Fallbacks and corrections</h2><p>A project-owned placeholder replaces broken external images. Use <a href="${ctx.repositoryUrl}/issues">GitHub issues</a> to report a broken link, attribution concern, inaccurate image, removal request, or a rights-cleared replacement. Do not publish private contact details in an issue.</p><p><a href="${url(ctx.base, '/image-sources/')}">See every image source and credit.</a></p>`;
  return prosePage(ctx, { title: 'Product images', desc: 'How product photos are sourced, labelled and replaced when unavailable.', path: '/image-policy/', html });
}

export function renderImageSources(ctx) {
  const platforms = new Map(ctx.data.platforms.map((item) => [item.id, item]));
  const brands = new Map(ctx.data.brands.map((item) => [item.id, item]));
  const sources = new Map(ctx.data.sources.map((item) => [item.id, item]));
  const firstProductByPlatform = new Map();
  for (const product of ctx.products) if (!firstProductByPlatform.has(product.platform.id)) firstProductByPlatform.set(product.platform.id, product);
  const candidatesById = new Map(joinCatalogCandidates(ctx.data).map((entry) => [entry.candidate.id, entry]));
  const entries = ctx.data.images.map((image) => {
    const source = sources.get(image.source_id);
    if (image.candidate_id) {
      const candidate = candidatesById.get(image.candidate_id);
      return {
        image,
        source,
        label: candidate?.candidate.name ?? image.candidate_id,
        href: candidate ? url(ctx.base, `/models/${candidate.candidate.id}/`) : `${url(ctx.base, '/')}?scope=all&q=${encodeURIComponent(image.candidate_id)}#catalog`,
        visual: candidate ? candidateImageElement(ctx, { ...candidate, image }) : ''
      };
    }
    const platform = platforms.get(image.platform_id);
    const brand = brands.get(platform.brand_id);
    const product = firstProductByPlatform.get(image.platform_id);
    return {
      image,
      source,
      label: `${brand.name} ${platform.name}`,
      href: url(ctx.base, `/models/${product.variant.id}/`),
      visual: imageElement(ctx, { ...product, image })
    };
  }).sort((a, b) => a.label.localeCompare(b.label));
  const html = `<div class="credit-list">${entries.map(({ image, source, label, href, visual }) => `<article><a class="credit-image" href="${escapeAttr(href)}">${visual}</a><div><h2>${escapeHtml(label)}</h2><p>${escapeHtml(image.credit)} · ${escapeHtml(accuracyLabel(image.subject_accuracy))}${imageUsageLabel(image) ? ` · ${escapeHtml(imageUsageLabel(image))}` : ''}</p>${source?.url ? `<a href="${escapeAttr(source.url)}" rel="noreferrer">Original source</a>` : ''}</div></article>`).join('')}</div>`;
  return prosePage(ctx, { title: 'Image credits', desc: 'Source and exactness for every product visual used by the catalog.', path: '/image-sources/', html });
}

export function render404(ctx) {
  return page(ctx, { title: 'Page not found', path: '/404.html', noindex: true, body: `<section class="simple-page"><div class="page prose"><h1>Page not found</h1><p class="page-lede">The bike or route may have moved.</p><p><a class="primary-button" href="${url(ctx.base, '/')}">Return to all bikes</a></p></div></section>` });
}
