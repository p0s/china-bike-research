import { normalizeMaterialSearch, createCatalogSearchIndex, compileCatalogQuery, scoreCatalogSearch } from './catalog-search.js';
import { initArticleVideos } from './article-video.js';
import { translate } from './i18n.js';
import { moveSelectionId } from './compare-state.js';
import { PRICE_MARKETS, PRICE_CURRENCIES, resolveDestination, validCountry, defaultCurrency, convertPrice, formatMoneyRange, formatRequestedBudget, regionalPrice, countryName } from './regional-prices.js';
import { priceDisplay, deliveredLine, pricePopoverLines, compactPriceBasis } from './price-display.js';
import { clearanceParts, weightParts, catalogClearance } from './catalog-format.js';
import { COMPARISON_SELECTION_LIMIT, normalizeSelection, numberOrNull, compareNumbers, restoreBuildState, isExplicitBuildUrl, copyText, bindHistoryInput, regionalHold, regionalHoldBlocks, writeRegionalHold, BUDGET_KEYS, buildCurrencies, moneyInputParam } from './state-utils.js';
import { createActionDispatcher } from './action-dispatch.js';
// Privacy tools may block the optional analytics module. Catalog behavior must
// still initialize when that happens.
const { sendComparisonOpenedEvent, sendProductOutboundClickEvent } = createActionDispatcher();
// Manual shopping choices from the catalog; the Build planner reads only its display currency.
const deliveryPreferenceStorageKey = 'china-bikes-delivery-preference-v1';

(async () => {
  const base = document.body.dataset.base ?? '';
  const locale = document.documentElement.lang;
  initArticleVideos();
  // Native open disclosures keep evidence readable without JavaScript. Enhance
  // them to compact panels, then open the complete ancestor chain for deep links.
  const sourceRecords = document.querySelector('#source-records');
  if (sourceRecords instanceof HTMLDetailsElement) sourceRecords.open = false;
  const stickyHeader = document.querySelector('.site-header');
  const updateHeaderOffset = () => document.documentElement.style.setProperty(
    '--sticky-header-offset', `${(stickyHeader?.getBoundingClientRect().height ?? 60) + 16}px`);
  updateHeaderOffset();
  if (stickyHeader && typeof ResizeObserver !== 'undefined') new ResizeObserver(updateHeaderOffset).observe(stickyHeader);
  const openFragment = (hash, focus = false) => {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const target = id ? document.getElementById(id) : null;
    if (!sourceRecords || !target) return;
    const disclosures = [];
    for (let node = target; node; node = node.parentElement) {
      if (node instanceof HTMLDetailsElement) disclosures.push(node);
    }
    // Ordinary fragments keep the browser's focus and tab-navigation behavior.
    if (!disclosures.length) return;
    disclosures.forEach((node) => { node.open = true; });
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      if (focus && target instanceof HTMLDetailsElement) target.querySelector('summary')?.focus({ preventScroll: true });
    });
    return true;
  };
  if (location.hash) openFragment(location.hash);
  addEventListener('hashchange', () => openFragment(location.hash));
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest('a[href]');
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || (anchor.target && anchor.target !== '_self')) return;
    const destination = new URL(anchor.href, location.href);
    if (destination.origin === location.origin && destination.pathname === location.pathname && destination.search === location.search && destination.hash && openFragment(destination.hash, true)) {
      // Handle activation once: the native default would queue a second open
      // through hashchange and could undo an intervening explicit close.
      event.preventDefault();
      if (destination.hash !== location.hash) history.pushState(history.state, '', destination.href);
    }
  });
  document.addEventListener('click', (event) => {
    if (!(event instanceof MouseEvent) || !event.isTrusted || event.button !== 0) return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[data-analytics-action="product_outbound_click"]');
    if (!link) return;
    sendProductOutboundClickEvent(link.dataset.analyticsOffer
      ? { offerId: link.dataset.analyticsOffer } : { sourceId: link.dataset.analyticsSource });
  });
  // A language change retains the current filter/comparison/builder state in the URL.
  document.querySelectorAll('[data-language-switch]').forEach((link) => {
    const syncLanguageLink = () => {
      const target = new URL(link.href, location.href);
      target.search = location.search;
      target.hash = location.hash;
      link.href = target.href;
    };
    link.addEventListener('pointerdown', syncLanguageLink);
    link.addEventListener('focus', syncLanguageLink);
    link.addEventListener('click', syncLanguageLink);
  });
  // Static HTML is already localized. This only handles text created by interactions.
  if (locale && locale !== 'en') {
    const translateNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.parentElement?.closest('script,style,code,textarea,[data-original-language],[data-localized-caption]')) return;
        const translated = translate(node.nodeValue, locale);
        if (translated !== node.nodeValue) node.nodeValue = translated;
        return;
      }
      if (!(node instanceof Element) || node.matches('script,style,code,textarea,[data-original-language],[data-localized-caption]')) return;
      for (const attribute of ['aria-label', 'title', 'placeholder', 'alt']) {
        if (!node.hasAttribute(attribute)) continue;
        const value = node.getAttribute(attribute);
        const translated = translate(value, locale);
        if (translated !== value) node.setAttribute(attribute, translated);
      }
      node.childNodes.forEach(translateNode);
    };
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') mutation.addedNodes.forEach(translateNode);
        else translateNode(mutation.target);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder', 'alt'] });
  }
  function revealEvidenceTarget() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    let detail = target?.closest('details');
    while (detail) { detail.open = true; detail = detail.parentElement?.closest('details'); }
  }
  addEventListener('hashchange', revealEvidenceTarget);
  revealEvidenceTarget();
  const selectionStorageKey = 'china-bike-guide-selection-v2';
  const comparisonSelectionLimit = COMPARISON_SELECTION_LIMIT;
  const buildAllowanceStorageKey = 'china-bike-guide-build-allowance-v1';
  const themeStorageKey = 'china-bikes-theme-v1';
  const themeModes = ['light', 'dark'];
  const themeLabels = { light: 'Light', dark: 'Dark' };
  const themeIcons = { light: '☀', dark: '☾' };
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
    const next = resolved === 'light' ? 'dark' : 'light';
    if (themeLabel) themeLabel.textContent = translate(themeLabels[resolved], locale);
    if (themeIcon) themeIcon.textContent = themeIcons[resolved];
    if (themeControl instanceof HTMLButtonElement) {
      themeControl.setAttribute('aria-label', translate(`Theme: ${themeLabels[resolved]}. Switch to ${themeLabels[next].toLowerCase()} theme`, locale));
      themeControl.title = translate(`Theme: ${themeLabels[resolved]}`, locale);
    }
    const themeColor = document.querySelector('[data-theme-color]');
    if (themeColor instanceof HTMLMetaElement) themeColor.content = resolved === 'dark' ? '#111512' : '#f7f7f4';
  }

  applyTheme(activeTheme);
  themeControl?.addEventListener('click', () => {
    const current = activeTheme === 'system' ? (systemDark.matches ? 'dark' : 'light') : activeTheme;
    applyTheme(current === 'light' ? 'dark' : 'light', { persist: true });
  });
  const syncSystemTheme = () => { if (activeTheme === 'system') applyTheme('system'); };
  if (typeof systemDark.addEventListener === 'function') systemDark.addEventListener('change', syncSystemTheme);
  else systemDark.addListener?.(syncSystemTheme);
  addEventListener('storage', (event) => {
    if (event.key === themeStorageKey) applyTheme(event.newValue);
    else if (event.key === null) applyTheme('system');
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
        if (caption) caption.textContent = translate('Source image unavailable. Choose another view or open the source.', locale);
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
  document.querySelectorAll('[data-product-image], .product-image img, .gallery-thumb img, .gallery-all-images img, .credit-image img').forEach(enableImageFailureHandling);

  document.querySelectorAll('[data-blog-header-image], [data-blog-bike-image], [data-blog-mascot]').forEach((image) => {
    const hideUnavailable = () => {
      image.hidden = true;
      if (image.hasAttribute('data-blog-header-image')) {
        const header = image.closest('.illustrated-header');
        if (header) header.hidden = true;
      }
      if (image.hasAttribute('data-blog-bike-image')) {
        image.closest('.blog-photo-scene')?.classList.add('is-unavailable');
        const status = image.closest('[data-blog-photo]')?.querySelector('[data-blog-photo-status]');
        if (status) status.hidden = false;
      }
    };
    image.addEventListener('error', hideUnavailable);
    if (image.complete && image.currentSrc && !image.naturalWidth) hideUnavailable();
  });

  document.querySelectorAll('[data-image-gallery]').forEach((gallery) => {
    const hero = gallery.querySelector('[data-gallery-hero]');
    const caption = gallery.querySelector('[data-image-caption-status][data-gallery-caption]');
    const sourceLink = gallery.querySelector('[data-gallery-source-link]');
    const note = gallery.querySelector('[data-gallery-note-text]');
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
      if (note instanceof HTMLElement) {
        note.textContent = button.dataset.galleryNote ?? '';
        note.hidden = !note.textContent;
      }
      if (sourceLink instanceof HTMLAnchorElement) {
        const href = button.dataset.gallerySource;
        sourceLink.hidden = !href;
        if (href) sourceLink.href = href;
      }
      buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      button.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
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
  const tooltipButtons = [...document.querySelectorAll('[data-tooltip-lines], [data-price-details]')];
  const priceTooltipContent = new Map();
  const precisePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let activeTooltipButton = null;
  let tooltipPinned = false;
  let tooltipFocusSuppressed = false;
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
      if (tooltipPanel instanceof HTMLElement && (tooltipPanel.matches(':hover') || tooltipPanel.contains(document.activeElement))) return;
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
    try {
      lines = button.hasAttribute('data-price-details')
        ? priceTooltipContent.get(button.closest('[data-product-row]')?.dataset.id || button.dataset.priceDetails)
          ?? (/^\d{4}-\d{2}-\d{2}$/.test(button.dataset.priceDetails) ? [translate(`Price observed ${button.dataset.priceDetails}.`, locale)] : [])
        : JSON.parse(button.dataset.tooltipLines ?? '[]');
    } catch { lines = []; }
    if (!Array.isArray(lines) || (!lines.length && !button.dataset.evidenceHref)) return;
    if (activeTooltipButton && activeTooltipButton !== button) closeTooltip();
    tooltipPanel.replaceChildren(...lines.map((line) => {
      const span = document.createElement('span');
      span.textContent = String(line);
      return span;
    }));
    if (button.dataset.evidenceHref) {
      const link = document.createElement('a');
      link.href = button.dataset.evidenceHref;
      link.textContent = translate(button.dataset.evidenceLabel || 'Full evidence', locale);
      tooltipPanel.append(link);
    }
    tooltipPanel.setAttribute('role', button.dataset.evidenceHref ? 'dialog' : 'tooltip');
    if (button.dataset.evidenceHref) tooltipPanel.setAttribute('aria-label', button.getAttribute('aria-label') || translate('Price details', locale));
    else tooltipPanel.removeAttribute('aria-label');
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

  function bindTooltip(button) {
    button.addEventListener('mouseenter', () => {
      if (precisePointer.matches && !tooltipPinned) openTooltip(button);
    });
    button.addEventListener('mouseleave', () => {
      if (precisePointer.matches && activeTooltipButton === button && !tooltipPinned) scheduleTooltipClose();
    });
    button.addEventListener('focus', () => requestAnimationFrame(() => {
      if (!tooltipFocusSuppressed && document.activeElement === button && button.matches(':focus-visible') && activeTooltipButton !== button) openTooltip(button);
    }));
    button.addEventListener('blur', () => requestAnimationFrame(() => {
      if (activeTooltipButton === button && document.activeElement !== button && !(tooltipPanel instanceof HTMLElement && (tooltipPanel.matches(':hover') || tooltipPanel.contains(document.activeElement)))) closeTooltip();
    }));
    button.addEventListener('click', () => toggleTooltip(button));
  }
  tooltipButtons.forEach(bindTooltip);

  tooltipPanel?.addEventListener('mouseenter', cancelTooltipDismiss);
  tooltipPanel?.addEventListener('mouseleave', scheduleTooltipClose);
  tooltipPanel?.addEventListener('pointerdown', (event) => { if (!event.target.closest('a')) event.preventDefault(); });
  tooltipPanel?.addEventListener('focusout', () => requestAnimationFrame(() => { if (!tooltipPanel.contains(document.activeElement) && document.activeElement !== activeTooltipButton) closeTooltip(); }));
  // One shared, pointer-transparent layer shows a large uncropped photo beside
  // the hovered or focused thumbnail. The row and its link never change size,
  // so neighbouring facts stay put and remain reachable.
  const imagePreviewSources = new Map(); // row id -> largest reviewed derivative
  let activeImagePreview = null;
  let pendingImagePreviewFocus = null;
  let imagePreviewVersion = 0;
  let imagePreviewLayer = null;
  let imagePreviewTimer = null;
  let lastImagePreviewScroll = -Infinity;
  const imagePreviewLinks = () => document.querySelectorAll('.catalog-row .product-image-link, .curated-group .product-image-link');
  function previewSource(link, image) {
    const id = link.dataset.imagePreviewId || link.closest?.('[data-product-row]')?.dataset.id;
    return (id && imagePreviewSources.get(id)) || image.currentSrc || image.src;
  }
  function closeImagePreview() {
    imagePreviewVersion++;
    pendingImagePreviewFocus = null;
    clearTimeout(imagePreviewTimer);
    imagePreviewTimer = null;
    activeImagePreview?.classList.remove('is-previewing');
    activeImagePreview = null;
    if (imagePreviewLayer) {
      imagePreviewLayer.hidden = true;
      imagePreviewLayer.classList.remove('is-visible');
    }
  }
  // Prefer the free space to the right of the thumbnail, then the left, and
  // only as a last resort overlap it; always stay beneath the sticky header.
  function imagePreviewBox(box, ratio, viewport, topInset) {
    const gap = 14, edge = 12, maxWidth = 880;
    const maxHeight = Math.max(80, viewport.height - topInset - edge);
    const fit = (room) => {
      let width = Math.max(0, Math.min(maxWidth, room));
      let height = width / ratio;
      if (height > maxHeight) { height = maxHeight; width = height * ratio; }
      return { width, height };
    };
    const right = viewport.width - edge - (box.left + box.width + gap);
    const left = box.left - gap - edge;
    let size, x;
    if (right >= 320 || right >= left) {
      size = fit(right);
      x = box.left + box.width + gap;
    } else {
      size = fit(left);
      x = box.left - gap - size.width;
    }
    if (size.width < Math.min(320, viewport.width - 2 * edge)) {
      size = fit(viewport.width - 2 * edge);
      x = (viewport.width - size.width) / 2;
    }
    const centered = box.top + box.height / 2 - size.height / 2;
    const y = Math.min(viewport.height - edge - size.height, Math.max(topInset, centered));
    return { x: Math.round(x), y: Math.round(y), width: Math.round(size.width), height: Math.round(size.height) };
  }
  function openImagePreview(link) {
    closeImagePreview();
    const image = link.querySelector('img');
    if (!image) return;
    activeImagePreview = link;
    if (!image.complete) {
      const version = imagePreviewVersion;
      image.addEventListener('load', () => {
        if (version === imagePreviewVersion && (link.matches(':focus-visible') || (precisePointer.matches && link.matches(':hover')))) openImagePreview(link);
      }, { once: true });
      image.addEventListener('error', () => {
        if (version === imagePreviewVersion) closeImagePreview();
      }, { once: true });
      return;
    }
    if (!image.naturalWidth) { closeImagePreview(); return; }
    closeTooltip();
    if (!imagePreviewLayer) {
      imagePreviewLayer = document.createElement('div');
      imagePreviewLayer.className = 'image-preview-layer';
      imagePreviewLayer.setAttribute('aria-hidden', 'true');
      imagePreviewLayer.hidden = true;
      imagePreviewLayer.append(document.createElement('img'));
      document.body.append(imagePreviewLayer);
    }
    const box = link.getBoundingClientRect();
    const topInset = Math.max(12, (stickyHeader?.getBoundingClientRect().bottom ?? 0) + 8);
    const ratio = image.naturalWidth / Math.max(1, image.naturalHeight || image.naturalWidth / 1.5);
    const place = imagePreviewBox(box, ratio, { width: innerWidth, height: innerHeight }, topInset);
    const largeImage = imagePreviewLayer.firstElementChild;
    const source = previewSource(link, image);
    const version = imagePreviewVersion;
    // Show the already-decoded thumbnail at once; swap to the detail file when it arrives.
    largeImage.src = image.currentSrc || image.src;
    if (source && source !== largeImage.src) {
      const detail = new Image();
      detail.decoding = 'async';
      detail.addEventListener('load', () => { if (version === imagePreviewVersion) largeImage.src = source; }, { once: true });
      detail.src = source;
    }
    imagePreviewLayer.style.left = `${place.x}px`;
    imagePreviewLayer.style.top = `${place.y}px`;
    imagePreviewLayer.style.width = `${place.width}px`;
    imagePreviewLayer.style.height = `${place.height}px`;
    imagePreviewLayer.style.setProperty('--preview-origin-x', `${box.left + box.width / 2 - place.x}px`);
    imagePreviewLayer.style.setProperty('--preview-origin-y', `${box.top + box.height / 2 - place.y}px`);
    imagePreviewLayer.hidden = false;
    link.classList.add('is-previewing');
    requestAnimationFrame(() => { if (version === imagePreviewVersion) imagePreviewLayer.classList.add('is-visible'); });
  }
  // Scrolling slides new rows under a resting cursor. Those rows receive
  // pointer enter events, so a preview waits for real pointer movement.
  function requestImagePreview(link) {
    if (!precisePointer.matches || activeImagePreview === link || imagePreviewTimer !== null) return;
    if (performance.now() - lastImagePreviewScroll < 180) return;
    imagePreviewTimer = setTimeout(() => {
      imagePreviewTimer = null;
      if (link.matches(':hover') && performance.now() - lastImagePreviewScroll >= 180) openImagePreview(link);
    }, 70);
  }
  function bindImagePreview(link) {
    link.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') requestImagePreview(link);
    });
    link.addEventListener('pointerleave', () => {
      clearTimeout(imagePreviewTimer);
      imagePreviewTimer = null;
      if (activeImagePreview === link && !(document.activeElement === link && link.matches(':focus-visible'))) closeImagePreview();
    });
    link.addEventListener('focus', () => {
      const version = imagePreviewVersion;
      pendingImagePreviewFocus = link;
      requestAnimationFrame(() => {
        if (version !== imagePreviewVersion || document.activeElement !== link || !link.matches(':focus-visible')) {
          if (pendingImagePreviewFocus === link) pendingImagePreviewFocus = null;
          return;
        }
        // Finish native smooth focus scrolling before measuring the preview.
        link.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        requestAnimationFrame(() => {
          if (version === imagePreviewVersion && document.activeElement === link && link.matches(':focus-visible')) openImagePreview(link);
          if (pendingImagePreviewFocus === link) pendingImagePreviewFocus = null;
        });
      });
    });
    link.addEventListener('blur', closeImagePreview);
  }
  imagePreviewLinks().forEach(bindImagePreview);

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
  // Component and tool links stay visible in the header. When the measured row
  // would overflow or squeeze the search, labels shorten first, then Tools and
  // finally Components fold into their own small menus. Narrow layouts list
  // every group in the main menu sheet instead.
  const navGroups = ['tools', 'components'].map((name) => document.querySelector(`[data-nav-group="${name}"]`)).filter(Boolean);
  const headerRow = document.querySelector('.site-header .header-inner');
  const groupToggle = (group) => group.querySelector('[data-nav-group-toggle]');
  function setGroupOpen(group, open, { restoreFocus = false } = {}) {
    const toggle = groupToggle(group);
    if (!(toggle instanceof HTMLButtonElement)) return;
    group.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (!open && restoreFocus) toggle.focus({ preventScroll: true });
  }
  function headerCrowded() {
    if (!(headerRow instanceof HTMLElement)) return false;
    if (headerRow.scrollWidth > headerRow.clientWidth + 1) return true;
    const searchBox = headerRow.querySelector('.header-search');
    if (searchBox instanceof HTMLElement && searchBox.getBoundingClientRect().width < 230) return true;
    const summary = headerRow.querySelector('.settings-summary');
    return summary instanceof HTMLElement && summary.scrollWidth > summary.clientWidth + 1;
  }
  function fitNavigation() {
    const menuMode = menuButton instanceof HTMLElement && getComputedStyle(menuButton).display !== 'none';
    const wasCollapsed = navGroups.map((group) => group.classList.contains('is-collapsed'));
    navGroups.forEach((group) => group.classList.remove('is-collapsed'));
    stickyHeader?.classList.remove('is-compact-nav', 'is-two-row');
    if (!menuMode) {
      // Shorten labels, fold Tools, then move search and price settings to a
      // second row so every link shows again; fold menus there only if needed.
      const steps = [[false, 0, false], [true, 0, false], [true, 1, false], [false, 0, true], [true, 0, true], [true, 1, true], [true, 2, true]];
      for (const [compact, folded, twoRow] of steps) {
        stickyHeader?.classList.toggle('is-compact-nav', compact);
        stickyHeader?.classList.toggle('is-two-row', twoRow);
        navGroups.forEach((group, index) => {
          group.classList.toggle('is-collapsed', index < folded);
          // Measure with the menu buttons that the folded state will show.
          const toggle = groupToggle(group);
          if (toggle instanceof HTMLButtonElement) toggle.hidden = index >= folded;
        });
        if (!headerCrowded()) break;
      }
    }
    navGroups.forEach((group, index) => {
      const collapsed = group.classList.contains('is-collapsed');
      const toggle = groupToggle(group);
      if (toggle instanceof HTMLButtonElement) toggle.hidden = !collapsed;
      if (!collapsed && wasCollapsed[index]) setGroupOpen(group, false);
    });
  }
  navGroups.forEach((group) => {
    const toggle = groupToggle(group);
    if (!(toggle instanceof HTMLButtonElement)) return;
    group.classList.add('is-enhanced');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      navGroups.forEach((other) => { if (other !== group) setGroupOpen(other, false); });
      setGroupOpen(group, open);
    });
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setGroupOpen(group, false, { restoreFocus: true });
        event.preventDefault();
      }
    });
  });
  document.addEventListener('click', (event) => {
    navGroups.forEach((group) => { if (event.target instanceof Node && !group.contains(event.target)) setGroupOpen(group, false); });
  });
  // Without JavaScript the language links stay inline; with it they fold into one small menu.
  const languageMenu = document.querySelector('[data-language-menu]');
  const languageToggle = languageMenu?.querySelector('[data-language-toggle]');
  function setLanguageOpen(open, { restoreFocus = false } = {}) {
    if (!(languageToggle instanceof HTMLButtonElement)) return;
    languageMenu.classList.toggle('is-open', open);
    languageToggle.setAttribute('aria-expanded', String(open));
    if (!open && restoreFocus) languageToggle.focus({ preventScroll: true });
  }
  if (languageMenu instanceof HTMLElement && languageToggle instanceof HTMLButtonElement) {
    languageMenu.classList.add('is-enhanced');
    languageToggle.hidden = false;
    languageToggle.addEventListener('click', () => setLanguageOpen(languageToggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('click', (event) => {
      if (event.target instanceof Node && !languageMenu.contains(event.target)) setLanguageOpen(false);
    });
    languageMenu.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || languageToggle.getAttribute('aria-expanded') !== 'true') return;
      setLanguageOpen(false, { restoreFocus: true });
      event.preventDefault();
    });
  }
  let fitFrame = 0;
  function scheduleFit() { cancelAnimationFrame(fitFrame); fitFrame = requestAnimationFrame(fitNavigation); }
  if (navGroups.length) {
    fitNavigation();
    addEventListener('resize', scheduleFit);
    document.fonts?.ready.then(scheduleFit);
    // Observe the row and the settings text, never the elements this fit resizes.
    if (headerRow && typeof ResizeObserver !== 'undefined') new ResizeObserver(scheduleFit).observe(headerRow);
    const settingsSummary = headerRow?.querySelector('.settings-summary');
    if (settingsSummary && typeof MutationObserver !== 'undefined') new MutationObserver(scheduleFit).observe(settingsSummary, { childList: true, characterData: true, subtree: true });
  }
  // "/" focuses the header search unless the visitor is already typing.
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select'))) return;
    const field = document.querySelector('#site-search');
    if (!(field instanceof HTMLInputElement)) return;
    event.preventDefault();
    field.focus();
    field.select();
  });
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('[data-tooltip-lines], [data-price-details], #shared-tooltip')) closeTooltip();
    if (!target?.closest('.menu-button') && !target?.closest('#main-nav')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' && activeTooltipButton?.dataset.evidenceHref && !tooltipPanel?.hidden) {
      if (document.activeElement === activeTooltipButton && !event.shiftKey) {
        tooltipPanel.querySelector('a')?.focus();
        event.preventDefault();
        return;
      }
      if (tooltipPanel.contains(document.activeElement)) {
        const button = activeTooltipButton;
        if (!event.shiftKey) closeTooltip();
        button.focus({ preventScroll: true });
        if (event.shiftKey) event.preventDefault();
        return;
      }
    }
    if (event.key !== 'Escape') return;
    const returnFocus = tooltipPanel?.contains(document.activeElement) ? activeTooltipButton : null;
    const hadTooltip = activeTooltipButton !== null;
    const hadImagePreview = activeImagePreview !== null || pendingImagePreviewFocus !== null;
    const hadMenu = navigation instanceof HTMLElement && navigation.classList.contains('open');
    if (!hadTooltip && !hadImagePreview && !hadMenu) return;
    closeTooltip();
    if (returnFocus) {
      tooltipFocusSuppressed = true;
      returnFocus.focus({ preventScroll: true });
      requestAnimationFrame(() => { tooltipFocusSuppressed = false; });
    }
    closeImagePreview();
    closeMenu({ restoreFocus: hadMenu });
    event.preventDefault();
  });
  addEventListener('resize', () => {
    closeTooltip();
    closeImagePreview();
    closeMenu();
  });
  addEventListener('scroll', closeTooltip, true);
  addEventListener('scroll', () => {
    lastImagePreviewScroll = performance.now();
    // Native focus may scroll the link before its first animation frame. Let
    // that frame position the preview; later scrolling dismisses it normally.
    if (pendingImagePreviewFocus === document.activeElement && pendingImagePreviewFocus?.matches(':focus-visible')) return;
    closeImagePreview();
  }, true);

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
      // Spanish and Russian cover only the core tools, so their catalog links lead to the English model page.
      const interfaceNotes = {
        es: 'Esta ficha solo está disponible en inglés, chino y alemán. El enlace de arriba vuelve a tu catálogo en español.',
        ru: 'Эта страница доступна только на английском, китайском и немецком. Ссылка выше вернёт вас к каталогу на русском.'
      };
      const interfaceLocale = document.body.dataset.locale === 'en'
        ? Object.keys(interfaceNotes).find((code) => target.pathname === `${base}/${code}/`) : undefined;
      if (target.origin === location.origin && (target.pathname === expectedRoot || interfaceLocale)) {
        validatedReturnTarget = target;
        catalogBack.href = `${target.pathname}${target.search}${target.hash || '#catalog'}`;
        catalogBack.textContent = '← Back to filtered catalog';
        if (interfaceLocale) {
          const note = Object.assign(document.createElement('p'), { className: 'language-scope-note', lang: interfaceLocale, textContent: interfaceNotes[interfaceLocale] });
          catalogBack.closest('.breadcrumbs')?.after(note);
        }
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

  const modelFramePrice = document.querySelector('[data-model-frame-price-low]');
  if (modelFramePrice instanceof HTMLElement) {
    const defaultAllowance = Number(modelFramePrice.dataset.modelDefaultAllowance || 0);
    const requested = new URLSearchParams(location.search).get('build');
    const raw = numberOrNull(requested) ?? defaultAllowance;
    const allowance = Number.isFinite(raw) ? Math.min(100000, Math.max(0, Math.round(raw))) : defaultAllowance;
    const frameLow = Number(modelFramePrice.dataset.modelFramePriceLow);
    const frameHigh = Number(modelFramePrice.dataset.modelFramePriceHigh || frameLow);
    const priceLabel = `${modelFramePrice.hasAttribute('data-model-price-starting') ? translate('From', locale) + ' ' : ''}${formatEstimatedRange(frameLow + allowance, frameHigh + allowance)}`;
    const calculated = modelFramePrice.querySelector('[data-model-calculated-price]');
    if (calculated) calculated.textContent = priceLabel;
    const priceTip = modelFramePrice.querySelector('[data-tooltip-lines]');
    if (priceTip) {
      try {
        priceTip.dataset.tooltipLines = JSON.stringify(JSON.parse(priceTip.dataset.tooltipLines).map((line) =>
          line.startsWith('Estimated complete adds') ? `Estimated complete adds ${formatYuan(allowance)} for the selected build.` : line));
      } catch { /* The complete price record remains accessible. */ }
    }
    const brief = document.querySelector('[data-model-price-brief]');
    if (brief) {
      const current = String(brief.textContent ?? '');
      brief.textContent = document.body.dataset.locale === 'de'
        ? current.replace(
          /^Die angezeigte Schätzung .*? addiert den anpassbaren Aufbauzuschlag ¥[\d,]+/,
          `Die angezeigte Schätzung ${translate(priceLabel, 'de')} addiert den anpassbaren Aufbauzuschlag ${formatYuan(allowance)}`
        )
        : document.body.dataset.locale === 'zh-Hans'
        ? current.replace(/¥[\d,]+/, formatYuan(allowance))
        : current.replace(
          /^The displayed .*? estimate adds the adjustable ¥[\d,]+ build allowance/,
          `The displayed ${priceLabel} estimate adds the adjustable ${formatYuan(allowance)} build allowance`
        );
    }
    writeStoredBuildAllowance(allowance);
  }

  const catalogRoot = document.querySelector('[data-catalog-root]');
  const catalogData = document.querySelector('#catalog-data');
  if (!catalogRoot || !catalogData) return;
  document.body.classList.add('is-catalog-page');
  // The tray stays fixed on screen; in keyboard order it follows the result controls instead of the footer.
  const resultBarForTray = catalogRoot.querySelector('.result-bar');
  const trayForOrder = document.querySelector('[data-compare-tray]');
  if (resultBarForTray && trayForOrder) resultBarForTray.after(trayForOrder);

  const regionalDataElement = document.querySelector('#regional-price-data');
  const regionalDataPromise = (async () => {
    try {
      if (!regionalDataElement?.dataset.src) return null;
      const response = await fetch(regionalDataElement.dataset.src, { cache: 'force-cache' });
      if (!response.ok) return null;
      const payload = await response.json();
      if (!PRICE_CURRENCIES.every((currency) => Number.isFinite(payload.rates?.per_eur?.[currency]) && payload.rates.per_eur[currency] > 0) || !Array.isArray(payload.offers)) return null;
      return { ...payload, asOf: new Date().toISOString().slice(0, 10) };
    } catch { return null; } // Keep the original CNY catalog usable offline or on older deployments.
  })();

  let products = [];
  try {
    const response = await fetch(catalogData.dataset.src, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Catalog data HTTP ${response.status}`);
    products = await response.json();
    if (!Array.isArray(products)) throw new Error('Catalog data is not an array');
  } catch (error) {
    console.error('Comparison data unavailable', error);
    catalogRoot.dataset.catalogError = String(error);
    return;
  }
  catalogRoot.dataset.catalogReady = 'true';
  const byId = new Map(products.map((item) => [item.id, item]));
  products.forEach((item) => {
    priceTooltipContent.set(item.id, pricePopoverLines(item).map((line) => translate(line, locale)));
    item.priceState = compactPriceBasis(item.priceState ?? '');
  });
  products.forEach((item) => {
    const largest = String(item.imageSrcset ?? '').split(',')
      .map((entry) => entry.trim().split(/\s+/))
      .map(([source, width]) => ({ source, width: Number.parseInt(width, 10) || 0 }))
      .filter((entry) => entry.source)
      .sort((a, b) => b.width - a.width)[0];
    if (largest) imagePreviewSources.set(item.id, largest.source);
  });
  const productList = catalogRoot.querySelector('[data-product-list]');
  const rows = [...catalogRoot.querySelectorAll('[data-product-row]')];
  rows.forEach((row) => {
    const item = byId.get(row.dataset.id);
    if (item) item.priceState = row.querySelector('.price-state')?.textContent ?? item.priceState;
  });
  const searchIndex = new Map(rows.map((row) => [row, createCatalogSearchIndex(row.dataset.search)]));
  const searchScores = new Map();
  let scoredQuery = null;
  let searchTerms = [];
  const regionalData = await regionalDataPromise;
  catalogRoot.dataset.regionalPrices = regionalData ? 'ready' : 'unavailable';
  // Price settings live in the header popover; the catalog reads them from the document.
  const destinationControl = document.querySelector('[data-ship-country]');
  const currencyControl = document.querySelector('[data-display-currency]');
  const areaControl = document.querySelector('[data-delivery-area]');
  const preferenceStorageKey = deliveryPreferenceStorageKey;
  let savedPreference = {};
  try { savedPreference = JSON.parse(localStorage.getItem(preferenceStorageKey) ?? '{}') ?? {}; } catch { /* URL choices remain available */ }
  let timeZone = '';
  try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* a suggestion is optional */ }
  const suggestedDestination = resolveDestination({ stored: savedPreference.country, edgeCountry: catalogRoot.dataset.priceCountry, timeZone, languages: navigator.languages ?? [navigator.language] });
  const today = new Date().toISOString().slice(0, 10);
  let activeCountry = 'CN';
  let activeCurrency = 'CNY';
  let currencyChosen = false;
  let activeArea = '';
  let destinationReason = 'unknown';
  let heldRegional = null; // link choices kept while regional prices or a budget currency cannot be resolved
  const originalPrices = new Map(products.map((item) => [item.id, { price: item.price, state: item.priceState ?? '', details: item.priceDetails ?? '' }]));
  const originalPriceTips = new Map(products.map((item) => [item.id, pricePopoverLines(item)]));
  if (regionalData) document.querySelector('[data-price-preferences]').hidden = false;
  const empty = catalogRoot.querySelector('[data-empty]');
  const resultCount = catalogRoot.querySelector('[data-result-count]');
  const resultSummary = catalogRoot.querySelector('[data-result-summary]');
  const resultContext = catalogRoot.querySelector('[data-result-context]');
  const resultCoverage = catalogRoot.querySelector('[data-result-coverage]');
  const filterNotice = catalogRoot.querySelector('[data-filter-notice]');
  const search = document.querySelector('[data-filter-search]');
  const price = catalogRoot.querySelector('[data-filter-price]');
  const tire = catalogRoot.querySelector('[data-filter-tire]');
  const tireUnknown = catalogRoot.querySelector('[data-filter-tire-unknown]');
  const tireLayout = catalogRoot.querySelector('[data-filter-tire-layout]');
  const completeWeight = catalogRoot.querySelector('[data-filter-complete-weight]');
  const frameWeight = catalogRoot.querySelector('[data-filter-frame-weight]');
  const drivetrainFilter = catalogRoot.querySelector('[data-filter-drivetrain]');
  const frameFilter = catalogRoot.querySelector('[data-filter-frame]');
  const categoryMinimum = catalogRoot.querySelector('[data-filter-category-min]');
  const categoryMinimumLabel = catalogRoot.querySelector('[data-category-min-label]');
  const categoryMinimumUnit = catalogRoot.querySelector('[data-category-min-unit]');
  const category = catalogRoot.querySelector('[data-filter-category]');
  const categoryValues = new Set((category?.dataset.categoryValues ?? '').split(' ').filter(Boolean));
  const categoryButtons = [...document.querySelectorAll('[data-category-value]')];
  const publishedFilter = catalogRoot.querySelector('[data-filter-published]');
  const listingFilter = document.querySelector('[data-filter-listing]');
  const listingFilterControl = document.querySelector('[data-listing-filter-control]');
  const shiftingFilter = catalogRoot.querySelector('[data-filter-shifting]');
  const shiftingChips = [...catalogRoot.querySelectorAll('[data-shifting-chip]')];
  const shiftingValues = new Set(shiftingChips.map((chip) => chip.dataset.shiftingChip));
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
  const filterChips = catalogRoot.querySelector('[data-filter-chips]');
  const filterSheet = catalogRoot.querySelector('[data-filter-sheet]');
  const sheetToggles = [...document.querySelectorAll('[data-filter-sheet-toggle]')];
  const sheetResultCount = catalogRoot.querySelector('[data-sheet-result-count]');
  const activeFilterCount = document.querySelector('[data-active-filter-count]');
  const settingsToggle = document.querySelector('[data-settings-toggle]');
  const settingsPanel = document.querySelector('[data-settings-panel]');
  const reset = catalogRoot.querySelector('[data-reset]');
  const showAllModels = catalogRoot.querySelector('[data-show-all-models]');
  const modelLinks = [...catalogRoot.querySelectorAll('[data-model-link]')];
  const typeButtons = [...catalogRoot.querySelectorAll('[data-type-value]')];
  const brandButtons = [...catalogRoot.querySelectorAll('[data-brand-filter]')];
  const brandValues = new Set(rows.map((row) => row.dataset.brand).filter(Boolean));
  const brandLabels = new Map(brandButtons.map((button) => [button.dataset.brandFilter, button.textContent.trim()]));
  const narrowLayout = matchMedia('(max-width: 959px)');
  modelLinks.forEach((link) => { link.dataset.baseHref = link.getAttribute('href') ?? ''; });
  let activeType = '';
  let activeBrand = '';
  // Gallery is the default layout of the same rows: filters, sort, selection and
  // comparison keep working because nothing is duplicated or re-rendered.
  const viewControl = catalogRoot.querySelector('[data-view-control]');
  const viewButtons = [...(viewControl?.querySelectorAll('[data-view-value]') ?? [])];
  const gallerySizeControl = catalogRoot.querySelector('[data-gallery-size-control]');
  const gallerySize = gallerySizeControl?.querySelector('[data-gallery-size]');
  const gallerySizeSteps = [...(gallerySizeControl?.querySelectorAll('[data-gallery-size-step]') ?? [])];
  const galleryColumnsStorageKey = 'china-bikes-gallery-columns-v1';
  let activeView = 'gallery';
  let galleryPrepared = false;
  // Photo size works like zooming a photo grid: fewer, larger cards or more,
  // smaller ones. Bounds follow the available width so every step changes the
  // grid and cards stay wide enough to identify a bike and read its price.
  let galleryColumnPreference = {};
  try { galleryColumnPreference = JSON.parse(localStorage.getItem(galleryColumnsStorageKey) ?? '{}') ?? {}; } catch { /* the default size still works */ }
  const phoneLayout = matchMedia('(max-width: 599px)');
  function galleryLayoutKey() { return phoneLayout.matches ? 'narrow' : 'wide'; }
  function galleryColumnBounds() {
    const width = productList instanceof HTMLElement ? productList.clientWidth : 0;
    const narrow = phoneLayout.matches;
    const gap = narrow ? 10 : 16;
    const smallest = narrow ? 104 : 150;
    const max = Math.max(1, Math.min(narrow ? 3 : 7, Math.floor((width + gap) / (smallest + gap))));
    const preferred = Math.max(1, Math.min(max, narrow ? 2 : Math.floor((width + gap) / (248 + gap)) || 1));
    return { max, preferred, gap };
  }
  function applyGalleryColumns() {
    if (!(productList instanceof HTMLElement) || activeView !== 'gallery') return;
    const { max, preferred, gap } = galleryColumnBounds();
    const saved = Number(galleryColumnPreference[galleryLayoutKey()]);
    const columns = Number.isInteger(saved) && saved >= 1 ? Math.min(max, saved) : preferred;
    productList.dataset.galleryColumns = String(columns);
    productList.style.setProperty('--gallery-columns', String(columns));
    if (gallerySize instanceof HTMLInputElement) {
      // Slider position grows with photo size: right is larger, left is smaller.
      gallerySize.max = String(max);
      gallerySize.value = String(max + 1 - columns);
      gallerySize.disabled = max <= 1;
      gallerySize.setAttribute('aria-valuetext', translate(columns === 1 ? '1 per row' : `${columns} per row`, locale));
    }
    gallerySizeSteps.forEach((button) => {
      const larger = button.dataset.gallerySizeStep === '1';
      button.disabled = larger ? columns <= 1 : columns >= max;
    });
    // A step that just reached its limit hands keyboard focus to the slider instead of dropping it.
    if (gallerySizeSteps.some((button) => button.disabled && button === document.activeElement)) (gallerySize instanceof HTMLInputElement && !gallerySize.disabled ? gallerySize : gallerySizeSteps.find((button) => !button.disabled))?.focus();
    const cardWidth = Math.max(1, Math.ceil((productList.clientWidth - gap * (columns - 1)) / columns));
    rows.forEach((row) => {
      const image = row.querySelector('.product-image-link > img');
      if (image instanceof HTMLImageElement && image.srcset) image.sizes = `${cardWidth}px`;
    });
  }
  function setGalleryColumns(columns) {
    const { max } = galleryColumnBounds();
    galleryColumnPreference = { ...galleryColumnPreference, [galleryLayoutKey()]: Math.max(1, Math.min(max, columns)) };
    try { localStorage.setItem(galleryColumnsStorageKey, JSON.stringify(galleryColumnPreference)); } catch { /* size still applies to this page */ }
    applyGalleryColumns();
  }
  function prepareGallery() {
    if (galleryPrepared || !(productList instanceof HTMLElement)) return;
    galleryPrepared = true;
    rows.forEach((row) => {
      const image = row.querySelector('.product-image-link > img');
      const item = byId.get(row.dataset.id);
      if (!(image instanceof HTMLImageElement) || !item?.imageSrcset) return;
      image.sizes = '(max-width: 599px) calc(50vw - 24px), 320px';
      image.srcset = item.imageSrcset;
    });
  }
  function setView(value, { historyMode = 'push', update = true } = {}) {
    activeView = value === 'table' ? 'table' : 'gallery';
    if (activeView === 'gallery') prepareGallery();
    closeImagePreview();
    if (productList instanceof HTMLElement) productList.dataset.catalogView = activeView;
    viewButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.viewValue === activeView)));
    if (gallerySizeControl instanceof HTMLElement) gallerySizeControl.hidden = activeView !== 'gallery';
    applyGalleryColumns();
    if (update) updateFilterUrl(historyMode);
  }
  if (viewControl instanceof HTMLElement) {
    viewControl.hidden = false;
    viewButtons.forEach((button) => button.addEventListener('click', () => {
      if (button.dataset.viewValue !== activeView) setView(button.dataset.viewValue);
    }));
  }
  if (gallerySize instanceof HTMLInputElement) {
    gallerySize.addEventListener('input', () => setGalleryColumns(Number(gallerySize.max) + 1 - Number(gallerySize.value)));
  }
  gallerySizeSteps.forEach((button) => button.addEventListener('click', () => {
    const current = Number(productList?.dataset.galleryColumns) || galleryColumnBounds().preferred;
    setGalleryColumns(current - Number(button.dataset.gallerySizeStep));
  }));
  if ('ResizeObserver' in window && productList instanceof HTMLElement) {
    let galleryWidth = 0;
    new ResizeObserver(() => {
      const width = productList.clientWidth;
      if (width === galleryWidth) return;
      galleryWidth = width;
      applyGalleryColumns();
    }).observe(productList);
  }
  let allModelsVisible = false;
  const defaultBuildAllowance = Number(buildAllowance?.dataset.defaultValue || 0);
  const defaultBuildPreset = buildPreset instanceof HTMLSelectElement ? buildPreset.value : '';
  let currentBuildAllowance = defaultBuildAllowance;
  let currentBuildPreset = defaultBuildPreset;
  let buildHighlightTimer = 0;
  const defaultPriceDetails = new Map(products.map((item) => [item.id, item.priceDetails ?? '']));
  // Research leads follow published records in the default order.
  const leadDivider = Object.assign(document.createElement('div'), { className: 'catalog-divider', hidden: true });
  leadDivider.setAttribute('role', 'row');
  leadDivider.append(Object.assign(document.createElement('span'), { textContent: translate('Partial profiles', locale) }));
  leadDivider.firstElementChild.setAttribute('role', 'cell');

  const defaultSortModes = { price: 'price-asc', name: 'name-asc', capability: 'capability-desc', tire: 'tire-desc' };
  // The China-only price sort was retired: Price now sorts the amount each row shows.
  const legacySortModes = { price: 'price-asc', name: 'name-asc', capability: 'capability-desc', published: 'published-asc', 'china-asc': 'price-asc', 'china-desc': 'price-desc' };
  const defaultSort = 'published-asc';

  function canonicalSortMode(value) {
    const candidate = legacySortModes[value] ?? value;
    return ['published-asc', 'price-asc', 'price-desc', 'name-asc', 'name-desc', 'capability-asc', 'capability-desc', 'tire-asc', 'tire-desc'].includes(candidate)
      ? candidate
      : defaultSort;
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

  function priceCurrency() { return activeCurrency; }

  function differenceLabel(difference) {
    if (!difference) return '';
    const { low, high } = difference;
    const number = (value) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(Math.abs(value));
    if (Math.abs(low) < 1e-8 && Math.abs(high) < 1e-8) return translate('Same price in China', locale);
    if (low <= 0 && high >= 0) return translate('China difference varies', locale);
    const positive = low > 0;
    const from = positive ? low : high, to = positive ? high : low;
    return `≈ ${number(from)}${Math.abs(low - high) > 1e-8 ? `–${number(to)}` : ''}% ${translate(positive ? 'less in China' : 'more in China', locale)}`;
  }

  function updateSettingsSummary() {
    const country = document.querySelector('[data-settings-country]');
    const currency = document.querySelector('[data-settings-currency]');
    const build = document.querySelector('[data-settings-build]');
    if (country) country.textContent = activeCountry ? countryName(activeCountry, locale) : translate('Choose destination', locale);
    if (currency) currency.textContent = activeCurrency;
    if (build) build.textContent = `+${formatYuan(currentBuildAllowance)}`;
  }

  function updateRegionalPrices() {
    if (!regionalData) return;
    const currency = priceCurrency();
    destinationControl.value = activeCountry;
    currencyControl.value = currency;
    areaControl.value = activeArea;
    document.querySelector('[data-delivery-area-control]').hidden = activeCountry !== 'US';
    document.querySelector('[data-destination-suggestion]').hidden = destinationReason !== 'suggested';
    const heading = sortHeadingByKey.get('price')?.querySelector('span');
    if (heading) heading.textContent = `${translate('Price', locale)} · ${currency}`;
    const domestic = activeCountry === 'CN';
    const budgetLabel = catalogRoot.querySelector('[data-price-budget-label]');
    if (budgetLabel) budgetLabel.textContent = translate(domestic ? 'Max full-bike price' : 'Max delivered price', locale);
    const budgetHelp = catalogRoot.querySelector('[data-price-budget-help]');
    if (budgetHelp) budgetHelp.textContent = translate(domestic ? 'China price. Frame builds include your plan.' : 'Budget filters require complete delivered totals.', locale);
    const sortButton = sortHeadingByKey.get('price');
    if (sortButton) sortButton.title = translate('Sort by the price shown in each row; unknown prices stay last.', locale);
    catalogRoot.querySelector('[data-price-currency]').textContent = currency;
    const note = document.querySelector('[data-price-region-note]');
    note.hidden = false;
    note.textContent = `${translate(domestic ? 'Buying in China. Prices keep their observation dates and conditions. References are not used for budgets.' : 'Delivered totals first; otherwise China references, excluding shipping and import charges. Budget filters require delivered totals.', locale)} `;
    const exchangeSource = document.createElement('a');
    exchangeSource.href = regionalData.rates.source;
    exchangeSource.rel = 'noreferrer';
    exchangeSource.textContent = `ECB · ${regionalData.rates.rate_date}`;
    note.append(exchangeSource);
    if (listingFilterControl instanceof HTMLElement) {
      listingFilterControl.hidden = domestic || !activeCountry;
      const label = listingFilterControl.querySelector('[data-listing-filter-label]');
      if (label) label.textContent = translate(`Only bikes with a seller listing for ${countryName(activeCountry || 'CN', 'en')}`, locale).replace(countryName(activeCountry || 'CN', 'en'), countryName(activeCountry || 'CN', locale));
      if (listingFilterControl.hidden && listingFilter instanceof HTMLInputElement) listingFilter.checked = false;
    }
    rows.forEach((row) => {
      const item = byId.get(row.dataset.id);
      if (!item) return;
      const original = originalPrices.get(item.id);
      const cell = row.querySelector('.price-cell');
      const primary = cell?.querySelector('[data-calculated-price]');
      cell?.querySelectorAll('[data-regional-offer]').forEach((link) => link.remove());
      cell?.querySelector('[data-china-difference]')?.remove();
      row.dataset.hasListing = 'false';
      if (item.priceUnavailable) {
        // A conditional or reference amount that the row still shows sorts by that amount,
        // converted only for ordering; it never qualifies for a budget filter.
        const shownLow = convertPrice(numberOrNull(item.priceLowCny), 'CNY', currency, regionalData.rates);
        const shownHigh = convertPrice(numberOrNull(item.priceHighCny ?? item.priceLowCny), 'CNY', currency, regionalData.rates);
        row.dataset.priceSort = Number.isFinite(shownLow) ? String(shownLow) : '';
        row.dataset.priceSortHigh = Number.isFinite(shownHigh) ? String(shownHigh) : '';
        row.dataset.priceFilter = '';
        return;
      }
      const projection = regionalPrice(item, { country: activeCountry, currency, area: activeArea }, regionalData, currentBuildAllowance);
      const { china, offer, state } = projection;
      let subline = cell?.querySelector('.price-state');
      if (!subline && cell) {
        subline = document.createElement('span');
        subline.className = 'metric-sub price-state';
        cell.append(subline);
      }
      // Sorting follows the headline amount the row shows (delivered total, China
      // price or labelled reference); budgets still require complete delivered totals.
      row.dataset.priceSort = Number.isFinite(projection.display.low) ? String(projection.display.low) : '';
      row.dataset.priceSortHigh = Number.isFinite(projection.display.high) ? String(projection.display.high) : '';
      row.dataset.priceFilter = Number.isFinite(projection.high) ? String(projection.high) : '';
      row.dataset.hasListing = String(Boolean(offer));
      const shown = priceDisplay(projection, {
        currency, allowance: currentBuildAllowance, locale, today, translate,
        referenceLabel: item.referenceLabel,
        referenceDate: item.priceDate,
        fallback: Number.isFinite(projection.display.low) ? null : { headline: original.price, basis: original.state }
      });
      item.price = shown.headline;
      item.priceTone = shown.tone;
      if (primary) primary.textContent = shown.headline;
      if (subline) {
        subline.textContent = shown.basis;
        subline.className = `metric-sub price-state${shown.tone ? ` is-${shown.tone}` : ''}`;
        subline.hidden = !shown.basis || (shown.tone === 'unknown' && !original.state);
      }
      const delivered = deliveredLine(projection, { currency, locale, translate });
      const difference = differenceLabel(projection.difference);
      if (delivered || difference) {
        const line = document.createElement('span');
        line.className = 'china-price-difference';
        line.dataset.chinaDifference = '';
        line.textContent = [delivered, difference].filter(Boolean).join(' · ');
        cell.append(line);
      }
      const scopeLabel = offer?.delivery?.scope === 'contiguous-us' ? 'Contiguous US only' : 'Standard addresses only';
      // Popover lines add only what the row does not already say.
      const exact = china && (china.low % 1 || (china.high ?? china.low) % 1)
        ? `${translate('Recorded amount', locale)}: ${formatMoneyRange(china.low, china.high ?? china.low, 'CNY', locale, { exact: true })}` : '';
      const lines = [
        exact,
        ...(projection.difference ? [translate('China difference = (delivered total − China equivalent) ÷ delivered total. It is a market price gap, not an importing saving.', locale)] : []),
        ...(projection.frame ? [translate('The build estimate uses the China allowance, not a verified regional build cost.', locale)] : []),
        ...(offer ? [`${translate('Listing', locale)}: ${formatMoneyRange(offer.amount, offer.amount, offer.currency, locale)} · ${offer.date}.`, translate(offer.package, locale), translate(offer.conditions, locale)] : []),
        ...(offer?.delivery ? [translate(scopeLabel, locale), offer.delivery.basis] : [])
      ].filter(Boolean);
      if (offer) {
        const link = document.createElement('a');
        link.dataset.regionalOffer = '';
        if (offer.analyticsOfferId) {
          link.dataset.analyticsAction = 'product_outbound_click';
          link.dataset.analyticsOffer = offer.analyticsOfferId;
        }
        link.className = 'regional-offer-link';
        link.href = offer.source;
        link.rel = 'noreferrer';
        link.textContent = `${translate(offer.kind === 'frameset' ? 'Frameset offer' : 'Listing', locale)} · ${formatMoneyRange(offer.amount, offer.amount, offer.currency, locale)}`;
        link.title = `${offer.date} · ${translate(offer.package, locale)}. ${translate(offer.conditions, locale)}`;
        cell?.append(link);
        for (const source of offer.deliverySources ?? []) {
          if (source.url === offer.source) continue;
          const policy = document.createElement('a');
          policy.dataset.regionalOffer = '';
          policy.className = 'regional-policy-link';
          policy.href = source.url;
          policy.rel = 'noreferrer';
          policy.textContent = translate('Delivery policy', locale);
          cell?.append(policy);
        }
      }
      let baseLines = originalPriceTips.get(item.id) ?? [];
      baseLines = baseLines.map((line) => {
        line = line.replace(/Estimated complete adds (?:a fixed )?¥[\d,]+(?: for the selected)? [^.]+\./, `Estimated complete adds ${formatYuan(currentBuildAllowance)} for the selected build.`);
        return line;
      });
      priceTooltipContent.set(item.id, [...new Set([...baseLines.map((line) => translate(line, locale)), ...lines])]);
      item.priceState = [shown.basis, delivered, difference].filter(Boolean).join(' · ');
      const details = String(original.details).replace(/Estimated complete adds (?:a fixed )?¥[\d,]+(?: for the selected)? [^.]+\./, `Estimated complete adds ${formatYuan(currentBuildAllowance)} for the selected build.`);
      item.priceDetails = [details, ...lines].filter(Boolean).join(' ');
    });
    // A strict delivered budget matches nothing where no delivered total is recorded; say so instead of silently emptying the list.
    const budgetable = domestic || rows.some((row) => row.dataset.priceFilter !== '');
    if (!budgetable && budgetHelp) budgetHelp.textContent = translate('No delivered totals are recorded for this destination yet, so a budget here matches no bike.', locale);
    if (price instanceof HTMLInputElement) price.disabled = !budgetable && !price.value;
    catalogRoot.dataset.activeShipCountry = activeCountry || 'unknown';
    catalogRoot.dataset.activePriceCurrency = currency;
    updateSettingsSummary();
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
      row.dataset.priceSort = String(low);
      row.dataset.priceSortHigh = String(high);
      row.dataset.priceFilter = String(high);
      const priceLabel = row.querySelector('[data-calculated-price]');
      if (priceLabel) priceLabel.textContent = formatEstimatedRange(low, high);
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
      priceTooltipContent.set(item.id, pricePopoverLines(item).map((line) => translate(line, locale)));
    });
    updateRegionalPrices();
    updateSettingsSummary();
    if (highlight) highlightBuildPrices();
  }

  function updateModelLinks() {
    const from = `${location.pathname}${location.search}#catalog`;
    [...modelLinks, ...document.querySelectorAll('[data-evidence-href]')].forEach((link) => {
      const evidence = link.hasAttribute('data-evidence-href');
      const target = new URL(evidence ? link.dataset.evidenceHref : link.dataset.baseHref || link.getAttribute('href') || '', location.origin);
      target.searchParams.set('from', from);
      setParam(target, 'build', String(currentBuildAllowance), String(defaultBuildAllowance));
      target.searchParams.delete('market');
      setParam(target, 'ship', activeCountry || 'unknown');
      setParam(target, 'currency', activeCurrency);
      setParam(target, 'area', activeCountry === 'US' ? activeArea : '');
      if (heldRegional) writeRegionalHold(target, heldRegional, ['ship', 'currency', 'area']);
      if (evidence) link.dataset.evidenceHref = `${target.pathname}${target.search}${target.hash}`;
      else link.href = `${target.pathname}${target.search}`;
    });
  }

  function updateFilterUrl(mode = 'replace') {
    const next = new URL(location.href);
    setParam(next, 'q', search?.value.trim());
    setParam(next, 'type', activeType);
    setParam(next, 'brand', activeBrand);
    setParam(next, 'max', price?.value);
    setParam(next, 'maxCurrency', price?.value ? priceCurrency() : '');
    next.searchParams.delete('market');
    setParam(next, 'ship', activeCountry || 'unknown');
    setParam(next, 'currency', activeCurrency);
    setParam(next, 'area', activeCountry === 'US' ? activeArea : '');
    setParam(next, 'tire', tire?.value);
    setParam(next, 'tireLayout', tireLayout?.value);
    setParam(next, 'tireUnknown', tireUnknown?.checked ? '1' : '');
    setParam(next, 'completeWeight', completeWeight?.value);
    setParam(next, 'frameWeight', frameWeight?.value);
    setParam(next, 'drivetrain', drivetrainFilter?.value.trim());
    setParam(next, 'shifting', shiftingFilter?.value);
    setParam(next, 'frameFact', frameFilter?.value.trim());
    setParam(next, 'categoryMin', categoryMinimum?.value);
    next.searchParams.delete('capability');
    setParam(next, 'category', category?.value);
    setParam(next, 'published', publishedFilter?.checked ? '1' : '');
    setParam(next, 'listing', listingFilter?.checked ? '1' : '');
    setParam(next, 'sort', sort?.value, defaultSort);
    setParam(next, 'view', activeView === 'table' ? 'table' : '');
    setParam(next, 'scope', allModelsVisible ? 'all' : '');
    setParam(next, 'buildPreset', currentBuildPreset, defaultBuildPreset);
    setParam(next, 'build', String(currentBuildAllowance), String(defaultBuildAllowance));
    if (heldRegional) writeRegionalHold(next, heldRegional);
    const target = `${next.pathname}${next.search}${next.hash}`;
    try { history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', target); } catch { /* normal navigation origin required */ }
    updateModelLinks();
  }

  function setType(value, { historyMode = 'push', update = true } = {}) {
    activeType = ['complete-bike', 'frameset'].includes(value) ? value : '';
    typeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.typeValue === activeType)));
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

  function setCategory(value, { historyMode = 'push' } = {}) {
    if (category) category.value = validCategory(value);
    updateCatalog({ historyMode });
  }

  function validCategory(value) {
    return categoryValues.has(value) ? value : '';
  }

  function hasFilters() {
    return Boolean(heldRegional?.limit || heldRegional?.listing || activeType || activeBrand || allModelsVisible || shiftingFilter?.value || publishedFilter?.checked || listingFilter?.checked || currentBuildPreset !== defaultBuildPreset || currentBuildAllowance !== defaultBuildAllowance || search?.value.trim() || price?.value || tireLayout?.value || tire?.value || (tire?.value && tireUnknown?.checked) || completeWeight?.value || frameWeight?.value || drivetrainFilter?.value.trim() || frameFilter?.value.trim() || categoryMinimum?.value || category?.value || (sort?.value && sort.value !== defaultSort));
  }

  function numericValue(input, multiplier = 1) {
    const value = Number(input?.value || 0);
    return Number.isFinite(value) && value > 0 ? value * multiplier : 0;
  }

  let appliedTireLayout = null;
  function updateTireLayout() {
    const layout = tireLayout?.value || '';
    if (layout === appliedTireLayout) return;
    appliedTireLayout = layout;
    rows.forEach((row) => {
      const item = byId.get(row.dataset.id);
      if (!item) return;
      const shown = catalogClearance(item, tireLayout?.value);
      row.dataset.tireClearanceSort = shown.sortValue ? String(shown.sortValue) : '';
      row.dataset.tireLayoutUnsupported = String(Boolean(shown.unsupported));
      const cell = row.querySelector('.tire-clearance-cell');
      if (!cell) return;
      const tip = cell.querySelector('.tooltip');
      const parts = clearanceParts(shown.label);
      const factButton = tip?.querySelector('.fact-button');
      const main = element('span', 'metric-main', factButton ? '' : translate(parts.main, locale));
      if (factButton) {
        factButton.textContent = translate(parts.main, locale);
        factButton.setAttribute('aria-label', `${translate(parts.main, locale)} — ${translate('Tire clearance details', locale)}`);
      }
      if (tip) main.append(tip);
      cell.replaceChildren(main);
      if (parts.sub) cell.append(element('span', 'metric-sub', translate(parts.sub, locale)));
      cell.classList.toggle('is-unknown', shown.label === '—');
    });
  }

  function matchesTypedFilters(row) {
    const item = byId.get(row.dataset.id);
    const maxPrice = numberOrNull(price?.value);
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
    const frame = normalizeMaterialSearch(frameFilter?.value);
    const categoryLimit = numericValue(categoryMinimum);
    const categoryKind = categoryMinimum?.dataset.kind ?? '';
    return row.dataset.tireLayoutUnsupported !== 'true' && !regionalHoldBlocks(heldRegional, maxPrice) &&
      (maxPrice === null || Number(row.dataset.priceFilter || Infinity) <= maxPrice) &&
      (!minTire || tireValue >= minTire || (!tireValue && tireUnknown?.checked)) &&
      weightMatches &&
      (!drivetrain || `${item?.drivetrain ?? ''} ${item?.drivetrainSubline ?? ''}`.toLowerCase().includes(drivetrain)) &&
      // Shifting uses the recorded class: frame-only and unresolved builds match neither.
      (!shiftingFilter?.value || item?.shifting === shiftingFilter.value) &&
      (!frame || String(item?.frameSearch ?? item?.frame ?? '').toLowerCase().includes(frame)) &&
      (!categoryLimit || (row.dataset.capabilityKind === categoryKind && Number(row.dataset.capabilitySort || 0) >= categoryLimit)) &&
      (!publishedFilter?.checked || row.dataset.stage !== 'candidate') &&
      (!listingFilter?.checked || row.dataset.hasListing === 'true');
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

  function matchesPrimaryContext(row, categoryValue = category?.value ?? '') {
    return (!activeType || row.dataset.type === activeType) &&
      (!activeBrand || row.dataset.brand === activeBrand) &&
      matchesCategory(row, categoryValue);
  }

  function searchScore(row) {
    const query = search?.value ?? '';
    if (query !== scoredQuery) {
      scoredQuery = query;
      searchTerms = compileCatalogQuery(query);
      searchScores.clear();
    }
    if (!searchScores.has(row)) searchScores.set(row, scoreCatalogSearch(searchIndex.get(row), searchTerms));
    return searchScores.get(row);
  }

  function matchesQuery(row) {
    return Number.isFinite(searchScore(row));
  }

  function rowMatches(row) {
    return rowInScope(row) && matchesQuery(row) && matchesPrimaryContext(row) && matchesTypedFilters(row);
  }

  // Category counts describe every other active filter, so no option leads to an empty list.
  function updateCategoryCounts() {
    const eligible = rows.filter((row) => rowInScope(row) && matchesQuery(row) && matchesPrimaryContext(row, '') && matchesTypedFilters(row));
    const active = category?.value ?? '';
    const family = active.startsWith('family:') ? active.slice(7) : rows.find((row) => matchesCategory(row, active))?.dataset.family ?? '';
    categoryButtons.forEach((button) => {
      const value = button.dataset.categoryValue ?? '';
      const total = eligible.filter((row) => matchesCategory(row, value)).length;
      const pressed = value === active;
      button.dataset.count = String(total);
      button.setAttribute('aria-pressed', String(pressed));
      button.disabled = total === 0 && !pressed;
    });
    catalogRoot.querySelectorAll('[data-category-sub]').forEach((list) => {
      list.hidden = !active || list.dataset.categorySub !== family;
    });
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

  // The category-fact column appears only where a category has its own metric.
  function updateCategoryFactColumn(items) {
    const contextual = new Set(['suspension', 'motor', 'folding', 'triathlon']);
    const kinds = new Set(items.map((row) => row.dataset.capabilityKind).filter((kind) => contextual.has(kind)));
    catalogRoot.dataset.categoryFact = category?.value && kinds.size ? [...kinds].join(' ') : '';
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
      sort.value = defaultSort;
      return true;
    }
    return false;
  }

  function updateSortHeadings(items = rows.filter(rowMatches)) {
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
    const stage = (row) => row.dataset.stage === 'candidate' ? 1 : 0;
    return [...items].sort((a, b) => {
      if (key === 'name') return byName(a, b) * (direction === 'desc' ? -1 : 1);
      if (key === 'published') return searchScore(a) - searchScore(b) || stage(a) - stage(b) || compareNumbers(a.dataset.priceSort, b.dataset.priceSort) || compareNumbers(a.dataset.priceSortHigh, b.dataset.priceSortHigh) || byName(a, b) || (a.dataset.id ?? '').localeCompare(b.dataset.id ?? '');
      const field = key === 'tire' ? 'tireClearanceSort' : key === 'capability' ? 'capabilitySort' : 'priceSort';
      const value = (row) => key === 'price' || Number(row.dataset[field]) > 0 ? row.dataset[field] : null;
      // The first visible amount moves monotonically; ranges then order by their upper bound.
      return compareNumbers(value(a), value(b), direction)
        || (key === 'price' ? compareNumbers(a.dataset.priceSortHigh, b.dataset.priceSortHigh, direction) : compareNumbers(a.dataset.priceSort, b.dataset.priceSort))
        || byName(a, b) || (a.dataset.id ?? '').localeCompare(b.dataset.id ?? '');
    });
  }

  function openFilterPanel(field = '') {
    if (narrowLayout.matches) openFilterSheet();
    const target = field === 'price' ? price
      : field === 'drivetrain' ? drivetrainFilter
        : field === 'frame' ? frameFilter
          : field === 'category' ? categoryMinimum
            : field === 'weight' ? (activeType === 'frameset' ? frameWeight : completeWeight)
              : null;
    if (filterPanel instanceof HTMLDetailsElement && target instanceof HTMLElement && filterPanel.contains(target)) filterPanel.open = true;
    if (target instanceof HTMLElement) target.focus({ preventScroll: !narrowLayout.matches });
  }

  function clearTypedFilter(key) {
    const control = key === 'price' ? price
      : key === 'tire' ? tire
        : key === 'tire-layout' ? tireLayout
        : key === 'tire-unknown' ? tireUnknown
          : key === 'complete-weight' ? completeWeight
            : key === 'frame-weight' ? frameWeight
              : key === 'drivetrain' ? drivetrainFilter
                : key === 'shifting' ? shiftingFilter
                : key === 'frame' ? frameFilter
                  : key === 'category' ? categoryMinimum
                    : key === 'published' ? publishedFilter
                      : key === 'listing' ? listingFilter
                        : null;
    if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
      if (control.type === 'checkbox') control.checked = false;
      else control.value = '';
    }
    if (key === 'query' && search) search.value = '';
    if (key === 'family' && category) category.value = '';
    if (key === 'type') setType('', { update: false });
    if (key === 'brand') setBrand('', { update: false });
    if (key === 'price' && heldRegional) heldRegional.limit = null;
    if (key === 'listing' && heldRegional) heldRegional.listing = false;
  }

  function categoryChipLabel(value) {
    const button = categoryButtons.find((item) => item.dataset.categoryValue === value && item.closest('.category-tree'));
    return button ? button.textContent.trim() : value;
  }

  function typedFilterChips() {
    const chips = [];
    if (search?.value.trim()) chips.push(['query', `“${search.value.trim()}”`]);
    if (category?.value) chips.push(['family', categoryChipLabel(category.value)]);
    if (activeType) chips.push(['type', translate(activeType === 'frameset' ? 'Frame build' : 'Complete', locale)]);
    if (activeBrand) chips.push(['brand', brandLabels.get(activeBrand) ?? activeBrand]);
    if (price?.value) chips.push(['price', `${translate('Price', locale)} ≤ ${formatMoneyRange(Number(price.value), Number(price.value), priceCurrency(), locale)}${heldRegional?.destination ? ` · ${translate('not checked', locale)}` : ''}`]);
    else if (heldRegional?.limit) chips.push(['price', `${translate('Price', locale)} ≤ ${formatRequestedBudget(heldRegional.limit.amount, heldRegional.limit.currency, locale)} · ${translate('not checked', locale)}`]);
    if (tire?.value) chips.push(['tire', `Tire ≥ ${tire.value} mm`]);
    if (tireLayout?.value) chips.push(['tire-layout', tireLayout.value === 'single' ? 'Tire fit: 1×' : 'Tire fit: 2×']);
    if (tireUnknown?.checked && tire?.value) chips.push(['tire-unknown', 'Include unknown tire clearance']);
    if (completeWeight?.value) chips.push(['complete-weight', `Complete bike ≤ ${completeWeight.value} kg`]);
    if (frameWeight?.value) chips.push(['frame-weight', `Frame ≤ ${frameWeight.value} g`]);
    if (shiftingFilter?.value) chips.push(['shifting', translate(shiftingFilter.value === 'electronic' ? 'Electronic shifting' : 'Mechanical shifting', locale)]);
    if (drivetrainFilter?.value.trim()) chips.push(['drivetrain', `${translate('Drivetrain', locale)}: ${drivetrainFilter.value.trim()}`]);
    if (frameFilter?.value.trim()) chips.push(['frame', `${translate('Frame', locale)}: ${frameFilter.value.trim()}`]);
    if (categoryMinimum?.value) chips.push(['category', `${categoryMinimumLabel?.textContent || 'Category'} ≥ ${categoryMinimum.value}${categoryMinimumUnit?.textContent ? ` ${categoryMinimumUnit.textContent}` : ''}`]);
    if (publishedFilter?.checked) chips.push(['published', translate('Complete profiles only', locale)]);
    if (listingFilter?.checked) chips.push(['listing', `${translate('Listing', locale)}: ${countryName(activeCountry || 'CN', locale)}`]);
    else if (heldRegional?.listing) chips.push(['listing', `${translate('Listing', locale)}: ${heldRegional.country ? countryName(heldRegional.country, locale) : '?'} · ${translate('not checked', locale)}`]);
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
    if (activeFilterCount instanceof HTMLElement) {
      activeFilterCount.textContent = String(chips.length);
      activeFilterCount.hidden = chips.length === 0;
    }
    const activeKeys = new Set(chips.map(([key]) => key));
    filterHeadingButtons.forEach((button) => {
      const field = button.dataset.filterHeading;
      const active = field === 'weight'
        ? activeKeys.has('complete-weight') || activeKeys.has('frame-weight')
        : field === 'tire'
          ? activeKeys.has('tire') || activeKeys.has('tire-unknown') || activeKeys.has('tire-layout')
          : field === 'search' ? activeKeys.has('query') : activeKeys.has(field);
      button.classList.toggle('is-active', active);
    });
    shiftingChips.forEach((chip) => chip.setAttribute('aria-pressed', String((shiftingFilter?.value ?? '') === chip.dataset.shiftingChip)));
    return chips;
  }

  // Zero results offer the changes that restore the most bikes, without side effects.
  function countWithout(key) {
    const controls = { price, tire, 'tire-layout': tireLayout, 'tire-unknown': tireUnknown, 'complete-weight': completeWeight, 'frame-weight': frameWeight, drivetrain: drivetrainFilter, shifting: shiftingFilter, frame: frameFilter, category: categoryMinimum, published: publishedFilter, listing: listingFilter, query: search, family: category };
    const control = controls[key];
    const savedType = activeType;
    const savedBrand = activeBrand;
    const saved = control ? (control.type === 'checkbox' ? control.checked : control.value) : null;
    if (control) {
      if (control.type === 'checkbox') control.checked = false;
      else control.value = '';
    }
    if (key === 'type') activeType = '';
    if (key === 'brand') activeBrand = '';
    if (key === 'tire-layout') updateTireLayout();
    const total = rows.filter(rowMatches).length;
    if (control) {
      if (control.type === 'checkbox') control.checked = saved;
      else control.value = saved;
    }
    if (key === 'tire-layout') updateTireLayout();
    activeType = savedType;
    activeBrand = savedBrand;
    return total;
  }

  function renderEmptySuggestions(chips) {
    if (!(empty instanceof HTMLElement)) return;
    empty.replaceChildren(document.createTextNode(translate('No bikes match these filters.', locale)));
    const options = chips.map(([key, label]) => ({ key, label, total: countWithout(key) }))
      .filter((option) => option.total > 0).sort((a, b) => b.total - a.total).slice(0, 3);
    for (const option of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'text-button';
      button.textContent = `${translate('Remove', locale)} ${option.label} → ${option.total}`;
      button.addEventListener('click', () => {
        clearTypedFilter(option.key);
        updateCatalog({ historyMode: 'push' });
      });
      empty.append(button);
    }
  }

  function syncCatalogHeadTop() {
    // The table header sticks directly below the sticky site header.
    const header = document.querySelector('.site-header');
    const sticky = header instanceof HTMLElement && getComputedStyle(header).position === 'sticky';
    catalogRoot.style.setProperty('--catalog-head-top', `${sticky ? Math.round(header.offsetHeight) : 0}px`);
  }

  function updateCatalog({ historyMode = null } = {}) {
    updateTireLayout();
    const tireUnknownCleared = syncTireUnknownAvailability();
    const categoryFilterCleared = updateCategoryMinimumAvailability();
    const matching = rows.filter(rowMatches);
    const searching = searchTerms.length > 0;
    const defaultSortOption = sort?.querySelector('option[value="published-asc"]');
    if (defaultSortOption) defaultSortOption.textContent = translate(searching ? 'Best match' : 'Complete profiles first', locale);
    const sortCorrected = updateSortAvailability(matching);
    updateSortHeadings(matching);
    const sortStatus = catalogRoot.querySelector('[data-sort-status]');
    if (sortStatus) sortStatus.textContent = '';
    updateCategoryCounts();
    updateCategoryFactColumn(matching);
    const chips = renderFilterChips();
    syncCatalogHeadTop();
    const ordered = sortRows(rows);
    const matchingSet = new Set(matching);
    const existingOrder = [...(productList?.querySelectorAll(':scope > [data-product-row]') ?? [])];
    const alreadyOrdered = ordered.every((row, index) => existingOrder[index] === row);
    let visible = 0;
    ordered.forEach((row) => {
      const matches = matchingSet.has(row);
      row.hidden = !matches;
      const closeMatch = matches && searchScore(row) > 0;
      let matchLabel = row.querySelector('[data-search-close-match]');
      if (closeMatch && !matchLabel) {
        matchLabel = Object.assign(document.createElement('span'), { className: 'search-close-match', textContent: translate('Close match', locale) });
        matchLabel.dataset.searchCloseMatch = '';
        row.querySelector('.product-copy')?.append(matchLabel);
      }
      if (matchLabel) matchLabel.hidden = !closeMatch;
      if (matches) visible += 1;
      if (!alreadyOrdered) productList?.insertBefore(row, empty);
    });
    const visiblePublished = matching.filter((row) => row.dataset.stage !== 'candidate').length;
    const visibleLeads = visible - visiblePublished;
    const publishedFirst = sortModeParts().key === 'published' && !searching;
    const firstLead = publishedFirst && visiblePublished && visibleLeads ? ordered.find((row) => matchingSet.has(row) && row.dataset.stage === 'candidate') : null;
    leadDivider.hidden = !firstLead;
    if (firstLead) productList?.insertBefore(leadDivider, firstLead);
    if (resultCount) resultCount.textContent = String(visible);
    // The noun follows the count in every language (Russian has three plural forms).
    const resultNoun = catalogRoot.querySelector('[data-result-noun]');
    if (resultNoun) resultNoun.textContent = translate(`${visible} ${visible === 1 ? 'model' : 'models'}`, locale).replace(/^\s*\d+\s*/, '');
    if (sheetResultCount) sheetResultCount.textContent = translate(`Show ${visible} results`, locale);
    if (resultCoverage) {
      const visiblePublished = matching.filter((row) => row.dataset.stage !== 'candidate').length;
      const visibleLeads = visible - visiblePublished;
      resultCoverage.dataset.tooltipLines = JSON.stringify([translate(`${visiblePublished} complete profiles; ${visibleLeads} partial profiles. Missing facts remain unknown.`, locale)]);
    }
    if (resultContext) resultContext.textContent = activeBrand ? ` for ${brandLabels.get(activeBrand) ?? activeBrand}` : '';
    if (filterNotice) filterNotice.textContent = (categoryFilterCleared ? ' · incompatible category filter cleared' : '')
      + (heldRegional && (heldRegional.destination || heldRegional.currency || heldRegional.limit)
        ? ` · ${translate(regionalData ? 'This link’s budget currency is not supported, so the budget stays in the link but is not checked.'
          : 'Regional prices did not load, so China prices in CNY are shown. Your destination, currency and budget stay in the link; budgets are not checked until regional prices load.', locale)}` : '');
    if (empty) empty.hidden = visible !== 0;
    if (visible === 0) renderEmptySuggestions(chips);
    if (reset) reset.hidden = !hasFilters();
    if (showAllModels instanceof HTMLButtonElement) {
      // Offer only the hidden models that would match the current filters; hide the offer when none would.
      const hiddenMatching = allModelsVisible ? 0 : rows.filter((row) => !rowInScope(row) && matchesQuery(row) && matchesPrimaryContext(row) && matchesTypedFilters(row)).length;
      showAllModels.setAttribute('aria-pressed', String(allModelsVisible));
      showAllModels.hidden = !allModelsVisible && hiddenMatching === 0;
      showAllModels.textContent = translate(allModelsVisible ? 'Show the focused list' : `Show ${hiddenMatching} more ${hiddenMatching === 1 ? 'model' : 'models'}`, locale);
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
    const requestedView = params.get('view') ?? '';
    const requestedPrice = params.get('max') ?? '';
    const legacyMarket = Object.hasOwn(PRICE_MARKETS, params.get('market') ?? '') ? params.get('market') : '';
    const hasDestination = params.has('ship') || Boolean(legacyMarket);
    const resolved = hasDestination ? params.get('ship') === 'unknown' || ['eu', 'europe', 'north-america'].includes(legacyMarket)
      ? { country: '', reason: 'link' }
      : resolveDestination({ requested: params.get('ship'), legacyMarket }) : suggestedDestination;
    activeCountry = regionalData ? resolved.country : 'CN';
    destinationReason = resolved.reason;
    currencyChosen = PRICE_CURRENCIES.includes(params.get('currency')) || (!hasDestination && savedPreference.currencyChosen === true);
    activeCurrency = regionalData ? PRICE_CURRENCIES.includes(params.get('currency')) ? params.get('currency')
      : hasDestination ? PRICE_MARKETS[legacyMarket]?.currency ?? defaultCurrency(activeCountry)
      : PRICE_CURRENCIES.includes(savedPreference.currency) ? savedPreference.currency : defaultCurrency(activeCountry) : 'CNY';
    activeArea = activeCountry === 'US' ? ['contiguous', 'remote'].includes(params.get('area')) ? params.get('area')
      : !hasDestination && savedPreference.country === 'US' && ['contiguous', 'remote'].includes(savedPreference.area) ? savedPreference.area : '' : '';
    heldRegional = regionalData ? null : regionalHold(params, { destination: hasDestination && resolved.country !== 'CN', country: resolved.country });
    const limit = numberOrNull(requestedPrice);
    const inputCurrency = params.get('maxCurrency') || 'CNY';
    const convertedLimit = limit === null ? null : convertPrice(limit, inputCurrency, priceCurrency(), regionalData?.rates);
    // A budget no loaded rate can convert stays in the link unresolved instead of being dropped.
    if (regionalData && convertedLimit === null && limit !== null) heldRegional = regionalHold(params, { keys: BUDGET_KEYS });
    const legacyCapability = params.get('capability') ?? '';
    const [legacyKind, legacyThreshold] = legacyCapability.split(':');
    const requestedTire = params.get('tire') ?? (legacyKind === 'tire' ? legacyThreshold : '');
    const requestedTireUnknown = Boolean(requestedTire) && params.get('tireUnknown') === '1';
    const requestedCategoryMinimum = params.get('categoryMin') ?? (['suspension', 'motor'].includes(legacyKind) ? legacyThreshold : '');
    const requestedCategory = params.get('category') ?? '';
    const requestedBrand = params.get('brand') ?? '';
    const requestedType = params.get('type') ?? '';
    const requestedSort = params.get('sort') ?? defaultSort;
    const requestedPublished = params.get('published') === '1';
    const requestedListing = params.get('listing') === '1';
    const requestedBuildAllowance = params.get('build') ?? String(defaultBuildAllowance);
    const requestedBuildPreset = validSelectValue(buildPreset, params.get('buildPreset') ?? defaultBuildPreset, defaultBuildPreset);
    allModelsVisible = params.get('scope') === 'all';
    if (search) search.value = requestedSearch;
    if (price) price.value = heldRegional?.limit || convertedLimit === null ? '' : String(convertedLimit);
    if (tire) tire.value = requestedTire;
    if (tireLayout) tireLayout.value = validSelectValue(tireLayout, params.get('tireLayout') ?? '');
    if (tireUnknown instanceof HTMLInputElement) tireUnknown.checked = requestedTireUnknown;
    if (completeWeight) completeWeight.value = params.get('completeWeight') ?? '';
    if (frameWeight) frameWeight.value = params.get('frameWeight') ?? '';
    // Older links used the drivetrain text box for the shifting chips.
    const legacyShifting = !params.has('shifting') && shiftingValues.has((params.get('drivetrain') ?? '').trim().toLowerCase()) ? (params.get('drivetrain') ?? '').trim().toLowerCase() : '';
    const requestedShifting = legacyShifting || (shiftingValues.has(params.get('shifting') ?? '') ? params.get('shifting') : '');
    if (drivetrainFilter) drivetrainFilter.value = legacyShifting ? '' : params.get('drivetrain') ?? '';
    if (shiftingFilter instanceof HTMLInputElement) shiftingFilter.value = requestedShifting;
    if (frameFilter) frameFilter.value = params.get('frameFact') ?? '';
    if (category) category.value = validCategory(requestedCategory);
    if (publishedFilter instanceof HTMLInputElement) publishedFilter.checked = requestedPublished;
    updateFramesetPrices(requestedBuildAllowance, { presetId: requestedBuildPreset });
    // The listing filter exists only for a chosen non-China destination.
    if (listingFilter instanceof HTMLInputElement) listingFilter.checked = requestedListing && Boolean(regionalData) && activeCountry !== 'CN' && Boolean(activeCountry);
    setBrand(requestedBrand, { update: false });
    setType(requestedType, { update: false });
    setView(requestedView, { update: false });
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
      (params.get('tireLayout') ?? '') !== (tireLayout?.value ?? '') ||
      requestedTireUnknown !== Boolean(tireUnknown?.checked) ||
      requestedCategoryMinimum !== (categoryMinimum?.value ?? '') ||
      requestedCategory !== (category?.value ?? '') ||
      requestedBrand !== activeBrand ||
      requestedType !== activeType ||
      requestedListing !== Boolean(listingFilter?.checked) ||
      Boolean(legacyShifting) || (params.get('shifting') ?? '') !== requestedShifting ||
      requestedBuildAllowance !== String(currentBuildAllowance) ||
      (params.get('buildPreset') ?? defaultBuildPreset) !== currentBuildPreset ||
      (params.get('scope') ?? '') !== (allModelsVisible ? 'all' : '') ||
      Boolean(legacyCapability) ||
      Boolean(legacyMarket) ||
      requestedSort !== (sort?.value ?? defaultSort) ||
      requestedView !== (activeView === 'table' ? 'table' : '');
    if (corrected) updateFilterUrl('replace');
  }

  // Typing a new budget replaces a held one; it must run before the history-bound update.
  price?.addEventListener('input', () => { if (heldRegional) heldRegional.limit = null; });
  const typedInputs = [search, price, tire, completeWeight, frameWeight, drivetrainFilter, frameFilter, categoryMinimum];
  typedInputs.forEach((element) => bindHistoryInput(element, (historyMode) => updateCatalog({ historyMode })));
  [sort, tireUnknown, publishedFilter, listingFilter].forEach((element) => element?.addEventListener('change', () => updateCatalog({ historyMode: 'push' })));
  // The header search filters this catalog in place instead of reloading it.
  search?.closest('form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (narrowLayout.matches) catalogRoot.querySelector('.result-bar')?.scrollIntoView({ block: 'start' });
  });
  categoryButtons.forEach((button) => button.addEventListener('click', () => setCategory(button.dataset.categoryValue ?? '')));
  shiftingChips.forEach((chip) => chip.addEventListener('click', () => {
    if (!(shiftingFilter instanceof HTMLInputElement)) return;
    shiftingFilter.value = shiftingFilter.value === chip.dataset.shiftingChip ? '' : chip.dataset.shiftingChip ?? '';
    updateCatalog({ historyMode: 'push' });
  }));
  function updatePricePreference(control) {
    const previousCurrency = priceCurrency();
    if (control === destinationControl) {
      activeCountry = validCountry(destinationControl.value);
      activeArea = '';
      destinationReason = 'saved';
      if (!currencyChosen) activeCurrency = defaultCurrency(activeCountry);
    } else if (control === currencyControl) {
      activeCurrency = PRICE_CURRENCIES.includes(currencyControl.value) ? currencyControl.value : defaultCurrency(activeCountry);
      currencyChosen = true;
    }
    else {
      activeArea = ['contiguous', 'remote'].includes(areaControl.value) ? areaControl.value : '';
      destinationReason = 'saved';
    }
    // Persist only the user's manual shopping choices, never inferred location.
    const preference = { country: activeCountry, currency: activeCurrency, currencyChosen, area: activeArea };
    if (destinationReason === 'suggested' && control === currencyControl) {
      try { localStorage.setItem(preferenceStorageKey, JSON.stringify({ ...savedPreference, currency: activeCurrency, currencyChosen: true })); } catch { /* URL still works */ }
    } else {
      try { localStorage.setItem(preferenceStorageKey, JSON.stringify(preference)); } catch { /* URL still works */ }
    }
    if (price?.value) {
      const limit = convertPrice(Number(price.value), previousCurrency, priceCurrency(), regionalData?.rates);
      price.value = limit === null ? '' : String(limit);
    }
    updateRegionalPrices();
    updateCatalog({ historyMode: 'push' });
    if (selection?.length >= 2) renderComparison();
  }
  [destinationControl, currencyControl, areaControl].forEach((control) => control?.addEventListener('change', () => updatePricePreference(control)));
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
  function resetCatalog() {
    if (search) search.value = '';
    ['price', 'tire', 'tire-layout', 'tire-unknown', 'complete-weight', 'frame-weight', 'drivetrain', 'shifting', 'frame', 'category', 'published', 'listing'].forEach(clearTypedFilter);
    if (category) category.value = '';
    if (sort) sort.value = defaultSort;
    updateFramesetPrices(defaultBuildAllowance, { highlight: true, presetId: defaultBuildPreset });
    allModelsVisible = false;
    setBrand('', { update: false });
    setType('', { update: false });
    updateCatalog({ historyMode: 'push' });
  }
  reset?.addEventListener('click', resetCatalog);
  catalogRoot.querySelector('[data-reset-all]')?.addEventListener('click', resetCatalog);
  filterHeadingButtons.forEach((button) => button.addEventListener('click', () => {
    const field = button.dataset.filterHeading ?? '';
    if (field === 'search') search?.focus({ preventScroll: true });
    else if (field === 'tire') {
      if (narrowLayout.matches) openFilterSheet();
      tire?.focus({ preventScroll: !narrowLayout.matches });
    } else openFilterPanel(field);
  }));
  syncCatalogHeadTop();
  const siteHeader = document.querySelector('.site-header');
  if ('ResizeObserver' in window && siteHeader instanceof HTMLElement) new ResizeObserver(syncCatalogHeadTop).observe(siteHeader);
  addEventListener('resize', syncCatalogHeadTop);
  showAllModels?.addEventListener('click', () => {
    allModelsVisible = !allModelsVisible;
    updateCatalog({ historyMode: 'push' });
  });

  // Narrow layouts show the filter rail as a sheet; the page behind is inert.
  let sheetReturnFocus = null;
  const inertTargets = () => [document.querySelector('.site-header'), document.querySelector('.site-footer'), catalogRoot.querySelector('.catalog-main'), document.querySelector('[data-compare-tray]')].filter(Boolean);
  function openFilterSheet() {
    if (!(filterSheet instanceof HTMLElement) || filterSheet.classList.contains('is-open')) return;
    sheetReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    filterSheet.classList.add('is-open');
    filterSheet.setAttribute('role', 'dialog');
    filterSheet.setAttribute('aria-modal', 'true');
    document.body.classList.add('has-open-sheet');
    inertTargets().forEach((element) => { element.inert = true; });
    sheetToggles.forEach((toggle) => toggle.setAttribute('aria-expanded', 'true'));
    requestAnimationFrame(() => filterSheet.querySelector('button, input, a[href], summary')?.focus({ preventScroll: true }));
  }
  function closeFilterSheet({ restoreFocus = true } = {}) {
    if (!(filterSheet instanceof HTMLElement) || !filterSheet.classList.contains('is-open')) return;
    filterSheet.classList.remove('is-open');
    filterSheet.removeAttribute('role');
    filterSheet.removeAttribute('aria-modal');
    document.body.classList.remove('has-open-sheet');
    inertTargets().forEach((element) => { element.inert = false; });
    sheetToggles.forEach((toggle) => toggle.setAttribute('aria-expanded', 'false'));
    if (restoreFocus) sheetReturnFocus?.focus({ preventScroll: true });
    sheetReturnFocus = null;
  }
  sheetToggles.forEach((toggle) => {
    toggle.hidden = false;
    toggle.addEventListener('click', () => openFilterSheet());
  });
  catalogRoot.querySelectorAll('[data-filter-sheet-close]').forEach((button) => button.addEventListener('click', () => closeFilterSheet()));
  narrowLayout.addEventListener?.('change', () => {
    if (!narrowLayout.matches) {
      closeFilterSheet({ restoreFocus: false });
      setSettingsOpen(false);
    }
  });

  // Price and build settings open from the header chip.
  function setSettingsOpen(open, { restoreFocus = false } = {}) {
    if (!(settingsPanel instanceof HTMLElement) || !(settingsToggle instanceof HTMLButtonElement)) return;
    settingsPanel.hidden = !open;
    settingsToggle.setAttribute('aria-expanded', String(open));
    const modal = open && narrowLayout.matches;
    if (modal) settingsPanel.setAttribute('aria-modal', 'true');
    else settingsPanel.removeAttribute('aria-modal');
    const outside = [document.querySelector('main'), document.querySelector('.site-footer'), document.querySelector('[data-compare-tray]'), ...document.querySelectorAll('.header-inner > :not(.price-settings)')].filter(Boolean);
    outside.forEach((element) => { element.inert = modal; });
    document.body.classList.toggle('has-open-settings', open);
    if (open) requestAnimationFrame(() => settingsPanel.querySelector('select, input, button:not([data-settings-close])')?.focus({ preventScroll: true }));
    else if (restoreFocus) settingsToggle.focus({ preventScroll: true });
  }
  settingsToggle?.addEventListener('click', () => setSettingsOpen(settingsPanel?.hidden ?? false));
  document.querySelector('[data-settings-close]')?.addEventListener('click', () => setSettingsOpen(false, { restoreFocus: true }));
  document.addEventListener('pointerdown', (event) => {
    if (!(settingsPanel instanceof HTMLElement) || settingsPanel.hidden) return;
    const target = event.target;
    if (target instanceof Node && !settingsPanel.contains(target) && !settingsToggle?.contains(target) && !(target instanceof Element && target.closest('#shared-tooltip'))) setSettingsOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;
    const panel = filterSheet?.classList.contains('is-open') ? filterSheet : narrowLayout.matches && settingsPanel && !settingsPanel.hidden ? settingsPanel : null;
    if (event.key === 'Tab' && panel) {
      const focusable = [...panel.querySelectorAll('a[href], button, input, select, summary, [tabindex="0"]')].filter((item) => !item.disabled && item.getClientRects().length);
      const next = event.shiftKey ? focusable.at(-1) : focusable[0];
      if (next && (event.shiftKey ? document.activeElement === focusable[0] : document.activeElement === focusable.at(-1))) { next.focus(); event.preventDefault(); }
      return;
    }
    if (event.key !== 'Escape') return;
    if (settingsPanel instanceof HTMLElement && !settingsPanel.hidden) {
      setSettingsOpen(false, { restoreFocus: true });
      event.preventDefault();
    } else if (filterSheet?.classList.contains('is-open')) {
      closeFilterSheet();
      event.preventDefault();
    }
  });

  addEventListener('popstate', () => {
    restoreFromParams(new URLSearchParams(location.search));
    const params = new URLSearchParams(location.search);
    const ids = normalizeSelection(params.get('compare'), { validIds: byId });
    selection = ids;
    startingPoint = params.get('start') ?? '';
    if (compareDifferences instanceof HTMLInputElement) compareDifferences.checked = params.get('diff') === '1';
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
  const compareHeadingCount = catalogRoot.querySelector('[data-compare-heading-count]');
  const compareDifferences = catalogRoot.querySelector('[data-compare-differences]');
  let selection = readStoredSelection().filter((id) => byId.has(id));
  let startingPoint = initialParams.get('start') ?? '';

  function syncBoxes() {
    compareBoxes.forEach((box) => {
      const selected = selection.includes(box.dataset.compareId);
      box.checked = selected;
      box.disabled = !selected && selection.length >= comparisonSelectionLimit;
      box.closest('[data-product-row]')?.classList.toggle('is-selected', selected);
    });
  }

  // The planner opens in the catalog's display currency; its yuan records stay yuan.
  function syncBuildLinkCurrency() {
    if (!(openBuildLink instanceof HTMLAnchorElement) || openBuildLink.hidden) return;
    const target = new URL(openBuildLink.href, location.href);
    target.searchParams.set('currency', priceCurrency());
    openBuildLink.href = `${target.pathname}${target.search}`;
  }
  ['pointerdown', 'focus', 'click'].forEach((type) => openBuildLink?.addEventListener(type, syncBuildLinkCurrency));

  function renderTray() {
    writeStoredSelection(selection);
    if (compareCount) compareCount.textContent = String(selection.length);
    if (selectionLabel) selectionLabel.textContent = selection.length >= comparisonSelectionLimit
      ? ` selected · ${comparisonSelectionLimit}-bike limit reached`
      : selection.length === 1 ? ' selected · choose one more to compare' : ' selected';
    if (selectionNames) {
      selectionNames.replaceChildren(...selection.map((id) => {
        const item = byId.get(id);
        const chip = element('span', 'tray-item');
        if (item?.image) {
          const image = document.createElement('img');
          image.src = item.image;
          image.alt = '';
          image.width = 42;
          image.height = 28;
          image.loading = 'lazy';
          if (item.imageRemote) image.referrerPolicy = 'no-referrer';
          image.addEventListener('error', () => image.remove());
          chip.append(image);
        }
        const label = [item?.brand, item?.name].filter(Boolean).join(' ');
        chip.append(element('span', '', item?.name ?? id));
        const remove = element('button', 'tray-remove', '×');
        remove.type = 'button';
        remove.setAttribute('aria-label', `Remove ${label}`);
        remove.addEventListener('click', () => setSelection(selection.filter((value) => value !== id)));
        chip.append(remove);
        return chip;
      }));
    }
    compareTray?.classList.toggle('is-visible', selection.length > 0);
    if (openCompareButton instanceof HTMLButtonElement) {
      openCompareButton.hidden = selection.length < 2;
      openCompareButton.disabled = selection.length < 2;
      openCompareButton.textContent = `${translate('Compare', locale)} ${selection.length}`;
    }
    if (openBuildLink instanceof HTMLAnchorElement) {
      const item = selection.length === 1 ? byId.get(selection[0]) : null;
      openBuildLink.hidden = !item?.builderEligible;
      if (item?.builderEligible) {
        const target = new URL(`${document.body.dataset.base || ''}/build/`, location.origin);
        target.searchParams.set('base', item.buildBaseId || item.id);
        openBuildLink.href = `${target.pathname}${target.search}`;
        syncBuildLinkCurrency();
        openBuildLink.textContent = item.buildBaseKind === 'frameset' ? 'Build this frame' : 'Modify this bike';
        openBuildLink.setAttribute('aria-label', `${openBuildLink.textContent}: ${item.name}`);
      }
    }
    syncBoxes();
    if (selection.length < 2 && comparePanel && !comparePanel.hidden) closeComparison();
  }

  function setSelection(next) {
    const normalized = normalizeSelection(next, { validIds: byId });
    if (normalized.join(',') !== selection.join(',')) startingPoint = '';
    selection = normalized;
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
    const type = element('span', 'compare-type', item.type);
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
    const remove = element('button', 'remove-compare', '×');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove ${label}`);
    remove.addEventListener('click', () => setSelection(selection.filter((id) => id !== item.id)));
    orderControls.append(moveLeft, moveRight, remove);
    copy.append(title, type, orderControls);
    if (item.image) {
      const imageLink = element(item.url ? 'a' : 'span', 'compare-image-link');
      if (item.url) imageLink.href = title.href;
      else imageLink.tabIndex = 0;
      imageLink.dataset.imagePreviewId = item.id;
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
      imageLink.append(image);
      head.append(imageLink);
      enableImageFailureHandling(image);
      bindImagePreview(imageLink);
    } else {
      head.classList.add('has-no-image');
    }
    head.append(copy);
    return head;
  }

  function valueCell(primary, secondary = '', modifier = '') {
    const cell = element('div', `compare-value${modifier ? ` ${modifier}` : ''}`);
    const strong = element('strong', '', primary || '—');
    cell.append(strong);
    if (secondary) cell.append(element('small', '', secondary));
    return cell;
  }

  // Grouped native table: one row per field, one group per buyer question.
  function comparisonGrid(items, groups, includeHeaders = false) {
    const scroll = element('div', 'compare-scroll');
    scroll.tabIndex = 0;
    scroll.setAttribute('aria-label', translate('Bike comparison table; scroll horizontally to see every selected bike', locale));
    const table = element('table', 'compare-grid');
    table.style.setProperty('--compare-count', String(items.length));
    table.setAttribute('aria-label', translate(includeHeaders ? 'Bike comparison' : 'Detailed bike comparison', locale));
    const head = element('thead');
    const headerRow = element('tr');
    const corner = element('th', 'compare-label', translate('Bike', locale));
    corner.scope = 'col';
    headerRow.append(corner);
    items.forEach((item, index) => {
      const header = element('th');
      header.scope = 'col';
      header.append(includeHeaders ? productHeader(item, index, items.length) : element('span', '', [item.brand, item.name].filter(Boolean).join(' ')));
      headerRow.append(header);
    });
    head.append(headerRow);
    table.append(head);
    for (const [groupLabel, fields] of groups) {
      if (!fields.length) continue;
      const body = element('tbody');
      if (groupLabel) {
        const groupRow = element('tr', 'compare-group');
        const groupHeader = element('th', '', translate(groupLabel, locale));
        groupHeader.scope = 'rowgroup';
        groupHeader.colSpan = items.length + 1;
        groupRow.append(groupHeader);
        body.append(groupRow);
      }
      let differing = 0;
      fields.forEach(([label, render, key = '', sameKey = null]) => {
        const row = element('tr');
        const header = element('th', 'compare-label', translate(label, locale));
        header.scope = 'row';
        row.append(header);
        const values = items.map((item) => {
          const cell = element('td');
          cell.append(render(item));
          row.append(cell);
          // Formatting, spacing and case never count as a difference.
          return String(sameKey ? sameKey(item) : cell.textContent).replace(/\s+/g, ' ').trim().toLowerCase();
        });
        // Rows where every bike has the same value can be hidden; nothing is ranked.
        // A row that is unknown for every bike is also identical.
        if (new Set(values).size === 1) row.classList.add('is-same');
        else differing += 1;
        if (key) row.dataset.compareField = key;
        body.append(row);
      });
      // A group heading disappears with its rows in differences-only mode.
      if (!differing) body.classList.add('is-same');
      table.append(body);
    }
    scroll.append(table);
    return scroll;
  }

  function comparePrice(item) {
    const cell = valueCell(item.price, item.priceState);
    if ((priceTooltipContent.get(item.id)?.length || item.priceDetails)) {
      const button = element('button', 'price-button', item.price);
      button.type = 'button';
      button.dataset.priceDetails = item.id;
      button.dataset.evidenceHref = `${item.url}#source-records`;
      button.dataset.evidenceLabel = 'Full price record and conditions';
      button.setAttribute('aria-expanded', 'false');
      cell.firstElementChild.replaceWith(button);
      bindTooltip(button);
    }
    if (item.priceTone === 'attention') cell.classList.add('is-attention');
    return cell;
  }

  function renderComparison({ historyMode = 'replace' } = {}) {
    const items = selection.map((id) => byId.get(id)).filter(Boolean);
    if (!compareContent || items.length < 2) return;
    closeImagePreview();
    const metricKinds = [...new Set(items.map((item) => item.categoryMetricKind))];
    // Discipline and tire metrics repeat the category and clearance rows.
    const metricFields = metricKinds.filter((kind) => !['tire', 'discipline'].includes(kind)).map((kind) => {
      const sample = items.find((item) => item.categoryMetricKind === kind);
      return [sample?.categoryMetricLabel ?? 'Category fact', (item) => item.categoryMetricKind === kind
        ? valueCell(item.categoryMetric, item.categoryMetricDetails)
        : valueCell('—'), `metric-${kind}`];
    });
    const hasValue = (key) => items.some((item) => item[key] && item[key] !== '—');
    const clearance = (item) => {
      const parts = clearanceParts(catalogClearance(item, tireLayout?.value).label);
      const cell = valueCell(parts.main, parts.sub);
      // A transcript-checked reviewer fit observation stays visibly separate from the maximum.
      if (item.tireClearanceFieldReport) cell.append(element('small', 'compare-field-report', translate(item.tireClearanceFieldReport, locale)));
      return cell;
    };
    // Complete-bike and frame-only weights never share a row.
    const weightKindOf = (item) => item.weightKind || (!item.weight || item.weight === '—' ? '' : / (?:frame|Rahmen|车架)$/.test(item.weight) ? 'frame' : 'complete');
    const weightBy = (kind) => (item) => {
      if (weightKindOf(item) !== kind) return valueCell('—');
      const parts = weightParts(item.weight, item.kind, item.weightBasis);
      return valueCell(parts.main, parts.sub === 'frame' ? '' : parts.sub);
    };
    const hasWeight = (kind) => items.some((item) => weightKindOf(item) === kind);
    const geometryItems = items.filter((item) => item.geometryId);
    const geometryLink = (item) => {
      const cell = element('div', 'compare-value');
      if (item.id !== items[0].id) return cell;
      const link = element('a', '', translate('Compare stack and reach', locale));
      const target = new URL(`${document.body.dataset.base || ''}/geometry/`, location.origin);
      target.searchParams.set('a', geometryItems[0].geometryId);
      if (geometryItems[1]) target.searchParams.set('b', geometryItems[1].geometryId);
      link.href = `${target.pathname}${target.search}`;
      cell.append(link);
      return cell;
    };
    // Research profiles may lack a handlebar note; that alone is not a category difference.
    const everyHandlebar = items.every((item) => / · [a-z]+-bar$/.test(item.category ?? ''));
    const categoryKey = (item) => everyHandlebar ? item.category : String(item.category ?? '').replace(/ · [a-z]+-bar$/, '');
    const groups = [
      ['Cost', [['Full-bike price', comparePrice, 'price']]],
      ['Use & fit', [
        ['Category', (item) => valueCell(item.category), 'category', categoryKey],
        ...(hasValue('tireClearance') ? [['Tire clearance', clearance, 'tire']] : []),
        ...metricFields
      ]],
      ['Equipment & weight', [
        ...(hasValue('drivetrain') ? [['Drivetrain', (item) => item.kind === 'frameset' ? valueCell(translate('frame only', locale), item.type === 'Frame build' ? translate('priced with your build plan', locale) : '', 'is-muted') : valueCell(item.drivetrain, item.drivetrainSubline), 'drivetrain']] : []),
        ...(hasWeight('complete') ? [['Weight · complete bike', weightBy('complete'), 'weight-complete']] : []),
        ...(hasWeight('frame') ? [['Weight · frame', weightBy('frame'), 'weight-frame']] : [])
      ]],
      ['Frame & standards', [
        ...(hasValue('frame') ? [['Frame', (item) => valueCell(item.frame), 'frame']] : [])
      ]],
      // The geometry link is navigation, not a fact, so differences mode keeps it.
      ...(geometryItems.length >= 1 ? [['', [['Geometry', geometryLink, 'geometry', (item) => item.id]]]] : [])
    ];
    const assessmentFields = [
      ...(hasValue('bestFor') ? [['Best for', (item) => valueCell(item.bestFor)]] : []),
      ...(hasValue('verdict') ? [['Verdict', (item) => valueCell(item.verdict)]] : []),
      ...(hasValue('caveats') ? [['Buying checks', (item) => valueCell(item.caveats && item.caveats !== 'None recorded' ? item.caveats : '—')]] : [])
    ];
    const secondaryFields = [
      ...(hasValue('internalFrameStorage') ? [['Internal frame storage', (item) => valueCell(item.internalFrameStorage)]] : []),
      ...(hasValue('mounts') ? [['Mounts', (item) => valueCell(item.mounts)]] : []),
      ...(hasValue('manufacturing') ? [['Manufacturing', (item) => valueCell(item.manufacturing)]] : []),
      ...(hasValue('availability') ? [['Availability', (item) => valueCell(item.availability)]] : [])
    ];
    const families = new Set(items.map((item) => item.family ?? '').filter(Boolean));
    const mixedCategories = metricKinds.filter((kind) => !['tire', 'discipline'].includes(kind)).length > 1 || families.size > 1;
    const start = startingPoint ? document.querySelector(`[data-curated-group="${CSS.escape(startingPoint)}"]`) : null;
    const notes = [
      start?.dataset.criteria ? `${translate('Starting point', locale)}: ${start.querySelector('strong')?.textContent?.trim() ?? ''} · ${translate('Criteria', locale)}: ${translate(start.dataset.criteria, locale)}` : '',
      translate(mixedCategories
        ? 'These bikes serve different categories. Category-specific facts are separated below and should not be ranked against one another.'
        : '', locale),
      translate('Prices exclude shipping and import unless marked Delivered.', locale)
    ].filter(Boolean);
    const context = element('p', `compare-context${mixedCategories ? ' is-warning' : ''}`, notes.join(' '));
    const orderHint = element('p', 'compare-order-hint sr-only', 'Use the arrow controls to reorder columns. The comparison link keeps this order.');
    const grid = comparisonGrid(items, groups, true);
    const differencesOnly = Boolean(compareDifferences?.checked);
    compareContent.classList.toggle('is-differences-only', differencesOnly);
    compareContent.replaceChildren(context, orderHint, grid);
    for (const [label, fields] of [['Trade-offs and buying checks', assessmentFields], ['More details', secondaryFields]]) {
      if (!fields.length) continue;
      const section = element('details', 'compare-more');
      const sectionGrid = comparisonGrid(items, [['', fields]]);
      section.append(element('summary', '', translate(label, locale)), sectionGrid);
      // A disclosure whose rows are all identical has nothing to show in this mode.
      if (!sectionGrid.querySelector('tr:not(.is-same) td')) section.classList.add('is-same');
      compareContent.append(section);
    }
    const hiddenRows = [...compareContent.querySelectorAll('tbody > tr.is-same')].filter((row) => row.querySelector('td')).length;
    const sameStatus = element('p', 'compare-same-status', !differencesOnly ? ''
      : hiddenRows ? translate(hiddenRows === 1 ? '1 identical row hidden' : `${hiddenRows} identical rows hidden`, locale)
        : translate('Every compared row differs.', locale));
    sameStatus.setAttribute('role', 'status');
    sameStatus.hidden = !differencesOnly;
    compareContent.insertBefore(sameStatus, grid);
    if (compareHeadingCount) compareHeadingCount.textContent = `${items.length} / ${comparisonSelectionLimit}`;

    const next = new URL(location.href);
    next.searchParams.set('compare', selection.join(','));
    next.searchParams.delete('market');
    next.searchParams.set('ship', activeCountry || 'unknown');
    next.searchParams.set('currency', activeCurrency);
    setParam(next, 'area', activeCountry === 'US' ? activeArea : '');
    if (heldRegional) writeRegionalHold(next, heldRegional);
    setParam(next, 'start', startingPoint);
    setParam(next, 'diff', compareDifferences?.checked ? '1' : '');
    try { history[historyMode === 'push' ? 'pushState' : 'replaceState'](null, '', `${next.pathname}${next.search}#compare`); } catch { /* normal navigation origin required */ }
    updateModelLinks();
  }

  function openComparison({ scroll = true, focus = scroll } = {}) {
    if (!comparePanel || selection.length < 2) return;
    const wasOpen = !comparePanel.hidden;
    comparePanel.hidden = false;
    compareTray?.classList.add('is-comparing');
    renderComparison();
    if (!wasOpen) sendComparisonOpenedEvent({ comparisonCount: selection.length });
    if (focus && comparePanel instanceof HTMLElement) comparePanel.focus({ preventScroll: true });
    if (scroll) comparePanel.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function closeComparison({ restoreFocus = false } = {}) {
    closeImagePreview();
    if (comparePanel) comparePanel.hidden = true;
    compareTray?.classList.remove('is-comparing');
    startingPoint = '';
    const next = new URL(location.href);
    next.searchParams.delete('compare');
    next.searchParams.delete('start');
    next.searchParams.delete('diff');
    try { history.replaceState(null, '', `${next.pathname}${next.search}${location.hash === '#compare' ? '' : location.hash}`); } catch { /* normal navigation origin required */ }
    if (restoreFocus && openCompareButton instanceof HTMLButtonElement && !openCompareButton.disabled) openCompareButton.focus({ preventScroll: true });
  }

  openCompareButton?.addEventListener('click', () => openComparison());
  document.querySelector('[data-clear-selection]')?.addEventListener('click', () => setSelection([]));
  catalogRoot.querySelector('[data-close-compare]')?.addEventListener('click', () => closeComparison({ restoreFocus: true }));
  tireLayout?.addEventListener('change', () => { updateCatalog({ historyMode: 'push' }); if (comparePanel && !comparePanel.hidden) renderComparison(); });
  // Back and Forward restore the differences mode like any other comparison state.
  compareDifferences?.addEventListener('change', () => { if (selection.length >= 2) renderComparison({ historyMode: 'push' }); });
  catalogRoot.querySelector('[data-copy-comparison]')?.addEventListener('click', async (event) => {
    if (selection.length >= 2) renderComparison();
    if (event.currentTarget instanceof HTMLButtonElement) {
      showCopyFeedback(event.currentTarget, await copyText(location.href));
    }
  });

  const querySelection = normalizeSelection(initialParams.get('compare'), { validIds: byId });
  if (initialParams.has('compare')) selection = querySelection;
  if (compareDifferences instanceof HTMLInputElement) compareDifferences.checked = initialParams.get('diff') === '1';
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
      updateSettingsSummary();
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

(async () => {
  const root = document.querySelector('[data-bike-builder]');
  const dataNode = document.querySelector('#build-configurator-data');
  if (!(root instanceof HTMLFieldSetElement) || !(dataNode instanceof HTMLScriptElement)) return;

  let data;
  try { data = JSON.parse(dataNode.textContent || '{}'); } catch { return; }
  if (data?.schemaVersion !== 2 || !Array.isArray(data.bases) || !Array.isArray(data.parts)) return;

  let presentation;
  try { presentation = await import('./builder-presentation.js'); } catch { return; }
  const { buildBaseFactRows, buildCompatibilityMessages, buildComposition, buildSlotState, formatBuildWeight: formatWeight } = presentation;

  const storageKey = 'china-bike-builder-v2';
  const lang = document.documentElement.lang || 'en';
  // Recorded planner prices are yuan observations. Each buyer-entered amount keeps the
  // currency it was typed in; other currencies are dated planning conversions, never quotes.
  const rates = data.rates && typeof data.rates === 'object' ? data.rates : null;
  const currencies = buildCurrencies(rates);
  const currencySelect = root.querySelector('[data-build-currency]');
  const currencyNote = root.querySelector('[data-build-currency-note]');
  if (currencySelect instanceof HTMLSelectElement) {
    for (const option of currencySelect.options) option.hidden = option.disabled = !currencies.includes(option.value);
  }
  function shownAmount(amount, currency) {
    if (amount === null || !currency) return null;
    if (currency === state.currency) return { value: amount, converted: false };
    const value = convertPrice(amount, currency, state.currency, { per_eur: rates?.perEur });
    return value === null ? null : { value, converted: true };
  }
  const formatMoney = (low, high = low, approximate = false) => formatMoneyRange(low, high, state.currency, lang, { approximate });
  const nativeMoney = (amount, currency) => formatMoneyRange(amount, amount, currency, lang, { exact: true });
  // A new amount takes the planner currency. Editing keeps the amount's own currency, even
  // while the field is briefly empty; a field left empty forgets it when it loses focus.
  function setMoney(entry, value) {
    if (value !== '' && !entry.priceCurrency) entry.priceCurrency = state.currency;
    entry.price = value;
  }
  function endMoneyEdit(entry) {
    if (entry.price !== '' || !entry.priceCurrency) return;
    entry.priceCurrency = '';
    render();
  }
  const currencyGlyphs = { CNY: '¥', EUR: '€', USD: '$', GBP: '£', CAD: '$', MXN: '$' };
  function savedDisplayCurrency() {
    try { return JSON.parse(localStorage.getItem(deliveryPreferenceStorageKey) ?? '{}')?.currency ?? ''; } catch { return ''; }
  }
  const bases = new Map(data.bases.map((base) => [base.id, base]));
  const parts = new Map(data.parts.map((part) => [part.id, part]));
  const slots = Array.isArray(data.slots) ? data.slots : [];
  const baseSelect = root.querySelector('[data-build-base]');
  const baseLink = root.querySelector('[data-build-base-link]');
  const baseFacts = root.querySelector('[data-build-base-facts]');
  const startingPointWarning = root.querySelector('[data-build-starting-point-warning]');
  if (baseSelect instanceof HTMLSelectElement && !baseSelect.querySelector('option[value=""]')) {
    const pendingOption = document.createElement('option');
    pendingOption.value = '';
    pendingOption.disabled = true;
    pendingOption.textContent = translate('Choose an exact starting point', document.documentElement.lang);
    baseSelect.prepend(pendingOption);
  }
  const baseCustom = root.querySelector('[data-build-base-custom]');
  const basePrice = root.querySelector('[data-build-base-price]');
  const basePriceCurrency = root.querySelector('[data-build-base-price-currency]');
  const baseWeight = root.querySelector('[data-build-base-weight]');
  const basePriceField = root.querySelector('[data-build-base-price-field]');
  const baseWeightField = root.querySelector('[data-build-base-weight-field]');
  const packageWeightField = root.querySelector('[data-build-package-weight-field]');
  const packageWeight = root.querySelector('[data-build-package-weight]');
  if (!(packageWeightField instanceof HTMLElement) || !(packageWeight instanceof HTMLInputElement)) return;

  const totalPrice = root.querySelector('[data-build-total-price]');
  const totalWeight = root.querySelector('[data-build-total-weight]');
  const completeness = root.querySelector('[data-build-completeness]');
  const compatibility = root.querySelector('[data-build-compatibility]');
  const buildName = root.querySelector('[data-build-name]');
  const summaryKicker = root.querySelector('[data-build-summary-kicker]');
  const priceLabel = root.querySelector('[data-build-total-label]');
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
  let state = restoreBuildState(data, new URLSearchParams(location.search), readStoredState(), { preferredCurrency: savedDisplayCurrency() });
  // A shared link becomes the visitor's draft only after an edit; reading it in another currency is not an edit.
  let draftOwned = false;

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
    return buildCompatibilityMessages(base, covered, selectedPart, state.selections);
  }

  function updateUrl(historyMode = 'replace') {
    const target = new URL(location.href);
    const base = bases.get(state.baseId);
    const defaults = defaultSelections(base);
    if (state.baseId) target.searchParams.set('base', state.requestedBaseId ?? state.baseId);
    target.searchParams.delete('frame');
    // The link names its currency; its unmarked amounts stay yuan, so older links keep their meaning.
    target.searchParams.set('currency', state.currency);
    for (const [field, value, recorded] of [
      ['basePrice', moneyInputParam(state.baseCustom.price, state.baseCustom.priceCurrency), numberOrNull(base?.priceLow)],
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
      for (const [field, value] of [['price', moneyInputParam(custom.price, custom.priceCurrency)], ['weight', custom.weight], ['removed', custom.removedWeight]]) {
        const key = `${field}-${slot}`;
        const recordedValue = field === 'price' ? numberOrNull(part?.priceCny) : field === 'weight' ? numberOrNull(part?.weightG) : null;
        const relevant = !['included', 'in-base'].includes(selection) && (field === 'removed' ? base?.kind === 'complete-bike' : field === 'price' || selection === 'custom' || recordedValue === null);
        if (relevant && value !== '') target.searchParams.set(key, value);
        else target.searchParams.delete(key);
      }
    }
    try { history[historyMode === 'push' ? 'pushState' : 'replaceState'](null, '', `${target.pathname}${target.search}${target.hash}`); } catch { /* normal navigation origin required */ }
  }

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* URL remains shareable */ }
  }

  // The map and composition bars restate the row results; rows remain the full text record.
  const buildStateText = { known: 'priced', partial: 'needs one input', open: 'needs price and weight', included: 'included' };
  const hotspots = [...root.querySelectorAll('[data-build-hotspot]')];
  function renderBuildVisual(base, isComplete, model) {
    const lang = document.documentElement.lang;
    const stateFor = new Map(model.slots.map((entry) => [entry.slot, entry.state]));
    hotspots.forEach((hotspot) => {
      const id = hotspot.dataset.buildHotspot;
      const label = id === 'frame'
        ? translate(isComplete ? 'Base bike' : 'Frameset', lang)
        : rows.get(id)?.querySelector('h2')?.textContent ?? id;
      const next = id === 'frame' ? 'base' : stateFor.get(id) ?? 'open';
      hotspot.dataset.state = next;
      hotspot.querySelector('.build-hotspot-label').textContent = label;
      hotspot.setAttribute('aria-label', `${label}: ${translate(buildStateText[next] ?? (model.basePrice === null ? 'needs price and weight' : 'priced'), lang)}`);
    });
    root.querySelectorAll('[data-build-state-count]').forEach((count) => {
      count.textContent = String(model.slots.filter((entry) => entry.state === count.dataset.buildStateCount).length);
    });
    const composition = buildComposition(model);
    for (const kind of ['price', 'weight']) {
      const figure = root.querySelector(`[data-build-composition="${kind}"]`);
      if (!(figure instanceof HTMLElement)) continue;
      const summary = composition[kind];
      figure.hidden = !summary;
      if (!summary) continue;
      const format = kind === 'price'
        ? (segment) => formatMoney(segment.value, Math.max(segment.value, segment.high ?? segment.value), segment.approximate)
        : (segment) => formatWeight(segment.value);
      summary.segments.forEach((segment) => {
        const bar = figure.querySelector(`.composition-segment[data-group="${segment.id}"]`);
        if (bar instanceof HTMLElement) { bar.style.flexGrow = String(segment.value); bar.hidden = !(segment.value > 0); }
        const item = figure.querySelector(`li[data-group="${segment.id}"]`);
        if (!(item instanceof HTMLElement)) return;
        const name = item.querySelector('[data-composition-label]');
        if (name && segment.id === 'base') name.textContent = translate(segment.label, lang);
        const value = item.querySelector('[data-composition-value]');
        if (value) value.textContent = segment.value > 0 ? format(segment) : '—';
        const unknown = item.querySelector('[data-composition-unknown]');
        if (unknown instanceof HTMLElement) {
          unknown.hidden = segment.unknown === 0;
          unknown.textContent = translate(`${segment.unknown} unknown`, lang);
        }
      });
    }
  }
  hotspots.forEach((hotspot) => hotspot.addEventListener('click', () => {
    const id = hotspot.dataset.buildHotspot;
    const row = id === 'frame' ? root.querySelector('.builder-frame-row') : rows.get(id);
    if (!(row instanceof HTMLElement)) return;
    const control = row.querySelector('select:not(:disabled), input:not([hidden]):not(:disabled)');
    row.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    (control instanceof HTMLElement && control.offsetParent !== null ? control : row).focus({ preventScroll: true });
    row.classList.remove('is-located');
    void row.offsetWidth;
    row.classList.add('is-located');
  }));
  // Hovering or focusing a row highlights its place on the map.
  rows.forEach((row, slot) => {
    const hotspot = hotspots.find((item) => item.dataset.buildHotspot === slot);
    if (!hotspot) return;
    const on = () => hotspot.classList.add('is-linked'), off = () => hotspot.classList.remove('is-linked');
    row.addEventListener('pointerenter', on); row.addEventListener('pointerleave', off);
    row.addEventListener('focusin', on); row.addEventListener('focusout', off);
  });

  // Each unresolved input is a button that jumps to the exact field to complete.
  const todo = root.querySelector('[data-build-todo]');
  function todoTarget(kind, entry) {
    if (entry === 'frameset' || entry === 'base bike') return kind === 'price' ? basePrice : baseWeight;
    if (entry === 'fork / frame package remainder') return packageWeight;
    const delta = entry.endsWith(' replacement delta');
    const slot = delta ? entry.slice(0, -' replacement delta'.length) : entry;
    const row = rows.get(slot);
    if (!row) return null;
    // A replacement delta needs the new part's weight first, then the removed part's weight.
    const newWeightKnown = numberOrNull(selectedPart(slot)?.weightG) !== null || numberOrNull(state.custom[slot]?.weight) !== null;
    const field = kind === 'price' ? row.querySelector('[data-build-custom-price]')
      : delta && newWeightKnown ? row.querySelector('[data-build-removed-weight]') : row.querySelector('[data-build-custom-weight]');
    return field instanceof HTMLElement && !field.closest('[hidden]') ? field : row.querySelector('select') ?? row;
  }
  function todoLabel(entry, isComplete) {
    const lang = document.documentElement.lang;
    if (entry === 'frameset' || entry === 'base bike') return translate(isComplete ? 'Base bike' : 'Frameset', lang);
    if (entry === 'fork / frame package remainder') return translate('Fork + frame package', lang);
    if (entry === 'inconsistent removed-part weights') return null;
    const slot = entry.endsWith(' replacement delta') ? entry.slice(0, -' replacement delta'.length) : entry;
    return rows.get(slot)?.querySelector('h2')?.textContent ?? slot;
  }
  function renderTodo(missingPrices, missingWeights, isComplete) {
    if (!(todo instanceof HTMLElement)) return;
    for (const [kind, list] of [['price', missingPrices], ['weight', missingWeights]]) {
      const line = todo.querySelector(`[data-build-todo-${kind}]`);
      if (!(line instanceof HTMLElement)) continue;
      line.querySelectorAll('button').forEach((button) => button.remove());
      const items = list.map((entry) => [entry, todoLabel(entry, isComplete)]).filter(([, label]) => label);
      line.hidden = items.length === 0;
      for (const [entry, label] of items) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'build-todo-item';
        button.textContent = label;
        button.addEventListener('click', () => {
          const target = todoTarget(kind, entry);
          if (!(target instanceof HTMLElement)) return;
          target.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
          target.focus({ preventScroll: true });
        });
        line.append(button);
      }
    }
    todo.hidden = !missingPrices.length && !missingWeights.filter((entry) => entry !== 'inconsistent removed-part weights').length;
  }

  function render({ historyMode = 'replace', persistState = true } = {}) {
    const base = bases.get(state.baseId) || data.bases[0];
    if (!base) return;
    const isComplete = base.kind === 'complete-bike';
    ensureBaseOption(base);
    if (baseSelect instanceof HTMLSelectElement) baseSelect.value = state.unavailableStartingPoint ? '' : base.id;
    if (startingPointWarning instanceof HTMLElement) {
      startingPointWarning.hidden = !state.unavailableStartingPoint;
      startingPointWarning.textContent = state.unavailableStartingPoint
        ? translate('The requested starting point is unavailable. Choose an exact replacement to calculate totals.', document.documentElement.lang)
        : '';
    }
    if (baseLink instanceof HTMLAnchorElement) {
      baseLink.href = base.url;
      baseLink.hidden = Boolean(state.unavailableStartingPoint);
    }
    const recordedBasePriceLow = numberOrNull(base.priceLow);
    const recordedBasePriceHigh = numberOrNull(base.priceHigh ?? base.priceLow);
    const buyerBasePrice = numberOrNull(state.baseCustom.price);
    const baseCurrency = recordedBasePriceLow === null ? state.baseCustom.priceCurrency || state.currency : 'CNY';
    const baseShownLow = shownAmount(recordedBasePriceLow ?? buyerBasePrice, baseCurrency);
    const baseShownHigh = shownAmount(recordedBasePriceHigh ?? buyerBasePrice, baseCurrency);
    const basePriceLow = baseShownLow?.value ?? null;
    const basePriceHigh = baseShownHigh?.value ?? basePriceLow;
    let converted = Boolean(baseShownLow?.converted);
    if (baseFacts) {
      const factRows = state.unavailableStartingPoint
        ? [['Requested starting point', state.requestedBaseId]]
        : buildBaseFactRows(base).map(([label, value]) => label === 'Recorded price' && converted && basePriceLow !== null
          ? [label, `${value} · ${formatMoney(basePriceLow, basePriceHigh, true)}`] : [label, value]);
      baseFacts.replaceChildren(...factRows.map(([label, value]) => {
        const item = document.createElement('div');
        const term = document.createElement('dt');
        const detail = document.createElement('dd');
        term.textContent = translate(label, lang);
        detail.textContent = translate(value, lang);
        item.append(term, detail);
        return item;
      }));
    }
    if (buildName) buildName.textContent = state.unavailableStartingPoint
      ? translate('Choose an exact starting point', document.documentElement.lang)
      : base.name.replace(/ · research stage$/, '');
    if (summaryKicker) summaryKicker.textContent = isComplete ? 'Purchase + upgrades' : 'Current build';
    if (priceLabel) priceLabel.textContent = isComplete ? 'Purchase + upgrades' : 'Full build price';
    if (weightLabel) weightLabel.textContent = isComplete ? 'Projected weight' : 'Known weight';
    if (currencySelect instanceof HTMLSelectElement) currencySelect.value = state.currency;
    root.style.setProperty('--build-currency-glyph', JSON.stringify(currencyGlyphs[state.currency] ?? '¥'));

    const recordedBaseWeight = numberOrNull(base.baseWeightG);
    const buyerBaseWeight = numberOrNull(state.baseCustom.weight);
    const baseWeightValue = recordedBaseWeight ?? buyerBaseWeight;
    if (basePrice instanceof HTMLInputElement) basePrice.value = state.baseCustom.price;
    if (basePriceCurrency) basePriceCurrency.textContent = buyerBasePrice === null ? state.currency : state.baseCustom.priceCurrency;
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
    const visualSlots = [];

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
        visualSlots.push({ slot, state: 'included', price: null, weight: null });
        continue;
      }

      const isIncluded = isComplete ? state.selections[slot] === 'included' : state.selections[slot] === 'in-base';
      row.classList.toggle('is-included', isIncluded);
      if (isIncluded) {
        if (customValues instanceof HTMLElement) customValues.hidden = true;
        setPartFacts(row, isComplete
          ? { price: 'Included', weight: 'In base weight', basis: 'Included in the complete-bike package' }
          : { price: 'In base price', weight: 'In frame-package weight', basis: 'Buyer confirmed this part is included. Include its weight in the frame-package remainder above, not twice here.' });
        visualSlots.push({ slot, state: 'included', price: null, weight: null });
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
      const buyerCurrency = state.custom[slot].priceCurrency || state.currency;
      const buyerWeight = numberOrNull(state.custom[slot].weight);
      const removedPartWeight = numberOrNull(state.custom[slot].removedWeight);
      const needsPriceInput = isCustom || recordedPrice === null;
      // A recorded package price is a dated observation; the buyer may replace it with an exact quote.
      const quoteOverride = !needsPriceInput;
      const needsWeightInput = isCustom || recordedWeight === null;
      const needsRemovedWeight = isComplete;
      if (customValues instanceof HTMLElement) customValues.hidden = false;
      if (customPriceField instanceof HTMLElement) customPriceField.hidden = false;
      const priceLabelNode = row.querySelector('[data-build-price-label]');
      if (priceLabelNode) priceLabelNode.textContent = translate(quoteOverride ? 'Your quote' : 'Price', lang);
      const priceCurrencyNode = row.querySelector('[data-build-price-currency]');
      if (priceCurrencyNode) priceCurrencyNode.textContent = buyerCurrency;
      if (customWeightField instanceof HTMLElement) customWeightField.hidden = !needsWeightInput;
      if (removedWeightField instanceof HTMLElement) removedWeightField.hidden = !needsRemovedWeight;
      // A quote that cannot be converted stays unresolved rather than falling back to another amount.
      const shownPrice = buyerPrice !== null ? shownAmount(buyerPrice, buyerCurrency) : quoteOverride ? shownAmount(recordedPrice, 'CNY') : null;
      const partPrice = shownPrice?.value ?? null;
      if (shownPrice?.converted) converted = true;
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
      // Native amounts stay visible beside any converted display value.
      const enteredAs = buyerPrice !== null && buyerCurrency !== state.currency ? `Entered as ${nativeMoney(buyerPrice, buyerCurrency)}` : '';
      const basis = isCustom
        ? [`Buyer-entered value${isComplete ? ' · replacement delta needs removed-part weight' : ''}`, enteredAs].filter(Boolean).join(' · ')
        : [
            quoteOverride && buyerPrice !== null ? `Your quote replaces the recorded ${nativeMoney(recordedPrice, 'CNY')}` : part.priceDate,
            enteredAs,
            quoteOverride && buyerPrice === null && shownPrice?.converted ? `Recorded price ${nativeMoney(recordedPrice, 'CNY')}` : '',
            recordedPrice === null && buyerPrice !== null ? 'Buyer-entered price' : part.priceBasis,
            recordedWeight === null && buyerWeight !== null ? 'Buyer-entered weight' : part.weightBasis,
            isComplete && removedPartWeight === null ? 'Removed-part weight required for final weight' : '',
            isComplete && part.covers?.length ? `Removed weight must include the entire replaced package: ${[slot, ...part.covers].join(', ')}` : '',
            part.note || '',
          ].filter(Boolean).join(' · ');
      const resolvedWeight = isComplete
        ? (partWeight === null || removedPartWeight === null ? null : partWeight - removedPartWeight)
        : partWeight;
      visualSlots.push({ slot, state: buildSlotState({ price: partPrice, weight: resolvedWeight }), price: partPrice, priceConverted: Boolean(shownPrice?.converted), weight: isComplete ? null : partWeight });
      setPartFacts(row, {
        price: partPrice === null ? '—' : formatMoney(partPrice, partPrice, Boolean(shownPrice?.converted)),
        weight: weightDisplay,
        basis,
        source: isCustom ? null : part.source,
      });
    }

    const packageRemainder = isComplete ? null : numberOrNull(state.baseCustom.packageWeight);
    renderBuildVisual(base, isComplete, {
      isComplete,
      basePrice: basePriceLow,
      basePriceHigh,
      basePriceConverted: Boolean(baseShownLow?.converted),
      baseWeight: baseWeightValue === null ? null : baseWeightValue + (packageRemainder ?? 0),
      baseWeightMissing: !isComplete && packageRemainder === null ? 1 : 0,
      slots: visualSlots
    });
    const impossibleWeight = isComplete && baseWeightValue !== null && removedWeightTotal > baseWeightValue;
    if (impossibleWeight) missingWeights.push('inconsistent removed-part weights');
    if (totalPrice) totalPrice.textContent = missingPrices.length
      ? `${formatMoney(priceLow, priceHigh, converted)} known + ${missingPrices.length} unknown`
      : formatMoney(priceLow, priceHigh, converted);
    if (currencyNote instanceof HTMLElement) currencyNote.hidden = !converted;
    if (totalWeight) totalWeight.textContent = impossibleWeight ? 'Check removed-part weights' : missingWeights.length
      ? `${formatWeight(knownWeight)} ${isComplete ? 'base / known deltas' : 'known'} + ${missingWeights.length} unknown`
      : formatWeight(knownWeight);
    if (completeness) completeness.textContent = missingPrices.length || missingWeights.length
      ? `${isComplete ? 'Purchase total' : 'Complete price'} needs ${missingPrices.length} more input${missingPrices.length === 1 ? '' : 's'}; ${isComplete ? 'projected weight' : 'complete weight'} needs ${missingWeights.length} more input${missingWeights.length === 1 ? '' : 's'}.`
      : isComplete ? 'Purchase price and every replacement weight delta are resolved.' : 'Every required slot has a price and weight.';

    const conflicts = state.unavailableStartingPoint
      ? [translate('The requested starting point is unavailable. Choose an exact replacement to calculate totals.', document.documentElement.lang)]
      : compatibilityMessages(base, covered);
    if (impossibleWeight && completeness) completeness.textContent += ' Removed parts exceed the whole-bike weight; check units and avoid counting removed components twice.';
    renderTodo(state.unavailableStartingPoint ? [] : missingPrices, state.unavailableStartingPoint ? [] : missingWeights, isComplete);
    if (state.unavailableStartingPoint) {
      const pending = translate('Choose an exact starting point', document.documentElement.lang);
      if (totalPrice) totalPrice.textContent = '—';
      if (totalWeight) totalWeight.textContent = '—';
      if (completeness) completeness.textContent = pending;
    }
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
    if (persistState) {
      persist();
      draftOwned = true;
    }
    updateUrl(historyMode);
    return true;
  }

  baseSelect?.addEventListener('change', () => {
    if (!(baseSelect instanceof HTMLSelectElement) || !bases.has(baseSelect.value)) return;
    const previous = bases.get(state.baseId);
    const next = bases.get(baseSelect.value);
    state.baseId = baseSelect.value;
    delete state.unavailableStartingPoint;
    delete state.requestedBaseId;
    state.baseCustom = { price: '', priceCurrency: '', weight: '', packageWeight: '' };
    for (const custom of Object.values(state.custom)) custom.removedWeight = '';
    if (previous?.kind !== next?.kind) {
      state.selections = defaultSelections(next);
      state.custom = Object.fromEntries(slots.map((slot) => [slot, { price: '', priceCurrency: '', weight: '', removedWeight: '' }]));
    }
    render({ historyMode: 'push' });
  });
  // Changing the planner currency converts displays only; entered amounts keep their own currency.
  currencySelect?.addEventListener('change', () => {
    if (!(currencySelect instanceof HTMLSelectElement) || !currencies.includes(currencySelect.value) || currencySelect.value === state.currency) return;
    state.currency = currencySelect.value;
    render({ historyMode: 'push', persistState: draftOwned });
  });
  bindHistoryInput(packageWeight, (historyMode) => {
    state.baseCustom.packageWeight = packageWeight.value;
    render({ historyMode });
  });
  bindHistoryInput(basePrice, (historyMode) => {
    if (basePrice instanceof HTMLInputElement) setMoney(state.baseCustom, basePrice.value);
    render({ historyMode });
  });
  basePrice?.addEventListener('blur', () => endMoneyEdit(state.baseCustom));
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
        state.custom[slot] = { price: '', priceCurrency: '', weight: '', removedWeight: '' };
      }
      render({ historyMode: 'push' });
    });
    bindHistoryInput(customPrice, (historyMode) => {
      if (customPrice instanceof HTMLInputElement) setMoney(state.custom[slot], customPrice.value);
      render({ historyMode });
    });
    customPrice?.addEventListener('blur', () => endMoneyEdit(state.custom[slot]));
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
  // Reset clears part choices and entries but keeps the chosen starting point.
  root.querySelector('[data-build-reset]')?.addEventListener('click', () => {
    state.selections = defaultSelections(bases.get(state.baseId) ?? bases.get(firstBaseId));
    state.custom = Object.fromEntries(slots.map((slot) => [slot, { price: '', priceCurrency: '', weight: '', removedWeight: '' }]));
    try { localStorage.removeItem(storageKey); } catch { /* URL still resets */ }
    render({ historyMode: 'push' });
  });

  addEventListener('popstate', () => {
    state = restoreBuildState(data, new URLSearchParams(location.search), {}, { allowStored: false });
    render();
  });

  // Opening a shared link shows its state without overwriting the visitor's saved draft until they edit.
  if (!render({ persistState: !isExplicitBuildUrl(data, new URLSearchParams(location.search)) })) return;
  root.disabled = false;
  const previewStatus = document.querySelector('[data-build-preview-status]');
  previewStatus?.classList.add('is-ready');
  // The loading qualification matters only before editing works; keep it for assistive technology.
  document.querySelector('#builder-preview-note')?.classList.add('sr-only');
  previewStatus?.querySelector('[data-build-static-label]')?.setAttribute('aria-hidden', 'true');
  previewStatus?.querySelector('[data-build-ready-label]')?.removeAttribute('aria-hidden');
})();
