(() => {
  const dialog = document.getElementById('profileModal');
  const data = document.getElementById('platform-profiles');
  if (!dialog || !data) return;
  const profiles = JSON.parse(data.textContent);
  const silhouette = 'assets/img/officers/silhouette.svg';
  document.querySelectorAll('[data-about-portrait]').forEach((image) => {
    image.addEventListener('error', () => { if (!image.src.endsWith(silhouette)) image.src = silhouette; });
    if (image.getAttribute('src') && image.complete && !image.naturalWidth) image.src = silhouette;
  });
  if (!dialog.showModal) return;
  document.querySelectorAll('[data-profile-fallback]').forEach((details) => { details.hidden = true; });
  let previousOverflow = null;
  function openProfileModal(id) {
    const profile = profiles[id];
    if (!Object.hasOwn(profiles, id)) return;
    const image = document.getElementById('profileImage');
    image.src = profile.image;
    image.alt = profile.name;
    document.getElementById('profileName').textContent = profile.name;
    document.getElementById('profileTerm').textContent = profile.isCurrent ? 'Current council officer' : 'Previous council term';
    document.getElementById('profileCurrentRole').textContent = profile.currentRole;
    document.getElementById('profileProject').textContent = profile.project;
    const history = profile.history.map((position) => {
      const item = document.createElement('li');
      item.className = position.current ? 'is-current' : '';
      const role = document.createElement('strong');
      role.textContent = position.position;
      const year = document.createElement('span');
      year.textContent = `${position.current ? 'Current · ' : ''}Academic Year ${position.year}`;
      item.append(role, year);
      return item;
    });
    document.getElementById('profileHistory').replaceChildren(...history);
    if (!dialog.open) {
      previousOverflow = document.body.style.overflow;
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    }
  }
  function closeProfileModal() { if (dialog.open) dialog.close(); }
  document.querySelectorAll('[data-profile-open]').forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', () => openProfileModal(button.dataset.profileOpen));
  });
  dialog.addEventListener('close', () => {
    if (previousOverflow !== null) document.body.style.overflow = previousOverflow;
    previousOverflow = null;
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeProfileModal();
  });
})();
