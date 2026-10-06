import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('../assets/site.js', import.meta.url), 'utf8');
const previewSource = script.slice(script.indexOf('  let activeImagePreview ='), script.indexOf('  const copyStatus ='));
const dismissalSource = script.slice(script.indexOf("  document.addEventListener('keydown', (event) => {"), script.indexOf("  document.querySelectorAll('[data-copy-target]')"));

function preview({ loaded = true, fine = true } = {}) {
  const events = new Map(), frames = [], linkEvents = new Map(), imageEvents = new Map(), classes = new Set(), properties = new Map();
  const image = { complete: loaded, naturalWidth: loaded ? 800 : 0, addEventListener: (event, fn) => imageEvents.set(event, fn) };
  const link = {
    focused: false, hovered: false,
    classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
    style: { setProperty: (name, value) => properties.set(name, value) },
    querySelector: () => image,
    getBoundingClientRect: () => ({ left: 240, top: 70, width: 88, height: 58 }),
    scrollIntoView() {},
    matches: selector => selector === ':focus-visible' ? link.focused : link.hovered,
    addEventListener: (event, fn) => linkEvents.set(event, fn)
  };
  const document = { activeElement: null, querySelectorAll: () => [link], addEventListener: (event, fn) => events.set(event, fn) };
  vm.runInNewContext(previewSource + dismissalSource, {
    document, innerWidth: 320, innerHeight: 844,
    stickyHeader: { getBoundingClientRect: () => ({ bottom: 60 }) },
    getComputedStyle: () => ({ getPropertyValue: () => '4.6' }),
    precisePointer: { matches: fine },
    closeTooltip() {}, closeMenu() {}, activeTooltipButton: null, navigation: null, HTMLElement: Object,
    requestAnimationFrame: fn => frames.push(fn), addEventListener: (event, fn) => events.set(event, fn)
  });
  return {
    properties, active: () => classes.has('is-previewing'),
    focus() { document.activeElement = link; link.focused = true; linkEvents.get('focus')(); },
    flush() { while (frames.length) frames.shift()(); },
    hover() { link.hovered = true; linkEvents.get('mouseenter')(); },
    leave() { link.hovered = false; linkEvents.get('mouseleave')(); },
    blur() { link.focused = false; document.activeElement = null; linkEvents.get('blur')(); },
    scroll: () => events.get('scroll')(), resize: () => events.get('resize')(),
    escape() { events.get('keydown')({ key: 'Escape', preventDefault() {} }); },
    load() { image.complete = true; image.naturalWidth = 800; imageEvents.get('load')?.(); },
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
    ui.load(); assert.equal(ui.active(), cancel === 'none', cancel);
  }
  const ui = preview({ loaded: false });
  ui.hover(); ui.leave(); ui.load(); assert.equal(ui.active(), false);
});

test('preview paint fits a narrow viewport without enlarging the original link box', () => {
  const ui = preview(); ui.hover();
  assert.equal(ui.active(), true);
  const scale = ui.properties.get('--image-preview-scale');
  assert.equal(88 * scale, 296);
  const left = 240 + Number.parseFloat(ui.properties.get('--image-preview-x'));
  assert.equal(left, 12);
  const top = 70 + 58 / 2 - 58 * scale / 2 + Number.parseFloat(ui.properties.get('--image-preview-y'));
  assert.equal(top, 68);
  assert.ok(top + 58 * scale <= 832);
  ui.leave(); assert.equal(ui.active(), false);
});

test('coarse pointer hover leaves direct navigation alone while keyboard focus still previews', () => {
  const ui = preview({ fine: false });
  ui.hover(); assert.equal(ui.active(), false);
  ui.focus(); ui.flush(); assert.equal(ui.active(), true);
  ui.blur(); assert.equal(ui.active(), false);
});
