(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('[data-document-card]').forEach((card) => {
    const front = card.querySelector('.card-front');
    const back = card.querySelector('.card-back');
    const open = card.querySelector('[data-card-open]');
    const close = card.querySelector('[data-card-close]');
    card.dataset.flipReady = 'true';
    back.inert = true;
    function flip(revealed, moveFocus = true) {
      card.classList.toggle('is-flipped', revealed);
      open.setAttribute('aria-expanded', String(revealed));
      front.inert = revealed;
      back.inert = !revealed;
      if (moveFocus) (revealed ? back.querySelector('a') : open).focus({ preventScroll: true });
    }
    open.addEventListener('click', () => flip(true));
    close.addEventListener('click', () => flip(false));
    card.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse' && matchMedia('(hover: hover)').matches) flip(true, false);
    });
    card.addEventListener('pointerleave', () => {
      // Leave a keyboard-focused back face open until the visitor moves on.
      if (!back.contains(document.activeElement)) flip(false, false);
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && card.classList.contains('is-flipped')) {
        event.preventDefault(); flip(false);
      }
    });
  });

  const video = document.querySelector('[data-hero-video]');
  const videoToggle = document.querySelector('[data-video-toggle]');
  if (video && videoToggle) {
    let manualPause = false;
    let manualPlay = false;
    let visible = true;
    const saveData = window.navigator?.connection?.saveData;
    const shouldPlay = () => visible && !document.hidden && !manualPause && (manualPlay || (!reducedMotion.matches && !saveData));
    const syncButton = () => { videoToggle.textContent = video.paused ? 'Play video' : 'Pause video'; };
    const updateVideo = () => {
      if (!shouldPlay()) { video.pause(); syncButton(); return; }
      if (!video.getAttribute('src')) {
        video.src = video.dataset.src;
        video.load();
      }
      video.play()?.then(() => {
        if (!shouldPlay()) video.pause();
        syncButton();
      }).catch(syncButton);
    };
    video.muted = true;
    videoToggle.hidden = false;
    videoToggle.addEventListener('click', () => {
      manualPause = !video.paused;
      manualPlay = video.paused;
      updateVideo();
    });
    video.addEventListener('play', syncButton);
    video.addEventListener('pause', syncButton);
    video.addEventListener('error', () => {
      videoToggle.hidden = true; // The poster and event information remain available.
      manualPause = true;
    });
    document.addEventListener('visibilitychange', updateVideo);
    reducedMotion.addEventListener('change', () => {
      manualPlay = false;
      updateVideo();
    });
    if ('IntersectionObserver' in window) {
      const filmObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        updateVideo();
      }, { threshold: .05 });
      filmObserver.observe(video);
    } else updateVideo();
  }

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
