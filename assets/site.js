(() => {
  const base = document.body.dataset.base ?? '';

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
    };
    image.addEventListener('error', useFallback, { once: true });
    if (image.complete && image.naturalWidth === 0) useFallback();
  }
  document.querySelectorAll('[data-product-image]').forEach(enableImageFallback);

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
    const copied = document.execCommand('copy');
    field.remove();
    return copied;
  }

  const menuButton = document.querySelector('.menu-button');
  const navigation = document.querySelector('#main-nav');
  menuButton?.addEventListener('click', () => {
    const open = navigation?.classList.toggle('open') ?? false;
    menuButton.setAttribute('aria-expanded', String(open));
  });
  navigation?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }));

  document.querySelectorAll('[data-copy-target]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      if (!target) return;
      await copyText(target.textContent ?? '');
      const original = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = original; }, 1300);
    });
  });

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
  const search = catalogRoot.querySelector('[data-filter-search]');
  const price = catalogRoot.querySelector('[data-filter-price]');
  const capability = catalogRoot.querySelector('[data-filter-capability]');
  const style = catalogRoot.querySelector('[data-filter-style]');
  const sort = catalogRoot.querySelector('[data-sort]');
  const reset = catalogRoot.querySelector('[data-reset]');
  const typeButtons = [...catalogRoot.querySelectorAll('[data-type-value]')];
  let activeType = '';

  function setType(value, { updateUrl = true } = {}) {
    activeType = ['complete-bike', 'frameset'].includes(value) ? value : '';
    typeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.typeValue === activeType)));
    if (updateUrl) {
      const next = new URL(location.href);
      if (activeType) next.searchParams.set('type', activeType);
      else next.searchParams.delete('type');
      try { history.replaceState(null, '', `${next.pathname}${next.search}${next.hash}`); } catch { /* normal navigation origin required */ }
    }
    updateCatalog();
  }

  function hasFilters() {
    return Boolean(activeType || search?.value.trim() || price?.value || capability?.value || style?.value || (sort?.value && sort.value !== 'price'));
  }

  function matchesCapability(row, value) {
    if (!value) return true;
    const [kind, threshold] = value.split(':');
    if (kind === 'kind') return row.dataset.capabilityKind === threshold;
    return row.dataset.capabilityKind === kind && Number(row.dataset.capabilitySort || 0) >= Number(threshold || 0);
  }

  function rowMatches(row) {
    const query = search?.value.trim().toLowerCase() ?? '';
    const maxPrice = Number(price?.value || 0);
    const capabilityValue = capability?.value ?? '';
    const styleValue = style?.value ?? '';
    const [styleKind, styleChoice] = styleValue.split(':');
    return (!query || row.dataset.search?.includes(query)) &&
      (!activeType || row.dataset.type === activeType) &&
      (!maxPrice || Number(row.dataset.priceFilter || Infinity) <= maxPrice) &&
      matchesCapability(row, capabilityValue) &&
      (!styleValue || (styleKind === 'category' ? row.dataset.category === styleChoice : row.dataset.handlebar === styleChoice));
  }

  function sortRows(items) {
    const mode = sort?.value ?? 'price';
    return [...items].sort((a, b) => {
      if (mode === 'capability') return Number(b.dataset.capabilitySort || -1) - Number(a.dataset.capabilitySort || -1) || Number(a.dataset.priceSort || Infinity) - Number(b.dataset.priceSort || Infinity);
      if (mode === 'name') return (a.dataset.name ?? '').localeCompare(b.dataset.name ?? '');
      return Number(a.dataset.priceSort || Infinity) - Number(b.dataset.priceSort || Infinity);
    });
  }

  function updateCatalog() {
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
    if (resultSummary) resultSummary.hidden = !filtered;
    if (empty) empty.hidden = visible !== 0;
    if (reset) reset.hidden = !filtered;
  }

  search?.addEventListener('input', updateCatalog);
  [price, capability, style, sort].forEach((element) => element?.addEventListener('change', updateCatalog));
  typeButtons.forEach((button) => button.addEventListener('click', () => setType(button.dataset.typeValue ?? '')));
  reset?.addEventListener('click', () => {
    if (search) search.value = '';
    if (price) price.value = '';
    if (capability) capability.value = '';
    if (style) style.value = '';
    if (sort) sort.value = 'price';
    setType('');
  });

  const initialParams = new URLSearchParams(location.search);
  setType(initialParams.get('type') ?? '', { updateUrl: false });

  const compareTray = document.querySelector('[data-compare-tray]');
  const compareCount = document.querySelector('[data-compare-count]');
  const selectionLabel = document.querySelector('[data-selection-label]');
  const selectionNames = document.querySelector('[data-selection-names]');
  const openCompareButton = document.querySelector('[data-open-compare]');
  const compareBoxes = [...document.querySelectorAll('[data-compare-id]')];
  const comparePanel = catalogRoot.querySelector('[data-inline-compare]');
  const compareContent = catalogRoot.querySelector('[data-compare-content]');
  const storageKey = 'china-bike-guide-selection-v2';

  let stored = [];
  try { stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]'); } catch { stored = []; }
  let selection = Array.isArray(stored)
    ? [...new Set(stored.filter((id) => byId.has(id)))].slice(0, 4)
    : [];

  function syncBoxes() {
    compareBoxes.forEach((box) => {
      const selected = selection.includes(box.dataset.compareId);
      box.checked = selected;
      box.disabled = !selected && selection.length >= 4;
    });
  }

  function renderTray() {
    try { localStorage.setItem(storageKey, JSON.stringify(selection)); } catch { /* selection remains usable for this page */ }
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
    const image = document.createElement('img');
    image.src = item.image;
    image.alt = item.imageAlt;
    image.width = 120;
    image.height = 80;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.dataset.productImage = '';
    image.dataset.fallback = item.imageFallback;
    if (item.imageRemote) image.referrerPolicy = 'no-referrer';
    enableImageFallback(image);
    const copy = element('div');
    const link = element('a', '', `${item.brand} ${item.name}`);
    link.href = item.url;
    const type = element('span', '', item.type);
    copy.append(link, type);
    const remove = element('button', 'remove-compare', '×');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove ${item.brand} ${item.name}`);
    remove.addEventListener('click', () => setSelection(selection.filter((id) => id !== item.id)));
    head.append(image, copy, remove);
    return head;
  }

  function valueCell(primary, secondary = '') {
    const cell = element('div', 'compare-value');
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
    const coreFields = [
      ['Price', (item) => valueCell(item.price)],
      ['Category fit', (item) => valueCell(item.categoryMetric, item.categoryMetricLabel)],
      ['Drivetrain', (item) => valueCell(item.drivetrain, item.drivetrainSubline)],
      ['Weight', (item) => valueCell(item.weight, item.weightSubline)],
      ['Frame', (item) => valueCell(item.frame)],
      ['Best for', (item) => valueCell(item.bestFor)],
      ['Verdict', (item) => valueCell(item.verdict)]
    ];
    const secondaryFields = [
      ['Price details', (item) => valueCell(item.priceDetails)],
      ['Category-fit evidence', (item) => valueCell(item.categoryMetricDetails)],
      ['Category', (item) => valueCell(item.category)],
      ['Storage', (item) => valueCell(item.storage)],
      ['Mounts', (item) => valueCell(item.mounts)],
      ['Manufacturing', (item) => valueCell(item.manufacturing)],
      ['Availability', (item) => valueCell(item.availability)],
      ['Caveats', (item) => valueCell(item.caveats)]
    ];
    compareContent.replaceChildren(comparisonGrid(items, coreFields, true));
    const more = element('details', 'compare-more');
    more.append(element('summary', '', 'More details'), comparisonGrid(items, secondaryFields));
    compareContent.append(more);

    const next = new URL(location.href);
    next.searchParams.set('compare', selection.join(','));
    try { history.replaceState(null, '', `${next.pathname}${next.search}#compare`); } catch { /* normal navigation origin required */ }
  }

  function openComparison({ scroll = true } = {}) {
    if (!comparePanel || selection.length < 2) return;
    comparePanel.hidden = false;
    compareTray?.classList.add('is-comparing');
    renderComparison();
    if (scroll) comparePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeComparison() {
    if (comparePanel) comparePanel.hidden = true;
    compareTray?.classList.remove('is-comparing');
    const next = new URL(location.href);
    next.searchParams.delete('compare');
    try { history.replaceState(null, '', `${next.pathname}${next.search}${location.hash === '#compare' ? '' : location.hash}`); } catch { /* normal navigation origin required */ }
  }

  openCompareButton?.addEventListener('click', () => openComparison());
  document.querySelector('[data-clear-selection]')?.addEventListener('click', () => setSelection([]));
  catalogRoot.querySelector('[data-close-compare]')?.addEventListener('click', closeComparison);
  catalogRoot.querySelector('[data-copy-comparison]')?.addEventListener('click', async (event) => {
    if (selection.length >= 2) renderComparison();
    await copyText(location.href);
    if (event.currentTarget instanceof HTMLButtonElement) {
      const original = event.currentTarget.textContent;
      event.currentTarget.textContent = 'Copied';
      setTimeout(() => { event.currentTarget.textContent = original; }, 1200);
    }
  });

  const querySelection = (initialParams.get('compare') ?? '').split(',').filter((id) => byId.has(id)).slice(0, 4);
  if (querySelection.length) selection = querySelection;
  renderTray();
  if (querySelection.length >= 2) openComparison({ scroll: false });
})();
