import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { translate } from '../assets/i18n.js';
import { layout } from '../src/lib/html.mjs';

const script = fs.readFileSync(new URL('../assets/site.js', import.meta.url), 'utf8');
const source = script.slice(script.indexOf('  const themeStorageKey ='), script.indexOf('  function readStoredSelection()'));
const key = 'china-bikes-theme-v1';

function theme({ dark = false, stored = null, blocked = false, locale = 'en' } = {}) {
  const events = new Map(), mediaEvents = new Map(), data = new Map(stored === null ? [] : [[key, stored]]);
  const label = {}, icon = {}, meta = {}, root = { dataset: {} };
  class Button {
    attributes = {};
    querySelector(selector) { return selector === '[data-theme-label]' ? label : icon; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, listener) { events.set(`button:${name}`, listener); }
  }
  const button = new Button(), media = { matches: dark, addEventListener: (name, fn) => mediaEvents.set(name, fn) };
  const storage = {
    getItem(name) { if (blocked) throw new Error('storage unavailable'); return data.get(name) ?? null; },
    setItem(name, value) { if (blocked) throw new Error('storage unavailable'); data.set(name, value); }
  };
  vm.runInNewContext(source, {
    translate, locale, localStorage: storage, HTMLButtonElement: Button, HTMLMetaElement: Object,
    matchMedia: () => media, addEventListener: (name, fn) => events.set(name, fn),
    document: { documentElement: root, querySelector: selector => selector === '[data-theme-control]' ? button : meta }
  });
  return {
    root, label, icon, meta, button, data,
    click: () => events.get('button:click')(),
    os(value) { media.matches = value; mediaEvents.get('change')(); },
    storage(value, eventKey = key) { events.get('storage')({ key: eventKey, newValue: value }); }
  };
}

function expectTheme(ui, mode, locale = 'en') {
  assert.equal(ui.label.textContent, translate(mode === 'dark' ? 'Dark' : 'Light', locale));
  assert.equal(ui.icon.textContent, mode === 'dark' ? '☾' : '☀');
  assert.equal(ui.meta.content, mode === 'dark' ? '#111512' : '#f7f7f4');
  assert.equal(ui.button.attributes['aria-label'], translate(`Theme: ${mode === 'dark' ? 'Dark' : 'Light'}. Switch to ${mode === 'dark' ? 'light' : 'dark'} theme`, locale));
  assert.equal(ui.button.title, translate(`Theme: ${mode === 'dark' ? 'Dark' : 'Light'}`, locale));
}

test('automatic theme displays the current OS state and follows changes in all three languages', () => {
  for (const locale of ['en', 'zh-Hans', 'de']) {
    for (const stored of [null, 'system', 'invalid']) {
      const ui = theme({ stored, locale });
      expectTheme(ui, 'light', locale);
      ui.os(true); expectTheme(ui, 'dark', locale);
      ui.os(false); expectTheme(ui, 'light', locale);
      assert.equal(ui.root.dataset.theme, undefined);
      assert.equal(ui.data.get(key), stored ?? undefined, 'automatic selection does not write storage');
    }
  }
});

test('explicit clicks toggle only light and dark, persist, and take precedence over OS changes', () => {
  for (const dark of [false, true]) {
    const ui = theme({ dark });
    const first = dark ? 'light' : 'dark', second = dark ? 'dark' : 'light';
    ui.click(); expectTheme(ui, first);
    assert.equal(ui.root.dataset.theme, first);
    assert.equal(ui.data.get(key), first);
    ui.os(!dark); expectTheme(ui, first);
    ui.click(); expectTheme(ui, second);
    assert.equal(ui.data.get(key), second);
    expectTheme(theme({ dark: !dark, stored: ui.data.get(key) }), second);
  }
});

test('blocked storage still follows OS initially and keeps explicit toggles in memory', () => {
  const ui = theme({ dark: true, blocked: true });
  expectTheme(ui, 'dark');
  ui.os(false); expectTheme(ui, 'light');
  ui.click(); expectTheme(ui, 'dark');
  ui.os(true); ui.os(false); expectTheme(ui, 'dark');
  ui.click(); expectTheme(ui, 'light');
});

test('cross-tab selections and storage clearing update the effective state', () => {
  const ui = theme({ dark: true, stored: 'light' });
  expectTheme(ui, 'light');
  ui.storage('dark'); expectTheme(ui, 'dark');
  ui.storage('light'); expectTheme(ui, 'light');
  ui.storage('system'); expectTheme(ui, 'dark');
  ui.os(false); expectTheme(ui, 'light');
  ui.storage('dark'); ui.storage(null, null); expectTheme(ui, 'light');
  ui.storage('dark', 'unrelated-key'); expectTheme(ui, 'light');
});

test('first-paint theme metadata follows OS even when storage cannot be read', () => {
  const html = layout({ title: 'Test', description: 'Test', body: '' });
  const bootstrap = html.match(/<script data-site-theme>([\s\S]*?)<\/script>/)[1];
  for (const dark of [false, true]) {
    for (const stored of [null, 'system', 'light', 'dark', 'blocked']) {
      const root = { dataset: {} }, meta = {};
      vm.runInNewContext(bootstrap, {
        localStorage: { getItem() { if (stored === 'blocked') throw new Error('storage unavailable'); return stored; } },
        matchMedia: () => ({ matches: dark }),
        document: { documentElement: root, querySelector: () => meta }
      });
      const effectiveDark = stored === 'dark' || (stored !== 'light' && dark);
      assert.equal(meta.content, effectiveDark ? '#111512' : '#f7f7f4');
      assert.equal(root.dataset.theme, ['light', 'dark'].includes(stored) ? stored : undefined);
    }
  }
});
