(() => {
  const base = document.body.dataset.base ?? '';
  const selectionStorageKey = 'china-bike-guide-selection-v2';
  const comparisonSelectionLimit = 10;
  const buildAllowanceStorageKey = 'china-bike-guide-build-allowance-v1';

  function readStoredSelection() {
    try {
      const value = JSON.parse(localStorage.getItem(selectionStorageKey) ?? '[]');
      return Array.isArray(value) ? [...new Set(value.filter((item) => typeof item === 'string'))].slice(0, comparisonSelectionLimit) : [];
    } catch { return []; }
  }

  function writeStoredSelection(selection) {
    try { localStorage.setItem(selectionStorageKey, JSON.stringify(selection.slice(0, comparisonSelectionLimit))); } catch { /* selection remains usable for this page */ }
  }

  function readStoredBuildAllowance() {
    try {
      const stored = localStorage.getItem(buildAllowanceStorageKey);
      if (stored === null) return null;
      const value = Number(stored);
      return Number.isFinite(value) ? value : null;
    } catch { return null; }
  }

  function writeStoredBuildAllowance(value) {
    try { localStorage.setItem(buildAllowanceStorageKey, String(value)); } catch { /* the URL still carries the selected amount */ }
  }

  function enableImageFailureHandling(image) {
    if (!(image instanceof HTMLImageElement) || image.dataset.imageFailureReady === 'true') return;
    image.dataset.imageFailureReady = 'true';
    const hideUnavailable = () => {
      if (image.dataset.imageFailureHandled === 'true') return;
      image.dataset.imageFailureHandled = 'true';
      image.removeAttribute('srcset');
      image.removeAttribute('sizes');
      const captionStatus = image.closest('.model-gallery-strip')
        ? null
        : image.closest('.model-figure')?.querySelector('[data-image-caption-status]');
      if (captionStatus instanceof HTMLElement) captionStatus.textContent = 'Source image unavailable';
      const thumb = image.closest('.gallery-thumb');
      if (thumb instanceof HTMLElement) thumb.hidden = true;
      const figure = image.closest('.model-figure');
      if (figure instanceof HTMLElement) {
        figure.classList.add('is-unavailable');
        figure.closest('.model-grid')?.classList.add('has-no-image');
      }
      const container = image.closest('.product-image');
      if (container instanceof HTMLElement) {
        container.closest('.catalog-product')?.classList.add('has-no-image');
        container.remove();
      }
      const comparison = image.closest('.compare-product-head');
      if (comparison instanceof HTMLElement) comparison.classList.add('has-no-image');
      image.remove();
    };
    image.addEventListener('error', hideUnavailable);
    if (image.complete && image.naturalWidth === 0) hideUnavailable();
  }
  document.querySelectorAll('[data-product-image]').forEach(enableImageFailureHandling);

  document.querySelectorAll('[data-image-gallery]').forEach((gallery) => {
    const hero = gallery.querySelector('[data-gallery-hero]');
    const caption = gallery.querySelector('[data-image-caption-status][data-gallery-caption]');
    const sourceLink = gallery.querySelector('[data-gallery-source-link]');
    const buttons = [...gallery.querySelectorAll('[data-gallery-thumb]')];
    if (!(hero instanceof HTMLImageElement) || !buttons.length) return;

    const selectImage = (button) => {
      if (!(button instanceof HTMLButtonElement) || button.getAttribute('aria-pressed') === 'true') return;
      hero.classList.add('is-switching');
      window.setTimeout(() => {
        hero.src = button.dataset.gallerySrc ?? hero.src;
        hero.alt = button.dataset.galleryAlt ?? hero.alt;
        if (button.dataset.galleryRemote === 'true') hero.referrerPolicy = 'no-referrer';
        else hero.removeAttribute('referrerpolicy');
        if (caption instanceof HTMLElement) caption.textContent = button.dataset.galleryCaption ?? '';
        if (sourceLink instanceof HTMLAnchorElement) {
          const href = button.dataset.gallerySource;
          sourceLink.hidden = !href;
          if (href) sourceLink.href = href;
        }
        buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        requestAnimationFrame(() => hero.classList.remove('is-switching'));
      }, 80);
    };

    buttons.forEach((button, index) => {
      button.addEventListener('click', () => selectImage(button));
      button.addEventListener('keydown', (event) => {
        const offsets = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        let nextIndex = offsets[event.key] === undefined ? index : (index + offsets[event.key] + buttons.length) % buttons.length;
        if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = buttons.length - 1;
        else if (offsets[event.key] === undefined) return;
        event.preventDefault();
        buttons[nextIndex].focus();
        selectImage(buttons[nextIndex]);
      });
    });
  });

  const tooltipPanel = document.querySelector('#shared-tooltip');
  const tooltipButtons = [...document.querySelectorAll('[data-tooltip-lines]')];
  const precisePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let activeTooltipButton = null;
  let tooltipPinned = false;
  let tooltipDismissTimer = null;

  function cancelTooltipDismiss() {
    if (tooltipDismissTimer === null) return;
    clearTimeout(tooltipDismissTimer);
    tooltipDismissTimer = null;
  }

  function scheduleTooltipClose() {
    cancelTooltipDismiss();
    tooltipDismissTimer = setTimeout(() => {
      tooltipDismissTimer = null;
      if (tooltipPinned) return;
      if (activeTooltipButton?.matches(':hover') || document.activeElement === activeTooltipButton) return;
      if (tooltipPanel instanceof HTMLElement && tooltipPanel.matches(':hover')) return;
      closeTooltip();
    }, 140);
  }

  function tooltipTopInset() {
    let inset = 12;
    document.querySelectorAll('.site-header, .filter-bar').forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      const style = getComputedStyle(element);
      const configuredTop = Number.parseFloat(style.top) || 0;
      const rect = element.getBoundingClientRect();
      const isObstruction = style.position === 'fixed' || (style.position === 'sticky' && rect.top <= configuredTop + 1);
      if (isObstruction && rect.bottom > 0) inset = Math.max(inset, rect.bottom + 8);
    });
    return inset;
  }

  function tooltipBottomInset() {
    const tray = document.querySelector('[data-compare-tray]');
    if (!(tray instanceof HTMLElement) || !tray.classList.contains('is-visible') || tray.classList.contains('is-comparing')) return 12;
    return Math.max(12, innerHeight - tray.getBoundingClientRect().top + 10);
  }

  function positionTooltip(button) {
    if (!(tooltipPanel instanceof HTMLElement)) return;
    tooltipPanel.style.removeProperty('left');
    tooltipPanel.style.removeProperty('right');
    tooltipPanel.style.removeProperty('top');
    tooltipPanel.style.removeProperty('bottom');
    tooltipPanel.style.removeProperty('--tooltip-anchor-x');
    tooltipPanel.style.removeProperty('--tooltip-anchor-y');

    const margin = innerWidth <= 720 ? 12 : 16;
    const gap = 8;
    const anchor = button.getBoundingClientRect();
    const panel = tooltipPanel.getBoundingClientRect();
    const topInset = tooltipTopInset();
    const bottomInset = tooltipBottomInset();
    const maxLeft = Math.max(margin, innerWidth - panel.width - margin);
    const maxTop = Math.max(topInset, innerHeight - bottomInset - panel.height);
    const centeredLeft = Math.min(maxLeft, Math.max(margin, anchor.left + anchor.width / 2 - panel.width / 2));
    const above = anchor.top - panel.height - gap;
    const below = anchor.bottom + gap;
    let left = centeredLeft;
    let top;
    let placement;

    if (above >= topInset) {
      top = above;
      placement = 'above';
    } else if (innerWidth > 720 && anchor.left - panel.width - gap >= margin) {
      left = anchor.left - panel.width - gap;
      top = Math.min(maxTop, Math.max(topInset, anchor.top + anchor.height / 2 - panel.height / 2));
      placement = 'left';
    } else if (innerWidth > 720 && anchor.right + panel.width + gap <= innerWidth - margin) {
      left = anchor.right + gap;
      top = Math.min(maxTop, Math.max(topInset, anchor.top + anchor.height / 2 - panel.height / 2));
      placement = 'right';
    } else {
      top = Math.min(maxTop, Math.max(topInset, below));
      placement = below <= maxTop ? 'below' : 'clamped';
    }

    tooltipPanel.dataset.placement = placement;
    tooltipPanel.style.left = `${Math.round(left)}px`;
    tooltipPanel.style.top = `${Math.round(top)}px`;
    tooltipPanel.style.setProperty('--tooltip-anchor-x', `${Math.round(Math.min(panel.width - 14, Math.max(14, anchor.left + anchor.width / 2 - left)))}px`);
    tooltipPanel.style.setProperty('--tooltip-anchor-y', `${Math.round(Math.min(panel.height - 14, Math.max(14, anchor.top + anchor.height / 2 - top)))}px`);
  }

  function closeTooltip() {
    cancelTooltipDismiss();
    if (activeTooltipButton instanceof HTMLButtonElement) {
      activeTooltipButton.setAttribute('aria-expanded', 'false');
      activeTooltipButton.removeAttribute('aria-describedby');
    }
    activeTooltipButton = null;
    tooltipPinned = false;
    if (tooltipPanel instanceof HTMLElement) {
      tooltipPanel.hidden = true;
      tooltipPanel.replaceChildren();
      delete tooltipPanel.dataset.placement;
      tooltipPanel.style.removeProperty('left');
      tooltipPanel.style.removeProperty('right');
      tooltipPanel.style.removeProperty('top');
      tooltipPanel.style.removeProperty('bottom');
      tooltipPanel.style.removeProperty('--tooltip-anchor-x');
      tooltipPanel.style.removeProperty('--tooltip-anchor-y');
    }
  }

  function openTooltip(button, { pinned = false } = {}) {
    if (!(button instanceof HTMLButtonElement) || !(tooltipPanel instanceof HTMLElement)) return;
    cancelTooltipDismiss();
    let lines = [];
    try { lines = JSON.parse(button.dataset.tooltipLines ?? '[]'); } catch { lines = []; }
    if (!Array.isArray(lines) || !lines.length) return;
    if (activeTooltipButton && activeTooltipButton !== button) closeTooltip();
    tooltipPanel.replaceChildren(...lines.map((line) => {
      const span = document.createElement('span');
      span.textContent = String(line);
      return span;
    }));
    tooltipPanel.hidden = false;
    activeTooltipButton = button;
    tooltipPinned = pinned;
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-describedby', tooltipPanel.id);
    positionTooltip(button);
  }

  function toggleTooltip(button) {
    const isPinnedOpen = activeTooltipButton === button && tooltipPinned && tooltipPanel instanceof HTMLElement && !tooltipPanel.hidden;
    if (isPinnedOpen) closeTooltip();
    else openTooltip(button, { pinned: true });
  }

  tooltipButtons.forEach((button) => {
    button.addEventListener('mouseenter', () => {
      if (precisePointer.matches && !tooltipPinned) openTooltip(button);
    });
    button.addEventListener('mouseleave', () => {
      if (precisePointer.matches && activeTooltipButton === button && !tooltipPinned) scheduleTooltipClose();
    });
    button.addEventListener('focus', () => requestAnimationFrame(() => {
      if (document.activeElement === button && button.matches(':focus-visible') && activeTooltipButton !== button) openTooltip(button);
    }));
    button.addEventListener('blur', () => requestAnimationFrame(() => {
      if (activeTooltipButton === button && document.activeElement !== button && !(tooltipPanel instanceof HTMLElement && tooltipPanel.matches(':hover'))) closeTooltip();
    }));
    button.addEventListener('click', () => toggleTooltip(button));
  });

  tooltipPanel?.addEventListener('mouseenter', cancelTooltipDismiss);
  tooltipPanel?.addEventListener('mouseleave', scheduleTooltipClose);
  tooltipPanel?.addEventListener('pointerdown', (event) => event.preventDefault());
  document.querySelectorAll('.catalog-row .product-image-link').forEach((link) => {
    link.addEventListener('mouseenter', () => {
      if (precisePointer.matches) closeTooltip();
    });
  });

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(text); return true; } catch { /* fallback below */ }
    }
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { copied = false; }
    field.remove();
    return copied;
  }

  const copyStatus = document.querySelector('#copy-status');
  const copyFeedbackTimers = new WeakMap();

  function showCopyFeedback(button, copied) {
    if (!(button instanceof HTMLButtonElement)) return;
    const pending = copyFeedbackTimers.get(button);
    if (pending) clearTimeout(pending);
    const idleLabel = button.dataset.copyIdleLabel ?? button.textContent?.trim() ?? 'Copy';
    button.dataset.copyIdleLabel = idleLabel;
    button.textContent = copied ? 'Copied' : 'Copy failed';
    if (copyStatus instanceof HTMLElement) {
      copyStatus.textContent = '';
      requestAnimationFrame(() => { copyStatus.textContent = copied ? 'Copied to clipboard.' : 'Copy failed. Please copy manually.'; });
    }
    const timer = setTimeout(() => {
      button.textContent = button.dataset.copyIdleLabel ?? idleLabel;
      delete button.dataset.copyIdleLabel;
      copyFeedbackTimers.delete(button);
    }, 1400);
    copyFeedbackTimers.set(button, timer);
  }

  const menuButton = document.querySelector('.menu-button');
  const navigation = document.querySelector('#main-nav');

  function setMenuOpen(open) {
    if (!(menuButton instanceof HTMLButtonElement) || !(navigation instanceof HTMLElement)) return;
    navigation.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
  }

  function closeMenu({ restoreFocus = false } = {}) {
    const wasOpen = navigation instanceof HTMLElement && navigation.classList.contains('open');
    setMenuOpen(false);
    if (restoreFocus && wasOpen && menuButton instanceof HTMLButtonElement) menuButton.focus({ preventScroll: true });
  }

  menuButton?.addEventListener('click', () => {
    const open = !(navigation?.classList.contains('open') ?? false);
    setMenuOpen(open);
  });
  navigation?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('[data-tooltip-lines]')) closeTooltip();
    if (!target?.closest('.menu-button') && !target?.closest('#main-nav')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const hadTooltip = activeTooltipButton !== null;
    const hadMenu = navigation instanceof HTMLElement && navigation.classList.contains('open');
    if (!hadTooltip && !hadMenu) return;
    closeTooltip();
    closeMenu({ restoreFocus: hadMenu });
    event.preventDefault();
  });
  addEventListener('resize', () => {
    closeTooltip();
    closeMenu();
  });
  addEventListener('scroll', closeTooltip, true);

  document.querySelectorAll('[data-copy-target]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      const copied = target ? await copyText(target.textContent ?? '') : false;
      showCopyFeedback(button, copied);
    });
  });

  const catalogBack = document.querySelector('[data-catalog-back]');
  const returnPath = new URLSearchParams(location.search).get('from');
  let validatedReturnTarget = null;
  if (catalogBack && returnPath) {
    try {
      const target = new URL(returnPath, location.origin);
      const expectedRoot = `${base}/`;
      if (target.origin === location.origin && target.pathname === expectedRoot) {
        validatedReturnTarget = target;
        catalogBack.href = `${target.pathname}${target.search}${target.hash || '#catalog'}`;
        catalogBack.textContent = '← Back to filtered catalog';
      }
    } catch { /* keep the safe all-bikes link */ }
  }

  const modelCompareButton = document.querySelector('[data-add-to-comparison]');
  const modelCompareLink = document.querySelector('[data-model-compare-link]');
  if (modelCompareButton instanceof HTMLButtonElement) {
    const productId = modelCompareButton.dataset.productId ?? '';
    const productName = modelCompareButton.dataset.productName ?? 'this bike';
    let modelSelection = readStoredSelection();
    const renderModelCompare = () => {
      const selected = modelSelection.includes(productId);
      modelCompareButton.setAttribute('aria-pressed', String(selected));
      modelCompareButton.textContent = selected ? 'Added to comparison' : modelSelection.length >= 4 ? 'Comparison is full' : 'Add to comparison';
      modelCompareButton.disabled = !selected && modelSelection.length >= 4;
      modelCompareButton.setAttribute('aria-label', selected ? `Remove ${productName} from comparison` : `Add ${productName} to comparison`);
      if (modelCompareLink instanceof HTMLAnchorElement) {
        const target = validatedReturnTarget ? new URL(validatedReturnTarget.href) : new URL(`${base}/`, location.origin);
        target.searchParams.delete('compare');
        if (modelSelection.length >= 2) target.searchParams.set('compare', modelSelection.join(','));
        target.hash = modelSelection.length >= 2 ? 'compare' : 'catalog';
        modelCompareLink.href = `${target.pathname}${target.search}${target.hash}`;
        modelCompareLink.textContent = modelSelection.length >= 2 ? 'Compare selected bikes' : 'Choose another bike';
      }
    };
    modelCompareButton.addEventListener('click', () => {
      modelSelection = modelSelection.includes(productId)
        ? modelSelection.filter((id) => id !== productId)
        : [...modelSelection, productId].slice(0, 4);
      writeStoredSelection(modelSelection);
      renderModelCompare();
    });
    renderModelCompare();
  }

  document.querySelectorAll('[data-video-shell]').forEach((shell) => {
    const button = shell.querySelector('[data-load-video]');
    if (!(shell instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) return;
    button.addEventListener('click', () => {
      const videoId = shell.dataset.youtubeId ?? '';
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
      frame.title = `${shell.dataset.videoTitle || 'Model video'} — YouTube video`;
      frame.loading = 'lazy';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      frame.tabIndex = 0;
      shell.replaceChildren(frame);
      frame.focus({ preventScroll: true });
    }, { once: true });
  });

  const modelFramePrice = document.querySelector('[data-model-frame-price-low]');
  if (modelFramePrice instanceof HTMLElement) {
    const defaultAllowance = Number(modelFramePrice.dataset.modelDefaultAllowance || 0);
    const requested = new URLSearchParams(location.search).get('build');
    const stored = readStoredBuildAllowance();
    const raw = requested === null ? stored ?? defaultAllowance : Number(requested);
    const allowance = Number.isFinite(raw) ? Math.min(100000, Math.max(0, Math.round(raw))) : defaultAllowance;
    const frameLow = Number(modelFramePrice.dataset.modelFramePriceLow);
    const frameHigh = Number(modelFramePrice.dataset.modelFramePriceHigh || frameLow);
    const priceLabel = formatEstimatedRange(frameLow + allowance, frameHigh + allowance);
    const calculated = modelFramePrice.querySelector('[data-model-calculated-price]');
    if (calculated) calculated.textContent = priceLabel;
    const brief = document.querySelector('[data-model-price-brief]');
    if (brief) {
      brief.textContent = String(brief.textContent ?? '').replace(
        /^The displayed .*? estimate adds the adjustable ¥[\d,]+ build allowance/,
        `The displayed ${priceLabel} estimate adds the adjustable ${formatYuan(allowance)} build allowance`
      );
    }
    writeStoredBuildAllowance(allowance);
  }

  const catalogRoot = document.querySelector('[data-catalog-root]');
  const catalogData = document.querySelector('#catalog-data');
  if (!catalogRoot || !catalogData) return;

  let products = [];
  try { products = JSON.parse(catalogData.textContent ?? '[]'); } catch { products = []; }
  const byId = new Map(products.map((item) => [item.id, item]));
  const productList = catalogRoot.querySelector('[data-product-list]');
  const rows = [...catalogRoot.querySelectorAll('[data-product-row]')];
  const empty = catalogRoot.querySelector('[data-empty]');
  const resultCount = catalogRoot.querySelector('[data-result-count]');
  const resultSummary = catalogRoot.querySelector('[data-result-summary]');
  const resultContext = catalogRoot.querySelector('[data-result-context]');
  const filterNotice = catalogRoot.querySelector('[data-filter-notice]');
  const search = catalogRoot.querySelector('[data-filter-search]');
  const price = catalogRoot.querySelector('[data-filter-price]');
  const tire = catalogRoot.querySelector('[data-filter-tire]');
  const tireUnknown = catalogRoot.querySelector('[data-filter-tire-unknown]');
  const completeWeight = catalogRoot.querySelector('[data-filter-complete-weight]');
  const frameWeight = catalogRoot.querySelector('[data-filter-frame-weight]');
  const drivetrainFilter = catalogRoot.querySelector('[data-filter-drivetrain]');
  const frameFilter = catalogRoot.querySelector('[data-filter-frame]');
  const categoryMinimum = catalogRoot.querySelector('[data-filter-category-min]');
  const categoryMinimumLabel = catalogRoot.querySelector('[data-category-min-label]');
  const categoryMinimumUnit = catalogRoot.querySelector('[data-category-min-unit]');
  const category = catalogRoot.querySelector('[data-filter-category]');
  const sort = catalogRoot.querySelector('[data-sort]');
  const buildPreset = document.querySelector('[data-frameset-build-preset]');
  const buildAllowance = document.querySelector('[data-frameset-build-allowance]');
  const buildCustom = document.querySelector('[data-build-custom]');
  const capabilitySortOptions = [...(sort?.querySelectorAll('option[value^="capability-"]') ?? [])];
  const sortHeadingButtons = [...catalogRoot.querySelectorAll('[data-sort-heading]')];
  const sortHeadingByKey = new Map(sortHeadingButtons.map((button) => [button.dataset.sortHeading, button]));
  const capabilitySortHeading = sortHeadingByKey.get('capability');
  const capabilityHeadingLabel = capabilitySortHeading?.querySelector('[data-capability-heading-label]');
  const filterHeadingButtons = [...catalogRoot.querySelectorAll('[data-filter-heading]')];
  const filterPanel = catalogRoot.querySelector('[data-filter-panel]');
  const filterPanelToggle = catalogRoot.querySelector('[data-filter-panel-toggle]');
  const filterChips = catalogRoot.querySelector('[data-filter-chips]');
  const catalogFilterBar = catalogRoot.querySelector('.filter-bar');
  const reset = catalogRoot.querySelector('[data-reset]');
  const showAllModels = catalogRoot.querySelector('[data-show-all-models]');
  const modelLinks = [...catalogRoot.querySelectorAll('[data-model-link]')];
  const typeButtons = [...catalogRoot.querySelectorAll('[data-type-value]')];
  const brandButtons = [...catalogRoot.querySelectorAll('[data-brand-filter]')];
  const catalogNav = document.querySelector('[data-nav-catalog]');
  const framesetNav = document.querySelector('[data-nav-framesets]');
  const brandValues = new Set(rows.map((row) => row.dataset.brand).filter(Boolean));
  const brandLabels = new Map(brandButtons.map((button) => [button.dataset.brandFilter, button.textContent.trim()]));
  modelLinks.forEach((link) => { link.dataset.baseHref = link.getAttribute('href') ?? ''; });
  let activeType = '';
  let activeBrand = '';
  let allModelsVisible = false;
  const defaultBuildAllowance = Number(buildAllowance?.dataset.defaultValue || 0);
  let currentBuildAllowance = defaultBuildAllowance;
  let buildHighlightTimer = 0;
  const defaultPriceDetails = new Map(products.map((item) => [item.id, item.priceDetails ?? '']));

  const defaultSortModes = { price: 'price-asc', name: 'name-asc', capability: 'capability-desc', tire: 'tire-desc' };
  const legacySortModes = { price: 'price-asc', name: 'name-asc', capability: 'capability-desc' };

  function canonicalSortMode(value) {
    const candidate = legacySortModes[value] ?? value;
    return ['price-asc', 'price-desc', 'name-asc', 'name-desc', 'capability-asc', 'capability-desc', 'tire-asc', 'tire-desc'].includes(candidate)
      ? candidate
      : 'price-asc';
  }

  function sortModeParts(value = sort?.value) {
    const [key, direction] = canonicalSortMode(value).split('-');
    return { key, direction };
  }

  function setParam(url, name, value, defaultValue = '') {
    if (value && value !== defaultValue) url.searchParams.set(name, value);
    else url.searchParams.delete(name);
  }

  function formatYuan(value) {
    return `¥${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`;
  }

  function formatEstimatedRange(low, high) {
    return low === high
      ? `Est. ${formatYuan(low)}`
      : `Est. ${formatYuan(low)}–${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(high)}`;
  }

  function normalizedBuildAllowance(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return defaultBuildAllowance;
    return Math.min(100000, Math.max(0, Math.round(number)));
  }

  function syncBuildPreset() {
    if (!(buildPreset instanceof HTMLSelectElement)) return;
    const options = [...buildPreset.options];
    const fixed = options.find((option) => Number(option.dataset.buildAmount) === currentBuildAllowance);
    const custom = options.find((option) => option.value === 'custom');
    buildPreset.value = (fixed ?? custom)?.value ?? '';
    if (buildCustom instanceof HTMLElement) buildCustom.hidden = Boolean(fixed);
  }

  function highlightBuildPrices() {
    catalogRoot.classList.remove('is-build-updating');
    requestAnimationFrame(() => catalogRoot.classList.add('is-build-updating'));
    window.clearTimeout(buildHighlightTimer);
    buildHighlightTimer = window.setTimeout(() => catalogRoot.classList.remove('is-build-updating'), 220);
  }

  function updateFramesetPrices(value, { highlight = false } = {}) {
    currentBuildAllowance = normalizedBuildAllowance(value);
    if (buildAllowance instanceof HTMLInputElement) buildAllowance.value = String(currentBuildAllowance);
    syncBuildPreset();
    rows.forEach((row) => {
      if (!row.dataset.framePriceLow) return;
      const frameLow = Number(row.dataset.framePriceLow);
      const frameHigh = Number(row.dataset.framePriceHigh || row.dataset.framePriceLow);
      const low = frameLow + currentBuildAllowance;
      const high = frameHigh + currentBuildAllowance;
      row.dataset.priceSort = String(Math.round((low + high) / 2));
      row.dataset.priceFilter = String(high);
      const priceLabel = row.querySelector('[data-calculated-price]');
      if (priceLabel) priceLabel.textContent = formatEstimatedRange(low, high);
      const priceTip = row.querySelector('[data-frameset-price-tip]');
      if (priceTip instanceof HTMLButtonElement) {
        let lines = [];
        try { lines = JSON.parse(priceTip.dataset.tooltipLines ?? '[]'); } catch { lines = []; }
        const threshold = Number(priceTip.dataset.frameThreshold || 0);
        priceTip.dataset.tooltipLines = JSON.stringify(lines.map((line) => {
          if (line.startsWith('Estimated complete adds')) return `Estimated complete adds ${formatYuan(currentBuildAllowance)} for the selected build.`;
          if (threshold && line.startsWith('Great-buy reference:')) return `Great-buy reference: below ${formatYuan(threshold + currentBuildAllowance)} complete (${formatYuan(threshold)} frameset).`;
          return line;
        }));
      }
    });
    products.forEach((item) => {
      if (!item.estimated || !Number.isFinite(item.frameLow)) return;
      const low = Number(item.frameLow) + currentBuildAllowance;
      const high = Number(item.frameHigh ?? item.frameLow) + currentBuildAllowance;
      item.price = formatEstimatedRange(low, high);
      item.priceDetails = String(defaultPriceDetails.get(item.id) ?? '')
        .replace(/Estimated complete adds (?:a fixed )?¥[\d,]+(?: for the selected)? [^.]+\./, `Estimated complete adds ${formatYuan(currentBuildAllowance)} for the selected build.`)
        .replace(/Great-buy reference: below ¥[\d,]+ complete/, item.greatBuyFrameThreshold
          ? `Great-buy reference: below ${formatYuan(Number(item.greatBuyFrameThreshold) + currentBuildAllowance)} complete`
          : 'Great-buy reference: below complete');
    });
    if (highlight) highlightBuildPrices();
  }

  function updateModelLinks() {
    const from = `${location.pathname}${location.search}#catalog`;
    modelLinks.forEach((link) => {
      const target = new URL(link.dataset.baseHref || link.getAttribute('href') || '', location.origin);
      target.searchParams.set('from', from);
      setParam(target, 'build', String(currentBuildAllowance), String(defaultBuildAllowance));
      link.href = `${target.pathname}${target.search}`;
    });
  }

  function updateFilterUrl(mode = 'replace') {
    const next = new URL(location.href);
    setParam(next, 'q', search?.value.trim());
    setParam(next, 'type', activeType);
    setParam(next, 'brand', activeBrand);
    setParam(next, 'max', price?.value);
    setParam(next, 'tire', tire?.value);
    setParam(next, 'tireUnknown', tireUnknown?.checked ? '1' : '');
    setParam(next, 'completeWeight', completeWeight?.value);
    setParam(next, 'frameWeight', frameWeight?.value);
    setParam(next, 'drivetrain', drivetrainFilter?.value.trim());
    setParam(next, 'frameFact', frameFilter?.value.trim());
    setParam(next, 'categoryMin', categoryMinimum?.value);
    next.searchParams.delete('capability');
    setParam(next, 'category', category?.value);
    setParam(next, 'sort', sort?.value, 'price-asc');
    setParam(next, 'scope', allModelsVisible ? 'all' : '');
    setParam(next, 'build', String(currentBuildAllowance), String(defaultBuildAllowance));
    const target = `${next.pathname}${next.search}${next.hash}`;
    try { history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', target); } catch { /* normal navigation origin required */ }
    updateModelLinks();
  }

  function setType(value, { historyMode = 'push', update = true } = {}) {
    activeType = ['complete-bike', 'frameset'].includes(value) ? value : '';
    typeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.typeValue === activeType)));
    if (catalogNav instanceof HTMLAnchorElement) {
      if (activeType === 'frameset') catalogNav.removeAttribute('aria-current');
      else catalogNav.setAttribute('aria-current', 'page');
    }
    if (framesetNav instanceof HTMLAnchorElement) {
      if (activeType === 'frameset') framesetNav.setAttribute('aria-current', 'page');
      else framesetNav.removeAttribute('aria-current');
    }
    if (update) updateCatalog({ historyMode });
  }

  function setBrand(value, { historyMode = 'push', update = true } = {}) {
    activeBrand = brandValues.has(value) ? value : '';
    brandButtons.forEach((button) => {
      const isActive = button.dataset.brandFilter === activeBrand;
      const label = brandLabels.get(button.dataset.brandFilter) || button.textContent.trim();
      button.setAttribute('aria-pressed', String(isActive));
      button.setAttribute('aria-label', isActive ? `${label} — remove brand filter` : `${label} — filter catalog to this brand`);
    });
    if (update) updateCatalog({ historyMode });
  }

  function hasFilters() {
    return Boolean(activeType || activeBrand || allModelsVisible || search?.value.trim() || price?.value || tire?.value || (tire?.value && tireUnknown?.checked) || completeWeight?.value || frameWeight?.value || drivetrainFilter?.value.trim() || frameFilter?.value.trim() || categoryMinimum?.value || category?.value || (sort?.value && sort.value !== 'price-asc'));
  }

  function numericValue(input, multiplier = 1) {
    const value = Number(input?.value || 0);
    return Number.isFinite(value) && value > 0 ? value * multiplier : 0;
  }

  function matchesTypedFilters(row) {
    const item = byId.get(row.dataset.id);
    const maxPrice = numericValue(price);
    const minTire = numericValue(tire);
    const tireValue = Number(row.dataset.tireClearanceSort || 0);
    const maxCompleteWeight = numericValue(completeWeight, 1000);
    const maxFrameWeight = numericValue(frameWeight);
    const rowWeight = Number(item?.weightGrams || 0);
    const hasWeightFilter = Boolean(maxCompleteWeight || maxFrameWeight);
    const weightMatches = !hasWeightFilter ||
      (item?.weightKind === 'complete' && maxCompleteWeight && rowWeight && rowWeight <= maxCompleteWeight) ||
      (item?.weightKind === 'frame' && maxFrameWeight && rowWeight && rowWeight <= maxFrameWeight);
    const drivetrain = drivetrainFilter?.value.trim().toLowerCase() ?? '';
    const frame = frameFilter?.value.trim().toLowerCase() ?? '';
    const categoryLimit = numericValue(categoryMinimum);
    const categoryKind = categoryMinimum?.dataset.kind ?? '';
    return (!maxPrice || Number(row.dataset.priceFilter || Infinity) <= maxPrice) &&
      (!minTire || tireValue >= minTire || (!tireValue && tireUnknown?.checked)) &&
      weightMatches &&
      (!drivetrain || `${item?.drivetrain ?? ''} ${item?.drivetrainSubline ?? ''}`.toLowerCase().includes(drivetrain)) &&
      (!frame || String(item?.frame ?? '').toLowerCase().includes(frame)) &&
      (!categoryLimit || (row.dataset.capabilityKind === categoryKind && Number(row.dataset.capabilitySort || 0) >= categoryLimit));
  }

  function syncTireUnknownAvailability() {
    if (!(tireUnknown instanceof HTMLInputElement)) return false;
    const hasMinimum = numericValue(tire) > 0;
    tireUnknown.disabled = !hasMinimum;
    if (!hasMinimum && tireUnknown.checked) {
      tireUnknown.checked = false;
      return true;
    }
    return false;
  }

  function matchesCategory(row, value) {
    if (!value) return true;
    const [kind, choice] = value.split(':');
    if (kind === 'family') return row.dataset.family === choice;
    if (kind === 'category') {
      const canonical = (item) => item === 'gravel-adventure' ? 'adventure-gravel' : item;
      return String(row.dataset.category ?? '').split('|').map(canonical).includes(canonical(choice));
    }
    if (kind === 'handlebar') return row.dataset.handlebar === choice;
    return false;
  }

  function rowInScope(row) {
    const query = search?.value.trim() ?? '';
    return row.dataset.stage !== 'candidate' || row.dataset.defaultVisible === 'true' || allModelsVisible || Boolean(query);
  }

  function matchesPrimaryContext(row) {
    const categoryValue = category?.value ?? '';
    return (!activeType || row.dataset.type === activeType) &&
      (!activeBrand || row.dataset.brand === activeBrand) &&
      matchesCategory(row, categoryValue);
  }

  function rowMatches(row) {
    const query = search?.value.trim().toLowerCase() ?? '';
    return rowInScope(row) &&
      (!query || row.dataset.search?.includes(query)) &&
      matchesPrimaryContext(row) &&
      matchesTypedFilters(row);
  }

  function updateCategoryMinimumAvailability() {
    if (!(categoryMinimum instanceof HTMLInputElement)) return false;
    const primaryRows = rows.filter((row) => rowInScope(row) && matchesPrimaryContext(row));
    const supported = new Set(['suspension', 'motor']);
    const kinds = [...new Set(primaryRows.map((row) => row.dataset.capabilityKind).filter((kind) => supported.has(kind)))];
    const kind = kinds.length === 1 ? kinds[0] : '';
    const labels = kind === 'suspension'
      ? { label: 'Min suspension travel', unit: 'mm', placeholder: 'Any' }
      : kind === 'motor'
        ? { label: 'Min motor power', unit: 'W', placeholder: 'Any' }
        : { label: 'Category minimum', unit: '', placeholder: 'Choose one comparable category' };
    categoryMinimum.disabled = !kind;
    categoryMinimum.dataset.kind = kind;
    categoryMinimum.placeholder = labels.placeholder;
    if (categoryMinimumLabel) categoryMinimumLabel.textContent = labels.label;
    if (categoryMinimumUnit) categoryMinimumUnit.textContent = labels.unit;
    if (!kind && categoryMinimum.value) {
      categoryMinimum.value = '';
      return true;
    }
    return false;
  }

  function updateSortAvailability(items) {
    const kinds = new Set(items.map((row) => row.dataset.capabilityKind).filter(Boolean));
    const sortableKinds = new Set(['tire', 'suspension', 'motor']);
    const kind = kinds.size === 1 ? [...kinds][0] : '';
    const sortable = sortableKinds.has(kind) && items.some((row) => Number(row.dataset.capabilitySort || 0) > 0);
    const label = sortable ? (kind === 'tire' ? 'Tire clearance' : kind === 'suspension' ? 'Suspension travel' : 'Motor power') : 'Category fact';
    capabilitySortOptions.forEach((option) => {
      option.disabled = !sortable;
      option.textContent = sortable
        ? `${label}: ${option.value.endsWith('-desc') ? 'high to low' : 'low to high'}`
        : `Category fact: ${option.value.endsWith('-desc') ? 'high to low' : 'low to high'} — choose one category`;
    });
    if (capabilitySortHeading instanceof HTMLButtonElement) {
      capabilitySortHeading.disabled = !sortable;
      capabilitySortHeading.title = sortable ? '' : 'Choose one comparable category to sort this column';
    }
    if (capabilityHeadingLabel) capabilityHeadingLabel.textContent = label;
    if (!sortable && sortModeParts().key === 'capability') {
      sort.value = 'price-asc';
      return true;
    }
    return false;
  }

  function updateSortHeadings() {
    const { key, direction } = sortModeParts();
    sortHeadingButtons.forEach((button) => {
      const heading = button.closest('[role="columnheader"]');
      const isActive = button.dataset.sortHeading === key;
      heading?.setAttribute('aria-sort', isActive ? (direction === 'desc' ? 'descending' : 'ascending') : 'none');
      if (button instanceof HTMLButtonElement) {
        const defaultDirection = sortModeParts(defaultSortModes[button.dataset.sortHeading]).direction;
        const nextDirection = isActive ? (direction === 'asc' ? 'descending' : 'ascending') : (defaultDirection === 'desc' ? 'descending' : 'ascending');
        const label = button.textContent.trim();
        button.setAttribute('aria-label', isActive
          ? `${label}, sorted ${direction === 'asc' ? 'ascending' : 'descending'}. Activate to sort ${nextDirection}.`
          : `Sort by ${label} ${nextDirection}.`);
      }
    });
  }

  function sortRows(items) {
    const { key, direction } = sortModeParts();
    const multiplier = direction === 'desc' ? -1 : 1;
    return [...items].sort((a, b) => {
      if (key === 'capability' || key === 'tire') {
        const datasetKey = key === 'tire' ? 'tireClearanceSort' : 'capabilitySort';
        const aValue = Number(a.dataset[datasetKey] || 0);
        const bValue = Number(b.dataset[datasetKey] || 0);
        if (Boolean(aValue) !== Boolean(bValue)) return aValue ? -1 : 1;
        return (aValue - bValue) * multiplier || Number(a.dataset.priceSort || Infinity) - Number(b.dataset.priceSort || Infinity);
      }
      if (key === 'name') return (a.dataset.name ?? '').localeCompare(b.dataset.name ?? '') * multiplier;
      return (Number(a.dataset.priceSort || Infinity) - Number(b.dataset.priceSort || Infinity)) * multiplier;
    });
  }

  function openFilterPanel(field = '') {
    if (!(filterPanel instanceof HTMLElement)) return;
    filterPanel.hidden = false;
    filterPanelToggle?.setAttribute('aria-expanded', 'true');
    const target = field === 'price' ? price
      : field === 'drivetrain' ? drivetrainFilter
        : field === 'frame' ? frameFilter
          : field === 'category' ? categoryMinimum
            : field === 'weight' ? (activeType === 'frameset' ? frameWeight : completeWeight)
              : null;
    if (target instanceof HTMLElement) target.focus({ preventScroll: true });
  }

  function closeFilterPanel({ restoreFocus = false } = {}) {
    if (!(filterPanel instanceof HTMLElement)) return;
    filterPanel.hidden = true;
    filterPanelToggle?.setAttribute('aria-expanded', 'false');
    if (restoreFocus && filterPanelToggle instanceof HTMLElement) filterPanelToggle.focus({ preventScroll: true });
  }

  function clearTypedFilter(key) {
    const control = key === 'price' ? price
      : key === 'tire' ? tire
        : key === 'tire-unknown' ? tireUnknown
          : key === 'complete-weight' ? completeWeight
            : key === 'frame-weight' ? frameWeight
              : key === 'drivetrain' ? drivetrainFilter
                : key === 'frame' ? frameFilter
                  : key === 'category' ? categoryMinimum
                    : null;
    if (control instanceof HTMLInputElement) {
      if (control.type === 'checkbox') control.checked = false;
      else control.value = '';
    }
  }

  function typedFilterChips() {
    const chips = [];
    if (price?.value) chips.push(['price', `Price ≤ ${formatYuan(Number(price.value))}`]);
    if (tire?.value) chips.push(['tire', `Tire ≥ ${tire.value} mm`]);
    if (tireUnknown?.checked && tire?.value) chips.push(['tire-unknown', 'Include unknown tire clearance']);
    if (completeWeight?.value) chips.push(['complete-weight', `Complete bike ≤ ${completeWeight.value} kg`]);
    if (frameWeight?.value) chips.push(['frame-weight', `Frame ≤ ${frameWeight.value} g`]);
    if (drivetrainFilter?.value.trim()) chips.push(['drivetrain', `Drivetrain: ${drivetrainFilter.value.trim()}`]);
    if (frameFilter?.value.trim()) chips.push(['frame', `Frame: ${frameFilter.value.trim()}`]);
    if (categoryMinimum?.value) chips.push(['category', `${categoryMinimumLabel?.textContent || 'Category'} ≥ ${categoryMinimum.value}${categoryMinimumUnit?.textContent ? ` ${categoryMinimumUnit.textContent}` : ''}`]);
    return chips;
  }

  function renderFilterChips() {
    const chips = typedFilterChips();
    if (filterChips instanceof HTMLElement) {
      filterChips.replaceChildren();
      chips.forEach(([key, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.clearFilter = key;
        button.setAttribute('aria-label', `Remove ${label} filter`);
        button.append(document.createTextNode(label), Object.assign(document.createElement('span'), { textContent: '×' }));
        button.addEventListener('click', () => {
          clearTypedFilter(key);
          updateCatalog({ historyMode: 'push' });
        });
        filterChips.append(button);
      });
      filterChips.hidden = chips.length === 0;
    }
    const activeKeys = new Set(chips.map(([key]) => key));
    filterHeadingButtons.forEach((button) => {
      const field = button.dataset.filterHeading;
      const active = field === 'weight'
        ? activeKeys.has('complete-weight') || activeKeys.has('frame-weight')
        : field === 'tire'
          ? activeKeys.has('tire') || activeKeys.has('tire-unknown')
          : activeKeys.has(field);
      button.classList.toggle('is-active', active);
    });
  }

  function syncCatalogHeadTop() {
    if (!(catalogFilterBar instanceof HTMLElement)) return;
    const stickyTop = Number.parseFloat(getComputedStyle(catalogFilterBar).top) || 0;
    catalogRoot.style.setProperty('--catalog-head-top', `${Math.round(stickyTop + catalogFilterBar.offsetHeight)}px`);
  }

  function updateCatalog({ historyMode = null } = {}) {
    const tireUnknownCleared = syncTireUnknownAvailability();
    const categoryFilterCleared = updateCategoryMinimumAvailability();
    const matching = rows.filter(rowMatches);
    const sortCorrected = updateSortAvailability(matching);
    updateSortHeadings();
    renderFilterChips();
    syncCatalogHeadTop();
    const ordered = sortRows(rows);
    let visible = 0;
    ordered.forEach((row) => {
      const matches = rowMatches(row);
      row.hidden = !matches;
      if (matches) visible += 1;
      productList?.insertBefore(row, empty);
    });
    const filtered = hasFilters();
    if (resultCount) resultCount.textContent = String(visible);
    if (resultContext) resultContext.textContent = activeBrand ? ` for ${brandLabels.get(activeBrand) ?? activeBrand}` : '';
    if (filterNotice) filterNotice.textContent = categoryFilterCleared ? ' · incompatible category filter cleared' : '';
    if (resultSummary) resultSummary.hidden = !filtered;
    if (empty) empty.hidden = visible !== 0;
    if (reset) reset.hidden = !filtered;
    if (showAllModels instanceof HTMLButtonElement) {
      showAllModels.setAttribute('aria-pressed', String(allModelsVisible));
      showAllModels.textContent = allModelsVisible ? 'Show focused list' : 'Show all models';
    }
    if (historyMode) updateFilterUrl(historyMode);
    else if (tireUnknownCleared || categoryFilterCleared || sortCorrected) updateFilterUrl('replace');
    else updateModelLinks();
  }

  function validSelectValue(select, value, fallback = '') {
    if (!(select instanceof HTMLSelectElement)) return fallback;
    return [...select.options].some((option) => !option.disabled && option.value === value) ? value : fallback;
  }

  function restoreFromParams(params) {
    const requestedSearch = params.get('q') ?? '';
    const requestedPrice = params.get('max') ?? '';
    const legacyCapability = params.get('capability') ?? '';
    const [legacyKind, legacyThreshold] = legacyCapability.split(':');
    const requestedTire = params.get('tire') ?? (legacyKind === 'tire' ? legacyThreshold : '');
    const requestedTireUnknown = Boolean(requestedTire) && params.get('tireUnknown') === '1';
    const requestedCategoryMinimum = params.get('categoryMin') ?? (['suspension', 'motor'].includes(legacyKind) ? legacyThreshold : '');
    const requestedCategory = params.get('category') ?? '';
    const requestedBrand = params.get('brand') ?? '';
    const requestedType = params.get('type') ?? '';
    const requestedSort = params.get('sort') ?? 'price-asc';
    const requestedBuildAllowance = params.get('build') ?? String(readStoredBuildAllowance() ?? defaultBuildAllowance);
    allModelsVisible = params.get('scope') === 'all';
    if (search) search.value = requestedSearch;
    if (price) price.value = requestedPrice;
    if (tire) tire.value = requestedTire;
    if (tireUnknown instanceof HTMLInputElement) tireUnknown.checked = requestedTireUnknown;
    if (completeWeight) completeWeight.value = params.get('completeWeight') ?? '';
    if (frameWeight) frameWeight.value = params.get('frameWeight') ?? '';
    if (drivetrainFilter) drivetrainFilter.value = params.get('drivetrain') ?? '';
    if (frameFilter) frameFilter.value = params.get('frameFact') ?? '';
    if (category) category.value = validSelectValue(category, requestedCategory);
    updateFramesetPrices(requestedBuildAllowance);
    setBrand(requestedBrand, { update: false });
    setType(requestedType, { update: false });
    updateCategoryMinimumAvailability();
    if (categoryMinimum && !categoryMinimum.disabled) categoryMinimum.value = requestedCategoryMinimum;
    else if (categoryMinimum) categoryMinimum.value = '';
    if (sort) {
      sort.value = canonicalSortMode(requestedSort);
    }
    updateCatalog();
    const corrected = requestedSearch !== (search?.value ?? '') ||
      requestedPrice !== (price?.value ?? '') ||
      requestedTire !== (tire?.value ?? '') ||
      requestedTireUnknown !== Boolean(tireUnknown?.checked) ||
      requestedCategoryMinimum !== (categoryMinimum?.value ?? '') ||
      requestedCategory !== (category?.value ?? '') ||
      requestedBrand !== activeBrand ||
      requestedType !== activeType ||
      requestedBuildAllowance !== String(currentBuildAllowance) ||
      (params.get('scope') ?? '') !== (allModelsVisible ? 'all' : '') ||
      Boolean(legacyCapability) ||
      requestedSort !== (sort?.value ?? 'price');
    if (corrected) updateFilterUrl('replace');
  }

  const typedInputs = [search, price, tire, completeWeight, frameWeight, drivetrainFilter, frameFilter, categoryMinimum];
  typedInputs.forEach((element) => element?.addEventListener('input', () => updateCatalog({ historyMode: 'replace' })));
  typedInputs.forEach((element) => element?.addEventListener('change', () => updateCatalog({ historyMode: 'push' })));
  [category, sort, tireUnknown].forEach((element) => element?.addEventListener('change', () => updateCatalog({ historyMode: 'push' })));
  sortHeadingButtons.forEach((button) => button.addEventListener('click', () => {
    if (!(button instanceof HTMLButtonElement) || button.disabled) return;
    const key = button.dataset.sortHeading;
    const current = sortModeParts();
    const nextMode = current.key === key
      ? `${key}-${current.direction === 'asc' ? 'desc' : 'asc'}`
      : defaultSortModes[key];
    if (sort && nextMode) sort.value = nextMode;
    updateCatalog({ historyMode: 'push' });
  }));
  typeButtons.forEach((button) => button.addEventListener('click', () => setType(button.dataset.typeValue ?? '', { historyMode: 'push' })));
  brandButtons.forEach((button) => button.addEventListener('click', () => {
    const value = button.dataset.brandFilter ?? '';
    setBrand(value === activeBrand ? '' : value, { historyMode: 'push' });
    button.focus({ preventScroll: true });
  }));
  reset?.addEventListener('click', () => {
    if (search) search.value = '';
    ['price', 'tire', 'tire-unknown', 'complete-weight', 'frame-weight', 'drivetrain', 'frame', 'category'].forEach(clearTypedFilter);
    if (category) category.value = '';
    if (sort) sort.value = 'price-asc';
    updateFramesetPrices(defaultBuildAllowance, { highlight: true });
    allModelsVisible = false;
    setBrand('', { update: false });
    setType('', { update: false });
    updateCatalog({ historyMode: 'push' });
  });
  filterPanelToggle?.addEventListener('click', () => {
    if (filterPanel instanceof HTMLElement && filterPanel.hidden) openFilterPanel();
    else closeFilterPanel({ restoreFocus: true });
  });
  catalogRoot.querySelector('[data-filter-panel-close]')?.addEventListener('click', () => closeFilterPanel({ restoreFocus: true }));
  filterHeadingButtons.forEach((button) => button.addEventListener('click', () => {
    const field = button.dataset.filterHeading ?? '';
    if (field === 'search') search?.focus({ preventScroll: true });
    else if (field === 'tire') tire?.focus({ preventScroll: true });
    else openFilterPanel(field);
  }));
  document.addEventListener('pointerdown', (event) => {
    if (!(filterPanel instanceof HTMLElement) || filterPanel.hidden) return;
    const target = event.target;
    if (target instanceof Node && !filterPanel.contains(target) && !filterPanelToggle?.contains(target) && !target.closest?.('[data-filter-heading]')) closeFilterPanel();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && filterPanel instanceof HTMLElement && !filterPanel.hidden) closeFilterPanel({ restoreFocus: true });
  });
  if ('ResizeObserver' in window && catalogFilterBar instanceof HTMLElement) new ResizeObserver(syncCatalogHeadTop).observe(catalogFilterBar);
  addEventListener('resize', syncCatalogHeadTop);
  showAllModels?.addEventListener('click', () => {
    allModelsVisible = !allModelsVisible;
    updateCatalog({ historyMode: 'push' });
  });
  addEventListener('popstate', () => {
    restoreFromParams(new URLSearchParams(location.search));
    if (comparePanel && !comparePanel.hidden && selection.length >= 2) renderComparison();
  });

  const initialParams = new URLSearchParams(location.search);
  restoreFromParams(initialParams);

  const compareTray = document.querySelector('[data-compare-tray]');
  const compareCount = document.querySelector('[data-compare-count]');
  const selectionLabel = document.querySelector('[data-selection-label]');
  const selectionNames = document.querySelector('[data-selection-names]');
  const openCompareButton = document.querySelector('[data-open-compare]');
  const openBuildLink = document.querySelector('[data-open-build]');
  const compareBoxes = [...document.querySelectorAll('[data-compare-id]')];
  const comparePanel = catalogRoot.querySelector('[data-inline-compare]');
  const compareContent = catalogRoot.querySelector('[data-compare-content]');
  let selection = readStoredSelection().filter((id) => byId.has(id));

  function syncBoxes() {
    compareBoxes.forEach((box) => {
      const selected = selection.includes(box.dataset.compareId);
      box.checked = selected;
      box.disabled = !selected && selection.length >= comparisonSelectionLimit;
    });
  }

  function renderTray() {
    writeStoredSelection(selection);
    if (compareCount) compareCount.textContent = String(selection.length);
    if (selectionLabel) selectionLabel.textContent = selection.length >= comparisonSelectionLimit
      ? ` selected · ${comparisonSelectionLimit}-bike limit reached`
      : ' selected';
    if (selectionNames) selectionNames.textContent = selection.map((id) => byId.get(id)?.name).filter(Boolean).join(' · ');
    compareTray?.classList.toggle('is-visible', selection.length > 0);
    if (openCompareButton instanceof HTMLButtonElement) {
      openCompareButton.hidden = selection.length < 2;
      openCompareButton.disabled = selection.length < 2;
      openCompareButton.textContent = 'Compare';
    }
    if (openBuildLink instanceof HTMLAnchorElement) {
      const item = selection.length === 1 ? byId.get(selection[0]) : null;
      openBuildLink.hidden = !item?.builderEligible;
      if (item?.builderEligible) {
        const target = new URL(`${document.body.dataset.base || ''}/build/`, location.origin);
        target.searchParams.set('base', item.buildBaseId || item.id);
        openBuildLink.href = `${target.pathname}${target.search}`;
        openBuildLink.textContent = item.buildBaseKind === 'frameset' ? 'Build this frame' : 'Modify this bike';
        openBuildLink.setAttribute('aria-label', `${openBuildLink.textContent}: ${item.name}`);
      }
    }
    syncBoxes();
    if (selection.length < 2 && comparePanel && !comparePanel.hidden) closeComparison();
  }

  function setSelection(next) {
    selection = [...new Set(next.filter((id) => byId.has(id)))].slice(0, comparisonSelectionLimit);
    renderTray();
    if (comparePanel && !comparePanel.hidden && selection.length >= 2) renderComparison();
  }

  compareBoxes.forEach((box) => {
    box.addEventListener('change', () => {
      const id = box.dataset.compareId;
      if (!id) return;
      if (box.checked) setSelection([...selection, id]);
      else setSelection(selection.filter((item) => item !== id));
    });
  });

  function element(tag, className = '', text = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function productHeader(item) {
    const head = element('div', 'compare-product-head');
    const label = [item.brand, item.name].filter(Boolean).join(' ');
    const copy = element('div');
    const title = item.url ? element('a', '', label) : element('span', '', label);
    if (item.url) {
      const target = new URL(item.url, location.origin);
      target.searchParams.set('from', `${location.pathname}${location.search}#catalog`);
      title.href = `${target.pathname}${target.search}`;
    }
    const type = element('span', '', item.type);
    copy.append(title, type);
    const remove = element('button', 'remove-compare', '×');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove ${label}`);
    remove.addEventListener('click', () => setSelection(selection.filter((id) => id !== item.id)));
    if (item.image) {
      const image = document.createElement('img');
      image.src = item.image;
      if (item.imageSrcset) image.srcset = item.imageSrcset;
      if (item.imageSizes) image.sizes = item.imageSizes;
      image.alt = item.imageAlt || label;
      image.width = item.imageWidth || 120;
      image.height = item.imageHeight || 80;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.dataset.productImage = '';
      if (item.imageRemote) image.referrerPolicy = 'no-referrer';
      enableImageFailureHandling(image);
      head.append(image);
    } else {
      head.classList.add('has-no-image');
    }
    head.append(copy, remove);
    return head;
  }

  function valueCell(primary, secondary = '', modifier = '') {
    const cell = element('div', `compare-value${modifier ? ` ${modifier}` : ''}`);
    const strong = element('strong', '', primary || '—');
    cell.append(strong);
    if (secondary) cell.append(element('small', '', secondary));
    return cell;
  }

  function comparisonGrid(items, fields, includeHeaders = false) {
    const scroll = element('div', 'compare-scroll');
    scroll.tabIndex = 0;
    scroll.setAttribute('aria-label', 'Bike comparison table; scroll horizontally to see every selected bike');
    const grid = element('div', 'compare-grid');
    grid.style.setProperty('--compare-count', String(items.length));
    if (includeHeaders) {
      grid.append(element('div', 'compare-label', 'Bike'));
      items.forEach((item) => grid.append(productHeader(item)));
    }
    fields.forEach(([label, render]) => {
      grid.append(element('div', 'compare-label', label));
      items.forEach((item) => grid.append(render(item)));
    });
    scroll.append(grid);
    return scroll;
  }

  function renderComparison() {
    const items = selection.map((id) => byId.get(id)).filter(Boolean);
    if (!compareContent || items.length < 2) return;
    const metricKinds = [...new Set(items.map((item) => item.categoryMetricKind))];
    const metricFields = metricKinds.filter((kind) => kind !== 'tire').map((kind) => {
      const sample = items.find((item) => item.categoryMetricKind === kind);
      return [sample?.categoryMetricLabel ?? 'Category fact', (item) => item.categoryMetricKind === kind
        ? valueCell(item.categoryMetric, item.categoryMetricDetails)
        : valueCell('—')];
    });
    const hasValue = (key) => items.some((item) => item[key] && item[key] !== '—');
    const coreFields = [
      ['Price', (item) => valueCell(item.price, item.priceState)],
      ['Category', (item) => valueCell(item.category)],
      ...(hasValue('tireClearance') ? [['Tire clearance', (item) => valueCell(item.tireClearance)]] : []),
      ...metricFields,
      ...(hasValue('drivetrain') ? [['Drivetrain', (item) => valueCell(item.drivetrain, item.drivetrainSubline)]] : []),
      ...(hasValue('weight') ? [['Weight', (item) => valueCell(item.weight)]] : []),
      ...(hasValue('frame') ? [['Frame', (item) => valueCell(item.frame)]] : []),
      ...(hasValue('bestFor') ? [['Best for', (item) => valueCell(item.bestFor)]] : []),
      ...(hasValue('verdict') ? [['Verdict', (item) => valueCell(item.verdict)]] : [])
    ];
    const secondaryFields = [
      ...(hasValue('priceDetails') ? [['Price details', (item) => valueCell(item.priceDetails)]] : []),
      ...(hasValue('internalFrameStorage') ? [['Internal frame storage', (item) => valueCell(item.internalFrameStorage)]] : []),
      ...(hasValue('mounts') ? [['Mounts', (item) => valueCell(item.mounts)]] : []),
      ...(hasValue('manufacturing') ? [['Manufacturing', (item) => valueCell(item.manufacturing)]] : []),
      ...(hasValue('availability') ? [['Availability', (item) => valueCell(item.availability)]] : [])
    ];
    const mixedCategories = metricKinds.length > 1;
    const context = element('p', `compare-context${mixedCategories ? ' is-warning' : ''}`, mixedCategories
      ? 'These bikes serve different categories. Category-specific facts are separated below and should not be ranked against one another.'
      : `Category-specific facts are comparable across these ${items.length} selections.`);
    compareContent.replaceChildren(context, comparisonGrid(items, coreFields, true));
    if (secondaryFields.length) {
      const more = element('details', 'compare-more');
      more.append(element('summary', '', 'More details'), comparisonGrid(items, secondaryFields));
      compareContent.append(more);
    }

    const next = new URL(location.href);
    next.searchParams.set('compare', selection.join(','));
    try { history.replaceState(null, '', `${next.pathname}${next.search}#compare`); } catch { /* normal navigation origin required */ }
  }

  function openComparison({ scroll = true, focus = scroll } = {}) {
    if (!comparePanel || selection.length < 2) return;
    comparePanel.hidden = false;
    compareTray?.classList.add('is-comparing');
    renderComparison();
    if (focus && comparePanel instanceof HTMLElement) comparePanel.focus({ preventScroll: true });
    if (scroll) comparePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeComparison({ restoreFocus = false } = {}) {
    if (comparePanel) comparePanel.hidden = true;
    compareTray?.classList.remove('is-comparing');
    const next = new URL(location.href);
    next.searchParams.delete('compare');
    try { history.replaceState(null, '', `${next.pathname}${next.search}${location.hash === '#compare' ? '' : location.hash}`); } catch { /* normal navigation origin required */ }
    if (restoreFocus && openCompareButton instanceof HTMLButtonElement && !openCompareButton.disabled) openCompareButton.focus({ preventScroll: true });
  }

  openCompareButton?.addEventListener('click', () => openComparison());
  document.querySelector('[data-clear-selection]')?.addEventListener('click', () => setSelection([]));
  catalogRoot.querySelector('[data-close-compare]')?.addEventListener('click', () => closeComparison({ restoreFocus: true }));
  catalogRoot.querySelector('[data-copy-comparison]')?.addEventListener('click', async (event) => {
    if (selection.length >= 2) renderComparison();
    if (event.currentTarget instanceof HTMLButtonElement) {
      showCopyFeedback(event.currentTarget, await copyText(location.href));
    }
  });

  const querySelection = (initialParams.get('compare') ?? '').split(',').filter((id) => byId.has(id)).slice(0, comparisonSelectionLimit);
  if (querySelection.length) selection = querySelection;
  renderTray();
  if (querySelection.length >= 2) openComparison({ scroll: false });

  function applyBuildAllowance({ historyMode }) {
    if (!(buildAllowance instanceof HTMLInputElement) || !buildAllowance.value.trim()) return;
    updateFramesetPrices(buildAllowance.value, { highlight: true });
    writeStoredBuildAllowance(currentBuildAllowance);
    updateCatalog({ historyMode });
    if (comparePanel && !comparePanel.hidden && selection.length >= 2) renderComparison();
  }

  buildAllowance?.addEventListener('input', () => applyBuildAllowance({ historyMode: 'replace' }));
  buildAllowance?.addEventListener('change', () => {
    if (buildAllowance instanceof HTMLInputElement && !buildAllowance.value.trim()) {
      buildAllowance.value = String(defaultBuildAllowance);
    }
    applyBuildAllowance({ historyMode: 'push' });
  });
  buildPreset?.addEventListener('change', () => {
    if (!(buildPreset instanceof HTMLSelectElement)) return;
    const selected = buildPreset.selectedOptions[0];
    const amount = Number(selected?.dataset.buildAmount);
    if (!Number.isFinite(amount)) {
      if (buildCustom instanceof HTMLElement) buildCustom.hidden = false;
      if (buildAllowance instanceof HTMLInputElement) buildAllowance.focus({ preventScroll: true });
      return;
    }
    if (buildAllowance instanceof HTMLInputElement) buildAllowance.value = String(amount);
    applyBuildAllowance({ historyMode: 'push' });
  });
})();

(() => {
  const root = document.querySelector('[data-bike-builder]');
  const dataNode = document.querySelector('#build-configurator-data');
  if (!(root instanceof HTMLElement) || !(dataNode instanceof HTMLScriptElement)) return;

  let data;
  try { data = JSON.parse(dataNode.textContent || '{}'); } catch { return; }
  if (data?.schemaVersion !== 2 || !Array.isArray(data.bases) || !Array.isArray(data.parts)) return;

  const storageKey = 'china-bike-builder-v2';
  const bases = new Map(data.bases.map((base) => [base.id, base]));
  const parts = new Map(data.parts.map((part) => [part.id, part]));
  const slots = Array.isArray(data.slots) ? data.slots : [];
  const baseSelect = root.querySelector('[data-build-base]');
  const baseLink = root.querySelector('[data-build-base-link]');
  const baseFacts = root.querySelector('[data-build-base-facts]');
  const baseCustom = root.querySelector('[data-build-base-custom]');
  const basePrice = root.querySelector('[data-build-base-price]');
  const baseWeight = root.querySelector('[data-build-base-weight]');
  const basePriceField = root.querySelector('[data-build-base-price-field]');
  const baseWeightField = root.querySelector('[data-build-base-weight-field]');
  const totalPrice = root.querySelector('[data-build-total-price]');
  const totalWeight = root.querySelector('[data-build-total-weight]');
  const completeness = root.querySelector('[data-build-completeness]');
  const compatibility = root.querySelector('[data-build-compatibility]');
  const buildName = root.querySelector('[data-build-name]');
  const summaryKicker = root.querySelector('[data-build-summary-kicker]');
  const priceLabel = root.querySelector('[data-build-price-label]');
  const weightLabel = root.querySelector('[data-build-weight-label]');
  const rows = new Map([...root.querySelectorAll('[data-build-slot]')].map((row) => [row.dataset.buildSlot, row]));
  const sourcedDefaults = Object.fromEntries(slots.map((slot) => [
    slot,
    data.parts.find((part) => part.slot === slot && part.default)?.id || 'custom'
  ]));

  function defaultSelections(base) {
    return Object.fromEntries(slots.map((slot) => [slot, base?.kind === 'complete-bike' ? 'included' : sourcedDefaults[slot]]));
  }

  function ensureBaseOption(base) {
    if (!(baseSelect instanceof HTMLSelectElement) || !base || [...baseSelect.options].some((option) => option.value === base.id)) return;
    let group = baseSelect.querySelector('optgroup[data-selected-research-base]');
    if (!(group instanceof HTMLOptGroupElement)) {
      group = document.createElement('optgroup');
      group.label = 'Selected research-stage item';
      group.dataset.selectedResearchBase = '';
      baseSelect.append(group);
    }
    const option = document.createElement('option');
    option.value = base.id;
    option.textContent = base.name;
    group.replaceChildren(option);
  }

  function readStoredState() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
      return value && typeof value === 'object' ? value : {};
    } catch { return {}; }
  }

  const stored = readStoredState();
  const initialParams = new URLSearchParams(location.search);
  const firstBaseId = data.bases[0]?.id || '';
  const requestedBase = initialParams.get('base') || initialParams.get('frame') || stored.baseId || stored.frameId;
  const selectedBaseId = bases.has(requestedBase) ? requestedBase : firstBaseId;
  const selectedBase = bases.get(selectedBaseId);
  const baseDefaults = defaultSelections(selectedBase);
  const state = {
    baseId: selectedBaseId,
    selections: {},
    custom: {},
    baseCustom: {
      price: initialParams.get('basePrice') ?? (stored.baseId === selectedBaseId ? stored.baseCustom?.price : '') ?? '',
      weight: initialParams.get('baseWeight') ?? (stored.baseId === selectedBaseId ? stored.baseCustom?.weight : '') ?? '',
    },
  };

  for (const slot of slots) {
    const storedPart = stored.baseId === selectedBaseId ? stored.selections?.[slot] : '';
    const requestedPart = initialParams.get(`part-${slot}`) || storedPart || baseDefaults[slot];
    state.selections[slot] = requestedPart === 'custom' || (requestedPart === 'included' && selectedBase?.kind === 'complete-bike') || (parts.has(requestedPart) && parts.get(requestedPart).slot === slot)
      ? requestedPart
      : baseDefaults[slot];
    const storedCustom = stored.baseId === selectedBaseId ? stored.custom?.[slot] || {} : {};
    state.custom[slot] = {
      price: initialParams.get(`price-${slot}`) ?? storedCustom.price ?? '',
      weight: initialParams.get(`weight-${slot}`) ?? storedCustom.weight ?? '',
      removedWeight: initialParams.get(`removed-${slot}`) ?? storedCustom.removedWeight ?? '',
    };
  }

  function numberOrNull(value) {
    if (value === '' || value === null || value === undefined) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
  }

  function formatYuan(value) {
    return `¥${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value))}`;
  }

  function formatPriceRange(low, high) {
    return low === high ? formatYuan(low) : `${formatYuan(low)}–${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(high))}`;
  }

  function formatWeight(grams) {
    return grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${Math.round(grams)} g`;
  }

  function selectedPart(slot) {
    const id = state.selections[slot];
    return id && !['custom', 'included'].includes(id) ? parts.get(id) || null : null;
  }

  function coveredSlots() {
    const covered = new Map();
    for (const slot of slots) {
      const part = selectedPart(slot);
      if (!part) continue;
      for (const coveredSlot of part.covers || []) {
        if (!covered.has(coveredSlot)) covered.set(coveredSlot, part);
      }
    }
    return covered;
  }

  function setPartFacts(row, { price = '—', weight = '—', basis = '', source = null }) {
    const priceNode = row.querySelector('[data-build-part-price]');
    const weightNode = row.querySelector('[data-build-part-weight]');
    const basisNode = row.querySelector('[data-build-part-basis]');
    const sourceNode = row.querySelector('[data-build-part-source]');
    if (priceNode) priceNode.textContent = price;
    if (weightNode) weightNode.textContent = weight;
    if (basisNode) basisNode.textContent = basis;
    if (sourceNode instanceof HTMLAnchorElement) {
      sourceNode.hidden = !source?.url;
      if (source?.url) {
        sourceNode.href = source.url;
        sourceNode.title = source.title || 'Source';
      } else {
        sourceNode.href = `${document.body.dataset.base || ''}/methodology/`;
        sourceNode.removeAttribute('title');
      }
    }
  }

  function compatibilityMessages(base, covered) {
    const messages = [];
    const bottomBracket = covered.has('bottom-bracket') ? null : selectedPart('bottom-bracket');
    const acceptedShells = bottomBracket?.compatibility?.accepted_frame_shells
      || bottomBracket?.compatibility?.frame_bottom_bracket
      || [];
    if (bottomBracket && base.bottomBracketKey && acceptedShells.length && !acceptedShells.includes(base.bottomBracketKey)) {
      messages.push(`${bottomBracket.maker} ${bottomBracket.name} does not list ${base.bottomBracket} frame compatibility.`);
    }
    const tires = covered.has('tires') ? null : selectedPart('tires');
    const tireWidth = Number(tires?.compatibility?.nominal_tire_width_mm ?? tires?.compatibility?.tire_width_mm);
    if (tires && Number.isFinite(tireWidth) && Number.isFinite(base.tireClearanceMm) && tireWidth > base.tireClearanceMm) {
      messages.push(`${tireWidth} mm tires exceed the frame's published ${base.tireClearanceMm} mm limit.`);
    }
    const drivetrain = selectedPart('drivetrain');
    const wheelset = covered.has('wheelset') ? null : selectedPart('wheelset');
    const requiredFreehub = drivetrain?.compatibility?.required_freehub;
    const availableFreehubs = wheelset?.compatibility?.freehubs || [];
    if (requiredFreehub && availableFreehubs.length && !availableFreehubs.includes(requiredFreehub)) {
      messages.push(`${drivetrain.maker} ${drivetrain.name} requires ${requiredFreehub}; the selected wheelset does not list it.`);
    }
    return messages;
  }

  function updateUrl(historyMode = 'replace') {
    const target = new URL(location.href);
    const base = bases.get(state.baseId);
    const defaults = defaultSelections(base);
    if (state.baseId) target.searchParams.set('base', state.baseId);
    target.searchParams.delete('frame');
    for (const [field, value, recorded] of [
      ['basePrice', state.baseCustom.price, numberOrNull(base?.priceLow)],
      ['baseWeight', state.baseCustom.weight, numberOrNull(base?.baseWeightG)]
    ]) {
      if (recorded === null && value !== '') target.searchParams.set(field, value);
      else target.searchParams.delete(field);
    }
    for (const slot of slots) {
      const selection = state.selections[slot];
      if (selection && selection !== defaults[slot]) target.searchParams.set(`part-${slot}`, selection);
      else target.searchParams.delete(`part-${slot}`);
      const part = selectedPart(slot);
      const custom = state.custom[slot];
      for (const [field, value] of [['price', custom.price], ['weight', custom.weight], ['removed', custom.removedWeight]]) {
        const key = `${field}-${slot}`;
        const recordedValue = field === 'price' ? numberOrNull(part?.priceCny) : field === 'weight' ? numberOrNull(part?.weightG) : null;
        const relevant = field === 'removed' ? base?.kind === 'complete-bike' && selection !== 'included' : selection === 'custom' || recordedValue === null;
        if (relevant && value !== '') target.searchParams.set(key, value);
        else target.searchParams.delete(key);
      }
    }
    try { history[historyMode === 'push' ? 'pushState' : 'replaceState'](null, '', `${target.pathname}${target.search}`); } catch { /* normal navigation origin required */ }
  }

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* URL remains shareable */ }
  }

  function render({ historyMode = 'replace' } = {}) {
    const base = bases.get(state.baseId) || data.bases[0];
    if (!base) return;
    const isComplete = base.kind === 'complete-bike';
    ensureBaseOption(base);
    if (baseSelect instanceof HTMLSelectElement) baseSelect.value = base.id;
    if (baseLink instanceof HTMLAnchorElement) baseLink.href = base.url;
    if (baseFacts) baseFacts.textContent = [
      `${isComplete ? 'Complete bike' : 'Frameset'}${base.stage === 'candidate' ? ' · research stage' : ''}`,
      base.bottomBracket || 'bottom bracket unknown',
      base.tireClearanceMm ? `${base.tireClearanceMm} mm tire clearance` : 'tire clearance unknown',
      base.included.length ? base.included.join(', ') : 'package contents incomplete',
      base.priceNote || ''
    ].filter(Boolean).join(' · ');
    if (buildName) buildName.textContent = base.name.replace(/ · research stage$/, '');
    if (summaryKicker) summaryKicker.textContent = isComplete ? 'Purchase + upgrades' : 'Current build';
    if (priceLabel) priceLabel.textContent = isComplete ? 'Purchase + upgrades' : 'Full build price';
    if (weightLabel) weightLabel.textContent = isComplete ? 'Projected weight' : 'Known weight';

    const recordedBasePriceLow = numberOrNull(base.priceLow);
    const recordedBasePriceHigh = numberOrNull(base.priceHigh ?? base.priceLow);
    const buyerBasePrice = numberOrNull(state.baseCustom.price);
    const basePriceLow = recordedBasePriceLow ?? buyerBasePrice;
    const basePriceHigh = recordedBasePriceHigh ?? buyerBasePrice;
    const recordedBaseWeight = numberOrNull(base.baseWeightG);
    const buyerBaseWeight = numberOrNull(state.baseCustom.weight);
    const baseWeightValue = recordedBaseWeight ?? buyerBaseWeight;
    if (basePrice instanceof HTMLInputElement) basePrice.value = state.baseCustom.price;
    if (baseWeight instanceof HTMLInputElement) baseWeight.value = state.baseCustom.weight;
    if (basePriceField instanceof HTMLElement) basePriceField.hidden = recordedBasePriceLow !== null;
    if (baseWeightField instanceof HTMLElement) baseWeightField.hidden = recordedBaseWeight !== null;
    if (baseCustom instanceof HTMLElement) baseCustom.hidden = recordedBasePriceLow !== null && recordedBaseWeight !== null;

    let priceLow = basePriceLow ?? 0;
    let priceHigh = basePriceHigh ?? priceLow;
    let knownWeight = baseWeightValue ?? 0;
    const missingPrices = [];
    const missingWeights = [];
    if (basePriceLow === null) missingPrices.push(isComplete ? 'base bike' : 'frameset');
    if (baseWeightValue === null) missingWeights.push(isComplete ? 'base bike' : 'frameset');
    else if (!isComplete) missingWeights.push('fork / frame package remainder');
    const covered = coveredSlots();

    for (const slot of slots) {
      const row = rows.get(slot);
      if (!(row instanceof HTMLElement)) continue;
      const select = row.querySelector('[data-build-part-select]');
      const customValues = row.querySelector('[data-build-custom-values]');
      const customPrice = row.querySelector('[data-build-custom-price]');
      const customWeight = row.querySelector('[data-build-custom-weight]');
      const removedWeight = row.querySelector('[data-build-removed-weight]');
      const customPriceField = row.querySelector('[data-build-custom-price-field]');
      const customWeightField = row.querySelector('[data-build-custom-weight-field]');
      const removedWeightField = row.querySelector('[data-build-removed-weight-field]');
      const coveredNote = row.querySelector('[data-build-covered-note]');
      const coveringPart = covered.get(slot);
      row.classList.toggle('is-covered', Boolean(coveringPart));
      if (select instanceof HTMLSelectElement) {
        const includedOption = select.querySelector('option[value="included"]');
        if (includedOption instanceof HTMLOptionElement) {
          includedOption.hidden = !isComplete;
          includedOption.disabled = !isComplete;
        }
        select.value = state.selections[slot];
        select.disabled = Boolean(coveringPart);
      }
      if (coveredNote instanceof HTMLElement) {
        coveredNote.hidden = !coveringPart;
        coveredNote.textContent = coveringPart ? `Included in ${coveringPart.maker} ${coveringPart.name}; not counted again.` : '';
      }
      if (coveringPart) {
        if (customValues instanceof HTMLElement) customValues.hidden = true;
        setPartFacts(row, { price: 'Included', weight: 'Counted once' });
        continue;
      }

      const isIncluded = isComplete && state.selections[slot] === 'included';
      row.classList.toggle('is-included', isIncluded);
      if (isIncluded) {
        if (customValues instanceof HTMLElement) customValues.hidden = true;
        setPartFacts(row, { price: 'Included', weight: 'In base weight', basis: 'Included in the complete-bike package' });
        continue;
      }

      const part = selectedPart(slot);
      const isCustom = state.selections[slot] === 'custom' || !part;
      if (customPrice instanceof HTMLInputElement) customPrice.value = state.custom[slot].price;
      if (customWeight instanceof HTMLInputElement) customWeight.value = state.custom[slot].weight;
      if (removedWeight instanceof HTMLInputElement) removedWeight.value = state.custom[slot].removedWeight;
      const recordedPrice = isCustom ? null : numberOrNull(part.priceCny);
      const recordedWeight = isCustom ? null : numberOrNull(part.weightG);
      const buyerPrice = numberOrNull(state.custom[slot].price);
      const buyerWeight = numberOrNull(state.custom[slot].weight);
      const removedPartWeight = numberOrNull(state.custom[slot].removedWeight);
      const needsPriceInput = isCustom || recordedPrice === null;
      const needsWeightInput = isCustom || recordedWeight === null;
      const needsRemovedWeight = isComplete;
      if (customValues instanceof HTMLElement) customValues.hidden = !needsPriceInput && !needsWeightInput && !needsRemovedWeight;
      if (customPriceField instanceof HTMLElement) customPriceField.hidden = !needsPriceInput;
      if (customWeightField instanceof HTMLElement) customWeightField.hidden = !needsWeightInput;
      if (removedWeightField instanceof HTMLElement) removedWeightField.hidden = !needsRemovedWeight;
      const partPrice = recordedPrice ?? buyerPrice;
      const partWeight = recordedWeight ?? buyerWeight;
      if (partPrice === null) missingPrices.push(slot);
      else { priceLow += partPrice; priceHigh += partPrice; }
      let weightDisplay = partWeight === null ? '—' : formatWeight(partWeight);
      if (isComplete) {
        if (partWeight === null || removedPartWeight === null) {
          missingWeights.push(`${slot} replacement delta`);
          if (partWeight !== null) weightDisplay = `${formatWeight(partWeight)} new · delta unknown`;
        } else {
          const delta = partWeight - removedPartWeight;
          knownWeight += delta;
          weightDisplay = `${formatWeight(partWeight)} new · ${delta >= 0 ? '+' : '−'}${formatWeight(Math.abs(delta))}`;
        }
      } else if (partWeight === null) missingWeights.push(slot);
      else knownWeight += partWeight;
      const basis = isCustom
        ? `Buyer-entered value${isComplete ? ' · replacement delta needs removed-part weight' : ''}`
        : [
            part.priceDate,
            recordedPrice === null && buyerPrice !== null ? 'Buyer-entered price' : part.priceBasis,
            recordedWeight === null && buyerWeight !== null ? 'Buyer-entered weight' : part.weightBasis,
            isComplete && removedPartWeight === null ? 'Removed-part weight required for final weight' : '',
          ].filter(Boolean).join(' · ');
      setPartFacts(row, {
        price: partPrice === null ? '—' : formatYuan(partPrice),
        weight: weightDisplay,
        basis,
        source: isCustom ? null : part.source,
      });
    }

    if (totalPrice) totalPrice.textContent = missingPrices.length
      ? `${formatPriceRange(priceLow, priceHigh)} known + ${missingPrices.length} unknown`
      : formatPriceRange(priceLow, priceHigh);
    if (totalWeight) totalWeight.textContent = missingWeights.length
      ? `${formatWeight(knownWeight)} ${isComplete ? 'base / known deltas' : 'known'} + ${missingWeights.length} unknown`
      : formatWeight(knownWeight);
    if (completeness) completeness.textContent = missingPrices.length || missingWeights.length
      ? `${isComplete ? 'Purchase total' : 'Complete price'} needs ${missingPrices.length} more input${missingPrices.length === 1 ? '' : 's'}; ${isComplete ? 'projected weight' : 'complete weight'} needs ${missingWeights.length} more input${missingWeights.length === 1 ? '' : 's'}.`
      : isComplete ? 'Purchase price and every replacement weight delta are resolved.' : 'Every required slot has a price and weight.';

    const conflicts = compatibilityMessages(base, covered);
    if (compatibility instanceof HTMLElement) {
      compatibility.classList.toggle('has-conflicts', conflicts.length > 0);
      compatibility.replaceChildren();
      if (conflicts.length) {
        const heading = document.createElement('strong');
        heading.textContent = 'Compatibility conflict';
        const list = document.createElement('ul');
        conflicts.forEach((message) => {
          const item = document.createElement('li');
          item.textContent = message;
          list.append(item);
        });
        compatibility.append(heading, list);
      } else {
        const quiet = document.createElement('p');
        quiet.textContent = 'No conflict in the recorded checks.';
        compatibility.append(quiet);
      }
    }
    persist();
    updateUrl(historyMode);
  }

  baseSelect?.addEventListener('change', () => {
    if (!(baseSelect instanceof HTMLSelectElement) || !bases.has(baseSelect.value)) return;
    const previous = bases.get(state.baseId);
    const next = bases.get(baseSelect.value);
    state.baseId = baseSelect.value;
    state.baseCustom = { price: '', weight: '' };
    if (previous?.kind !== next?.kind) {
      state.selections = defaultSelections(next);
      state.custom = Object.fromEntries(slots.map((slot) => [slot, { price: '', weight: '', removedWeight: '' }]));
    }
    render({ historyMode: 'push' });
  });
  basePrice?.addEventListener('input', () => {
    if (basePrice instanceof HTMLInputElement) state.baseCustom.price = basePrice.value;
    render();
  });
  baseWeight?.addEventListener('input', () => {
    if (baseWeight instanceof HTMLInputElement) state.baseCustom.weight = baseWeight.value;
    render();
  });

  rows.forEach((row, slot) => {
    const select = row.querySelector('[data-build-part-select]');
    const customPrice = row.querySelector('[data-build-custom-price]');
    const customWeight = row.querySelector('[data-build-custom-weight]');
    const removedWeight = row.querySelector('[data-build-removed-weight]');
    select?.addEventListener('change', () => {
      if (select instanceof HTMLSelectElement && state.selections[slot] !== select.value) {
        state.selections[slot] = select.value;
        state.custom[slot] = { price: '', weight: '', removedWeight: '' };
      }
      render({ historyMode: 'push' });
    });
    customPrice?.addEventListener('input', () => {
      if (customPrice instanceof HTMLInputElement) state.custom[slot].price = customPrice.value;
      render();
    });
    customWeight?.addEventListener('input', () => {
      if (customWeight instanceof HTMLInputElement) state.custom[slot].weight = customWeight.value;
      render();
    });
    removedWeight?.addEventListener('input', () => {
      if (removedWeight instanceof HTMLInputElement) state.custom[slot].removedWeight = removedWeight.value;
      render();
    });
  });

  root.querySelector('[data-build-copy]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    let copied = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(location.href);
        copied = true;
      } catch { /* HTTPS or clipboard permission may be unavailable. */ }
    }
    if (button instanceof HTMLButtonElement) {
      const original = button.textContent;
      button.textContent = copied ? 'Copied' : 'Copy failed';
      setTimeout(() => { button.textContent = original; }, 1200);
    }
  });
  root.querySelector('[data-build-reset]')?.addEventListener('click', () => {
    state.baseId = firstBaseId;
    state.selections = defaultSelections(bases.get(firstBaseId));
    state.custom = Object.fromEntries(slots.map((slot) => [slot, { price: '', weight: '', removedWeight: '' }]));
    state.baseCustom = { price: '', weight: '' };
    try { localStorage.removeItem(storageKey); } catch { /* URL still resets */ }
    render({ historyMode: 'push' });
  });

  render();
})();
