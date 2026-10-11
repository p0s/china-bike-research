import { numberOrNull } from './state-utils.js';

// These bounds catch malformed input, not determine personal fit.
export function dimension(value) {
  const n = numberOrNull(value);
  return n !== null && n > 0 && n <= 1500 ? n : null;
}
export const signed = (value) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Number(Math.abs(value).toFixed(1))}`;
export const measurement = (value) => Number.isFinite(value) ? String(Number(value.toFixed(1))) : '—';
export function defaultGeometryState(models) {
  const a = models.find(m => m.id === 'ican-graro') ?? models[0];
  const b = models.find(m => m.id === 'winspace-g5') ?? models[1] ?? a;
  const middle = m => m?.sizes[Math.floor((m.sizes.length - 1) / 2)]?.size ?? '';
  return { a: a?.id ?? '', sa: middle(a), b: b?.id ?? '', sb: middle(b), stackA: '', reachA: '', stackB: '', reachB: '', tolerance: '15', category: '' };
}
export const geometryKeys = ['a', 'sa', 'b', 'sb', 'stackA', 'reachA', 'stackB', 'reachB', 'tolerance', 'category'];
export function readGeometryState(models, params) {
  const state = defaultGeometryState(models);
  for (const key of geometryKeys) if (params.has(key)) state[key] = params.get(key);
  // A model link without a size selects a visible, labeled example size.
  for (const side of ['a', 'b']) if (params.has(side) && !params.has(`s${side}`)) {
    const model = models.find(m => m.id === state[side]);
    state[`s${side}`] = model?.sizes[Math.floor((model.sizes.length - 1) / 2)]?.size ?? '';
  }
  return state;
}
export function writeGeometryState(state, params = new URLSearchParams()) {
  const next = new URLSearchParams(params);
  for (const key of geometryKeys) next.set(key, state[key] ?? '');
  return next;
}
export function selectedGeometry(models, state, side) {
  const upper = side.toUpperCase();
  if (state[side] === 'manual') {
    const stack_mm = dimension(state[`stack${upper}`]), reach_mm = dimension(state[`reach${upper}`]);
    return stack_mm === null || reach_mm === null ? null : { manual: true, stack_mm, reach_mm };
  }
  const model = models.find(m => m.id === state[side]);
  const row = model?.sizes.find(s => s.size === state[`s${side}`]);
  return row ? { ...row, model } : null;
}
export function geometryDifference(a, b, key) {
  return Number.isFinite(a?.[key]) && Number.isFinite(b?.[key]) ? Number((b[key] - a[key]).toFixed(4)) : null;
}
export function nearbyGeometry(models, reference, { tolerance = '15', category = '' } = {}) {
  const limit = numberOrNull(tolerance);
  if (!reference || limit === null || limit > 100) return null;
  const matches = [];
  for (const model of models) {
    if (category && model.category !== category) continue;
    for (const row of model.sizes) {
      if (reference.model?.id === model.id && reference.size === row.size) continue;
      const stack = geometryDifference(reference, row, 'stack_mm');
      const reach = geometryDifference(reference, row, 'reach_mm');
      if (stack === null || reach === null || Math.abs(stack) > limit || Math.abs(reach) > limit) continue;
      matches.push({ model, row, stack, reach, distance: Math.hypot(stack, reach) });
    }
  }
  return matches.sort((a, b) => a.distance - b.distance || a.model.id.localeCompare(b.model.id) || a.row.size.localeCompare(b.row.size));
}
