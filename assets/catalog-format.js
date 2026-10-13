// Shared two-line cell formatting for server-rendered rows and browser comparison.
// A recorded value keeps its qualifier beside it; unknown values stay unknown.

export function clearanceParts(label) {
  const text = String(label ?? '').trim();
  if (!text || text === '—') return { main: '—', sub: '' };
  const layout = text.match(/^(.+?) \(1×\/2×\)$/);
  if (layout) return { main: layout[1], sub: '1× / 2×' };
  const qualified = text.match(/^(.+?) (stock|fitted)$/);
  return qualified ? { main: qualified[1], sub: qualified[2] } : { main: text, sub: '' };
}

export function weightParts(label, kind = '') {
  const text = String(label ?? '').trim();
  if (!text || text === '—') return { main: '—', sub: '' };
  if (text.endsWith(' frame')) return { main: text.slice(0, -' frame'.length), sub: kind === 'complete-bike' ? 'frame only' : 'frame' };
  return { main: text, sub: '' };
}

export function normalizeSpeeds(value) {
  return String(value ?? '').replace(/(\d)\s*[x×]\s*(\d)/gi, '$1×$2');
}
