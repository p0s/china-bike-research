import { geometryCopy } from './geometry-copy.js';
import { selectedGeometry, geometryDifference, measurement, signed, nearbyGeometry, writeGeometryState } from './geometry-core.js';

export const escape = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
export const geometryLink = (data, state) => `${data.toolUrl}?${escape(writeGeometryState(state).toString())}`;
const option = (value, label, selected) => `<option value="${escape(value)}"${value === selected ? ' selected' : ''}>${escape(label)}</option>`;
export function sizeOptions(model, selected) {
  return `${model?.sizes.some(s => s.size === selected) ? '' : option(selected, selected || '—', selected)}${(model?.sizes ?? []).map(s => option(s.size, s.size, selected)).join('')}`;
}
export function geometryControls(data, state) {
  const c = geometryCopy(data.locale);
  return ['a', 'b'].map(side => {
    const model = data.models.find(m => m.id === state[side]);
    const upper = side.toUpperCase();
    return `<fieldset class="geo-picker" data-side="${side}" disabled><legend><span class="geo-badge geo-${side}">${upper}</span>${escape(c[side].slice(c[side].indexOf('·') + 1).trim())}</legend>
      <label for="geo-${side}">${escape(c.model)}</label><select id="geo-${side}" name="${side}">${data.models.map(m => option(m.id, m.name, state[side])).join('')}${option('manual', c.manual, state[side])}</select>
      <div data-recorded="${side}"${state[side] === 'manual' ? ' hidden' : ''}><label for="geo-s${side}">${escape(c.size)}</label><select id="geo-s${side}" name="s${side}">${sizeOptions(model, state[`s${side}`])}</select></div>
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
function diagram(a, b, c) {
  if (!a || !b) return '';
  const scale = 350 / Math.max(650, a.stack_mm, b.stack_mm, a.reach_mm, b.reach_mm);
  const x = n => 92 + n * scale, y = n => 435 - n * scale;
  const grid = Array.from({ length: Math.floor(350 / scale / 100) }, (_, i) => (i + 1) * 100).map(n => `<path class="geo-grid" d="M92 ${y(n)}H480 M${x(n)} 85V435"/><text class="geo-tick" x="80" y="${y(n) + 4}" text-anchor="end">${n}</text><text class="geo-tick" x="${x(n)}" y="457" text-anchor="middle">${n}</text>`).join('');
  return `<svg class="geo-plot" viewBox="0 0 580 510" role="img" aria-labelledby="geo-plot-title geo-plot-desc"><title id="geo-plot-title">${escape(c.diagram)}</title><desc id="geo-plot-desc">A: ${escape(c.stack)} ${a.stack_mm} mm, ${escape(c.reach)} ${a.reach_mm} mm. B: ${escape(c.stack)} ${b.stack_mm} mm, ${escape(c.reach)} ${b.reach_mm} mm.</desc>${grid}<path class="geo-axis" d="M92 65V435H500"/><text class="geo-axis-label" x="93" y="42">${escape(c.stack)} / mm</text><text class="geo-axis-label" x="500" y="488" text-anchor="end">${escape(c.reach)} / mm</text>
    ${[[a, 'a'], [b, 'b']].map(([p, side]) => `<g class="geo-line-${side}"><path d="M92 ${y(p.stack_mm)}H${x(p.reach_mm)}V435"/><circle cx="${x(p.reach_mm)}" cy="${y(p.stack_mm)}" r="6"/><path class="geo-leader" d="M${x(p.reach_mm) + 10} ${y(p.stack_mm)}l26 ${side === 'a' ? -24 : 24}h30"/><text x="${x(p.reach_mm) + 75}" y="${y(p.stack_mm) + (side === 'a' ? -20 : 28)}">${side.toUpperCase()}</text></g>`).join('')}
    <circle class="geo-origin" cx="92" cy="435" r="7"/><text class="geo-tick" x="92" y="480">${escape(c.bb)}</text></svg>`;
}
export function comparisonView(data, state) {
  const c = geometryCopy(data.locale);
  const a = selectedGeometry(data.models, state, 'a'), b = selectedGeometry(data.models, state, 'b');
  if (!a || !b) return `<p class="geo-notice" role="status">${escape(c.invalid)}</p>`;
  const rows = [['stack_mm', c.stack], ['reach_mm', c.reach], ...['head_angle_deg', 'seat_angle_deg', 'wheelbase_mm', 'chainstay_mm', 'top_tube_mm', 'bb_drop_mm'].map(k => [k, c[k]])];
  return `<div class="geo-chart-heading"><h2>${escape(c.diagram)}</h2><span>01 / 02</span></div><div class="geo-measurements">${[[a, 'a'], [b, 'b']].map(([p, side]) => `<div><span class="geo-badge geo-${side}">${side.toUpperCase()}</span><strong>${escape(p.model?.name ?? c.manualName)} ${escape(p.size ?? '')}</strong><p>${escape(c.stack)} <b>${measurement(p.stack_mm)}</b> <span>mm</span> <i>/</i> ${escape(c.reach)} <b>${measurement(p.reach_mm)}</b> <span>mm</span></p></div>`).join('')}</div>${diagram(a, b, c)}<p class="geo-caption">${escape(c.diagramNote)}</p>
    <div class="geo-table-wrap" tabindex="0" role="region" aria-label="${escape(c.differences)}"><table class="geo-table"><caption>${escape(c.differences)}</caption><thead><tr><th scope="col">${escape(c.metric)}</th><th scope="col">A</th><th scope="col">B</th><th scope="col">${escape(c.difference)}</th></tr></thead><tbody>${rows.map(([key, label], index) => { const delta = geometryDifference(a, b, key); const unit = key.endsWith('_deg') ? '°' : ' mm'; return `<tr${index < 2 ? ' class="geo-primary-row"' : ''}><th scope="row">${escape(label)} <small>${unit}</small></th><td>${measurement(a[key])}</td><td>${measurement(b[key])}</td><td>${delta === null ? '—' : signed(delta)}</td></tr>`; }).join('')}</tbody></table></div><p class="geo-caption">${escape(c.deltaNote)}</p>${a.model && b.model ? `<a class="geo-catalog-link" href="${escape(data.catalogUrl)}?compare=${escape([a.model.variants[0].id, b.model.variants[0].id].filter((id, i, all) => all.indexOf(id) === i).join(','))}#catalog">${escape(c.compareCatalog)} ↗</a>` : ''}`;
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
