import { geometryCopy } from './geometry-copy.js';
import { selectedGeometry, geometryDifference, measurement, signed, nearbyGeometry, writeGeometryState } from './geometry-core.js';

export const escape = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
export const geometryLink = (data, state) => `${data.toolUrl}?${escape(writeGeometryState(state).toString())}`;
const option = (value, label, selected) => `<option value="${escape(value)}"${value === selected ? ' selected' : ''}>${escape(label)}</option>`;
export function sizeOptions(model, selected) {
  return `${model?.sizes.some(s => s.size === selected) ? '' : option(selected, selected || '—', selected)}${(model?.sizes ?? []).map(s => option(s.size, s.size, selected)).join('')}`;
}
// Each size shows its stack/reach so a buyer can scan the run before choosing.
export function sizeChips(model, side, selected, c) {
  if (!model) return '';
  const missing = selected && !model.sizes.some(s => s.size === selected) ? `<p class="geo-notice">${escape(selected)}: ${escape(c.sizeUnavailable)}</p>` : '';
  return `${missing}<div class="geo-size-chips" role="radiogroup" aria-labelledby="geo-size-label-${side}">${model.sizes.map(s => `<label class="geo-size-chip"><input type="radio" name="s${side}" value="${escape(s.size)}"${s.size === selected ? ' checked' : ''}><span class="geo-size-name">${escape(s.size)}</span><span class="geo-size-numbers" aria-label="${escape(c.stack)} ${measurement(s.stack_mm)} mm, ${escape(c.reach)} ${measurement(s.reach_mm)} mm">${measurement(s.stack_mm)}/${measurement(s.reach_mm)}</span></label>`).join('')}</div>`;
}
export function geometryControls(data, state) {
  const c = geometryCopy(data.locale);
  return ['a', 'b'].map(side => {
    const model = data.models.find(m => m.id === state[side]);
    const upper = side.toUpperCase();
    return `<fieldset class="geo-picker" data-side="${side}" disabled><legend><span class="geo-badge geo-${side}">${upper}</span>${escape(c[side].slice(c[side].indexOf('·') + 1).trim())}</legend>
      <label for="geo-${side}">${escape(c.model)}</label><select id="geo-${side}" name="${side}">${data.models.map(m => option(m.id, m.name, state[side])).join('')}${option('manual', c.manual, state[side])}</select>
      <div data-recorded="${side}"${state[side] === 'manual' ? ' hidden' : ''}><p class="geo-size-label" id="geo-size-label-${side}">${escape(c.size)} <span>${escape(c.sizeHint)}</span></p><div data-size-chips="${side}">${sizeChips(model, side, state[`s${side}`], c)}</div></div>
      <div class="geo-manual" data-manual="${side}"${state[side] === 'manual' ? '' : ' hidden'}>${['stack', 'reach'].map(key => `<div><label for="geo-${key}${upper}">${escape(c[key])} <span>mm</span></label><input type="number" min="0.1" max="1500" step="any" inputmode="decimal" id="geo-${key}${upper}" name="${key}${upper}" value="${escape(state[`${key}${upper}`])}"></div>`).join('')}</div>
      <div class="geo-provenance" data-provenance="${side}"></div></fieldset>`;
  }).join('');
}
export function provenance(data, selected) {
  const c = geometryCopy(data.locale);
  if (!selected) return '';
  if (selected.manual) return `<p>${escape(c.privacy)}</p>`;
  const m = selected.model;
  return `<p class="geo-category">${escape(m.categoryLabel)}</p><a href="${escape(m.url)}">${escape(c.details)} ↗</a><p class="geo-plan-link"><a href="${escape(m.variants[0].buildUrl)}">${escape(c.build)} ↗</a></p><details><summary>${escape(c.source)}</summary>${m.sources.map(s => `<p><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.publisher)} ↗</a><br><small>${escape(s.title)} · ${escape(s.type)}<br>${escape(c.accessed)} <time datetime="${escape(s.accessed_at)}">${escape(s.accessed_at)}</time></small></p>`).join('')}${m.notes ? `<p>${escape(c.warning)}: ${escape(m.notes)}</p>` : ''}</details>`;
}
// A close-up of head-tube positions on one millimetre scale for both axes.
// Each model's recorded sizes form a ladder; the selected sizes are A and B.
function diagram(a, b, c) {
  if (!a || !b) return '';
  const ladder = (p) => p?.model ? p.model.sizes.map(s => ({ size: s.size, x: s.reach_mm, y: s.stack_mm })) : [];
  const sameModel = a.model && b.model && a.model.id === b.model.id;
  const ladders = [['a', ladder(a), a], ...(sameModel ? [] : [['b', ladder(b), b]])];
  const points = [...ladders.flatMap(([, list]) => list), { x: a.reach_mm, y: a.stack_mm }, { x: b.reach_mm, y: b.stack_mm }];
  const left = 64, top = 26, width = 500, height = 330;
  let minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
  let minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y));
  // Pad, keep at least 60 mm on each axis, then share one scale so shapes are not distorted.
  const span = (low, high) => Math.max(60, high - low + 24);
  const scale = Math.min(width / span(minX, maxX), height / span(minY, maxY));
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  minX = cx - width / scale / 2; maxX = cx + width / scale / 2;
  minY = cy - height / scale / 2; maxY = cy + height / scale / 2;
  const x = n => left + (n - minX) * scale, y = n => top + height - (n - minY) * scale;
  const range = Math.max(maxX - minX, maxY - minY);
  const step = range <= 90 ? 10 : range <= 220 ? 20 : 50;
  const ticks = (low, high) => { const list = []; for (let n = Math.ceil(low / step) * step; n <= high; n += step) list.push(n); return list; };
  const grid = [...ticks(minX, maxX).map(n => `<path class="geo-grid" d="M${x(n).toFixed(1)} ${top}V${top + height}"/><text class="geo-tick" x="${x(n).toFixed(1)}" y="${top + height + 18}" text-anchor="middle">${n}</text>`),
    ...ticks(minY, maxY).map(n => `<path class="geo-grid" d="M${left} ${y(n).toFixed(1)}H${left + width}"/><text class="geo-tick" x="${left - 8}" y="${(y(n) + 4).toFixed(1)}" text-anchor="end">${n}</text>`)].join('');
  const ladderMarkup = ladders.map(([side, list]) => list.length ? `<g class="geo-ladder geo-ladder-${side}"><path d="${list.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)} ${y(p.y).toFixed(1)}`).join('')}"/>${list.map(p => `<g class="geo-dot" data-pick-side="${side}" data-pick-size="${escape(p.size)}"><circle cx="${x(p.x).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="9" class="geo-dot-hit"/><circle cx="${x(p.x).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="4"/><text x="${(x(p.x) + (side === 'a' ? -8 : 8)).toFixed(1)}" y="${(y(p.y) + (side === 'a' ? -8 : 15)).toFixed(1)}" text-anchor="${side === 'a' ? 'end' : 'start'}">${escape(p.size)}</text></g>`).join('')}</g>` : '').join('');
  const marker = (p, side) => `<g class="geo-line-${side} geo-selected"><circle cx="${x(p.reach_mm).toFixed(1)}" cy="${y(p.stack_mm).toFixed(1)}" r="8"/><text x="${x(p.reach_mm).toFixed(1)}" y="${(y(p.stack_mm) + 4).toFixed(1)}" text-anchor="middle">${side.toUpperCase()}</text></g>`;
  return `<svg class="geo-plot" viewBox="0 0 600 400" role="img" aria-labelledby="geo-plot-title geo-plot-desc"><title id="geo-plot-title">${escape(c.diagram)}</title><desc id="geo-plot-desc">A: ${escape(c.stack)} ${a.stack_mm} mm, ${escape(c.reach)} ${a.reach_mm} mm. B: ${escape(c.stack)} ${b.stack_mm} mm, ${escape(c.reach)} ${b.reach_mm} mm.</desc>${grid}<path class="geo-axis" d="M${left} ${top}V${top + height}H${left + width}"/><text class="geo-axis-label" x="${left}" y="14">${escape(c.stack)} / mm ↑</text><text class="geo-axis-label" x="${left + width}" y="${top + height + 38}" text-anchor="end">${escape(c.reach)} / mm →</text>${ladderMarkup}${marker(a, 'a')}${marker(b, 'b')}</svg>`;
}
// A project-drawn generic frame shows where each measurement is taken.
export function glossary(c) {
  const terms = ['stack', 'reach', 'head_tube_mm', 'head_angle_deg', 'seat_angle_deg', 'top_tube_mm', 'wheelbase_mm', 'chainstay_mm', 'bb_drop_mm', 'standover_mm', 'front_center_mm', 'fork_offset_mm'];
  const figure = `<svg class="geo-glossary-figure" viewBox="0 0 360 222" role="img" aria-label="${escape(c.glossaryFigure)}"><g class="geo-frame"><circle cx="70" cy="150" r="42"/><circle cx="290" cy="150" r="42"/><path d="M152 158L118 62L232 66L240 92L152 158L70 150L118 62M240 92L290 150M232 66L240 92"/></g><g class="geo-measure"><path d="M152 158V66"/><path d="M152 60H232"/><path d="M70 204H290"/><path d="M70 172L152 180"/></g><g class="geo-measure-label"><text x="146" y="122" text-anchor="end">${escape(c.stack)}</text><text x="192" y="52" text-anchor="middle">${escape(c.reach)}</text><text x="180" y="218" text-anchor="middle">${escape(c.wheelbase_mm)}</text><text x="104" y="194" text-anchor="middle">${escape(c.chainstay_mm)}</text></g></svg>`;
  return `<details class="geo-glossary"><summary>${escape(c.glossary)}</summary>${figure}<dl>${terms.map(key => `<div><dt>${escape(c[key])}</dt><dd>${escape(c.define[key])}</dd></div>`).join('')}</dl><p class="geo-caption">${escape(c.glossaryNote)}</p></details>`;
}
export function comparisonView(data, state) {
  const c = geometryCopy(data.locale);
  const a = selectedGeometry(data.models, state, 'a'), b = selectedGeometry(data.models, state, 'b');
  if (!a || !b) return `<p class="geo-notice" role="status">${escape(c.invalid)}</p>`;
  // Secondary rows appear only when A or B records them; missing values stay a dash.
  const rows = [['stack_mm', c.stack], ['reach_mm', c.reach], ...['head_tube_mm', 'head_angle_deg', 'seat_angle_deg', 'top_tube_mm', 'wheelbase_mm', 'chainstay_mm', 'bb_drop_mm', 'standover_mm', 'front_center_mm', 'fork_offset_mm'].filter(k => ['head_angle_deg', 'seat_angle_deg', 'top_tube_mm', 'wheelbase_mm', 'chainstay_mm', 'bb_drop_mm'].includes(k) || Number.isFinite(a[k]) || Number.isFinite(b[k])).map(k => [k, c[k]])];
  return `<div class="geo-chart-heading"><h2>${escape(c.diagram)}</h2><span>01 / 02</span></div><div class="geo-measurements">${[[a, 'a'], [b, 'b']].map(([p, side]) => `<div><span class="geo-badge geo-${side}">${side.toUpperCase()}</span><strong>${escape(p.model?.name ?? c.manualName)} ${escape(p.size ?? '')}</strong><p>${escape(c.stack)} <b>${measurement(p.stack_mm)}</b> <span>mm</span> <i>/</i> ${escape(c.reach)} <b>${measurement(p.reach_mm)}</b> <span>mm</span></p></div>`).join('')}</div>${diagram(a, b, c)}<p class="geo-caption">${escape(c.diagramNote)}</p>
    <div class="geo-table-wrap" tabindex="0" role="region" aria-label="${escape(c.differences)}"><table class="geo-table"><caption>${escape(c.differences)}</caption><thead><tr><th scope="col">${escape(c.metric)}</th><th scope="col">A</th><th scope="col">B</th><th scope="col">${escape(c.difference)}</th></tr></thead><tbody>${rows.map(([key, label], index) => { const delta = geometryDifference(a, b, key); const unit = key.endsWith('_deg') ? '°' : ' mm'; return `<tr${index < 2 ? ' class="geo-primary-row"' : ''}><th scope="row">${escape(label)} <small>${unit}</small></th><td>${measurement(a[key])}</td><td>${measurement(b[key])}</td><td>${delta === null ? '—' : signed(delta)}</td></tr>`; }).join('')}</tbody></table></div><p class="geo-caption">${escape(c.deltaNote)}</p>${glossary(c)}${a.model && b.model ? `<a class="geo-catalog-link" href="${escape(data.catalogUrl)}?compare=${escape([a.model.variants[0].id, b.model.variants[0].id].filter((id, i, all) => all.indexOf(id) === i).join(','))}#catalog">${escape(c.compareCatalog)} ↗</a>` : ''}`;
}
export function nearbyView(data, state, showAll = false) {
  const c = geometryCopy(data.locale);
  const reference = selectedGeometry(data.models, state, 'a');
  if (!reference) return `<p class="geo-notice">${escape(c.invalid)}</p>`;
  const matches = nearbyGeometry(data.models, reference, state);
  if (matches === null) return `<p class="geo-notice">${escape(c.invalidTolerance)}</p>`;
  if (!matches.length) return `<p class="geo-empty">${escape(c.noMatches)}</p>`;
  return `<p class="geo-result-count">${matches.length} ${escape(c.matches)}</p><ol class="geo-results">${matches.slice(0, showAll ? matches.length : 8).map(({ model: m, row, stack, reach }, i) => `<li><span class="geo-rank">${String(i + 1).padStart(2, '0')}</span><div class="geo-result-name"><h3><a href="${escape(m.url)}">${escape(m.name)} <span>${escape(row.size)}</span></a></h3><p>${escape(m.categoryLabel)} · ${row.stack_mm} / ${row.reach_mm} mm</p></div><div class="geo-result-deltas"><span>${escape(c.stack)} <b>${signed(stack)}</b></span><span>${escape(c.reach)} <b>${signed(reach)}</b></span></div><a class="geo-use" data-use-model="${escape(m.id)}" data-use-size="${escape(row.size)}" href="${geometryLink(data, { ...state, b: m.id, sb: row.size })}">${escape(c.use)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ol>${matches.length > 8 && !showAll ? `<button class="text-button" data-geo-show type="button">${escape(c.show)} (${matches.length})</button>` : ''}`;
}
