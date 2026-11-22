(() => {
  document.querySelectorAll('[data-file-picker]').forEach((picker) => {
    const input = picker.querySelector('[data-file-input]');
    const drop = picker.querySelector('[data-file-drop]');
    const summary = picker.querySelector('[data-file-summary]');
    const list = picker.querySelector('[data-file-list]');
    const clear = picker.querySelector('[data-file-clear]');
    const error = picker.querySelector('[data-file-error]');
    const pdf = picker.dataset.fileKind === 'pdf';
    const disabled = () => input.matches(':disabled');
    function sizeLabel(size = 0) {
      if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
      return size >= 1024 ? `${Math.ceil(size / 1024)} KB` : `${size} B`;
    }
    function updateSelection() {
      const files = [...input.files];
      error.hidden = true;
      summary.textContent = files.length ? `${files.length} ${files.length === 1 ? 'file' : 'files'} selected` : 'No files selected.';
      list.replaceChildren(...files.map((file) => {
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = file.name;
        const size = document.createElement('span');
        size.className = 'workspace-file-size';
        size.textContent = sizeLabel(file.size);
        item.append(name, size);
        return item;
      }));
      list.hidden = files.length === 0;
      clear.hidden = files.length === 0 || disabled();
    }
    input.addEventListener('change', updateSelection);
    clear.addEventListener('click', () => {
      if (disabled()) return;
      input.value = '';
      updateSelection();
      input.focus({ preventScroll: true });
    });
    if (!disabled()) picker.querySelector('[data-file-hint]').textContent = pdf ? 'Drag PDF files here, or browse your device.' : 'Drag an image here, or browse your device.';
    const fileDrag = (event) => [...(event.dataTransfer?.types || [])].includes('Files') || event.dataTransfer?.files?.length;
    drop.addEventListener('dragover', (event) => {
      if (!fileDrag(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = disabled() ? 'none' : 'copy';
      drop.classList.toggle('is-dragging', !disabled());
    });
    drop.addEventListener('dragleave', (event) => { if (!drop.contains(event.relatedTarget)) drop.classList.remove('is-dragging'); });
    drop.addEventListener('drop', (event) => {
      if (!fileDrag(event)) return;
      event.preventDefault();
      drop.classList.remove('is-dragging');
      if (disabled()) return;
      const files = [...event.dataTransfer.files];
      if (!files.length) return;
      const valid = files.every((file) => pdf ? /\.pdf$/i.test(file.name) : /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name));
      if (!valid || (!input.multiple && files.length > 1)) {
        error.textContent = pdf ? 'Only PDF files can be added. Your existing selection is unchanged.' : 'Choose one JPG, PNG, GIF, WEBP or BMP image. Your existing selection is unchanged.';
        error.hidden = false;
        return;
      }
      try { input.files = event.dataTransfer.files; updateSelection(); }
      catch { error.textContent = 'Please use Browse files to select your files.'; error.hidden = false; }
    });
    updateSelection();
    picker.setAttribute('data-file-ready', '');
  });
})();
