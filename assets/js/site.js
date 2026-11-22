(() => {
  const toggle = document.querySelector('[data-navigation-toggle]');
  const navigation = document.querySelector('[data-navigation]');
  if (!toggle || !navigation) return;
  const mobile = window.matchMedia('(max-width: 930px)');
  function setOpen(open, focusToggle = false) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    navigation.classList.toggle('is-open', open);
    navigation.inert = mobile.matches && !open;
    if (focusToggle) toggle.focus({ preventScroll: true });
  }
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
  });
  document.addEventListener('pointerdown', (event) => {
    if (mobile.matches && !navigation.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
  });
  navigation.addEventListener('click', (event) => {
    if (mobile.matches && event.target.closest('a')) setOpen(false);
  });
  mobile.addEventListener('change', () => setOpen(false, mobile.matches && navigation.contains(document.activeElement)));
  setOpen(false);
})();
