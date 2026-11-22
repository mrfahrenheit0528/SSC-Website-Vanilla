<?php
// Resolve only existing uploads inside this checkout, including legacy paths.
function council_upload_path(string $stored): ?string {
    $stored = str_replace('\\', '/', $stored);
    if (!preg_match('~(?:^|/)(uploads/.+)$~', $stored, $match) || str_contains($stored, "\0")) return null;
    $root = realpath(__DIR__ . '/../uploads');
    $file = realpath(__DIR__ . '/../' . $match[1]);
    return $root && $file && is_file($file) && str_starts_with($file, $root . DIRECTORY_SEPARATOR) ? $file : null;
}
function council_cleanup_uploads(mysqli $conn, array $paths): void {
    // Shared files and the currently published announcement must remain intact.
    $references = [];
    foreach ($conn->query('SELECT file_path FROM documents')->fetch_all(MYSQLI_ASSOC) as $row) {
        if ($path = council_upload_path($row['file_path'])) $references[$path] = true;
    }
    foreach ($conn->query("SELECT setting_value FROM site_settings WHERE setting_key='event_photo'")->fetch_all(MYSQLI_ASSOC) as $row) {
        if ($path = council_upload_path($row['setting_value'])) $references[$path] = true;
    }
    foreach ($paths as $stored) {
        if (($path = council_upload_path($stored)) && !isset($references[$path])) @unlink($path);
    }
}
function council_delete_documents(mysqli $conn, array $ids): int {
    if (!$ids) return 0;
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $types = str_repeat('i', count($ids));
    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("SELECT file_path FROM documents WHERE id IN ($placeholders) FOR UPDATE");
        $stmt->bind_param($types, ...$ids);
        $stmt->execute();
        $paths = array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC), 'file_path');
        $stmt->close();
        $stmt = $conn->prepare("DELETE FROM documents WHERE id IN ($placeholders)");
        $stmt->bind_param($types, ...$ids);
        $stmt->execute();
        $count = $stmt->affected_rows;
        $stmt->close();
        $conn->commit();
    } catch (Throwable $error) { $conn->rollback(); throw $error; }
    // Never remove files before their database changes commit.
    try { council_cleanup_uploads($conn, $paths); } catch (Throwable $error) { error_log('Document file cleanup deferred.'); }
    return $count;
}
