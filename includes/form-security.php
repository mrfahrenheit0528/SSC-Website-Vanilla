<?php
function council_csrf_token(): string {
    if (empty($_SESSION['council_csrf'])) $_SESSION['council_csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['council_csrf'];
}
function council_csrf_field(): string {
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars(council_csrf_token(), ENT_QUOTES, 'UTF-8') . '">';
}
function council_valid_csrf(): bool {
    return is_string($_POST['csrf_token'] ?? null) && hash_equals(council_csrf_token(), $_POST['csrf_token']);
}
