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
  if (/ (?:frame|Rahmen|车架)$/.test(text)) return { main: text.replace(/ (?:frame|Rahmen|车架)$/, ''), sub: weightBasisLabel(basis) || (kind === 'complete-bike' ? 'frame only' : 'frame') };
  return { main: text, sub: '' };
}

export function weightBasisLabel(basis = '') {
  // Only the lead clause describes the displayed default claim.
  const claim = String(basis).split(/;|\.\s|Video field reports?:|Reviewer weigh-ins/i)[0];
  const bare = /\bunpainted\b|\bbare frame\b|excluding (?:hardware and )?paint/i.test(claim);
  const painted = /(?:^|[\s(])painted\b|production-painted|including (?:hardware and )?paint/i.test(claim);
  return bare === painted ? '' : bare ? 'bare frame' : 'painted frame';
}

export function unsupportedTireLayouts(compatibility) {
  if (compatibility === '1x-only') return ['double'];
  if (compatibility === '2x-only') return ['single'];
  return ['single', 'double'].filter((layout) => compatibility?.mechanical?.[layout] === false && compatibility?.electronic?.[layout] === false);
}

export function catalogClearance(item = {}, layout = '') {
  const limits = item.tireClearanceByDrivetrain;
  if (layout && item.tireLayoutUnsupported?.includes(layout)) return { label: `${layout === 'single' ? '1×' : '2×'} unsupported`, sortValue: 0, unsupported: true };
  if (limits && ['single', 'double'].includes(layout)) {
    const value = limits[layout];
    return { label: `${Number.isFinite(value) ? `${value} mm` : 'unknown'} ${layout === 'single' ? '1×' : '2×'}`, sortValue: Number.isFinite(value) ? value : 0 };
  }
  if (limits) {
    const number = (value) => Number.isFinite(value) ? value : 'unknown';
    return { label: `${number(limits.single)}/${number(limits.double)} mm (1×/2×)`, sortValue: Number.isFinite(item.tireClearanceMaxMm) ? item.tireClearanceMaxMm : 0 };
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
