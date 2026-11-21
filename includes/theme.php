<?php
// A visitor preference changes presentation only; it never changes council data.
$ssc_themes = ['regular', 'siklab'];
$requested_theme = $_GET['theme'] ?? null;
$saved_theme = $_COOKIE['ssc_theme'] ?? null;
$site_theme = is_string($requested_theme) && in_array($requested_theme, $ssc_themes, true)
    ? $requested_theme
    : (is_string($saved_theme) && in_array($saved_theme, $ssc_themes, true) ? $saved_theme : 'siklab');
if (is_string($requested_theme) && in_array($requested_theme, $ssc_themes, true)) {
    setcookie('ssc_theme', $site_theme, [
        'expires' => time() + 60 * 60 * 24 * 365,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function ssc_theme_url(string $theme): string
{
    $query = $_GET;
    $query['theme'] = $theme;
    $page = basename($_SERVER['SCRIPT_NAME'] ?? 'index.php');
    return htmlspecialchars($page . '?' . http_build_query($query), ENT_QUOTES, 'UTF-8');
}
