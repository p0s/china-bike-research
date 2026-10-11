import { escapeHtml, escapeAttr, url } from './html.mjs';
import { isCalendarDate } from './calendar-date.mjs';

const states = new Set(['documented', 'unknown', 'contradicted', 'conflicted']);
export function validateMountApproval(platform, sources) {
  const approval = platform.mount_approval;
  if (approval === undefined) return [];
  const errors = [];
  const linked = ids => Array.isArray(ids) && ids.length > 0 && new Set(ids).size === ids.length && ids.every(id => platform.source_ids?.includes(id) && sources.some(source => source.id === id));
  if (!approval || !isCalendarDate(approval.reviewed_at) || typeof approval.scope !== 'string' || !approval.scope.trim()) return [`Invalid mount review: ${platform.id}`];
  for (const key of ['rear_rack', 'fender']) {
    if (!states.has(approval[key]?.status) || !linked(approval[key]?.source_ids)) errors.push(`Invalid mount evidence: ${platform.id}/${key}`);
  }
  const load = approval.loads;
  if (!load || [load.rear_rack_kg, load.fork_side_kg].some(value => value !== null && (!Number.isFinite(value) || value <= 0))) errors.push(`Invalid mount load: ${platform.id}`);
  else if ([load.rear_rack_kg, load.fork_side_kg].some(value => value !== null) && !linked(load.source_ids)) errors.push(`Missing load evidence: ${platform.id}`);
  return errors;
}
const copy = {
  en: { headings: ['Frameset', '700C limit', 'Rear rack', 'Fenders', 'Declared carrying limits', 'Strict screen'], caption: 'At least 50 mm, rear rack AND fenders: documented features, not approval of a loaded build', documented: 'Documented', unknown: 'Unknown', contradicted: 'Not approved', conflicted: 'Conflicting evidence', pass: 'Meets documented feature screen', pending: 'Not established', outside: 'Below 50 mm', rear: 'Rear rack', fork: 'Each fork side', sources: 'Mount evidence' },
  'zh-Hans': { headings: ['车架组', '700C 胎容上限', '后货架', '挡泥板', '厂家标注载荷', '严格筛选'], caption: '至少 50 mm，且支持后货架和挡泥板：仅核对已记录功能，不代表满载装车认可', documented: '有明确说明', unknown: '未知', contradicted: '未获认可', conflicted: '证据冲突', pass: '符合已记录功能条件', pending: '尚未确认', outside: '低于 50 mm', rear: '后货架', fork: '前叉每侧', sources: '接口证据' },
  de: { headings: ['Rahmenset', '700C-Grenze', 'Heckträger', 'Schutzbleche', 'Angegebene Traglasten', 'Strenge Auswahl'], caption: 'Mindestens 50 mm, Heckträger UND Schutzbleche: dokumentierte Merkmale, keine Freigabe des beladenen Aufbaus', documented: 'Dokumentiert', unknown: 'Unbekannt', contradicted: 'Nicht freigegeben', conflicted: 'Widersprüchliche Belege', pass: 'Erfüllt dokumentierte Merkmale', pending: 'Nicht belegt', outside: 'Unter 50 mm', rear: 'Heckträger', fork: 'Je Gabelseite', sources: 'Montagebelege' }
};

export function mountScreen(platform) {
  const clearance = platform.tire_clearance;
  if (clearance?.wheel_size !== '700c' || clearance.evidence !== 'official' || clearance.eligibility !== 'pass' || !Number.isFinite(clearance.published_max_mm)) return 'pending';
  if (clearance.published_max_mm < 50) return 'outside';
  return ['rear_rack', 'fender'].every(key => platform.mount_approval?.[key]?.status === 'documented' && platform.mount_approval[key].source_ids?.length) ? 'pass' : 'pending';
}

export function renderMountEvidence(ctx, ids) {
  const text = copy[ctx.locale ?? 'en'];
  const rows = ids.map(id => {
    const product = ctx.products.find(p => p.variant.id === id);
    if (!product) throw new Error(`Unresolved mount matrix model: ${id}`);
    const platform = product.platform, approval = platform.mount_approval;
    if (!approval) throw new Error(`Missing mount review: ${id}`);
    const errors = validateMountApproval(platform, ctx.data.sources);
    if (errors.length) throw new Error(errors.join('; '));
    const load = approval.loads;
    const value = key => text[approval[key].status];
    const loads = `${text.rear}: ${load.rear_rack_kg === null ? text.unknown : `${load.rear_rack_kg} kg`}; ${text.fork}: ${load.fork_side_kg === null ? text.unknown : `${load.fork_side_kg} kg`}`;
    return `<tr><th scope="row"><a href="${url(ctx.base, `/models/${id}/`)}">${escapeHtml(product.brand.name)} ${escapeHtml(platform.name)}</a><small><a href="${url(ctx.base, `/models/${id}/`)}#source-records">${text.sources}</a></small></th><td>${escapeHtml(String(platform.tire_clearance?.published_max_mm ?? text.unknown))}${Number.isFinite(platform.tire_clearance?.published_max_mm) ? ' mm' : ''}</td><td>${value('rear_rack')}</td><td>${value('fender')}</td><td>${escapeHtml(loads)}</td><td>${text[mountScreen(platform)]}</td></tr>`;
  });
  return `<div class="article-table-wrap" role="region" tabindex="0" aria-label="${escapeAttr(text.caption)}"><table class="article-table article-table-mounts"><caption>${text.caption}</caption><thead><tr>${text.headings.map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
