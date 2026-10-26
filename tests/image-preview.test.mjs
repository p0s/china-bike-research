import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('../assets/site.js', import.meta.url), 'utf8');
const previewSource = script.slice(script.indexOf('  const imagePreviewSources = new Map();'), script.indexOf('  const copyStatus ='));
const dismissalSource = script.slice(script.indexOf("  document.addEventListener('keydown', (event) => {"), script.indexOf("  document.querySelectorAll('[data-copy-target]')"));

function element() {
  const classes = new Set(), style = { setProperty() {} };
  return {
    hidden: false, style, children: [], className: '', attributes: {},
    classList: { add: name => classes.add(name), remove: name => classes.delete(name), has: name => classes.has(name) },
    setAttribute(name, value) { this.attributes[name] = value; },
    append(child) { this.children.push(child); },
    get firstElementChild() { return this.children[0]; }
  };
}

function preview({ loaded = true, fine = true, gallery = false, comparison = false, viewport = { width: 1440, height: 900 }, box = { left: 329, top: 438, width: 96, height: 64 } } = {}) {
  const events = new Map(), frames = [], timers = [], linkEvents = new Map(), imageEvents = new Map(), classes = new Set();
  let now = 1000;
  const image = { complete: loaded, naturalWidth: loaded ? 480 : 0, naturalHeight: 320, currentSrc: 'card.webp', src: 'card.webp', addEventListener: (event, fn) => imageEvents.set(event, fn) };
  const row = { dataset: { id: 'bike-a' } };
  const link = {
    dataset: comparison ? { imagePreviewId: 'bike-a' } : {},
    focused: false, hovered: false,
    classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
    querySelector: () => image,
    closest: selector => selector === '[data-product-row]' ? (comparison ? null : row) : (gallery && selector.includes('gallery') ? {} : null),
    getBoundingClientRect: () => ({ ...box, right: box.left + box.width, bottom: box.top + box.height }),
    scrollIntoView() {},
    matches: selector => selector === ':focus-visible' ? link.focused : link.hovered,
    addEventListener: (event, fn) => linkEvents.set(event, fn)
  };
  const body = element();
  const document = {
    activeElement: null, body,
    querySelectorAll: () => comparison ? [] : [link],
    createElement: () => element(),
    addEventListener: (event, fn) => events.set(event, fn)
  };
  class FakeImage { addEventListener(event, fn) { this.onload = fn; } set src(value) { this.value = value; this.onload?.(); } }
  vm.runInNewContext(previewSource + dismissalSource + '\nimagePreviewSources.set("bike-a", "detail.avif"); if (comparison) bindImagePreview(link);', {
    comparison, link,
    document, innerWidth: viewport.width, innerHeight: viewport.height, Image: FakeImage,
    stickyHeader: { getBoundingClientRect: () => ({ bottom: 60 }) },
    performance: { now: () => now },
    setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout: () => {},
    precisePointer: { matches: fine },
    closeTooltip() {}, closeMenu() {}, activeTooltipButton: null, tooltipPanel: null, navigation: null, HTMLElement: Object,
    requestAnimationFrame: fn => frames.push(fn), addEventListener: (event, fn) => events.set(event, fn)
  });
  const layer = () => body.children[0];
  return {
    active: () => classes.has('is-previewing') && layer()?.hidden === false,
    layer,
    focus() { document.activeElement = link; link.focused = true; linkEvents.get('focus')(); },
    flush() { while (frames.length) frames.shift()(); while (timers.length) timers.shift()(); },
    move() { link.hovered = true; linkEvents.get('pointermove')({ pointerType: 'mouse' }); },
    touch() { link.hovered = true; linkEvents.get('pointermove')({ pointerType: 'touch' }); },
    leave() { link.hovered = false; linkEvents.get('pointerleave')(); },
    blur() { link.focused = false; document.activeElement = null; linkEvents.get('blur')(); },
    scroll: () => events.get('scroll')(), resize: () => events.get('resize')(),
    advance(ms) { now += ms; },
    escape() { events.get('keydown')({ key: 'Escape', preventDefault() {} }); },
    load() { image.complete = true; image.naturalWidth = 480; imageEvents.get('load')?.(); },
    fail() { imageEvents.get('error')?.(); }
  };
}

test('Tab focus survives its native scroll, then subsequent scrolling dismisses the preview', () => {
  const ui = preview();
  ui.focus(); ui.scroll(); ui.flush();
  assert.equal(ui.active(), true);
  ui.scroll(); assert.equal(ui.active(), false);
  ui.focus(); ui.escape(); ui.flush(); assert.equal(ui.active(), false);
});

test('delayed photos preview only while the original focus or hover request remains active', () => {
  for (const cancel of ['none', 'blur', 'Escape', 'scroll', 'resize', 'failure']) {
    const ui = preview({ loaded: false });
    ui.focus(); ui.flush(); assert.equal(ui.active(), false);
    if (cancel === 'blur') ui.blur();
    if (cancel === 'Escape') ui.escape();
    if (cancel === 'scroll') ui.scroll();
    if (cancel === 'resize') ui.resize();
    if (cancel === 'failure') ui.fail();
    ui.load(); ui.flush(); assert.equal(ui.active(), cancel === 'none', cancel);
  }
});

test('the large preview sits beside the thumbnail inside the viewport and below the header', () => {
  const ui = preview(); ui.move(); ui.flush();
  assert.equal(ui.active(), true);
  const style = ui.layer().style;
  const left = Number.parseFloat(style.left), top = Number.parseFloat(style.top), width = Number.parseFloat(style.width), height = Number.parseFloat(style.height);
  assert.ok(left >= 329 + 96, 'preview does not cover the hovered thumbnail');
  assert.ok(width >= 600, `preview is substantially larger than the old 2.6x paint (${width})`);
  assert.ok(left + width <= 1440 - 12 && top >= 68 && top + height <= 900 - 12);
  assert.equal(ui.layer().attributes['aria-hidden'], 'true');
  ui.leave(); assert.equal(ui.active(), false);
});

test('narrow viewports fit the preview within the screen', () => {
  const ui = preview({ viewport: { width: 320, height: 844 }, box: { left: 240, top: 70, width: 88, height: 58 } });
  ui.focus(); ui.flush();
  const style = ui.layer().style;
  assert.ok(Number.parseFloat(style.left) >= 12 && Number.parseFloat(style.left) + Number.parseFloat(style.width) <= 308);
});

test('rows that slide under a resting cursor during scrolling do not flash a preview', () => {
  const ui = preview();
  ui.scroll(); ui.move(); ui.flush();
  assert.equal(ui.active(), false);
  ui.advance(300); ui.move(); ui.flush();
  assert.equal(ui.active(), true);
});

test('touch and coarse pointers keep direct navigation while keyboard focus still previews', () => {
  const touch = preview(); touch.touch(); touch.flush(); assert.equal(touch.active(), false);
  const ui = preview({ fine: false });
  ui.move(); ui.flush(); assert.equal(ui.active(), false);
  ui.focus(); ui.flush(); assert.equal(ui.active(), true);
  ui.blur(); assert.equal(ui.active(), false);
});

for (const surface of ['gallery', 'comparison']) test(`${surface} photos share the large reviewed preview and dismissal behavior`, () => {
  const options = { [surface]: true };
  const ui = preview(options); ui.move(); ui.flush();
  assert.equal(ui.active(), true);
  assert.equal(ui.layer().firstElementChild.src, 'detail.avif');
  ui.leave(); assert.equal(ui.active(), false);
  ui.focus(); ui.flush(); assert.equal(ui.active(), true);
  ui.escape(); assert.equal(ui.active(), false);
  ui.focus(); ui.flush(); ui.scroll(); assert.equal(ui.active(), false);
  ui.touch(); ui.flush(); assert.equal(ui.active(), false);
  const coarse = preview({ ...options, fine: false });
  coarse.move(); coarse.flush(); assert.equal(coarse.active(), false);
});
