import {
  categoryLabel,
  categoryFamily,
  categoryMetric,
  buildSlotIds,
  supportedCategories,
  clearanceLabel,
  clearanceLongLabel,
  evidenceLabel,
  formatAllInPrice,
  formatCny,
  formatPrice,
  formatRange,
  freshness,
  joinCatalogCandidates,
  maxClearance,
} from './lib/data.mjs';
import {
  escapeAttr,
  escapeHtml,
  layout,
  safeJson,
  url
} from './lib/html.mjs';
import {
  collectionStructuredData,
  datasetStructuredData,
  latestDate,
  productPageStructuredData,
  websiteStructuredData,
  webApplicationStructuredData
} from './lib/seo.mjs';

const description = 'A concise comparison of bicycles and frame builds available to riders in China.';
const footerDescription = 'China Bikes compares Chinese road, gravel, and carbon-bike options using dated China-market prices, documented specifications, and transparent frameset-build estimates.';

function page(ctx, { title = '', current = '', path = '/', description: desc = description, body, noindex = false, image = '', imageAlt = '', imageWidth = '', imageHeight = '', imageType = '', ogType = 'website', structuredData = [] }) {
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
    imageAlt,
    imageWidth,
    imageHeight,
    imageType,
    ogType,
    structuredData,
    datasetUpdated: ctx.siteLastmod ?? ctx.data.meta.snapshot_date,
    catalogReviewed: ctx.data.meta.snapshot_date,
    footerDescription
  });
}

function breadcrumbs(ctx, name, trail = [], { catalogBack = false } = {}) {
  const items = [
    { name: 'Home', path: '/' },
    ...trail
  ];
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${items.map((item, index) => `<li><a href="${url(ctx.base, item.path)}"${catalogBack && index === 0 ? ' data-catalog-back' : ''}>${escapeHtml(item.name)}</a></li>`).join('')}<li aria-current="page">${escapeHtml(name)}</li></ol></nav>`;
}

function productEvidenceDate(ctx, product) {
  return ctx.productEvidenceDates?.get(product.variant.id) ?? latestDate([
    product.brand.last_reviewed,
    product.platform.last_reviewed,
    product.prices.map((item) => item.observed_at),
    product.sources.map((item) => item.accessed_at)
  ], ctx.data.meta.snapshot_date);
}

function candidateEvidenceDate(ctx, entry) {
  return ctx.candidateEvidenceDates?.get(entry.candidate.id) ?? latestDate([
    entry.candidate.last_reviewed,
    entry.price?.observed_at,
    entry.sources.map((item) => item.accessed_at)
  ], ctx.data.meta.snapshot_date);
}

function evidenceContext(ctx, date, { sourceTarget = '' } = {}) {
  return `<p class="evidence-context"><span>Evidence reviewed through <time datetime="${escapeAttr(date)}">${escapeHtml(date)}</time>. Price records retain their own observation dates and conditions.</span><span>${sourceTarget ? `<a href="#${escapeAttr(sourceTarget)}">View sources</a><span aria-hidden="true"> · </span>` : ''}<a href="${url(ctx.base, '/methodology/')}">Methodology and dataset</a></span></p>`;
}

function imageUrl(ctx, image) {
  if (!image || image.media_type === 'project-placeholder' || image.buyer_visibility === 'omit') return '';
  return image.hosting.mode === 'remote'
    ? image.hosting.remote_url
    : url(ctx.base, image.hosting.local_path);
}

function responsiveImage(ctx, image, { hero = false, comparison = false } = {}) {
  const variants = image?.hosting?.variants;
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const sorted = [...variants].sort((a, b) => a.width - b.width);
  const largest = sorted.at(-1);
  return {
    width: largest.width,
    height: largest.height,
    srcset: sorted.map((variant) => `${image.hosting.mode === 'local' ? url(ctx.base, variant.url) : variant.url} ${variant.width}w`).join(', '),
    sizes: comparison
      ? '120px'
      : hero
        ? '(max-width: 720px) calc(100vw - 24px), 680px'
        : '(max-width: 720px) 132px, 156px'
  };
}

function responsiveAttributes(ctx, image, options) {
  const responsive = responsiveImage(ctx, image, options);
  if (!responsive) return { width: 1200, height: 800, attributes: '' };
  return {
    ...responsive,
    attributes: ` srcset="${escapeAttr(responsive.srcset)}" sizes="${escapeAttr(responsive.sizes)}"`
  };
}

function comparisonImageFields(ctx, image) {
  const responsive = responsiveImage(ctx, image, { comparison: true });
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
    illustrative: 'Illustrative image; not a product photo'
  }[accuracy] ?? 'Image status unclassified';
}

function imageElement(ctx, product, { hero = false, image = product.image, className = '', decorative = false, galleryHero = false } = {}) {
  const source = imageUrl(ctx, image);
  if (!source) return '';
  const alt = decorative ? '' : image?.alt ?? `${product.brand.name} ${product.variant.name}`;
  const remote = image?.hosting.mode === 'remote';
  const responsive = responsiveAttributes(ctx, image, { hero });
  return `<img${className ? ` class="${escapeAttr(className)}"` : ''} src="${escapeAttr(source)}"${responsive.attributes} alt="${escapeAttr(alt)}" width="${responsive.width}" height="${responsive.height}" ${hero ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async"${remote ? ' referrerpolicy="no-referrer"' : ''}${decorative ? ' aria-hidden="true"' : ''}${galleryHero ? ' data-gallery-hero' : ''} data-product-image>`;
}

function candidateImageElement(ctx, entry, { hero = false, image = entry.image, className = '', decorative = false, galleryHero = false } = {}) {
  const source = imageUrl(ctx, image);
  if (!source) return '';
  const alt = decorative
    ? ''
    : image?.alt ?? `${entry.candidate.name} candidate image`;
  const remote = image?.hosting.mode === 'remote';
  const responsive = responsiveAttributes(ctx, image, { hero });
  return `<img${className ? ` class="${escapeAttr(className)}"` : ''} src="${escapeAttr(source)}"${responsive.attributes} alt="${escapeAttr(alt)}" width="${responsive.width}" height="${responsive.height}" ${hero ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async"${remote ? ' referrerpolicy="no-referrer"' : ''}${decorative ? ' aria-hidden="true"' : ''}${galleryHero ? ' data-gallery-hero' : ''} data-product-image>`;
}

function candidateImage(ctx, entry) {
  if (!imageUrl(ctx, entry.image)) return '';
  const accuracy = entry.image.subject_accuracy ?? 'illustrative';
  const needsNote = !['exact-variant', 'exact-platform'].includes(accuracy);
  const detailUrl = url(ctx.base, `/models/${entry.candidate.id}/`);
  const visual = `<a class="product-image-link" href="${detailUrl}" data-model-link aria-label="View ${escapeAttr(entry.candidate.name)} research profile">${candidateImageElement(ctx, entry)}</a>`;
  return `<span class="product-image">${visual}${needsNote ? `<span class="image-info">${infoTip('About this image', [accuracyLabel(accuracy), entry.image.display_note ?? 'The image identifies the model but may not show the exact listed components.'])}</span>` : ''}</span>`;
}

function candidateGalleryFigure(ctx, entry) {
  const images = [entry.image, ...(entry.galleryImages ?? [])].filter((image) => imageUrl(ctx, image));
  const primary = images[0];
  if (!primary) return '';
  const primaryAccuracy = accuracyLabel(primary?.display_accuracy ?? primary?.subject_accuracy ?? 'illustrative');
  const primarySource = entry.imageSource;
  if (images.length < 2) {
    return `<figure class="model-figure"><span class="product-image hero-image">${candidateImageElement(ctx, entry, { hero: true })}</span><figcaption><span data-image-caption-status>${escapeHtml(primary?.credit ?? 'Product image')} · ${escapeHtml(primaryAccuracy)}</span>${primarySource?.url ? ` · <a href="${escapeAttr(primarySource.url)}" rel="noreferrer">source</a>` : ''}</figcaption></figure>`;
  }

  const imageSource = (image) => image === primary ? primarySource : image.source;
  const caption = (image, index) => [
    image.credit ?? 'Product image',
    accuracyLabel(image.display_accuracy ?? image.subject_accuracy ?? 'illustrative'),
    `${image.label ?? `View ${index + 1}`} (${index + 1} of ${images.length})`
  ].filter(Boolean).join(' · ');
  const thumbs = images.map((image, index) => {
    const source = imageSource(image);
    const accuracy = accuracyLabel(image.display_accuracy ?? image.subject_accuracy ?? 'illustrative');
    return `<button class="gallery-thumb" type="button" aria-label="Show ${escapeAttr(image.label ?? `product image ${index + 1}`)} — ${escapeAttr(accuracy)}" aria-pressed="${index === 0}" data-gallery-thumb data-gallery-src="${escapeAttr(imageUrl(ctx, image))}" data-gallery-alt="${escapeAttr(image.alt ?? entry.candidate.name)}" data-gallery-caption="${escapeAttr(caption(image, index))}" data-gallery-source="${escapeAttr(source?.url ?? '')}" data-gallery-remote="${image.hosting?.mode === 'remote'}"${image.display_note ? ` title="${escapeAttr(image.display_note)}"` : ''}>${candidateImageElement(ctx, entry, { image, className: 'gallery-thumb-image', decorative: true })}</button>`;
  }).join('');
  return `<figure class="model-figure model-gallery" data-image-gallery><span class="product-image hero-image">${candidateImageElement(ctx, entry, { hero: true, className: 'gallery-hero-image', galleryHero: true })}</span><div class="model-gallery-strip" role="group" aria-label="Product image views">${thumbs}</div><figcaption aria-live="polite"><span data-image-caption-status data-gallery-caption>${escapeHtml(caption(primary, 0))}</span>${primarySource?.url ? ` · <a href="${escapeAttr(primarySource.url)}" rel="noreferrer" data-gallery-source-link>source</a>` : '<a href="#" rel="noreferrer" data-gallery-source-link hidden>source</a>'}</figcaption></figure>`;
}

function productGalleryFigure(ctx, product) {
  const images = [product.image, ...(product.galleryImages ?? [])].filter((image) => imageUrl(ctx, image));
  const primary = images[0];
  if (!primary) return '';
  const primaryAccuracy = accuracyLabel(primary?.display_accuracy ?? primary?.subject_accuracy ?? 'illustrative');
  const primarySource = product.imageSource;
  if (images.length < 2) {
    return `<figure class="model-figure"><span class="product-image hero-image">${imageElement(ctx, product, { hero: true })}</span><figcaption><span data-image-caption-status>${escapeHtml(primary?.credit ?? 'Product image')} · ${escapeHtml(primaryAccuracy)}</span>${primarySource?.url ? ` · <a href="${escapeAttr(primarySource.url)}" rel="noreferrer">source</a>` : ''}</figcaption></figure>`;
  }

  const imageSource = (image) => image === primary ? primarySource : image.source;
  const caption = (image, index) => [
    image.credit ?? 'Product image',
    accuracyLabel(image.display_accuracy ?? image.subject_accuracy ?? 'illustrative'),
    `${image.label ?? `View ${index + 1}`} (${index + 1} of ${images.length})`
  ].filter(Boolean).join(' · ');
  const thumbs = images.map((image, index) => {
    const source = imageSource(image);
    const accuracy = accuracyLabel(image.display_accuracy ?? image.subject_accuracy ?? 'illustrative');
    return `<button class="gallery-thumb" type="button" aria-label="Show ${escapeAttr(image.label ?? `product image ${index + 1}`)} — ${escapeAttr(accuracy)}" aria-pressed="${index === 0}" data-gallery-thumb data-gallery-src="${escapeAttr(imageUrl(ctx, image))}" data-gallery-alt="${escapeAttr(image.alt ?? `${product.brand.name} ${product.variant.name}`)}" data-gallery-caption="${escapeAttr(caption(image, index))}" data-gallery-source="${escapeAttr(source?.url ?? '')}" data-gallery-remote="${image.hosting?.mode === 'remote'}"${image.display_note ? ` title="${escapeAttr(image.display_note)}"` : ''}>${imageElement(ctx, product, { image, className: 'gallery-thumb-image', decorative: true })}</button>`;
  }).join('');
  return `<figure class="model-figure model-gallery" data-image-gallery><span class="product-image hero-image">${imageElement(ctx, product, { hero: true, className: 'gallery-hero-image', galleryHero: true })}</span><div class="model-gallery-strip" role="group" aria-label="Product image views">${thumbs}</div><figcaption aria-live="polite"><span data-image-caption-status data-gallery-caption>${escapeHtml(caption(primary, 0))}</span>${primarySource?.url ? ` · <a href="${escapeAttr(primarySource.url)}" rel="noreferrer" data-gallery-source-link>source</a>` : '<a href="#" rel="noreferrer" data-gallery-source-link hidden>source</a>'}</figcaption></figure>`;
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

function buildPresetOptions(ctx) {
  return buildAssumption(ctx).presets.map((preset) => {
    const label = preset.custom
      ? preset.label
      : preset.manual_allowance
        ? `${preset.label} · enter allowance`
        : `${preset.label} · +${formatCny(preset.amount_cny)}`;
    return `<option value="${escapeAttr(preset.id)}"${preset.default ? ' selected' : ''}${Number.isFinite(preset.amount_cny) ? ` data-build-amount="${preset.amount_cny}"` : ''}${preset.manual_allowance ? ' data-build-manual="true"' : ''}${preset.groupset_id ? ` data-groupset-id="${escapeAttr(preset.groupset_id)}"` : ''}>${escapeHtml(label)}</option>`;
  }).join('');
}

function buildPresetNotes(ctx) {
  const assumption = buildAssumption(ctx);
  return [
    assumption.summary,
    ...assumption.presets.filter((preset) => Number.isFinite(preset.amount_cny)).map((preset) => `${preset.label}: ${formatCny(preset.amount_cny)} total build allowance. ${preset.basis}.`),
    ...assumption.presets.filter((preset) => preset.manual_allowance).map((preset) => `${preset.label}: enter the total remaining-build allowance. ${preset.basis}.`),
    'Choose Custom allowance to enter a current Taobao quote or your own parts budget.'
  ];
}

function sentenceLabel(value, labels = {}) {
  if (!value) return 'Unverified';
  const text = labels[value] ?? String(value).replaceAll('-', ' ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function electronicGroupsetReference(ctx, value) {
  return /\b(?:Di2|AXS|eTap|XPLR|L-TWOO|LTWOO|eRX|eR9|eGR|WheelTop|Wheeltop|EDS TX|GeX|Magene|QED|PES)\b/i.test(String(value ?? ''))
    ? ` <a class="reference-link" href="${url(ctx.base, '/electronic-shifting/')}">system reference</a>`
    : '';
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
    lines.push(`Estimated complete adds ${formatCny(allInPrice.buildAmount)} for the selected ${buildAssumption(ctx).label}.`);
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

function publishedTireClearance(product) {
  const recorded = Boolean(product.platform.tire_clearance);
  return {
    value: recorded ? clearanceLabel(product.platform) : '—',
    sortValue: maxClearance(product.platform) ?? 0,
    details: recorded ? clearanceTooltipLines(product) : []
  };
}

function candidateTireClearance(entry) {
  const facts = entry.candidate.facts ?? {};
  const value = facts.tire_clearance_mm;
  const basis = facts.tire_clearance_basis ?? '';
  const fitted = /^documented fitted|^fitted/i.test(basis);
  return {
    value: Number.isFinite(value) ? `${value} mm${fitted ? ' fitted' : ''}` : '—',
    sortValue: Number.isFinite(value) ? value : 0,
    details: Number.isFinite(value) ? (basis || 'Recorded maximum tire clearance.') : ''
  };
}

function drivetrainLabel(ctx, product) {
  if (product.variant.kind === 'frameset') return '';
  const drivetrain = product.variant.drivetrain;
  if (!drivetrain) return 'Not recorded';
  return `${drivetrain.brand} ${drivetrain.model}`;
}

function drivetrainSubline(ctx, product) {
  if (product.variant.kind === 'frameset') return '';
  const drivetrain = product.variant.drivetrain;
  return drivetrain ? `${drivetrain.speeds} · ${drivetrain.shifting.replaceAll('-', ' ')}` : '';
}

function gramRangeLabel(low, high) {
  if (!Number.isFinite(low)) return '';
  const format = (value) => new Intl.NumberFormat('en-US').format(value);
  return low === high || !Number.isFinite(high) ? `${format(low)} g` : `${format(low)}–${format(high)} g`;
}

function frameWeightValueLabel(frame) {
  if (Number.isFinite(frame?.claimed_frame_weight_g)) return gramRangeLabel(frame.claimed_frame_weight_g, frame.claimed_frame_weight_g);
  const values = Object.values(frame?.claimed_frame_weight_g_by_size ?? {}).filter(Number.isFinite);
  return values.length ? gramRangeLabel(Math.min(...values), Math.max(...values)) : '';
}

function componentWeightValueLabel(frame, key) {
  const value = frame?.[`claimed_${key}_weight_g`];
  if (Number.isFinite(value)) return gramRangeLabel(value, value);
  const range = frame?.[`claimed_${key}_weight_g_range`];
  return gramRangeLabel(range?.low, range?.high);
}

function weightLabel(product) {
  if (product.variant.kind === 'complete-bike') {
    if (product.variant.claimed_complete_weight_g) return `${(product.variant.claimed_complete_weight_g / 1000).toFixed(1)} kg`;
    if (product.variant.claimed_frame_weight_g) return `${new Intl.NumberFormat('en-US').format(product.variant.claimed_frame_weight_g)} g frame`;
    const platformFrameWeight = frameWeightValueLabel(product.platform.frame);
    return platformFrameWeight ? `${platformFrameWeight} frame` : '—';
  }
  const frameWeight = Number.isFinite(product.variant.claimed_frame_weight_g)
    ? gramRangeLabel(product.variant.claimed_frame_weight_g, product.variant.claimed_frame_weight_g)
    : frameWeightValueLabel(product.platform.frame);
  return frameWeight ? `${frameWeight} frame` : '—';
}

function frameMaterialLabel(product) {
  return product.variant.frame_material_grade
    ?? product.variant.frame_material
    ?? product.platform.frame?.material_grade
    ?? product.platform.frame?.claimed_fiber
    ?? product.platform.frame?.material
    ?? 'Not recorded';
}

function publishedWeightFilter(product) {
  if (product.variant.kind === 'complete-bike') {
    return Number.isFinite(product.variant.claimed_complete_weight_g)
      ? { kind: 'complete', grams: product.variant.claimed_complete_weight_g }
      : { kind: 'complete', grams: null };
  }
  const values = [
    product.variant.claimed_frame_weight_g,
    product.platform.frame?.claimed_frame_weight_g,
    ...Object.values(product.platform.frame?.claimed_frame_weight_g_by_size ?? {})
  ].filter(Number.isFinite);
  return { kind: 'frame', grams: values.length ? Math.max(...values) : null };
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

function drivetrainBuildDescription(drivetrain) {
  if (!drivetrain) return '';
  const parts = [
    drivetrain.shifters ? `Shifters: ${drivetrain.shifters}` : drivetrain.shifter ? `Shifter: ${drivetrain.shifter}` : '',
    drivetrain.front_derailleur ? `FD: ${drivetrain.front_derailleur}` : '',
    drivetrain.rear_derailleur ? `RD: ${drivetrain.rear_derailleur}` : '',
    drivetrain.crankset ? `Crank: ${drivetrain.crankset}` : '',
    drivetrain.cassette ? `Cassette: ${drivetrain.cassette}` : '',
    drivetrain.chain ? `Chain: ${drivetrain.chain}` : ''
  ].filter(Boolean);
  return parts.join(' · ');
}

function brakeDescription(brakes) {
  if (!brakes) return '';
  return [
    sentenceLabel([brakes.actuation, brakes.type].filter(Boolean).join(' ')),
    brakes.calipers ? `Calipers: ${brakes.calipers}` : '',
    brakes.rotors ? `Rotors: ${brakes.rotors}` : ''
  ].filter(Boolean).join(' · ');
}

function weightBasisDescription(product) {
  if (product.variant.kind === 'complete-bike') return product.variant.claimed_complete_weight_basis ?? '';
  return product.variant.claimed_frame_weight_basis
    ?? product.platform.frame?.claimed_frame_weight_basis
    ?? product.platform.frame?.claimed_frame_weight_g_by_size?.basis
    ?? '';
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
  const frameWeight = Number.isFinite(product.variant.claimed_frame_weight_g)
    ? gramRangeLabel(product.variant.claimed_frame_weight_g, product.variant.claimed_frame_weight_g)
    : frameWeightValueLabel(product.platform.frame);
  const forkWeight = componentWeightValueLabel(product.platform.frame, 'fork');
  const seatpostWeight = componentWeightValueLabel(product.platform.frame, 'seatpost');
  const rows = [
    ['Bottom bracket', product.platform.frame?.bottom_bracket === 'unknown' ? '' : product.platform.frame?.bottom_bracket],
    ['Frame weight', frameWeight],
    ['Fork weight', forkWeight],
    ['Seatpost weight', seatpostWeight],
    ['Weight basis', weightBasisDescription(product)],
    ['Drivetrain build', product.variant.kind === 'complete-bike' ? drivetrainBuildDescription(product.variant.drivetrain) : ''],
    ['Brakes', product.variant.kind === 'complete-bike' ? brakeDescription(product.variant.brakes) : ''],
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
  if (!imageUrl(ctx, product.image)) return '';
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
  const tireClearance = publishedTireClearance(product);
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
    tireClearance.value,
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
  const tireClearanceData = tireClearance.sortValue ? ` data-tire-clearance-sort="${tireClearance.sortValue}"` : '';
  return `<div class="catalog-row" role="row" data-product-row data-id="${escapeAttr(variant.id)}" data-brand="${escapeAttr(brand.id)}" data-search="${escapeAttr(searchable)}" data-type="${escapeAttr(variant.kind)}" data-family="${escapeAttr(categoryFamily(platform.category))}" data-category="${escapeAttr(platform.category)}" data-handlebar="${escapeAttr(platform.handlebar)}" data-price-sort="${superseded ? '' : allInPrice.midpoint}" data-price-filter="${superseded ? '' : allInPrice.high ?? ''}" data-capability-sort="${metric.sortValue}" data-capability-kind="${escapeAttr(metric.kind)}"${tireClearanceData} data-name="${escapeAttr(`${brand.name} ${variant.name}`.toLowerCase())}"${framesetData}>
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
    <div class="catalog-cell tire-clearance-cell" role="cell">${escapeHtml(tireClearance.value)}</div>
    <div class="catalog-cell drivetrain-cell" role="cell" data-label="Drivetrain">${variant.kind === 'frameset' ? '' : `<span class="metric-main compact-metric">${escapeHtml(drivetrainLabel(ctx, product))}</span><span class="metric-sub">${escapeHtml(drivetrainSubline(ctx, product))}</span>`}</div>
    <div class="catalog-cell weight-cell" role="cell" data-label="Weight"><span class="metric-main">${escapeHtml(weightLabel(product))}</span></div>
    <div class="catalog-cell frame-cell" role="cell" data-label="Frame"><span class="metric-main">${escapeHtml(frameStandard(product))}${infoTip('Frame details', frameTooltipLines(product))}</span></div>
    <div class="row-link-cell" role="cell"><a class="row-link" href="${url(ctx.base, `/models/${variant.id}/`)}" data-model-link aria-label="View ${escapeAttr(brand.name)} ${escapeAttr(variant.name)} details">›</a></div>
  </div>`;
}

function candidateMetric(entry) {
  const category = entry.category;
  const kind = categoryFamily(category) === 'mtb'
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
  return {
    label,
    value: category ? categoryLabel(category) : '—',
    sortValue: 0,
    kind,
    details: ''
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
  const tireClearance = candidateTireClearance(entry);
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
  const frame = facts.frame ?? candidate.manufacturing ?? '—';
  const tireClearanceData = tireClearance.sortValue ? ` data-tire-clearance-sort="${tireClearance.sortValue}"` : '';
  return `<div class="catalog-row is-candidate" role="row" data-product-row data-stage="candidate" data-default-visible="${entry.defaultVisible}" data-id="${escapeAttr(entry.id)}" data-brand="${escapeAttr(brand?.id ?? '')}" data-search="${escapeAttr(searchable)}" data-type="${escapeAttr(entry.kind)}" data-family="${escapeAttr(categoryFamily(entry.category))}" data-category="${escapeAttr(entry.categories.join('|'))}" data-handlebar="" data-price-sort="${priceSort}" data-price-filter="${priceHigh}"${framePriceData} data-capability-sort="${metric.sortValue}" data-capability-kind="${escapeAttr(metric.kind)}"${tireClearanceData} data-name="${escapeAttr(candidate.name.toLowerCase())}"${entry.defaultVisible ? '' : ' hidden'}>
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
    <div class="catalog-cell capability-cell" role="cell" data-label="${escapeAttr(metric.label)}">${escapeHtml(metric.value)}</div>
    <div class="catalog-cell tire-clearance-cell" role="cell">${escapeHtml(tireClearance.value)}</div>
    <div class="catalog-cell drivetrain-cell" role="cell" data-label="Drivetrain">${entry.kind === 'frameset' ? '' : escapeHtml(facts.drivetrain ?? '—')}</div>
    <div class="catalog-cell weight-cell" role="cell" data-label="Weight">${escapeHtml(weight)}</div>
    <div class="catalog-cell frame-cell" role="cell" data-label="Frame">${escapeHtml(frame)}</div>
    <div class="row-link-cell" role="cell"><a href="${detailUrl}" data-model-link aria-label="View ${escapeAttr(candidate.name)} research profile">→</a></div>
  </div>`;
}

function comparisonSummary(ctx, product) {
  const metric = categoryMetric(product.platform);
  const tireClearance = publishedTireClearance(product);
  const weightFilter = publishedWeightFilter(product);
  const image = imageUrl(ctx, product.image);
  return {
    id: product.variant.id,
    stage: 'published',
    brand: product.brand.name,
    name: product.variant.name,
    url: url(ctx.base, `/models/${product.variant.id}/`),
    ...(image ? {
      image,
      imageRemote: product.image?.hosting.mode === 'remote',
      ...comparisonImageFields(ctx, product.image)
    } : {}),
    type: product.variant.kind === 'frameset' ? 'Frame estimate' : 'Complete bike',
    buildBaseKind: product.variant.kind,
    builderEligible: true,
    price: publishedPriceLabel(product),
    ...(product.allInPrice.estimated ? {
      estimated: true,
      frameLow: product.allInPrice.frameLow,
      frameHigh: product.allInPrice.frameHigh,
      greatBuyFrameThreshold: platformIsSuperseded(product) ? null : product.variant.editorial.price_thresholds_cny?.great_buy_below ?? null
    } : {}),
    priceState: publishedPriceState(product),
    priceDetails: priceTooltipLines(ctx, product).join(' '),
    categoryMetric: metric.value,
    categoryMetricLabel: metric.label,
    categoryMetricKind: metric.kind,
    categoryMetricDetails: metric.details.join(' '),
    ...(tireClearance.value !== '—' ? { tireClearance: tireClearance.value } : {}),
    ...(Number.isFinite(weightFilter.grams) ? { weightGrams: weightFilter.grams, weightKind: weightFilter.kind } : {}),
    ...(product.variant.kind === 'complete-bike' ? { drivetrain: drivetrainLabel(ctx, product), drivetrainSubline: drivetrainSubline(ctx, product) } : {}),
    weight: weightLabel(product),
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
  const tireClearance = candidateTireClearance(entry);
  const { low: frameLow, high: frameHigh } = candidatePriceBounds(entry);
  const estimated = entry.kind === 'frameset' && Number.isFinite(frameLow);
  const assumption = buildAssumption(ctx);
  const image = imageUrl(ctx, entry.image);
  const facts = entry.candidate.facts ?? {};
  const weight = Number.isFinite(facts.complete_weight_g)
    ? `${(facts.complete_weight_g / 1000).toFixed(1)} kg`
    : entry.kind === 'frameset' && Number.isFinite(facts.frame_weight_g)
      ? `${new Intl.NumberFormat('en-US').format(facts.frame_weight_g)} g frame`
      : '—';
  const weightGrams = entry.kind === 'complete-bike' ? facts.complete_weight_g : entry.kind === 'frameset' ? facts.frame_weight_g : null;
  const priceDetails = entry.candidate.status === 'superseded'
    ? candidatePublicText(entry.candidate.availability_note)
    : estimated
    ? `Frameset price: ${formatPrice(entry.price)}. Estimated complete adds ${formatCny(assumption.amount_cny)} for the selected ${assumption.label}.`
    : [
        entry.price?.price_basis ? `Recorded basis: ${entry.price.price_basis}.` : '',
        entry.price?.conditions ?? ''
      ].filter(Boolean).join(' ');
  const frame = facts.frame ?? entry.candidate.manufacturing;
  return {
    id: entry.id,
    stage: 'candidate',
    url: url(ctx.base, `/models/${entry.candidate.id}/`),
    name: entry.candidate.name,
    ...(image ? {
      image,
      imageRemote: entry.image?.hosting.mode === 'remote',
      ...comparisonImageFields(ctx, entry.image)
    } : {}),
    type: entry.kind === 'frameset' ? 'Frame estimate' : entry.kind === 'complete-bike' ? 'Complete bike' : 'Bike',
    ...(entry.kind && entry.identifiableModel ? { buildBaseKind: entry.kind, builderEligible: true } : {}),
    price: candidatePriceLabel(ctx, entry),
    ...(estimated ? { estimated: true, frameLow, frameHigh } : {}),
    priceState: candidatePriceState(entry),
    ...(priceDetails ? { priceDetails } : {}),
    categoryMetric: metric.value,
    categoryMetricLabel: metric.label,
    categoryMetricKind: metric.kind,
    ...(tireClearance.value !== '—' ? { tireClearance: tireClearance.value } : {}),
    ...(Number.isFinite(weightGrams) ? { weightGrams, weightKind: entry.kind === 'complete-bike' ? 'complete' : 'frame' } : {}),
    ...(entry.kind === 'complete-bike' && facts.drivetrain ? { drivetrain: facts.drivetrain } : {}),
    ...(weight !== '—' ? { weight } : {}),
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
    frame_material: 'Frame material',
    frame_construction: 'Frame construction',
    stiffness_evidence: 'Stiffness evidence',
    bottom_bracket: 'Bottom bracket',
    wheels: 'Wheels',
    tires: 'Tires',
    cockpit: 'Cockpit',
    sizes: 'Sizes',
    storage: 'Storage',
    mounts: 'Mounts',
    derailleur_hanger: 'Derailleur hanger',
    frame_weight_basis: 'Frame weight basis',
    complete_weight_basis: 'Complete weight basis',
    tire_clearance_basis: 'Tire clearance basis',
    seatpost: 'Seatpost',
    complete_weight_g: 'Complete weight',
    frame_weight_g: 'Frame weight',
    tire_clearance_mm: 'Tire clearance'
  };
  return Object.entries(entry.candidate.facts ?? {}).filter(([key]) => entry.kind !== 'frameset' || key !== 'drivetrain').map(([key, value]) => {
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

function candidateAlternativeBuilds(entry) {
  const builds = entry.candidate.alternative_builds ?? [];
  if (!builds.length) return '';
  return `<section class="detail-section documented-builds" aria-labelledby="documented-builds-title"><h2 id="documented-builds-title">Other documented builds</h2><p>These are separate configurations. Their weight, drivetrain, and price are not mixed into the catalog reference row.</p><div class="source-list">${builds.map((build) => {
    const details = [
      build.drivetrain ? `Drivetrain: ${build.drivetrain}` : '',
      Number.isFinite(build.complete_weight_g) ? `Weight: ${(build.complete_weight_g / 1000).toFixed(2).replace(/0$/, '')} kg${build.weight_basis ? ` — ${build.weight_basis}` : ''}` : '',
      build.price ? `Price: ${formatPrice(build.price)}${build.price.observed_at ? ` on ${build.price.observed_at}` : ''}${build.price.price_basis ? ` — ${build.price.price_basis}` : ''}` : '',
      build.wheels ? `Wheels: ${build.wheels}` : '',
      build.tires ? `Tires: ${build.tires}` : ''
    ].filter(Boolean);
    return `<div class="source-item"><strong>${escapeHtml(build.label)}</strong>${details.map((detail) => `<span>${escapeHtml(detail)}</span>`).join('')}${build.notes ? `<p>${escapeHtml(candidatePublicText(build.notes))}</p>` : ''}</div>`;
  }).join('')}</div></section>`;
}

function candidateSourceList(entry) {
  const sources = new Map((entry.sources ?? []).map((source) => [source.id, source]));
  if (entry.image?.media_type !== 'project-placeholder' && entry.imageSource) sources.set(entry.imageSource.id, entry.imageSource);
  const directUrl = entry.candidate.source_url;
  const directLink = directUrl && ![...sources.values()].some((source) => source.url === directUrl)
    ? `<p class="source-direct-link">Direct candidate link: <a href="${escapeAttr(directUrl)}" rel="noreferrer">open recorded source</a></p>`
    : '';
  if (!sources.size && !directLink) return '<p class="source-intro">No public source link is recorded yet.</p>';
  return `<div class="source-list"><p class="source-intro">These sources support this model page; individual claims retain the confidence of their cited source.</p>${directLink}${[...sources.values()].map((source) => {
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
  if (imageUrl(ctx, product.image)) add([product.image.source_id], 'Image', 'identity');
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
    ['triathlon', 'Triathlon / time trial'],
    ['track', 'Track bikes']
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

function catalogFilterShortcut(key, label) {
  return `<button class="catalog-filter-button" type="button" data-filter-heading="${escapeAttr(key)}" aria-label="Filter ${escapeAttr(label)}" title="Filter ${escapeAttr(label)}"><span aria-hidden="true">+</span></button>`;
}

const curatedComparisonGroups = [
  {
    id: 'affordable-carbon-aero',
    title: 'Affordable carbon aero',
    criteria: 'Dated complete-bike prices, named builds, and documented carbon aero platforms across three Chinese brands; research-stage status stays visible.',
    ids: ['candidate-cycletrack-phantom-rx24', 'twitter-cyclone-gen3-et', 'candidate-camp-ace-qed']
  },
  {
    id: 'electronic-gravel',
    title: 'Electronic gravel',
    criteria: 'Distinct electronic complete or frameset-build routes with dated pricing, recorded weight, and at least 40 mm documented tire capacity.',
    ids: ['twitter-v3-wheeltop-eds', 'pardus-super-sport-gen2-egr', 'incolor-voyager-frameset']
  },
  {
    id: 'wide-tire-aero',
    title: 'Wide-tire aero',
    criteria: 'Aerodynamically shaped road frames with documented 38 mm clearance and a dated frame or complete-build price.',
    ids: ['incolor-speedster-sr-frameset', 'candidate-lightcarbon-lcr018-d', 'candidate-tavelo-arden']
  }
];

function curatedStartingPoints(ctx, summaries) {
  const byId = new Map(summaries.map((item) => [item.id, item]));
  const groups = curatedComparisonGroups.map((group) => {
    const items = group.ids.map((id) => byId.get(id)).filter(Boolean);
    if (items.length !== group.ids.length) throw new Error(`Curated comparison group ${group.id} has an unresolved catalog id`);
    const params = new URLSearchParams({ compare: group.ids.join(',') });
    return `<article class="curated-group" data-curated-group="${escapeAttr(group.id)}"><div class="curated-group-heading"><h3>${escapeHtml(group.title)}</h3><a href="${url(ctx.base, '/')}?${escapeAttr(params.toString())}#compare" aria-label="Compare the three ${escapeAttr(group.title.toLowerCase())} choices">Compare three <span aria-hidden="true">→</span></a></div><p><strong>Criteria:</strong> ${escapeHtml(group.criteria)}</p><ol>${items.map((item) => {
      const itemName = item.brand && !item.name.toLowerCase().startsWith(item.brand.toLowerCase()) ? `${item.brand} ${item.name}` : item.name;
      const facts = [item.price, item.tireClearance, item.stage === 'candidate' ? 'Research' : ''].filter(Boolean);
      return `<li><a href="${escapeAttr(item.url)}">${escapeHtml(itemName)}</a><span>${escapeHtml(facts.join(' · '))}</span></li>`;
    }).join('')}</ol></article>`;
  }).join('');
  return `<section class="curated-picks page" aria-labelledby="curated-picks-title"><div class="curated-picks-heading"><div><span class="section-label">Comparison starting points</span><h2 id="curated-picks-title">Top bikes, with the criteria shown</h2></div><p>Three focused shortlists—not a universal score or a recommendation ranking.</p></div><div class="curated-groups">${groups}</div></section>`;
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
  const body = `<section class="catalog-intro"><div class="page intro-row"><div><h1>Bikes in China</h1><p>Compare China-market bikes and frame builds by price, category, and known specifications.</p></div><div class="build-creator" role="group" aria-label="Frameset build creator"><label class="build-preset-control" for="frameset-build-preset"><span>Frameset build</span><select id="frameset-build-preset" data-frameset-build-preset>${buildPresetOptions(ctx)}</select></label><label class="build-custom-control" for="frameset-build-allowance" data-build-custom hidden><span>Total allowance</span><span class="build-custom-input"><span>+ ¥</span><input id="frameset-build-allowance" type="number" min="0" max="100000" step="500" inputmode="numeric" value="${assumption.amount_cny}" data-frameset-build-allowance data-default-value="${assumption.amount_cny}" aria-label="Custom frameset build allowance in yuan"></span></label>${infoTip('Frameset build assumption', buildPresetNotes(ctx))}</div></div><div class="page catalog-context"><nav class="catalog-discovery" aria-label="Browse the catalog"><a href="${url(ctx.base, '/brands/')}">Brands</a><a href="${url(ctx.base, '/complete-bikes/')}">Complete bikes</a><a href="${url(ctx.base, '/framesets/')}">Framesets</a><a href="${url(ctx.base, '/prices/')}">Price ranges</a><a href="${url(ctx.base, '/methodology/')}">Sources and dataset</a></nav></div></section>
  ${curatedStartingPoints(ctx, summaries)}
  <section class="catalog-section" id="catalog"><div class="page" data-catalog-root>
    <div class="filter-bar">
      <div class="filter-primary">
        <div class="search-box"><label class="sr-only" for="catalog-search">Search bikes</label><span aria-hidden="true">⌕</span><input id="catalog-search" type="search" placeholder="Search model, use or drivetrain" autocomplete="off" data-filter-search></div>
        <label class="compact-select category-select"><span>Category</span><select name="category" data-filter-category><option value="">All categories</option>${categorySelectOptions(ctx, candidates)}</select></label>
        <label class="compact-number tire-filter"><span>Min tire clearance</span><span class="number-with-unit"><input id="catalog-tire-min" name="min-tire-clearance" type="number" min="0" max="100" step="1" inputmode="decimal" placeholder="Any" data-filter-tire aria-label="Minimum tire clearance"><span>mm</span></span></label>
        <div class="segmented" role="group" aria-label="Product type" data-type-control><button type="button" data-type-value="" aria-pressed="true">All</button><button type="button" data-type-value="complete-bike" aria-pressed="false">Complete</button><button type="button" data-type-value="frameset" aria-pressed="false">Frame builds</button></div>
        <button class="filter-panel-toggle" type="button" data-filter-panel-toggle aria-expanded="false" aria-controls="table-filters">+ Filter</button>
        <div class="filter-actions"><label class="compact-select sort-select"><span>Sort</span><select name="sort" data-sort><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name-asc">Bike: A to Z</option><option value="name-desc">Bike: Z to A</option><option value="tire-desc">Tire clearance: high to low</option><option value="tire-asc">Tire clearance: low to high</option><option value="capability-desc" disabled>Category fact: high to low</option><option value="capability-asc" disabled>Category fact: low to high</option></select></label><button class="reset-button" type="button" data-reset hidden>Clear</button></div>
      </div>
      <div class="filter-chips" data-filter-chips aria-label="Active table filters" hidden></div>
      <section class="filter-panel" id="table-filters" data-filter-panel aria-label="Table filters" hidden>
        <div class="filter-panel-heading"><div><span>Table filters</span><small>Only rows with recorded values match numeric limits.</small></div><button class="text-button" type="button" data-filter-panel-close>Close</button></div>
        <div class="filter-panel-grid">
          <label class="compact-number"><span>Max full-bike price</span><span class="number-with-unit prefix"><span>¥</span><input name="max-price" type="number" min="0" max="1000000" step="100" inputmode="numeric" placeholder="Any" data-filter-price></span></label>
          <label class="compact-number"><span>Max complete-bike weight</span><span class="number-with-unit"><input name="max-complete-weight" type="number" min="0" max="100" step="0.1" inputmode="decimal" placeholder="Any" data-filter-complete-weight><span>kg</span></span></label>
          <label class="compact-number"><span>Max frame weight</span><span class="number-with-unit"><input name="max-frame-weight" type="number" min="0" max="10000" step="10" inputmode="numeric" placeholder="Any" data-filter-frame-weight><span>g</span></span></label>
          <label class="compact-text"><span>Drivetrain contains</span><input name="drivetrain" type="search" autocomplete="off" placeholder="Shimano, electronic…" data-filter-drivetrain></label>
          <label class="compact-text"><span>Frame contains</span><input name="frame-fact" type="search" autocomplete="off" placeholder="T47, UDH, carbon…" data-filter-frame></label>
          <label class="compact-number"><span data-category-min-label>Category minimum</span><span class="number-with-unit"><input name="category-min" type="number" min="0" max="2000" step="1" inputmode="decimal" placeholder="Choose a comparable category" data-filter-category-min disabled><span data-category-min-unit></span></span></label>
          <label class="filter-check"><input type="checkbox" data-filter-tire-unknown disabled><span>Include unknown tire clearance when a minimum is set</span></label>
        </div>
      </section>
    </div>

    <section class="inline-compare" id="compare" data-inline-compare tabindex="-1" aria-labelledby="compare-title" hidden>
      <div class="compare-heading"><div><h2 id="compare-title">Compare</h2></div><div><button class="text-button" type="button" data-copy-comparison>Copy link</button><button class="text-button" type="button" data-close-compare>Close</button></div></div>
      <div data-compare-content></div>
    </section>

    <div class="catalog-meta"><span data-result-summary aria-live="polite" hidden><strong data-result-count>${ctx.products.length + defaultCandidateCount}</strong> matches<span data-result-context></span><span data-filter-notice></span></span><div class="catalog-meta-actions"><span class="catalog-selection-hint">Select two to ten bikes to compare</span><button class="text-button catalog-scope-button" type="button" data-show-all-models aria-pressed="false" aria-controls="catalog-rows">Show all models</button></div></div>
    <div class="catalog-table" id="catalog-rows" data-product-list role="table" aria-label="Bike comparison">
      <div class="catalog-head" role="row"><span role="columnheader" aria-label="Select"></span><span role="columnheader" aria-sort="none"><span class="catalog-heading-tools"><button class="catalog-sort-button" type="button" data-sort-heading="name"><span>Bike</span></button>${catalogFilterShortcut('search', 'bike')}</span></span><span role="columnheader" aria-sort="ascending"><span class="catalog-heading-tools"><button class="catalog-sort-button" type="button" data-sort-heading="price"><span>Full-bike price</span></button>${catalogFilterShortcut('price', 'full-bike price')}</span></span><span role="columnheader" aria-sort="none"><span class="catalog-heading-tools"><button class="catalog-sort-button" type="button" data-sort-heading="capability" disabled><span data-capability-heading-label>Category fact</span></button>${catalogFilterShortcut('category', 'category fact')}</span></span><span role="columnheader" aria-sort="none"><span class="catalog-heading-tools"><button class="catalog-sort-button" type="button" data-sort-heading="tire"><span>Tire clearance</span></button>${catalogFilterShortcut('tire', 'tire clearance')}</span></span><span role="columnheader"><span class="catalog-heading-tools"><span>Drivetrain</span>${catalogFilterShortcut('drivetrain', 'drivetrain')}</span></span><span role="columnheader"><span class="catalog-heading-tools"><span>Weight</span>${catalogFilterShortcut('weight', 'weight')}</span></span><span role="columnheader"><span class="catalog-heading-tools"><span>Frame</span>${catalogFilterShortcut('frame', 'frame')}</span></span><span role="columnheader" aria-label="Details"></span></div>
      ${rows.map((row) => row.html).join('')}
      <div class="empty-state" data-empty hidden>No bikes match these filters.</div>
    </div>
    <script type="application/json" id="catalog-data">${safeJson(summaries)}</script>
  </div></section>`;
  return page(ctx, {
    current: 'catalog',
    path: '/',
    body,
    image: url(ctx.base, '/assets/social-preview.png'),
    imageAlt: 'China Bikes wordmark with three project-owned technical bicycle and frameset silhouettes',
    imageWidth: 1200,
    imageHeight: 630,
    imageType: 'image/png',
    structuredData: websiteStructuredData({
      siteUrl: ctx.siteUrl,
      base: ctx.base,
      description
    })
  });
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
  const bestFor = variant.editorial.best_for?.join(', ');
  const weight = weightLabel(product);
  const tireClearance = publishedTireClearance(product);
  const frameMaterial = frameMaterialLabel(product);
  const keyHardware = [
    `${frameMaterial} frame`,
    variant.kind === 'complete-bike' ? drivetrainLabel(ctx, product) : null,
    weight !== '—' ? `${weight} weight` : null,
    tireClearance.value !== '—' ? `tire clearance ${tireClearance.value}` : null,
    !['discipline', 'tire'].includes(metric.kind) && metric.value !== '—' ? `${metric.label.toLowerCase()} ${metric.value}` : null
  ].filter(Boolean).join('; ');
  const priceBrief = superseded
    ? `This version is no longer sold new and was superseded by the ${successorLabel(platform)}. The dated price record below is historical only.`
    : variant.kind === 'frameset'
    ? `The displayed ${formatAllInPrice(product)} estimate adds the adjustable ${formatCny(assumption.amount_cny)} build allowance to the latest frame price.`
    : `The recorded complete-bike price is ${formatAllInPrice(product)}; the dated price record below preserves its channel and conditions.`;
  const modelPriceAttributes = variant.kind === 'frameset'
    ? ` data-model-frame-price-low="${product.allInPrice.frameLow}" data-model-frame-price-high="${product.allInPrice.frameHigh}" data-model-default-allowance="${assumption.amount_cny}"`
    : '';
  const modelName = `${brand.name} ${variant.name}`;
  const modelTrail = [{
    name: variant.kind === 'frameset' ? 'Framesets' : 'Complete bikes',
    path: variant.kind === 'frameset' ? '/framesets/' : '/complete-bikes/'
  }];
  const reviewedThrough = productEvidenceDate(ctx, product);
  const detailFacts = [
    ...(metric.kind === 'tire' ? [] : [[metric.label, metric.value, infoTip(`${metric.label} details`, metric.details)]]),
    ['Tire clearance', tireClearance.value, tireClearance.details.length ? infoTip('Tire clearance details', tireClearance.details) : ''],
    ...(variant.kind === 'complete-bike' ? [['Drivetrain', drivetrainLabel(ctx, product), '']] : []),
    ['Weight', weightLabel(product), ''],
    ['Frame standard', frameStandard(product), ''],
    ['Category', `${categoryLabel(platform.category)} · ${platform.handlebar}-bar`, ''],
    ['Availability', availabilityLabel(platform.china_availability), '']
  ];
  const specificationRows = publishedSpecificationRows(product);
  const storyTitle = publishedStoryTitle(product, weight, tireClearance);
  const heroImage = imageUrl(ctx, product.image);
  const imageFigure = heroImage ? productGalleryFigure(ctx, product) : '';
  const seoProperties = [
    ['Product type', variant.kind === 'frameset' ? 'Frameset' : 'Complete bike'],
    ['Frame material', frameMaterialLabel(product)],
    ...(tireClearance.value !== '—' ? [['Maximum tire clearance', tireClearance.value]] : []),
    ...(weight !== '—' ? [['Weight', weight]] : []),
    ...(variant.kind === 'complete-bike' ? [['Drivetrain', drivetrainLabel(ctx, product)]] : [])
  ];
  const body = `<section class="model-page"><div class="page">${breadcrumbs(ctx, modelName, modelTrail, { catalogBack: true })}${evidenceContext(ctx, reviewedThrough, { sourceTarget: 'source-records' })}<div class="model-grid${heroImage ? '' : ' has-no-image'}">
    ${imageFigure}
    <div class="model-summary"><div class="model-brand"><a class="model-brand-filter" href="${url(ctx.base, '/')}?brand=${encodeURIComponent(brand.id)}#catalog" aria-label="${escapeAttr(brandLabel)} — show this brand in the catalog">${escapeHtml(brandLabel)}</a>${variant.kind === 'frameset' ? '<span class="type-pill">Frame estimate</span>' : ''}${statusFlag(product)}</div><h1>${escapeHtml(variant.name)}</h1><div class="model-price"${modelPriceAttributes}><strong${variant.kind === 'frameset' ? ' data-model-calculated-price' : ''}>${escapeHtml(publishedPriceLabel(product))}</strong>${infoTip('Price details', priceTooltipLines(ctx, product))}<span>${escapeHtml(priceSubline)}</span></div><div class="model-actions"><button class="secondary-button model-compare-button" type="button" data-add-to-comparison data-product-id="${escapeAttr(variant.id)}" data-product-name="${escapeAttr(`${brand.name} ${variant.name}`)}">Add to comparison</button><a class="primary-button" href="${url(ctx.base, '/build/')}?base=${encodeURIComponent(variant.id)}">${variant.kind === 'frameset' ? 'Build this frame' : 'Modify this bike'}</a><a class="text-button" href="${url(ctx.base, '/')}#catalog" data-model-compare-link>Choose another bike</a></div><dl class="model-facts">${detailFacts.map(([label, value, tip]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}${label === 'Drivetrain' ? electronicGroupsetReference(ctx, value) : ''}${tip}</dd></div>`).join('')}</dl></div>
  </div>
  <div class="model-content">
    <section class="model-story" aria-labelledby="model-story-title"><h2 id="model-story-title">${escapeHtml(storyTitle)}</h2><p class="model-story-lede">${escapeHtml(variant.editorial.verdict)}</p><p${variant.kind === 'frameset' ? ' data-model-price-brief' : ''}>${escapeHtml(priceBrief)}${bestFor ? ` Best suited to ${escapeHtml(bestFor)}.` : ''}</p><p><strong>Key hardware:</strong> ${escapeHtml(keyHardware)}.</p></section>
    <section class="detail-section specification-snapshot" aria-labelledby="specification-snapshot-title"><h2 id="specification-snapshot-title">Specifications and evidence</h2><dl class="detail-list">${specificationRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}<div><dt>Frame material</dt><dd>${escapeHtml(frameMaterialLabel(product))}</dd></div>${platform.frame.construction ? `<div><dt>Frame construction</dt><dd>${escapeHtml(platform.frame.construction)}</dd></div>` : ''}<div><dt>Stiffness evidence</dt><dd>${escapeHtml(platform.frame.stiffness_evidence ?? 'Not recorded')}</dd></div><div><dt>Cable routing</dt><dd>${escapeHtml(sentenceLabel(platform.frame.cable_routing ?? 'Not recorded'))}</dd></div><div><dt>${escapeHtml(metric.label)}</dt><dd>${escapeHtml(metric.value)}</dd></div><div><dt>Category evidence</dt><dd>${escapeHtml(metric.details.join(' ') || 'Not recorded')}</dd></div><div><dt>Internal frame storage</dt><dd>${platform.internal_storage ? 'Yes' : 'No'}</dd></div><div><dt>Mounts</dt><dd>${escapeHtml(platform.mounts?.join(', ') || 'None recorded')}</dd></div><div><dt>China purchase</dt><dd>${escapeHtml(availabilityLabel(platform.china_availability))}</dd></div></dl></section>
    <section class="model-reading" aria-labelledby="buying-context-title"><h2 id="buying-context-title">Ride and buying context</h2><p>${escapeHtml(sentenceList(variant.editorial.strengths))}</p><h3>What to verify</h3><p>${escapeHtml(sentenceList(variant.editorial.caveats))}</p></section>
    ${brandStory(brand)}
    ${videoContext(videos)}
    <details class="detail-panel" id="source-records"><summary>Price record and sources</summary><div class="detail-panel-body"><div class="price-records">${prices.map((price) => `<div><strong>${escapeHtml(formatPrice(price))}</strong><span>${escapeHtml(price.observed_at)} · ${escapeHtml(sentenceLabel(price.price_type))} · ${escapeHtml(priceStatusLabel(price.status))}</span>${price.conditions ? `<p>${escapeHtml(price.conditions)}</p>` : ''}</div>`).join('')}</div>${sourceList(ctx, product)}</div></details>
  </div></div></section>`;
  return page(ctx, {
    title: modelName,
    current: variant.kind === 'frameset' ? 'framesets' : 'catalog',
    path: `/models/${variant.id}/`,
    description: variant.editorial.verdict,
    image: heroImage,
    imageAlt: product.image?.alt ?? `${brand.name} ${variant.name}`,
    ogType: 'product',
    structuredData: productPageStructuredData({
      siteUrl: ctx.siteUrl,
      base: ctx.base,
      path: `/models/${variant.id}/`,
      name: `${brand.name} ${variant.name}`,
      model: variant.name,
      brand: brand.name,
      description: variant.editorial.verdict,
      category: categoryLabel(platform.category),
      image: heroImage,
      properties: seoProperties,
      trail: modelTrail
    }),
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

function sentenceList(items = []) {
  return items
    .map((item) => String(item ?? '').trim().replace(/[.;]+$/, ''))
    .filter(Boolean)
    .map((item) => `${item}.`)
    .join(' ');
}

function publishedStoryTitle(product, weight, tireClearance) {
  const weightDescription = weight === '—'
    ? ''
    : /\b(?:frame|complete bike)$/.test(weight)
      ? weight
      : `${weight} ${product.variant.kind === 'frameset' ? 'frame' : 'complete bike'}`;
  const details = [
    weightDescription,
    tireClearance.value !== '—' ? `${tireClearance.value} tire clearance` : ''
  ].filter(Boolean);
  return details.length ? `${details.join(' with ')}` : `What defines the ${product.variant.name}`;
}

function candidateStoryTitle(ctx, entry) {
  const facts = entry.candidate.facts ?? {};
  const details = [
    Number.isFinite(facts.complete_weight_g) ? `${(facts.complete_weight_g / 1000).toFixed(1)} kg complete bike` : '',
    !Number.isFinite(facts.complete_weight_g) && Number.isFinite(facts.frame_weight_g) ? `${new Intl.NumberFormat('en-US').format(facts.frame_weight_g)} g frame` : '',
    Number.isFinite(facts.tire_clearance_mm) ? `${facts.tire_clearance_mm} mm tire clearance` : ''
  ].filter(Boolean);
  if (details.length) return details.join(' with ');
  if (entry.price) return `${candidatePriceLabel(ctx, entry)} ${entry.kind === 'frameset' ? 'frameset' : 'complete-bike'} lead under review`;
  return `What is verified about the ${entry.candidate.name}`;
}

function brandStory(brand) {
  if (!brand) return '';
  const profile = brand.profile ?? {};
  const paragraph = profile.summary ?? brand.manufacturing?.summary ?? '';
  return `<section class="brand-story" aria-labelledby="about-${escapeAttr(brand.id)}-title"><h2 id="about-${escapeAttr(brand.id)}-title">About ${escapeHtml(brand.name)}</h2><p>${escapeHtml(paragraph)}</p>${brand.website ? `<a href="${escapeAttr(brand.website)}" rel="noreferrer">Visit the official ${escapeHtml(brand.name)} website</a>` : ''}</section>`;
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
      : 'A current price is not recorded.'
    : entry.kind === 'frameset'
      ? `The displayed ${candidatePriceLabel(ctx, entry)} estimate adds the adjustable ${formatCny(assumption.amount_cny)} build allowance to the recorded ${formatPrice(entry.price)} ${candidateFramePriceTerm(entry).toLowerCase()} price.${candidatePackageOverlapNote(entry) ? ` ${candidatePackageOverlapNote(entry)}` : ''}`
      : entry.price.price_type === 'reference-conversion'
        ? `${candidatePriceLabel(ctx, entry)} is a dated currency conversion of an official non-mainland price, not a confirmed China checkout price.`
        : `The recorded complete-bike price is ${candidatePriceLabel(ctx, entry)}; its date and basis remain visible below.`;
  const sourceNote = candidate.source_note ? candidatePublicText(candidate.source_note) : '';
  const type = entry.kind === 'frameset' ? 'Frame estimate' : entry.kind === 'complete-bike' ? 'Complete bike' : 'Bike lead';
  const candidateSeoProduct = entry.identifiableModel && !['Identity not confirmed', 'Exact configuration not confirmed'].includes(maturity);
  const { low: frameLow, high: frameHigh } = candidatePriceBounds(entry);
  const modelPriceAttributes = entry.kind === 'frameset' && Number.isFinite(frameLow)
    ? ` data-model-frame-price-low="${frameLow}" data-model-frame-price-high="${frameHigh}" data-model-default-allowance="${assumption.amount_cny}"`
    : '';
  const pageTitle = brand?.name && candidate.name.toLowerCase().startsWith(brand.name.toLowerCase())
    ? candidate.name
    : `${brand?.name ? `${brand.name} ` : ''}${candidate.name}`;
  const reviewedThrough = candidateEvidenceDate(ctx, entry);
  const candidateHeroImage = imageUrl(ctx, entry.image);
  const imageFigure = candidateGalleryFigure(ctx, entry);
  const storyTitle = candidateStoryTitle(ctx, entry);
  const body = `<section class="model-page candidate-model-page"><div class="page">${breadcrumbs(ctx, pageTitle, [], { catalogBack: true })}${evidenceContext(ctx, reviewedThrough, { sourceTarget: 'source-records' })}<div class="model-grid${imageFigure ? '' : ' has-no-image'}">
    ${imageFigure}
    <div class="model-summary"><div class="model-brand">${brand ? `<a class="model-brand-filter" href="${url(ctx.base, '/')}?brand=${encodeURIComponent(brand.id)}#catalog" aria-label="${escapeAttr(brandLabel)} — show this brand in the catalog">${escapeHtml(brandLabel)}</a>` : `<span>${escapeHtml(brandLabel)}</span>`}<span class="type-pill">${escapeHtml(type)}</span><span class="status-pill">${escapeHtml(maturity)}</span></div><h1>${escapeHtml(candidate.name)}</h1><div class="model-price"${modelPriceAttributes}><strong${modelPriceAttributes ? ' data-model-calculated-price' : ''}>${escapeHtml(price)}</strong>${priceState ? `<span>${escapeHtml(priceState)}</span>` : ''}</div><div class="model-actions"><button class="secondary-button model-compare-button" type="button" data-add-to-comparison data-product-id="${escapeAttr(entry.id)}" data-product-name="${escapeAttr(candidate.name)}">Add to comparison</button><a class="text-button" href="${url(ctx.base, '/')}#catalog" data-model-compare-link>Choose another bike</a></div><dl class="model-facts"><div><dt>Category</dt><dd>${escapeHtml(category)}</dd></div><div><dt>Profile status</dt><dd>${escapeHtml(maturity)}</dd></div>${facts.slice(0, 4).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}${label === 'Drivetrain' ? electronicGroupsetReference(ctx, value) : ''}</dd></div>`).join('')}</dl></div>
  </div>
  <div class="model-content">
    <section class="model-story" aria-labelledby="candidate-story-title"><h2 id="candidate-story-title">${escapeHtml(storyTitle)}</h2><p class="model-story-lede">${escapeHtml(reason)}</p><p${modelPriceAttributes ? ' data-model-price-brief' : ''}>${escapeHtml(priceBrief)}</p></section>
    ${candidateAlternativeBuilds(entry)}
    <section class="detail-section" aria-labelledby="candidate-specifications-title"><h2 id="candidate-specifications-title">Specifications and evidence</h2><dl class="detail-list"><div><dt>Product type</dt><dd>${escapeHtml(type)}</dd></div><div><dt>Category</dt><dd>${escapeHtml(category)}</dd></div><div><dt>Evidence maturity</dt><dd>${escapeHtml(maturity)}</dd></div><div><dt>Price basis</dt><dd>${escapeHtml(priceState || 'Not recorded')}</dd></div>${facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}${label === 'Drivetrain' ? electronicGroupsetReference(ctx, value) : ''}</dd></div>`).join('')}${candidate.manufacturing ? `<div><dt>Manufacturing note</dt><dd>${escapeHtml(candidatePublicText(candidate.manufacturing))}</dd></div>` : ''}</dl>${sourceNote ? `<p>${escapeHtml(sourceNote)}</p>` : ''}</section>
    <section class="model-reading" aria-labelledby="candidate-buying-context-title"><h2 id="candidate-buying-context-title">Buying context</h2><p>${missing.length ? escapeHtml(`Before buying, verify ${missing.map((item) => String(item).trim().replace(/[.;]+$/, '')).join('; ')}.`) : 'No additional evidence gaps are documented.'}</p></section>
    ${brandStory(brand)}
    <details class="detail-panel" id="source-records"><summary>Price record and sources</summary><div class="detail-panel-body">${entry.price ? `<div class="price-records"><div><strong>${escapeHtml(formatPrice(entry.price))}</strong><span>${escapeHtml(entry.price.observed_at ?? 'Date not recorded')} · ${escapeHtml(candidatePriceRecordLabel(entry))}</span></div></div>` : ''}${candidateSourceList(entry)}</div></details>
  </div></div></section>`;
  return page(ctx, {
    title: pageTitle,
    current: 'catalog',
    path: `/models/${candidate.id}/`,
    description: reason,
    image: candidateHeroImage,
    imageAlt: entry.image?.alt ?? candidate.name,
    ogType: candidateSeoProduct ? 'product' : 'website',
    structuredData: productPageStructuredData({
      siteUrl: ctx.siteUrl,
      base: ctx.base,
      path: `/models/${candidate.id}/`,
      name: pageTitle,
      model: candidate.name,
      brand: brand?.name ?? '',
      description: reason,
      category,
      image: candidateHeroImage,
      properties: facts,
      includeProduct: candidateSeoProduct
    }),
    body
  });
}

function prosePage(ctx, { title, desc, path, html, current = '', className = '', structuredData = [], trail = [] }) {
  return page(ctx, {
    title,
    current,
    path,
    description: desc,
    structuredData,
    body: `<section class="simple-page"><article class="page prose${className ? ` ${escapeAttr(className)}` : ''}">${breadcrumbs(ctx, title, trail)}<h1>${escapeHtml(title)}</h1><p class="page-lede">${escapeHtml(desc)}</p>${html}</article></section>`
  });
}

function landingProductCard(ctx, product) {
  const tire = publishedTireClearance(product);
  const weight = weightLabel(product);
  const facts = [
    categoryLabel(product.platform.category),
    product.variant.kind === 'complete-bike' ? drivetrainLabel(ctx, product) : 'Frameset',
    tire.value !== '—' ? `${tire.value} tire clearance` : '',
    weight !== '—' ? `${weight} weight` : ''
  ].filter(Boolean);
  const modelPath = `/models/${product.variant.id}/`;
  return `<article class="landing-product" data-landing-product="${escapeAttr(product.variant.id)}"><div><p class="landing-product-brand">${escapeHtml(product.brand.name)}${product.brand.name_zh ? ` · ${escapeHtml(product.brand.name_zh)}` : ''}</p><h2><a href="${url(ctx.base, modelPath)}">${escapeHtml(product.variant.name)}</a></h2><p>${escapeHtml(facts.join(' · '))}</p></div><div class="landing-product-price"><strong>${escapeHtml(publishedPriceLabel(product))}</strong><span>${escapeHtml(priceState(product))}</span><small>Evidence reviewed ${escapeHtml(productEvidenceDate(ctx, product))}</small></div></article>`;
}

function landingHubCards(ctx, landing) {
  const entries = landing.kind === 'brand-hub' ? landing.brands : landing.pricePages;
  return `<div class="landing-hub-grid">${entries.map((entry) => `<article><h2><a href="${url(ctx.base, entry.route)}">${escapeHtml(entry.kind === 'price' ? entry.linkLabel : entry.brand.name)}</a></h2><p>${escapeHtml(entry.kind === 'price' ? entry.description : entry.brand.manufacturing.summary)}</p><a class="landing-card-link" href="${url(ctx.base, entry.route)}">Open ${escapeHtml(entry.kind === 'price' ? 'price range' : `${entry.brand.name} models`)} →</a></article>`).join('')}</div>`;
}

function landingContext(ctx, landing) {
  if (landing.kind === 'brand') {
    const brand = landing.brand;
    return `<section class="landing-facts" aria-labelledby="brand-context-title"><h2 id="brand-context-title">Brand context</h2><p>${escapeHtml(brand.manufacturing.summary)}</p><dl><div><dt>Manufacturing relationship</dt><dd>${escapeHtml(sentenceLabel(brand.manufacturing.relationship))}</dd></div><div><dt>Evidence confidence</dt><dd>${escapeHtml(confidenceLabel(brand.manufacturing.confidence))}</dd></div><div><dt>China purchase</dt><dd>${escapeHtml(sentenceLabel(brand.china_support.domestic_purchase))}</dd></div><div><dt>Warranty</dt><dd>${escapeHtml(warrantyLabel(brand.china_support.warranty))}</dd></div></dl>${brand.website ? `<a href="${escapeAttr(brand.website)}" rel="noreferrer">Official brand website</a>` : ''}</section>`;
  }
  if (landing.kind === 'price') {
    return '<p class="landing-rule">A product appears only when its full recorded range fits this band. Candidate profiles, historical-only prices, and ranges crossing a boundary are excluded. Frameset figures include the reviewed build allowance and remain estimates.</p>';
  }
  if (landing.id === 'framesets') {
    return `<p class="landing-rule">Every figure combines the dated frame-package price with the reviewed ${escapeHtml(formatCny(buildAssumption(ctx).amount_cny))} default build allowance. It is a planning estimate, not a package quote.</p>`;
  }
  if (landing.id === 'complete-bikes') {
    return '<p class="landing-rule">Only publication-ready exact configurations are listed here. Research-stage profiles remain in the main catalog and do not enter this landing page.</p>';
  }
  if (landing.kind === 'brand-hub') {
    return `<p class="landing-rule">A brand page is generated only when at least two exact publication-ready configurations are available. Single-record and candidate-only brands remain discoverable in the main catalog.</p>`;
  }
  return '<p class="landing-rule">Price bands use the full published range. Products whose ranges cross a boundary remain in the main catalog instead of being forced into a band.</p>';
}

export function renderLandingPage(ctx, landing) {
  const reviewedThrough = landing.lastmod ?? ctx.siteLastmod ?? ctx.data.meta.snapshot_date;
  const hub = landing.kind === 'brand-hub' || landing.kind === 'price-hub';
  const items = hub
    ? (landing.kind === 'brand-hub' ? landing.brands : landing.pricePages).map((entry) => ({
        name: entry.kind === 'price' ? entry.title : `${entry.brand.name} bikes in China`,
        path: entry.route
      }))
    : landing.products.map((product) => ({
        name: `${product.brand.name} ${product.variant.name}`,
        path: `/models/${product.variant.id}/`
      }));
  const body = `<section class="landing-page"><div class="page">${breadcrumbs(ctx, landing.title, landing.trail ?? [])}<header class="landing-header"><p class="landing-kicker">Evidence-led catalog</p><h1>${escapeHtml(landing.title)}</h1><p>${escapeHtml(landing.description)}</p>${evidenceContext(ctx, reviewedThrough)}</header>${landingContext(ctx, landing)}${hub ? landingHubCards(ctx, landing) : `<div class="landing-product-list">${landing.products.map((product) => landingProductCard(ctx, product)).join('')}</div>`}<p class="landing-catalog-link"><a href="${url(ctx.base, '/')}">Open the full catalog and filters →</a></p></div></section>`;
  return page(ctx, {
    title: landing.title,
    current: landing.id === 'framesets' ? 'framesets' : 'catalog',
    path: landing.route,
    description: landing.description,
    structuredData: collectionStructuredData({
      siteUrl: ctx.siteUrl,
      base: ctx.base,
      path: landing.route,
      name: landing.title,
      description: landing.description,
      items,
      trail: landing.trail ?? []
    }),
    body
  });
}

const buildSlotCopy = {
  drivetrain: ['Drivetrain package', 'Shifting, brakes and every explicitly included transmission part.'],
  brakes: ['Brake system', 'Levers, calipers and hoses when they are not covered by the drivetrain package.'],
  crankset: ['Crankset', 'Crank and chainrings when omitted from the selected drivetrain package.'],
  cassette: ['Cassette', 'Must match the drivetrain speed count and wheel freehub.'],
  chain: ['Chain', 'Must match the selected drivetrain speed count.'],
  'bottom-bracket': ['Bottom bracket', 'Must match both the frameset shell and crank spindle.'],
  rotors: ['Brake rotors', 'A front and rear pair unless the selected package explicitly includes them.'],
  wheelset: ['Wheelset', 'Front and rear wheels; confirm axle, rotor mount and freehub.'],
  tires: ['Tires', 'A pair whose installed width stays within the frame and rim limits.'],
  'tubes-sealant': ['Tubes / tubeless kit', 'Two tubes or valves, sealant and tape for a tubeless setup.'],
  cockpit: ['Cockpit', 'Handlebar and stem or an integrated cockpit.'],
  saddle: ['Saddle', 'Seatpost is assumed to be in the recorded frameset package only when listed there.'],
  pedals: ['Pedals', 'A pair; leave custom price and weight at zero only if intentionally excluded.'],
  'bar-tape': ['Bar tape', 'One complete drop-bar wrapping kit.'],
  assembly: ['Assembly', 'Labor and small consumables; weight may legitimately be zero.']
};

function builderBottomBracketKey(value) {
  const text = String(value || '').toLowerCase();
  if (text.includes('t47')) return 't47';
  if (text.includes('bb86') || text.includes('pf86')) return 'bb86';
  if (text.includes('bsa') || text.includes('english')) return 'bsa-68';
  return text.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function builderPriceBounds(price) {
  if (!price) return { low: null, high: null };
  const low = price.amount_cny ?? price.low_cny ?? null;
  const high = price.amount_cny ?? price.high_cny ?? low;
  return { low, high };
}

function builderCandidatePrice(price) {
  if (price?.price_type === 'reference-conversion') {
    return {
      low: null,
      high: null,
      note: 'Converted reference price excluded; enter the exact purchase price.'
    };
  }
  if (price?.price_type === 'official-conflict') {
    return {
      low: null,
      high: null,
      note: 'Conflicting official prices excluded; enter the exact purchase price.'
    };
  }
  const bounds = builderPriceBounds(price);
  return {
    ...bounds,
    note: bounds.low === null ? 'Exact purchase price needed.' : ''
  };
}

function builderBases(ctx) {
  const published = ctx.products.map((product) => {
    const isComplete = product.variant.kind === 'complete-bike';
    const weight = publishedWeightFilter(product);
    return {
      id: product.variant.id,
      name: `${product.brand.name} ${product.variant.name}`,
      url: url(ctx.base, `/models/${product.variant.id}/`),
      kind: product.variant.kind,
      stage: 'published',
      category: categoryFamily(product.platform.category),
      priceLow: isComplete ? product.allInPrice.low : product.allInPrice.frameLow,
      priceHigh: isComplete ? product.allInPrice.high : product.allInPrice.frameHigh ?? product.allInPrice.frameLow,
      baseWeightG: weight.grams,
      weightBasis: isComplete
        ? product.variant.claimed_complete_weight_basis ?? 'complete-bike weight basis not recorded'
        : weight.grams ? 'frame only; fork and package hardware may be additional unknown weight' : 'frameset package weight unknown',
      bottomBracket: product.platform.frame.bottom_bracket,
      bottomBracketKey: builderBottomBracketKey(product.platform.frame.bottom_bracket),
      tireClearanceMm: maxClearance(product.platform) ?? null,
      included: isComplete ? ['complete bike package'] : product.variant.included ?? [],
      drivetrain: isComplete ? drivetrainLabel(ctx, product) : '',
    };
  });
  const candidates = joinCatalogCandidates(ctx.data)
    .filter((entry) => entry.kind && entry.identifiableModel)
    .map((entry) => {
      const facts = entry.candidate.facts ?? {};
      const { low, high, note } = builderCandidatePrice(entry.price);
      const isComplete = entry.kind === 'complete-bike';
      return {
        id: entry.id,
        name: `${entry.candidate.name} · research stage`,
        url: url(ctx.base, `/models/${entry.candidate.id}/`),
        kind: entry.kind,
        stage: 'candidate',
        category: categoryFamily(entry.category),
        priceLow: low,
        priceHigh: high,
        priceNote: note,
        baseWeightG: isComplete ? facts.complete_weight_g ?? null : facts.frame_weight_g ?? null,
        weightBasis: isComplete ? facts.complete_weight_basis ?? 'complete-bike weight basis not recorded' : facts.frame_weight_basis ?? 'frameset package weight unknown',
        bottomBracket: facts.bottom_bracket ?? '',
        bottomBracketKey: builderBottomBracketKey(facts.bottom_bracket),
        tireClearanceMm: facts.tire_clearance_mm ?? null,
        included: isComplete ? ['complete bike package'] : [],
        drivetrain: isComplete ? facts.drivetrain ?? '' : '',
      };
    });
  return [...published, ...candidates].sort((left, right) => {
    if (left.stage !== right.stage) return left.stage === 'published' ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

function builderParts(ctx) {
  const sources = new Map(ctx.data.sources.map((source) => [source.id, source]));
  return ctx.data.buildParts.map((part) => {
    const primarySource = sources.get(part.price_observation?.source_id)
      ?? sources.get(part.weight?.source_id)
      ?? sources.get(part.source_ids?.[0]);
    return {
      id: part.id,
      maker: part.maker,
      name: part.name,
      slot: part.slot,
      covers: part.covers ?? [],
      default: part.default === true,
      priceCny: part.price_observation?.amount_cny ?? null,
      priceDate: part.price_observation?.observed_at ?? null,
      priceBasis: part.price_observation?.package_basis ?? '',
      weightG: part.weight?.status === 'known' ? part.weight.grams : null,
      weightBasis: part.weight?.basis ?? 'Weight unknown',
      compatibility: part.compatibility ?? {},
      includedComponents: part.included_components ?? [],
      note: part.note ?? '',
      source: primarySource ? { title: primarySource.title, url: primarySource.url ?? '' } : null,
    };
  });
}

function builderPartOptions(parts, slot) {
  const matching = parts.filter((part) => part.slot === slot);
  return [
    '<option value="included" hidden disabled>Keep included bike part</option>',
    '<option value="custom">Custom / enter values</option>',
    ...matching.map((part) => `<option value="${escapeAttr(part.id)}"${part.default ? ' selected' : ''}>${escapeHtml(`${part.maker} ${part.name}`)}</option>`)
  ].join('');
}

function builderSlotRow(ctx, parts, slot) {
  const [label, help] = buildSlotCopy[slot];
  return `<section class="builder-part-row" data-build-slot="${escapeAttr(slot)}">
    <div class="builder-part-label"><h2>${escapeHtml(label)}</h2><p>${escapeHtml(help)}</p></div>
    <div class="builder-part-control"><label><span class="sr-only">${escapeHtml(label)}</span><select data-build-part-select>${builderPartOptions(parts, slot)}</select></label><div class="builder-custom-values" data-build-custom-values hidden><label data-build-custom-price-field>Price ¥<input type="number" min="0" max="200000" step="1" inputmode="numeric" data-build-custom-price></label><label data-build-custom-weight-field>New weight g<input type="number" min="0" max="20000" step="1" inputmode="numeric" data-build-custom-weight></label><label data-build-removed-weight-field hidden>Removed weight g<input type="number" min="0" max="20000" step="1" inputmode="numeric" data-build-removed-weight></label></div></div>
    <div class="builder-part-facts"><strong data-build-part-price>—</strong><span data-build-part-weight>—</span><small data-build-part-basis></small><a href="${url(ctx.base, '/methodology/')}" data-build-part-source hidden rel="noreferrer">Source</a></div>
    <p class="builder-covered-note" data-build-covered-note hidden></p>
  </section>`;
}

export function renderBikeBuilder(ctx) {
  const bases = builderBases(ctx);
  const parts = builderParts(ctx);
  const builderDescription = 'Configure a China-market frameset or complete bike with sourced components and transparent price, weight, package and compatibility totals.';
  const initialBase = bases[0];
  const publishedBases = bases.filter((base) => base.stage === 'published');
  const baseOptions = `<optgroup label="Published catalog">${publishedBases.map((base) => `<option value="${escapeAttr(base.id)}">${escapeHtml(base.name)}</option>`).join('')}</optgroup>`;
  const payload = { schemaVersion: 2, slots: buildSlotIds, bases, parts };
  const body = `<section class="builder-intro"><div class="page">${breadcrumbs(ctx, 'Bike configurator')}<span class="builder-kicker">Component planner</span><h1>Configure a bike</h1><p>Start from an exact frameset or complete bike. Totals count packages once and keep every unresolved price or weight visible.</p></div></section>
  <section class="builder-page page" data-bike-builder>
    <div class="builder-workbench">
      <section class="builder-frame-row"><div class="builder-base-control"><label for="builder-base"><span>Starting point</span><select id="builder-base" data-build-base>${baseOptions}</select></label><p data-build-base-facts>${initialBase ? escapeHtml(`${initialBase.kind === 'complete-bike' ? 'Complete bike' : 'Frameset'} · ${initialBase.bottomBracket || 'bottom bracket unknown'} · ${initialBase.tireClearanceMm ? `${initialBase.tireClearanceMm} mm tire clearance` : 'tire clearance unknown'}`) : 'No catalog base is currently available.'}</p><div class="builder-base-custom" data-build-base-custom hidden><label data-build-base-price-field>Base price ¥<input type="number" min="0" max="1000000" step="1" inputmode="numeric" data-build-base-price></label><label data-build-base-weight-field>Base weight g<input type="number" min="0" max="30000" step="1" inputmode="numeric" data-build-base-weight></label></div></div><a data-build-base-link href="${initialBase ? initialBase.url : url(ctx.base, '/')}">Base details</a></section>
      <div class="builder-parts" aria-label="Required build parts">${buildSlotIds.map((slot) => builderSlotRow(ctx, parts, slot)).join('')}</div>
    </div>
    <aside class="builder-summary" aria-labelledby="builder-summary-title"><span class="builder-kicker" data-build-summary-kicker>Current build</span><h2 id="builder-summary-title" data-build-name>Build total</h2><dl><div><dt data-build-price-label>Full price</dt><dd data-build-total-price>—</dd></div><div><dt data-build-weight-label>Known weight</dt><dd data-build-total-weight>—</dd></div></dl><p data-build-completeness aria-live="polite"></p><div data-build-compatibility aria-live="polite"></div><button class="secondary-button" type="button" data-build-copy>Copy build link</button><button class="text-button" type="button" data-build-reset>Reset</button><small>Compatibility checks cover only recorded standards. Confirm every part, hose, axle, mount and included fastener with the seller or mechanic.</small></aside>
    <script type="application/json" id="build-configurator-data">${safeJson(payload)}</script>
  </section>`;
  return page(ctx, {
    title: 'Bike configurator',
    description: builderDescription,
    path: '/build/',
    current: 'builder',
    structuredData: webApplicationStructuredData({
      siteUrl: ctx.siteUrl,
      base: ctx.base,
      path: '/build/',
      name: 'China bike configurator',
      description: builderDescription
    }),
    body,
  });
}

function groupsetHeadlinePrices(groupset) {
  return (groupset.price_observations ?? []).filter((observation) => observation.headline !== false);
}

function groupsetPriceLabel(groupset) {
  const observations = groupsetHeadlinePrices(groupset);
  if (!observations.length) return '';
  const amounts = observations.map((observation) => observation.amount);
  const currencies = new Set(observations.map((observation) => observation.currency));
  const format = (amount) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount);
  if (currencies.size === 1 && currencies.has('CNY')) {
    const low = Math.min(...amounts);
    const high = Math.max(...amounts);
    return low === high ? `¥${format(low)}` : `¥${format(low)}–${format(high)}`;
  }
  const observation = observations[0];
  return `${observation.currency} ${format(observation.amount)}`;
}

function groupsetSetupLabel(groupset) {
  if (/semi-wireless/i.test(groupset.architecture)) return 'Semi-wireless';
  if (/fully wireless/i.test(groupset.architecture)) return 'Fully wireless';
  if (/wired/i.test(groupset.architecture)) return 'Wired';
  return 'Electronic';
}

function groupsetPriceSummary(groupset) {
  const observations = groupsetHeadlinePrices(groupset);
  if (!observations.length) return '';
  const taobao = observations.every((observation) => /Taobao/i.test(observation.market));
  const label = taobao
    ? `Taobao option${observations.length === 1 ? '' : 's'}`
    : `Dealer observation${observations.length === 1 ? '' : 's'}`;
  const dates = [...new Set(observations.map((observation) => observation.observed_at))];
  return `${label} · ${dates.at(-1)}`;
}

function observationAmount(observation) {
  const digits = Number.isInteger(observation.amount) ? 0 : 2;
  const amount = new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(observation.amount);
  return observation.currency === 'CNY' ? `¥${amount}` : `${observation.currency} ${amount}`;
}

function groupsetDiscipline(groupset) {
  const text = `${groupset.name} ${groupset.use_case}`.toLowerCase();
  if (text.includes('gravel')) return text.includes('all-road') ? 'Gravel / all-road' : 'Gravel';
  if (text.includes('all-road')) return 'Road / all-road';
  return 'Road';
}

function groupsetImageHtml(groupset, sourcesById) {
  const image = groupset.image;
  if (!image) return '';
  const source = sourcesById.get(image.source_id);
  const visual = `<img src="${escapeAttr(image.remote_url)}" alt="${escapeAttr(image.alt)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-product-image>`;
  const linked = source?.url
    ? `<a href="${escapeAttr(source.url)}" rel="noreferrer" aria-label="View the official ${escapeAttr(image.credit)} product page">${visual}</a>`
    : visual;
  return `<span class="product-image groupset-image">${linked}</span>`;
}

function groupsetSourceLinks(sourceIds, sourcesById) {
  return sourceIds.map((id) => sourcesById.get(id)).filter(Boolean).map((source) => source.url
    ? `<a href="${escapeAttr(source.url)}" rel="noreferrer">${escapeHtml(source.title)}</a>`
    : `<span>${escapeHtml(source.title)}</span>`).join('');
}

function groupsetDetailPanel(groupset, sourcesById) {
  const priceRecords = (groupset.price_observations ?? []).length
    ? `<section><h3>Captured packages</h3><div class="price-records">${groupset.price_observations.map((observation) => `<div><strong>${escapeHtml(observation.option_label_zh ?? sentenceLabel(observation.price_type))} · ${escapeHtml(observationAmount(observation))}</strong><span>${escapeHtml(`${observation.market} · ${observation.observed_at} · ${sentenceLabel(observation.price_type)}`)}</span><p>${escapeHtml(observation.conditions)}</p></div>`).join('')}</div></section>`
    : '';
  const imageNote = groupset.image
    ? `<span class="groupset-image-credit">Image: ${escapeHtml(groupset.image.credit)} · ${escapeHtml(groupset.image.subject_accuracy === 'featured-variant' ? `${groupset.image.featured_variant} shown` : 'exact family')}</span>`
    : '';
  return `<details class="groupset-row-details"><summary>Details</summary><div class="groupset-row-details-body"><p class="groupset-use-case">${escapeHtml(groupset.use_case)}</p><div class="groupset-detail-grid"><section><h3>Fit</h3><dl><div><dt>Freehub</dt><dd>${escapeHtml(groupset.compatibility.freehub)}</dd></div><div><dt>Hanger</dt><dd>${escapeHtml(groupset.compatibility.hanger)}</dd></div><div><dt>Frame</dt><dd>${escapeHtml(groupset.compatibility.frame)}</dd></div><div><dt>Brake fluid</dt><dd>${escapeHtml(groupset.compatibility.brake_fluid)}</dd></div></dl></section><section><h3>Power & controls</h3><dl><div><dt>Architecture</dt><dd>${escapeHtml(groupset.architecture)}</dd></div><div><dt>Battery</dt><dd>${escapeHtml(groupset.battery)}</dd></div><div><dt>Controls</dt><dd>${escapeHtml(groupset.controls_and_app)}</dd></div></dl></section><section><h3>Package & weight</h3><dl><div><dt>Package</dt><dd>${escapeHtml(groupset.package_summary)}</dd></div><div><dt>Weight</dt><dd>${escapeHtml(groupset.weight.note)}</dd></div></dl></section></div><div class="groupset-detail-lower">${priceRecords}<section><h3>Confirm before buying</h3><ul>${groupset.caveats.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section></div><div class="groupset-source-line"><strong>Sources</strong><span>${groupsetSourceLinks(groupset.source_ids, sourcesById)}</span>${imageNote}</div></div></details>`;
}

function groupsetRows(groupset, sourcesById) {
  const maxRear = Number.isFinite(groupset.shifting.max_rear_sprocket_teeth)
    ? `Up to ${groupset.shifting.max_rear_sprocket_teeth}T rear`
    : '';
  const price = groupsetPriceLabel(groupset);
  const image = groupsetImageHtml(groupset, sourcesById);
  return `<tbody class="groupset-entry" id="${escapeAttr(groupset.id)}" data-groupset-entry><tr class="groupset-summary-row">
    <th scope="row"><div class="groupset-identity${image ? ' has-image' : ''}">${image}<span class="groupset-name"><strong>${escapeHtml(groupset.name)}</strong><span>${escapeHtml(groupset.maker)}</span></span></div></th>
    <td data-label="Use" data-column="best"><strong>${escapeHtml(groupsetDiscipline(groupset))}</strong><span>${escapeHtml(groupset.positioning)}</span></td>
    <td data-label="Gearing" data-column="gearing"><strong>${escapeHtml(`${groupset.shifting.chainrings} · ${groupset.shifting.cassette_speeds}`)}</strong>${maxRear ? `<span>${escapeHtml(maxRear)}</span>` : ''}</td>
    <td data-label="Setup" data-column="setup"><strong>${escapeHtml(groupsetSetupLabel(groupset))}</strong><span>${escapeHtml(groupset.brake_options.join(' · '))}</span></td>
    <td data-label="China price" data-column="price">${price ? `<strong>${escapeHtml(price)}</strong><span>${escapeHtml(groupsetPriceSummary(groupset))}</span>` : ''}</td>
  </tr><tr class="groupset-detail-row"><td colspan="5">${groupsetDetailPanel(groupset, sourcesById)}</td></tr></tbody>`;
}

function adjacentPriceLabel(source) {
  const observations = (source.observations ?? []).filter((observation) => observation.normalized_package !== 'component');
  if (!observations.length) return '';
  const amounts = observations.map((observation) => observation.amount_cny);
  const format = (amount) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount);
  const low = Math.min(...amounts);
  const high = Math.max(...amounts);
  return low === high ? `¥${format(low)}` : `¥${format(low)}–${format(high)}`;
}

function adjacentRows(source) {
  const system = source.adjacent_system;
  const price = adjacentPriceLabel(source);
  const records = (source.observations ?? []).map((observation) => `<div><strong>${escapeHtml(observation.option_label_zh)} · ${escapeHtml(formatCny(observation.amount_cny))}</strong><span>${escapeHtml(`${sentenceLabel(observation.normalized_package)} · ${source.observed_at}`)}</span><p>${escapeHtml(observation.configuration)}</p></div>`).join('');
  const sourceLink = source.url
    ? `<a href="${escapeAttr(source.url)}" rel="noreferrer">${escapeHtml(source.title)}</a>`
    : `<span>${escapeHtml(source.title)}</span>`;
  return `<tbody class="groupset-entry groupset-entry-adjacent" id="adjacent-${escapeAttr(source.id)}" data-groupset-entry><tr class="groupset-summary-row">
    <th scope="row"><div class="groupset-identity"><span class="groupset-name"><strong>${escapeHtml(system.name)}</strong><span>${escapeHtml(system.discipline)}</span></span></div></th>
    <td data-label="Use" data-column="best"><strong>${escapeHtml(system.discipline)}</strong><span>${escapeHtml(system.why_separate)}</span></td>
    <td data-label="Gearing" data-column="gearing"></td>
    <td data-label="Setup" data-column="setup"></td>
    <td data-label="China price" data-column="price">${price ? `<strong>${escapeHtml(price)}</strong><span>Taobao options · ${escapeHtml(source.observed_at)}</span>` : ''}</td>
  </tr><tr class="groupset-detail-row"><td colspan="5"><details class="groupset-row-details"><summary>Details</summary><div class="groupset-row-details-body"><div class="groupset-detail-lower"><section><h3>Captured packages</h3><div class="price-records">${records}</div></section><section><h3>Package boundary</h3><p>${escapeHtml(system.why_separate)}</p><p>${escapeHtml(source.notes)}</p></section></div><div class="groupset-source-line"><strong>Source</strong><span>${sourceLink}</span></div></div></details></td></tr></tbody>`;
}

export function renderElectronicGroupsets(ctx) {
  const groupsetDescription = 'Road, gravel, MTB and TT electronic shifting compared in one place.';
  const groupsets = ctx.data.groupsets ?? [];
  const adjacentSources = ctx.data.sources.filter((source) => source.adjacent_system);
  const sourcesById = new Map(ctx.data.sources.map((source) => [source.id, source]));
  const preferredOrder = [
    'shimano-105-r7170',
    'shimano-grx-rx825',
    'shimano-grx-rx717-rx827',
    'sram-rival-axs-e1',
    'sram-xplr-apex-d1-rival-e1',
    'wheeltop-eds-tx',
    'wheeltop-eds-gex',
    'ltwoo-erx-er9',
    'ltwoo-egr',
    'magene-qed-pes',
    'shimano-road-di2-r8170-r9270'
  ];
  const orderOf = (groupset) => {
    const index = preferredOrder.indexOf(groupset.id);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  const ordered = [...groupsets].sort((a, b) => orderOf(a) - orderOf(b) || a.name.localeCompare(b.name));
  const rows = [
    ...ordered.map((groupset) => groupsetRows(groupset, sourcesById)),
    ...adjacentSources.map(adjacentRows)
  ].join('');
  const html = `<p class="groupset-table-note"><span>${ordered.length + adjacentSources.length} systems · reviewed 2026-08-25</span> Open a row for fit, batteries, package scope, weight evidence and sources.</p><div class="reference-table-wrap groupset-table-wrap"><table class="reference-table groupset-comparison"><caption class="sr-only">Electronic groupsets available in China</caption><thead><tr><th>System</th><th>Use</th><th>Gearing</th><th>Setup</th><th>China price</th></tr></thead>${rows}</table></div>
  <details class="reference-guide"><summary>How package labels and prices are normalized</summary><div><dl class="detail-list package-basis"><div><dt>Shift-only</dt><dd>Levers, derailleurs, battery, wires and charger.</dd></div><div><dt>Shift-brake</dt><dd>Shift-only plus calipers and hoses.</dd></div><div><dt>Partial groupset</dt><dd>Shift-brake plus only some of crank, cassette, chain or rotors.</dd></div><div><dt>Full groupset</dt><dd>An exact, itemized list of every included component.</dd></div><div><dt>OEM take-off</dt><dd>Removed or split from a complete bike; retail packaging and warranty may be absent.</dd></div></dl><p>Seller labels such as 小套, 中套 and 大套 are retained as option text, never treated as standard packages. Taobao observations are option-level screenshots rather than verified checkout totals.</p></div></details>`;
  return prosePage(ctx, {
    title: 'Electronic groupsets in China',
    desc: groupsetDescription,
    path: '/electronic-shifting/',
    current: 'groupsets',
    className: 'groupsets-prose',
    structuredData: collectionStructuredData({
      siteUrl: ctx.siteUrl,
      base: ctx.base,
      path: '/electronic-shifting/',
      name: 'Electronic groupsets in China',
      description: groupsetDescription,
      items: [
        ...ordered.map((groupset) => ({ name: groupset.name })),
        ...adjacentSources.map((source) => ({ name: source.adjacent_system.name }))
      ]
    }),
    html
  });
}

export function renderMethodology(ctx) {
  const assumption = buildAssumption(ctx);
  const methodologyDescription = 'How prices, frameset estimates, specifications, and evidence are handled.';
  const datasetDate = ctx.siteLastmod ?? ctx.data.meta.snapshot_date;
  const license = 'https://creativecommons.org/licenses/by/4.0/';
  const distributions = [
    { name: 'Catalog JSON', encodingFormat: 'application/json', path: '/data/catalog.json' },
    { name: 'Catalog CSV', encodingFormat: 'text/csv', path: '/data/catalog.csv' },
    { name: 'Source records JSON', encodingFormat: 'application/json', path: '/data/sources.json' }
  ];
  const html = `<h2>Dataset and freshness</h2><p>The generated catalog dataset was last updated <time datetime="${escapeAttr(datasetDate)}">${escapeHtml(datasetDate)}</time>; the catalog-wide review date is <time datetime="${escapeAttr(ctx.data.meta.snapshot_date)}">${escapeHtml(ctx.data.meta.snapshot_date)}</time>. Neither date claims that every price is current: each price keeps its own observation date, market, status, and conditions.</p><ul class="dataset-downloads"><li><a href="${url(ctx.base, '/data/catalog.json')}">Catalog JSON</a></li><li><a href="${url(ctx.base, '/data/catalog.csv')}">Catalog CSV</a></li><li><a href="${url(ctx.base, '/data/sources.json')}">Source records JSON</a></li></ul><p>The structured dataset is available under <a href="${license}" rel="license noreferrer">CC BY 4.0</a>. Product images and linked third-party material retain their separate rights and provenance.</p><h2>What is compared</h2><p>The main list combines complete bikes and frameset-based builds where total cost can be compared honestly. Products are identified by exact category, model, generation, and configuration.</p><h2>Frameset price estimate</h2><p>Each published frameset receives the selected total build allowance, with <strong>${formatCny(assumption.amount_cny)}</strong> retained as the reviewed default. The compact homepage selector is a quick planning estimate, not a shopping cart or guaranteed package price.</p><h2>Exact build configurator</h2><p>The separate <a href="${url(ctx.base, '/build/')}">Build page</a> selects a frameset and every required component slot. A package is counted once, and any explicitly included brake or drivetrain parts suppress duplicate rows. Price and weight remain known subtotals while one or more exact inputs are missing. Compatibility warnings cover only recorded standards and never replace seller or mechanic confirmation.</p><h2>Price details</h2><p>The visible price is the complete-bike price or the estimated complete-build price. The info button contains the underlying frame or included-package price, observation date, freshness, record status, conditions, and great-buy reference.</p><h2>Category-specific facts</h2><p>Gravel products expose tire clearance when the evidence supports it. MTB products use suspension travel, e-road products use motor and battery facts, folding products use fold or wheel data, and triathlon products use time-trial fit and storage facts. Unverified fields stay visibly unknown.</p><h2>Video context</h2><p>Selected model videos help buyers see a platform and hear build or ride context. They are secondary editorial material, not authority for a current price, exact BOM, specification, or recommendation. Commercial and product-supply relationships are labelled.</p><h2>Materials and manufacturing</h2><p>For carbon products, fiber labels such as T700, T800, or T1000 are not quality scores. Lay-up, compaction, curing, alignment, testing, traceability, and support matter more. Missing evidence increases uncertainty; it does not automatically mean a product is poor.</p><h2>Corrections</h2><p>Each change should identify the exact model or generation and include a source. <a href="${ctx.repositoryUrl}/issues">Submit a correction or price sighting on GitHub</a>.</p>`;
  return prosePage(ctx, {
    title: 'Methodology',
    desc: methodologyDescription,
    path: '/methodology/',
    current: 'methodology',
    structuredData: datasetStructuredData({
      siteUrl: ctx.siteUrl,
      base: ctx.base,
      path: '/methodology/',
      name: 'China Bikes dataset',
      description: `${ctx.data.meta.scope} ${methodologyDescription}`,
      dateModified: datasetDate,
      license,
      distributions
    }),
    html
  });
}

export function renderPrivacy(ctx) {
  const html = `<h2>Static site</h2><p>The site has no account, analytics, advertising tracker, newsletter, payment system, or backend. Bike comparisons, the optional frameset allowance and the Build-page configuration are stored only in the visitor’s browser and may also be encoded in the URL when a visitor chooses or copies a build.</p><h2>Product images</h2><p>Some product photos load from their credited manufacturer or retailer, which receives a normal image request. Selected XHS and marketplace evidence images may load from the project’s separate media origin or from the same GitHub Pages site as small sanitized WebP derivatives. Public source links are reduced to identity-safe canonical post or listing URLs. Remote images use <code>referrerpolicy="no-referrer"</code>; when a source fails, the image is hidden and the product facts remain available.</p><h2>Optional videos</h2><p>Model pages do not contact YouTube when they first load. A video request is made to YouTube’s privacy-enhanced <code>youtube-nocookie.com</code> embed only after the visitor presses “Load video”; videos do not autoplay. The separate “Watch on YouTube” link opens YouTube directly.</p><h2>Public contributions</h2><p>GitHub issues and pull requests are public. Remove names, account details, addresses, order IDs, payment information, faces, license plates, location metadata, and share or referral parameters before submitting screenshots, photos, or source links. A removal request may identify the model and canonical source URL without publishing private contact details.</p>`;
  return prosePage(ctx, { title: 'Privacy', desc: 'No accounts or analytics; optional third-party media is disclosed.', path: '/privacy/', html });
}

export function renderImagePolicy(ctx) {
  const html = `<h2>Image use</h2><p>Manufacturer images are preferred. Selected XHS, Taobao, and Xianyu images may be shown when they identify an exact bicycle or expose useful geometry, size, clearance, weight, package, compatibility, or aero information. They normally stay remote; a small optimized WebP derivative may be stored with the site when a stable remote display is unavailable. Copyright remains with the original owner and the source stays visibly linked.</p><h2>Source and privacy</h2><p>Every community or marketplace image needs an identity-safe canonical source URL, owner or seller credit, exact-model mapping, alt text, content hashes, and a completed privacy review. Share, referral, invite, tracking, session, and account parameters are removed. Images are stripped of metadata and visible personal identifiers before hosting.</p><h2>Accuracy</h2><p>An image can show the exact configuration, the exact frame platform, the same platform with different components, another color, or another regional build. When the image is not exact, the catalog shows an information marker.</p><h2>Failures and corrections</h2><p>Broken external images are hidden instead of being replaced by a generic bicycle drawing. Use <a href="${ctx.repositoryUrl}/issues">GitHub issues</a> to report a broken link, attribution concern, inaccurate image, removal request, or a better replacement. Do not publish private contact details in an issue.</p><p><a href="${url(ctx.base, '/image-sources/')}">See every image source and credit.</a></p>`;
  return prosePage(ctx, { title: 'Product images', desc: 'How product photos are sourced, labelled and replaced when unavailable.', path: '/image-policy/', html });
}

export function renderImageSources(ctx) {
  const platforms = new Map(ctx.data.platforms.map((item) => [item.id, item]));
  const brands = new Map(ctx.data.brands.map((item) => [item.id, item]));
  const sources = new Map(ctx.data.sources.map((item) => [item.id, item]));
  const firstProductByPlatform = new Map();
  for (const product of ctx.products) if (!firstProductByPlatform.has(product.platform.id)) firstProductByPlatform.set(product.platform.id, product);
  const candidatesById = new Map(joinCatalogCandidates(ctx.data).map((entry) => [entry.candidate.id, entry]));
  const entries = ctx.data.images.filter((image) => imageUrl(ctx, image)).map((image) => {
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
  const html = `<div class="credit-list">${entries.map(({ image, source, label, href, visual }) => `<article><a class="credit-image" href="${escapeAttr(href)}">${visual}</a><div><h2>${escapeHtml(label)}</h2><p>${escapeHtml(image.credit)} · ${escapeHtml(accuracyLabel(image.subject_accuracy))}</p>${source?.url ? `<a href="${escapeAttr(source.url)}" rel="noreferrer">Original source</a>` : ''}</div></article>`).join('')}</div>`;
  return prosePage(ctx, { title: 'Image credits', desc: 'Source and exactness for every product visual used by the catalog.', path: '/image-sources/', html });
}

export function render404(ctx) {
  return page(ctx, { title: 'Page not found', path: '/404.html', noindex: true, body: `<section class="simple-page"><div class="page prose"><h1>Page not found</h1><p class="page-lede">The bike or route may have moved.</p><p><a class="primary-button" href="${url(ctx.base, '/')}">Return to all bikes</a></p></div></section>` });
}
