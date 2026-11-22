const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function snapDestination(points, from, to) {
  if (Math.abs(to - from) < 6) return null;
  const forward = to > from;
  const candidates = points.filter((point) => forward ? point > from + 3 : point < from - 3);
  if (!candidates.length) return null;
  return candidates.reduce((best, point) => Math.abs(point - to) < Math.abs(best - to) ? point : best);
}

export function projectedSnapPosition(from, actual, wheelDistance = 0) {
  if (!wheelDistance || Math.sign(wheelDistance) !== Math.sign(actual - from)) return actual;
  const projected = from + wheelDistance * 1.75;
  return wheelDistance > 0 ? Math.max(actual, projected) : Math.min(actual, projected);
}

export const snapEase = (progress) => progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;

// Native wheel/touch scrolling stays available. Once a gesture finishes,
// settle onto a measured stop with an explicit, slower ease-in/ease-out.
export function initSectionSnapping(root, officers, env = window) {
  if (!env.CSS?.supports('scroll-snap-type', 'y proximity')) return;
  const doc = env.document;
  const html = doc.documentElement;
  const header = doc.querySelector('.site-header');
  const reduced = env.matchMedia('(prefers-reduced-motion: reduce)');
  let stops = [];
  let currentLayout = { enabled: false, targets: [] };
  let gesture = null, timer = 0, frame = 0, animation = null;
  const cleanups = [];
  const headerHeight = () => header?.getBoundingClientRect().height || 0;

  function cancel() {
    if (timer) env.clearTimeout(timer);
    if (frame) env.cancelAnimationFrame(frame);
    timer = frame = 0;
    gesture = animation = null;
  }
  function points() {
    const max = Math.max(0, html.scrollHeight - env.innerHeight);
    const clearance = headerHeight();
    const room = Math.max(200, env.innerHeight - clearance - 40);
    const positions = [0];
    const add = (value) => positions.push(clamp(value, 0, max));
    const box = (element, margin = 0, split = true) => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const top = rect.top + env.scrollY - clearance - margin;
      add(top);
      if (split && rect.height > room) {
        const overflow = rect.height - room;
        for (let offset = room * .85; offset < overflow; offset += room * .85) add(top + offset);
        add(top + overflow);
      }
    };
    const stackedDocuments = env.matchMedia('(max-width: 680px)').matches;
    box(doc.querySelector('#official-documents'), 0, !stackedDocuments);
    if (stackedDocuments) doc.querySelectorAll('[data-document-card]').forEach((card) => box(card, 20));
    if (currentLayout.enabled) {
      const start = root.getBoundingClientRect().top + env.scrollY - clearance;
      currentLayout.targets.forEach((target) => add(start + target));
    } else {
      box(doc.querySelector('.officer-heading'), 20, false);
      root.querySelectorAll('[data-officer-section]').forEach((card) => box(card, 20));
    }
    box(doc.querySelector('.site-footer'));
    return [...new Set(positions.map((position) => Math.round(position)))].sort((a, b) => a - b);
  }
  function animate(to, gestureFrom, wheelDistance) {
    const from = env.scrollY;
    if (Math.abs(to - from) < 1) return;
    animation = { from, to, gestureFrom, wheelDistance, started: null, duration: clamp(750 + Math.abs(to - from) * .105, 750, 1050) };
    function step(time) {
      frame = 0;
      if (!animation) return;
      if (animation.started === null) animation.started = time;
      const progress = clamp((time - animation.started) / animation.duration, 0, 1);
      const top = animation.from + (animation.to - animation.from) * snapEase(progress);
      env.scrollTo({ top: progress === 1 ? animation.to : top, behavior: 'instant' });
      if (progress < 1) frame = env.requestAnimationFrame(step);
      else animation = null;
    }
    frame = env.requestAnimationFrame(step);
  }
  function settle() {
    timer = 0;
    if (!gesture || reduced.matches || doc.hidden) return;
    const from = gesture.from;
    const wheelDistance = gesture.wheelDistance;
    // A 10 ms timeout can beat the browser's first rendered scroll frame.
    // Retain the intent so that the eventual scroll event can finish it.
    if (Math.abs(env.scrollY - from) < 6) return;
    gesture = null;
    const documents = doc.querySelector('#official-documents');
    if (!documents) return;
    const boundary = documents.getBoundingClientRect().top + env.scrollY - headerHeight();
    // The video opening retains ordinary scrolling until documents are reached.
    if (Math.max(from, env.scrollY) < boundary - 80) return;
    const landing = projectedSnapPosition(from, env.scrollY, wheelDistance);
    const target = snapDestination(points(), from, landing);
    if (target !== null) animate(target, from, wheelDistance);
  }
  function schedule() {
    if (timer) env.clearTimeout(timer);
    timer = env.setTimeout(settle, 10);
  }
  function input(event) {
    if (reduced.matches || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
    if (event.target?.closest?.('dialog[open], [role="dialog"], input, textarea, select, [contenteditable="true"]')) return;
    if (event.type === 'wheel' && (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))) return;
    if (animation) {
      const direction = event.type === 'wheel' ? Math.sign(event.deltaY)
        : ['ArrowDown', 'PageDown'].includes(event.key) ? 1
        : ['ArrowUp', 'PageUp'].includes(event.key) ? -1
        : event.key === ' ' ? (event.shiftKey ? -1 : 1) : 0;
      // Small same-direction wheel tails belong to the original gesture;
      // losing its origin would make them fall below the snap threshold.
      const continuing = direction === Math.sign(animation.to - animation.from);
      const from = continuing ? animation.gestureFrom : env.scrollY;
      const wheelDistance = continuing ? animation.wheelDistance : 0;
      cancel();
      gesture = { from, wheelDistance };
    }
    if (!gesture) gesture = { from: env.scrollY, wheelDistance: 0 };
    if (event.type === 'wheel') {
      // Wheel input may be pixels, lines or pages. Count the user's input,
      // excluding the distance travelled by our own animation, so sustained
      // scrolling can carry the landing beyond the immediately adjacent card.
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? Math.max(200, env.innerHeight - headerHeight()) : 1;
      gesture.wheelDistance += event.deltaY * unit;
    }
    schedule();
  }
  function onScroll() { if (gesture && !animation) schedule(); }
  function onKey(event) {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(event.key)) input(event);
    else if (['Home', 'End', 'Tab', 'Escape'].includes(event.key)) cancel();
  }
  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  }

  function update() {
    cancel();
    stops.forEach((stop) => stop.remove());
    stops = [];
    const active = !reduced.matches;
    html.classList.toggle('section-snap-ready', active);
    html.classList.toggle('smooth-snap-ready', active);
    html.style.setProperty('--snap-header-height', `${header?.getBoundingClientRect().height || 0}px`);
    if (!active || !currentLayout.enabled) return;
    stops = currentLayout.targets.map((target) => {
      const stop = doc.createElement('span');
      stop.className = 'officer-snap-point';
      stop.setAttribute('aria-hidden', 'true');
      stop.style.top = `${target}px`;
      root.append(stop);
      return stop;
    });
  }
  const unsubscribe = officers.onLayout((layout) => {
    currentLayout = layout;
    update();
  });
  listen(reduced, 'change', update);
  listen(env, 'wheel', input, { passive: true });
  listen(env, 'touchstart', input, { passive: true });
  listen(env, 'scroll', onScroll, { passive: true });
  listen(env, 'keydown', onKey);
  listen(env, 'pointerdown', cancel, { passive: true });
  listen(doc, 'visibilitychange', () => { if (doc.hidden) cancel(); });
  return () => {
    cancel();
    unsubscribe();
    cleanups.forEach((cleanup) => cleanup());
    stops.forEach((stop) => stop.remove());
    html.classList.remove('section-snap-ready');
    html.classList.remove('smooth-snap-ready');
    html.style.removeProperty('--snap-header-height');
  };
}
