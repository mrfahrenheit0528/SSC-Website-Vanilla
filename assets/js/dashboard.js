(() => {
  const tabs = [...document.querySelectorAll('[data-workspace-tab]')];
  const panels = [...document.querySelectorAll('[data-workspace-panel]')];
  if (tabs.length && panels.length) {
    document.querySelector('[data-workspace-tabs]').setAttribute('role', 'tablist');
    function showPanel(id, updateURL = false) {
      if (!panels.some((panel) => panel.id === id)) id = panels[0].id;
      tabs.forEach((tab) => {
        const selected = tab.dataset.workspaceTab === id;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', tab.dataset.workspaceTab);
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      panels.forEach((panel) => {
        panel.hidden = panel.id !== id;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('tabindex', '0');
        panel.setAttribute('aria-labelledby', tabs.find((tab) => tab.dataset.workspaceTab === panel.id).id);
      });
      if (updateURL) window.history?.replaceState(null, '', '#' + id);
    }
    function panelFromHash() {
      const hash = window.location?.hash;
      if (hash === '#publishing-tools' || hash === '#upload-documents') return 'publishing-tools';
      if (hash === '#uploaded-documents') return 'uploaded-documents';
      return document.querySelector('[data-workspace-layout]').dataset.defaultPanel;
    }
    showPanel(panelFromHash());
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', (event) => {
        if (event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        showPanel(tab.dataset.workspaceTab, true);
      });
      tab.addEventListener('keydown', (event) => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else if (event.key === ' ') next = index;
        else return;
        event.preventDefault();
        tabs[next].focus({ preventScroll: true });
        showPanel(tabs[next].dataset.workspaceTab, true);
      });
    });
    window.addEventListener('hashchange', () => showPanel(panelFromHash()));
  }
  const rows = [...document.querySelectorAll('[data-workspace-document]')];
  const search = document.querySelector('[data-document-search]');
  const category = document.querySelector('[data-document-category]');
  const empty = document.querySelector('[data-workspace-empty]');
  const count = document.querySelector('[data-workspace-count]');
  const selectAll = document.querySelector('[data-select-all]');
  const checks = [...document.querySelectorAll('[data-document-check]')];
  const bulk = document.querySelector('[data-bulk-form]');
  function selection() {
    const visible = checks.filter((check) => !check.closest('tr').hidden);
    const selected = visible.filter((check) => check.checked);
    if (selectAll) {
      selectAll.checked = visible.length > 0 && selected.length === visible.length;
      selectAll.indeterminate = selected.length > 0 && selected.length < visible.length;
    }
    if (bulk) {
      bulk.querySelector('[data-selected-count]').textContent = `${selected.length} selected`;
      bulk.querySelector('[data-bulk-apply]').disabled = selected.length === 0;
    }
    return selected;
  }
  function filter() {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    rows.forEach((row) => {
      row.hidden = !(row.dataset.name + ' ' + row.dataset.display).toLocaleLowerCase().includes(query) || (category.value !== 'all' && row.dataset.category !== category.value);
      if (!row.hidden) visible++;
      else { const check = row.querySelector('[data-document-check]'); if (check) check.checked = false; }
    });
    empty.hidden = visible !== 0;
    count.textContent = `${visible} ${visible === 1 ? 'document' : 'documents'}`;
    selection();
  }
  if (search && category) {
    document.querySelector('[data-workspace-filters]').hidden = false;
    search.addEventListener('input', filter);
    search.addEventListener('search', filter);
    category.addEventListener('change', filter);
    filter();
  }
  if (selectAll) {
    selectAll.hidden = false;
    selectAll.addEventListener('change', () => {
      checks.forEach((check) => { if (!check.closest('tr').hidden) check.checked = selectAll.checked; });
      selection();
    });
  }
  checks.forEach((check) => check.addEventListener('change', selection));
  bulk?.addEventListener('submit', (event) => {
    const selected = selection();
    const action = bulk.querySelector('[name=bulk_action]').value;
    if (!selected.length || (action === 'delete' && !window.confirm(`Delete ${selected.length} document(s)? This cannot be undone.`))) event.preventDefault();
  });
  document.querySelectorAll('[data-confirm]').forEach((form) => form.addEventListener('submit', (event) => { if (!window.confirm(form.dataset.confirm)) event.preventDefault(); }));
  const dialog = document.getElementById('editModal');
  if (!dialog?.showModal) return;
  let previousOverflow = null;
  document.querySelectorAll('[data-edit-document]').forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', () => {
      const row = button.closest('tr');
      for (const [id, value] of Object.entries({ editId: row.dataset.id, editName: row.dataset.name, editDisplay: row.dataset.display, editCategory: row.dataset.category })) document.getElementById(id).value = value;
      if (!dialog.open) {
        previousOverflow = document.body.style.overflow;
        dialog.showModal();
        document.body.style.overflow = 'hidden';
      }
    });
  });
  dialog.addEventListener('close', () => { if (previousOverflow !== null) document.body.style.overflow = previousOverflow; previousOverflow = null; });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
})();
