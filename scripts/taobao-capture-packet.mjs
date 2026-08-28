import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TAOBAO_PACKET_SCHEMA = 'china-bike-taobao-capture-packet/v1';
export const OCR_PIXEL_VERIFICATION_STATEMENT = 'I compared every OCR-derived value with the original capture pixels and verified its label, option, amount, currency, and model context.';
export const PRIVACY_REVIEW_STATEMENT = 'I verified that every referenced capture contains only public listing evidence and no cookies, credentials, account identifiers, personal browser state, private messages, delivery details, payment data, order data, or other private content.';

const defaultRepoRoot = path.resolve(import.meta.dirname, '..');
const allowedMimeTypes = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf', 'application/json', 'text/plain'
]);
const allowedPanels = new Set([
  'seller-identity', 'listing-identity', 'selected-configuration', 'selected-price', 'package-contents', 'specification-image'
]);
const allowedStatuses = new Set(['available', 'in-stock', 'preorder', 'out-of-stock']);
const sensitiveValuePattern = /\b(?:authorization|bearer|password|session[ _-]?id|access[ _-]?token|api[ _-]?key|private[ _-]?key|shipping address|delivery address|payment card|order number)\b/i;
const credentialPattern = /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk_(?:live|test)_[A-Za-z0-9]{16,}|AKIA[A-Z0-9]{16})\b/;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isId(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function exactKeys(errors, label, object, required, optional = []) {
  if (!isObject(object)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  const allowed = new Set([...required, ...optional]);
  for (const key of required) if (!(key in object)) errors.push(`${label} is missing ${key}`);
  for (const key of Object.keys(object)) if (!allowed.has(key)) errors.push(`${label} contains unsupported field ${key}`);
  return true;
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function safeRelativeFile(packetRoot, relativePath) {
  if (!isNonEmptyString(relativePath) || path.isAbsolute(relativePath) || relativePath.includes('\\')) return null;
  const normalized = path.posix.normalize(relativePath);
  if (normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) return null;
  const absolute = path.resolve(packetRoot, normalized);
  const relative = path.relative(packetRoot, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return { normalized, absolute };
}

function validatePublicValues(errors, values) {
  for (const [label, value] of values) {
    if (!isNonEmptyString(value)) continue;
    if (sensitiveValuePattern.test(value) || credentialPattern.test(value)) {
      errors.push(`${label} appears to contain private browser, credential, order, delivery, or payment content`);
    }
  }
}

function validateCanonicalUrl(errors, listing) {
  try {
    const parsed = new URL(listing.canonical_url);
    const keys = [...parsed.searchParams.keys()];
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'item.taobao.com' || parsed.pathname !== '/item.htm'
      || keys.length !== 1 || keys[0] !== 'id' || parsed.searchParams.get('id') !== listing.item_id || parsed.hash) {
      errors.push('listing.canonical_url must be https://item.taobao.com/item.htm?id=<item_id> with no other state');
    }
  } catch {
    errors.push('listing.canonical_url must be a valid identity-safe Taobao item URL');
  }
}

function readTarget(errors, repoRoot, target) {
  if (!isObject(target) || target.record_type !== 'variant' || !isId(target.record_id)) return;
  const targetPath = path.join(repoRoot, 'data', 'variants', `${target.record_id}.json`);
  if (!fs.existsSync(targetPath)) {
    errors.push(`target references missing variant ${target.record_id}`);
    return;
  }
  try {
    const record = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    if (record.id !== target.record_id) errors.push(`target file identity does not match ${target.record_id}`);
  } catch (error) {
    errors.push(`target variant ${target.record_id} cannot be read: ${error.message}`);
  }
}

function outputPaths(repoRoot, output) {
  return {
    source: path.join(repoRoot, 'data', 'sources', `${output.source_id}.json`),
    price: path.join(repoRoot, 'data', 'prices', `${output.price_id}.json`)
  };
}

function findImportedPacket(errors, repoRoot, packetId, packetSha256) {
  const directory = path.join(repoRoot, 'data', 'sources');
  if (!fs.existsSync(directory)) return;
  for (const name of fs.readdirSync(directory).filter((entry) => entry.endsWith('.json')).sort()) {
    const file = path.join(directory, name);
    let source;
    try {
      source = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      errors.push(`cannot verify packet identity against ${path.relative(repoRoot, file)}: ${error.message}`);
      continue;
    }
    if (source.capture_packet?.packet_id !== packetId) continue;
    if (source.capture_packet.manifest_sha256 === packetSha256) {
      errors.push(`packet collision: ${packetId} was already imported by source ${source.id}`);
    } else {
      errors.push(`packet mutation: ${packetId} was already imported with a different manifest SHA-256 by source ${source.id}`);
    }
  }
}

function buildRecords(packet, packetSha256) {
  const observedDate = packet.observed_at.slice(0, 10);
  const captureFiles = packet.captures.map((capture) => ({
    capture_id: capture.id,
    panel: capture.panel,
    mime_type: capture.mime_type,
    bytes: capture.bytes,
    sha256: capture.sha256,
    ...(capture.ocr.used ? {
      ocr: {
        engine: capture.ocr.engine,
        language: capture.ocr.language,
        derived_fields: capture.ocr.derived_fields,
        human_pixel_verified: true,
        statement: capture.ocr.statement
      }
    } : {})
  }));
  const source = {
    id: packet.output.source_id,
    type: 'marketplace-product-page',
    title: packet.listing.title,
    publisher: `${packet.listing.seller} on Taobao`,
    language: 'zh-CN',
    accessed_at: observedDate,
    url: packet.listing.canonical_url,
    reliability: { identity: 'high', specification: 'medium-high', price: 'high' },
    listing_id: packet.listing.item_id,
    ...(packet.listing.selected_sku_id ? { selected_sku_id: packet.listing.selected_sku_id } : {}),
    selected_options: packet.listing.selected_options,
    capture_packet: {
      schema: packet.schema,
      packet_id: packet.packet_id,
      manifest_sha256: packetSha256,
      observed_at: packet.observed_at,
      evidence_refs: packet.evidence_refs,
      files: captureFiles,
      privacy_review: { reviewed_by_human: true, statement: packet.privacy_review.statement }
    },
    notes: `Human-reviewed manual capture packet ${packet.packet_id} records the exact selected listing configuration and price. Checkout was not completed or verified. Original captures remain outside Git; immutable byte counts and SHA-256 digests are retained in this source record.`
  };
  const price = {
    id: packet.output.price_id,
    variant_id: packet.target.record_id,
    observed_at: observedDate,
    price_type: 'listing-option',
    currency: 'CNY',
    channel: 'taobao-mainland',
    status: packet.price.status,
    price_basis: packet.price.price_basis,
    conditions: `Exact selected option ${packet.listing.selected_options.join(' / ')} at CNY ${packet.price.amount_cny}. ${packet.price.conditions} This is a human-reviewed option-level listing observation, not a completed checkout total.`,
    source_ids: [packet.output.source_id],
    amount_cny: packet.price.amount_cny
  };
  return { source, price };
}

export function validateTaobaoCapturePacket(packetJsonPath, options = {}) {
  const repoRoot = path.resolve(options.repoRoot ?? defaultRepoRoot);
  const checkCollisions = options.checkCollisions !== false;
  const absolutePacketPath = path.resolve(packetJsonPath);
  const errors = [];
  if (path.basename(absolutePacketPath) !== 'packet.json') errors.push('capture packet manifest must be named packet.json');
  let packetBytes;
  let packet;
  try {
    const stat = fs.lstatSync(absolutePacketPath);
    if (stat.isSymbolicLink() || !stat.isFile()) errors.push('packet.json must be a regular non-symlink file');
    packetBytes = fs.readFileSync(absolutePacketPath);
    packet = JSON.parse(packetBytes.toString('utf8'));
  } catch (error) {
    return { valid: false, errors: [...errors, `packet.json cannot be read: ${error.message}`] };
  }
  const packetRoot = path.dirname(absolutePacketPath);
  const packetSha256 = sha256(packetBytes);
  if (!exactKeys(errors, 'packet', packet,
    ['schema', 'packet_id', 'listing', 'target', 'price', 'observed_at', 'captures', 'evidence_refs', 'privacy_review', 'output'])) {
    return { valid: false, errors };
  }
  if (packet.schema !== TAOBAO_PACKET_SCHEMA) errors.push(`packet.schema must be ${TAOBAO_PACKET_SCHEMA}`);
  if (!isId(packet.packet_id)) errors.push('packet.packet_id must be a lowercase kebab-case id');
  else if (checkCollisions) findImportedPacket(errors, repoRoot, packet.packet_id, packetSha256);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?\+08:00$/.test(packet.observed_at)
    || Number.isNaN(Date.parse(packet.observed_at))) errors.push('packet.observed_at must be an exact ISO-8601 timestamp with +08:00 offset');

  if (exactKeys(errors, 'listing', packet.listing,
    ['item_id', 'canonical_url', 'seller', 'title', 'selected_options'], ['selected_sku_id'])) {
    if (!/^\d+$/.test(packet.listing.item_id ?? '')) errors.push('listing.item_id must contain only digits');
    if (!isNonEmptyString(packet.listing.seller)) errors.push('listing.seller is required');
    if (!isNonEmptyString(packet.listing.title)) errors.push('listing.title is required');
    if (!Array.isArray(packet.listing.selected_options) || packet.listing.selected_options.length === 0
      || packet.listing.selected_options.some((value) => !isNonEmptyString(value))) errors.push('listing.selected_options must contain every selected option label in display order');
    if (packet.listing.selected_sku_id !== undefined && !/^\d+$/.test(packet.listing.selected_sku_id)) errors.push('listing.selected_sku_id must contain only digits when present');
    validateCanonicalUrl(errors, packet.listing);
  }

  if (exactKeys(errors, 'target', packet.target, ['record_type', 'record_id'])) {
    if (packet.target.record_type !== 'variant') errors.push('target.record_type must be variant; candidate evidence requires a separate reviewed integration');
    if (!isId(packet.target.record_id)) errors.push('target.record_id must be a lowercase kebab-case id');
    readTarget(errors, repoRoot, packet.target);
  }

  if (exactKeys(errors, 'price', packet.price,
    ['amount_cny', 'currency', 'price_type', 'channel', 'status', 'price_basis', 'conditions', 'checkout_verified'])) {
    if (!Number.isFinite(packet.price.amount_cny) || packet.price.amount_cny <= 0) errors.push('price.amount_cny must be a positive exact amount');
    if (packet.price.currency !== 'CNY') errors.push('price.currency must be CNY');
    if (packet.price.price_type !== 'listing-option') errors.push('price.price_type must be listing-option');
    if (packet.price.channel !== 'taobao-mainland') errors.push('price.channel must be taobao-mainland');
    if (!allowedStatuses.has(packet.price.status)) errors.push('price.status is unsupported');
    if (!isNonEmptyString(packet.price.price_basis)) errors.push('price.price_basis must identify the selected configuration');
    if (!isNonEmptyString(packet.price.conditions)) errors.push('price.conditions must preserve displayed conditions and exclusions');
    if (packet.price.checkout_verified !== false) errors.push('price.checkout_verified must be false for this listing-capture route');
  }

  const captureIds = new Set();
  const capturePaths = new Set();
  const captureHashes = new Set();
  if (!Array.isArray(packet.captures) || packet.captures.length === 0) errors.push('captures must contain at least one source panel or screenshot');
  for (let index = 0; index < (packet.captures ?? []).length; index += 1) {
    const capture = packet.captures[index];
    const label = `captures[${index}]`;
    if (!exactKeys(errors, label, capture, ['id', 'path', 'panel', 'mime_type', 'bytes', 'sha256', 'ocr'])) continue;
    if (!isId(capture.id)) errors.push(`${label}.id must be a lowercase kebab-case id`);
    else if (captureIds.has(capture.id)) errors.push(`${label}.id collides with another capture`);
    else captureIds.add(capture.id);
    const file = safeRelativeFile(packetRoot, capture.path);
    if (!file) errors.push(`${label}.path must stay inside the packet directory`);
    else if (capturePaths.has(file.normalized)) errors.push(`${label}.path collides with another capture`);
    else {
      capturePaths.add(file.normalized);
      try {
        const stat = fs.lstatSync(file.absolute);
        if (stat.isSymbolicLink() || !stat.isFile()) errors.push(`${label}.path must reference a regular non-symlink file`);
        else {
          const bytes = fs.readFileSync(file.absolute);
          const realPath = fs.realpathSync(file.absolute);
          const relativeRealPath = path.relative(fs.realpathSync(packetRoot), realPath);
          if (relativeRealPath.startsWith('..') || path.isAbsolute(relativeRealPath)) errors.push(`${label}.path resolves outside the packet directory`);
          if (capture.bytes !== bytes.length) errors.push(`${label}.bytes does not match the referenced file`);
          if (capture.sha256 !== sha256(bytes)) errors.push(`${label}.sha256 does not match the referenced file`);
        }
      } catch (error) {
        errors.push(`${label}.path cannot be read: ${error.message}`);
      }
    }
    if (!allowedPanels.has(capture.panel)) errors.push(`${label}.panel is unsupported`);
    if (!allowedMimeTypes.has(capture.mime_type)) errors.push(`${label}.mime_type is unsupported`);
    if (!Number.isInteger(capture.bytes) || capture.bytes <= 0) errors.push(`${label}.bytes must be a positive integer`);
    if (!/^[a-f0-9]{64}$/.test(capture.sha256 ?? '')) errors.push(`${label}.sha256 must be a lowercase SHA-256 digest`);
    else if (captureHashes.has(capture.sha256)) errors.push(`${label}.sha256 duplicates another capture`);
    else captureHashes.add(capture.sha256);
    if (exactKeys(errors, `${label}.ocr`, capture.ocr, ['used'], capture.ocr?.used ? ['engine', 'language', 'derived_fields', 'human_pixel_verified', 'statement'] : [])) {
      if (typeof capture.ocr.used !== 'boolean') errors.push(`${label}.ocr.used must be boolean`);
      if (capture.ocr.used) {
        if (!isNonEmptyString(capture.ocr.engine)) errors.push(`${label}.ocr.engine is required`);
        if (!isNonEmptyString(capture.ocr.language)) errors.push(`${label}.ocr.language is required`);
        if (!Array.isArray(capture.ocr.derived_fields) || capture.ocr.derived_fields.length === 0
          || capture.ocr.derived_fields.some((value) => !isId(value))) errors.push(`${label}.ocr.derived_fields must list lowercase field ids`);
        if (capture.ocr.human_pixel_verified !== true) errors.push(`${label}.ocr.human_pixel_verified must be true`);
        if (capture.ocr.statement !== OCR_PIXEL_VERIFICATION_STATEMENT) errors.push(`${label}.ocr.statement must use the v1 pixel-verification statement exactly`);
      }
    }
  }

  const referencedCaptureIds = new Set();
  if (exactKeys(errors, 'evidence_refs', packet.evidence_refs, ['seller', 'configuration', 'price'])) {
    for (const key of ['seller', 'configuration', 'price']) {
      const references = packet.evidence_refs[key];
      if (!Array.isArray(references) || references.length === 0 || references.some((id) => !isId(id))) {
        errors.push(`evidence_refs.${key} must contain capture ids`);
        continue;
      }
      for (const id of references) {
        referencedCaptureIds.add(id);
        if (!captureIds.has(id)) errors.push(`evidence_refs.${key} references missing capture ${id}`);
      }
    }
  }
  for (const id of captureIds) if (!referencedCaptureIds.has(id)) errors.push(`capture ${id} is not referenced by evidence_refs`);

  if (exactKeys(errors, 'privacy_review', packet.privacy_review, ['reviewed_by_human', 'statement'])) {
    if (packet.privacy_review.reviewed_by_human !== true) errors.push('privacy_review.reviewed_by_human must be true');
    if (packet.privacy_review.statement !== PRIVACY_REVIEW_STATEMENT) errors.push('privacy_review.statement must use the v1 privacy statement exactly');
  }

  if (exactKeys(errors, 'output', packet.output, ['source_id', 'price_id'])) {
    if (!isId(packet.output.source_id)) errors.push('output.source_id must be a lowercase kebab-case id');
    if (!isId(packet.output.price_id)) errors.push('output.price_id must be a lowercase kebab-case id');
    if (packet.output.source_id === packet.output.price_id) errors.push('output source and price ids must be distinct');
    if (checkCollisions && isId(packet.output.source_id) && isId(packet.output.price_id)) {
      const paths = outputPaths(repoRoot, packet.output);
      if (fs.existsSync(paths.source)) errors.push(`output collision: ${path.relative(repoRoot, paths.source)} already exists`);
      if (fs.existsSync(paths.price)) errors.push(`output collision: ${path.relative(repoRoot, paths.price)} already exists`);
    }
  }

  validatePublicValues(errors, [
    ['listing.seller', packet.listing?.seller],
    ['listing.title', packet.listing?.title],
    ...((packet.listing?.selected_options ?? []).map((value, index) => [`listing.selected_options[${index}]`, value])),
    ['price.price_basis', packet.price?.price_basis],
    ['price.conditions', packet.price?.conditions]
  ]);

  return {
    valid: errors.length === 0,
    errors,
    packet,
    packet_path: absolutePacketPath,
    packet_sha256: packetSha256,
    records: errors.length === 0 ? buildRecords(packet, packetSha256) : null,
    output_paths: errors.length === 0 ? outputPaths(repoRoot, packet.output) : null
  };
}

export function importTaobaoCapturePacket(packetJsonPath, options = {}) {
  const result = validateTaobaoCapturePacket(packetJsonPath, options);
  if (!result.valid) throw new Error(`Taobao capture packet rejected:\n- ${result.errors.join('\n- ')}`);
  const writes = [
    [result.output_paths.source, result.records.source],
    [result.output_paths.price, result.records.price]
  ];
  const created = [];
  try {
    for (const [file, record] of writes) {
      fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
      created.push(file);
    }
  } catch (error) {
    for (const file of created.reverse()) fs.unlinkSync(file);
    throw new Error(`Taobao capture import failed without retaining a partial write: ${error.message}`);
  }
  return {
    packet_id: result.packet.packet_id,
    packet_sha256: result.packet_sha256,
    created: created.map((file) => path.relative(path.resolve(options.repoRoot ?? defaultRepoRoot), file).replaceAll(path.sep, '/'))
  };
}

function main() {
  const [action, packetPath] = process.argv.slice(2);
  if (!['validate', 'import'].includes(action) || !packetPath) {
    throw new Error('Usage: node scripts/taobao-capture-packet.mjs <validate|import> /path/to/packet.json');
  }
  if (action === 'validate') {
    const result = validateTaobaoCapturePacket(packetPath);
    if (!result.valid) throw new Error(`Taobao capture packet rejected:\n- ${result.errors.join('\n- ')}`);
    console.log(JSON.stringify({
      valid: true,
      packet_id: result.packet.packet_id,
      packet_sha256: result.packet_sha256,
      outputs: Object.fromEntries(Object.entries(result.output_paths).map(([key, file]) => [key, path.relative(defaultRepoRoot, file)]))
    }, null, 2));
    return;
  }
  console.log(JSON.stringify(importTaobaoCapturePacket(packetPath), null, 2));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
