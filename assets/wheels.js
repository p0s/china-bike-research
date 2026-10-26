import { translate } from './i18n.js';

// Carbon wheels: filter, sort and an optional gallery re-arrange the same table
// rows. The table stays the default and the page works without this script.
const root = document.querySelector('[data-wheels-view-root]');
const toolbar = document.querySelector('[data-wheels-toolbar]');
const table = root?.querySelector('table');
if (root instanceof HTMLElement && toolbar instanceof HTMLElement && table instanceof HTMLTableElement) {
  const locale = document.documentElement.lang;
  const entries = [...table.querySelectorAll('tbody[data-wheelset-entry]')];
  const initialOrder = new Map(entries.map((entry, index) => [entry, index]));
  const useButtons = [...toolbar.querySelectorAll('[data-wheels-use]')];
  const viewButtons = [...toolbar.querySelectorAll('[data-wheels-view]')];
  const sort = toolbar.querySelector('[data-wheels-sort]');
  const sizeControl = toolbar.querySelector('[data-wheels-size-control]');
  const sizeSteps = [...toolbar.querySelectorAll('[data-wheels-size-step]')];
  const status = toolbar.querySelector('[data-wheels-status]');
  const uses = new Set(useButtons.map((button) => button.dataset.wheelsUse));
  const sorts = new Set([...(sort?.options ?? [])].map((option) => option.value));
  const storageKey = 'china-bikes-wheel-gallery-columns-v1';
  const phone = matchMedia('(max-width: 599px)');
  let state = { use: '', sort: '', view: 'table' };
  let columnPreference = {};
  try { columnPreference = JSON.parse(localStorage.getItem(storageKey) ?? '{}') ?? {}; } catch { /* default size still works */ }

  function readState(params) {
    return {
      use: uses.has(params.get('use') ?? '') ? params.get('use') ?? '' : '',
      sort: sorts.has(params.get('sort') ?? '') ? params.get('sort') ?? '' : '',
      view: params.get('view') === 'gallery' ? 'gallery' : 'table'
    };
  }

  function writeUrl(mode) {
    const next = new URL(location.href);
    for (const [key, value, fallback] of [['use', state.use, ''], ['sort', state.sort, ''], ['view', state.view, 'table']]) {
      if (value && value !== fallback) next.searchParams.set(key, value);
      else next.searchParams.delete(key);
    }
    if (next.href === location.href) return;
    try { history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', next); } catch { /* same-origin navigation required */ }
  }

  // Lowest first; rows without a sortable value keep their original order at the end.
  function sortValue(entry) {
    if (!state.sort) return null;
    const value = Number(entry.dataset[{ price: 'priceUsd', weight: 'weight', depth: 'depth', inner: 'inner' }[state.sort]]);
    if (!Number.isFinite(value)) return null;
    return state.sort === 'depth' || state.sort === 'inner' ? -value : value;
  }

  function columnBounds() {
    const width = root.clientWidth;
    const gap = phone.matches ? 10 : 16;
    const smallest = phone.matches ? 150 : 210;
    const max = Math.max(1, Math.min(phone.matches ? 2 : 5, Math.floor((width + gap) / (smallest + gap))));
    const preferred = Math.max(1, Math.min(max, phone.matches ? 1 : Math.floor((width + gap) / (300 + gap)) || 1));
    return { max, preferred };
  }

  function applyColumns() {
    if (state.view !== 'gallery') return;
    const { max, preferred } = columnBounds();
    const saved = Number(columnPreference[phone.matches ? 'narrow' : 'wide']);
    const columns = Number.isInteger(saved) && saved >= 1 ? Math.min(max, saved) : preferred;
    root.style.setProperty('--wheel-columns', String(columns));
    root.dataset.columns = String(columns);
    sizeSteps.forEach((button) => {
      button.disabled = button.dataset.wheelsSizeStep === '1' ? columns <= 1 : columns >= max;
    });
  }

  function render() {
    useButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.wheelsUse === state.use)));
    viewButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.wheelsView === state.view)));
    if (sort instanceof HTMLSelectElement) sort.value = state.sort;
    root.dataset.view = state.view;
    if (sizeControl instanceof HTMLElement) sizeControl.hidden = state.view !== 'gallery';
    const ordered = [...entries].sort((a, b) => {
      const left = sortValue(a), right = sortValue(b);
      if (left === null || right === null) return left === right ? initialOrder.get(a) - initialOrder.get(b) : left === null ? 1 : -1;
      return left - right || initialOrder.get(a) - initialOrder.get(b);
    });
    let shown = 0;
    for (const entry of ordered) {
      entry.hidden = Boolean(state.use) && entry.dataset.use !== state.use;
      if (!entry.hidden) shown += 1;
      table.append(entry);
    }
    if (status instanceof HTMLElement) status.textContent = translate(shown === 1 ? '1 wheelset shown' : `${shown} wheelsets shown`, locale);
    applyColumns();
  }

  function update(change) {
    state = { ...state, ...change };
    render();
    writeUrl('push');
  }

  useButtons.forEach((button) => button.addEventListener('click', () => update({ use: button.dataset.wheelsUse ?? '' })));
  viewButtons.forEach((button) => button.addEventListener('click', () => update({ view: button.dataset.wheelsView === 'gallery' ? 'gallery' : 'table' })));
  sort?.addEventListener('change', () => update({ sort: sort.value }));
  sizeSteps.forEach((button) => button.addEventListener('click', () => {
    const { max } = columnBounds();
    const current = Number(root.dataset.columns) || columnBounds().preferred;
    const next = Math.max(1, Math.min(max, current - Number(button.dataset.wheelsSizeStep)));
    columnPreference = { ...columnPreference, [phone.matches ? 'narrow' : 'wide']: next };
    try { localStorage.setItem(storageKey, JSON.stringify(columnPreference)); } catch { /* size still applies here */ }
    applyColumns();
  }));
  if ('ResizeObserver' in window) new ResizeObserver(() => applyColumns()).observe(root);
  addEventListener('popstate', () => { state = readState(new URLSearchParams(location.search)); render(); });

  state = readState(new URLSearchParams(location.search));
  toolbar.hidden = false;
  render();
  writeUrl('replace');
}
