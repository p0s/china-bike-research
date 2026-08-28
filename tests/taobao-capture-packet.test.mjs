import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadDataset, validateDataset } from '../src/lib/data.mjs';
import {
  importTaobaoCapturePacket,
  validateTaobaoCapturePacket
} from '../scripts/taobao-capture-packet.mjs';

const fixtureRoot = path.resolve(import.meta.dirname, 'fixtures/taobao-packet-valid');

function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'china-bike-taobao-packet-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const packetRoot = path.join(root, 'capture-packet');
  fs.cpSync(fixtureRoot, packetRoot, { recursive: true });
  fs.mkdirSync(path.join(root, 'repo', 'data', 'variants'), { recursive: true });
  fs.mkdirSync(path.join(root, 'repo', 'data', 'sources'), { recursive: true });
  fs.mkdirSync(path.join(root, 'repo', 'data', 'prices'), { recursive: true });
  fs.writeFileSync(path.join(root, 'repo', 'data', 'variants', 'bxt-055-frameset.json'), '{"id":"bxt-055-frameset"}\n');
  return {
    repoRoot: path.join(root, 'repo'),
    packetPath: path.join(packetRoot, 'packet.json')
  };
}

function mutatePacket(packetPath, change) {
  const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
  change(packet);
  fs.writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`);
}

test('valid packet verifies schema, paths, file bytes, hashes, OCR pixels and output identity', (t) => {
  const { repoRoot, packetPath } = workspace(t);
  const result = validateTaobaoCapturePacket(packetPath, { repoRoot });
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.match(result.packet_sha256, /^[a-f0-9]{64}$/);
  assert.equal(result.records.source.capture_packet.files[0].bytes, 376);
  assert.equal(result.records.source.capture_packet.files[0].ocr.human_pixel_verified, true);
  assert.equal(result.records.price.amount_cny, 4999);
  assert.equal(result.records.price.variant_id, 'bxt-055-frameset');
});

test('malformed packet and missing human pixel verification are rejected', (t) => {
  const { repoRoot, packetPath } = workspace(t);
  mutatePacket(packetPath, (packet) => {
    packet.schema = 'china-bike-taobao-capture-packet/v2';
    delete packet.listing.seller;
    packet.captures[0].ocr.human_pixel_verified = false;
  });
  const result = validateTaobaoCapturePacket(packetPath, { repoRoot });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('packet.schema must be')));
  assert.ok(result.errors.some((error) => error.includes('listing is missing seller')));
  assert.ok(result.errors.some((error) => error.includes('human_pixel_verified must be true')));
});

test('private browser-state fields and sensitive values are rejected', (t) => {
  const { repoRoot, packetPath } = workspace(t);
  mutatePacket(packetPath, (packet) => {
    packet.browser_state = { cookie: 'not-allowed' };
    packet.price.conditions = 'Captured with a session id that must not be retained.';
  });
  const result = validateTaobaoCapturePacket(packetPath, { repoRoot });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('unsupported field browser_state')));
  assert.ok(result.errors.some((error) => error.includes('private browser, credential, order, delivery, or payment content')));
});

test('capture hash mismatch is rejected', (t) => {
  const { repoRoot, packetPath } = workspace(t);
  mutatePacket(packetPath, (packet) => {
    packet.captures[0].sha256 = 'a'.repeat(64);
  });
  const result = validateTaobaoCapturePacket(packetPath, { repoRoot });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('sha256 does not match')));
});

test('unsafe capture paths are rejected', (t) => {
  const { repoRoot, packetPath } = workspace(t);
  mutatePacket(packetPath, (packet) => {
    packet.captures[0].path = '../selected-price.svg';
  });
  const result = validateTaobaoCapturePacket(packetPath, { repoRoot });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('path must stay inside')));
});

test('duplicate capture identity, path and hash are rejected', (t) => {
  const { repoRoot, packetPath } = workspace(t);
  mutatePacket(packetPath, (packet) => {
    packet.captures.push({ ...structuredClone(packet.captures[0]), id: 'duplicate-panel' });
    packet.evidence_refs.price.push('duplicate-panel');
  });
  const result = validateTaobaoCapturePacket(packetPath, { repoRoot });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('path collides')));
  assert.ok(result.errors.some((error) => error.includes('sha256 duplicates')));
});

test('valid import creates only normal source and price records, then rejects collisions', (t) => {
  const { repoRoot, packetPath } = workspace(t);
  const imported = importTaobaoCapturePacket(packetPath, { repoRoot });
  assert.deepEqual(imported.created, [
    'data/sources/taobao-packet-fixture-source-2026-08-28.json',
    'data/prices/taobao-packet-fixture-price-2026-08-28.json'
  ]);
  const source = JSON.parse(fs.readFileSync(path.join(repoRoot, imported.created[0]), 'utf8'));
  const price = JSON.parse(fs.readFileSync(path.join(repoRoot, imported.created[1]), 'utf8'));
  assert.equal(source.type, 'marketplace-product-page');
  assert.equal(source.url, 'https://item.taobao.com/item.htm?id=1065680679902');
  assert.equal(source.capture_packet.manifest_sha256, imported.packet_sha256);
  assert.equal(price.price_type, 'listing-option');
  assert.equal(price.source_ids[0], source.id);

  const data = structuredClone(loadDataset());
  data.sources.push(source);
  data.prices.push(price);
  assert.deepEqual(validateDataset(data), []);

  const collision = validateTaobaoCapturePacket(packetPath, { repoRoot });
  assert.equal(collision.valid, false);
  assert.ok(collision.errors.some((error) => error.startsWith('packet collision:')));
  assert.equal(collision.errors.filter((error) => error.startsWith('output collision:')).length, 2);
  assert.throws(() => importTaobaoCapturePacket(packetPath, { repoRoot }), /output collision/);
});

test('an imported packet id cannot be mutated and reissued under new output ids', (t) => {
  const { repoRoot, packetPath } = workspace(t);
  importTaobaoCapturePacket(packetPath, { repoRoot });
  mutatePacket(packetPath, (packet) => {
    packet.price.conditions = 'Mutated fixture conditions.';
    packet.output.source_id = 'taobao-packet-fixture-source-mutated-2026-08-28';
    packet.output.price_id = 'taobao-packet-fixture-price-mutated-2026-08-28';
  });
  const result = validateTaobaoCapturePacket(packetPath, { repoRoot });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.startsWith('packet mutation:')));
  assert.equal(result.errors.some((error) => error.startsWith('output collision:')), false);
});
