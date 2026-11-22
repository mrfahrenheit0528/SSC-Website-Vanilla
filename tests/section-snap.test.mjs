import assert from 'node:assert/strict';
import test from 'node:test';
import { initSectionSnapping, snapDestination, snapEase, projectedSnapPosition } from '../assets/js/section-snap.mjs';

function fixture({ supported = true, reduced = false, stacked = false } = {}) {
  const classes = new Set(), markers = [], properties = {}, events = new Map();
  const windowEvents = new Map(), documentEvents = new Map(), timers = new Map(), frames = new Map(), calls = [];
  let token = 0, clock = 0;
  let listener;
  const preference = {
    matches: reduced,
    addEventListener: (name, handler) => events.set(name, handler),
    removeEventListener: (name) => events.delete(name),
  };
  const html = {
    scrollHeight: 5000,
    classList: {
      toggle: (name, on) => on ? classes.add(name) : classes.delete(name),
      remove: (name) => classes.delete(name),
    },
    style: { setProperty: (key, value) => properties[key] = value, removeProperty: (key) => delete properties[key] },
  };
  const rect = (top, height) => ({ getBoundingClientRect: () => ({ top: top - env.scrollY, height }) });
  const env = {
    scrollY: 918, innerHeight: 900,
    CSS: { supports: () => supported },
    matchMedia: (query) => query.includes('reduced-motion') ? preference : { matches: stacked },
    addEventListener: (name, handler) => windowEvents.set(name, handler),
    removeEventListener: (name) => windowEvents.delete(name),
    setTimeout: (handler) => { timers.set(++token, handler); return token; },
    clearTimeout: (id) => timers.delete(id),
    requestAnimationFrame: (handler) => { frames.set(++token, handler); return token; },
    cancelAnimationFrame: (id) => frames.delete(id),
    scrollTo(options) { calls.push(options); this.scrollY = options.top; windowEvents.get('scroll')?.(); },
    document: {
      documentElement: html,
      hidden: false,
      querySelector: (selector) => selector === '.site-header' ? { getBoundingClientRect: () => ({ height: 82 }) }
        : selector === '#official-documents' ? rect(1000, 600)
        : selector === '.site-footer' ? rect(4600, 400) : null,
      querySelectorAll: () => [],
      addEventListener: (name, handler) => documentEvents.set(name, handler),
      removeEventListener: (name) => documentEvents.delete(name),
      createElement: () => ({
        style: {}, attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        remove() { markers.splice(markers.indexOf(this), 1); },
      }),
    },
  };
  const officers = { onLayout(callback) { listener = callback; callback({ enabled: true, targets: [0, 900, 1600] }); return () => listener = null; } };
  const root = { ...rect(2000, 2500), append: (marker) => markers.push(marker), querySelectorAll: () => [rect(2000, 1500)] };
  const dispose = initSectionSnapping(root, officers, env);
  const idle = () => { clock += 10; const pending = [...timers.values()]; timers.clear(); pending.forEach((fn) => fn()); };
  const step = () => { clock += 16; const pending = [...frames.values()]; frames.clear(); pending.forEach((fn) => fn(clock)); };
  const finish = () => { let i = 0; while (frames.size && i++ < 100) step(); assert.equal(frames.size, 0, 'Snap must finish'); };
  const wheel = (delta, target, deltaMode = 0) => {
    windowEvents.get('wheel')({ type: 'wheel', deltaX: 0, deltaY: delta, deltaMode, target });
    env.scrollY += delta; windowEvents.get('scroll')?.();
  };
  return { classes, markers, properties, preference, events, dispose, layout: (state) => listener(state), env, windowEvents, timers, frames, calls, idle, step, finish, wheel };
}

test('each horizontal officer gets a stopping point aligned with the measured header', () => {
  const f = fixture();
  assert.equal(f.classes.has('section-snap-ready'), true);
  assert.equal(f.classes.has('smooth-snap-ready'), true);
  assert.equal(f.properties['--snap-header-height'], '82px');
  assert.deepEqual(f.markers.map((marker) => marker.style.top), ['0px', '900px', '1600px']);
  assert.ok(f.markers.every((marker) => marker.attributes['aria-hidden'] === 'true'));
  f.layout({ enabled: true, targets: [0, 750] });
  assert.deepEqual(f.markers.map((marker) => marker.style.top), ['0px', '750px']);
  f.layout({ enabled: false, targets: [] });
  assert.equal(f.markers.length, 0);
  assert.equal(f.classes.has('section-snap-ready'), true);
});

test('reduced motion disables snapping and cleanup restores ordinary page scrolling', () => {
  const f = fixture({ reduced: true });
  assert.equal(f.classes.has('section-snap-ready'), false);
  assert.equal(f.markers.length, 0);
  f.preference.matches = false; f.events.get('change')();
  assert.equal(f.classes.has('section-snap-ready'), true);
  assert.equal(f.markers.length, 3);
  f.preference.matches = true; f.events.get('change')();
  assert.equal(f.markers.length, 0);
  assert.equal(f.classes.has('section-snap-ready'), false);
  f.dispose();
  assert.equal(f.properties['--snap-header-height'], undefined);
  assert.equal(f.events.size, 0);
  assert.equal(f.windowEvents.size, 0);
});

test('even a short gesture advances to a definite next stop, and upward gestures go back', () => {
  assert.equal(snapDestination([0, 1000, 2000, 3000], 1000, 1040), 2000);
  assert.equal(snapDestination([0, 1000, 2000, 3000], 2000, 1960), 1000);
  assert.equal(snapDestination([0, 1000, 2000, 3000], 1000, 2900), 3000);
  assert.equal(snapDestination([0, 1000], 0, 2), null);
  assert.equal(snapDestination([0, 1000], 1000, 1100), null);
});

test('snap easing starts and ends gently without overshooting', () => {
  assert.equal(snapEase(0), 0);
  assert.equal(snapEase(.5), .5);
  assert.equal(snapEase(1), 1);
  assert.ok(snapEase(.1) < .01);
  assert.ok(snapEase(.9) > .99);
  let previous = 0;
  for (let i = 0; i <= 100; i++) {
    const value = snapEase(i / 100);
    assert.ok(value >= previous && value <= 1);
    previous = value;
  }
});

test('a short wheel gesture snaps from documents to the first officer over multiple eased frames', () => {
  const f = fixture();
  f.wheel(40); f.idle();
  assert.equal(f.env.scrollY, 958);
  f.step(); f.step();
  assert.ok(f.env.scrollY > 958 && f.env.scrollY < 960);
  f.finish();
  assert.equal(f.env.scrollY, 1918);
  assert.ok(f.calls.length > 50, 'Transition should take about a second rather than jump immediately');
  assert.ok(f.calls.every((call) => call.behavior === 'instant')); // Explicit easing owns the timeline.
  f.wheel(40); f.idle(); f.finish();
  assert.equal(f.env.scrollY, 2818);
});

test('a 10 ms timer firing before the first rendered scroll does not lose the gesture', () => {
  const f = fixture();
  f.windowEvents.get('wheel')({ type: 'wheel', deltaX: 0, deltaY: 40 });
  f.idle(); // No scroll frame has arrived yet.
  f.env.scrollY += 40;
  f.windowEvents.get('scroll')();
  f.idle(); f.finish();
  assert.equal(f.env.scrollY, 1918);
});

test('rapid wheel events with tiny trailing deltas retain their original snap intent', () => {
  const f = fixture();
  for (const delta of [40, 20, 10, 4, 2, 1, .5]) {
    f.wheel(delta); f.idle(); f.step(); f.step();
  }
  f.finish();
  assert.equal(f.env.scrollY, 1918);
  assert.equal(f.timers.size, 0);
});

test('a delayed scroll frame and tiny trailing wheel events work together', () => {
  const f = fixture();
  f.windowEvents.get('wheel')({ type: 'wheel', deltaX: 0, deltaY: 40 });
  f.idle();
  f.env.scrollY += 40; f.windowEvents.get('scroll')(); f.idle(); f.step();
  f.wheel(.5); f.idle(); f.finish();
  assert.equal(f.env.scrollY, 1918);
});

test('large wheel gestures skip intermediate cards in either direction', () => {
  const down = fixture();
  down.env.scrollY = 1918;
  down.wheel(900); down.idle(); down.finish();
  assert.equal(down.env.scrollY, 3518);
  const up = fixture();
  up.env.scrollY = 3518;
  up.wheel(-1000); up.idle(); up.finish();
  assert.equal(up.env.scrollY, 1918);
});

test('sustained scrolling during a snap accumulates input and can skip the first officer', () => {
  const f = fixture();
  for (let i = 0; i < 6; i++) {
    f.wheel(180); f.idle(); f.step(); f.step();
  }
  f.finish();
  assert.equal(f.env.scrollY, 2818);
});

test('reversing after a large gesture discards its old forward momentum', () => {
  const f = fixture();
  f.env.scrollY = 1918;
  f.wheel(900); f.idle();
  for (let i = 0; i < 12; i++) f.step();
  f.wheel(-40); f.idle(); f.finish();
  assert.equal(f.env.scrollY, 2818);
});

test('wheel lines and pages are normalized before choosing a farther landing', () => {
  const lines = fixture();
  lines.env.scrollY = 1918;
  lines.wheel(60, undefined, 1); lines.idle(); lines.finish();
  assert.equal(lines.env.scrollY, 3518);
  const pages = fixture();
  pages.env.scrollY = 1918;
  pages.wheel(1, undefined, 2); pages.env.scrollY = 2736;
  pages.windowEvents.get('scroll')(); pages.idle(); pages.finish();
  assert.equal(pages.env.scrollY, 3518);
});

test('landing projection respects actual movement and page endpoints', () => {
  assert.equal(projectedSnapPosition(1000, 1400, 20), 1400);
  assert.equal(projectedSnapPosition(1000, 1600, 1000), 2750);
  assert.equal(projectedSnapPosition(3000, 2400, -1000), 1250);
  assert.equal(projectedSnapPosition(1000, 1100, -100), 1100);
  assert.equal(snapDestination([0, 1000, 2000], 1000, projectedSnapPosition(1000, 1100, 10000)), 2000);
});

test('a new gesture interrupts the animation and can smoothly reverse direction', () => {
  const f = fixture();
  f.wheel(40); f.idle();
  for (let i = 0; i < 12; i++) f.step();
  f.wheel(-40);
  assert.equal(f.frames.size, 0);
  f.idle(); f.finish();
  assert.equal(f.env.scrollY, 918);
});

test('opening scroll, form inputs and Home/End navigation retain ordinary scrolling', () => {
  const f = fixture();
  f.env.scrollY = 0;
  f.wheel(40); f.idle();
  assert.equal(f.frames.size, 0);
  f.env.scrollY = 918;
  f.wheel(40, { closest: () => ({}) }); f.idle();
  assert.equal(f.frames.size, 0);
  f.wheel(40); f.idle(); f.step();
  f.windowEvents.get('keydown')({ key: 'End' });
  assert.equal(f.frames.size, 0);
  assert.equal(f.timers.size, 0);
});

test('long vertical profiles keep intermediate stops so their lower content remains reachable', () => {
  const f = fixture({ stacked: true });
  f.layout({ enabled: false, targets: [] });
  f.env.scrollY = 1918;
  f.wheel(40); f.idle(); f.finish();
  assert.equal(f.env.scrollY, 2559);
});

test('reduced motion cancels an in-progress snap without leaving a delayed jump', () => {
  const f = fixture();
  f.wheel(40); f.idle(); f.step();
  f.preference.matches = true; f.events.get('change')();
  assert.equal(f.frames.size, 0);
  assert.equal(f.timers.size, 0);
  assert.equal(f.classes.has('smooth-snap-ready'), false);
});

test('unsupported browsers keep normal scrolling without adding markers', () => {
  const f = fixture({ supported: false });
  assert.equal(f.dispose, undefined);
  assert.equal(f.classes.size, 0);
  assert.equal(f.markers.length, 0);
});
