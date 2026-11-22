(() => {
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
  document.querySelectorAll('[data-file-input]').forEach((input) => input.addEventListener('change', () => {
    const summary = input.parentElement.querySelector('[data-file-summary]');
    summary.textContent = input.files.length === 1 ? input.files[0].name : input.files.length ? `${input.files.length} files selected` : 'No files selected.';
  }));
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
