(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('[data-document-card]').forEach((card) => {
    const front = card.querySelector('.card-front');
    const back = card.querySelector('.card-back');
    const open = card.querySelector('[data-card-open]');
    const close = card.querySelector('[data-card-close]');
    card.dataset.flipReady = 'true';
    back.inert = true;
    function flip(revealed) {
      card.classList.toggle('is-flipped', revealed);
      open.setAttribute('aria-expanded', String(revealed));
      front.inert = revealed;
      back.inert = !revealed;
      (revealed ? back.querySelector('a') : open).focus({ preventScroll: true });
    }
    open.addEventListener('click', () => flip(true));
    close.addEventListener('click', () => flip(false));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && card.classList.contains('is-flipped')) {
        event.preventDefault(); flip(false);
      }
    });
  });

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const reveals = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed'); observer.unobserve(entry.target);
      }
    }, { threshold: .08 });
    document.documentElement.classList.add('motion-ready');
    reveals.forEach((element) => observer.observe(element));
    reducedMotion.addEventListener('change', (event) => {
      if (event.matches) { document.documentElement.classList.remove('motion-ready'); observer.disconnect(); }
    });
  }

  const opening = document.querySelector('[data-opening-scene]');
  let frame = 0;
  function updateScene() {
    frame = 0;
    if (!opening) return;
    const height = opening.offsetHeight;
    const offset = reducedMotion.matches ? 0 : Math.max(0, Math.min(scrollY, height)) * .13;
    opening.style.setProperty('--scene-offset', `${offset}px`);
  }
  if (opening) {
    addEventListener('scroll', () => {
      if (!frame && scrollY < opening.offsetHeight + innerHeight) frame = requestAnimationFrame(updateScene);
    }, { passive: true });
    reducedMotion.addEventListener('change', updateScene);
    updateScene();
  }

  const poster = document.querySelector('#event-poster-dialog');
  document.querySelector('[data-event-poster-open]')?.addEventListener('click', () => poster?.showModal());
  poster?.addEventListener('click', (event) => {
    if (event.target === poster) {
      const bounds = poster.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) poster.close();
    }
  });
  document.querySelectorAll('.portrait-image img').forEach((photo) => {
    const markUnavailable = () => photo.closest('.portrait-image').classList.add('photo-unavailable');
    photo.addEventListener('error', markUnavailable);
    if (photo.complete && photo.naturalWidth === 0) markUnavailable();
  });
})();
