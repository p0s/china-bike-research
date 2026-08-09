export function escapeHtml(value='') {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}
export const escapeAttr = escapeHtml;
export function safeJson(value) { return JSON.stringify(value).replaceAll('<','\\u003c'); }
export function url(base, pathname='/') {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${p}` || '/';
}
export function layout({base='', repositoryUrl, title='', description, current='', body, noindex=false, siteUrl='https://example.invalid', path='/', image='', imageAlt=''}) {
  const siteName='China Bike Research';
  const pageTitle=title ? `${title} · ${siteName}` : siteName;
  const canonical = `${siteUrl}${url(base,path)}`;
  const socialImage = image ? (image.startsWith('https://') ? image : `${siteUrl}${image.startsWith('/') ? image : `/${image}`}`) : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${escapeAttr(description)}">
  <meta name="theme-color" content="#f7f7f4">
  ${noindex?'<meta name="robots" content="noindex">':''}
  <link rel="icon" type="image/svg+xml" href="${url(base,'/assets/logo.svg')}">
  <link rel="stylesheet" href="${url(base,'/assets/site.css')}">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <meta property="og:title" content="${escapeAttr(pageTitle)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeAttr(canonical)}">
  ${socialImage ? `<meta property="og:image" content="${escapeAttr(socialImage)}"><meta property="og:image:alt" content="${escapeAttr(imageAlt || description)}"><meta name="twitter:card" content="summary_large_image">` : `<meta name="twitter:card" content="summary">`}
  <title>${escapeHtml(pageTitle)}</title>
</head>
<body data-base="${escapeAttr(base)}">
  <a class="skip-link" href="#content">Skip to content</a>
  <header class="site-header">
    <div class="page header-inner">
      <a class="brand" href="${url(base,'/')}" aria-label="China Bike Research home"><img src="${url(base,'/assets/logo.svg')}" alt="" width="30" height="30"><span>China Bike Research</span></a>
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="main-nav">Menu</button>
      <nav id="main-nav" class="main-nav" aria-label="Primary">
        <a href="${url(base,'/')}" data-nav-catalog${current==='catalog'?' aria-current="page"':''}>Bikes</a>
        <a href="${url(base,'/?type=frameset#catalog')}" data-nav-framesets${current==='framesets'?' aria-current="page"':''}>Framesets</a>
        <a href="${url(base,'/methodology/')}"${current==='methodology'?' aria-current="page"':''}>Methodology</a>
        <a class="nav-external" href="${repositoryUrl}">GitHub <span aria-hidden="true">↗</span></a>
      </nav>
    </div>
  </header>
  <main id="content">${body}</main>
  <footer class="site-footer">
    <div class="page footer-inner">
      <span>Independent comparison of bicycles available in China.</span>
      <nav aria-label="Footer">
        <a href="${url(base,'/methodology/')}">Methodology</a>
        <a href="${url(base,'/image-sources/')}">Image credits</a>
        <a href="${url(base,'/privacy/')}">Privacy</a>
        <a href="${url(base,'/data/catalog.json')}">Data</a>
        <a href="${repositoryUrl}/issues">Add or correct a bike</a>
      </nav>
    </div>
  </footer>
  <aside class="selection-bar" data-compare-tray aria-live="polite" aria-label="Selected bikes">
    <div class="selection-summary"><strong data-compare-count>0</strong><span data-selection-label> selected</span><span class="selection-names" data-selection-names></span></div>
    <div class="selection-actions">
      <button class="text-button" type="button" data-clear-selection>Clear</button>
      <button class="primary-button" type="button" data-open-compare>Compare</button>
    </div>
  </aside>
  <div class="tooltip-content" role="tooltip" id="shared-tooltip" hidden></div>
  <div class="sr-only" role="status" aria-live="polite" id="copy-status"></div>
  <script src="${url(base,'/assets/site.js')}" defer></script>
</body>
</html>`;
}
