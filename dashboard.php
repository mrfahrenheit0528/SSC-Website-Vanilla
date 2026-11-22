<?php
session_start();
if (($_SESSION['loggedin'] ?? false) !== true) { header('Location: login.php'); exit; }
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/form-security.php';
require_once __DIR__ . '/includes/document-storage.php';
require_once __DIR__ . '/includes/theme.php';
$is_admin = ($_SESSION['role'] ?? '') === 'admin';
$event_announcements_paused = $site_theme === 'siklab';
$section_names = ['treasurer' => 'Treasurer Files', 'legislative' => 'Legislative Files', 'secretary' => 'Secretary Files'];
$escape = static fn($value) => htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$text = static fn($key) => is_string($_POST[$key] ?? null) ? trim($_POST[$key]) : '';
$upload_err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$is_admin || !council_valid_csrf()) {
        http_response_code(403);
        $upload_err = !$is_admin ? 'Only council administrators can change records.' : 'Your session expired. Refresh the page and try again.';
    } else try {
        if ($event_announcements_paused && (isset($_POST['upload_event_photo']) || isset($_POST['remove_event_photo']))) {
            http_response_code(403);
            throw new RuntimeException('Event announcements are paused while the SIKLAB theme is active.');
        }
        if (isset($_POST['upload'])) {
            $category = $text('section');
            if (!isset($section_names[$category])) throw new RuntimeException('Choose a document category.');
            $display = $text('display_name') ?: $_SESSION['username'];
            if (strlen($display) > 255) throw new RuntimeException('Use a shorter display name.');
            if (!is_array($_FILES['files']['name'] ?? null)) throw new RuntimeException('Select one or more PDF files.');
            if (!is_dir(__DIR__ . '/uploads')) mkdir(__DIR__ . '/uploads', 0755, true);
            $uploaded_count = 0; $errors = [];
            foreach ($_FILES['files']['name'] as $key => $raw_name) {
                $name = basename(str_replace('\\', '/', $raw_name));
                $temporary = $_FILES['files']['tmp_name'][$key];
                if ($_FILES['files']['error'][$key] !== UPLOAD_ERR_OK) { $errors[] = $name . ': upload failed. Check the file size.'; continue; }
                $mime = (new finfo(FILEINFO_MIME_TYPE))->file($temporary);
                if (strlen($name) > 255 || strtolower(pathinfo($name, PATHINFO_EXTENSION)) !== 'pdf' || !in_array($mime, ['application/pdf', 'application/x-pdf'], true) || file_get_contents($temporary, false, null, 0, 5) !== '%PDF-') { $errors[] = $name . ': select a valid PDF.'; continue; }
                $path = 'uploads/' . bin2hex(random_bytes(12)) . '.pdf';
                if (!move_uploaded_file($temporary, __DIR__ . '/' . $path)) { $errors[] = $name . ': could not save the file.'; continue; }
                try {
                    $stmt = $conn->prepare('INSERT INTO documents (title,original_name,file_path,category,uploaded_by,display_name,created_at) VALUES (?,?,?,?,?,?,NOW())');
                    $stmt->bind_param('ssssis', $name, $name, $path, $category, $_SESSION['id'], $display);
                    $stmt->execute(); $stmt->close(); $uploaded_count++;
                } catch (Throwable $error) { @unlink(__DIR__ . '/' . $path); $errors[] = $name . ': could not save the record.'; }
            }
            if ($errors) $_SESSION['workspace_error'] = implode(' ', $errors);
            if (!$uploaded_count) throw new RuntimeException($errors ? implode(' ', $errors) : 'Select one or more PDF files.');
            header('Location: dashboard.php?upload=success&count=' . $uploaded_count); exit;
        } elseif (isset($_POST['edit_doc'])) {
            $id = (int)$text('edit_id'); $name = $text('edit_name'); $display = $text('edit_display'); $category = $text('edit_category');
            if ($id < 1 || $name === '' || strlen($name) > 255 || strlen($display) > 255 || !isset($section_names[$category])) throw new RuntimeException('Enter a file name and valid category. Names must be 255 characters or fewer.');
            $stmt = $conn->prepare('UPDATE documents SET original_name=?,display_name=?,category=? WHERE id=?');
            $stmt->bind_param('sssi', $name, $display, $category, $id); $stmt->execute(); $stmt->close();
            header('Location: dashboard.php?edit=success'); exit;
        } elseif (isset($_POST['bulk_action'])) {
            $action = $text('bulk_action');
            $ids = array_values(array_unique(array_map('intval', array_filter((array)($_POST['doc_ids'] ?? []), static fn($id) => is_scalar($id) && ctype_digit((string)$id) && (int)$id > 0))));
            if (!$ids || count($ids) > 1000) throw new RuntimeException('Select between 1 and 1,000 documents.');
            if ($action === 'delete') council_delete_documents($conn, $ids);
            elseif (isset($section_names[$action])) {
                $marks = implode(',', array_fill(0, count($ids), '?'));
                $stmt = $conn->prepare("UPDATE documents SET category=? WHERE id IN ($marks)");
                $stmt->bind_param('s' . str_repeat('i', count($ids)), $action, ...$ids); $stmt->execute(); $stmt->close();
            } else throw new RuntimeException('Choose a bulk action.');
            header('Location: dashboard.php?bulk=success'); exit;
        } elseif (isset($_POST['upload_event_photo'])) {
            $photo = $_FILES['event_photo'] ?? null;
            if (!$photo || $photo['error'] !== UPLOAD_ERR_OK || $photo['size'] > 10 * 1024 * 1024) throw new RuntimeException('Select an image within the server upload limit, up to 10 MB.');
            $dimensions = @getimagesize($photo['tmp_name']);
            if (!$dimensions || !in_array($dimensions['mime'], ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'], true) || $dimensions[0] * $dimensions[1] > 24000000) throw new RuntimeException('Use a JPG, PNG, GIF, WEBP or BMP image up to 24 megapixels.');
            $source = @imagecreatefromstring(file_get_contents($photo['tmp_name']));
            if (!$source) throw new RuntimeException('That image could not be processed. Try another image.');
            $side = min(imagesx($source), imagesy($source)); $image = imagecreatetruecolor(1080, 1080);
            imagefill($image, 0, 0, imagecolorallocate($image, 255, 255, 255));
            imagecopyresampled($image, $source, 0, 0, (int)((imagesx($source) - $side) / 2), (int)((imagesy($source) - $side) / 2), 1080, 1080, $side, $side); imagedestroy($source);
            if (!is_dir(__DIR__ . '/uploads/events')) mkdir(__DIR__ . '/uploads/events', 0755, true);
            $path = 'uploads/events/event_banner_' . bin2hex(random_bytes(12)) . '.jpg';
            $saved = imagejpeg($image, __DIR__ . '/' . $path, 85); imagedestroy($image);
            if (!$saved) throw new RuntimeException('The image could not be saved. Please try again.');
            $old = $conn->query("SELECT setting_value FROM site_settings WHERE setting_key='event_photo'")->fetch_assoc();
            try {
                $stmt = $conn->prepare("INSERT INTO site_settings (setting_key,setting_value) VALUES ('event_photo',?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value),updated_at=NOW()");
                $stmt->bind_param('s', $path); $stmt->execute(); $stmt->close();
            } catch (Throwable $error) { @unlink(__DIR__ . '/' . $path); throw $error; }
            if ($old) council_cleanup_uploads($conn, [$old['setting_value']]);
            header('Location: dashboard.php?event_photo=success'); exit;
        } elseif (isset($_POST['remove_event_photo'])) {
            $old = $conn->query("SELECT setting_value FROM site_settings WHERE setting_key='event_photo'")->fetch_assoc();
            $conn->query("DELETE FROM site_settings WHERE setting_key='event_photo'");
            if ($old) council_cleanup_uploads($conn, [$old['setting_value']]);
            header('Location: dashboard.php?event_photo=removed'); exit;
        }
    } catch (Throwable $error) { $upload_err = $error instanceof RuntimeException && !($error instanceof mysqli_sql_exception) ? $error->getMessage() : 'The change could not be saved. Please try again.'; }
}
if (isset($_SESSION['workspace_error'])) { $upload_err = $_SESSION['workspace_error']; unset($_SESSION['workspace_error']); }
$documents = $conn->query('SELECT d.id,d.original_name,d.file_path,d.category,d.display_name,d.created_at,u.name AS username FROM documents d JOIN users u ON d.uploaded_by=u.id ORDER BY d.created_at DESC,d.id DESC')->fetch_all(MYSQLI_ASSOC);
$counts = array_fill_keys(array_keys($section_names), 0);
foreach ($documents as $doc) if (isset($counts[$doc['category']])) $counts[$doc['category']]++;
$banner = $conn->query("SELECT setting_value FROM site_settings WHERE setting_key='event_photo'")->fetch_assoc();
$current_event_photo = $banner && is_file(__DIR__ . '/' . $banner['setting_value']) ? $banner['setting_value'] : null;
$notice = '';
if (($_GET['upload'] ?? '') === 'success') $notice = max(1, (int)(is_string($_GET['count'] ?? null) ? $_GET['count'] : 1)) . ' document(s) uploaded successfully.';
elseif (($_GET['edit'] ?? '') === 'success') $notice = 'Document updated successfully.';
elseif (($_GET['bulk'] ?? '') === 'success') $notice = 'Bulk action applied successfully.';
elseif (($_GET['event_photo'] ?? '') === 'success') $notice = 'Event announcement published on the homepage.';
elseif (($_GET['event_photo'] ?? '') === 'removed') $notice = 'Event announcement removed from the homepage.';
$page_title = 'Council Dashboard | CSPC Supreme Student Council';
$page_description = 'Manage official council documents and event announcements.';
$current_page = 'dashboard';
$workspace_panel = $is_admin && (isset($_POST['upload']) || isset($_POST['upload_event_photo']) || isset($_POST['remove_event_photo']) || isset($_GET['upload']) || isset($_GET['event_photo'])) ? 'publishing-tools' : 'uploaded-documents';
include __DIR__ . '/includes/head.php';
?>
<body class="council-page dashboard-page min-h-screen flex flex-col">
<?php include __DIR__ . '/includes/nav.php'; ?>
<main id="main-content" class="workspace-main council-width" tabindex="-1">
    <header class="workspace-heading"><div><p class="council-kicker">CSPC SUPREME STUDENT COUNCIL</p><h1>COUNCIL DASHBOARD</h1><p>Welcome back, <?php echo $escape($_SESSION['username']); ?>. <span class="workspace-role"><?php echo $is_admin ? 'Administrator' : 'Member'; ?></span></p></div></header>
    <?php if ($upload_err): ?><div class="council-alert is-error" role="alert"><?php echo $escape($upload_err); ?></div><?php endif; ?>
    <?php if ($notice): ?><div class="council-alert" role="status"><?php echo $escape($notice); ?></div><?php endif; ?>
    <?php if (!$is_admin): ?><p class="council-alert">You have read-only access. Contact a council administrator to manage documents or announcements.</p><?php endif; ?>
    <section class="workspace-stats" aria-label="Document statistics"><div><span>All documents</span><strong><?php echo count($documents); ?></strong></div><?php foreach ($section_names as $key => $label): ?><div class="stat-<?php echo $key; ?>"><span><?php echo $label; ?></span><strong><?php echo $counts[$key]; ?></strong></div><?php endforeach; ?></section>
    <nav class="workspace-tabs" aria-label="Dashboard sections" data-workspace-tabs><a id="workspace-tab-documents" href="#uploaded-documents" data-workspace-tab="uploaded-documents">Uploaded documents</a><?php if ($is_admin): ?><a id="workspace-tab-publishing" href="#publishing-tools" data-workspace-tab="publishing-tools">Upload &amp; announcements</a><?php endif; ?></nav>
    <div class="workspace-layout" data-workspace-layout data-default-panel="<?php echo $workspace_panel; ?>">
        <section class="council-panel workspace-library" id="uploaded-documents" aria-labelledby="workspace-documents-title" data-workspace-panel><header class="workspace-panel-heading"><div><h2 id="workspace-documents-title">Uploaded documents</h2><p class="council-muted">Find a record or manage its details.</p></div><a class="council-text-link" href="generate_report.php">Export PDF report</a></header>
            <div class="workspace-filters council-form" data-workspace-filters hidden><div><label for="workspace-search">Find a document</label><input id="workspace-search" type="search" placeholder="Search by title or publisher" data-document-search></div><div><label for="workspace-category">Category</label><select id="workspace-category" data-document-category><option value="all">All categories</option><?php foreach ($section_names as $key => $label): ?><option value="<?php echo $key; ?>"><?php echo $label; ?></option><?php endforeach; ?></select></div></div>
            <?php if ($is_admin): ?><form id="bulkForm" method="post" action="dashboard.php" class="workspace-bulk" data-bulk-form><?php echo council_csrf_field(); ?><span data-selected-count>0 selected</span><label class="visually-hidden" for="bulk-action">Action for selected documents</label><select id="bulk-action" name="bulk_action" required><option value="">Choose action</option><option value="treasurer">Move to Treasurer</option><option value="legislative">Move to Legislative</option><option value="secretary">Move to Secretary</option><option value="delete">Delete selected</option></select><button class="council-button is-secondary" type="submit" data-bulk-apply>Apply</button></form><?php endif; ?>
            <div class="workspace-table-wrap" tabindex="0" role="region" aria-label="Uploaded documents table"><table class="workspace-table"><thead><tr><?php if ($is_admin): ?><th class="workspace-check"><input type="checkbox" aria-label="Select all visible documents" data-select-all hidden></th><?php endif; ?><th scope="col">Document</th><th scope="col">Category</th><th scope="col">Published by</th><th scope="col">Uploaded</th><th scope="col">Actions</th></tr></thead><tbody>
                <?php foreach ($documents as $doc): ?>
                <tr data-workspace-document data-id="<?php echo $doc['id']; ?>" data-name="<?php echo $escape($doc['original_name']); ?>" data-display="<?php echo $escape($doc['display_name'] ?: $doc['username']); ?>" data-category="<?php echo $escape($doc['category']); ?>">
                    <?php if ($is_admin): ?><td><input type="checkbox" name="doc_ids[]" value="<?php echo $doc['id']; ?>" form="bulkForm" aria-label="<?php echo $escape('Select ' . $doc['original_name']); ?>" data-document-check></td><?php endif; ?>
                    <td class="workspace-filename"><?php echo $escape($doc['original_name']); ?></td><td><span class="workspace-category category-<?php echo $escape($doc['category']); ?>"><?php echo $escape($section_names[$doc['category']] ?? $doc['category']); ?></span></td><td><?php echo $escape($doc['display_name'] ?: $doc['username']); ?></td><td class="workspace-date"><?php echo $doc['created_at'] ? date('M d, Y', strtotime($doc['created_at'])) : 'Not provided'; ?></td><td><div class="workspace-row-actions"><a href="pdfviewer.php?file=<?php echo rawurlencode($doc['file_path']); ?>" target="_blank" rel="noopener" aria-label="<?php echo $escape('View ' . $doc['original_name']); ?>">View</a><?php if ($is_admin): ?><button type="button" data-edit-document aria-label="<?php echo $escape('Edit ' . $doc['original_name']); ?>" hidden>Edit</button><form method="post" action="dashboard.php" data-confirm="Delete this document? This cannot be undone."><?php echo council_csrf_field(); ?><input type="hidden" name="bulk_action" value="delete"><input type="hidden" name="doc_ids[]" value="<?php echo $doc['id']; ?>"><button type="submit" class="workspace-delete" aria-label="<?php echo $escape('Delete ' . $doc['original_name']); ?>">Delete</button></form><?php endif; ?></div></td>
                </tr>
                <?php endforeach; ?>
            </tbody></table></div><p class="workspace-empty" data-workspace-empty <?php if ($documents): ?>hidden<?php endif; ?>><?php echo $documents ? 'No documents match your search. Try another title or category.' : 'No documents uploaded yet.'; ?></p><p class="workspace-result-count" data-workspace-count aria-live="polite"><?php echo count($documents); ?> documents</p>
        </section>
        <?php if ($is_admin): ?>
        <aside class="workspace-sidebar" id="publishing-tools" aria-label="Publishing tools" data-workspace-panel>
            <section class="council-panel" id="upload-documents" aria-labelledby="upload-title"><h2 id="upload-title">Upload documents</h2><p class="council-muted">Publish PDFs to the official document library.</p><form method="post" action="dashboard.php" enctype="multipart/form-data" class="council-form"><?php echo council_csrf_field(); ?><input type="hidden" name="upload" value="1"><div><label for="upload-category">Category</label><select id="upload-category" name="section" required><option value="">Choose a category</option><?php foreach ($section_names as $key => $label): ?><option value="<?php echo $key; ?>"><?php echo $label; ?></option><?php endforeach; ?></select></div><div><label for="upload-publisher">Published by</label><input id="upload-publisher" name="display_name" maxlength="255" placeholder="<?php echo $escape($_SESSION['username']); ?>"><p class="workspace-field-help">Leave blank to use your account name.</p></div><div><label for="upload-files">PDF files</label><input id="upload-files" type="file" name="files[]" accept=".pdf,application/pdf" multiple required data-file-input><p class="workspace-field-help" data-file-summary>PDF files only. Multiple selection supported.</p></div><button class="council-button" type="submit">Upload documents</button></form></section>
            <section class="council-panel workspace-event<?php if ($event_announcements_paused): ?> is-paused<?php endif; ?>" aria-labelledby="event-title"><h2 id="event-title">Event announcement</h2>
                <?php if ($event_announcements_paused): ?><p class="workspace-event-paused" id="announcement-paused">Paused while the SIKLAB theme is active. Home currently uses its custom event presentation.</p><?php else: ?><p class="council-muted">Shown through the event-announcement button on Home.</p><?php endif; ?>
                <fieldset class="workspace-event-content" <?php if ($event_announcements_paused): ?>disabled aria-describedby="announcement-paused"<?php endif; ?>>
                    <?php if ($current_event_photo): ?><img class="workspace-event-preview" src="<?php echo $escape($current_event_photo); ?>" alt="Current event announcement"><form method="post" action="dashboard.php" data-confirm="Remove the current event announcement?"><?php echo council_csrf_field(); ?><button type="submit" class="council-button is-danger" name="remove_event_photo" value="1">Remove announcement</button></form><?php else: ?><p class="workspace-event-empty">No announcement published yet.</p><?php endif; ?>
                    <form method="post" action="dashboard.php" enctype="multipart/form-data" class="council-form"><?php echo council_csrf_field(); ?><input type="hidden" name="upload_event_photo" value="1"><div><label for="event-photo">Announcement image</label><input type="file" id="event-photo" name="event_photo" accept="image/jpeg,image/png,image/gif,image/webp,image/bmp" required data-file-input><p class="workspace-field-help" data-file-summary>Images are center-cropped to a square.</p></div><button type="submit" class="council-button is-secondary"><?php echo $current_event_photo ? 'Replace announcement' : 'Publish announcement'; ?></button></form>
                </fieldset>
            </section>
        </aside>
        <?php endif; ?>
    </div>
</main>
<?php if ($is_admin): ?>
<dialog id="editModal" class="workspace-edit-dialog" aria-labelledby="edit-title"><header class="workspace-panel-heading"><h2 id="edit-title">Edit document</h2><form method="dialog"><button class="council-button is-secondary" aria-label="Close edit document">Close</button></form></header><form method="post" action="dashboard.php" class="council-form"><?php echo council_csrf_field(); ?><input type="hidden" name="edit_doc" value="1"><input type="hidden" name="edit_id" id="editId"><div><label for="editName">File name</label><input id="editName" name="edit_name" maxlength="255" required></div><div><label for="editDisplay">Published by</label><input id="editDisplay" name="edit_display" maxlength="255"></div><div><label for="editCategory">Category</label><select id="editCategory" name="edit_category" required><?php foreach ($section_names as $key => $label): ?><option value="<?php echo $key; ?>"><?php echo $label; ?></option><?php endforeach; ?></select></div><button type="submit" class="council-button">Save changes</button></form></dialog>
<?php endif; ?>
<?php include __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
