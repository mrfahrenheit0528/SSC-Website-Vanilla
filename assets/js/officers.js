(() => {
  // This page deliberately has no scroll controller or snapping behavior.
  function setupPortraits(scope = document) {
    scope.querySelectorAll('.directory-portrait img').forEach((image) => {
      const unavailable = () => image.closest('.directory-portrait').classList.add('is-unavailable');
      image.addEventListener('error', unavailable);
      if (image.complete && image.naturalWidth === 0) unavailable();
    });
  }
  setupPortraits();
  let sizeFrame = 0;
  function sizeCards() {
    sizeFrame = 0;
    const contents = [...document.querySelectorAll('.office-grid:not(.is-solo) .directory-card-content')];
    if (!contents.length) return;
    const html = document.documentElement;
    html.classList.remove('directory-sizing-ready');
    html.style.removeProperty('--directory-content-height');
    // Measure real content, including long roles/addresses, rather than crop
    // names or force a fixed height that would clip at a different font size.
    const height = Math.ceil(Math.max(...contents.map((content) => content.scrollHeight)));
    if (!height) return;
    html.style.setProperty('--directory-content-height', `${height}px`);
    html.classList.add('directory-sizing-ready');
  }
  function scheduleSizing() {
    if (sizeFrame) return;
    if (window.requestAnimationFrame) sizeFrame = window.requestAnimationFrame(sizeCards);
    else sizeCards();
  }
  window.addEventListener?.('resize', scheduleSizing, { passive: true });
  document.fonts?.ready.then(scheduleSizing);
  scheduleSizing();

  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let revealObserver = null;
  function observeReveals(scope = document) {
    if (revealObserver) scope.querySelectorAll('[data-directory-reveal]').forEach((element) => revealObserver.observe(element));
  }
  if (window.IntersectionObserver && !motion?.matches) {
    revealObserver = new window.IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver?.unobserve(entry.target);
        }
      });
    }, { threshold: .03, rootMargin: '0px 0px -24px 0px' });
    document.documentElement.classList.add('directory-motion-ready');
    observeReveals();
    motion?.addEventListener('change', (event) => {
      if (event.matches) {
        document.documentElement.classList.remove('directory-motion-ready');
        revealObserver?.disconnect();
        revealObserver = null;
      }
    });
  }
  const search = document.querySelector('[data-officer-search]');
  if (!search) return;
  let sections = [...document.querySelectorAll('[data-office-section]')];
  let cards = [...document.querySelectorAll('[data-directory-card]')];
  let empty = document.querySelector('[data-directory-empty]');
  const jump = document.querySelector('[data-office-jump]');
  const navigation = document.querySelector('[data-office-navigation]');
  navigation.hidden = false;

  function filter() {
    const query = search.value.trim().toLocaleLowerCase();
    let total = 0;
    cards.forEach((card) => {
      card.hidden = !card.dataset.searchText.toLocaleLowerCase().includes(query);
      if (!card.hidden) total++;
    });
    sections.forEach((section) => {
      const count = [...section.querySelectorAll('[data-directory-card]')].filter((card) => !card.hidden).length;
      section.hidden = count === 0;
      section.querySelector('[data-office-count]').textContent = `${count} ${count === 1 ? 'officer' : 'officers'}`;
      const option = [...jump.options].find((item) => item.value === section.id);
      if (option) option.hidden = option.disabled = section.hidden;
    });
    empty.hidden = total !== 0;
    jump.value = '';
    scheduleSizing();
  }
  const yearField = document.querySelector('[data-directory-year-field]');
  function updateSearchURL() {
    if (!window.location.href || !window.history?.replaceState || !yearField) return;
    const url = new URL(window.location.href);
    url.searchParams.set('year', yearField.value);
    if (search.value.trim()) url.searchParams.set('q', search.value.trim());
    else url.searchParams.delete('q');
    window.history.replaceState({ directoryYear: yearField.value }, '', url.href);
  }
  function onSearch() { filter(); updateSearchURL(); }
  search.addEventListener('input', onSearch);
  search.addEventListener('search', onSearch);
  document.querySelector('.directory-search')?.addEventListener('submit', (event) => { event.preventDefault(); onSearch(); });
  jump.addEventListener('change', () => {
    if (jump.value) window.location.hash = jump.value;
  });
  filter();

  const content = document.querySelector('[data-directory-content]');
  const tabs = document.querySelector('[data-directory-year-tabs]');
  const status = document.querySelector('[data-directory-year-status]');
  const yearLinks = [...document.querySelectorAll('[data-directory-year]')];
  if (!content || !tabs || !yearField || !status || !window.fetch || !window.DOMParser || !window.history?.pushState) return;

  const initialYear = yearField.value;
  const cache = new Map([[initialYear, { html: content.innerHTML, options: jump.innerHTML }]]);
  const pending = new Map();
  let requestVersion = 0;
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Academic year');
  content.setAttribute('role', 'tabpanel');
  content.setAttribute('tabindex', '0');
  function selectYear(year) {
    yearLinks.forEach((link) => {
      const selected = link.dataset.directoryYear === year;
      link.setAttribute('role', 'tab');
      link.setAttribute('aria-controls', content.id);
      link.setAttribute('aria-selected', String(selected));
      link.classList.toggle('is-selected', selected);
      link.tabIndex = selected ? 0 : -1;
      if (selected) {
        link.setAttribute('aria-current', 'page');
        content.setAttribute('aria-labelledby', link.id);
      } else link.removeAttribute('aria-current');
    });
  }
  selectYear(initialYear);

  async function loadYear(year, url) {
    if (cache.has(year)) return cache.get(year);
    if (!pending.has(year)) {
      const request = window.fetch(url.href, { credentials: 'same-origin' }).then(async (response) => {
        if (!response.ok) throw new Error('Roster request failed');
        const page = new window.DOMParser().parseFromString(await response.text(), 'text/html');
        const roster = page.querySelector('[data-directory-content]');
        const options = page.querySelector('[data-office-jump]');
        if (!roster || !options || page.querySelector('[data-directory-year-field]')?.value !== year) throw new Error('Invalid roster response');
        const snapshot = { html: roster.innerHTML, options: options.innerHTML };
        cache.set(year, snapshot);
        return snapshot;
      }).finally(() => pending.delete(year));
      pending.set(year, request);
    }
    return pending.get(year);
  }
  async function switchYear(href, pushHistory = true) {
    const url = new URL(href, window.location.href);
    const year = url.searchParams.get('year') || initialYear;
    if (url.origin !== window.location.origin || !yearLinks.some((link) => link.dataset.directoryYear === year)) return;
    if (year === yearField.value && (url.searchParams.get('q') || '') === search.value) {
      requestVersion++; // Ignore an older request if the active year was selected again.
      content.setAttribute('aria-busy', 'false');
      status.hidden = true;
      search.disabled = jump.disabled = false;
      yearLinks.forEach((link) => link.classList.remove('is-loading'));
      return;
    }
    const version = ++requestVersion;
    content.setAttribute('aria-busy', 'true');
    search.disabled = jump.disabled = true;
    status.textContent = `Loading academic year ${year}–${Number(year) + 1}…`;
    status.hidden = false;
    yearLinks.forEach((link) => link.classList.toggle('is-loading', link.dataset.directoryYear === year));
    try {
      const snapshot = await loadYear(year, url);
      if (version !== requestVersion) return;
      if (pushHistory) updateSearchURL();
      if (revealObserver) content.querySelectorAll('[data-directory-reveal]').forEach((element) => revealObserver.unobserve(element));
      content.innerHTML = snapshot.html;
      jump.innerHTML = snapshot.options;
      yearField.value = year;
      search.value = url.searchParams.get('q') || '';
      sections = [...content.querySelectorAll('[data-office-section]')];
      cards = [...content.querySelectorAll('[data-directory-card]')];
      empty = content.querySelector('[data-directory-empty]');
      setupPortraits(content);
      observeReveals(content);
      filter();
      selectYear(year);
      if (pushHistory) window.history.pushState({ directoryYear: year }, '', url.href);
      status.hidden = true;
    } catch {
      if (version === requestVersion) {
        status.textContent = 'Could not load that academic year. Select it again to retry.';
        status.hidden = false;
      }
    } finally {
      if (version === requestVersion) {
        content.setAttribute('aria-busy', 'false');
        search.disabled = jump.disabled = false;
        yearLinks.forEach((link) => link.classList.remove('is-loading'));
      }
    }
  }
  yearLinks.forEach((link, index) => {
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || (event.button !== undefined && event.button !== 0) || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      switchYear(link.href);
    });
    link.addEventListener('keydown', (event) => {
      if (event.key === ' ') {
        event.preventDefault();
        switchYear(link.href);
        return;
      }
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % yearLinks.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + yearLinks.length) % yearLinks.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = yearLinks.length - 1;
      else return;
      event.preventDefault();
      yearLinks[next].focus({ preventScroll: true });
      switchYear(yearLinks[next].href);
    });
  });
  window.addEventListener('popstate', () => switchYear(window.location.href, false));
})();
