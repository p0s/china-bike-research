(() => {
  const base = document.body.dataset.base ?? '';
  const selectionStorageKey = 'china-bike-guide-selection-v2';
  const buildAllowanceStorageKey = 'china-bike-guide-build-allowance-v1';

  function readStoredSelection() {
    try {
      const value = JSON.parse(localStorage.getItem(selectionStorageKey) ?? '[]');
      return Array.isArray(value) ? [...new Set(value.filter((item) => typeof item === 'string'))].slice(0, 4) : [];
    } catch { return []; }
  }

  function writeStoredSelection(selection) {
    try { localStorage.setItem(selectionStorageKey, JSON.stringify(selection.slice(0, 4))); } catch { /* selection remains usable for this page */ }
  }

  function readStoredBuildAllowance() {
    try {
      const value = Number(localStorage.getItem(buildAllowanceStorageKey));
      return Number.isFinite(value) ? value : null;
    } catch { return null; }
  }

  function writeStoredBuildAllowance(value) {
    try { localStorage.setItem(buildAllowanceStorageKey, String(value)); } catch { /* the URL still carries the selected amount */ }
  }

  function enableImageFallback(image) {
    if (!(image instanceof HTMLImageElement) || image.dataset.fallbackReady === 'true') return;
    image.dataset.fallbackReady = 'true';
    const useFallback = () => {
      const fallback = image.dataset.fallback;
      if (!fallback || image.dataset.fallbackApplied === 'true') return;
      image.dataset.fallbackApplied = 'true';
      image.src = fallback;
      image.classList.add('is-fallback');
      image.removeAttribute('referrerpolicy');
      image.alt = `${image.alt || 'Product image'} — source unavailable; showing project placeholder`;
      const captionStatus = image.closest('.model-gallery-strip')
        ? null
        : image.closest('.model-figure')?.querySelector('[data-image-caption-status]');
      if (captionStatus instanceof HTMLElement) captionStatus.textContent = 'Source image unavailable · Project placeholder shown';
    };
    image.addEventListener('error', useFallback);
    if (image.complete && image.naturalWidth === 0) useFallback();
  }
  document.querySelectorAll('[data-product-image]').forEach(enableImageFallback);

  document.querySelectorAll('[data-image-gallery]').forEach((gallery) => {
    const hero = gallery.querySelector('[data-gallery-hero]');
    const caption = gallery.querySelector('[data-gallery-caption]');
    const sourceLink = gallery.querySelector('[data-gallery-source-link]');
    const buttons = [...gallery.querySelectorAll('[data-gallery-thumb]')];
    if (!(hero instanceof HTMLImageElement) || !buttons.length) return;

    const selectImage = (button) => {
      if (!(button instanceof HTMLButtonElement) || button.getAttribute('aria-pressed') === 'true') return;
      hero.classList.add('is-switching');
      window.setTimeout(() => {
        hero.dataset.fallbackApplied = '';
        hero.classList.remove('is-fallback', 'is-placeholder');
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
  const capability = catalogRoot.querySelector('[data-filter-capability]');
  const category = catalogRoot.querySelector('[data-filter-category]');
  const sort = catalogRoot.querySelector('[data-sort]');
  const buildAllowance = document.querySelector('[data-frameset-build-allowance]');
  const capabilitySortOptions = [...(sort?.querySelectorAll('option[value^="capability-"]') ?? [])];
  const sortHeadingButtons = [...catalogRoot.querySelectorAll('[data-sort-heading]')];
  const sortHeadingByKey = new Map(sortHeadingButtons.map((button) => [button.dataset.sortHeading, button]));
  const capabilitySortHeading = sortHeadingByKey.get('capability');
  const capabilityHeadingLabel = capabilitySortHeading?.querySelector('[data-capability-heading-label]');
  const reset = catalogRoot.querySelector('[data-reset]');
  const moreFilters = catalogRoot.querySelector('[data-more-filters]');
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
  const defaultPriceDetails = new Map(products.map((item) => [item.id, item.priceDetails ?? '']));

  const defaultSortModes = { price: 'price-asc', name: 'name-asc', capability: 'capability-desc' };
  const legacySortModes = { price: 'price-asc', name: 'name-asc', capability: 'capability-desc' };

  function canonicalSortMode(value) {
    const candidate = legacySortModes[value] ?? value;
    return ['price-asc', 'price-desc', 'name-asc', 'name-desc', 'capability-asc', 'capability-desc'].includes(candidate)
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

  function updateFramesetPrices(value) {
    currentBuildAllowance = normalizedBuildAllowance(value);
    if (buildAllowance instanceof HTMLInputElement) buildAllowance.value = String(currentBuildAllowance);
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
        .replace(/Estimated complete adds a fixed ¥[\d,]+ [^.]+\./, `Estimated complete adds ${formatYuan(currentBuildAllowance)} for the selected build.`)
        .replace(/Great-buy reference: below ¥[\d,]+ complete/, item.greatBuyFrameThreshold
          ? `Great-buy reference: below ${formatYuan(Number(item.greatBuyFrameThreshold) + currentBuildAllowance)} complete`
          : 'Great-buy reference: below complete');
    });
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
    setParam(next, 'capability', capability?.value);
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
    return Boolean(activeType || activeBrand || allModelsVisible || search?.value.trim() || price?.value || capability?.value || category?.value || (sort?.value && sort.value !== 'price-asc'));
  }

  function matchesCapability(row, value) {
    if (!value) return true;
    const [kind, threshold] = value.split(':');
    if (kind === 'kind') return row.dataset.capabilityKind === threshold;
    return row.dataset.capabilityKind === kind && Number(row.dataset.capabilitySort || 0) >= Number(threshold || 0);
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

  function rowMatches(row, { capabilityValue = capability?.value ?? '' } = {}) {
    const query = search?.value.trim().toLowerCase() ?? '';
    const maxPrice = Number(price?.value || 0);
    return rowInScope(row) &&
      (!query || row.dataset.search?.includes(query)) &&
      matchesPrimaryContext(row) &&
      (!maxPrice || Number(row.dataset.priceFilter || Infinity) <= maxPrice) &&
      matchesCapability(row, capabilityValue);
  }

  function updateCapabilityAvailability() {
    if (!(capability instanceof HTMLSelectElement)) return false;
    for (const option of [...capability.options]) {
      if (!option.value) {
        option.disabled = false;
        continue;
      }
      option.disabled = !rows.some((row) => matchesPrimaryContext(row) && matchesCapability(row, option.value));
    }
    const selected = capability.selectedOptions[0];
    if (capability.value && selected?.disabled) {
      capability.value = '';
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
      if (key === 'capability') {
        const aValue = Number(a.dataset.capabilitySort || 0);
        const bValue = Number(b.dataset.capabilitySort || 0);
        if (Boolean(aValue) !== Boolean(bValue)) return aValue ? -1 : 1;
        return (aValue - bValue) * multiplier || Number(a.dataset.priceSort || Infinity) - Number(b.dataset.priceSort || Infinity);
      }
      if (key === 'name') return (a.dataset.name ?? '').localeCompare(b.dataset.name ?? '') * multiplier;
      return (Number(a.dataset.priceSort || Infinity) - Number(b.dataset.priceSort || Infinity)) * multiplier;
    });
  }

  function updateCatalog({ historyMode = null } = {}) {
    const capabilityCleared = updateCapabilityAvailability();
    const matching = rows.filter(rowMatches);
    const sortCorrected = updateSortAvailability(matching);
    updateSortHeadings();
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
    if (filterNotice) filterNotice.textContent = capabilityCleared ? ' · incompatible capability cleared' : '';
    if (resultSummary) resultSummary.hidden = !filtered;
    if (empty) empty.hidden = visible !== 0;
    if (reset) reset.hidden = !filtered;
    if (showAllModels instanceof HTMLButtonElement) {
      showAllModels.setAttribute('aria-pressed', String(allModelsVisible));
      showAllModels.textContent = allModelsVisible ? 'Show focused list' : 'Show all models';
    }
    const hasSecondaryFilter = Boolean(price?.value || capability?.value || (sort?.value && sort.value !== 'price-asc'));
    if (hasSecondaryFilter) catalogRoot.querySelector('.filter-bar')?.classList.remove('filters-collapsed');
    if (moreFilters) moreFilters.setAttribute('aria-expanded', String(!catalogRoot.querySelector('.filter-bar')?.classList.contains('filters-collapsed')));
    if (historyMode) updateFilterUrl(historyMode);
    else if (capabilityCleared || sortCorrected) updateFilterUrl('replace');
    else updateModelLinks();
  }

  function validSelectValue(select, value, fallback = '') {
    if (!(select instanceof HTMLSelectElement)) return fallback;
    return [...select.options].some((option) => !option.disabled && option.value === value) ? value : fallback;
  }

  function restoreFromParams(params) {
    const requestedSearch = params.get('q') ?? '';
    const requestedPrice = params.get('max') ?? '';
    const requestedCategory = params.get('category') ?? '';
    const requestedBrand = params.get('brand') ?? '';
    const requestedType = params.get('type') ?? '';
    const requestedCapability = params.get('capability') ?? '';
    const requestedSort = params.get('sort') ?? 'price-asc';
    const requestedBuildAllowance = params.get('build') ?? String(readStoredBuildAllowance() ?? defaultBuildAllowance);
    allModelsVisible = params.get('scope') === 'all';
    if (search) search.value = requestedSearch;
    if (price) price.value = validSelectValue(price, requestedPrice);
    if (category) category.value = validSelectValue(category, requestedCategory);
    updateFramesetPrices(requestedBuildAllowance);
    setBrand(requestedBrand, { update: false });
    setType(requestedType, { update: false });
    if (capability) capability.value = '';
    updateCapabilityAvailability();
    if (capability) {
      capability.value = [...capability.options].some((option) => option.value === requestedCapability) ? requestedCapability : '';
    }
    if (sort) {
      sort.value = canonicalSortMode(requestedSort);
    }
    updateCatalog();
    const capabilityRejected = requestedCapability !== (capability?.value ?? '');
    const corrected = requestedSearch !== (search?.value ?? '') ||
      requestedPrice !== (price?.value ?? '') ||
      requestedCategory !== (category?.value ?? '') ||
      requestedBrand !== activeBrand ||
      requestedType !== activeType ||
      requestedBuildAllowance !== String(currentBuildAllowance) ||
      (params.get('scope') ?? '') !== (allModelsVisible ? 'all' : '') ||
      capabilityRejected ||
      requestedSort !== (sort?.value ?? 'price');
    if (capabilityRejected && filterNotice) filterNotice.textContent = ' · incompatible capability cleared';
    if (corrected) updateFilterUrl('replace');
  }

  search?.addEventListener('input', () => updateCatalog({ historyMode: 'replace' }));
  [price, capability, category, sort].forEach((element) => element?.addEventListener('change', () => updateCatalog({ historyMode: 'push' })));
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
    if (price) price.value = '';
    if (capability) capability.value = '';
    if (category) category.value = '';
    if (sort) sort.value = 'price-asc';
    updateFramesetPrices(defaultBuildAllowance);
    allModelsVisible = false;
    setBrand('', { update: false });
    setType('', { update: false });
    updateCatalog({ historyMode: 'push' });
  });
  moreFilters?.addEventListener('click', () => {
    const bar = catalogRoot.querySelector('.filter-bar');
    const collapsed = bar?.classList.toggle('filters-collapsed') ?? false;
    moreFilters.setAttribute('aria-expanded', String(!collapsed));
  });
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
  const compareBoxes = [...document.querySelectorAll('[data-compare-id]')];
  const comparePanel = catalogRoot.querySelector('[data-inline-compare]');
  const compareContent = catalogRoot.querySelector('[data-compare-content]');
  let selection = readStoredSelection().filter((id) => byId.has(id));

  function syncBoxes() {
    compareBoxes.forEach((box) => {
      const selected = selection.includes(box.dataset.compareId);
      box.checked = selected;
      box.disabled = !selected && selection.length >= 4;
    });
  }

  function renderTray() {
    writeStoredSelection(selection);
    if (compareCount) compareCount.textContent = String(selection.length);
    if (selectionLabel) selectionLabel.textContent = ' selected';
    if (selectionNames) selectionNames.textContent = selection.map((id) => byId.get(id)?.name).filter(Boolean).join(' · ');
    compareTray?.classList.toggle('is-visible', selection.length > 0);
    if (openCompareButton instanceof HTMLButtonElement) {
      openCompareButton.disabled = selection.length < 2;
      openCompareButton.textContent = selection.length < 2 ? 'Select one more' : 'Compare';
    }
    syncBoxes();
    if (selection.length < 2 && comparePanel && !comparePanel.hidden) closeComparison();
  }

  function setSelection(next) {
    selection = [...new Set(next.filter((id) => byId.has(id)))].slice(0, 4);
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
    const image = document.createElement('img');
    image.src = item.image;
    image.alt = item.imageAlt || label;
    image.width = 120;
    image.height = 80;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.dataset.productImage = '';
    image.dataset.fallback = item.imageFallback || (item.type === 'Frame estimate'
      ? catalogRoot.dataset.framesetFallback
      : catalogRoot.dataset.completeBikeFallback);
    if (item.imageRemote) image.referrerPolicy = 'no-referrer';
    enableImageFallback(image);
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
    head.append(image, copy, remove);
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
    const metricFields = metricKinds.map((kind) => {
      const sample = items.find((item) => item.categoryMetricKind === kind);
      return [sample?.categoryMetricLabel ?? 'Category fact', (item) => item.categoryMetricKind === kind
        ? valueCell(item.categoryMetric, item.categoryMetricDetails)
        : valueCell('—')];
    });
    const hasValue = (key) => items.some((item) => item[key] && item[key] !== '—');
    const coreFields = [
      ['Price', (item) => valueCell(item.price, item.priceState)],
      ['Category', (item) => valueCell(item.category)],
      ...metricFields,
      ...(hasValue('drivetrain') ? [['Drivetrain', (item) => valueCell(item.drivetrain, item.drivetrainSubline)]] : []),
      ...(hasValue('weight') ? [['Claimed weight', (item) => valueCell(item.weight, item.weightSubline)]] : []),
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

  const querySelection = (initialParams.get('compare') ?? '').split(',').filter((id) => byId.has(id)).slice(0, 4);
  if (querySelection.length) selection = querySelection;
  renderTray();
  if (querySelection.length >= 2) openComparison({ scroll: false });

  function applyBuildAllowance({ historyMode }) {
    if (!(buildAllowance instanceof HTMLInputElement) || !buildAllowance.value.trim()) return;
    updateFramesetPrices(buildAllowance.value);
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
})();
