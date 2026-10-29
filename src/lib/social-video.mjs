// Link-preview clips (og:video). Each distinct preview still has one project-made MP4, shared by every
// language and every page that shows the same file; pages without a still, or whose clip is not yet
// authored, share one branded clip. `npm run social-video:author` encodes offline
// (scripts/social-video.mjs + scripts/social-video.py); builds only select files and visitors never
// load them in pages.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
export const MANIFEST_PATH = 'assets/social-video/manifest.json';
export const COVERAGE_PATH = 'content/social-video/coverage.json';
export const KIT_PATH = 'content/social-video/riding-mascot-kit.json';
export const HOME_PROVENANCE_PATH = 'assets/social-video/home-switchback-signature.provenance.json';
export const CLIP_LIMITS = { width: 960, height: 540, fps: 24, frames: 96, ceilingBytes: 400_000 };

// Before the first authoring run there is no manifest: pages then publish no og:video and the tests fail.
export function loadSocialVideoManifest(root = repositoryRoot) {
  const file = path.join(root, MANIFEST_PATH);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { clips: [], fallback: null };
}

const manifest = loadSocialVideoManifest();
const sourceHashes = new Map();

export function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// SHA-256 of a repository file, or '' when it is missing; cached for the build.
export function fileHash(root, relative) {
  const file = path.resolve(root, relative.replace(/^\/+/, ''));
  if (!file.startsWith(path.join(root, 'assets') + path.sep)) return '';
  if (!sourceHashes.has(file)) {
    let digest = '';
    try { digest = sha256(fs.readFileSync(file)); } catch { /* missing still: shared fallback */ }
    sourceHashes.set(file, digest);
  }
  return sourceHashes.get(file);
}

// The page's own preview still (a base-prefixed /assets/ path) selects its clip; anything else, including
// a still whose clip is not yet authored, shares the fallback.
export function socialVideoClip(base, image, { root = repositoryRoot, data = manifest } = {}) {
  const local = typeof image === 'string' && image.startsWith(`${base}/assets/`) ? image.slice(base.length) : '';
  const digest = local ? fileHash(root, local) : '';
  return (digest && data.clips.find((clip) => clip.source.sha256 === digest)) || data.fallback;
}

export function socialVideoFor(base, image, options) {
  const clip = socialVideoClip(base, image, options);
  return clip ? { url: `${base}/${clip.file}`, type: 'video/mp4', width: clip.width, height: clip.height } : null;
}

// ----- MP4 inspection (no external tools, so CI can verify every committed clip) -----
function boxes(buffer, start = 0, end = buffer.length) {
  const out = [];
  for (let offset = start; offset + 8 <= end;) {
    let size = buffer.readUInt32BE(offset);
    let header = 8;
    if (size === 1) { size = Number(buffer.readBigUInt64BE(offset + 8)); header = 16; }
    else if (size === 0) size = end - offset;
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    if (size < header || offset + size > end) throw new Error(`invalid ${type} box`);
    out.push({ type, start: offset + header, end: offset + size });
    offset += size;
  }
  return out;
}
const find = (buffer, box, type) => box && boxes(buffer, box.start, box.end).find((item) => item.type === type);

export function inspectMp4(buffer) {
  const top = boxes(buffer);
  const order = top.map((box) => box.type);
  const ftyp = top.find((box) => box.type === 'ftyp');
  const moov = top.find((box) => box.type === 'moov');
  const tracks = moov ? boxes(buffer, moov.start, moov.end).filter((box) => box.type === 'trak') : [];
  const info = { order, brand: ftyp ? buffer.toString('latin1', ftyp.start, ftyp.start + 4) : '', tracks: [] };
  for (const trak of tracks) {
    const mdia = find(buffer, trak, 'mdia');
    const hdlr = find(buffer, mdia, 'hdlr');
    const mdhd = find(buffer, mdia, 'mdhd');
    const stbl = find(buffer, find(buffer, mdia, 'minf'), 'stbl');
    const tkhd = find(buffer, trak, 'tkhd');
    const track = { handler: hdlr ? buffer.toString('latin1', hdlr.start + 8, hdlr.start + 12) : '' };
    if (tkhd) {
      const at = buffer[tkhd.start] === 1 ? 88 : 76;
      track.width = buffer.readUInt32BE(tkhd.start + at) / 65536;
      track.height = buffer.readUInt32BE(tkhd.start + at + 4) / 65536;
    }
    if (mdhd) track.timescale = buffer.readUInt32BE(mdhd.start + (buffer[mdhd.start] === 1 ? 20 : 12));
    const stsd = find(buffer, stbl, 'stsd');
    if (stsd) {
      const entry = boxes(buffer, stsd.start + 8, stsd.end)[0];
      track.codec = entry?.type;
      const avcC = entry?.type === 'avc1' ? boxes(buffer, entry.start + 78, entry.end).find((box) => box.type === 'avcC') : null;
      if (avcC) { track.profile = buffer[avcC.start + 1]; track.level = buffer[avcC.start + 3]; }
    }
    const stts = find(buffer, stbl, 'stts');
    if (stts) {
      const deltas = new Set();
      track.frames = 0;
      for (let i = 0, count = buffer.readUInt32BE(stts.start + 4); i < count; i++) {
        track.frames += buffer.readUInt32BE(stts.start + 8 + i * 8);
        deltas.add(buffer.readUInt32BE(stts.start + 12 + i * 8));
      }
      track.fps = deltas.size === 1 ? track.timescale / [...deltas][0] : null;
    }
    info.tracks.push(track);
  }
  // Tags live in moov/udta, as items of meta/ilst (meta is a full box: four version/flag bytes first).
  const udta = find(buffer, moov, 'udta');
  const extra = udta ? boxes(buffer, udta.start, udta.end).filter((box) => box.type !== 'meta').length : 0;
  const meta = find(buffer, udta, 'meta');
  const ilst = meta && boxes(buffer, meta.start + 4, meta.end).find((box) => box.type === 'ilst');
  info.metadataItems = extra + (ilst ? boxes(buffer, ilst.start, ilst.end).length : 0);
  return info;
}

// Errors for one clip file against its manifest entry and the delivery contract.
export function clipErrors(buffer, entry) {
  const errors = [];
  const label = entry.file;
  if (sha256(buffer) !== entry.sha256 || buffer.length !== entry.bytes) errors.push(`${label}: bytes or SHA-256 differ from the manifest`);
  if (!new RegExp(`^assets/social-video/(?:photo|cover|brand)-${entry.sha256.slice(0, 16)}\\.mp4$`).test(label)) errors.push(`${label}: name is not <kind>-<sha256[:16]>.mp4`);
  if (buffer.length > CLIP_LIMITS.ceilingBytes) errors.push(`${label}: ${buffer.length} bytes exceeds the ${CLIP_LIMITS.ceilingBytes}-byte ceiling`);
  let info;
  try { info = inspectMp4(buffer); } catch (error) { return [...errors, `${label}: ${error.message}`]; }
  const [track] = info.tracks;
  const checks = {
    'is an isom MP4': info.order[0] === 'ftyp' && info.brand === 'isom',
    'is fast-start (moov before mdat)': info.order.includes('moov') && info.order.indexOf('moov') < info.order.indexOf('mdat'),
    'has one video track and no audio': info.tracks.length === 1 && track.handler === 'vide',
    'is H.264 High 3.1': track?.codec === 'avc1' && track.profile === 100 && track.level === 31,
    'has the recorded dimensions': track?.width === entry.width && track?.height === entry.height
      && entry.width === CLIP_LIMITS.width && entry.height === CLIP_LIMITS.height,
    'has 96 frames at 24 fps': track?.frames === CLIP_LIMITS.frames && track?.fps === CLIP_LIMITS.fps,
    'carries no metadata items': info.metadataItems === 0,
  };
  for (const [name, ok] of Object.entries(checks)) if (!ok) errors.push(`${label}: ${name}`);
  return errors;
}

// Manifest <-> files: every clip listed once, present and valid; no unlisted MP4; stills unchanged.
export function validateSocialVideoAssets(root = repositoryRoot, data = loadSocialVideoManifest(root)) {
  const errors = data.fallback ? [] : [`${MANIFEST_PATH}: missing, or without the shared fallback clip`];
  const entries = [...data.clips, ...(data.fallback ? [data.fallback] : [])];
  const files = new Set();
  const sources = new Set();
  for (const entry of entries) {
    if (files.has(entry.file)) errors.push(`${entry.file}: listed twice`);
    files.add(entry.file);
    let buffer;
    try { buffer = fs.readFileSync(path.join(root, entry.file)); } catch { errors.push(`${entry.file}: missing`); continue; }
    errors.push(...clipErrors(buffer, entry));
    if (entry === data.fallback) {
      if (entry.kind !== 'brand' || entry.source) errors.push(`${entry.file}: the fallback shows no preview still`);
      continue;
    }
    if (sources.has(entry.source.sha256)) errors.push(`${entry.file}: a second clip for the same still`);
    sources.add(entry.source.sha256);
    if (fileHash(root, entry.source.path) !== entry.source.sha256) errors.push(`${entry.file}: preview still ${entry.source.path} changed or is missing`);
    if (!['photo', 'cover'].includes(entry.kind)) errors.push(`${entry.file}: unknown kind ${entry.kind}`);
  }
  const home = JSON.parse(fs.readFileSync(path.join(root, HOME_PROVENANCE_PATH), 'utf8')).output.path;
  for (const name of fs.readdirSync(path.join(root, 'assets/social-video'))) {
    const relative = `assets/social-video/${name}`;
    if (name.endsWith('.mp4') && !files.has(relative) && relative !== home) errors.push(`${relative}: MP4 not listed in the manifest`);
  }
  return errors;
}

// ----- Rendered pages -----
const metaContent = (html, property) => [...html.matchAll(new RegExp(`<meta property="${property}" content="([^"]*)">`, 'g'))].map((match) => match[1]);

// Each public page names exactly one existing MP4 group whose clip matches its preview still, all
// languages of a route share it, frozen coverage never silently falls back, and no page loads a clip.
export function auditSocialVideoPages(pages, { siteUrl, base = '', root = repositoryRoot, data = loadSocialVideoManifest(root), coverage = null } = {}) {
  const errors = [];
  const prefix = `${siteUrl}${base}/`;
  const home = JSON.parse(fs.readFileSync(path.join(root, HOME_PROVENANCE_PATH), 'utf8')).output;
  const byFile = new Map([...data.clips, data.fallback].filter(Boolean).map((entry) => [entry.file, entry]));
  const routes = new Map();
  const pending = new Set();
  let count = 0;
  let fallbackPages = 0;
  for (const { route, canonical, html } of pages) {
    if (canonical.endsWith('/404.html')) {
      if (metaContent(html, 'og:video').length) errors.push(`${route}: error pages publish no og:video`);
      continue;
    }
    count++;
    const [video, ...extra] = metaContent(html, 'og:video');
    const [secure] = metaContent(html, 'og:video:secure_url');
    const [type] = metaContent(html, 'og:video:type');
    const [width] = metaContent(html, 'og:video:width');
    const [height] = metaContent(html, 'og:video:height');
    if (!video || extra.length || secure !== video || type !== 'video/mp4' || !video.startsWith(prefix)) {
      errors.push(`${route}: needs exactly one same-site MP4 og:video group`);
      continue;
    }
    const file = video.slice(prefix.length);
    const entry = canonical === '/' ? (file === home.path ? home.dimensions : null) : byFile.get(file);
    if (!entry) errors.push(`${route}: og:video ${file} is not a published clip`);
    else if (Number(width) !== entry.width || Number(height) !== entry.height) errors.push(`${route}: og:video dimensions differ from ${file}`);
    const body = html.replace(/<meta property="og:video[^>]*>/g, '');
    if (/<video\b|social-video\/|\.mp4\b/i.test(body)) errors.push(`${route}: the page itself references a video file`);
    if (canonical !== '/') {
      const [image] = metaContent(html, 'og:image');
      const still = image?.startsWith(prefix) ? image.slice(prefix.length) : '';
      const digest = still ? fileHash(root, still) : '';
      const expected = (digest && data.clips.find((clip) => clip.source.sha256 === digest)) || data.fallback;
      if (entry && file !== expected.file) errors.push(`${route}: og:video ${file} does not match its preview still`);
      if (expected === data.fallback) {
        fallbackPages++;
        if (digest) pending.add(canonical);
      }
      const frozen = coverage?.routes?.[canonical];
      if (frozen?.source && frozen.source === digest && expected === data.fallback) errors.push(`${route}: covered still lost its clip (manifest omission)`);
    }
    const seen = routes.get(canonical);
    if (seen && seen !== file) errors.push(`${route}: languages of ${canonical} use different clips`);
    routes.set(canonical, file);
  }
  return { errors, summary: { pages: count, routes: routes.size, clips: new Set(routes.values()).size, fallbackPages, pendingRoutes: [...pending].sort() } };
}
