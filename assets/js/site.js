const navigationToggle = document.querySelector('[data-navigation-toggle]');
const navigation = document.querySelector('[data-navigation]');
navigationToggle?.addEventListener('click', () => {
  const expanded = navigationToggle.getAttribute('aria-expanded') !== 'true';
  navigationToggle.setAttribute('aria-expanded', String(expanded));
  navigationToggle.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
  navigation.classList.toggle('is-open', expanded);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    navigationToggle?.setAttribute('aria-expanded', 'false');
    navigationToggle?.setAttribute('aria-label', 'Open navigation');
    navigation?.classList.remove('is-open');
    document.querySelectorAll('.theme-picker[open]').forEach((picker) => picker.removeAttribute('open'));
  }
});
document.addEventListener('click', (event) => {
  document.querySelectorAll('.theme-picker[open]').forEach((picker) => {
    if (!picker.contains(event.target)) picker.removeAttribute('open');
  });
});
