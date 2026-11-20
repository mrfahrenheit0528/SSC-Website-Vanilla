<?php
// Shared bootstrap; actual connection values belong in the ignored local file
// or DB_SERVER, DB_USERNAME, DB_PASSWORD and DB_NAME environment variables.
$database_unavailable = static function () {
    http_response_code(503);
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Service Unavailable</title></head>'
        . '<body style="font-family:sans-serif;text-align:center;padding:60px">'
        . '<h2>Database unavailable.</h2>'
        . '<p>Please try again later.</p>'
        . '</body></html>';
    exit;
};

try {
    $database_local_path = __DIR__ . '/database.local.php';
    $database_local = is_file($database_local_path) ? require $database_local_path : [];
    if (!is_array($database_local)) {
        $database_unavailable();
    }

    $database_keys = [
        'DB_SERVER' => 'server',
        'DB_USERNAME' => 'username',
        'DB_PASSWORD' => 'password',
        'DB_NAME' => 'name',
    ];
    $database_values = [];
    foreach ($database_keys as $database_env => $database_key) {
        $database_value = getenv($database_env);
        if ($database_value === false) {
            $database_value = $database_local[$database_key] ?? null;
        }
        // An empty password is valid for some local database installations.
        if (!is_string($database_value)
            || ($database_key !== 'password' && trim($database_value) === '')) {
            $database_unavailable();
        }
        $database_values[$database_key] = $database_value;
    }

    if (!function_exists('mysqli_connect')) {
        $database_unavailable();
    }
    $conn = @mysqli_connect(
        $database_values['server'],
        $database_values['username'],
        $database_values['password'],
        $database_values['name']
    );
    if ($conn === false) {
        $database_unavailable();
    }
} catch (Throwable $database_error) {
    // Do not expose credentials, connection details, or exception traces.
    $database_unavailable();
}

// Preserve the existing settings-table bootstrap until versioned migrations exist.
mysqli_query($conn, "CREATE TABLE IF NOT EXISTS site_settings (
    setting_key  VARCHAR(100) NOT NULL PRIMARY KEY,
    setting_value TEXT,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

unset($database_local, $database_local_path, $database_keys, $database_values,
    $database_env, $database_key, $database_value, $database_error, $database_unavailable);
