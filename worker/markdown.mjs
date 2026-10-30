// Markdown alternates for agents. The build writes each public page's Markdown
// beside its HTML as index.md; this module negotiates and labels it.

// Matches robots.txt (src/lib/agent-markdown.mjs): no ai-train preference is expressed.
export const CONTENT_SIGNAL = 'search=yes, ai-input=yes';
const MARKDOWN_TYPES = new Set(['text/markdown', 'text/x-markdown']);

// Only an explicit Markdown range opts in; browsers send text/html and */*.
// Markdown wins when its quality is at least the best HTML quality.
export function prefersMarkdown(accept = '') {
  let markdown = 0;
  let html = 0;
  let htmlSpecificity = -1;
  for (const part of String(accept ?? '').split(',')) {
    const [range = '', ...parameters] = part.split(';').map((value) => value.trim().toLowerCase());
    const qParameter = parameters.find((parameter) => /^q\s*=/.test(parameter));
    const parsed = qParameter ? Number(qParameter.replace(/^q\s*=\s*/, '')) : 1;
    const quality = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1) : 0;
    if (MARKDOWN_TYPES.has(range)) markdown = Math.max(markdown, quality);
    const specificity = range === 'text/html' ? 2 : range === 'text/*' ? 1 : range === '*/*' ? 0 : -1;
    if (specificity > htmlSpecificity) {
      htmlSpecificity = specificity;
      html = quality;
    }
  }
  return markdown > 0 && markdown >= html;
}

// Document routes end in a slash; their Markdown is the sibling index.md.
export function markdownAlternatePath(pathname) {
  return pathname.endsWith('/') ? `${pathname}index.md` : '';
}

export function isMarkdownDocumentPath(pathname) {
  return pathname.endsWith('/index.md');
}

export function appendVary(headers, value) {
  const current = (headers.get('vary') ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  if (!current.some((item) => item === '*' || item.toLowerCase() === value.toLowerCase())) headers.set('vary', [...current, value].join(', '));
}

function frontMatterRobots(text) {
  if (!text.startsWith('---\n')) return '';
  const end = text.indexOf('\n---\n', 3);
  return /^robots: "([^"\n]*)"$/m.exec(end < 0 ? '' : text.slice(4, end))?.[1] ?? '';
}

// The Markdown repeats the HTML page's robots directive, so a noindex page stays
// noindex however it is requested. A .md URL also names its HTML page as canonical.
export async function markdownResponse(asset, request, { canonical = '', negotiated = false } = {}) {
  const headers = new Headers(asset.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  if (negotiated) appendVary(headers, 'Accept');
  if (asset.status === 304) return new Response(null, { status: 304, headers });
  const text = await asset.text();
  headers.set('content-type', 'text/markdown; charset=utf-8');
  headers.set('content-signal', CONTENT_SIGNAL);
  if (canonical) headers.set('link', `<${canonical}>; rel="canonical"`);
  const robots = frontMatterRobots(text);
  if (robots.includes('noindex')) headers.set('x-robots-tag', robots);
  return new Response(request.method === 'HEAD' ? null : text, { status: asset.status, statusText: asset.statusText, headers });
}
