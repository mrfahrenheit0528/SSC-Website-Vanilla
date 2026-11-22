import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/js/home.js', import.meta.url), 'utf8');
function element() {
  const handlers = new Map();
  const classes = new Set();
  return {
    handlers, attributes: {}, dataset: {}, focused: false,
    classList: {
      add: (name) => classes.add(name),
      contains: (name) => classes.has(name),
      toggle: (name, on) => on ? classes.add(name) : classes.delete(name),
    },
    addEventListener: (name, handler) => handlers.set(name, handler),
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() { this.focused = true; },
  };
}
function setup(hover = false) {
  const front = element(), back = element(), open = element(), close = element(), link = element(), card = element();
  back.querySelector = () => link;
  back.contains = (node) => node === link || node === close;
  card.querySelector = (selector) => ({ '.card-front': front, '.card-back': back, '[data-card-open]': open, '[data-card-close]': close })[selector];
  const document = {
    querySelectorAll: (selector) => selector === '[data-document-card]' ? [card] : [],
    querySelector: () => null,
  };
  vm.runInNewContext(source, { document, window: {}, matchMedia: (query) => ({ matches: query.includes('hover') ? hover : true }), addEventListener() {} });
  return { front, back, open, close, link, card, document };
}
test('category cards reveal working links and move focus without hidden tab stops', () => {
  const { front, back, open, close, link, card } = setup();
  assert.equal(back.inert, true);
  assert.equal(card.dataset.flipReady, 'true');
  open.handlers.get('click')();
  assert.equal(card.classList.contains('is-flipped'), true);
  assert.equal(open.attributes['aria-expanded'], 'true');
  assert.equal(front.inert, true);
  assert.equal(back.inert, false);
  assert.equal(link.focused, true);
  close.handlers.get('click')();
  assert.equal(card.classList.contains('is-flipped'), false);
  assert.equal(front.inert, false);
  assert.equal(back.inert, true);
  assert.equal(open.attributes['aria-expanded'], 'false');
  assert.equal(open.focused, true);
});

test('mouse hover flips without stealing focus, while touch waits for a tap', () => {
  const { card, open, back, link, document } = setup(true);
  card.handlers.get('pointerenter')({ pointerType: 'touch' });
  assert.equal(card.classList.contains('is-flipped'), false);
  card.handlers.get('pointerenter')({ pointerType: 'mouse' });
  assert.equal(card.classList.contains('is-flipped'), true);
  assert.equal(link.focused, false);
  assert.equal(back.inert, false);
  card.handlers.get('pointerleave')();
  assert.equal(card.classList.contains('is-flipped'), false);
  open.handlers.get('click')();
  document.activeElement = link;
  card.handlers.get('pointerleave')();
  assert.equal(card.classList.contains('is-flipped'), true);
});
test('Escape closes a revealed category and returns focus to its trigger', () => {
  const { open, card, back } = setup();
  open.handlers.get('click')();
  let prevented = false;
  card.handlers.get('keydown')({ key: 'Escape', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(back.inert, true);
  assert.equal(open.focused, true);
  assert.equal(open.attributes['aria-expanded'], 'false');
});

function setupVideo({ reduced = false, saveData = false, blocked = false, pending = false } = {}) {
  const video = element(), toggle = element(), documentHandlers = new Map(), observers = [], completions = [];
  const preferenceListeners = [];
  const preference = {
    matches: reduced,
    addEventListener(name, handler) { preferenceListeners.push(handler); },
    change() { preferenceListeners.forEach((handler) => handler({ matches: this.matches })); },
  };
  const document = {
    hidden: false,
    querySelectorAll: () => [],
    querySelector: (selector) => ({ '[data-hero-video]': video, '[data-video-toggle]': toggle })[selector] || null,
    documentElement: { classList: { add() {}, remove() {} } },
    addEventListener: (name, handler) => documentHandlers.set(name, handler),
  };
  video.dataset.src = 'event-loop.mp4';
  video.paused = true;
  video.loadCount = 0;
  video.getAttribute = () => video.src;
  video.load = () => video.loadCount++;
  video.pause = () => { video.paused = true; video.handlers.get('pause')?.(); };
  video.play = () => {
    if (blocked) return Promise.reject(new Error('Autoplay blocked'));
    video.paused = false; video.handlers.get('play')?.();
    return pending ? new Promise((resolve) => completions.push(resolve)) : Promise.resolve();
  };
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() {}
  }
  const window = { navigator: { connection: { saveData } }, IntersectionObserver: Observer };
  vm.runInNewContext(source, { document, window, IntersectionObserver: Observer, matchMedia: () => preference });
  const visibility = (visible) => observers.find((observer) => observer.target === video).callback([{ isIntersecting: visible }]);
  return { video, toggle, document, documentHandlers, preference, visibility, completions };
}

test('reduced motion and data saving retain the poster until manual play', async () => {
  for (const options of [{ reduced: true }, { saveData: true }]) {
    const f = setupVideo(options);
    f.visibility(true);
    assert.equal(f.video.src, undefined);
    assert.equal(f.video.loadCount, 0);
    assert.equal(f.toggle.textContent, 'Play video');
    f.toggle.handlers.get('click')();
    await Promise.resolve();
    assert.equal(f.video.src, 'event-loop.mp4');
    assert.equal(f.video.muted, true);
    assert.equal(f.video.paused, false);
    assert.equal(f.toggle.textContent, 'Pause video');
  }
});

test('video pauses offscreen or in a hidden tab, and preserves a manual pause', async () => {
  const f = setupVideo();
  f.visibility(true); await Promise.resolve();
  assert.equal(f.video.paused, false);
  f.visibility(false);
  assert.equal(f.video.paused, true);
  f.visibility(true); await Promise.resolve();
  assert.equal(f.video.paused, false);
  f.document.hidden = true; f.documentHandlers.get('visibilitychange')();
  assert.equal(f.video.paused, true);
  f.document.hidden = false; f.documentHandlers.get('visibilitychange')(); await Promise.resolve();
  f.toggle.handlers.get('click')();
  f.visibility(false); f.visibility(true);
  assert.equal(f.video.paused, true);
  assert.equal(f.video.loadCount, 1);
});

test('autoplay rejection leaves manual play available and pending play stops when motion is disabled', async () => {
  const blocked = setupVideo({ blocked: true });
  blocked.visibility(true);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(blocked.video.paused, true);
  assert.equal(blocked.toggle.textContent, 'Play video');
  assert.equal(blocked.toggle.hidden, false);
  const pending = setupVideo({ pending: true });
  pending.visibility(true);
  pending.preference.matches = true; pending.preference.change();
  pending.completions[0](); await Promise.resolve();
  assert.equal(pending.video.paused, true);
  assert.equal(pending.toggle.textContent, 'Play video');
});
