import { categoryLabel } from './data.mjs';
import { layout, escapeHtml as e, safeJson, url } from './html.mjs';
import { localePath } from './i18n.mjs';
import { translate } from '../../assets/i18n.js';
import { webApplicationStructuredData } from './seo.mjs';
import { dimension, defaultGeometryState } from '../../assets/geometry-core.js';
import { geometryCopy } from '../../assets/geometry-copy.js';
import { geometryControls, comparisonView, nearbyView, provenance } from '../../assets/geometry-view.js';
import { selectedGeometry } from '../../assets/geometry-core.js';

export function geometryLibrary(ctx) {
  const models = [], excluded = [];
  const sources = new Map(ctx.data.sources.map(s => [s.id, s]));
  for (const platform of ctx.data.platforms) {
    const geometry = platform.frame?.geometry;
    const products = ctx.products.filter(p => p.platform.id === platform.id);
    if (!products.length || !geometry?.sizes?.length) continue;
    const name = `${products[0].brand.name} ${platform.name}`;
    const modelUrl = url(ctx.base, localePath(`/models/${products[0].variant.id}/`, ctx.locale));
    const evidence = [...new Set([geometry.source_id, ...(geometry.source_ids ?? [])].filter(Boolean))].map(id => sources.get(id)).filter(s => s?.url?.startsWith('https://'));
    // Withhold the entire unresolved table, rather than guessing unaffected cells.
    const unresolved = [geometry, geometry.evidence_review, platform.geometry_evidence, platform.frame.geometry_evidence]
      .some(review => review?.derived_fit_eligible === false || /conflict|inconsistent|clarification/.test(review?.status ?? ''));
    if (unresolved || !evidence.length || geometry.units?.length !== 'mm') {
      excluded.push({ id: platform.id, name, url: modelUrl });
      continue;
    }
    const sizes = geometry.sizes.filter(s => Number.isFinite(s.stack_mm) && Number.isFinite(s.reach_mm) && dimension(s.stack_mm) !== null && dimension(s.reach_mm) !== null).map(s => ({ ...s, size: String(s.size) }));
    if (!sizes.length) continue;
    models.push({ id: platform.id, name, category: platform.category, categoryLabel: geometryCopy(ctx.locale).categories?.[platform.category] ?? translate(categoryLabel(platform.category), ctx.locale), url: modelUrl, sizes,
      sources: evidence.map(({ title, publisher, url, accessed_at, type }) => ({ title, publisher, url, accessed_at, type })),
      notes: translate(geometry.correction_note ?? '', ctx.locale),
      variants: products.map(p => ({ id: p.variant.id, name: `${p.brand.name} ${p.variant.name}`, url: url(ctx.base, localePath(`/models/${p.variant.id}/`, ctx.locale)), buildUrl: url(ctx.base, localePath(`/build/?base=${p.variant.id}`, ctx.locale)) })) });
  }
  return { models: models.sort((a, b) => a.name.localeCompare(b.name)), excluded };
}
export function renderGeometryTool(ctx) {
  const locale = ctx.locale ?? 'en', c = geometryCopy(locale);
  const library = geometryLibrary({ ...ctx, locale });
  const data = { ...library, locale, toolUrl: url(ctx.base, localePath('/geometry/', locale)), catalogUrl: url(ctx.base, localePath('/', locale)) };
  const state = defaultGeometryState(data.models);
  const count = data.models.reduce((n, m) => n + m.sizes.length, 0);
  const controls = geometryControls(data, state).replace(/<div class="geo-provenance" data-provenance="([ab])"><\/div>/g, (_, side) => `<div class="geo-provenance" data-provenance="${side}">${provenance(data, selectedGeometry(data.models, state, side))}</div>`);
  const body = `<div class="page geometry-page" data-geometry-tool><header class="geo-intro"><div><p class="geo-eyebrow">${e(c.eyebrow)}</p><h1>${e(c.title)}</h1><p class="geo-lead">${e(c.intro)}</p></div><div class="geo-intro-meta"><span>${data.models.length} ${e(c.models)} <i>/</i> ${count} ${e(c.sizes)}</span><a href="#size-library">${e(c.libraryLink)} ↓</a></div></header>
    <div class="geo-toolbar"><p data-geo-example>${e(c.example)}</p><div><button class="text-button" data-geo-reset disabled type="button">${e(c.reset)}</button><button class="primary-button" data-geo-share disabled type="button">${e(c.share)} ↗</button></div></div>
    <p class="geo-enhancement" data-geo-enhancement>${e(c.loading)}</p><div class="geo-workspace"><form class="geo-controls" aria-label="${e(c.title)}">${controls}</form><section class="geo-comparison" data-geo-comparison aria-label="${e(c.differences)}">${comparisonView(data, state)}</section></div>
    <section class="geo-finder" aria-labelledby="geo-nearby-title"><div class="geo-section-head"><div><p class="geo-eyebrow">02 / 02</p><h2 id="geo-nearby-title">${e(c.nearby)}</h2><p>${e(c.nearbyIntro)}</p></div><fieldset class="geo-search-controls" disabled><legend class="sr-only">${e(c.nearby)}</legend><div><label for="geo-tolerance">${e(c.tolerance)} / mm</label><input id="geo-tolerance" name="tolerance" type="number" min="0" max="100" step="any" value="15" inputmode="decimal"></div><div><label for="geo-category">${e(c.category)}</label><select id="geo-category" name="category"><option value="">${e(c.all)}</option>${[...new Map(data.models.map(m => [m.category, m.categoryLabel]))].sort().map(([id, label]) => `<option value="${e(id)}">${e(label)}</option>`).join('')}</select></div></fieldset></div><div data-geo-results>${nearbyView(data, state)}</div><p class="geo-caption">${e(c.searchNote)}</p></section>
    <section class="geo-library" id="size-library"><details><summary><span>${e(c.library)}</span><span>${count} ${e(c.sizes)} +</span></summary><div class="geo-library-list">${data.models.map(m => `<details><summary>${e(m.name)} <span>${m.sizes.length} ${e(c.sizes)}</span></summary><div class="geo-table-wrap" tabindex="0" role="region" aria-label="${e(m.name)}"><table class="geo-table"><caption>${e(m.name)} · ${e(c.mm)}</caption><thead><tr><th scope="col">${e(c.size)}</th><th scope="col">${e(c.stack)}</th><th scope="col">${e(c.reach)}</th><th scope="col">${e(c.a)}</th></tr></thead><tbody>${m.sizes.map(s => `<tr><th scope="row">${e(s.size)}</th><td>${s.stack_mm}</td><td>${s.reach_mm}</td><td><a href="${data.toolUrl}?a=${encodeURIComponent(m.id)}&sa=${encodeURIComponent(s.size)}">${e(c.a)} ↗</a></td></tr>`).join('')}</tbody></table></div>${provenance(data, { model: m })}<ul class="geo-build-links">${m.variants.map(v => `<li><a href="${e(v.url)}">${e(v.name)}</a> · <a href="${e(v.buildUrl)}">${e(c.build)} ↗</a></li>`).join('')}</ul></details>`).join('')}</div></details></section>
    ${data.excluded.length ? `<details class="geo-excluded"><summary>${e(c.excluded)} (${data.excluded.length})</summary><p>${e(c.excludedNote)}</p><ul>${data.excluded.map(m => `<li><a href="${e(m.url)}">${e(m.name)}</a></li>`).join('')}</ul></details>` : ''}
    <section class="geo-explainer"><h2>${e(c.how)}</h2><p>${e(c.howText)}</p><p>${e(c.privacy)}</p></section><p class="sr-only" role="status" aria-live="polite" data-geo-status></p></div><script type="application/json" id="geometry-data">${safeJson(data)}</script>`;
  return layout({ ...ctx, title: c.title, description: c.description, current: 'geometry', path: '/geometry/', body,
    styles: ['/assets/geometry.css'], modules: ['/assets/geometry.js'], structuredData: webApplicationStructuredData({ siteUrl: ctx.siteUrl, base: ctx.base, path: '/geometry/', name: c.title, description: c.description }) });
}
