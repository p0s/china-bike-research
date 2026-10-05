import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { renderModel, renderCandidateModel } from '../src/render.mjs';
import { transcribedGeometry, structuredGeometry } from '../src/lib/model-geometry.mjs';
import { escapeHtml } from '../src/lib/html.mjs';
import { clarifyMainlandInDisplayHtml } from '../src/lib/i18n.mjs';

const data = loadDataset(), products = joinProducts(data), candidates = joinCatalogCandidates(data);
const ctx = { data, products, base: '', siteUrl: 'https://example.invalid', repositoryUrl: 'https://github.com/p0s/china-bike-research', now: new Date('2026-10-05') };

test('every model keeps its identity before images and its full evidence records', () => {
  assert.equal(products.length + candidates.length, 263);
  for (const entry of [...products, ...candidates]) {
    const html = entry.variant ? renderModel(ctx, entry) : renderCandidateModel(ctx, entry);
    const identity = html.indexOf('class="model-identity"'), gallery = html.indexOf('class="model-gallery"');
    assert.ok(identity >= 0 && (gallery < 0 || identity < gallery));
    assert.match(html, /id="source-records" open/);
    if (gallery < 0) continue;
    const images = [entry.image, ...(entry.galleryImages ?? [])];
    for (const image of images) {
      assert.ok(html.includes(escapeHtml(image.alt)), image.id);
      if (image.credit) assert.ok(html.includes(clarifyMainlandInDisplayHtml(escapeHtml(image.credit))), image.id);
      if (image.display_note) assert.ok(html.includes(clarifyMainlandInDisplayHtml(escapeHtml(image.display_note))), image.id);
      if (image.source_media_page_url) assert.ok(html.includes(escapeHtml(image.source_media_page_url)), image.id);
    }
    assert.match(html, /data-gallery-all/);
    if (images.length > 1) {
      assert.equal((html.match(/data-gallery-thumb\s/g) ?? []).length, images.length);
      assert.match(html, /data-gallery-all/);
      assert.ok(html.indexOf('data-gallery-caption') < html.indexOf('class="model-gallery-strip"'));
    }
  }
});

test('manufacturer transcription presents literal rows, cells and complete original evidence', () => {
  const entry = candidates.find(e => e.candidate.id === 'lightcarbon-lcr018-d');
  const original = entry.candidate.facts['geometry complete current manufacturer table'];
  const parsed = transcribedGeometry(original);
  assert.equal(parsed.sizes.length, 6);
  assert.equal(parsed.rows.length, 18);
  assert.equal(parsed.rows.find(([name]) => name === 'WHEELBASE')[1][4], '1006.3 +mm');
  assert.equal(parsed.rows.find(([name]) => name === 'FRONT CENTER')[1][5], '606.4mm');
  assert.match(parsed.notes.join(' '), /text616\.4/);
  const html = renderCandidateModel(ctx, entry);
  assert.ok(html.includes(escapeHtml(original)));
  assert.match(html, /role="region" tabindex="0" aria-labelledby="model-geometry-title-/);
  assert.match(html, /<th scope="row">WHEELBASE<\/th>/);
  assert.match(html, /<td>1006\.3 \+mm<\/td>/);
  assert.match(html, /<th scope="col">580<\/th>/);
});

test('an unrecognized or incomplete transcription never silently drops evidence', () => {
  assert.equal(transcribedGeometry('Unstructured geometry observation'), null);
  assert.equal(transcribedGeometry('Printed size columns: S / M. REACH: 400mm'), null);
  assert.equal(transcribedGeometry('Printed size columns: S / M. REACH: 400mm / 410mm; unknown segment'), null);
});

test('structured geometry retains every recorded cell and dated qualification', () => {
  for (const product of products.filter(e => e.platform.frame.geometry?.sizes?.length)) {
    const geometry = product.platform.frame.geometry, html = structuredGeometry(geometry, product.sources);
    for (const size of geometry.sizes) for (const [key, value] of Object.entries(size)) {
      if (value != null) assert.ok(html.includes(`>${escapeHtml(value)}<`), `${product.variant.id}: ${key}`);
    }
    if (geometry.evidence_review?.note) {
      assert.ok(html.includes(escapeHtml(geometry.evidence_review.note)));
      assert.ok(html.includes(geometry.evidence_review.reviewed_at));
    }
  }
});
