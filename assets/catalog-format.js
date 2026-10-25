// Shared two-line cell formatting for server-rendered rows and browser comparison.
// A recorded value keeps its qualifier beside it; unknown values stay unknown.

export function clearanceParts(label) {
  const text = String(label ?? '').trim();
  if (!text || text === '—') return { main: '—', sub: '' };
  const layout = text.match(/^(.+?)\/(.+?) mm \(1×\/2×\)$/);
  if (layout) return { main: `${layout[1]}${layout[1] === 'unknown' ? '' : ' mm'} 1×`, sub: `${layout[2]}${layout[2] === 'unknown' ? '' : ' mm'} 2×` };
  const wheels = text.match(/^(.+?)\/(.+?) mm \(front\/rear\)$/);
  if (wheels) return { main: `${wheels[1]} mm front`, sub: `${wheels[2]} mm rear` };
  const qualified = text.match(/^(.+?) (stock|fitted)$/);
  return qualified ? { main: qualified[1], sub: qualified[2] } : { main: text, sub: '' };
}

export function weightParts(label, kind = '', basis = '') {
  const text = String(label ?? '').trim();
  if (!text || text === '—') return { main: '—', sub: '' };
  if (text.endsWith(' frame')) return { main: text.slice(0, -' frame'.length), sub: weightBasisLabel(basis) || (kind === 'complete-bike' ? 'frame only' : 'frame') };
  return { main: text, sub: '' };
}

export function weightBasisLabel(basis = '') {
  // Only describe the recorded default, never a later video measurement.
  const claim = String(basis).split(/Video field report:/i)[0];
  if (/unpainted|bare frame|excluding (?:hardware and )?paint/i.test(claim)) return 'bare frame';
  if (/including paint|painted frame|production-painted/i.test(claim)) return 'painted frame';
  return '';
}

export function catalogClearance(item = {}, layout = '') {
  const limits = item.tireClearanceByDrivetrain;
  if (limits && ['single', 'double'].includes(layout)) {
    const value = limits[layout];
    return { label: `${Number.isFinite(value) ? `${value} mm` : 'unknown'} ${layout === 'single' ? '1×' : '2×'}`, sortValue: Number.isFinite(value) ? value : 0 };
  }
  const wheels = item.tireClearanceByWheel;
  return {
    label: wheels ? `${wheels.front}/${wheels.rear} mm (front/rear)` : item.tireClearance || '—',
    sortValue: Number.isFinite(item.tireClearanceMaxMm) ? item.tireClearanceMaxMm : 0
  };
}

export function normalizeSpeeds(value) {
  return String(value ?? '').replace(/(\d)\s*[x×]\s*(\d)/gi, '$1×$2');
}
