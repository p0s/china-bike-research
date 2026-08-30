export function escapeHtml(value='') {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}
export const escapeAttr = escapeHtml;
export function safeJson(value) { return JSON.stringify(value).replaceAll('<','\\u003c'); }
export function url(base, pathname='/') {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${p}` || '/';
}
export function layout({base='', repositoryUrl, title='', description, current='', body, noindex=false, siteUrl='https://example.invalid', path='/', image='', imageAlt='', ogType='website', structuredData=[], datasetUpdated='', catalogReviewed='', footerDescription=''}) {
  const siteName='China Bikes';
  const pageTitle=title ? `${title} · ${siteName}` : siteName;
  const canonical = `${siteUrl}${url(base,path)}`;
  const socialImage = image ? (image.startsWith('https://') ? image : `${siteUrl}${image.startsWith('/') ? image : `/${image}`}`) : '';
  const jsonLd = (Array.isArray(structuredData) ? structuredData : [structuredData])
    .filter(Boolean)
    .map((entry) => `<script type="application/ld+json">${safeJson(entry)}</script>`)
    .join('\n  ');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${escapeAttr(description)}">
  <meta name="theme-color" content="#f7f7f4">
  <meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'}">
  <link rel="icon" type="image/svg+xml" href="${url(base,'/assets/logo.svg')}">
  <link rel="stylesheet" href="${url(base,'/assets/site.css')}">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <meta property="og:site_name" content="${siteName}">
  <meta property="og:locale" content="en_US">
  <meta property="og:title" content="${escapeAttr(pageTitle)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:type" content="${escapeAttr(ogType)}">
  <meta property="og:url" content="${escapeAttr(canonical)}">
  <meta name="twitter:title" content="${escapeAttr(pageTitle)}">
  <meta name="twitter:description" content="${escapeAttr(description)}">
  ${socialImage ? `<meta property="og:image" content="${escapeAttr(socialImage)}"><meta property="og:image:alt" content="${escapeAttr(imageAlt || description)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escapeAttr(socialImage)}"><meta name="twitter:image:alt" content="${escapeAttr(imageAlt || description)}">` : `<meta name="twitter:card" content="summary">`}
  ${jsonLd}
  <title>${escapeHtml(pageTitle)}</title>
</head>
<body data-base="${escapeAttr(base)}">
  <a class="skip-link" href="#content">Skip to content</a>
  <header class="site-header">
    <div class="page header-inner">
      <a class="brand" href="${url(base,'/')}" aria-label="China Bikes home"><img src="${url(base,'/assets/logo.svg')}" alt="" width="30" height="30"><span>China Bikes</span></a>
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="main-nav">Menu</button>
      <nav id="main-nav" class="main-nav" aria-label="Primary">
        <a href="${url(base,'/')}" data-nav-catalog${current==='catalog'?' aria-current="page"':''}>Bikes</a>
        <a href="${url(base,'/framesets/')}" data-nav-framesets${current==='framesets'?' aria-current="page"':''}>Framesets</a>
        <a href="${url(base,'/build/')}" data-nav-builder${current==='builder'?' aria-current="page"':''}>Build</a>
        <a href="${url(base,'/electronic-shifting/')}" data-nav-groupsets${current==='groupsets'?' aria-current="page"':''}>Groupsets</a>
      </nav>
    </div>
  </header>
  <main id="content">${body}</main>
  <footer class="site-footer">
    <div class="page footer-inner">
      <div class="footer-copy">
        ${footerDescription ? `<p>${escapeHtml(footerDescription)}</p>` : '<p>Independent comparison of bicycles available in China.</p>'}
        ${datasetUpdated && catalogReviewed ? `<p class="footer-freshness">Dataset updated <time datetime="${escapeAttr(datasetUpdated)}">${escapeHtml(datasetUpdated)}</time>; catalog-wide review <time datetime="${escapeAttr(catalogReviewed)}">${escapeHtml(catalogReviewed)}</time>. Each price keeps its observation date and conditions.</p>` : ''}
      </div>
      <nav aria-label="Footer">
        <a href="${url(base,'/methodology/')}">Methodology</a>
        <a href="${url(base,'/brands/')}">Brands</a>
        <a href="${url(base,'/prices/')}">Price ranges</a>
        <a href="${url(base,'/electronic-shifting/')}">Groupsets</a>
        <a href="${url(base,'/build/')}">Build a bike</a>
        <a href="${url(base,'/image-sources/')}">Image credits</a>
        <a href="${url(base,'/privacy/')}">Privacy</a>
        <a href="${url(base,'/data/catalog.json')}">Data</a>
        <a href="${repositoryUrl}">GitHub</a>
        <a href="${repositoryUrl}/issues">Add or correct a bike</a>
      </nav>
    </div>
  </footer>
  <aside class="selection-bar" data-compare-tray aria-live="polite" aria-label="Selected bikes">
    <div class="selection-summary"><strong data-compare-count>0</strong><span data-selection-label> selected</span><span class="selection-names" data-selection-names></span></div>
    <div class="selection-actions">
      <button class="text-button" type="button" data-clear-selection>Clear</button>
      <a class="primary-button" href="${url(base,'/build/')}" data-open-build hidden>Build selected</a>
      <button class="primary-button" type="button" data-open-compare hidden>Compare</button>
    </div>
  </aside>
  <div class="tooltip-content" role="tooltip" id="shared-tooltip" hidden></div>
  <div class="sr-only" role="status" aria-live="polite" id="copy-status"></div>
  <script type="module" src="${url(base,'/assets/site.js')}"></script>
</body>
</html>`;
}
