// Offline authoring and checks for the link-preview clips (see src/lib/social-video.mjs).
//   npm run social-video:author             build, then encode a clip for every preview still the pages
//                                           show without one (and the shared fallback), update the
//                                           manifest and freeze the route coverage
//   node scripts/social-video.mjs author --limit N encode at most N new still clips this run
//   node scripts/social-video.mjs author --prune   also delete clips no page uses any more
//   node scripts/social-video.mjs author --rebuild re-encode everything after a design change
//   node scripts/social-video.mjs check     validate the committed clips and the built pages
// The plan follows the last build's rendered og:image values, so it always matches the renderer.
// Encoding needs MEDIA_PYTHON (Pillow with AVIF) and FFmpeg; see scripts/social-video.py.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { LOCALE_PREFIXES } from '../src/lib/i18n.mjs';
import {
  COVERAGE_PATH, KIT_PATH, MANIFEST_PATH, CLIP_LIMITS, auditSocialVideoPages, clipErrors, fileHash,
  loadSocialVideoManifest, validateSocialVideoAssets
} from '../src/lib/social-video.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const localeOf = Object.fromEntries(Object.entries(LOCALE_PREFIXES).filter(([, prefix]) => prefix).map(([locale, prefix]) => [prefix, locale]));

export function readBuiltPages(directory = dist) {
  const pages = [];
  const walk = (folder) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) { if (!(folder === directory && ['assets', 'data'].includes(entry.name))) walk(file); continue; }
      if (!entry.name.endsWith('.html')) continue;
      const route = `/${path.relative(directory, file).split(path.sep).join('/')}`.replace(/index\.html$/, '');
      const prefix = route.match(/^\/(zh|de|es|ru)(?=\/)/)?.[0] ?? '';
      pages.push({ route, canonical: route.slice(prefix.length) || '/', locale: localeOf[prefix] ?? 'en', html: fs.readFileSync(file, 'utf8') });
    }
  };
  walk(directory);
  return pages.sort((a, b) => a.route.localeCompare(b.route));
}

function kindOf(canonical) {
  if (canonical === '/') return 'home';
  if (canonical.startsWith('/models/')) return 'model';
  if (canonical === '/blog/') return 'blog-index';
  return canonical.startsWith('/blog/') ? 'post' : 'page';
}

// Canonical routes with their languages and preview still, from the built pages.
function plan(pages, prefix) {
  const routes = {};
  const stills = new Map();
  for (const page of pages) {
    if (page.canonical.endsWith('/404.html')) continue;
    const kind = kindOf(page.canonical);
    const image = page.html.match(/<meta property="og:image" content="([^"]*)">/)?.[1] ?? '';
    const still = kind !== 'home' && image.startsWith(prefix) ? image.slice(prefix.length) : '';
    const digest = still ? fileHash(root, still) : '';
    if (still && !digest) throw new Error(`${page.route}: preview still ${still} is missing`);
    const route = routes[page.canonical] ??= { kind, locales: [], source: digest || null };
    if (route.source !== (digest || null)) throw new Error(`${page.canonical}: languages show different preview stills`);
    route.locales.push(page.locale);
    if (digest && !stills.has(digest)) stills.set(digest, { path: still, kind: kind === 'model' ? 'photo' : 'cover' });
  }
  return { routes, stills };
}

// Which reviewed records a still belongs to; their credits, rights and review dates stay there.
function provenanceIndex() {
  const images = new Map();
  for (const name of fs.readdirSync(path.join(root, 'data/images')).filter((item) => item.endsWith('.json')).sort()) {
    const record = JSON.parse(fs.readFileSync(path.join(root, 'data/images', name), 'utf8'));
    const digest = record.hosting?.mode === 'local' ? fileHash(root, record.hosting.local_path ?? '') : '';
    if (digest) images.set(digest, [...(images.get(digest) ?? []), record.id]);
  }
  const covers = new Map();
  for (const image of JSON.parse(fs.readFileSync(path.join(root, 'content/blog-images.json'), 'utf8')).images) {
    for (const file of image.header?.files ?? []) if (file.purpose === 'social') covers.set(fileHash(root, file.path), image.id);
  }
  return { images, covers };
}

function python(args, input) {
  const command = process.env.MEDIA_PYTHON || 'python3';
  const result = spawnSync(command, ['-B', path.join(root, 'scripts/social-video.py'), ...args],
    { input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'inherit'] });
  const lines = (result.stdout ?? '').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  return { ok: result.status === 0, lines, error: result.error };
}

// Stable, diff-friendly JSON: the long list (clips or routes) keeps one entry per line.
function writeJson(relative, value, listKey) {
  const list = value[listKey];
  const body = Array.isArray(list)
    ? `[\n${list.map((item) => `    ${JSON.stringify(item)}`).join(',\n')}\n  ]`
    : `{\n${Object.entries(list).map(([key, item]) => `    ${JSON.stringify(key)}: ${JSON.stringify(item)}`).join(',\n')}\n  }`;
  const text = JSON.stringify({ ...value, [listKey]: '\u0000list' }, null, 2).replace('"\\u0000list"', () => body);
  fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  fs.writeFileSync(path.join(root, relative), `${text}\n`);
}

function author({ prune = false, rebuild = false, limit = Infinity } = {}) {
  const build = JSON.parse(fs.readFileSync(path.join(dist, 'build-manifest.json'), 'utf8'));
  const pages = readBuiltPages();
  const { routes, stills } = plan(pages, `${build.site_url}${build.base}/`);
  const previous = loadSocialVideoManifest(root);
  const design = python(['design']);
  if (!design.ok) throw new Error('scripts/social-video.py design failed; check MEDIA_PYTHON');
  const kit = JSON.parse(fs.readFileSync(path.join(root, KIT_PATH), 'utf8'));
  const settings = { ...design.lines[0], kit: { file: path.posix.join(path.posix.dirname(KIT_PATH), kit.file), sha256: kit.sha256 } };
  const sameDesign = JSON.stringify(previous.design?.settings) === JSON.stringify(settings);
  if (previous.fallback && !sameDesign && !rebuild) throw new Error('clip design or kit changed; rerun with --rebuild to re-encode every clip');
  const keep = rebuild ? [] : previous.clips.filter((clip) => stills.has(clip.source.sha256) || !prune);
  const have = new Set(keep.map((clip) => clip.source.sha256));
  const todo = [...stills].filter(([digest]) => !have.has(digest)).slice(0, limit)
    .map(([digest, still]) => ({ key: digest, kind: still.kind, source: { path: still.path } }));
  if (rebuild || !previous.fallback) todo.push({ key: 'fallback', kind: 'brand', source: null });
  console.log(`Social previews: ${stills.size} stills on ${Object.keys(routes).length} routes; encoding ${todo.length} clip(s).`);
  const result = todo.length ? python(['encode'], JSON.stringify({ clips: todo })) : { ok: true, lines: [] };
  const { images, covers } = provenanceIndex();
  const made = new Map(result.lines.map((line) => [line.key, line]));
  const entry = (line, still) => {
    const clip = {
      kind: still ? still.kind : 'brand', file: line.file, sha256: line.sha256, bytes: line.bytes,
      width: CLIP_LIMITS.width, height: CLIP_LIMITS.height, fps: CLIP_LIMITS.fps, frames: CLIP_LIMITS.frames,
      duration_s: line.duration_s, crf: line.crf, encoder: line.encoder, layout: line.layout
    };
    if (!still) return clip;
    clip.source = { path: still.path, sha256: line.key, width: line.source_size[0], height: line.source_size[1] };
    if (still.kind === 'photo') clip.images = images.get(line.key) ?? [];
    else clip.editorial_image = covers.get(line.key) ?? null;
    return clip;
  };
  const clips = [...keep, ...[...stills].filter(([digest]) => made.has(digest)).map(([digest, still]) => entry(made.get(digest), still))]
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.source.path.localeCompare(b.source.path));
  const fallback = made.has('fallback') ? entry(made.get('fallback'), null) : previous.fallback;
  const listed = new Set([...clips, fallback].filter(Boolean).map((clip) => clip.file));
  const dropped = [...new Set([...previous.clips, previous.fallback].filter(Boolean).map((clip) => clip.file))].filter((file) => !listed.has(file));
  for (const clip of [...clips, fallback].filter(Boolean)) {
    const errors = clipErrors(fs.readFileSync(path.join(root, clip.file)), clip);
    if (errors.length) throw new Error(errors.join('\n'));
  }
  writeJson(MANIFEST_PATH, {
    schema_version: 1,
    purpose: 'Link-preview clips (og:video) for apps that play a direct MP4 inline. Each page keeps its og:image as the still fallback.',
    use_of_stills: 'A clip shows its page\'s existing preview still exactly as reviewed and published: the same file, uncropped, only scaled down to fit and never upscaled, with transparent areas on the site\'s white image surface. Beside it, the site\'s riding mascot and the domain ChineseBikes.xyz are the only additions, and only the mascot moves. A product photo still serves model identification as on its page; its source, owner, credit, rights status, removal route and review dates remain in the listed image records (data/images.json), and no new licence is asserted. Article covers are project-made scenes (content/blog-images.json) and establish no exact-model identity. Pages without a preview still share the fallback, which shows only the mascot and the domain.',
    design: { settings, kit_provenance: kit.provenance },
    fallback,
    clips
  }, 'clips');
  const covered = Object.fromEntries(Object.entries(routes).sort(([a], [b]) => a.localeCompare(b))
    .map(([route, entry]) => [route, { ...entry, locales: entry.locales.sort() }]));
  const usable = new Set(clips.map((clip) => clip.source.sha256));
  writeJson(COVERAGE_PATH, {
    schema_version: 1,
    frozen_on: new Date().toISOString().slice(0, 10),
    note: 'Canonical public routes, their languages and preview-still SHA-256 when the clips were last authored. A route whose still is unchanged must keep its clip; new or changed stills use the fallback until authored. /404.html publishes no clip.',
    totals: {
      routes: Object.keys(covered).length,
      pages: Object.values(covered).reduce((sum, route) => sum + route.locales.length, 0),
      image_specific_clips: clips.length,
      routes_with_image_clip: Object.values(covered).filter((route) => route.source && usable.has(route.source)).length,
      routes_with_fallback: Object.values(covered).filter((route) => route.kind !== 'home' && !(route.source && usable.has(route.source))).length
    },
    routes: covered
  }, 'routes');
  if (prune || rebuild) for (const file of dropped) fs.rmSync(path.join(root, file), { force: true });
  console.log(`Encoded ${made.size}; manifest lists ${clips.length} still clips + fallback${dropped.length && (prune || rebuild) ? `; removed ${dropped.length} unused` : ''}. Rebuild to publish.`);
  if (!result.ok) throw new Error('encoding stopped early; finished clips were kept and recorded. Fix the reported problem and rerun.');
}

function check() {
  const errors = validateSocialVideoAssets(root);
  let summary = null;
  if (fs.existsSync(path.join(dist, 'build-manifest.json'))) {
    const build = JSON.parse(fs.readFileSync(path.join(dist, 'build-manifest.json'), 'utf8'));
    const coverage = JSON.parse(fs.readFileSync(path.join(root, COVERAGE_PATH), 'utf8'));
    const audit = auditSocialVideoPages(readBuiltPages(), { siteUrl: build.site_url, base: build.base, root, coverage });
    errors.push(...audit.errors);
    summary = audit.summary;
  }
  if (errors.length) {
    console.error(`Social-video check found ${errors.length} problem(s):\n${errors.slice(0, 50).map((error) => `- ${error}`).join('\n')}`);
    process.exitCode = 1;
    return;
  }
  const manifest = loadSocialVideoManifest(root);
  const sizes = [...manifest.clips, manifest.fallback].map((clip) => clip.bytes).sort((a, b) => a - b);
  const pick = (q) => sizes[Math.min(sizes.length - 1, Math.ceil(q * sizes.length) - 1)];
  console.log(JSON.stringify({ files: sizes.length, total_bytes: sizes.reduce((a, b) => a + b, 0), p50: pick(0.5), p95: pick(0.95), max: sizes.at(-1), pages: summary }, null, 1));
}

const [command, ...flags] = process.argv.slice(2);
const limit = flags.includes('--limit') ? Number(flags[flags.indexOf('--limit') + 1]) : Infinity;
if (command === 'author' && !(limit > 0)) throw new Error('--limit needs a positive number');
if (command === 'author') author({ prune: flags.includes('--prune'), rebuild: flags.includes('--rebuild'), limit });
else if (command === 'check') check();
else {
  console.error('usage: node scripts/social-video.mjs author [--prune] [--rebuild] | check');
  process.exitCode = 2;
}
