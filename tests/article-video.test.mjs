import test from 'node:test';
import assert from 'node:assert/strict';
import { initArticleVideos } from '../assets/article-video.js';

function fixture(id = 'abcdefghijk') {
  let frame;
  const listeners = new Map();
  const button = { hidden: true, addEventListener: (name, fn) => listeners.set(name, fn) };
  const fallback = { hidden: false };
  const shell = {
    dataset: { articleVideo: id, playerTitle: 'Original title — YouTube video' },
    querySelector: selector => selector === 'iframe' ? frame : selector === '.video-load-button' ? button : fallback,
    append(value) { frame = value; }
  };
  const root = {
    querySelectorAll: () => [shell],
    createElement(name) {
      assert.equal(name, 'iframe');
      return { focus(options) { this.focusOptions = options; } };
    }
  };
  return { root, button, fallback, frame: () => frame, click: () => listeners.get('click')?.() };
}

test('article initialization makes no player or third-party request until native button activation', () => {
  const ui = fixture();
  initArticleVideos(ui.root);
  assert.equal(ui.frame(), undefined);
  assert.equal(ui.button.hidden, false);
  assert.equal(ui.fallback.hidden, true);
  ui.click();
  const frame = ui.frame();
  assert.equal(frame.src, 'https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0');
  assert.equal(frame.title, 'Original title — YouTube video');
  assert.equal(frame.referrerPolicy, 'strict-origin-when-cross-origin');
  assert.equal(frame.allowFullscreen, true);
  assert.equal(frame.allow.includes('autoplay'), false);
  assert.deepEqual(frame.focusOptions, { preventScroll: true });
  assert.equal(ui.button.hidden, true);
  ui.click();
  assert.equal(ui.frame(), frame, 'repeated activation does not duplicate the player');
});

test('invalid identity keeps the ordinary no-JS fallback and cannot activate a player', () => {
  const ui = fixture('../unsafe');
  initArticleVideos(ui.root); ui.click();
  assert.equal(ui.frame(), undefined);
  assert.equal(ui.button.hidden, true);
  assert.equal(ui.fallback.hidden, false);
});
