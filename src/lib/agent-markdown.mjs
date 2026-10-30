// Agent-readable Markdown alternates of the built pages, plus robots.txt and
// llms.txt. Dependency-free: it reads the site's own generated HTML (or, for the
// catalog, the same localized payload the page loads), so every fact, date,
// caveat and source link in the Markdown comes from the same build as the page.

// Content Signals (contentsignals.org): search and AI answers that use the pages
// are intended. No ai-train preference is expressed; see SPEC.md.
export const CONTENT_SIGNAL = 'search=yes, ai-input=yes';
// The methodology page's licence statement, repeated without widening it.
export const DATASET_RIGHTS = 'The structured dataset is available under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Product images and linked third-party material retain their separate rights and provenance.';
// The catalog's own English labels; every locale's dictionary already translates them.
export const HOME_TABLE_LABELS = ['Bike', 'Product type', 'Category', 'Price', 'Tires', 'Drivetrain', 'Weight', 'Frame', 'Partial profiles'];

const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);
// Controls, players and drawings carry no reading content; the page text and tables keep the facts.
// Forms stay: the build planner's server-rendered default preview lives inside one.
const SKIPPED_ELEMENTS = new Set(['audio', 'button', 'canvas', 'dialog', 'iframe', 'input', 'label', 'noscript', 'object', 'optgroup', 'option', 'script', 'select', 'style', 'svg', 'template', 'textarea', 'video']);
const BLOCK_ELEMENTS = new Set(['address', 'article', 'aside', 'blockquote', 'caption', 'dd', 'details', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'legend', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul']);
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', times: '×', middot: '·', rarr: '→', larr: '←', deg: '°', plusmn: '±', copy: '©', reg: '®', trade: '™', yen: '¥', euro: '€', pound: '£', shy: '' };
const BREAK = '\u0000';
const WORD = /[\p{L}\p{N}]/u;
const TAG = /<!--[\s\S]*?-->|<![^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function decodeEntities(value) {
  return value.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, name) => {
    if (name[0] !== '#') return ENTITIES[name] ?? match;
    const code = /^#x/i.test(name) ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}

function parseAttributes(source) {
  const attrs = {};
  for (const [, name, double, single, bare] of source.matchAll(ATTRIBUTE)) attrs[name.toLowerCase()] = decodeEntities(double ?? single ?? bare ?? '');
  return attrs;
}

// A small tree builder for the build's own well-formed HTML, not a general HTML5 parser.
function parseHtml(html) {
  const root = { name: '#root', attrs: {}, children: [] };
  const stack = [root];
  const pattern = new RegExp(TAG.source, 'g');
  let index = 0;
  for (let match; (match = pattern.exec(html));) {
    if (match.index > index) stack.at(-1).children.push(decodeEntities(html.slice(index, match.index)));
    index = pattern.lastIndex;
    const [, closing, opening, rawAttributes = ''] = match;
    if (closing) {
      const at = stack.findLastIndex((node) => node.name === closing.toLowerCase());
      if (at > 0) stack.length = at;
      continue;
    }
    if (!opening) continue;
    const node = { name: opening.toLowerCase(), attrs: parseAttributes(rawAttributes), children: [] };
    stack.at(-1).children.push(node);
    if (RAW_TEXT_ELEMENTS.has(node.name)) {
      const close = new RegExp(`</${node.name}\\s*>`, 'gi');
      close.lastIndex = index;
      const end = close.exec(html);
      index = pattern.lastIndex = end ? close.lastIndex : html.length;
    } else if (!VOID_ELEMENTS.has(node.name) && !/\/\s*$/.test(rawAttributes)) stack.push(node);
  }
  if (index < html.length) stack.at(-1).children.push(decodeEntities(html.slice(index)));
  return root;
}

const isElement = (node, ...names) => typeof node !== 'string' && (!names.length || names.includes(node.name));
const isHidden = (node) => 'hidden' in node.attrs || node.attrs['aria-hidden'] === 'true';
const textContent = (node) => typeof node === 'string' ? node : node.children.map(textContent).join('');
const flat = (text) => text.replace(/\n+/g, ' ');

function escapeText(value) {
  return value
    .replace(/[\\`*[\]]/g, '\\$&')
    .replace(/_/g, (match, offset, text) => WORD.test(text[offset - 1] ?? '') && WORD.test(text[offset + 1] ?? '') ? match : '\\_')
    .replace(/<(?=[a-zA-Z/!?])/g, '\\<')
    .replace(/&(?=#?[a-zA-Z0-9]+;)/g, '\\&');
}

// Collapse HTML whitespace, keep explicit line breaks, and stop text from reading as Markdown syntax.
function paragraph(text) {
  return text.replace(/[ \t\n\r\f]+/g, ' ')
    .split(BREAK)
    .map((line) => line.trim().replace(/^(?:[#>+-]|\d+[.)])(?=[ \t]|$)|^(?=[-=]{3,}$)/, '\\$&'))
    .filter(Boolean)
    .join('\n');
}

function absoluteUrl(href, base) {
  if (!href) return '';
  try {
    const target = new URL(href, base);
    if (!['http:', 'https:', 'mailto:'].includes(target.protocol)) return '';
    return target.href.replace(/[()]/g, (character) => character === '(' ? '%28' : '%29');
  } catch {
    return '';
  }
}

// Decorative separators (for example an italic slash) stay plain text.
function emphasis(text, marker) {
  const [, before, inner, after] = /^([ \t\n\r\f\u0000]*)([\s\S]*?)([ \t\n\r\f\u0000]*)$/.exec(text);
  return WORD.test(inner) ? `${before}${marker}${inner}${marker}${after}` : text;
}

function inlineCode(text) {
  const value = text.replace(/[ \t\n\r\f]+/g, ' ').trim();
  if (!value) return '';
  const fence = value.includes('`') ? '``' : '`';
  return `${fence}${fence.length > 1 ? ' ' : ''}${value}${fence.length > 1 ? ' ' : ''}${fence}`;
}

// Evidence popovers keep their dated lines in the Markdown instead of disappearing with the button.
function tooltip(node) {
  let lines = [];
  try { lines = JSON.parse(node.attrs['data-tooltip-lines']); } catch { lines = []; }
  lines = (Array.isArray(lines) ? lines : []).map((line) => String(line).trim()).filter(Boolean);
  const shown = textContent(node).replace(/[ \t\n\r\f]+/g, ' ').trim();
  const value = shown && shown !== 'i' ? escapeText(shown) : '';
  const label = String(node.attrs['aria-label'] ?? '').split(' — ').pop().trim();
  const details = lines.length ? `(${[label && `${label}:`, ...lines].filter(Boolean).map(escapeText).join(' ')})` : '';
  return [value, details].filter(Boolean).join(' ');
}

function renderInline(nodes, context) {
  let output = '';
  let afterElement = false;
  for (const node of nodes) {
    if (typeof node === 'string') {
      output += escapeText(node);
      afterElement = false;
      continue;
    }
    const piece = inlineElement(node, context);
    if (!piece) continue;
    // Adjacent elements are separated by CSS on the page; keep their words apart.
    if (afterElement && output && !/[ \t\n\r\f\u0000]$/.test(output) && !/^[ \t\n\r\f\u0000]/.test(piece)) output += ' ';
    output += piece;
    afterElement = true;
  }
  return output;
}

function inlineElement(node, context) {
  if (isHidden(node)) return '';
  if (node.name === 'button' && node.attrs['data-tooltip-lines']) return ` ${tooltip(node)}`;
  if (SKIPPED_ELEMENTS.has(node.name)) return '';
  switch (node.name) {
    case 'br': return BREAK;
    case 'img': {
      const alt = (node.attrs.alt ?? '').trim();
      const src = absoluteUrl(node.attrs.src, context.base);
      return alt && src ? `![${escapeText(alt)}](${src})` : '';
    }
    case 'a': {
      const text = renderInline(node.children, context).trim();
      const href = absoluteUrl(node.attrs.href, context.base);
      return text && href ? `[${text}](${href})` : text;
    }
    case 'strong': case 'b': return emphasis(renderInline(node.children, context), '**');
    case 'em': case 'i': case 'cite': return emphasis(renderInline(node.children, context), '*');
    case 'code': case 'kbd': case 'samp': return inlineCode(textContent(node));
    case 'ul': case 'ol': return node.children.filter((child) => isElement(child, 'li') && !isHidden(child))
      .map((item) => renderInline(item.children, context).trim()).filter(Boolean).join('; ');
    case 'dl': return ` ${definitionEntries(node, context).map(({ term, values }) => `${term ? `${term}: ` : ''}${values.join(', ')}`).join('; ')} `;
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': return ` ${emphasis(renderInline(node.children, context).trim(), '**')} `;
    case 'details': {
      const summary = node.children.find((child) => isElement(child, 'summary'));
      const head = summary ? renderInline(summary.children, context).trim() : '';
      const rest = renderInline(node.children.filter((child) => child !== summary), context).trim();
      return [head && rest ? `${head}:` : head, rest].filter(Boolean).join(' ');
    }
    default: {
      const inner = renderInline(node.children, context);
      return BLOCK_ELEMENTS.has(node.name) ? ` ${inner} ` : inner;
    }
  }
}

function renderBlocks(nodes, context) {
  const blocks = [];
  let run = [];
  const flush = () => {
    const text = paragraph(renderInline(run, context));
    if (text) blocks.push(text);
    run = [];
  };
  for (const node of nodes) {
    if (isElement(node) && BLOCK_ELEMENTS.has(node.name)) {
      flush();
      if (!isHidden(node)) blocks.push(...renderBlock(node, context));
    } else run.push(node);
  }
  flush();
  return blocks;
}

function renderBlock(node, context) {
  if (/^h[1-6]$/.test(node.name)) {
    const text = flat(paragraph(renderInline(node.children, context)));
    return text ? [`${'#'.repeat(Number(node.name[1]))} ${text}`] : [];
  }
  switch (node.name) {
    case 'ul': case 'ol': return list(node, context);
    case 'dl': return definitionList(node, context);
    case 'table': return table(node, context);
    case 'details': {
      const summary = node.children.find((child) => isElement(child, 'summary'));
      const title = summary ? flat(paragraph(renderInline(summary.children, context))) : '';
      return [...(title ? [`**${title}**`] : []), ...renderBlocks(node.children.filter((child) => child !== summary), context)];
    }
    case 'nav': return breadcrumbs(node, context);
    case 'blockquote': return renderBlocks(node.children, context).map((block) => block.split('\n').map((line) => `> ${line}`).join('\n'));
    case 'pre': {
      const code = textContent(node).replace(/^\n|\n$/g, '');
      return code.trim() ? [`\`\`\`\n${code}\n\`\`\``] : [];
    }
    case 'hr': return ['---'];
    default: return renderBlocks(node.children, context);
  }
}

function list(node, context) {
  const ordered = node.name === 'ol';
  let number = Number.parseInt(node.attrs.start, 10) || 1;
  const items = [];
  for (const item of node.children) {
    if (!isElement(item, 'li') || isHidden(item)) continue;
    const blocks = renderBlocks(item.children, context);
    if (!blocks.length) continue;
    const marker = ordered ? `${number++}. ` : '- ';
    items.push(`${marker}${blocks.join('\n').split('\n').join(`\n${' '.repeat(marker.length)}`)}`);
  }
  return items.length ? [items.join('\n')] : [];
}

// Terms and their values in order; the page wraps each pair in a div.
function definitionEntries(node, context) {
  const entries = [];
  const visit = (children) => {
    for (const child of children) {
      if (!isElement(child) || isHidden(child)) continue;
      if (child.name === 'dt') entries.push({ term: flat(paragraph(renderInline(child.children, context))), values: [] });
      else if (child.name === 'dd') {
        if (!entries.length) entries.push({ term: '', values: [] });
        const value = flat(paragraph(renderInline(child.children, context)));
        if (value) entries.at(-1).values.push(value);
      } else if (child.name === 'div') visit(child.children);
    }
  };
  visit(node.children);
  return entries.filter(({ term, values }) => term || values.length);
}

function definitionList(node, context) {
  const lines = definitionEntries(node, context).map(({ term, values }) => `- ${term ? `**${term}:** ` : ''}${values.join('; ')}`.trimEnd());
  return lines.length ? [lines.join('\n')] : [];
}

// A row whose single cell spans the table (an expandable detail row) becomes ordinary
// Markdown between table segments; each segment repeats the header so it stays a table.
function table(node, context) {
  let caption = '';
  const rows = [];
  const cellText = (cell) => flat(paragraph(renderInline(cell.children, context))).replaceAll('|', '\\|');
  const visit = (children, head) => {
    for (const child of children) {
      if (!isElement(child) || isHidden(child)) continue;
      if (child.name === 'caption') caption = flat(paragraph(renderInline(child.children, context)));
      else if (['thead', 'tbody', 'tfoot'].includes(child.name)) visit(child.children, child.name === 'thead');
      else if (child.name === 'tr') {
        const cells = child.children.filter((cell) => isElement(cell, 'th', 'td') && !isHidden(cell));
        const span = (cell) => Math.min(Math.max(Number.parseInt(cell.attrs.colspan, 10) || 1, 1), 50);
        if (cells.length === 1 && span(cells[0]) > 1) {
          const blocks = renderBlocks(cells[0].children, context);
          if (blocks.length) rows.push({ blocks });
        } else if (cells.length) rows.push({ head, cells: cells.flatMap((cell) => [cellText(cell), ...Array(span(cell) - 1).fill('')]) });
      }
    }
  };
  visit(node.children, false);
  const output = caption ? [`**${caption}**`] : [];
  const cellRows = rows.filter((row) => row.cells);
  const header = cellRows.find((row) => row.head) ?? cellRows[0];
  const width = Math.max(0, ...cellRows.map((row) => row.cells.length));
  const line = (cells) => `| ${Array.from({ length: width }, (_, index) => cells[index] ?? '').join(' | ')} |`;
  let segment = [];
  let printed = false;
  // An empty thead-only table is omitted; a first row used as the header is data and always kept.
  const flush = () => {
    if (segment.length || (header && !header.head && !printed)) {
      output.push([line(header.cells), line(Array(width).fill('---')), ...segment.map(line)].join('\n'));
      printed = true;
    }
    segment = [];
  };
  for (const row of rows) {
    if (row === header) continue;
    if (row.blocks) {
      flush();
      output.push(...row.blocks);
    } else segment.push(row.cells);
  }
  flush();
  return output;
}

// The breadcrumb stays as one trail; in-page jump menus are omitted because their anchors are page UI.
function breadcrumbs(node, context) {
  if (!/breadcrumb/i.test(node.attrs['aria-label'] ?? '')) return [];
  const container = node.children.find((child) => isElement(child, 'ol', 'ul'));
  const items = container
    ? container.children.filter((child) => isElement(child, 'li') && !isHidden(child)).map((item) => item.children)
    : node.children.filter((child) => isElement(child, 'a') && !isHidden(child)).map((item) => [item]);
  const trail = items.map((children) => flat(paragraph(renderInline(children, context)))).filter(Boolean);
  return trail.length ? [trail.join(' › ')] : [];
}

export function htmlToMarkdown(html, { base = 'https://example.invalid/' } = {}) {
  return renderBlocks(parseHtml(html).children, { base }).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function markdownPath(file) {
  return file.replace(/\.html$/, '') + '.md';
}

function headValue(html, pattern) {
  const match = pattern.exec(html);
  return match ? decodeEntities(match[1]).trim() : '';
}

function region(html, open, close) {
  const start = html.indexOf(open);
  if (start < 0) return '';
  const end = html.indexOf(close, start + open.length);
  return html.slice(start + open.length, end < 0 ? undefined : end);
}

function frontMatter(fields) {
  const lines = Object.entries(fields).filter(([, value]) => value).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

function documentFields(html, { canonical, lastmod = '' }) {
  const head = html.slice(0, Math.max(html.indexOf('</head>'), 0));
  return {
    title: headValue(head, /<title>([^<]*)<\/title>/),
    description: headValue(head, /<meta name="description" content="([^"]*)">/),
    canonical,
    language: headValue(html, /<html lang="([^"]+)"/),
    robots: headValue(head, /<meta name="robots" content="([^"]*)">/),
    lastmod
  };
}

function finish(fields, blocks) {
  return `${frontMatter({ ...fields, rights: DATASET_RIGHTS })}\n${blocks.filter(Boolean).join('\n\n')}\n`;
}

export function pageMarkdown(html, options) {
  const main = region(html, '<main id="content">', '</main>') || region(html, '<body', '</body>').replace(/^[^>]*>/, '') || html;
  const fields = documentFields(html, options);
  if (/<(?:input|select|textarea|form)\b/i.test(main)) fields.note = 'Interactive controls on the HTML page are omitted.';
  return finish(fields, [htmlToMarkdown(main, { base: options.canonical })]);
}

// The catalog grid keeps its values in sort and filter controls, so its Markdown is a
// table of the same localized rows the page loads, each linked to its model page.
// Research leads follow under the catalog's own Partial profiles divider.
export function homeMarkdown(html, records, { labels = {}, ...options }) {
  const label = (value) => labels[value] || value;
  const cell = (value) => value == null || value === '' ? '—' : paragraph(escapeText(String(value))).replace(/\n+/g, ' ').replaceAll('|', '\\|');
  const columns = HOME_TABLE_LABELS.slice(0, 8).map(label);
  const line = (cells) => `| ${cells.join(' | ')} |`;
  const row = (record) => {
    const name = cell([record.brand, record.name].filter(Boolean).join(' '));
    const href = absoluteUrl(record.url, options.canonical);
    const price = record.price && record.priceState ? `${record.price} (${record.priceState})` : record.price;
    return line([href ? `[${name}](${href})` : name, ...[record.type, record.category, price, record.tireClearance, record.drivetrain, record.weight, record.frame].map(cell)]);
  };
  const table = (rows) => rows.length ? [line(columns), line(columns.map(() => '---')), ...rows.map(row)].join('\n') : '';
  const leads = records.filter((record) => record.stage === 'candidate');
  const intro = htmlToMarkdown(region(html, '<header class="catalog-header">', '</header>'), { base: options.canonical });
  return finish(documentFields(html, options), [
    intro,
    table(records.filter((record) => record.stage !== 'candidate')),
    leads.length ? `**${cell(label('Partial profiles'))}**` : '',
    table(leads)
  ]);
}

export function robotsTxt(sitemapUrl) {
  return [
    '# Content signals (https://contentsignals.org/): search and AI answers that use these pages are welcome.',
    '# This file expresses no AI training preference.',
    'User-agent: *',
    'Allow: /',
    `Content-Signal: ${CONTENT_SIGNAL}`,
    `Sitemap: ${sitemapUrl}`,
    ''
  ].join('\n');
}

const LLMS_SECTIONS = [
  ['Catalog and tools', [
    ['Catalog', '/', 'complete bikes, frame builds and research leads with price, tires, drivetrain and weight'],
    ['Complete bikes', '/complete-bikes/'],
    ['Framesets', '/framesets/'],
    ['Brands', '/brands/'],
    ['Price ranges', '/prices/'],
    ['Groupsets', '/electronic-shifting/', 'electronic groupset reference'],
    ['Carbon wheels', '/carbon-wheels/', 'carbon wheelset reference'],
    ['Geometry comparison', '/geometry/', 'interactive in HTML'],
    ['Build planner', '/build/', 'interactive in HTML'],
    ['Buying guides', '/blog/'],
    ['Methodology', '/methodology/', 'sourcing, price evidence and the dataset']
  ]],
  ['Data', [
    ['Catalog JSON', '/data/catalog.json'],
    ['Catalog CSV', '/data/catalog.csv'],
    ['Source records JSON', '/data/sources.json'],
    ['Sitemap', '/sitemap.xml']
  ]],
  ['Languages', [
    ['English', '/'],
    ['Simplified Chinese', '/zh/', 'catalog, model pages and guides'],
    ['German', '/de/', 'catalog, model pages and guides'],
    ['Spanish', '/es/', 'catalog and tools; product text stays in English'],
    ['Russian', '/ru/', 'catalog and tools; product text stays in English']
  ]],
  ['Optional', [
    ['Image credits', '/image-sources/'],
    ['Image policy', '/image-policy/'],
    ['Privacy', '/privacy/']
  ]]
];

// llmstxt.org index for agents: what the site is, how to read its evidence, and where the
// Markdown and data live. Only published targets are listed (`has` checks a site path).
export function llmsTxt({ siteUrl, base = '', repositoryUrl, has = () => true }) {
  const at = (path) => `${siteUrl}${base}${path}`;
  const sections = LLMS_SECTIONS.map(([title, links]) => {
    const items = links.filter(([, path]) => has(path)).map(([name, path, note]) => `- [${name}](${at(path)})${note ? `: ${note}` : ''}`);
    if (title === 'Optional') items.push(`- [Source code](${repositoryUrl})`, `- [Add or correct a bike](${repositoryUrl}/issues)`);
    return items.length ? `## ${title}\n\n${title === 'Data' ? `${DATASET_RIGHTS}\n\n` : ''}${items.join('\n')}` : '';
  });
  return `# Chinese Bikes

> Independent comparison of Chinese bicycles and framesets for buyers in Europe, North America and mainland China, using research from China, dated prices and traceable sources.

Prices are dated observations or labelled estimates, not live offers, and exclude shipping and import unless marked Delivered. Missing facts stay unknown; they are not negative evidence. Model pages show the evidence review date, price conditions and the sources behind each fact.

Every page has a Markdown version: request the page URL with \`Accept: text/markdown\`, or add \`index.md\` to it (for example ${at('/index.md')}). The catalog's Markdown is a table of every bike with links to its model page.

${sections.filter(Boolean).join('\n\n')}
`;
}
