<?php
return static function (mysqli $conn): void {
    $column = $conn->query("SHOW COLUMNS FROM documents LIKE 'display_name'");
    if ($column->num_rows === 0) {
        $conn->query('ALTER TABLE documents ADD COLUMN display_name VARCHAR(255) NULL AFTER uploaded_by');
    }
};
