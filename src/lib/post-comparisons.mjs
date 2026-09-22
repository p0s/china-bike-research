import { escapeHtml, escapeAttr, url } from './html.mjs';
import { formatPrice, formatAllInPrice, joinCatalogCandidates } from './data.mjs';

const t = (ctx, en, zh) => ctx.locale === 'zh-Hans' ? zh : en;
const money = (amount) => Number.isFinite(amount) ? `¥${amount.toLocaleString('en-US')}` : '—';
function modelFor(ctx, id) {
  const product = ctx.products.find((p) => p.variant.id === id);
  if (product) return { id, product, name: `${product.brand.name} ${product.variant.name}`, kind: product.variant.kind, price: product.latestPrice, maximum: product.platform.tire_clearance?.published_max_mm, limits: product.platform.tire_clearance?.drivetrain_limits_mm };
  const candidate = (ctx.catalogCandidates ?? joinCatalogCandidates(ctx.data)).find((c) => c.candidate.id === id);
  if (!candidate) throw new Error(`Unresolved article model ${id}`);
  const facts = candidate.candidate.facts ?? {};
  return { id, candidate, name: candidate.candidate.name, kind: candidate.kind, price: candidate.price, maximum: facts.tire_clearance_mm, limits: facts.tire_clearance_drivetrain_limits_mm };
}
function modelCell(ctx, model) {
  return `<th scope="row"><a href="${url(ctx.base, `/models/${model.id}/`)}">${escapeHtml(model.name)}</a>${model.candidate ? `<small>${t(ctx, 'Research-stage profile', '研究阶段资料')}</small>` : ''}<small><a href="${url(ctx.base, `/models/${model.id}/`)}#source-records">${t(ctx, 'Model sources', '车型来源')}</a></small></th>`;
}
function priceCell(price) {
  return `${escapeHtml(formatPrice(price))}${price?.observed_at ? `<small><time datetime="${escapeAttr(price.observed_at)}">${escapeHtml(price.observed_at)}</time></small>` : ''}`;
}
function table(ctx, headings, rows, caption, kind) {
  return `<div class="article-table-wrap" role="region" tabindex="0" aria-label="${escapeAttr(caption)}"><table class="article-table article-table-${kind}"><caption>${escapeHtml(caption)}</caption><thead><tr>${headings.map((heading) => `<th scope="col">${escapeHtml(heading)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
export function renderEvidenceTable(ctx, post) {
  const kind = post.comparison.kind;
  const copy = post.translations[ctx.locale ?? 'en'];
  const models = post.model_ids.map((id) => modelFor(ctx, id));
  const note = (model) => escapeHtml(copy.table_notes[model.id]);
  const labels = (en, zh) => t(ctx, en, zh);
  if (kind === 'gravel') {
    const rows = models.map((model) => {
      const variant = model.product.variant;
      const drive = variant.drivetrain;
      const shifting = drive?.shifting === 'mechanical' ? labels('Mechanical', '机械') : drive?.shifting?.startsWith('electronic') ? labels('Electronic', '电子') : '—';
      const weight = variant.claimed_complete_weight_g;
      const weightCell = weight ? `${(weight / 1000).toLocaleString('en-US')} kg` : '—';
      const max = model.product.platform.tire_clearance?.published_max_mm;
      const clearance = max ? labels(`Up to ${max} mm`, `最高 ${max} mm`) : '—';
      return `<tr>${modelCell(ctx, model)}<td>${priceCell(model.price)}<small>${note(model)}</small></td><td>${escapeHtml(drive ? `${drive.brand} ${drive.model}` : '—')}<small>${shifting} · ${escapeHtml(drive?.speeds?.replace('x', '×') ?? '—')}</small></td><td>${clearance}</td><td>${weightCell}</td></tr>`;
    });
    return table(ctx, [labels('Exact build', '具体配置'), labels('Recorded price', '价格记录'), labels('Shifting', '变速'), labels('Tire clearance', '轮胎空间'), labels('Listed weight', '标注整车重量')], rows, labels('Three builds: dated prices and documented specifications', '三个配置：有日期的价格与规格记录'), kind) + `<p class="article-note">${labels('Prices are dated snapshots. Listed weights use different measurement conditions; they are not a controlled weight comparison.', '价格是有日期的记录。各车重量的称重条件不同，不能作为统一条件下的横向实测。')}</p>`;
  }
  if (kind === 'clearance') {
    const rows = models.map((model) => `<tr>${modelCell(ctx, model)}<td>${model.limits?.single ? `${model.limits.single} mm` : '—'}</td><td>${model.limits?.double ? `${model.limits.double} mm` : '—'}</td><td>${!model.limits ? `<strong>${model.maximum ? `${model.maximum} mm` : '—'}</strong><br>` : ''}${note(model)}</td></tr>`);
    return table(ctx, [labels('Frame', '车架'), labels('1× limit', '单盘上限'), labels('2× limit', '双盘上限'), labels('Read with the limit', '适用条件')], rows, labels('Tire-clearance limits by drivetrain', '按变速系统区分的轮胎空间上限'), kind) + `<p class="article-note">${labels('1× means one front chainring; 2× means two. A dash means no separate drivetrain-specific value is recorded. It does not mean zero clearance.', '1× 是单牙盘，2× 是双牙盘。破折号表示没有单独记录该变速配置的上限，不表示轮胎空间为零。')}</p>`;
  }
  if (kind === 'build') {
    const rows = models.map((model) => `<tr>${modelCell(ctx, model)}<td>${priceCell(model.price)}<small>${note(model)}</small></td><td>${model.kind === 'frameset' ? money(model.product.allInPrice.buildAmount) : labels('Included in bike price', '已包含在整车价中')}</td><td>${escapeHtml(model.kind === 'frameset' ? formatAllInPrice(model.product) : formatPrice(model.price))}</td></tr>`);
    return table(ctx, [labels('Starting point', '装车起点'), labels('Recorded frame / bike price', '车架／整车价格记录'), labels('Remaining-build allowance', '剩余装车预算'), labels('Planning total', '规划总额')], rows, labels('Frame-plus-allowance estimates beside a complete bike', '车架加装车预算，与整车价格并列'), kind) + `<p class="article-note">${labels('The allowance is a planning assumption, not a component quote. Replace it with your actual parts and labor budget before purchasing.', '装车预算是规划假设，不是配件报价。下单前应换成实际配件与工时预算。')}</p>`;
  }
  if (kind === 'price-basis') {
    const rows = models.map((model) => `<tr>${modelCell(ctx, model)}<td>${model.kind === 'frameset' ? labels('Frame package', '车架套餐') : labels('Complete bike', '整车')}</td><td>${priceCell(model.price)}</td><td>${note(model)}</td></tr>`);
    return table(ctx, [labels('Model', '车型'), labels('Price covers', '价格对象'), labels('Recorded reference', '参考价格记录'), labels('How to use it', '如何使用这个数字')], rows, labels('Three yuan prices with different meanings', '三种人民币价格，三种不同口径'), kind);
  }
  throw new Error(`Unsupported article comparison: ${kind}`);
}

export function renderBuildExample(ctx) {
  const frame = modelFor(ctx, 'incolor-voyager-frameset');
  const part = ctx.data.buildParts.find((item) => item.id === 'shimano-105-r7170-large-package');
  const observation = part?.price_observation;
  const frameAmount = frame.price?.amount_cny;
  const groupAmount = observation?.amount_cny;
  const known = Number.isFinite(frameAmount) && Number.isFinite(groupAmount);
  const subtotal = known ? frameAmount + groupAmount : undefined;
  const remaining = known ? frame.product.allInPrice.buildAmount - groupAmount : undefined;
  const source = ctx.data.sources.find((item) => item.id === observation?.source_id);
  const label = (en, zh) => t(ctx, en, zh);
  const rows = [
    `<tr><th scope="row"><a href="${url(ctx.base, '/models/incolor-voyager-frameset/')}">INCOLOR Voyager</a></th><td>${priceCell(frame.price)}</td><td>${label('Official starting price; confirm the selected cockpit option.', '官方起价；需确认所选套餐是否含把组。')}</td></tr>`,
    `<tr><th scope="row">Shimano 105 Di2 R7170</th><td>${money(groupAmount)}${observation?.observed_at ? `<small>${escapeHtml(observation.observed_at)}</small>` : ''}</td><td>${label('Recorded large package: shifting, brakes, crankset, cassette and chain. Bottom bracket and rotors excluded.', '已记录的大套包含变速、刹车、牙盘、飞轮和链条，不含中轴与碟片。')}${source?.url ? ` <a href="${escapeAttr(source.url)}" rel="noreferrer">${label('Package source', '套件来源')}</a>` : ''}</td></tr>`,
    `<tr><th scope="row">${label('Known subtotal', '已知小计')}</th><td><strong>${money(subtotal)}</strong></td><td>${label('Frame and one groupset package only.', '仅车架与一套变速刹车大套。')}</td></tr>`,
    `<tr><th scope="row">${label('Still to quote', '仍需报价')}</th><td>—</td><td>${label('Wheels, tires, bottom bracket, rotors, saddle, pedals, any missing cockpit or hardware, assembly and delivery.', '轮组、轮胎、中轴、碟片、坐垫、脚踏、缺少的把组或小配件，以及装配和运费。')}</td></tr>`
  ];
  return table(ctx, [label('Budget line', '预算项目'), label('Recorded amount', '价格记录'), label('What it includes', '包含内容')], rows, label('Worked example: where a frameset budget goes', '算一遍：车架预算花在哪里'), 'worksheet') + `<p class="article-note">${known ? label(`The groupset alone leaves ${money(remaining)} of the ${money(frame.product.allInPrice.buildAmount)} allowance for every other missing item. This is an incomplete cost sketch, not a ready-to-order or compatibility-checked build.`, `仅这套大套，就让 ${money(frame.product.allInPrice.buildAmount)} 装车预算只剩 ${money(remaining)} 留给其他缺少的项目。这是尚未完成的费用示例，不是可直接下单或已验证兼容性的装车方案。`) : label('A price is missing, so no complete subtotal can be calculated.', '价格尚缺，无法计算完整小计。')}</p>`;
}
