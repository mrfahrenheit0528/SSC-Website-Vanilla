import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/js/officers.js', import.meta.url), 'utf8');
function fixture({ contents = [], images = [], animate = false, reduced = false } = {}) {
  const classes = new Set(), properties = {}, windowEvents = new Map();
  const preference = { matches: reduced, addEventListener(name, handler) { this[name] = handler; } };
  const observed = [], retired = [];
  let observeEntries, disconnected = false;
  const search = { value: '', addEventListener(name, handler) { this[name] = handler; } };
  const cards = ['Ann President Office of the President', 'Maria Secretary Office of the President', 'Jessil Treasurer Office of the Treasurer'].map((text) => ({ hidden: true, dataset: { searchText: text }, classList: { add(name) { this[name] = true; } } }));
  const countA = {}, countB = {};
  const sections = [[cards[0], cards[1]], [cards[2]]].map((members, i) => ({
    id: i ? 'office-treasury' : 'office-presidency', hidden: false,
    querySelectorAll: () => members,
    querySelector: () => i ? countB : countA,
  }));
  const jump = {
    options: [{ value: '' }, { value: 'office-presidency' }, { value: 'office-treasury' }],
    addEventListener(name, handler) { this[name] = handler; },
  };
  const empty = {}, navigation = { hidden: true };
  const nodes = { '[data-officer-search]': search, '[data-directory-empty]': empty, '[data-office-jump]': jump, '[data-office-navigation]': navigation };
  const document = {
    documentElement: {
      classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
      style: { setProperty: (key, value) => properties[key] = value, removeProperty: (key) => delete properties[key] },
    },
    querySelector: (selector) => nodes[selector],
    querySelectorAll: (selector) => selector === '[data-office-section]' ? sections : selector === '[data-directory-card]' || selector === '[data-directory-reveal]' ? cards : selector === '.office-grid:not(.is-solo) .directory-card-content' ? contents : selector === '.directory-portrait img' ? images : [],
  };
  const window = { location: {}, addEventListener: (name, handler) => windowEvents.set(name, handler), matchMedia: () => preference };
  if (animate) window.IntersectionObserver = class {
    constructor(callback) { observeEntries = callback; }
    observe(element) { observed.push(element); }
    unobserve(element) { retired.push(element); }
    disconnect() { disconnected = true; }
  };
  vm.runInNewContext(source, { document, window });
  return { search, cards, sections, jump, empty, navigation, window, countA, countB, classes, properties, windowEvents, preference, observed, retired, reveal: () => observeEntries([{ target: cards[0], isIntersecting: true }]), disconnected: () => disconnected };
}

test('live directory search filters office sections, their members and jump options together', () => {
  const f = fixture();
  assert.equal(f.navigation.hidden, false);
  assert.equal(f.cards.filter((card) => !card.hidden).length, 3);
  f.search.value = 'secretary'; f.search.input();
  assert.deepEqual(f.cards.map((card) => card.hidden), [true, false, true]);
  assert.equal(f.sections[0].hidden, false);
  assert.equal(f.sections[1].hidden, true);
  assert.equal(f.countA.textContent, '1 officer');
  assert.equal(f.jump.options[2].disabled, true);
  assert.equal(f.cards.filter((card) => !card.hidden).length, 1);
});

test('office-name matching, empty searches and clearing restore the complete roster', () => {
  const f = fixture();
  f.search.value = '  OFFICE OF THE PRESIDENT  '; f.search.input();
  assert.equal(f.cards.filter((card) => !card.hidden).length, 2);
  f.search.value = 'missing person'; f.search.input();
  assert.equal(f.empty.hidden, false);
  assert.ok(f.sections.every((section) => section.hidden));
  f.search.value = ''; f.search.search();
  assert.ok(f.cards.every((card) => !card.hidden));
  assert.ok(f.sections.every((section) => !section.hidden));
  assert.equal(f.empty.hidden, true);
  assert.equal(f.countA.textContent, '2 officers');
  assert.equal(f.jump.options[2].disabled, false);
});

test('office navigation uses ordinary document anchors', () => {
  const f = fixture();
  f.jump.value = 'office-treasury'; f.jump.change();
  assert.equal(f.window.location.hash, 'office-treasury');
});

test('shared card sizing uses the tallest content and recalculates when the viewport changes', () => {
  const contents = [{ scrollHeight: 310 }, { scrollHeight: 430 }, { scrollHeight: 390 }];
  const f = fixture({ contents });
  assert.equal(f.properties['--directory-content-height'], '430px');
  assert.equal(f.classes.has('directory-sizing-ready'), true);
  contents[0].scrollHeight = 510;
  f.windowEvents.get('resize')();
  assert.equal(f.properties['--directory-content-height'], '510px');
});

test('failed and already-broken images reveal the silhouette state', () => {
  const makeImage = (complete) => {
    const classes = new Set(), handlers = new Map();
    return { complete, naturalWidth: 0, addEventListener: (name, handler) => handlers.set(name, handler), closest: () => ({ classList: { add: (name) => classes.add(name) } }), classes, handlers };
  };
  const cached = makeImage(true), loading = makeImage(false);
  fixture({ images: [cached, loading] });
  assert.equal(cached.classes.has('is-unavailable'), true);
  assert.equal(loading.classes.has('is-unavailable'), false);
  loading.handlers.get('error')();
  assert.equal(loading.classes.has('is-unavailable'), true);
});

test('entry animations reveal visible cards and respect reduced-motion changes', () => {
  const f = fixture({ animate: true });
  assert.equal(f.classes.has('directory-motion-ready'), true);
  assert.equal(f.observed.length, 3);
  f.reveal();
  assert.equal(f.cards[0].classList['is-revealed'], true);
  assert.equal(f.retired[0], f.cards[0]);
  f.preference.matches = true; f.preference.change({ matches: true });
  assert.equal(f.classes.has('directory-motion-ready'), false);
  assert.equal(f.disconnected(), true);
  assert.equal(fixture({ animate: true, reduced: true }).classes.has('directory-motion-ready'), false);
});

// Exercise the asynchronous controller with independently resolved requests,
// replacing roster nodes just as the real DOM does when innerHTML changes.
function yearFixture() {
  function element(extra = {}) {
    const classes = new Set();
    return {
      attributes: {}, handlers: {},
      classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }, contains: (name) => classes.has(name) },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
      addEventListener(name, handler) { this.handlers[name] = handler; },
      focus() { this.focused = true; },
      ...extra,
    };
  }
  const rosters = {
    '2024': ['Legacy President', 'Legacy Secretary'],
    '2025': ['Previous President', 'Previous Treasurer'],
    '2026': ['Current President', 'Current Secretary', 'Current Treasurer'],
  };
  let current, renderedYear = '2026';
  function render(year) {
    renderedYear = year;
    const cards = rosters[year].map((name) => element({ dataset: { searchText: name } }));
    const sections = cards.map((card, index) => ({
      id: `office-${index}`, count: {},
      querySelectorAll: () => [card], querySelector() { return this.count; },
    }));
    current = { cards, sections, empty: {} };
  }
  render('2026');
  const search = element({ value: '' }), yearField = { value: '2026' };
  const tabs = element(), status = element({ hidden: true }), form = element();
  const content = element({
    id: 'directory-roster-panel',
    querySelectorAll(selector) { return selector === '[data-directory-card]' ? current.cards : selector === '[data-office-section]' ? current.sections : []; },
    querySelector: () => current.empty,
  });
  Object.defineProperty(content, 'innerHTML', { get: () => renderedYear, set: render });
  const jump = element({ value: '' });
  Object.defineProperty(jump, 'innerHTML', { get: () => renderedYear, set(year) { jump.options = [{ value: '' }, ...rosters[year].map((_, index) => ({ value: `office-${index}` }))]; } });
  jump.innerHTML = '2026';
  const yearLinks = Object.keys(rosters).map((year) => element({ id: `directory-year-${year}`, dataset: { directoryYear: year }, href: `http://site.test/officers.php?year=${year}` }));
  const windowEvents = new Map(), requests = [], pushes = [], replaces = [];
  const location = { href: 'http://site.test/officers.php', origin: 'http://site.test' };
  const window = {
    location, addEventListener: (name, handler) => windowEvents.set(name, handler),
    history: {
      pushState(state, title, href) { pushes.push(href); location.href = href; },
      replaceState(state, title, href) { replaces.push(href); location.href = href; },
    },
    fetch(url, options) {
      return new Promise((resolve, reject) => requests.push({ url, options, resolve: (year) => resolve({ ok: true, text: async () => year }), reject }));
    },
    DOMParser: class {
      parseFromString(year) {
        return { querySelector: (selector) => selector === '[data-directory-year-field]' ? { value: year } : { innerHTML: year } };
      }
    },
  };
  const nodes = {
    '[data-officer-search]': search, '[data-directory-year-field]': yearField,
    '[data-office-jump]': jump, '[data-office-navigation]': {},
    '[data-directory-content]': content, '[data-directory-year-tabs]': tabs,
    '[data-directory-year-status]': status, '.directory-search': form,
  };
  const document = {
    documentElement: { classList: element().classList, style: { removeProperty() {}, setProperty() {} } },
    querySelector: (selector) => selector === '[data-directory-empty]' ? current.empty : nodes[selector],
    querySelectorAll: (selector) => selector === '[data-directory-year]' ? yearLinks : content.querySelectorAll(selector),
  };
  vm.runInNewContext(source, { document, window, URL });
  function click(year, extra = {}) {
    const event = { button: 0, prevented: false, preventDefault() { this.prevented = true; }, ...extra };
    yearLinks.find((link) => link.dataset.directoryYear === year).handlers.click(event);
    return event;
  }
  return { search, yearField, yearLinks, content, jump, status, form, window, windowEvents, requests, pushes, replaces, click, current: () => current };
}
const settle = () => new Promise(setImmediate);

test('year tabs replace only the roster, reuse cached years and keep filters working', async () => {
  const f = yearFixture();
  f.search.value = 'Secretary'; f.search.handlers.input();
  assert.equal(f.click('2025').prevented, true);
  assert.equal(f.content.attributes['aria-busy'], 'true');
  assert.equal(f.search.disabled, true);
  assert.equal(f.requests[0].options.credentials, 'same-origin');
  f.requests[0].resolve('2025'); await settle();
  assert.equal(f.content.innerHTML, '2025');
  assert.equal(f.yearField.value, '2025');
  assert.equal(f.search.value, '');
  assert.equal(f.search.disabled, false);
  assert.equal(f.status.hidden, true);
  assert.equal(f.yearLinks[1].attributes['aria-selected'], 'true');
  assert.equal(f.yearLinks[2].attributes['aria-selected'], 'false');
  assert.equal(f.content.attributes['aria-labelledby'], 'directory-year-2025');
  assert.match(f.replaces.at(-1), /year=2026&q=Secretary/);
  assert.match(f.pushes[0], /year=2025/);
  f.search.value = 'Treasurer'; f.search.handlers.input();
  assert.deepEqual(f.current().cards.map((card) => card.hidden), [true, false]);
  assert.equal(f.jump.options[1].disabled, true);
  f.jump.value = 'office-1'; f.jump.handlers.change();
  assert.equal(f.window.location.hash, 'office-1');
  f.click('2026'); await settle();
  assert.equal(f.content.innerHTML, '2026');
  assert.equal(f.requests.length, 1);
  assert.equal(f.current().cards.length, 3);
  assert.ok(f.current().cards.every((card) => !card.hidden));
});

test('rapid year switches cannot let an older response overwrite the last selected year', async () => {
  const f = yearFixture();
  f.click('2024'); f.click('2025'); f.click('2025');
  assert.equal(f.requests.length, 2); // Share an in-flight request for the same year.
  f.requests[1].resolve('2025'); await settle();
  f.requests[0].resolve('2024'); await settle();
  assert.equal(f.content.innerHTML, '2025');
  assert.equal(f.yearField.value, '2025');
  assert.equal(f.pushes.length, 1);
  assert.equal(f.search.disabled, false);
});

test('selecting the current cached year cancels a pending switch', async () => {
  const f = yearFixture();
  f.click('2024'); f.click('2026'); await settle();
  assert.equal(f.content.innerHTML, '2026');
  assert.equal(f.content.attributes['aria-busy'], 'false');
  f.requests[0].resolve('2024'); await settle();
  assert.equal(f.content.innerHTML, '2026');
  assert.equal(f.status.hidden, true);
  assert.equal(f.pushes.length, 0);
});

test('Back and Forward restore cached rosters and their search without adding history entries', async () => {
  const f = yearFixture();
  f.search.value = 'Secretary'; f.search.handlers.input();
  const firstURL = f.window.location.href;
  f.click('2025'); f.requests[0].resolve('2025'); await settle();
  f.search.value = 'Treasurer'; f.search.handlers.input();
  const secondURL = f.window.location.href;
  f.window.location.href = firstURL; f.windowEvents.get('popstate')(); await settle();
  assert.equal(f.yearField.value, '2026');
  assert.equal(f.search.value, 'Secretary');
  assert.deepEqual(f.current().cards.map((card) => card.hidden), [true, false, true]);
  f.window.location.href = secondURL; f.windowEvents.get('popstate')(); await settle();
  assert.equal(f.yearField.value, '2025');
  assert.equal(f.search.value, 'Treasurer');
  assert.equal(f.requests.length, 1);
  assert.equal(f.pushes.length, 1);
});

test('a failed or invalid response leaves the old roster usable and allows retry', async () => {
  const f = yearFixture();
  f.click('2024'); f.requests[0].reject(new Error('offline')); await settle();
  assert.equal(f.yearField.value, '2026');
  assert.equal(f.content.innerHTML, '2026');
  assert.equal(f.status.hidden, false);
  assert.match(f.status.textContent, /retry/);
  assert.equal(f.search.disabled, false);
  assert.equal(f.jump.disabled, false);
  assert.equal(f.pushes.length, 0);
  f.click('2024'); f.requests[1].resolve('2025'); await settle();
  assert.equal(f.content.innerHTML, '2026'); // Reject an unexpected year in a server response.
  f.click('2024'); f.requests[2].resolve('2024'); await settle();
  assert.equal(f.content.innerHTML, '2024');
  assert.equal(f.status.hidden, true);
});

test('tabs support keyboard navigation while modified clicks keep native link behavior', async () => {
  const f = yearFixture();
  assert.equal(f.click('2025', { ctrlKey: true }).prevented, false);
  assert.equal(f.click('2025', { button: 1 }).prevented, false);
  assert.equal(f.requests.length, 0);
  const event = { key: 'ArrowLeft', preventDefault() { this.prevented = true; } };
  f.yearLinks[2].handlers.keydown(event);
  assert.equal(event.prevented, true);
  assert.equal(f.yearLinks[1].focused, true);
  f.requests[0].resolve('2025'); await settle();
  assert.equal(f.yearField.value, '2025');
  f.yearLinks[2].handlers.keydown({ key: ' ', preventDefault() {} }); await settle();
  assert.equal(f.yearField.value, '2026');
  let prevented = false;
  f.form.handlers.submit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
});
