import assert from 'node:assert/strict';
import test from 'node:test';
import { sceneProgress, layerDisplacement, copyVisibility } from '../assets/js/parallax-math.mjs';
import { startParallax, preparePhotoScene } from '../assets/js/parallax-scene.mjs';

const depths = [.06, .28, .68, 1];
function fixture() {
  const rootClasses = new Set(), events = new Map(), frames = new Map();
  const preference = { matches: false, addEventListener(name, handler) { this.change = handler; }, removeEventListener() {} };
  const layers = depths.map((depth) => ({ dataset: { depth: String(depth) }, style: {} }));
  const copy = { style: {}, inert: false };
  const scene = {
    top: 0, classList: { add() {}, toggle() {} },
    querySelectorAll: () => layers,
    querySelector: (selector) => selector === '[data-scene-copy]' ? copy : null,
    getBoundingClientRect() { return { top: this.top, height: 1800 }; },
    addEventListener() {}, removeEventListener() {},
  };
  let nextFrame = 0;
  const view = {
    innerHeight: 900, innerWidth: 1440,
    document: {
      hidden: false,
      documentElement: { classList: {
        toggle: (name, on) => on ? rootClasses.add(name) : rootClasses.delete(name),
        remove: (name) => rootClasses.delete(name),
      } },
      addEventListener() {}, removeEventListener() {},
    },
    matchMedia: (query) => query.includes('reduced-motion') ? preference : { matches: false },
    addEventListener: (name, handler) => events.set(name, handler),
    removeEventListener: (name) => events.delete(name),
    requestAnimationFrame: (callback) => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: (id) => frames.delete(id),
  };
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback()); };
  return { scene, layers, copy, view, rootClasses, preference, events, flush };
}
test('photo depth planes have distinct scroll displacement, with near scenery moving farther', () => {
  assert.equal(sceneProgress(100, 1800, 900), 0);
  assert.equal(sceneProgress(-450, 1800, 900), .5);
  assert.equal(sceneProgress(-2000, 1800, 900), 1);
  const offsets = depths.map((depth) => layerDisplacement(.5, depth, 900).y);
  assert.equal(new Set(offsets).size, 4);
  assert.ok(offsets.every((y, index) => !index || Math.abs(y) > Math.abs(offsets[index - 1])));
  assert.equal(copyVisibility(0), 1);
  assert.equal(copyVisibility(1), 0);
});
test('scroll events actually update each image transform and retire faded controls', () => {
  const f = fixture();
  const destroy = startParallax(f.scene, f.view);
  f.flush();
  assert.ok(f.rootClasses.has('parallax-ready'));
  const initial = f.layers.map((layer) => layer.style.transform);
  f.scene.top = -450; f.events.get('scroll')(); f.flush();
  assert.equal(new Set(f.layers.map((layer) => layer.style.transform)).size, 4);
  assert.ok(f.layers.every((layer, index) => layer.style.transform !== initial[index]));
  f.scene.top = -900; f.events.get('scroll')(); f.flush();
  assert.equal(f.copy.inert, true);
  assert.equal(f.copy.style.opacity, '0');
  destroy();
  assert.equal(f.copy.inert, false);
  assert.ok(!f.rootClasses.has('parallax-ready'));
});
test('reduced motion removes the extended sticky scene and resets every plane', () => {
  const f = fixture();
  const destroy = startParallax(f.scene, f.view);
  f.scene.top = -450; f.flush();
  f.preference.matches = true; f.preference.change(); f.flush();
  assert.ok(!f.rootClasses.has('parallax-ready'));
  assert.ok(f.layers.every((layer) => layer.style.transform === 'none'));
  assert.equal(f.copy.style.opacity, '1');
  assert.equal(f.copy.inert, false);
  destroy();
});
test('narrow-screen parallax travel follows the photograph height instead of the full viewport', () => {
  const f = fixture();
  f.scene.querySelector = (selector) => selector === '[data-scene-copy]' ? f.copy : { getBoundingClientRect: () => ({ height: 450 }) };
  const destroy = startParallax(f.scene, f.view);
  f.scene.top = -450; f.flush();
  assert.ok(f.layers.at(-1).style.transform.includes(', -72.00px, 0)'));
  destroy();
});
test('a missing photo mask retains the original-photo fallback and does not start the extended scene', async () => {
  const f = fixture();
  let activated = false;
  f.scene.classList.add = () => { activated = true; };
  f.scene.querySelectorAll = () => [{ dataset: { photoAsset: 'missing-mask.webp' } }];
  f.view.Image = class { set src(value) { this.onerror(new Error(value)); } };
  assert.equal(await preparePhotoScene(f.scene, f.view), null);
  assert.equal(activated, false);
  assert.ok(!f.rootClasses.has('parallax-ready'));
});
test('the original-photo fallback switches only after all unique scene assets load', async () => {
  const f = fixture();
  const classes = new Set(), loaded = [];
  f.scene.classList.add = (name) => classes.add(name);
  f.scene.querySelectorAll = (selector) => selector === '[data-photo-asset]'
    ? ['photo.webp', 'matte.webp', 'photo.webp'].map((photoAsset) => ({ dataset: { photoAsset } })) : f.layers;
  f.view.Image = class { set src(value) { loaded.push(value); this.onload(); } };
  const destroy = await preparePhotoScene(f.scene, f.view);
  assert.deepEqual(loaded, ['photo.webp', 'matte.webp']);
  assert.ok(classes.has('photo-assets-ready'));
  assert.ok(f.rootClasses.has('parallax-ready'));
  f.flush();
  destroy();
});
