/** Small, DOM-free rules shared by the catalog and build planner. */
import { PRICE_CURRENCIES } from './regional-prices.js';

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
// A shared planner link carries its own state; it never resumes or replaces the saved draft.
export function isExplicitBuildUrl(data, params) {
  const keys = ['base', 'frame', 'basePrice', 'baseWeight', 'packageWeight',
    ...(data.slots ?? []).flatMap((slot) => [`part-${slot}`, `price-${slot}`, `weight-${slot}`, `removed-${slot}`])];
  return keys.some((key) => params.has(key));
}

/**
 * Planner currencies. CNY always works; another currency needs a dated rate for
 * itself and for CNY, because recorded planner prices are yuan observations.
 */
export function buildCurrencies(rates) {
  const valid = (code) => Number.isFinite(rates?.perEur?.[code]) && rates.perEur[code] > 0;
  return PRICE_CURRENCIES.filter((code) => code === 'CNY' || (valid(code) && valid('CNY')));
}

/**
 * A buyer-entered amount keeps the currency it was typed in. A plain number is
 * the legacy yuan form; other currencies append their code (`1500USD`), which
 * older planner code rejects as unknown instead of reading it as yuan.
 */
export function parseMoneyInput(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return { amount: '', currency: '' };
  const match = String(value).trim().match(/^(.*?)\s*([A-Za-z]{3})?$/);
  const amount = numericInput(match?.[1] ?? '');
  const currency = match?.[2] ? match[2].toUpperCase() : 'CNY';
  return amount !== '' && PRICE_CURRENCIES.includes(currency) ? { amount, currency } : { amount: '', currency: '' };
}

export function moneyInputParam(amount, currency) {
  const value = numericInput(amount);
  if (value === '') return '';
  return !currency || currency === 'CNY' ? value : `${value}${currency}`;
}

export function restoreBuildState(data, params, stored = {}, { allowStored = true, preferredCurrency = '' } = {}) {
  const bases = new Map(data.bases.map((base) => [base.id, base]));
  const parts = new Map(data.parts.map((part) => [part.id, part]));
  const slots = data.slots ?? [];
  const explicit = isExplicitBuildUrl(data, params);
  const saved = allowStored && !explicit && [undefined, 2, 3].includes(own(stored, 'schemaVersion'))
    ? record(stored) : {};
  // Drafts before schema 3 stored every amount in yuan.
  const legacyDraft = own(saved, 'schemaVersion') !== 3;
  const savedMoney = (entry) => {
    const amount = numericInput(own(entry, 'price'));
    const currency = legacyDraft ? 'CNY' : own(entry, 'priceCurrency');
    return amount !== '' && PRICE_CURRENCIES.includes(currency) ? { amount, currency } : { amount: '', currency: '' };
  };
  const money = (key, entry) => params.has(key) ? parseMoneyInput(params.get(key)) : savedMoney(entry);
  // A link's own currency wins. Otherwise the visitor's saved planner, then catalog, display
  // currency applies, also to a link without one: only the display follows it, never the plan.
  const currencies = buildCurrencies(data.rates);
  const savedCurrency = allowStored && own(stored, 'schemaVersion') === 3 ? own(stored, 'currency') : undefined;
  const currency = [params.get('currency'), savedCurrency, allowStored ? preferredCurrency : null]
    .find((code) => typeof code === 'string' && currencies.includes(code)) ?? 'CNY';
  const requestedBase = params.get('base') ?? params.get('frame') ?? own(saved, 'requestedBaseId') ?? own(saved, 'baseId') ?? own(saved, 'frameId');
  const baseId = bases.has(requestedBase) ? requestedBase : data.bases[0]?.id ?? '';
  const base = bases.get(baseId);
  const sameBase = (own(saved, 'baseId') ?? own(saved, 'frameId')) === baseId;
  const savedBase = sameBase ? record(own(saved, 'baseCustom')) : {};
  const basePrice = money('basePrice', savedBase);
  const state = { schemaVersion: 3, baseId, currency, selections: {}, custom: {}, baseCustom: {
    price: basePrice.amount,
    priceCurrency: basePrice.currency,
    weight: numericInput(params.get('baseWeight') ?? own(savedBase, 'weight')),
    packageWeight: numericInput(params.get('packageWeight') ?? own(savedBase, 'packageWeight')),
  } };
  if (requestedBase && !bases.has(requestedBase)) {
    state.unavailableStartingPoint = true;
    state.requestedBaseId = requestedBase;
  }
  for (const slot of slots) {
    const fallback = base?.kind === 'complete-bike' ? 'included' : data.parts.find((part) => part.slot === slot && part.default)?.id ?? 'custom';
    const requested = params.get(`part-${slot}`) ?? (sameBase ? own(own(saved, 'selections'), slot) : undefined) ?? fallback;
    state.selections[slot] = requested === 'custom' || (requested === 'included' && base?.kind === 'complete-bike') || (requested === 'in-base' && base?.kind === 'frameset') || parts.get(requested)?.slot === slot ? requested : fallback;
    const savedCustom = sameBase ? record(own(own(saved, 'custom'), slot)) : {};
    const price = money(`price-${slot}`, savedCustom);
    state.custom[slot] = {
      price: price.amount,
      priceCurrency: price.currency,
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

const REGIONAL_KEYS = ['ship', 'market', 'currency', 'area', 'listing', 'max', 'maxCurrency'];
export const BUDGET_KEYS = ['max', 'maxCurrency'];

/**
 * Without the regional payload only China CNY prices are known. Keep the link's own delivery
 * choices instead of rewriting them to China, and mark budgets and listings that cannot be resolved.
 * With `keys: BUDGET_KEYS` only a budget is held, e.g. one in a currency no rate can convert.
 */
export function regionalHold(params, { destination = false, country = '', keys = REGIONAL_KEYS } = {}) {
  const amount = numberOrNull(params.get('max') ?? '');
  const limitCurrency = params.get('maxCurrency') || 'CNY';
  return {
    keys,
    kept: keys.filter((key) => params.has(key)).map((key) => [key, params.get(key)]),
    destination, country,
    currency: keys.includes('currency') && params.has('currency') && params.get('currency') !== 'CNY',
    limit: amount !== null && (destination || limitCurrency !== 'CNY') ? { amount, currency: limitCurrency } : null,
    listing: destination && params.get('listing') === '1',
  };
}

/** A held budget or listing never passes a row: its delivered total is not known yet. */
export function regionalHoldBlocks(hold, typedLimit = null) {
  return Boolean(hold && (hold.limit || hold.listing || (hold.destination && typedLimit !== null)));
}

/** Write the held choices back exactly; a released budget is left to the visible input. */
export function writeRegionalHold(url, hold, keys = REGIONAL_KEYS) {
  const held = (key) => (hold.keys ?? REGIONAL_KEYS).includes(key) && keys.includes(key)
    && (hold.limit || !BUDGET_KEYS.includes(key)) && (hold.listing || key !== 'listing');
  REGIONAL_KEYS.filter(held).forEach((key) => url.searchParams.delete(key));
  hold.kept.filter(([key]) => held(key)).forEach(([key, value]) => url.searchParams.set(key, value));
}
