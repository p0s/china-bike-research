#!/usr/bin/env node

/**
 * Offline-only helpers for a bounded, ignored video-research corpus.
 *
 * Acquisition is deliberately separate. This script never opens the network:
 * it validates public-source metadata, normalizes caption files already saved
 * under .research/, and compares explicit names with the structured catalog.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptFile = fileURLToPath(import.meta.url);
export const projectRoot = path.resolve(path.dirname(scriptFile), '..');
export const defaultCorpusRoot = path.join(projectRoot, '.research', 'video-corpus');
export const defaultReportPath = path.join(projectRoot, '.research', 'reports', 'video-coverage.json');

const allowedHosts = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
  'bilibili.com', 'www.bilibili.com', 'b23.tv', 'www.b23.tv'
]);
const forbiddenFile = /(?:cookie|session|credential|comment|danmaku)|\.(?:mp4|m4a|mp3|webm|mov|avi|jpg|jpeg|png|gif|webp)$/i;
const modelTypes = new Set(['platform', 'variant', 'candidate', 'exclusion']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function dateOnly(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function parseTimecode(value) {
  const match = String(value).trim().replace(',', '.').match(/^(?:(\d+):)?(\d{1,2}):(\d{2})\.(\d{3})/);
  if (!match) return undefined;
  return Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

function cleanCueText(value) {
  return String(value)
    .replace(/<\/?(?:c|i|b|u|ruby|rt|v)(?:\s[^>]*)?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\u200b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse WebVTT or SRT into timestamped plain-text segments. */
export function parseWebVtt(text) {
  const lines = String(text).replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n');
  const cues = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line || line === 'WEBVTT' || line.startsWith('NOTE') || line.startsWith('STYLE') || line.startsWith('REGION')) {
      index += 1;
      continue;
    }
    const timing = line.includes('-->') ? line : lines[index + 1]?.includes('-->') ? lines[++index] : '';
    if (!timing) {
      index += 1;
      continue;
    }
    const [fromRaw, toRaw] = timing.split('-->').map((part) => part.trim().split(/\s+/)[0]);
    const start = parseTimecode(fromRaw);
    const end = parseTimecode(toRaw);
    index += 1;
    const body = [];
    while (index < lines.length && lines[index].trim() !== '') body.push(lines[index++]);
    const cue = cleanCueText(body.join(' '));
    if (start !== undefined && end !== undefined && cue) cues.push({ start, end, text: cue });
    index += 1;
  }
  return cues;
}

/** Parse Bilibili BCC JSON and the common YouTube JSON3 shape. */
export function parseBilibiliJson(value) {
  const data = typeof value === 'string' ? JSON.parse(value) : value;
  const body = Array.isArray(data) ? data : data?.body ?? data?.data?.body ?? data?.events;
  if (!Array.isArray(body)) return [];
  return body.flatMap((cue) => {
    if (typeof cue?.content === 'string') {
      const start = Number(cue.from ?? cue.start ?? cue.tStartMs / 1000);
      const end = Number(cue.to ?? cue.end ?? ((cue.tStartMs ?? 0) + (cue.dDurationMs ?? 0)) / 1000);
      const text = cleanCueText(cue.content);
      return Number.isFinite(start) && Number.isFinite(end) && text ? [{ start, end, text }] : [];
    }
    const text = cleanCueText(cue?.segs?.map((part) => part.utf8 ?? '').join('') ?? cue?.text ?? '');
    const start = Number(cue?.tStartMs ?? cue?.start ?? 0) / (cue?.tStartMs !== undefined ? 1000 : 1);
    const end = start + Number(cue?.dDurationMs ?? cue?.duration ?? 0) / (cue?.dDurationMs !== undefined ? 1000 : 1);
    return text && Number.isFinite(start) && Number.isFinite(end) ? [{ start, end, text }] : [];
  });
}

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\u2010-\u2015–—]/g, '-')
    .replace(/[^\p{L}\p{N}+#-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCaptionFile(file, text) {
  return path.extname(file).toLowerCase() === '.json' ? parseBilibiliJson(text) : parseWebVtt(text);
}

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? walkFiles(file) : [file];
  });
}

function videoDirectories(corpusRoot) {
  if (!fs.existsSync(corpusRoot)) return [];
  const result = [];
  for (const platform of fs.readdirSync(corpusRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const platformDir = path.join(corpusRoot, platform.name);
    for (const channel of fs.readdirSync(platformDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
      const channelDir = path.join(platformDir, channel.name);
      for (const video of fs.readdirSync(channelDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
        result.push({ platform: platform.name, channel: channel.name, video: video.name, dir: path.join(channelDir, video.name) });
      }
    }
  }
  return result;
}

export function validateMetadata(metadata, location = 'metadata.json') {
  const errors = [];
  if (!isObject(metadata)) return [`${location}: metadata must be an object`];
  for (const field of ['platform', 'video_id', 'url', 'channel_id', 'title', 'language', 'caption_source', 'status', 'retrieved_at']) {
    if (metadata[field] === undefined || metadata[field] === null || metadata[field] === '') errors.push(`${location}: missing ${field}`);
  }
  if (!['youtube', 'bilibili'].includes(metadata.platform)) errors.push(`${location}: platform must be youtube or bilibili`);
  if (metadata.status && !['captured', 'no-captions', 'blocked', 'failed'].includes(metadata.status)) errors.push(`${location}: invalid status ${metadata.status}`);
  if (metadata.caption_source && !['creator', 'automatic', 'platform', 'none', 'unknown'].includes(metadata.caption_source)) errors.push(`${location}: invalid caption_source ${metadata.caption_source}`);
  if (metadata.url) {
    try {
      const parsed = new URL(metadata.url);
      if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) errors.push(`${location}: URL host/protocol is not an allowed public video host`);
      if (parsed.username || parsed.password) errors.push(`${location}: URL must not contain credentials`);
      if (metadata.platform === 'youtube') {
        const id = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v');
        if (id !== metadata.video_id) errors.push(`${location}: URL video identity mismatch`);
      }
    } catch {
      errors.push(`${location}: invalid URL`);
    }
  }
  if (metadata.published_at && !dateOnly(metadata.published_at)) errors.push(`${location}: published_at must be YYYY-MM-DD`);
  if (metadata.accessed_at && !dateOnly(metadata.accessed_at)) errors.push(`${location}: accessed_at must be YYYY-MM-DD`);
  if (metadata.retrieved_at && Number.isNaN(Date.parse(metadata.retrieved_at))) errors.push(`${location}: retrieved_at must be an ISO date-time`);
  if (metadata.discovery_mentions !== undefined) {
    if (!Array.isArray(metadata.discovery_mentions)) errors.push(`${location}: discovery_mentions must be an array`);
    else for (const [index, mention] of metadata.discovery_mentions.entries()) {
      if (!isObject(mention) || typeof mention.name !== 'string' || !mention.name.trim() || !Number.isFinite(mention.at_seconds) || mention.at_seconds < 0 || typeof mention.basis !== 'string' || !mention.basis.trim()) {
        errors.push(`${location}: invalid discovery_mentions[${index}]`);
      }
    }
  }
  return errors;
}

export function validateCorpus(corpusRoot = defaultCorpusRoot) {
  const errors = [];
  for (const file of walkFiles(corpusRoot)) {
    if (forbiddenFile.test(path.basename(file))) errors.push(`forbidden raw/media file: ${path.relative(corpusRoot, file)}`);
  }
  for (const item of videoDirectories(corpusRoot)) {
    const metadataFile = path.join(item.dir, 'metadata.json');
    const relative = path.relative(corpusRoot, metadataFile);
    if (!fs.existsSync(metadataFile)) {
      errors.push(`${path.relative(corpusRoot, item.dir)}: missing metadata.json`);
      continue;
    }
    const metadata = readJson(metadataFile);
    errors.push(...validateMetadata(metadata, relative));
    if (metadata.platform !== item.platform) errors.push(`${relative}: platform does not match corpus path`);
    if (metadata.channel_id !== 'unknown' && metadata.channel_id !== item.channel) errors.push(`${relative}: channel_id does not match corpus path`);
    if (metadata.video_id !== item.video) errors.push(`${relative}: video_id does not match corpus path`);
    const captions = fs.readdirSync(item.dir).filter((name) => /^captions-original\.(?:vtt|srt|json)$/i.test(name));
    if (metadata.status === 'captured' && captions.length === 0) errors.push(`${path.relative(corpusRoot, item.dir)}: captured video has no captions-original file`);
    if (metadata.status !== 'captured' && captions.length) errors.push(`${relative}: non-captured record contains stale captions`);
    if (captions.length > 1) errors.push(`${path.relative(corpusRoot, item.dir)}: multiple original caption files; keep one language per record`);
  }
  return errors;
}

export function normalizeCorpus(corpusRoot = defaultCorpusRoot) {
  const errors = validateCorpus(corpusRoot);
  if (errors.length) throw new Error(errors.join('\n'));
  const videos = [];
  for (const item of videoDirectories(corpusRoot)) {
    const metadataFile = path.join(item.dir, 'metadata.json');
    if (!fs.existsSync(metadataFile)) continue;
    const metadata = readJson(metadataFile);
    const captionFile = fs.readdirSync(item.dir).find((name) => /^captions-original\.(?:vtt|srt|json)$/i.test(name));
    const parsed = captionFile ? parseCaptionFile(captionFile, fs.readFileSync(path.join(item.dir, captionFile), 'utf8')) : [];
    const segments = parsed.filter((segment) => segment.end >= segment.start).sort((a, b) => a.start - b.start);
    writeJson(path.join(item.dir, 'segments.json'), segments);
    fs.writeFileSync(path.join(item.dir, 'transcript.txt'), `${segments.map((segment) => segment.text).join('\n')}${segments.length ? '\n' : ''}`);
    videos.push({
      ...metadata,
      corpus_path: path.relative(projectRoot, item.dir),
      caption_file: captionFile ?? null,
      segment_count: segments.length,
      transcript_chars: segments.reduce((sum, segment) => sum + segment.text.length, 0)
    });
  }
  const index = { generated_at: new Date().toISOString(), corpus_root: path.relative(projectRoot, corpusRoot), videos };
  writeJson(path.join(corpusRoot, 'index.json'), index);
  return index;
}

function identifierAlias(value) {
  return typeof value === 'string' ? value.replace(/[-_:]+/g, ' ') : '';
}

function searchableTokens(value) {
  return normalizeText(value)
    .replace(/([\p{L}])(\d)/gu, '$1 $2')
    .replace(/(\d)([\p{L}])/gu, '$1 $2')
    .split(/\s+/)
    .filter(Boolean);
}

function catalogRecords(data) {
  const records = [];
  const add = (type, item, aliases, extra = {}) => {
    const clean = [...new Set(aliases.filter((alias) => typeof alias === 'string').map((alias) => alias.trim()).filter((alias) => normalizeText(alias).length >= 3))];
    if (clean.length) records.push({ type, id: item.id, name: item.name, aliases: clean, ...extra });
  };
  const brands = new Map(data.brands.map((item) => [item.id, item]));
  for (const brand of data.brands) add('brand', brand, [brand.name, brand.name_zh, ...(brand.aliases ?? []), identifierAlias(brand.id)]);
  for (const platform of data.platforms) {
    const brand = brands.get(platform.brand_id);
    add('platform', platform, [platform.name, platform.name_zh, platform.model_id, identifierAlias(platform.id), `${brand?.name ?? ''} ${platform.name}`, ...(platform.aliases ?? [])], { brand_id: platform.brand_id });
  }
  const platforms = new Map(data.platforms.map((item) => [item.id, item]));
  for (const variant of data.variants) {
    const platform = platforms.get(variant.platform_id);
    const brand = brands.get(platform?.brand_id);
    add('variant', variant, [variant.name, variant.model_id, identifierAlias(variant.id), `${brand?.name ?? ''} ${variant.name}`, `${platform?.name ?? ''} ${variant.name}`, ...(variant.aliases ?? [])], { platform_id: variant.platform_id });
  }
  for (const candidate of data.candidates) add('candidate', candidate, [candidate.name, candidate.model_id, identifierAlias(candidate.id), ...(candidate.aliases ?? [])]);
  for (const exclusion of data.exclusions) add('exclusion', exclusion, [exclusion.name, exclusion.model_id, identifierAlias(exclusion.id), ...(exclusion.aliases ?? [])]);
  return records;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function aliasMatches(haystack, alias, allowSubset = false) {
  const normalizedHaystack = normalizeText(haystack);
  const normalizedAlias = normalizeText(alias);
  if (!normalizedAlias || normalizedAlias.length < 3) return false;
  if (new RegExp(`(?:^|\\s)${escapeRegex(normalizedAlias)}(?=$|\\s)`, 'iu').test(normalizedHaystack)) return true;
  if (!allowSubset) return false;
  const needles = searchableTokens(haystack);
  const aliasTokens = new Set(searchableTokens(alias));
  return needles.length >= 2 && needles.every((token) => aliasTokens.has(token));
}

export function matchTranscript(segments, data, { allowSubset = false } = {}) {
  const byId = new Map();
  for (const segment of segments) {
    for (const record of catalogRecords(data)) {
      const aliases = record.aliases.filter((alias) => aliasMatches(segment.text, alias, allowSubset));
      if (!aliases.length) continue;
      const key = `${record.type}:${record.id}`;
      const entry = byId.get(key) ?? { type: record.type, id: record.id, name: record.name, aliases: new Set(), segments: [] };
      aliases.forEach((alias) => entry.aliases.add(alias));
      entry.segments.push({ start: segment.start, end: segment.end, text: segment.text });
      byId.set(key, entry);
    }
  }
  return [...byId.values()]
    .map((entry) => ({ ...entry, aliases: [...entry.aliases], segments: entry.segments.slice(0, 30) }))
    .sort((a, b) => `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`));
}

function classification(type) {
  if (type === 'platform' || type === 'variant') return 'existing-model-context';
  if (type === 'candidate') return 'existing-candidate-context';
  if (type === 'exclusion') return 'excluded-or-obsolete-context';
  return 'brand-only-context';
}

export function buildCoverageReport(data, corpusRoot = defaultCorpusRoot, limits = { maxModels: 10, maxGaps: 25 }) {
  const errors = validateCorpus(corpusRoot);
  if (errors.length) throw new Error(errors.join('\n'));
  const videos = [];
  const unmatched = [];
  const discoveryLeads = new Set();
  for (const item of videoDirectories(corpusRoot)) {
    const metadataFile = path.join(item.dir, 'metadata.json');
    const segmentsFile = path.join(item.dir, 'segments.json');
    if (!fs.existsSync(metadataFile) || !fs.existsSync(segmentsFile)) continue;
    const metadata = readJson(metadataFile);
    const captionMentions = matchTranscript(metadata.status === 'captured' ? readJson(segmentsFile) : [], data).map((mention) => ({ ...mention, evidence: 'caption', classification: classification(mention.type) }));
    const discoveryMatches = [];
    for (const discovery of metadata.discovery_mentions ?? []) {
      discoveryLeads.add(normalizeText(discovery.name));
      const matches = matchTranscript([{ start: discovery.at_seconds, end: discovery.at_seconds, text: discovery.name }], data)
        .map((mention) => ({ ...mention, evidence: 'metadata', classification: classification(mention.type) }));
      discoveryMatches.push(...matches);
      if (!matches.some((mention) => modelTypes.has(mention.type))) {
        unmatched.push({
          video_id: metadata.video_id,
          name: discovery.name,
          at_seconds: discovery.at_seconds,
          basis: discovery.basis,
          classification: 'new-or-ambiguous-lead'
        });
      }
    }
    const titleMentions = matchTranscript([{ start: 0, end: 0, text: metadata.title ?? '' }], data)
      .map((mention) => ({ ...mention, evidence: 'metadata', classification: classification(mention.type) }));
    const merged = new Map();
    for (const mention of [...captionMentions, ...discoveryMatches, ...titleMentions]) {
      const key = `${mention.type}:${mention.id}`;
      const previous = merged.get(key);
      if (!previous) {
        merged.set(key, mention);
        continue;
      }
      merged.set(key, {
        ...previous,
        aliases: [...new Set([...previous.aliases, ...mention.aliases])],
        evidence: previous.evidence === mention.evidence ? previous.evidence : 'caption-and-metadata',
        segments: [...previous.segments, ...mention.segments].slice(0, 30)
      });
    }
    videos.push({ metadata, corpus_path: path.relative(projectRoot, item.dir), mentions: [...merged.values()] });
  }
  const modelMentions = new Set(videos.flatMap((video) => video.mentions.filter((mention) => modelTypes.has(mention.type)).map((mention) => `${mention.type}:${mention.id}`)));
  const metadataOnly = new Set(videos.flatMap((video) => video.mentions.filter((mention) => modelTypes.has(mention.type) && mention.evidence === 'metadata').map((mention) => `${mention.type}:${mention.id}`)));
  // Record count is intentionally conservative: ambiguous platform/trim matches
  // must be reviewed, not silently collapsed into a smaller model count.
  const boundedLeads = Math.max(discoveryLeads.size, modelMentions.size);
  return {
    generated_at: new Date().toISOString(),
    corpus_root: path.relative(projectRoot, corpusRoot),
    limits,
    catalog: { brands: data.brands.length, platforms: data.platforms.length, variants: data.variants.length, candidates: data.candidates.length, exclusions: data.exclusions.length },
    videos,
    unmatched_discovery_mentions: unmatched,
    summary: {
      videos_with_captions: videos.filter((video) => video.metadata.status === 'captured').length,
      videos_attempted: videos.length,
      unique_model_records_mentioned: modelMentions.size,
      metadata_only_model_records: metadataOnly.size,
      unique_discovery_leads: discoveryLeads.size,
      bounded_review_targets: boundedLeads,
      unmatched_discovery_leads: new Set(unmatched.map((item) => normalizeText(item.name))).size,
      cap_status: boundedLeads <= limits.maxModels ? 'within-model-cap' : 'exceeds-model-cap-review-before-expanding',
      atomic_gap_cap: limits.maxGaps
    }
  };
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value.startsWith('--')) args[value.slice(2)] = argv[++index] ?? '';
    else args._.push(value);
  }
  return args;
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const command = args._[0] ?? 'help';
  const corpus = path.resolve(projectRoot, args.corpus ?? defaultCorpusRoot);
  if (command === 'help') {
    console.log('Usage: node scripts/video-research.mjs <init|validate|normalize|match> [--corpus PATH] [--output PATH]');
    return;
  }
  if (command === 'init') {
    fs.mkdirSync(corpus, { recursive: true });
    console.log(`Initialized local corpus at ${path.relative(projectRoot, corpus) || '.'}`);
    return;
  }
  if (command === 'validate') {
    const errors = validateCorpus(corpus);
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    } else console.log(`Validated video corpus: ${path.relative(projectRoot, corpus) || '.'}`);
    return;
  }
  if (command === 'normalize') {
    const index = normalizeCorpus(corpus);
    console.log(`Normalized ${index.videos.length} video record(s); wrote local segments and transcripts.`);
    return;
  }
  if (command === 'match') {
    const { loadDataset } = await import(path.join(projectRoot, 'src/lib/data.mjs'));
    const report = buildCoverageReport(loadDataset(), corpus, { maxModels: Number(args['max-models'] ?? 10), maxGaps: Number(args['max-gaps'] ?? 25) });
    const output = path.resolve(projectRoot, args.output ?? defaultReportPath);
    writeJson(output, report);
    console.log(`Matched ${report.summary.videos_attempted} video record(s); wrote ${path.relative(projectRoot, output)}.`);
    if (report.summary.cap_status !== 'within-model-cap') process.exitCode = 1;
    return;
  }
  console.error(`Unknown command: ${command}`);
  process.exitCode = 2;
}

if (path.resolve(process.argv[1] ?? '') === scriptFile) await main();
