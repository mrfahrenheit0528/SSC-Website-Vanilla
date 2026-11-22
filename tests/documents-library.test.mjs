import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/js/documents.js', import.meta.url), 'utf8');
const settle = () => new Promise(setImmediate);
function fixture({ enhanced = true, brokenPortrait = false, savedView = 'grid', blockedStorage = false, mobile = false } = {}) {
  function element(extra = {}) {
    const classes = new Set(), handlers = new Map();
    return {
      attributes: {}, handlers,
      addEventListener(name, handler) { if (!handlers.has(name)) handlers.set(name, []); handlers.get(name).push(handler); },
      removeEventListener(name, handler) { handlers.set(name, handlers.get(name).filter((item) => item !== handler)); },
      emit(name, event) { handlers.get(name)?.forEach((handler) => handler(event)); },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
      classList: { toggle(name, active) { if (active) classes.add(name); else classes.delete(name); }, contains: (name) => classes.has(name) },
      focus() { this.focused = true; }, ...extra,
    };
  }
  const field = element({ value: '' }), section = { value: 'all' }, status = { hidden: true };
  const portrait = element({ complete: brokenPortrait, naturalWidth: brokenPortrait ? 0 : 800 });
  const qr = element({ hidden: true, dataset: { documentQr: "uploads/Council%27s%20budget%20%231.pdf?v=7", documentName: "Council's <budget> #1.pdf" } });
  const viewControls = { hidden: true };
  const viewButtons = ['list', 'grid'].map((view) => element({ dataset: { libraryView: view } }));
  const storage = { value: savedView, getItem() { return this.value; }, setItem(key, value) { this.value = value; } };
  const results = element({
    innerHTML: 'initial', dataset: { section: 'all', search: '', page: '1' },
    scrollIntoView(options) { this.scrolled = options; },
    contains: (node) => node?.inResults === true,
    querySelector: (selector) => selector === '[data-library-view-controls]' ? viewControls : null,
    querySelectorAll: (selector) => selector === '[data-document-qr]' ? [qr] : selector === '[data-holder-portrait]' ? [portrait] : selector === '[data-library-view]' ? viewButtons : [],
  });
  const fields = { '[data-qr-name]': {}, '[data-qr-status]': {}, '[data-qr-link]': {}, '[data-qr-image]': { replaceChildren(image) { this.image = image; } } };
  const dialog = element({
    querySelector: (selector) => fields[selector], showModal() { this.open = true; }, close() { this.open = false; },
    getBoundingClientRect: () => ({ left: 10, right: 400, top: 20, bottom: 500 }),
  });
  const form = element({ querySelector: (selector) => selector === '[name=search]' ? field : section });
  const categories = ['all', 'treasurer', 'legislative', 'secretary'].map((category) => element({ dataset: { libraryCategory: category } }));
  const requests = [], pushes = [], replaces = [], images = [], windowEvents = new Map();
  const location = { href: 'http://site.test/subdir/documents.php', origin: 'http://site.test' };
  const document = {
    activeElement: null,
    querySelector: (selector) => ({ '[data-library-results]': results, '[data-library-qr]': dialog, '[data-library-search]': form, '[data-library-status]': status })[selector],
    querySelectorAll: () => categories,
    createElement() { const image = element(); images.push(image); return image; },
  };
  const compact = element({ matches: mobile });
  const window = { location, addEventListener: (name, handler) => windowEvents.set(name, handler), matchMedia: (query) => query.includes('max-width') ? compact : { matches: false } };
  if (blockedStorage) Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  else window.localStorage = storage;
  if (enhanced) Object.assign(window, {
    history: {
      pushState(state, title, url) { pushes.push(url); location.href = url; },
      replaceState(state, title, url) { replaces.push(url); location.href = url; },
    },
    fetch(url) { return new Promise((resolve, reject) => requests.push({ url, reject, resolve(section, search = '', ok = true, page = '1') { resolve({ ok, text: async () => JSON.stringify({ section, search, page, html: `${section}:${search}` }) }); } })); },
    DOMParser: class { parseFromString(text) { const page = JSON.parse(text); return { querySelector: () => ({ dataset: page, innerHTML: page.html }) }; } },
  });
  vm.runInNewContext(source, { document, window, URL });
  const event = (target, extra = {}) => ({ target, button: 0, preventDefault() { this.prevented = true; }, ...extra });
  const click = (category, extra) => { const e = event(null, extra); categories.find((link) => link.dataset.libraryCategory === category).emit('click', e); return e; };
  const openQR = () => results.emit('click', event({ closest: (selector) => selector === '[data-document-qr]' ? qr : null }));
  const chooseView = (view) => results.emit('click', event({ closest: (selector) => selector === '[data-library-view]' ? viewButtons.find((button) => button.dataset.libraryView === view) : null }));
  return { results, dialog, fields, field, section, status, portrait, qr, requests, pushes, replaces, images, window, document, categories, windowEvents, form, event, click, openQR, chooseView, viewControls, viewButtons, storage, compact };
}

test('category changes load in place with the typed search and update selected links', async () => {
  const f = fixture();
  f.field.value = 'meeting minutes';
  assert.equal(f.click('secretary').prevented, true);
  assert.match(f.requests[0].url, /section=secretary&search=meeting\+minutes/);
  assert.equal(f.results.attributes['aria-busy'], 'true');
  f.requests[0].resolve('secretary', 'meeting minutes'); await settle();
  assert.equal(f.results.innerHTML, 'secretary:meeting minutes');
  assert.equal(f.section.value, 'secretary');
  assert.equal(f.categories[3].attributes['aria-current'], 'page');
  assert.equal(f.categories[3].classList.contains('is-selected'), true);
  assert.match(f.categories[0].href, /documents.php\?search=meeting\+minutes/);
  assert.equal(f.pushes.length, 1);
  assert.equal(f.results.attributes['aria-busy'], 'false');
});

test('only the newest search or category request can replace the library', async () => {
  const f = fixture();
  f.click('treasurer'); f.click('legislative');
  f.requests[1].resolve('legislative'); await settle();
  f.requests[0].resolve('treasurer'); await settle();
  assert.equal(f.section.value, 'legislative');
  assert.equal(f.results.innerHTML, 'legislative:');
  assert.equal(f.pushes.length, 1);
  f.field.value = 'resolution';
  const event = f.event(); f.form.emit('submit', event);
  assert.equal(event.prevented, true);
  f.requests[2].resolve('legislative', 'resolution'); await settle();
  assert.equal(f.field.value, 'resolution');
});

test('failed and unexpected responses preserve usable records and retry works', async () => {
  const f = fixture();
  f.click('treasurer'); f.requests[0].reject(new Error('offline')); await settle();
  assert.equal(f.results.innerHTML, 'initial');
  assert.equal(f.section.value, 'all');
  assert.equal(f.pushes.length, 0);
  assert.match(f.status.textContent, /try again/);
  assert.equal(f.results.attributes['aria-busy'], 'false');
  f.click('treasurer'); f.requests[1].resolve('secretary'); await settle();
  assert.equal(f.results.innerHTML, 'initial');
  f.click('treasurer'); f.requests[2].resolve('treasurer'); await settle();
  assert.equal(f.section.value, 'treasurer');
});

test('Back restores results and failed Back navigation restores the visible URL', async () => {
  const f = fixture();
  f.click('secretary'); f.requests[0].resolve('secretary'); await settle();
  f.window.location.href = 'http://site.test/subdir/documents.php?section=treasurer&search=budget';
  f.windowEvents.get('popstate')(); f.requests[1].resolve('treasurer', 'budget'); await settle();
  assert.equal(f.section.value, 'treasurer');
  assert.equal(f.field.value, 'budget');
  assert.equal(f.pushes.length, 1);
  f.window.location.href = 'http://site.test/subdir/documents.php';
  f.windowEvents.get('popstate')(); f.requests[2].reject(new Error('offline')); await settle();
  assert.match(f.window.location.href, /section=treasurer&search=budget/);
});

test('clear-search links use delegation and move focus out of replaced content', async () => {
  const f = fixture();
  const link = { href: 'http://site.test/subdir/documents.php?section=secretary', hasAttribute: () => false };
  const e = f.event({ closest: (selector) => selector === '[data-library-link]' ? link : null });
  f.document.activeElement = { inResults: true };
  f.results.emit('click', e);
  assert.equal(e.prevented, true);
  f.requests[0].resolve('secretary'); await settle();
  assert.equal(f.field.focused, true);
  assert.equal(f.field.value, '');
});

test('modified clicks and browsers without fetch retain ordinary navigation', () => {
  const f = fixture();
  assert.equal(f.click('secretary', { ctrlKey: true }).prevented, undefined);
  assert.equal(f.click('secretary', { button: 1 }).prevented, undefined);
  assert.equal(f.requests.length, 0);
  const basic = fixture({ enhanced: false });
  assert.equal(basic.categories[0].handlers.has('click'), false);
  assert.equal(basic.form.handlers.has('submit'), false);
});

test('pagination retains its page, returns focus to results and resets when changing category', async () => {
  const f = fixture();
  const link = { href: 'http://site.test/subdir/documents.php?section=secretary&search=minutes&page=2', hasAttribute: () => true };
  const event = f.event({ closest: (selector) => selector === '[data-library-link]' ? link : null });
  f.results.emit('click', event);
  f.requests[0].resolve('secretary', 'minutes', true, '2'); await settle();
  assert.equal(f.results.dataset.page, '2');
  assert.equal(f.results.focused, true);
  assert.equal(f.results.scrolled.block, 'start');
  assert.match(f.window.location.href, /page=2/);
  f.click('treasurer');
  assert.equal(new URL(f.requests[1].url).searchParams.has('page'), false);
  f.requests[1].resolve('treasurer', 'minutes'); await settle();
  assert.equal(f.results.dataset.page, '1');
});

test('QR sharing keeps encoded filenames, inserts titles as text and handles provider failure', () => {
  const f = fixture();
  assert.equal(f.qr.hidden, false);
  f.openQR();
  assert.equal(f.dialog.open, true);
  assert.equal(f.fields['[data-qr-name]'].textContent, "Council's <budget> #1.pdf");
  assert.equal(f.fields['[data-qr-link]'].href, 'http://site.test/subdir/uploads/Council%27s%20budget%20%231.pdf?v=7');
  assert.match(f.images[0].src, /api\.qrserver\.com/);
  f.images[0].emit('error');
  assert.match(f.fields['[data-qr-status]'].textContent, /still open the document/);
  assert.equal(f.images[0].hidden, true);
  f.dialog.emit('click', { target: f.dialog, clientX: 1, clientY: 1 });
  assert.equal(f.dialog.open, false);
});

test('an older QR image cannot change the newly selected document status', () => {
  const f = fixture(); f.openQR();
  f.qr.dataset.documentName = 'Next file.pdf'; f.openQR();
  f.images[0].emit('error');
  assert.equal(f.fields['[data-qr-status]'].textContent, 'Loading QR code...');
  f.images[1].emit('load');
  assert.equal(f.fields['[data-qr-status]'].textContent, '');
});

test('broken office-holder portraits fall back to the local silhouette', () => {
  const f = fixture({ brokenPortrait: true });
  assert.equal(f.portrait.src, 'assets/img/officers/silhouette.svg');
  assert.equal(f.portrait.handlers.get('error').length, 0);
});

test('list and grid buttons change the layout, accessible state and saved preference', () => {
  const f = fixture();
  assert.equal(f.viewControls.hidden, false);
  assert.equal(f.results.dataset.view, 'grid');
  f.chooseView('list');
  assert.equal(f.results.dataset.view, 'list');
  assert.deepEqual(f.viewButtons.map((button) => button.attributes['aria-pressed']), ['true', 'false']);
  assert.equal(f.storage.value, 'list');
  f.chooseView('grid');
  assert.equal(f.results.dataset.view, 'grid');
  assert.deepEqual(f.viewButtons.map((button) => button.attributes['aria-pressed']), ['false', 'true']);
});

test('the saved view survives category changes and initializes replacement buttons', async () => {
  const f = fixture({ savedView: 'list' });
  assert.equal(f.results.dataset.view, 'list');
  f.click('treasurer');
  // The server renders replacement controls with grid selected by default.
  f.viewButtons[0].attributes['aria-pressed'] = 'false';
  f.viewButtons[1].attributes['aria-pressed'] = 'true';
  f.requests[0].resolve('treasurer'); await settle();
  assert.equal(f.results.dataset.view, 'list');
  assert.deepEqual(f.viewButtons.map((button) => button.attributes['aria-pressed']), ['true', 'false']);
  assert.equal(f.requests.length, 1);
});

test('view switching works when storage or asynchronous navigation is unavailable', () => {
  const f = fixture({ enhanced: false, blockedStorage: true });
  f.chooseView('list');
  assert.equal(f.results.dataset.view, 'list');
  assert.equal(fixture({ savedView: 'invalid' }).results.dataset.view, 'grid');
});

test('mobile stays in list view across filtering without overwriting the desktop preference', async () => {
  const f = fixture({ mobile: true, savedView: 'grid' });
  assert.equal(f.results.dataset.view, 'list');
  assert.equal(f.viewControls.hidden, true);
  assert.deepEqual(f.viewButtons.map((button) => button.attributes['aria-pressed']), ['true', 'false']);
  f.chooseView('grid');
  assert.equal(f.results.dataset.view, 'list');
  assert.equal(f.storage.value, 'grid');
  f.click('treasurer');
  f.viewControls.hidden = false;
  f.requests[0].resolve('treasurer'); await settle();
  assert.equal(f.results.dataset.view, 'list');
  assert.equal(f.viewControls.hidden, true);
  f.compact.matches = false; f.compact.emit('change');
  assert.equal(f.results.dataset.view, 'grid');
  assert.equal(f.viewControls.hidden, false);
});

test('resizing temporarily locks the list and restores the last desktop selection', () => {
  const f = fixture();
  f.chooseView('list');
  f.compact.matches = true; f.compact.emit('change');
  f.chooseView('grid');
  assert.equal(f.viewControls.hidden, true);
  assert.equal(f.storage.value, 'list');
  f.compact.matches = false; f.compact.emit('change');
  assert.equal(f.results.dataset.view, 'list');
  assert.equal(f.viewControls.hidden, false);
  f.chooseView('grid');
  assert.equal(f.results.dataset.view, 'grid');
});
