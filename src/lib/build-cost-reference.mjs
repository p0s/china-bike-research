import { joinCatalogCandidates } from './data.mjs';
import { escapeHtml, escapeAttr, url } from './html.mjs';
import { csvCell } from './csv.mjs';

export const COST_REFERENCE_IDS = ['camp-ace-gen3-105', 'spect-mira', 'laget-aero-one', 'lightcarbon-lcr020-d'];
export function buildCostReference(data) {
  const candidates = joinCatalogCandidates(data);
  return COST_REFERENCE_IDS.map((id) => {
    const model = candidates.find((item) => item.candidate.id === id);
    if (!model) throw new Error(`Missing cost-reference model: ${id}`);
    const amount = model.price?.amount_cny;
    const recorded = Number.isFinite(amount) ? amount : null;
    const allowance = model.kind === 'frameset' ? data.meta.frameset_build_assumption.amount_cny : 0;
    return { id, name: model.candidate.name, kind: model.kind, recorded_cny: recorded,
      observed_at: model.price?.observed_at ?? null, allowance_cny: allowance,
      allowance_reviewed_at: data.meta.frameset_build_assumption.reviewed_at,
      planning_cny: recorded === null ? null : recorded + allowance,
      overseas_delivered_cny: null, source_url: model.candidate.source_url ?? model.source?.url ?? '',
      source_records_path: `/models/${id}/#source-records` };
  });
}
export function buildCostReferenceCsv(data) {
  const fields = ['id', 'name', 'kind', 'recorded_cny', 'observed_at', 'allowance_cny', 'allowance_reviewed_at', 'planning_cny', 'overseas_delivered_cny', 'source_url', 'source_records_path'];
  return [fields.join(','), ...buildCostReference(data).map((row) => fields.map((key) => csvCell(row[key])).join(','))].join('\n') + '\n';
}
const COPY = {
  en: { caption: 'Same planning number, different purchase', headings: ['Exact model / price basis', 'Dated record (CNY)', 'Remaining-build allowance (CNY)', 'China planning total (CNY)', 'Europe / North America delivered total'], frame: 'Frame package', complete: 'Complete bike', unknown: 'Not recorded', included: 'No build allowance added', date: 'Observed', source: 'Source and package details', download: 'Download the source-dated comparison (CSV)', note: 'These are dated China-market records, not current checkout quotes or a like-for-like equipment ranking. The allowance is a planning assumption, reviewed on', end: 'Replace it with exact parts and labor quotes. Overseas shipping, taxes, duties, fees and local assembly remain unquoted; blank costs are unknown, not zero. Package contents and compatibility still require confirmation.' },
  'zh-Hans': { caption: '规划总额相同，买到的东西不同', headings: ['具体车型／价格口径', '有日期的价格记录（元）', '剩余装车预算（元）', '中国市场规划总额（元）', '欧洲／北美到手总额'], frame: '车架套餐', complete: '整车', unknown: '未记录', included: '未另加装车预算', date: '观察日期', source: '来源与套餐详情', download: '下载带来源日期的比较表（CSV）', note: '这些是有日期的中国市场记录，不是当前结算报价，也不是同配置排名。装车预算是规划假设，复核于', end: '下单前应换成具体配件与工时报价。海外运费、税费、关税、手续费与当地装配仍待报价；空白费用表示未知，不是零。套餐内容与兼容性仍需确认。' },
  de: { caption: 'Gleiche Planungssumme, unterschiedlicher Kauf', headings: ['Genaues Modell / Preisgrundlage', 'Datierter Preis (CNY)', 'Zuschlag für den Aufbau (CNY)', 'Planungssumme für China (CNY)', 'Gelieferte Gesamtkosten Europa / Nordamerika'], frame: 'Rahmenpaket', complete: 'Komplettrad', unknown: 'Nicht erfasst', included: 'Kein Aufbauzuschlag addiert', date: 'Beobachtet', source: 'Quelle und Paketumfang', download: 'Vergleich mit Quelldaten herunterladen (CSV)', note: 'Dies sind datierte chinesische Marktpreise, keine aktuellen Kaufangebote oder Rangfolge gleich ausgestatteter Räder. Der Zuschlag ist eine Planungsannahme, geprüft am', end: 'Ersetzen Sie ihn durch konkrete Teile- und Montageangebote. Auslandsversand, Steuern, Zölle, Gebühren und lokale Montage sind noch offen. Leere Kosten sind unbekannt, nicht null. Paketumfang und Kompatibilität müssen bestätigt werden.' }
};
export function renderBuildCostReference(ctx) {
  const copy = COPY[ctx.locale ?? 'en'];
  const amount = (value) => value === null ? copy.unknown : value.toLocaleString('en-US');
  const rows = buildCostReference(ctx.data).map((row) => `<tr><th scope="row"><a href="${url(ctx.base, `/models/${row.id}/`)}">${escapeHtml(row.name)}</a><small>${row.kind === 'frameset' ? copy.frame : copy.complete}</small><small><a href="${url(ctx.base, row.source_records_path)}">${copy.source}</a></small></th><td>${amount(row.recorded_cny)}${row.observed_at ? `<small>${copy.date}: <time datetime="${row.observed_at}">${row.observed_at}</time></small>` : ''}</td><td>${row.kind === 'frameset' ? amount(row.allowance_cny) : copy.included}</td><td>${amount(row.planning_cny)}</td><td>${copy.unknown}</td></tr>`);
  return `<div class="article-table-wrap" role="region" tabindex="0" aria-label="${escapeAttr(copy.caption)}"><table class="article-table article-table-worksheet"><caption>${copy.caption}</caption><thead><tr>${copy.headings.map((heading) => `<th scope="col">${heading}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div><p>${copy.note} <time datetime="${ctx.data.meta.frameset_build_assumption.reviewed_at}">${ctx.data.meta.frameset_build_assumption.reviewed_at}</time>. ${copy.end}</p><p><a href="${url(ctx.base, '/data/china-build-cost-reference.csv')}" download>${copy.download}</a></p>`;
}
