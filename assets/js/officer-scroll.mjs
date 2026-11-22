import { initSectionSnapping } from './section-snap.mjs?v=7';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const RAIL_SCROLL_SCALE = 1.35;

// Time-based easing keeps mouse wheels and high-refresh trackpads consistent.
export function easedPosition(current, target, elapsed = 16) {
  const next = current + (target - current) * (1 - Math.exp(-clamp(elapsed, 1, 64) / 180));
  return Math.abs(target - next) < .2 ? target : next;
}

export function railState(scroll, start, travel, targets) {
  const x = clamp(scroll - start, 0, Math.max(0, travel));
  const progress = travel > 0 ? x / travel : 0;
  let index = 0;
  targets.forEach((target, i) => {
    if (Math.abs(target - x) < Math.abs(targets[index] - x)) index = i;
  });
  return { x, progress, index };
}

export function initOfficerRail(root, env = window) {
  const rail = root.querySelector('[data-officer-rail]');
  const track = root.querySelector('[data-officer-track]');
  const panels = [...root.querySelectorAll('[data-officer-section]')];
  const controls = root.querySelector('[data-rail-controls]');
  const previous = root.querySelector('[data-rail-previous]');
  const next = root.querySelector('[data-rail-next]');
  const position = root.querySelector('[data-rail-position]');
  const progressBar = root.querySelector('[data-rail-progress]');
  const header = env.document.querySelector('.site-header');
  const reduced = env.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = env.matchMedia('(min-width: 1024px) and (min-height: 700px)');
  let enabled = false, travel = 0, targets = [], active = 0, frame = 0, measureFrame = 0;
  let displayedX = 0, lastTime = 0;
  const layoutListeners = new Set();
  const layout = () => ({ enabled, targets: enabled ? targets.map((target) => target * RAIL_SCROLL_SCALE) : [] });
  const publishLayout = () => layoutListeners.forEach((listener) => listener(layout()));

  const start = () => root.getBoundingClientRect().top + env.scrollY - (header?.getBoundingClientRect().height || 0);
  function render(time = 0, immediate = false) {
    frame = 0;
    if (!enabled) return;
    const target = clamp((env.scrollY - start()) / RAIL_SCROLL_SCALE, 0, travel);
    displayedX = immediate ? target : easedPosition(displayedX, target, lastTime ? time - lastTime : 16);
    lastTime = time;
    const state = railState(displayedX, 0, travel, targets);
    track.style.transform = `translate3d(${-Math.round(state.x * 1000) / 1000}px, 0, 0)`;
    progressBar.style.transform = `scaleX(${state.progress})`;
    active = state.index;
    position.textContent = `${active + 1} / ${panels.length}`;
    previous.disabled = active === 0;
    next.disabled = active === panels.length - 1;
    if (displayedX !== target) frame = env.requestAnimationFrame(render);
    else lastTime = 0;
  }
  function schedule() {
    if (enabled && !frame) frame = env.requestAnimationFrame(render);
  }
  function reset() {
    enabled = false;
    if (frame) env.cancelAnimationFrame?.(frame);
    frame = 0;
    lastTime = 0;
    root.classList.remove('is-horizontal');
    root.style.removeProperty('height');
    root.style.removeProperty('--rail-top');
    root.style.removeProperty('--rail-height');
    track.style.removeProperty('transform');
    controls.hidden = true;
  }
  function measure() {
    measureFrame = 0;
    reset();
    if (!desktop.matches || reduced.matches || panels.length < 2) { publishLayout(); return; }
    const top = header?.getBoundingClientRect().height || 0;
    const height = env.innerHeight - top;
    root.style.setProperty('--rail-top', `${top}px`);
    root.style.setProperty('--rail-height', `${height}px`);
    root.classList.add('is-horizontal');
    controls.hidden = false;
    // At zoomed/short sizes, keep readable vertical profiles instead of clipping text.
    if (panels.some((panel) => panel.scrollHeight > panel.clientHeight + 2)) { reset(); publishLayout(); return; }
    travel = Math.max(0, track.scrollWidth - rail.clientWidth);
    if (!travel) { reset(); publishLayout(); return; }
    targets = panels.map((panel) => clamp(panel.offsetLeft - panels[0].offsetLeft, 0, travel));
    root.style.height = `${height + travel * RAIL_SCROLL_SCALE}px`;
    enabled = true;
    render(0, true);
    publishLayout();
  }
  function scheduleMeasure() {
    if (!measureFrame) measureFrame = env.requestAnimationFrame(measure);
  }
  function goTo(index, behavior = 'smooth') {
    if (!enabled) return;
    const target = targets[clamp(index, 0, panels.length - 1)];
    env.scrollTo({ top: start() + target * RAIL_SCROLL_SCALE, behavior });
    if (behavior === 'instant') {
      if (frame) env.cancelAnimationFrame?.(frame);
      render(0, true);
    }
  }
  function followHash() {
    const index = panels.findIndex((panel) => `#${panel.id}` === env.location.hash);
    if (index !== -1) goTo(index, 'instant');
  }
  previous.addEventListener('click', () => goTo(active - 1));
  next.addEventListener('click', () => goTo(active + 1));
  track.addEventListener('focusin', (event) => {
    const index = panels.findIndex((panel) => panel.contains(event.target));
    if (index !== -1) goTo(index, 'instant');
  });
  env.addEventListener('scroll', schedule, { passive: true });
  env.addEventListener('resize', scheduleMeasure, { passive: true });
  env.addEventListener('hashchange', followHash);
  reduced.addEventListener('change', measure);
  desktop.addEventListener('change', measure);
  if ('ResizeObserver' in env) {
    const observer = new env.ResizeObserver(scheduleMeasure);
    if (header) observer.observe(header);
    const heading = root.querySelector('.officer-heading');
    if (heading) observer.observe(heading);
  }
  env.document.fonts?.ready.then(scheduleMeasure);
  measure();
  followHash();
  return {
    measure, goTo, render,
    onLayout(listener) {
      layoutListeners.add(listener);
      listener(layout());
      return () => layoutListeners.delete(listener);
    },
  };
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-officer-scroll]');
  if (root) {
    const officers = initOfficerRail(root);
    initSectionSnapping(root, officers);
  }
}
