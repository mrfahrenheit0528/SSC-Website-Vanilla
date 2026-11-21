import { sceneProgress, layerDisplacement, copyVisibility } from './parallax-math.mjs';

export function startParallax(scene, view = window) {
  const layers = [...scene.querySelectorAll('[data-scene-layer]')];
  const copy = scene.querySelector('[data-scene-copy]');
  const motionBounds = scene.querySelector('[data-motion-bounds]');
  const document = view.document;
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = view.matchMedia('(hover: hover) and (pointer: fine)');
  let active = true, frame = 0, destroyed = false;
  let pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 };

  function reset() {
    for (const layer of layers) layer.style.transform = 'none';
    if (copy) { copy.style.transform = 'none'; copy.style.opacity = '1'; copy.inert = false; }
    pointer = { x: 0, y: 0 }; target = { x: 0, y: 0 };
  }
  function draw() {
    frame = 0;
    if (destroyed || !active || document.hidden) return;
    if (reduced.matches) { reset(); return; }
    const rect = scene.getBoundingClientRect();
    const progress = sceneProgress(rect.top, rect.height, view.innerHeight);
    const travelHeight = Math.min(view.innerHeight, motionBounds?.getBoundingClientRect().height ?? view.innerHeight);
    pointer.x += (target.x - pointer.x) * .12;
    pointer.y += (target.y - pointer.y) * .12;
    for (const layer of layers) {
      const offset = layerDisplacement(progress, Number(layer.dataset.depth), travelHeight, pointer);
      layer.style.transform = `translate3d(${offset.x.toFixed(2)}px, ${offset.y.toFixed(2)}px, 0)`;
    }
    if (copy) {
      copy.style.transform = `translate3d(0, ${(-progress * view.innerHeight * .13).toFixed(2)}px, 0)`;
      copy.style.opacity = String(copyVisibility(progress));
      copy.inert = copyVisibility(progress) < .03;
    }
    if (Math.abs(target.x - pointer.x) + Math.abs(target.y - pointer.y) > .002) invalidate();
  }
  function invalidate() {
    if (!frame && active && !destroyed && !document.hidden) frame = view.requestAnimationFrame(draw);
  }
  function preferenceChanged() {
    document.documentElement.classList.toggle('parallax-ready', !reduced.matches);
    reset(); invalidate();
  }
  function pointerMoved(event) {
    if (reduced.matches || !finePointer.matches || event.pointerType === 'touch') return;
    target = { x: event.clientX / view.innerWidth * 2 - 1, y: event.clientY / view.innerHeight * 2 - 1 };
    invalidate();
  }
  function pointerLeft() { target = { x: 0, y: 0 }; invalidate(); }
  function visibilityChanged() {
    if (document.hidden) { view.cancelAnimationFrame(frame); frame = 0; }
    else invalidate();
  }
  view.addEventListener('scroll', invalidate, { passive: true });
  view.addEventListener('resize', invalidate);
  view.addEventListener('pageshow', invalidate);
  document.addEventListener('visibilitychange', visibilityChanged);
  scene.addEventListener('pointermove', pointerMoved, { passive: true });
  scene.addEventListener('pointerleave', pointerLeft);
  reduced.addEventListener('change', preferenceChanged);
  let observer;
  if ('IntersectionObserver' in view) {
    observer = new view.IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      scene.classList.toggle('scene-active', active);
      if (active) invalidate();
      else { view.cancelAnimationFrame(frame); frame = 0; }
    });
    observer.observe(scene);
  } else scene.classList.add('scene-active');
  preferenceChanged();
  return () => {
    destroyed = true; view.cancelAnimationFrame(frame); observer?.disconnect(); reset();
    view.removeEventListener('scroll', invalidate);
    view.removeEventListener('resize', invalidate);
    view.removeEventListener('pageshow', invalidate);
    document.removeEventListener('visibilitychange', visibilityChanged);
    scene.removeEventListener('pointermove', pointerMoved);
    scene.removeEventListener('pointerleave', pointerLeft);
    reduced.removeEventListener('change', preferenceChanged);
    document.documentElement.classList.remove('parallax-ready');
  };
}

export async function preparePhotoScene(scene, view = window) {
  const assets = [...new Set([...scene.querySelectorAll('[data-photo-asset]')].map((element) => element.dataset.photoAsset))];
  try {
    await Promise.all(assets.map((url) => new Promise((resolve, reject) => {
      const image = new view.Image();
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
      if (image.complete && image.naturalWidth > 0) resolve();
    })));
  } catch {
    // Keep the untouched photograph visible if a matte/backplate cannot load.
    return null;
  }
  scene.classList.add('photo-assets-ready');
  return startParallax(scene, view);
}

if (typeof document !== 'undefined') {
  const scene = document.querySelector('[data-opening-scene]');
  if (scene) {
    if (scene.hasAttribute('data-photo-scene')) preparePhotoScene(scene);
    else startParallax(scene);
  }
}
