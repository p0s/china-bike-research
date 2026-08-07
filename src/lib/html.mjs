export function escapeHtml(value='') {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}
export const escapeAttr = escapeHtml;
export function safeJson(value) { return JSON.stringify(value).replaceAll('<','\\u003c'); }
export function url(base, pathname='/') {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${p}` || '/';
}
export function stripHtml(value='') { return String(value).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(); }

export function badge(label, tone='info', title='') {
  return `<span class="badge ${escapeAttr(tone)}"${title ? ` title="${escapeAttr(title)}"` : ''}>${escapeHtml(label)}</span>`;
}

export function layout({base='', repositoryUrl, title='', description, current='', body, noindex=false, siteUrl='https://example.invalid', path='/'}) {
  const siteName='China Carbon Bike Guide';
  const pageTitle=title ? `${title} · ${siteName}` : siteName;
  const nav=[['bikes','Complete bikes','/bikes/'],['frames','Framesets','/frames/'],['compare','Compare','/compare/'],['brands','Brands','/brands/'],['guides','Guides','/guides/'],['research','Watchlist','/research/']];
  const canonical = `${siteUrl}${url(base,path)}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${escapeAttr(description)}">
  <meta name="theme-color" content="#13211d">
  ${noindex?'<meta name="robots" content="noindex">':''}
  <link rel="icon" type="image/svg+xml" href="${url(base,'/assets/logo.svg')}">
  <link rel="stylesheet" href="${url(base,'/assets/site.css')}">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <meta property="og:title" content="${escapeAttr(pageTitle)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:type" content="website">
  <title>${escapeHtml(pageTitle)}</title>
</head>
<body data-base="${escapeAttr(base)}">
  <a class="skip-link" href="#content">Skip to content</a>
  <header class="site-header">
    <div class="page header-inner">
      <a class="brand" href="${url(base,'/')}"><img src="${url(base,'/assets/logo.svg')}" alt="" width="36" height="36"><span>China Carbon Bike Guide</span></a>
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="main-nav">Menu</button>
      <nav id="main-nav" class="main-nav" aria-label="Primary">
        ${nav.map(([key,label,href])=>`<a href="${url(base,href)}"${current===key?' aria-current="page"':''}>${label}</a>`).join('')}
      </nav>
    </div>
  </header>
  <main id="content">${body}</main>
  <footer class="site-footer">
    <div class="page footer-grid">
      <div><div class="footer-title">China Carbon Bike Guide</div><p>Public, evidence-labelled research for riders buying carbon gravel and all-road bikes in China. No analytics, accounts, or personal data.</p></div>
      <div><div class="footer-title">Use the guide</div><div class="footer-links"><a href="${url(base,'/methodology/')}">Methodology</a><a href="${url(base,'/privacy/')}">Privacy</a><a href="${url(base,'/data/catalog.json')}">Download JSON</a><a href="${url(base,'/data/catalog.csv')}">Download CSV</a></div></div>
      <div><div class="footer-title">Improve the research</div><div class="footer-links"><a href="${url(base,'/contribute/')}">Submit a correction or price</a><a href="${repositoryUrl}/issues">GitHub issues</a><a href="${repositoryUrl}">Source repository</a></div></div>
    </div>
  </footer>
  <div class="compare-tray" data-compare-tray aria-live="polite"><span><strong data-compare-count>0</strong> selected · choose up to 4</span><a class="button" href="${url(base,'/compare/')}" data-compare-link data-base="${url(base,'/compare/')}">Compare selected</a></div>
  <script src="${url(base,'/assets/site.js')}" defer></script>
</body>
</html>`;
}

function inlineMarkdown(text) {
  const placeholders=[];
  let escaped=escapeHtml(text);
  escaped=escaped.replace(/`([^`]+)`/g,(_,code)=>{const token=`@@CODE${placeholders.length}@@`;placeholders.push(`<code>${code}</code>`);return token;});
  escaped=escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>');
  escaped=escaped.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  escaped=escaped.replace(/\*([^*]+)\*/g,'<em>$1</em>');
  placeholders.forEach((html,index)=>{escaped=escaped.replace(`@@CODE${index}@@`,html);});
  return escaped;
}

export function parseFrontmatter(markdown) {
  const normalized=markdown.replaceAll('\r\n','\n');
  if (!normalized.startsWith('---\n')) return {data:{},body:normalized};
  const end=normalized.indexOf('\n---\n',4);
  if (end<0) return {data:{},body:normalized};
  const head=normalized.slice(4,end);
  const data={};
  for (const line of head.split('\n')) {
    const idx=line.indexOf(':');
    if (idx<0) continue;
    data[line.slice(0,idx).trim()]=line.slice(idx+1).trim().replace(/^['"]|['"]$/g,'');
  }
  return {data,body:normalized.slice(end+5)};
}

export function renderMarkdown(markdown) {
  const lines=markdown.replaceAll('\r\n','\n').split('\n');
  const output=[];
  let paragraph=[];
  let list=[];
  let quote=[];
  let inCode=false;
  let codeLang='';
  let code=[];
  const flushParagraph=()=>{if(paragraph.length){output.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);paragraph=[];}};
  const flushList=()=>{if(list.length){output.push(`<ul>${list.map((x)=>`<li>${inlineMarkdown(x)}</li>`).join('')}</ul>`);list=[];}};
  const flushQuote=()=>{if(quote.length){output.push(`<blockquote><p>${inlineMarkdown(quote.join(' '))}</p></blockquote>`);quote=[];}};
  const flushAll=()=>{flushParagraph();flushList();flushQuote();};
  for (const line of lines) {
    if (inCode) {
      if (line.startsWith('```')) { output.push(`<pre><code${codeLang?` class="language-${escapeAttr(codeLang)}"`:''}>${escapeHtml(code.join('\n'))}</code></pre>`); inCode=false;code=[];codeLang=''; }
      else code.push(line);
      continue;
    }
    if (line.startsWith('```')) { flushAll();inCode=true;codeLang=line.slice(3).trim();continue; }
    if (!line.trim()) { flushAll();continue; }
    const heading=line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) { flushAll();const level=heading[1].length;const text=heading[2];const id=text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g,'-').replace(/^-|-$/g,'');output.push(`<h${level} id="${escapeAttr(id)}">${inlineMarkdown(text)}</h${level}>`);continue; }
    const item=line.match(/^[-*]\s+(.+)$/);
    if (item) { flushParagraph();flushQuote();list.push(item[1]);continue; }
    const q=line.match(/^>\s?(.*)$/);
    if (q) { flushParagraph();flushList();quote.push(q[1]);continue; }
    paragraph.push(line.trim());
  }
  flushAll();
  if (inCode) output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  return output.join('\n');
}
