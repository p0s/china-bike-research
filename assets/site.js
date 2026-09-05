import { moveSelectionId } from './compare-state.js';
import { COMPARISON_SELECTION_LIMIT, normalizeSelection, numberOrNull, compareNumbers, restoreBuildState, copyText, bindHistoryInput } from './state-utils.js';

(() => {
  const base = document.body.dataset.base ?? '';
  const selectionStorageKey = 'china-bike-guide-selection-v2';
  const comparisonSelectionLimit = COMPARISON_SELECTION_LIMIT;
  const buildAllowanceStorageKey = 'china-bike-guide-build-allowance-v1';
  const themeStorageKey = 'china-bikes-theme-v1';
  const themeModes = ['system', 'light', 'dark'];
  const themeLabels = { system: 'System', light: 'Light', dark: 'Dark' };
  const themeIcons = { system: '◐', light: '☀', dark: '☾' };
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const themeControl = document.querySelector('[data-theme-control]');
  const themeLabel = themeControl?.querySelector('[data-theme-label]');
  const themeIcon = themeControl?.querySelector('[data-theme-icon]');

  function readTheme() {
    try {
      const stored = localStorage.getItem(themeStorageKey);
      return themeModes.includes(stored) ? stored : 'system';
    } catch { return 'system'; }
  }

  let activeTheme = readTheme();

  function applyTheme(mode, { persist = false } = {}) {
    const selected = themeModes.includes(mode) ? mode : 'system';
    activeTheme = selected;
    if (selected === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = selected;
    if (persist) {
      try { localStorage.setItem(themeStorageKey, selected); } catch { /* the selected theme remains active for this page */ }
    }
    const resolved = selected === 'system' ? (systemDark.matches ? 'dark' : 'light') : selected;
    const next = themeModes[(themeModes.indexOf(selected) + 1) % themeModes.length];
    if (themeLabel) themeLabel.textContent = themeLabels[selected];
    if (themeIcon) themeIcon.textContent = themeIcons[selected];
    if (themeControl instanceof HTMLButtonElement) {
      themeControl.setAttribute('aria-label', `Theme: ${themeLabels[selected]}. Switch to ${themeLabels[next].toLowerCase()} theme`);
      themeControl.title = `Theme: ${themeLabels[selected]}`;
    }
    const themeColor = document.querySelector('[data-theme-color]');
    if (themeColor instanceof HTMLMetaElement) themeColor.content = resolved === 'dark' ? '#111512' : '#f7f7f4';
  }

  applyTheme(activeTheme);
  themeControl?.addEventListener('click', () => {
    const current = activeTheme;
    applyTheme(themeModes[(themeModes.indexOf(current) + 1) % themeModes.length], { persist: true });
  });
  const syncSystemTheme = () => { if (activeTheme === 'system') applyTheme('system'); };
  if (typeof systemDark.addEventListener === 'function') systemDark.addEventListener('change', syncSystemTheme);
  else systemDark.addListener?.(syncSystemTheme);
  addEventListener('storage', (event) => {
    if (event.key === themeStorageKey || event.key === null) applyTheme(readTheme());
  });

  function readStoredSelection() {
    try {
      const value = JSON.parse(localStorage.getItem(selectionStorageKey) ?? '[]');
      return normalizeSelection(value);
    } catch { return []; }
  }

  function writeStoredSelection(selection) {
    try { localStorage.setItem(selectionStorageKey, JSON.stringify(selection.slice(0, comparisonSelectionLimit))); } catch { /* selection remains usable for this page */ }
  }

  function writeStoredBuildAllowance(value) {
    try { localStorage.setItem(buildAllowanceStorageKey, String(value)); } catch { /* the URL still carries the selected amount */ }
  }

  function enableImageFailureHandling(image) {
    if (!(image instanceof HTMLImageElement) || image.dataset.imageFailureReady === 'true') return;
    image.dataset.imageFailureReady = 'true';
    const hideUnavailable = () => {
      if (image.hasAttribute('data-gallery-hero')) {
        image.hidden = true;
        image.closest('.model-figure')?.classList.add('is-unavailable');
        const caption = image.closest('[data-image-gallery]')?.querySelector('[data-image-caption-status][data-gallery-caption]');
        if (caption) caption.textContent = 'Source image unavailable. Choose another view or open the source.';
        return;
      }
      if (image.dataset.imageFailureHandled === 'true') return;
      image.dataset.imageFailureHandled = 'true';
      image.removeAttribute('srcset');
      image.removeAttribute('sizes');
      const captionStatus = image.closest('.model-gallery-strip')
        ? null
        : image.closest('.model-figure')?.querySelector('[data-image-caption-status]');
      if (captionStatus instanceof HTMLElement) captionStatus.textContent = 'Source image unavailable';
      const thumb = image.closest('.gallery-thumb');
      if (thumb instanceof HTMLElement) {
        thumb.hidden = true;
        image.remove();
        return; // One failed thumbnail must not hide an otherwise usable gallery.
      }
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
    if (image.hasAttribute('data-gallery-hero')) image.addEventListener('load', () => {
      if (!image.naturalWidth) return;
      image.hidden = false;
      image.closest('.model-figure')?.classList.remove('is-unavailable');
      image.closest('.model-grid')?.classList.remove('has-no-image');
      const gallery = image.closest('[data-image-gallery]');
      const selected = gallery?.querySelector('[data-gallery-thumb][aria-pressed="true"]');
      const caption = gallery?.querySelector('[data-image-caption-status][data-gallery-caption]');
      if (caption && selected) caption.textContent = selected.dataset.galleryCaption ?? '';
    });
    if (image.complete && image.currentSrc && image.naturalWidth === 0) hideUnavailable();
  }
  document.querySelectorAll('[data-product-image]').forEach(enableImageFailureHandling);

  document.querySelectorAll('[data-image-gallery]').forEach((gallery) => {
    const hero = gallery.querySelector('[data-gallery-hero]');
    const caption = gallery.querySelector('[data-image-caption-status][data-gallery-caption]');
    const sourceLink = gallery.querySelector('[data-gallery-source-link]');
    const buttons = [...gallery.querySelectorAll('[data-gallery-thumb]')];
    if (!(hero instanceof HTMLImageElement) || !buttons.length) return;

    const selectImage = (button) => {
      if (!(button instanceof HTMLButtonElement) || button.hidden) return;
      if (button.getAttribute('aria-pressed') === 'true' && !hero.hidden) return;
      const nextSrc = button.dataset.gallerySrc;
      if (!nextSrc) return;
      // One synchronous selection: rapid clicks cannot enqueue stale images.
      hero.removeAttribute('srcset');
      hero.removeAttribute('sizes');
      hero.alt = button.dataset.galleryAlt ?? '';
      if (button.dataset.galleryRemote === 'true') hero.referrerPolicy = 'no-referrer';
      else hero.removeAttribute('referrerpolicy');
      if (caption instanceof HTMLElement) caption.textContent = button.dataset.galleryCaption ?? '';
      if (sourceLink instanceof HTMLAnchorElement) {
        const href = button.dataset.gallerySource;
        sourceLink.hidden = !href;
        if (href) sourceLink.href = href;
      }
      buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      hero.src = nextSrc;
    };

    buttons.forEach((button) => {
      button.addEventListener('click', () => selectImage(button));
      button.addEventListener('keydown', (event) => {
        const visible = buttons.filter((item) => !item.hidden && !item.disabled);
        const index = visible.indexOf(button);
        if (index < 0 || !visible.length) return;
        const offsets = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        let nextIndex;
        if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = visible.length - 1;
        else if (offsets[event.key] !== undefined) nextIndex = (index + offsets[event.key] + visible.length) % visible.length;
        else return;
        event.preventDefault();
        visible[nextIndex].focus();
        selectImage(visible[nextIndex]);
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
    const returnSelection = validatedReturnTarget?.searchParams.get('compare');
    let modelSelection = returnSelection !== undefined && returnSelection !== null
      ? normalizeSelection(returnSelection) : readStoredSelection();
    const renderModelCompare = () => {
      const selected = modelSelection.includes(productId);
      modelCompareButton.setAttribute('aria-pressed', String(selected));
      modelCompareButton.textContent = selected ? 'Added to comparison' : modelSelection.length >= comparisonSelectionLimit ? 'Comparison is full' : 'Add to comparison';
      modelCompareButton.disabled = !selected && modelSelection.length >= comparisonSelectionLimit;
      modelCompareButton.setAttribute('aria-label', selected ? `Remove ${productName} from comparison` : `Add ${productName} to comparison`);
      if (modelCompareLink instanceof HTMLAnchorElement) {
        const target = validatedReturnTarget ? new URL(validatedReturnTarget.href) : new URL(`${base}/`, location.origin);
        target.searchParams.delete('compare');
        if (modelSelection.length) target.searchParams.set('compare', modelSelection.join(','));
        target.hash = modelSelection.length >= 2 ? 'compare' : 'catalog';
        modelCompareLink.href = `${target.pathname}${target.search}${target.hash}`;
        modelCompareLink.textContent = modelSelection.length >= 2 ? 'Compare selected bikes' : 'Choose another bike';
      }
    };
    modelCompareButton.addEventListener('click', () => {
      modelSelection = modelSelection.includes(productId)
        ? modelSelection.filter((id) => id !== productId)
        : [...modelSelection, productId].slice(0, comparisonSelectionLimit);
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
    const raw = numberOrNull(requested) ?? defaultAllowance;
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
  const defaultBuildPreset = buildPreset instanceof HTMLSelectElement ? buildPreset.value : '';
  let currentBuildAllowance = defaultBuildAllowance;
  let currentBuildPreset = defaultBuildPreset;
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
    const number = numberOrNull(value);
    if (number === null) return defaultBuildAllowance;
    return Math.min(100000, Math.max(0, Math.round(number)));
  }

  function syncBuildPreset() {
    if (!(buildPreset instanceof HTMLSelectElement)) return;
    const options = [...buildPreset.options];
    const current = options.find((option) => option.value === currentBuildPreset);
    const fixed = options.find((option) => option.dataset.buildAmount !== undefined && Number(option.dataset.buildAmount) === currentBuildAllowance);
    const custom = options.find((option) => option.value === 'custom');
    const selected = current && (current.dataset.buildManual === 'true' || current.value === 'custom')
      ? current
      : fixed ?? custom;
    buildPreset.value = selected?.value ?? '';
    currentBuildPreset = buildPreset.value;
    const requiresInput = selected?.dataset.buildManual === 'true' || selected?.value === 'custom';
    if (buildCustom instanceof HTMLElement) buildCustom.hidden = !requiresInput;
    if (buildAllowance instanceof HTMLInputElement) {
      const planLabel = selected?.textContent?.replace(/\s+·.*$/, '').trim() || 'Custom';
      buildAllowance.setAttribute('aria-label', `${planLabel} total remaining-build allowance in yuan`);
    }
  }

  function highlightBuildPrices() {
    catalogRoot.classList.remove('is-build-updating');
    requestAnimationFrame(() => catalogRoot.classList.add('is-build-updating'));
    window.clearTimeout(buildHighlightTimer);
    buildHighlightTimer = window.setTimeout(() => catalogRoot.classList.remove('is-build-updating'), 220);
  }

  function updateFramesetPrices(value, { highlight = false, presetId } = {}) {
    if (presetId !== undefined) currentBuildPreset = presetId;
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
    setParam(next, 'buildPreset', currentBuildPreset, defaultBuildPreset);
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
    return Boolean(activeType || activeBrand || allModelsVisible || currentBuildPreset !== defaultBuildPreset || currentBuildAllowance !== defaultBuildAllowance || search?.value.trim() || price?.value || tire?.value || (tire?.value && tireUnknown?.checked) || completeWeight?.value || frameWeight?.value || drivetrainFilter?.value.trim() || frameFilter?.value.trim() || categoryMinimum?.value || category?.value || (sort?.value && sort.value !== 'price-asc'));
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
    const byName = (a, b) => (a.dataset.name ?? '').localeCompare(b.dataset.name ?? '');
    return [...items].sort((a, b) => {
      if (key === 'name') return byName(a, b) * (direction === 'desc' ? -1 : 1);
      const field = key === 'tire' ? 'tireClearanceSort' : key === 'capability' ? 'capabilitySort' : 'priceSort';
      const value = (row) => key === 'price' || Number(row.dataset[field]) > 0 ? row.dataset[field] : null;
      return compareNumbers(value(a), value(b), direction)
        || (key === 'price' ? 0 : compareNumbers(a.dataset.priceSort, b.dataset.priceSort))
        || byName(a, b);
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
    const matchingSet = new Set(matching);
    const existingOrder = [...(productList?.querySelectorAll(':scope > [data-product-row]') ?? [])];
    const alreadyOrdered = ordered.every((row, index) => existingOrder[index] === row);
    let visible = 0;
    ordered.forEach((row) => {
      const matches = matchingSet.has(row);
      row.hidden = !matches;
      if (matches) visible += 1;
      if (!alreadyOrdered) productList?.insertBefore(row, empty);
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
    const requestedBuildAllowance = params.get('build') ?? String(defaultBuildAllowance);
    const requestedBuildPreset = validSelectValue(buildPreset, params.get('buildPreset') ?? defaultBuildPreset, defaultBuildPreset);
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
    updateFramesetPrices(requestedBuildAllowance, { presetId: requestedBuildPreset });
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
      (params.get('buildPreset') ?? defaultBuildPreset) !== currentBuildPreset ||
      (params.get('scope') ?? '') !== (allModelsVisible ? 'all' : '') ||
      Boolean(legacyCapability) ||
      requestedSort !== (sort?.value ?? 'price');
    if (corrected) updateFilterUrl('replace');
  }

  const typedInputs = [search, price, tire, completeWeight, frameWeight, drivetrainFilter, frameFilter, categoryMinimum];
  typedInputs.forEach((element) => bindHistoryInput(element, (historyMode) => updateCatalog({ historyMode })));
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
    updateFramesetPrices(defaultBuildAllowance, { highlight: true, presetId: defaultBuildPreset });
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
    const params = new URLSearchParams(location.search);
    const ids = normalizeSelection(params.get('compare'), { validIds: byId });
    selection = ids;
    if (comparePanel) comparePanel.hidden = ids.length < 2;
    compareTray?.classList.toggle('is-comparing', ids.length >= 2);
    renderTray();
    if (ids.length >= 2) renderComparison();
    updateModelLinks();
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
    selection = normalizeSelection(next, { validIds: byId });
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

  function moveComparison(item, offset, direction) {
    const next = moveSelectionId(selection, item.id, offset);
    if (next.every((id, index) => id === selection[index])) return;
    setSelection(next);
    requestAnimationFrame(() => {
      const control = compareContent?.querySelector(`[data-move-compare="${CSS.escape(item.id)}"][data-direction="${direction}"]`);
      if (control instanceof HTMLButtonElement && !control.disabled) control.focus({ preventScroll: true });
      else compareContent?.querySelector(`[data-move-compare="${CSS.escape(item.id)}"]:not(:disabled)`)?.focus({ preventScroll: true });
    });
  }

  function productHeader(item, index, total) {
    const head = element('div', 'compare-product-head');
    const label = [item.brand, item.name].filter(Boolean).join(' ');
    const copy = element('div');
    const title = item.url ? element('a', '', label) : element('span', '', label);
    if (item.url) {
      const target = new URL(item.url, location.origin);
      target.searchParams.set('from', `${location.pathname}${location.search}#catalog`);
      setParam(target, 'build', String(currentBuildAllowance), String(defaultBuildAllowance));
      title.href = `${target.pathname}${target.search}`;
    }
    const type = element('span', '', item.type);
    const orderControls = element('div', 'compare-order-controls');
    orderControls.setAttribute('role', 'group');
    orderControls.setAttribute('aria-label', `Reorder ${label}`);
    const moveLeft = element('button', 'compare-move', '←');
    moveLeft.type = 'button';
    moveLeft.disabled = index === 0;
    moveLeft.dataset.moveCompare = item.id;
    moveLeft.dataset.direction = 'left';
    moveLeft.setAttribute('aria-label', `Move ${label} left`);
    moveLeft.title = 'Move left';
    moveLeft.addEventListener('click', () => moveComparison(item, -1, 'left'));
    const moveRight = element('button', 'compare-move', '→');
    moveRight.type = 'button';
    moveRight.disabled = index === total - 1;
    moveRight.dataset.moveCompare = item.id;
    moveRight.dataset.direction = 'right';
    moveRight.setAttribute('aria-label', `Move ${label} right`);
    moveRight.title = 'Move right';
    moveRight.addEventListener('click', () => moveComparison(item, 1, 'right'));
    orderControls.append(moveLeft, moveRight);
    copy.append(title, type, orderControls);
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
      items.forEach((item, index) => grid.append(productHeader(item, index, items.length)));
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
    const orderHint = element('p', 'compare-order-hint', 'Use the arrow controls to reorder columns. The comparison link keeps this order.');
    compareContent.replaceChildren(context, orderHint, comparisonGrid(items, coreFields, true));
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
    if (scroll) comparePanel.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
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

  const querySelection = normalizeSelection(initialParams.get('compare'), { validIds: byId });
  if (initialParams.has('compare')) selection = querySelection;
  renderTray();
  if (querySelection.length >= 2) openComparison({ scroll: false });

  function applyBuildAllowance({ historyMode }) {
    if (!(buildAllowance instanceof HTMLInputElement) || !buildAllowance.value.trim()) return false;
    updateFramesetPrices(buildAllowance.value, { highlight: true });
    writeStoredBuildAllowance(currentBuildAllowance);
    updateCatalog({ historyMode });
    if (comparePanel && !comparePanel.hidden && selection.length >= 2) renderComparison();
  }

  bindHistoryInput(buildAllowance, (historyMode, event) => {
    if (event.type === 'change' && buildAllowance instanceof HTMLInputElement && !buildAllowance.value.trim()) {
      buildAllowance.value = String(defaultBuildAllowance);
    }
    return applyBuildAllowance({ historyMode });
  });
  buildPreset?.addEventListener('change', () => {
    if (!(buildPreset instanceof HTMLSelectElement)) return;
    const selected = buildPreset.selectedOptions[0];
    currentBuildPreset = selected?.value ?? defaultBuildPreset;
    const hasFixedAmount = selected?.dataset.buildAmount !== undefined;
    const amount = hasFixedAmount ? Number(selected.dataset.buildAmount) : Number.NaN;
    if (!hasFixedAmount || !Number.isFinite(amount)) {
      syncBuildPreset();
      updateCatalog({ historyMode: 'push' });
      if (buildAllowance instanceof HTMLInputElement) {
        buildAllowance.focus({ preventScroll: true });
        buildAllowance.select();
      }
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
  const packageWeightField = document.createElement('label');
  packageWeightField.className = 'builder-package-weight';
  const packageLabel = document.createElement('span');
  packageLabel.textContent = 'Fork + remaining frame-package weight (g)';
  const packageWeight = document.createElement('input');
  packageWeight.type = 'number';
  packageWeight.min = '0';
  packageWeight.step = 'any';
  packageWeight.placeholder = 'Unknown';
  packageWeight.dataset.buildPackageWeight = '';
  packageWeight.setAttribute('aria-label', 'Fork and remaining frame-package weight in grams');
  const packageNote = document.createElement('small');
  packageNote.textContent = 'Enter the fork, seatpost and frame hardware not included in the recorded frame weight. Do not count parts already weighed below.';
  packageWeightField.append(packageLabel, packageWeight, packageNote);
  baseCustom?.append(packageWeightField);

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

  const firstBaseId = data.bases[0]?.id || '';
  let state = restoreBuildState(data, new URLSearchParams(location.search), readStoredState());

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
    return id && !['custom', 'included', 'in-base'].includes(id) ? parts.get(id) || null : null;
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
    const drivetrain = selectedPart('drivetrain');
    const layout = drivetrain?.compatibility?.drivetrain_layout
      || (state.selections.drivetrain === 'included' ? base.drivetrainLayout : null);
    const limits = base.tireClearanceByDrivetrain;
    const recordedLimits = limits ? [limits.single, limits.double].filter((value) => numberOrNull(value) !== null) : [];
    const clearanceLimit = limits
      ? (layout ? numberOrNull(limits[layout]) : recordedLimits.length ? Math.min(...recordedLimits) : null)
      : numberOrNull(base.tireClearanceMm);
    if (limits && !layout) messages.push(`Confirm drivetrain: tire limits are ${limits.single ?? 'unknown'}/${limits.double ?? 'unknown'} mm (1×/2×). The smallest recorded limit is a warning threshold, not proof of fit for an unknown layout.`);
    if (tires && clearanceLimit === null) messages.push('Tire clearance for the selected frame and drivetrain is not recorded; confirm it before buying.');
    if (tires && Number.isFinite(tireWidth) && Number.isFinite(clearanceLimit) && tireWidth > clearanceLimit) {
      messages.push(`${tireWidth} mm tires exceed the frame's published ${clearanceLimit} mm limit${layout ? ` for ${layout === 'single' ? '1×' : '2×'}` : ''}.`);
    }
    const wheelset = covered.has('wheelset') ? null : selectedPart('wheelset');
    const rotors = covered.has('rotors') ? null : selectedPart('rotors');
    const rotorMount = rotors?.compatibility?.rotor_mount;
    const hubMount = wheelset?.compatibility?.rotor_mount;
    if (rotorMount && hubMount && rotorMount !== hubMount) {
      messages.push(`Rotors use ${rotorMount}, but the wheelset lists ${hubMount}; confirm a compatible rotor or explicitly supported adapter.`);
    }
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
      ['baseWeight', state.baseCustom.weight, numberOrNull(base?.baseWeightG)],
      ['packageWeight', state.baseCustom.packageWeight, base?.kind === 'complete-bike' ? 0 : null]
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
        const relevant = !['included', 'in-base'].includes(selection) && (field === 'removed' ? base?.kind === 'complete-bike' : selection === 'custom' || recordedValue === null);
        if (relevant && value !== '') target.searchParams.set(key, value);
        else target.searchParams.delete(key);
      }
    }
    try { history[historyMode === 'push' ? 'pushState' : 'replaceState'](null, '', `${target.pathname}${target.search}${target.hash}`); } catch { /* normal navigation origin required */ }
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
      base.tireClearanceLabel ? `${base.tireClearanceLabel} tire clearance` : base.tireClearanceMm ? `${base.tireClearanceMm} mm tire clearance` : 'tire clearance unknown',
      base.included.length ? base.included.join(', ') : 'package contents incomplete',
      base.priceNote || '',
      base.weightBasis || ''
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
    if (baseWeightField?.firstChild?.nodeType === Node.TEXT_NODE) baseWeightField.firstChild.textContent = isComplete ? 'Base bike weight g' : 'Frame-only weight g';
    if (basePriceField instanceof HTMLElement) basePriceField.hidden = recordedBasePriceLow !== null;
    if (baseWeightField instanceof HTMLElement) baseWeightField.hidden = recordedBaseWeight !== null;
    packageWeightField.hidden = isComplete;
    packageWeight.value = state.baseCustom.packageWeight;
    if (baseCustom instanceof HTMLElement) baseCustom.hidden = isComplete && recordedBasePriceLow !== null && recordedBaseWeight !== null;

    let priceLow = basePriceLow ?? 0;
    let priceHigh = basePriceHigh ?? priceLow;
    let knownWeight = baseWeightValue ?? 0;
    const missingPrices = [];
    const missingWeights = [];
    if (basePriceLow === null) missingPrices.push(isComplete ? 'base bike' : 'frameset');
    if (baseWeightValue === null) missingWeights.push(isComplete ? 'base bike' : 'frameset');
    if (!isComplete) {
      const remainder = numberOrNull(state.baseCustom.packageWeight);
      if (remainder === null) missingWeights.push('fork / frame package remainder');
      else knownWeight += remainder;
    }
    let removedWeightTotal = 0;
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
        let inBaseOption = select.querySelector('option[value="in-base"]');
        if (!inBaseOption) {
          inBaseOption = document.createElement('option');
          inBaseOption.value = 'in-base';
          inBaseOption.textContent = 'In frameset package · buyer confirmed';
          select.append(inBaseOption);
        }
        inBaseOption.hidden = isComplete;
        inBaseOption.disabled = isComplete;
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

      const isIncluded = isComplete ? state.selections[slot] === 'included' : state.selections[slot] === 'in-base';
      row.classList.toggle('is-included', isIncluded);
      if (isIncluded) {
        if (customValues instanceof HTMLElement) customValues.hidden = true;
        setPartFacts(row, isComplete
          ? { price: 'Included', weight: 'In base weight', basis: 'Included in the complete-bike package' }
          : { price: 'In base price', weight: 'In frame-package weight', basis: 'Buyer confirmed this part is included. Include its weight in the frame-package remainder above, not twice here.' });
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
          removedWeightTotal += removedPartWeight;
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
            isComplete && part.covers?.length ? `Removed weight must include the entire replaced package: ${[slot, ...part.covers].join(', ')}` : '',
            part.note || '',
          ].filter(Boolean).join(' · ');
      setPartFacts(row, {
        price: partPrice === null ? '—' : formatYuan(partPrice),
        weight: weightDisplay,
        basis,
        source: isCustom ? null : part.source,
      });
    }

    const impossibleWeight = isComplete && baseWeightValue !== null && removedWeightTotal > baseWeightValue;
    if (impossibleWeight) missingWeights.push('inconsistent removed-part weights');
    if (totalPrice) totalPrice.textContent = missingPrices.length
      ? `${formatPriceRange(priceLow, priceHigh)} known + ${missingPrices.length} unknown`
      : formatPriceRange(priceLow, priceHigh);
    if (totalWeight) totalWeight.textContent = impossibleWeight ? 'Check removed-part weights' : missingWeights.length
      ? `${formatWeight(knownWeight)} ${isComplete ? 'base / known deltas' : 'known'} + ${missingWeights.length} unknown`
      : formatWeight(knownWeight);
    if (completeness) completeness.textContent = missingPrices.length || missingWeights.length
      ? `${isComplete ? 'Purchase total' : 'Complete price'} needs ${missingPrices.length} more input${missingPrices.length === 1 ? '' : 's'}; ${isComplete ? 'projected weight' : 'complete weight'} needs ${missingWeights.length} more input${missingWeights.length === 1 ? '' : 's'}.`
      : isComplete ? 'Purchase price and every replacement weight delta are resolved.' : 'Every required slot has a price and weight.';

    const conflicts = compatibilityMessages(base, covered);
    if (impossibleWeight && completeness) completeness.textContent += ' Removed parts exceed the whole-bike weight; check units and avoid counting removed components twice.';
    if (compatibility instanceof HTMLElement) {
      compatibility.classList.toggle('has-conflicts', conflicts.length > 0);
      compatibility.replaceChildren();
      if (conflicts.length) {
        const heading = document.createElement('strong');
        heading.textContent = 'Check compatibility';
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
    state.baseCustom = { price: '', weight: '', packageWeight: '' };
    for (const custom of Object.values(state.custom)) custom.removedWeight = '';
    if (previous?.kind !== next?.kind) {
      state.selections = defaultSelections(next);
      state.custom = Object.fromEntries(slots.map((slot) => [slot, { price: '', weight: '', removedWeight: '' }]));
    }
    render({ historyMode: 'push' });
  });
  bindHistoryInput(packageWeight, (historyMode) => {
    state.baseCustom.packageWeight = packageWeight.value;
    render({ historyMode });
  });
  bindHistoryInput(basePrice, (historyMode) => {
    if (basePrice instanceof HTMLInputElement) state.baseCustom.price = basePrice.value;
    render({ historyMode });
  });
  bindHistoryInput(baseWeight, (historyMode) => {
    if (baseWeight instanceof HTMLInputElement) state.baseCustom.weight = baseWeight.value;
    render({ historyMode });
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
    bindHistoryInput(customPrice, (historyMode) => {
      if (customPrice instanceof HTMLInputElement) state.custom[slot].price = customPrice.value;
      render({ historyMode });
    });
    bindHistoryInput(customWeight, (historyMode) => {
      if (customWeight instanceof HTMLInputElement) state.custom[slot].weight = customWeight.value;
      render({ historyMode });
    });
    bindHistoryInput(removedWeight, (historyMode) => {
      if (removedWeight instanceof HTMLInputElement) state.custom[slot].removedWeight = removedWeight.value;
      render({ historyMode });
    });
  });

  root.querySelector('[data-build-copy]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const copied = await copyText(location.href);
    const status = document.querySelector('#copy-status');
    if (status) status.textContent = copied ? 'Build link copied.' : 'Copy failed. Copy the address bar link manually.';
    if (button instanceof HTMLButtonElement) {
      const original = button.dataset.copyIdleLabel ?? button.textContent;
      button.dataset.copyIdleLabel = original;
      clearTimeout(Number(button.dataset.copyTimer));
      button.textContent = copied ? 'Copied' : 'Copy failed';
      button.dataset.copyTimer = String(setTimeout(() => { button.textContent = original; }, 1200));
    }
  });
  root.querySelector('[data-build-reset]')?.addEventListener('click', () => {
    state.baseId = firstBaseId;
    state.selections = defaultSelections(bases.get(firstBaseId));
    state.custom = Object.fromEntries(slots.map((slot) => [slot, { price: '', weight: '', removedWeight: '' }]));
    state.baseCustom = { price: '', weight: '', packageWeight: '' };
    try { localStorage.removeItem(storageKey); } catch { /* URL still resets */ }
    render({ historyMode: 'push' });
  });

  addEventListener('popstate', () => {
    state = restoreBuildState(data, new URLSearchParams(location.search), {}, { allowStored: false });
    render();
  });

  render();
})();
