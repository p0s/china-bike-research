import { translate } from './i18n.js';

// Road tires: width group, origin and type filters plus sorting re-arrange the same
// table rows. The table and its details work without this script.
const root = document.querySelector('[data-tires-root]');
const toolbar = document.querySelector('[data-tires-toolbar]');
const table = root?.querySelector('table');
if (root instanceof HTMLElement && toolbar instanceof HTMLElement && table instanceof HTMLTableElement) {
  const locale = document.documentElement.lang;
  const entries = [...table.querySelectorAll('tbody[data-tire-entry]')];
  const initialOrder = new Map(entries.map((entry, index) => [entry, index]));
  const groupButtons = [...toolbar.querySelectorAll('[data-tires-group]')];
  const origin = toolbar.querySelector('[data-tires-origin]');
  const construction = toolbar.querySelector('[data-tires-construction]');
  const sort = toolbar.querySelector('[data-tires-sort]');
  const status = toolbar.querySelector('[data-tires-status]');
  const optionsOf = (select) => new Set([...(select?.options ?? [])].map((option) => option.value));
  const allowed = {
    group: new Set(groupButtons.map((button) => button.dataset.tiresGroup ?? '')),
    origin: optionsOf(origin),
    construction: optionsOf(construction),
    sort: optionsOf(sort)
  };
  const empty = { group: '', origin: '', construction: '', sort: '' };
  let state = { ...empty };

  function readState(params) {
    return Object.fromEntries(Object.keys(empty).map((key) => {
      const value = params.get(key) ?? '';
      return [key, allowed[key].has(value) ? value : ''];
    }));
  }

  function writeUrl(mode) {
    const next = new URL(location.href);
    for (const key of Object.keys(empty)) {
      if (state[key]) next.searchParams.set(key, state[key]);
      else next.searchParams.delete(key);
    }
    if (next.href === location.href) return;
    try { history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', next); } catch { /* same-origin navigation required */ }
  }

  // Lowest first (wet grip and coded owners highest first); rows without the value keep their
  // order at the end. Owner counts order evidence, not quality.
  const sortKeys = { rr: 'rr', wet: 'wet', weight: 'weight', price: 'priceUsd', owners: 'owners' };
  function sortValue(entry) {
    if (!state.sort) return null;
    const raw = entry.dataset[sortKeys[state.sort]];
    const value = Number(raw);
    if (!raw || !Number.isFinite(value)) return null;
    return state.sort === 'wet' || state.sort === 'owners' ? -value : value;
  }

  function matches(entry) {
    if (state.group && !(entry.dataset.groups ?? '').split(' ').includes(state.group)) return false;
    if (state.origin && entry.dataset.origin !== state.origin) return false;
    if (state.construction && entry.dataset.construction !== state.construction) return false;
    return true;
  }

  function render() {
    groupButtons.forEach((button) => button.setAttribute('aria-pressed', String((button.dataset.tiresGroup ?? '') === state.group)));
    if (origin instanceof HTMLSelectElement) origin.value = state.origin;
    if (construction instanceof HTMLSelectElement) construction.value = state.construction;
    if (sort instanceof HTMLSelectElement) sort.value = state.sort;
    const ordered = [...entries].sort((a, b) => {
      const left = sortValue(a), right = sortValue(b);
      if (left === null || right === null) return left === right ? initialOrder.get(a) - initialOrder.get(b) : left === null ? 1 : -1;
      return left - right || initialOrder.get(a) - initialOrder.get(b);
    });
    let shown = 0;
    for (const entry of ordered) {
      entry.hidden = !matches(entry);
      if (!entry.hidden) shown += 1;
      table.append(entry);
    }
    if (status instanceof HTMLElement) status.textContent = translate(shown === 1 ? '1 tire shown' : `${shown} tires shown`, locale);
  }

  function update(change) {
    state = { ...state, ...change };
    render();
    writeUrl('push');
  }

  // A starting-point link opens its row; filters that would hide the row are cleared first.
  function openFragment() {
    const id = decodeURIComponent(location.hash.slice(1));
    const entry = id ? entries.find((item) => item.id === id) : null;
    if (!entry) return;
    if (entry.hidden) { state = { ...state, group: '', origin: '', construction: '' }; render(); writeUrl('replace'); }
    const details = entry.querySelector('details');
    if (details instanceof HTMLDetailsElement) details.open = true;
  }

  groupButtons.forEach((button) => button.addEventListener('click', () => update({ group: button.dataset.tiresGroup ?? '' })));
  origin?.addEventListener('change', () => update({ origin: origin.value }));
  construction?.addEventListener('change', () => update({ construction: construction.value }));
  sort?.addEventListener('change', () => update({ sort: sort.value }));
  addEventListener('popstate', () => { state = readState(new URLSearchParams(location.search)); render(); });
  addEventListener('hashchange', openFragment);

  state = readState(new URLSearchParams(location.search));
  toolbar.hidden = false;
  render();
  writeUrl('replace');
  openFragment();
}
