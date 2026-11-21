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
function setup() {
  const front = element(), back = element(), open = element(), close = element(), link = element(), card = element();
  back.querySelector = () => link;
  card.querySelector = (selector) => ({ '.card-front': front, '.card-back': back, '[data-card-open]': open, '[data-card-close]': close })[selector];
  const document = {
    querySelectorAll: (selector) => selector === '[data-document-card]' ? [card] : [],
    querySelector: () => null,
  };
  vm.runInNewContext(source, { document, window: {}, matchMedia: () => ({ matches: true }), addEventListener() {} });
  return { front, back, open, close, link, card };
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
