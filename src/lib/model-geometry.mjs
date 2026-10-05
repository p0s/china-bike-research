import { escapeHtml, escapeAttr } from './html.mjs';

// Presentation only: never infer dimensions, reconcile contradictions, or parse
// cells as numbers. Unrecognized transcriptions remain ordinary evidence facts.
export function transcribedGeometry(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(.*?)Printed size columns: ([^.]+)\. (.*)$/s);
  if (!match) return null;
  const sizes = match[2].split(' / ');
  if (sizes.length < 2) return null;
  const rows = [], notes = [];
  const parts = match[3].split('; ');
  for (const [index, part] of parts.entries()) {
    const split = part.indexOf(': ');
    if (split < 0) return null;
    const label = part.slice(0, split);
    const rest = part.slice(split + 2);
    if (label.startsWith('Remarks')) { notes.push(part); continue; }
    const end = rest.indexOf('. ');
    const cells = (end < 0 ? rest.replace(/\.$/, '') : rest.slice(0, end)).split(' / ');
    if (cells.length !== sizes.length) return null;
    rows.push([label, cells]);
    if (end >= 0) { notes.push([rest.slice(end + 2), ...parts.slice(index + 1)].join('; ')); break; }
  }
  return rows.length ? { sizes, rows, intro: match[1].trim(), notes } : null;
}

const labels = {
  rider_height: 'Rider height (reference)', seatpost_insert_mm: 'Seatpost insertion (mm)',
  reach_mm: 'Reach (mm)', top_tube_mm: 'Horizontal top tube (mm)', stack_mm: 'Stack (mm)',
  wheelbase_mm: 'Wheelbase (mm)', chainstay_mm: 'Chainstay (mm)', front_center_mm: 'Front center (mm)',
  bb_drop_mm: 'BB drop (mm)', bb_height_mm: 'BB height (mm)', seat_angle_deg: 'Seat tube angle (°)',
  head_angle_deg: 'Head tube angle (°)', seat_tube_mm: 'Seat tube (mm)', head_tube_mm: 'Head tube (mm)',
  standover_700c_53c_mm: 'Standover, 700C × 53C (mm)', standover_650b_2_1_mm: 'Standover, 650B × 2.1 (mm)',
  fork_offset_mm: 'Fork offset (mm)', fork_length_mm: 'Fork length (mm)', trail_mm: 'Trail (mm)'
};

function table({ sizes, rows, intro = '', notes = [] }, id) {
  return `<section class="model-geometry detail-section" aria-labelledby="${escapeAttr(id)}"><h2 id="${escapeAttr(id)}">Geometry</h2>${intro ? `<p class="geometry-basis">${escapeHtml(intro)}</p>` : ''}${notes.map(note => `<p class="geometry-evidence-warning" role="note">${escapeHtml(note)}</p>`).join('')}<p class="geometry-scroll-hint">Scroll horizontally to see every size. Keyboard: focus the table area and use the arrow keys.</p><div class="geometry-scroll" role="region" tabindex="0" aria-labelledby="${escapeAttr(id)}"><table class="geometry-table"><caption>Recorded geometry by size</caption><thead><tr><th scope="col">Dimension</th>${sizes.map(size => `<th scope="col">${escapeHtml(size)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label, cells]) => `<tr><th scope="row">${escapeHtml(label)}</th>${cells.map(cell => `<td>${escapeHtml(cell ?? '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}

export function structuredGeometry(geometry, sources = []) {
  if (!geometry?.sizes?.length) return '';
  const keys = [...new Set(geometry.sizes.flatMap(size => Object.keys(size)))].filter(key => key !== 'size');
  const review = geometry.evidence_review;
  const source = sources.find(item => item.id === geometry.source_id);
  const notes = [geometry.correction_note, review?.note ? `${review.reviewed_at}: ${review.note}` : ''].filter(Boolean);
  return table({ sizes: geometry.sizes.map(size => size.size), rows: keys.map(key => [labels[key] ?? key, geometry.sizes.map(size => size[key])]), intro: geometry.basis, notes }, 'model-geometry-title') +
    (source ? `<p class="geometry-source">${source.url ? `<a href="${escapeAttr(source.url)}" rel="noreferrer">${escapeHtml(source.title)}</a>` : escapeHtml(source.title)} · ${escapeHtml(source.accessed_at ?? '')}</p>` : '');
}

export function candidateGeometry(facts) {
  return facts.map(([label, value], index) => {
    const parsed = /geometry.*complete current manufacturer table/i.test(label) ? transcribedGeometry(value) : null;
    if (!parsed) return '';
    return table(parsed, `model-geometry-title-${index}`) + `<details class="geometry-transcription"><summary>Original geometry transcription</summary><dl class="detail-list"><div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div></dl></details>`;
  }).join('');
}

export function isGeometryTableFact([label, value]) {
  return /geometry.*complete current manufacturer table/i.test(label) && Boolean(transcribedGeometry(value));
}
