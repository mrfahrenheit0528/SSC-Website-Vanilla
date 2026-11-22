(() => {
  const toggle = document.querySelector('[data-password-toggle]');
  const field = document.getElementById('login-password');
  if (!toggle || !field) return;
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    const visible = field.type === 'password';
    field.type = visible ? 'text' : 'password';
    toggle.textContent = visible ? 'Hide' : 'Show';
    toggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    toggle.setAttribute('aria-pressed', String(visible));
  });
})();
