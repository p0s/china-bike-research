import { defaultGeometryState, geometryKeys, readGeometryState, writeGeometryState, selectedGeometry } from './geometry-core.js';
import { geometryCopy } from './geometry-copy.js';
import { comparisonView, nearbyView, provenance, sizeChips } from './geometry-view.js';
import { bindHistoryInput, copyText } from './state-utils.js';

const root = document.querySelector('[data-geometry-tool]');
if (root) {
  const data = JSON.parse(document.getElementById('geometry-data').textContent);
  const c = geometryCopy(data.locale);
  let state = readGeometryState(data.models, new URLSearchParams(location.search));
  let showAll = false;
  const field = key => root.querySelector(`[name="${key}"]`);
  const status = root.querySelector('[data-geo-status]');
  function syncControls() {
    for (const side of ['a', 'b']) {
      const model = data.models.find(m => m.id === state[side]);
      const select = field(side);
      for (const option of select.querySelectorAll('[data-unavailable]')) option.remove();
      if (!model && state[side] !== 'manual') {
        const option = new Option(`${state[side] || '—'} (${c.excluded})`, state[side]);
        option.dataset.unavailable = '';
        select.add(option);
      }
      select.value = state[side];
      root.querySelector(`[data-size-chips="${side}"]`).innerHTML = sizeChips(model, side, state[`s${side}`], c);
      root.querySelector(`[data-recorded="${side}"]`).hidden = state[side] === 'manual';
      root.querySelector(`[data-manual="${side}"]`).hidden = state[side] !== 'manual';
    }
    for (const key of geometryKeys.filter(k => !['a', 'b', 'sa', 'sb'].includes(k))) {
      const el = field(key);
      if (key === 'category') for (const option of el.querySelectorAll('[data-unavailable]')) option.remove();
      if (key === 'category' && state.category && !data.models.some(m => m.category === state.category)) {
        if (!el.querySelector('[data-unavailable]')) { const option = new Option(state.category, state.category); option.dataset.unavailable = ''; el.add(option); }
      }
      el.value = state[key];
    }
  }
  function carryShoppingContext() {
    const params = new URLSearchParams(location.search);
    const allowed = { ship: /^[A-Z]{2}$/, currency: /^(CNY|USD|EUR|GBP)$/, area: /^(contiguous|remote)$/ };
    for (const link of root.querySelectorAll('a[href]')) {
      const target = new URL(link.href);
      if (target.origin !== location.origin || !/\/(?:models\/|build\/|$)/.test(target.pathname)) continue;
      for (const [key, pattern] of Object.entries(allowed)) if (pattern.test(params.get(key) ?? '')) target.searchParams.set(key, params.get(key));
      link.href = `${target.pathname}${target.search}${target.hash}`;
    }
  }
  function render() {
    root.querySelector('[data-geo-comparison]').innerHTML = comparisonView(data, state);
    root.querySelector('[data-geo-results]').innerHTML = nearbyView(data, state, showAll);
    for (const side of ['a', 'b']) root.querySelector(`[data-provenance="${side}"]`).innerHTML = provenance(data, selectedGeometry(data.models, state, side));
    root.querySelector('[data-geo-example]').hidden = geometryKeys.some(k => new URLSearchParams(location.search).has(k));
    root.querySelectorAll('[data-geo-tolerance]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.geoTolerance === String(state.tolerance).trim())));
    carryShoppingContext();
  }
  function save(mode = 'push') {
    const next = new URL(location.href);
    next.search = writeGeometryState(state, next.searchParams).toString();
    if (next.href !== location.href) history[mode === 'replace' ? 'replaceState' : 'pushState'](null, '', next);
    showAll = false;
    render();
    status.textContent = c.selected;
  }
  root.querySelector('form').addEventListener('submit', event => event.preventDefault());
  // Size chips are radio groups handled together below; other fields bind directly.
  for (const key of geometryKeys.filter(k => !['sa', 'sb'].includes(k))) {
    const el = field(key);
    if (el.tagName === 'INPUT') bindHistoryInput(el, mode => { state[key] = el.value; save(mode); });
    else el.addEventListener('change', () => {
      state[key] = el.value;
      if (key === 'a' || key === 'b') {
        const model = data.models.find(m => m.id === state[key]);
        state[`s${key}`] = model?.sizes[Math.floor((model.sizes.length - 1) / 2)]?.size ?? '';
        syncControls();
      }
      save();
    });
  }
  root.addEventListener('change', event => {
    const radio = event.target.closest?.('input[type="radio"][name="sa"], input[type="radio"][name="sb"]');
    if (!radio) return;
    state[radio.name] = radio.value;
    save();
  });
  root.addEventListener('click', async event => {
    // Plot dots are a pointer shortcut; the size chips remain the keyboard path.
    const dot = event.target.closest?.('[data-pick-side]');
    if (dot) {
      const side = dot.dataset.pickSide;
      state[`s${side}`] = dot.dataset.pickSize;
      syncControls(); save();
      return;
    }
    const preset = event.target.closest?.('[data-geo-tolerance]');
    if (preset) {
      state.tolerance = preset.dataset.geoTolerance;
      syncControls(); save();
      return;
    }
    if (event.target.closest('[data-geo-show]')) {
      showAll = true;
      render();
      root.querySelector('[data-geo-results] a')?.focus({ preventScroll: true });
    }
    const use = event.target.closest('[data-use-model]');
    if (use && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
      event.preventDefault();
      state.b = use.dataset.useModel; state.sb = use.dataset.useSize;
      syncControls(); save(); field('b').focus({ preventScroll: true });
      root.querySelector('[data-geo-comparison]').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
    if (event.target.closest('[data-geo-share]')) {
      // The bare example becomes explicit before sharing, so later default changes cannot alter it.
      const next = new URL(location.href); next.search = writeGeometryState(state, next.searchParams).toString();
      history.replaceState(null, '', next);
      const success = await copyText(next.href);
      const button = root.querySelector('[data-geo-share]');
      button.textContent = success ? c.copied : c.copyFailed;
      status.textContent = button.textContent;
    }
    if (event.target.closest('[data-geo-reset]')) { state = defaultGeometryState(data.models); syncControls(); save(); }
  });
  addEventListener('popstate', () => { state = readGeometryState(data.models, new URLSearchParams(location.search)); showAll = false; syncControls(); render(); });
  syncControls(); render();
  root.querySelectorAll('fieldset, [data-geo-share], [data-geo-reset]').forEach(el => { el.disabled = false; });
  // Editing readiness is not a buyer task; keep the notice only for assistive technology.
  const enhancement = root.querySelector('[data-geo-enhancement]');
  enhancement.textContent = c.ready;
  enhancement.classList.add('sr-only');
}
