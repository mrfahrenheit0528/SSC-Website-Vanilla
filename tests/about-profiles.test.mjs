import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/js/about.js', import.meta.url), 'utf8');
function fixture({ supported = true, overflow = '', broken = false } = {}) {
  function element(extra = {}) {
    const handlers = new Map();
    return {
      children: [], handlers,
      addEventListener: (name, handler) => handlers.set(name, handler),
      emit: (name, event) => handlers.get(name)?.(event),
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; },
      ...extra,
    };
  }
  const profiles = {
    jeriel: { name: 'Jeriel Agua', image: 'assets/img/officers/jeriel.webp', isCurrent: true, currentRole: 'Sports and Cultural Committee Director · AY 2026–2027', project: 'TransFormation', history: [{ year: '2026–2027', position: 'Sports and Cultural Committee Director', current: true }, { year: '2025-2026', position: 'P.R.O.' }, { year: '2024-2025', position: 'Assistant P.R.O.' }] },
    jessil: { name: 'Jessil <Martinez>', image: 'assets/img/officers/jessil.webp', currentRole: 'Treasurer AY 2025-2026', project: 'FinTech', history: [{ year: '2025-2026', position: 'Treasurer' }] },
  };
  const portrait = element({ src: 'assets/img/officers/jeriel.webp', complete: broken, naturalWidth: broken ? 0 : 800, getAttribute() { return this.src; } });
  const profileImage = element({ src: '', getAttribute() { return this.src; } });
  const buttons = ['jeriel', 'jessil', 'missing', '__proto__'].map((id) => element({ dataset: { profileOpen: id }, hidden: true }));
  const fallbacks = [element({ hidden: false }), element({ hidden: false })];
  const body = { style: { overflow } };
  const dialog = element({ open: false, getBoundingClientRect: () => ({ left: 20, right: 600, top: 20, bottom: 600 }), close() { this.open = false; this.emit('close'); } });
  if (supported) dialog.showModal = function () { this.open = true; this.opens = (this.opens || 0) + 1; };
  const nodes = {
    profileModal: dialog, 'platform-profiles': { textContent: JSON.stringify(profiles) },
    profileImage, profileName: {}, profileTerm: {}, profileCurrentRole: {}, profileProject: {}, profileHistory: element(),
  };
  const document = {
    body, getElementById: (id) => nodes[id], createElement: () => element(),
    querySelectorAll: (selector) => selector === '[data-about-portrait]' ? [portrait, profileImage] : selector === '[data-profile-open]' ? buttons : selector === '[data-profile-fallback]' ? fallbacks : [],
  };
  vm.runInNewContext(source, { document });
  return { buttons, fallbacks, dialog, body, portrait, profileImage, nodes };
}

test('native profile buttons populate the selected developer and their complete history', () => {
  const f = fixture();
  assert.ok(f.buttons.every((button) => button.hidden === false));
  assert.ok(f.fallbacks.every((details) => details.hidden));
  f.buttons[0].emit('click');
  assert.equal(f.dialog.open, true);
  assert.equal(f.nodes.profileName.textContent, 'Jeriel Agua');
  assert.equal(f.profileImage.alt, 'Jeriel Agua');
  assert.equal(f.nodes.profileTerm.textContent, 'Current council officer');
  assert.equal(f.nodes.profileCurrentRole.textContent, 'Sports and Cultural Committee Director · AY 2026–2027');
  assert.equal(f.nodes.profileHistory.children.length, 3);
  assert.equal(f.nodes.profileHistory.children[0].className, 'is-current');
  assert.equal(f.nodes.profileHistory.children[0].children[1].textContent, 'Current · Academic Year 2026–2027');
  assert.equal(f.nodes.profileHistory.children[2].children[1].textContent, 'Academic Year 2024-2025');
  f.buttons[1].emit('click');
  assert.equal(f.nodes.profileName.textContent, 'Jessil <Martinez>');
  assert.equal(f.nodes.profileProject.textContent, 'FinTech');
  assert.equal(f.nodes.profileTerm.textContent, 'Previous council term');
  assert.equal(f.nodes.profileHistory.children.length, 1);
  assert.equal(f.dialog.opens, 1);
});

test('closing a profile restores the previous scroll setting, including after repeated opens', () => {
  const f = fixture({ overflow: 'auto' });
  f.buttons[0].emit('click');
  f.buttons[1].emit('click');
  assert.equal(f.body.style.overflow, 'hidden');
  f.dialog.close();
  assert.equal(f.body.style.overflow, 'auto');
  f.buttons[0].emit('click'); f.dialog.close();
  assert.equal(f.body.style.overflow, 'auto');
});

test('backdrop clicks close a profile while clicks within the dialog preserve it', () => {
  const f = fixture(); f.buttons[0].emit('click');
  f.dialog.emit('click', { target: f.dialog, clientX: 100, clientY: 100 });
  assert.equal(f.dialog.open, true);
  f.dialog.emit('click', { target: f.dialog, clientX: 1, clientY: 1 });
  assert.equal(f.dialog.open, false);
  assert.equal(f.body.style.overflow, '');
});

test('unknown or inherited profile IDs cannot open the modal', () => {
  const f = fixture();
  f.buttons[2].emit('click'); f.buttons[3].emit('click');
  assert.equal(f.dialog.open, false);
});

test('portrait failures use the local silhouette and unsupported browsers retain inline histories', () => {
  const f = fixture({ supported: false, broken: true });
  assert.equal(f.portrait.src, 'assets/img/officers/silhouette.svg');
  f.profileImage.emit('error');
  assert.equal(f.profileImage.src, 'assets/img/officers/silhouette.svg');
  assert.ok(f.buttons.every((button) => button.hidden));
  assert.ok(f.fallbacks.every((details) => !details.hidden));
});
