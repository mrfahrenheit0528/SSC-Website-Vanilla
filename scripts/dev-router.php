<?php
// PHP's development server ignores .htaccess. Serve only public application
// entry points and approved static types, never private/development files.
if (PHP_SAPI !== 'cli-server' || getenv('SSC_LOCAL_DEV') !== '1') {
    http_response_code(403);
    exit;
}
$root = dirname(__DIR__);
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
if (str_contains($path, "\0") || str_contains($path, '\\')
    || preg_match('~(?:^|/)(?:\.{1,2}|\.[^/]*)(?:/|$)~', $path)) {
    http_response_code(403);
    exit;
}
$entrypoints = ['index.php', 'about.php', 'officers.php', 'documents.php', 'login.php',
    'logout.php', 'dashboard.php', 'attendance.php', 'pdfviewer.php',
    'view_pdf.php', 'generate_report.php', 'delete_document.php', 'auth/register.php'];
$relative = $path === '/' ? 'index.php' : ltrim($path, '/');
$target = realpath($root . '/' . $relative);
if (!$target || !is_file($target) || !str_starts_with($target, $root . DIRECTORY_SEPARATOR)) {
    http_response_code(404);
    exit;
}
if (in_array($relative, $entrypoints, true)) {
    $_SERVER['SCRIPT_FILENAME'] = $target;
    $_SERVER['SCRIPT_NAME'] = '/' . $relative;
    $_SERVER['PHP_SELF'] = '/' . $relative;
    chdir(dirname($target));
    require $target;
    return true;
}
if (preg_match('~^(?:assets|uploads)/~', $relative)
    && in_array(strtolower(pathinfo($relative, PATHINFO_EXTENSION)),
        ['css', 'js', 'mjs', 'glb', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'ico', 'pdf', 'woff', 'woff2', 'ttf'], true)) {
    return false;
}
http_response_code(403);
