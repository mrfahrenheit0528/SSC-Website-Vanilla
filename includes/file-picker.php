<?php
function council_file_picker(string $id, string $name, string $kind, bool $multiple = false): void {
    $pdf = $kind === 'pdf';
    $label = $pdf ? 'PDF files' : 'Announcement image';
    $accept = $pdf ? '.pdf,application/pdf' : 'image/jpeg,image/png,image/gif,image/webp,image/bmp';
    $title = $pdf ? 'Choose your PDF files' : 'Choose an announcement image';
    $help = $pdf ? 'PDF files only. Multiple selection supported.' : 'JPG, PNG, GIF, WEBP or BMP. Images are center-cropped to a square.';
    $escape = static fn($value) => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    ?>
    <div class="workspace-file-field">
        <label id="<?php echo $escape($id); ?>-label" for="<?php echo $escape($id); ?>"><?php echo $label; ?></label>
        <div class="workspace-file-picker" data-file-picker data-file-kind="<?php echo $kind; ?>">
            <input id="<?php echo $escape($id); ?>" class="workspace-file-input" type="file" name="<?php echo $escape($name); ?>" accept="<?php echo $accept; ?>" <?php if ($multiple): ?>multiple<?php endif; ?> required aria-labelledby="<?php echo $escape($id); ?>-label" aria-describedby="<?php echo $escape($id); ?>-help" data-file-input>
            <label class="workspace-file-drop" for="<?php echo $escape($id); ?>" data-file-drop>
                <span class="workspace-file-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 16V3m-5 5 5-5 5 5M4 14v6h16v-6"/></svg></span>
                <span class="workspace-file-title"><?php echo $title; ?></span>
                <span class="workspace-file-hint" data-file-hint>Select <?php echo $pdf ? 'files' : 'an image'; ?> from your device.</span>
                <span class="workspace-file-browse"><?php echo $pdf ? 'Browse files' : 'Browse image'; ?></span>
            </label>
            <div class="workspace-file-selection"><p id="<?php echo $escape($id); ?>-summary" data-file-summary role="status" aria-live="polite">No files selected.</p><button type="button" data-file-clear hidden>Clear selection</button></div>
            <ul class="workspace-file-list" aria-label="Selected files" tabindex="0" data-file-list hidden></ul>
            <p class="council-field-error" role="alert" data-file-error hidden></p>
        </div>
        <p id="<?php echo $escape($id); ?>-help" class="workspace-field-help"><?php echo $help; ?></p>
    </div>
    <?php
}
