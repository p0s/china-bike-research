/** Small, DOM-free rules shared by the catalog and build planner. */
export const COMPARISON_SELECTION_LIMIT = 10;

/** Unknown is not zero. Accept decimal/scientific numbers, never JS coercion. */
export function numberOrNull(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= Number.MAX_SAFE_INTEGER ? numeric : null;
}

export function numericInput(value) {
  const numeric = numberOrNull(value);
  return numeric === null ? '' : String(numeric);
}

export function normalizeSelection(value, { validIds, limit = COMPARISON_SELECTION_LIMIT } = {}) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return [...new Set(values.filter((id) => typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
    && (!validIds || validIds.has(id))))].slice(0, limit);
}

/** Missing values always follow known values, regardless of sort direction. */
export function compareNumbers(a, b, direction = 'asc') {
  const left = numberOrNull(a), right = numberOrNull(b);
  if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
  return (left - right) * (direction === 'desc' ? -1 : 1);
}

const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const own = (value, key) => Object.hasOwn(record(value), key) ? value[key] : undefined;

/**
 * An explicit shared plan is self-contained. A local draft is used only for a
 * bare planner visit, never to fill omitted fields in someone else's URL.
 */
export function restoreBuildState(data, params, stored = {}, { allowStored = true } = {}) {
  const bases = new Map(data.bases.map((base) => [base.id, base]));
  const parts = new Map(data.parts.map((part) => [part.id, part]));
  const slots = data.slots ?? [];
  const keys = ['base', 'frame', 'basePrice', 'baseWeight', 'packageWeight',
    ...slots.flatMap((slot) => [`part-${slot}`, `price-${slot}`, `weight-${slot}`, `removed-${slot}`])];
  const explicit = keys.some((key) => params.has(key));
  const saved = allowStored && !explicit && (own(stored, 'schemaVersion') === undefined || own(stored, 'schemaVersion') === 2)
    ? record(stored) : {};
  const requestedBase = params.get('base') ?? params.get('frame') ?? own(saved, 'baseId') ?? own(saved, 'frameId');
  const baseId = bases.has(requestedBase) ? requestedBase : data.bases[0]?.id ?? '';
  const base = bases.get(baseId);
  const sameBase = (own(saved, 'baseId') ?? own(saved, 'frameId')) === baseId;
  const savedBase = sameBase ? record(own(saved, 'baseCustom')) : {};
  const state = { schemaVersion: 2, baseId, selections: {}, custom: {}, baseCustom: {
    price: numericInput(params.get('basePrice') ?? own(savedBase, 'price')),
    weight: numericInput(params.get('baseWeight') ?? own(savedBase, 'weight')),
    packageWeight: numericInput(params.get('packageWeight') ?? own(savedBase, 'packageWeight')),
  } };
  for (const slot of slots) {
    const fallback = base?.kind === 'complete-bike' ? 'included' : data.parts.find((part) => part.slot === slot && part.default)?.id ?? 'custom';
    const requested = params.get(`part-${slot}`) ?? (sameBase ? own(own(saved, 'selections'), slot) : undefined) ?? fallback;
    state.selections[slot] = requested === 'custom' || (requested === 'included' && base?.kind === 'complete-bike') || (requested === 'in-base' && base?.kind === 'frameset') || parts.get(requested)?.slot === slot ? requested : fallback;
    const savedCustom = sameBase ? record(own(own(saved, 'custom'), slot)) : {};
    state.custom[slot] = {
      price: numericInput(params.get(`price-${slot}`) ?? own(savedCustom, 'price')),
      weight: numericInput(params.get(`weight-${slot}`) ?? own(savedCustom, 'weight')),
      removedWeight: numericInput(params.get(`removed-${slot}`) ?? own(savedCustom, 'removedWeight')),
    };
  }
  return state;
}

/** Copy remains usable when the Clipboard API is denied, without losing focus. */
export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* local/denied clipboard fallback */ }
  }
  const active = document.activeElement;
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;opacity:0;left:0;top:0';
  document.body.append(field);
  field.select();
  let copied = false;
  try { copied = document.execCommand('copy'); } catch { /* no clipboard permission */ }
  field.remove();
  if (active instanceof HTMLElement) active.focus({ preventScroll: true });
  return copied;
}

/** One undoable history entry per edit, not one per keystroke or two per change. */
export function bindHistoryInput(input, update) {
  if (!input) return;
  let editing = false;
  input.addEventListener('input', (event) => {
    const mode = editing ? 'replace' : 'push';
    if (update(mode, event) !== false) editing = true;
  });
  input.addEventListener('change', (event) => {
    update(editing ? 'replace' : 'push', event);
    editing = false;
  });
  input.addEventListener('blur', () => { editing = false; });
  addEventListener('popstate', () => { editing = false; });
}
