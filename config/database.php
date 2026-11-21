<?php
require_once __DIR__ . '/database-settings.php';

try {
    $settings = database_settings();
    if (!function_exists('mysqli_connect')) {
        throw new RuntimeException('Missing database extension.');
    }
    $conn = @mysqli_connect($settings['server'], $settings['username'],
        $settings['password'], $settings['name'], $settings['port']);
    if ($conn === false || !mysqli_set_charset($conn, 'utf8mb4')) {
        throw new RuntimeException('Database connection unavailable.');
    }
} catch (Throwable $error) {
    http_response_code(503);
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Service Unavailable</title></head>'
        . '<body style="font-family:sans-serif;text-align:center;padding:60px">'
        . '<h2>Database unavailable.</h2><p>Please try again later.</p></body></html>';
    exit;
}
// Schema changes are explicit CLI migrations, never normal page requests.
unset($settings, $error);
