(() => {
  const results = document.querySelector('[data-library-results]');
  if (!results) return;
  const dialog = document.querySelector('[data-library-qr]');
  let qrVersion = 0;
  function prepareResults() {
    results.querySelectorAll('[data-holder-portrait]').forEach((image) => {
      const fallback = () => {
        image.removeEventListener('error', fallback);
        image.src = 'assets/img/officers/silhouette.svg';
      };
      image.addEventListener('error', fallback);
      if (image.complete && !image.naturalWidth) fallback();
    });
    if (dialog?.showModal) results.querySelectorAll('[data-document-qr]').forEach((button) => { button.hidden = false; });
  }
  prepareResults();
  results.addEventListener('click', (event) => {
    const button = event.target.closest('[data-document-qr]');
    if (!button || !dialog?.showModal) return;
    const url = new URL(button.dataset.documentQr, window.location.href);
    if (url.origin !== window.location.origin) return;
    const version = ++qrVersion;
    const name = dialog.querySelector('[data-qr-name]');
    const container = dialog.querySelector('[data-qr-image]');
    const status = dialog.querySelector('[data-qr-status]');
    name.textContent = button.dataset.documentName;
    dialog.querySelector('[data-qr-link]').href = url.href;
    status.textContent = 'Loading QR code...';
    const image = document.createElement('img');
    image.alt = `QR code for ${button.dataset.documentName}`;
    image.width = image.height = 220;
    image.addEventListener('load', () => { if (version === qrVersion) status.textContent = ''; });
    image.addEventListener('error', () => {
      if (version !== qrVersion) return;
      image.hidden = true;
      status.textContent = 'The QR code could not load. You can still open the document below.';
    });
    container.replaceChildren(image);
    image.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url.href)}`;
    dialog.showModal();
  });
  dialog?.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });

  const form = document.querySelector('[data-library-search]');
  const categories = [...document.querySelectorAll('[data-library-category]')];
  const field = form.querySelector('[name=search]');
  const section = form.querySelector('[data-library-section]');
  const status = document.querySelector('[data-library-status]');
  if (!window.fetch || !window.DOMParser || !window.history?.pushState) return;
  let requestVersion = 0;
  function libraryURL(category, query, page = 1) {
    const url = new URL('documents.php', window.location.href);
    if (category !== 'all') url.searchParams.set('section', category);
    if (query.trim()) url.searchParams.set('search', query.trim());
    if (Number(page) > 1) url.searchParams.set('page', page);
    return url;
  }
  function updateControls(category, query) {
    section.value = category;
    field.value = query;
    categories.forEach((link) => {
      const selected = link.dataset.libraryCategory === category;
      link.classList.toggle('is-selected', selected);
      if (selected) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
      link.href = libraryURL(link.dataset.libraryCategory, query).href;
    });
  }
  async function navigate(url, push = true, pagination = false) {
    if (url.origin !== window.location.origin) return;
    const version = ++requestVersion;
    results.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading documents...';
    status.hidden = false;
    try {
      const response = await window.fetch(url.href, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Document request failed');
      const page = new window.DOMParser().parseFromString(await response.text(), 'text/html');
      const next = page.querySelector('[data-library-results]');
      const category = url.searchParams.get('section') || 'all';
      if (!next || next.dataset.section !== category || !categories.some((link) => link.dataset.libraryCategory === category)) throw new Error('Invalid document response');
      if (version !== requestVersion) return;
      // Clear-search links disappear during replacement; keep focus reachable.
      const restoreFocus = results.contains(document.activeElement);
      results.innerHTML = next.innerHTML;
      results.dataset.section = next.dataset.section;
      results.dataset.search = next.dataset.search;
      results.dataset.page = next.dataset.page || '1';
      updateControls(next.dataset.section, next.dataset.search);
      prepareResults();
      if (push && url.href !== window.location.href) window.history.pushState(null, '', url.href);
      if (pagination) {
        results.focus({ preventScroll: true });
        results.scrollIntoView({ block: 'start', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      } else if (restoreFocus) field.focus({ preventScroll: true });
      status.textContent = 'Documents updated.';
    } catch {
      if (version !== requestVersion) return;
      // On a failed history navigation keep the address consistent with the
      // still-visible records, rather than label them as the requested office.
      if (!push) window.history.replaceState(null, '', libraryURL(results.dataset.section, results.dataset.search, results.dataset.page).href);
      status.textContent = 'Documents could not load. Please try again; the previous results are still available.';
    } finally {
      if (version === requestVersion) results.setAttribute('aria-busy', 'false');
    }
  }
  categories.forEach((link) => link.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(libraryURL(link.dataset.libraryCategory, field.value));
  }));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    navigate(libraryURL(section.value, field.value));
  });
  results.addEventListener('click', (event) => {
    const link = event.target.closest('[data-library-link]');
    if (!link || event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(new URL(link.href, window.location.href), true, link.hasAttribute('data-library-page'));
  });
  window.addEventListener('popstate', () => navigate(new URL(window.location.href), false));
})();
