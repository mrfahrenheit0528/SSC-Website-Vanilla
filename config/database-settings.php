<?php
/** Load connection settings without connecting or changing the database. */
function database_settings(): array
{
    $path = __DIR__ . '/database.local.php';
    $local = is_file($path) ? require $path : [];
    if (!is_array($local)) {
        throw new RuntimeException('Invalid database configuration.');
    }
    $settings = [];
    foreach (['server', 'username', 'password', 'name', 'port'] as $key) {
        $env = getenv('DB_' . ($key === 'server' ? 'SERVER' : strtoupper($key)));
        $value = $env !== false ? $env : ($local[$key] ?? ($key === 'port' ? 3306 : null));
        if ($key === 'port') {
            if (filter_var($value, FILTER_VALIDATE_INT) === false || (int)$value < 1 || (int)$value > 65535) {
                throw new RuntimeException('Invalid database port.');
            }
            $settings[$key] = (int)$value;
        } else {
            if (!is_string($value) || ($key !== 'password' && trim($value) === '')) {
                throw new RuntimeException('Missing database configuration.');
            }
            $settings[$key] = $value;
        }
    }
    return $settings;
}
