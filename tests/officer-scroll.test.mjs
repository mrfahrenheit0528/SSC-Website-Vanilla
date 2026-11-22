import assert from 'node:assert/strict';
import test from 'node:test';
import { railState, initOfficerRail, easedPosition } from '../assets/js/officer-scroll.mjs';

function fixture() {
  const handlers = new Map(), frames = new Map(), classes = new Set();
  let nextFrame = 0, time = 0;
  const style = () => ({ setProperty(key, value) { this[key] = value; }, removeProperty(key) { delete this[key]; } });
  const button = () => ({ addEventListener(name, handler) { this[name] = handler; } });
  const panels = [0, 1, 2].map((i) => ({ id: `officer-${i + 1}`, offsetLeft: 48 + 900 * i, scrollHeight: 550, clientHeight: 550, contains: (node) => node === `contact-${i}` }));
  const track = { scrollWidth: 2800, style: style(), addEventListener(name, handler) { this[name] = handler; } };
  const previous = button(), next = button(), position = {}, progress = { style: style() }, controls = {};
  const rail = { clientWidth: 1200 };
  const reduced = { matches: false, addEventListener(name, handler) { this[name] = handler; } };
  const desktop = { ...reduced, matches: true };
  const env = {
    scrollY: 0, innerHeight: 900, location: { hash: '' },
    document: { querySelector: () => ({ getBoundingClientRect: () => ({ height: 80 }) }) },
    matchMedia: (query) => query.includes('reduced-motion') ? reduced : desktop,
    addEventListener: (name, handler) => handlers.set(name, handler),
    requestAnimationFrame: (handler) => { frames.set(++nextFrame, handler); return nextFrame; },
    cancelAnimationFrame: (id) => frames.delete(id),
    scrollTo({ top }) { this.scrollY = top; handlers.get('scroll')(); },
  };
  const nodes = { '[data-officer-rail]': rail, '[data-officer-track]': track, '[data-rail-controls]': controls, '[data-rail-previous]': previous, '[data-rail-next]': next, '[data-rail-position]': position, '[data-rail-progress]': progress };
  const root = {
    querySelector: (selector) => nodes[selector], querySelectorAll: () => panels,
    style: style(), classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
    getBoundingClientRect: () => ({ top: 1000 - env.scrollY }),
  };
  const step = () => { time += 16; const pending = [...frames.values()]; frames.clear(); pending.forEach((fn) => fn(time)); };
  const flush = () => { let count = 0; while (frames.size && count++ < 200) step(); assert.equal(frames.size, 0, 'Motion must settle instead of animating forever'); };
  const controller = initOfficerRail(root, env);
  return { controller, env, root, panels, classes, controls, reduced, desktop, track, previous, next, position, progress, flush, step, handlers };
}

test('rail clamps motion before and after the section and identifies the nearest officer', () => {
  assert.deepEqual(railState(0, 500, 1600, [0, 900, 1600]), { x: 0, progress: 0, index: 0 });
  assert.deepEqual(railState(1300, 500, 1600, [0, 900, 1600]), { x: 800, progress: .5, index: 1 });
  assert.deepEqual(railState(9999, 500, 1600, [0, 900, 1600]), { x: 1600, progress: 1, index: 2 });
  assert.equal(railState(100, 0, 0, [0]).progress, 0);
});

test('vertical scrolling drives the track and controls reach the first and last officers', () => {
  const f = fixture();
  assert.equal(f.root.style.height, '2980px');
  assert.equal(f.root.style['--rail-height'], '820px');
  assert.equal(f.classes.has('is-horizontal'), true);
  assert.equal(f.previous.disabled, true);
  f.next.click(); f.flush();
  assert.equal(f.env.scrollY, 2135);
  assert.equal(f.track.style.transform, 'translate3d(-900px, 0, 0)');
  assert.equal(f.position.textContent, '2 / 3');
  f.next.click(); f.flush();
  assert.equal(f.env.scrollY, 3080);
  assert.equal(f.next.disabled, true);
  assert.equal(f.progress.style.transform, 'scaleX(1)');
  f.previous.click(); f.flush();
  assert.equal(f.position.textContent, '2 / 3');
});

test('keyboard focus and direct officer anchors reveal offscreen profiles', () => {
  const f = fixture();
  f.track.focusin({ target: 'contact-2' }); f.flush();
  assert.equal(f.position.textContent, '3 / 3');
  f.env.location.hash = '#officer-1'; f.handlers.get('hashchange')(); f.flush();
  assert.equal(f.env.scrollY, 920);
  assert.equal(f.position.textContent, '1 / 3');
});

test('mobile, reduced motion and overflowing content restore normal vertical profiles', () => {
  for (const mode of ['mobile', 'reduced', 'overflow']) {
    const f = fixture();
    if (mode === 'mobile') f.desktop.matches = false;
    if (mode === 'reduced') f.reduced.matches = true;
    if (mode === 'overflow') f.panels[0].scrollHeight = 700;
    f.controller.measure();
    assert.equal(f.classes.has('is-horizontal'), false, mode);
    assert.equal(f.root.style.height, undefined, mode);
    assert.equal(f.track.style.transform, undefined, mode);
    assert.equal(f.controls.hidden, true, mode);
  }
});

test('snap positions follow measured rail spacing and clear when the rail becomes vertical', () => {
  const f = fixture();
  const layouts = [];
  const unsubscribe = f.controller.onLayout((layout) => layouts.push(layout));
  assert.deepEqual(layouts[0], { enabled: true, targets: [0, 1215, 2160] });
  f.track.scrollWidth = 3100;
  f.panels[1].offsetLeft = 1048;
  f.panels[2].offsetLeft = 2048;
  f.controller.measure();
  assert.deepEqual(layouts[1], { enabled: true, targets: [0, 1350, 2565] });
  f.desktop.matches = false;
  f.controller.measure();
  assert.deepEqual(layouts[2], { enabled: false, targets: [] });
  unsubscribe(); f.controller.measure();
  assert.equal(layouts.length, 3);
});

test('officer motion eases into position without overshooting, independent of refresh rate', () => {
  const first = easedPosition(0, 900, 16);
  assert.ok(first > 0 && first < 100);
  assert.ok(Math.abs(easedPosition(first, 900, 16) - easedPosition(0, 900, 32)) < 1e-8);
  let current = first;
  for (let i = 0; i < 150; i++) {
    const next = easedPosition(current, 900, 16);
    assert.ok(next >= current && next <= 900);
    current = next;
  }
  assert.equal(current, 900);
  assert.ok(easedPosition(900, 0, 16) > 800);
});

test('wheel updates ease across frames while keyboard focus reveals its target immediately', () => {
  const f = fixture();
  f.env.scrollY = 2135; f.handlers.get('scroll')(); f.step();
  const displacement = -Number(f.track.style.transform.match(/translate3d\(([^p]+)px/)[1]);
  assert.ok(displacement > 0 && displacement < 100);
  f.flush();
  assert.equal(f.track.style.transform, 'translate3d(-900px, 0, 0)');
  f.track.focusin({ target: 'contact-2' });
  assert.equal(f.track.style.transform, 'translate3d(-1600px, 0, 0)');
});

test('viewport fitting includes visible controls before checking for clipped officer content', () => {
  const f = fixture();
  Object.defineProperty(f.panels[0], 'scrollHeight', { get: () => f.controls.hidden ? 550 : 700 });
  f.controller.measure();
  assert.equal(f.classes.has('is-horizontal'), false);
  assert.equal(f.controls.hidden, true);
});
