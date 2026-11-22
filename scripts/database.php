<?php
// Development-only commands. Never execute a migration or fixture against hosting.
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}
require_once dirname(__DIR__) . '/config/database-settings.php';
try {
    $settings = database_settings();
    if (!in_array($settings['server'], ['127.0.0.1', 'localhost', '::1'], true)
        || !preg_match('/^ssc_(dev|test_[a-z0-9_]+)$/', $settings['name'])) {
        throw new RuntimeException('Development commands require a loopback host and ssc_dev or ssc_test_* database.');
    }
    $conn = new mysqli($settings['server'], $settings['username'], $settings['password'],
        $settings['name'], $settings['port']);
    $conn->set_charset('utf8mb4');
    $action = $argv[1] ?? 'status';
    if ($action === 'migrate') {
        $conn->query('CREATE TABLE IF NOT EXISTS _schema_migrations (
            version VARCHAR(191) PRIMARY KEY, checksum CHAR(64) NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
        $files = glob(dirname(__DIR__) . '/database/migrations/*');
        sort($files);
        foreach ($files as $file) {
            if (!in_array(pathinfo($file, PATHINFO_EXTENSION), ['php', 'sql'], true)) continue;
            $version = basename($file);
            $checksum = hash_file('sha256', $file);
            $stmt = $conn->prepare('SELECT checksum FROM _schema_migrations WHERE version=?');
            $stmt->bind_param('s', $version);
            $stmt->execute();
            $previous = $stmt->get_result()->fetch_assoc();
            if ($previous) {
                if (!hash_equals($previous['checksum'], $checksum)) {
                    throw new RuntimeException('An applied migration changed: ' . $version);
                }
                continue;
            }
            if (str_ends_with($file, '.php')) {
                $migration = require $file;
                $migration($conn);
            } else {
                $conn->multi_query(file_get_contents($file));
                do {
                    if ($result = $conn->store_result()) $result->free();
                } while ($conn->more_results() && $conn->next_result());
            }
            $stmt = $conn->prepare('INSERT INTO _schema_migrations (version, checksum) VALUES (?, ?)');
            $stmt->bind_param('ss', $version, $checksum);
            $stmt->execute();
            echo 'Applied ' . $version . PHP_EOL;
        }
        echo 'Migrations are current.' . PHP_EOL;
    } elseif ($action === 'seed') {
        $credentials = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
        if (!isset($credentials['admin_password'], $credentials['member_password'])) {
            throw new RuntimeException('Pass development credentials through standard input.');
        }
        require_once dirname(__DIR__) . '/vendor/autoload.php';
        $conn->begin_transaction();
        foreach ([['Development Administrator', 'admin@example.test', $credentials['admin_password'], 1],
                  ['Development Member', 'member@example.test', $credentials['member_password'], 0]] as $user) {
            [$name, $email, $plain, $admin] = $user;
            $stmt = $conn->prepare('SELECT id FROM users WHERE email=?');
            $stmt->bind_param('s', $email);
            $stmt->execute();
            $existing = $stmt->get_result()->fetch_assoc();
            if (!$existing) {
                $hash = password_hash($plain, PASSWORD_DEFAULT);
                $stmt = $conn->prepare('INSERT INTO users (name,email,password,is_admin,created_at) VALUES (?,?,?,?,NOW())');
                $stmt->bind_param('sssi', $name, $email, $hash, $admin);
                $stmt->execute();
                $id = $conn->insert_id;
            } else {
                $id = (int)$existing['id'];
            }
            if ($admin) $admin_id = $id;
        }
        $fixture_prefix = 'uploads/development/' . $settings['name'];
        $directory = dirname(__DIR__) . '/' . $fixture_prefix;
        if (!is_dir($directory)) mkdir($directory, 0755, true);
        foreach (['treasurer' => 'Example Finance Report', 'legislative' => 'Example Council Resolution',
                  'secretary' => 'Example Meeting Minutes'] as $category => $title) {
            $path = $fixture_prefix . '/' . $category . '.pdf';
            $original = $title . '.pdf';
            $stmt = $conn->prepare('SELECT id FROM documents WHERE file_path=?');
            $stmt->bind_param('s', $path);
            $stmt->execute();
            if ($stmt->get_result()->num_rows > 0) continue;
            $absolute = dirname(__DIR__) . '/' . $path;
            if (is_file($absolute)) {
                throw new RuntimeException('A fixture file already exists without its record; inspect before retrying.');
            }
            $pdf = new TCPDF();
            $pdf->SetTitle($title);
            $pdf->AddPage();
            $pdf->Write(0, $title . "\nSynthetic development fixture. No production records.");
            $pdf->Output($absolute, 'F');
            $display = 'Development Council';
            $description = 'Synthetic fixture for local UI development.';
            $stmt = $conn->prepare('INSERT INTO documents (title,description,category,file_path,original_name,uploaded_by,display_name,created_at) VALUES (?,?,?,?,?,?,?,NOW())');
            $stmt->bind_param('sssssis', $title, $description, $category, $path, $original, $admin_id, $display);
            $stmt->execute();
        }
        $conn->commit();
        echo 'Synthetic development accounts and documents are ready.' . PHP_EOL;
    } elseif ($action === 'status') {
        foreach (['users', 'documents', 'site_settings', '_schema_migrations'] as $table) {
            $count = $conn->query('SELECT COUNT(*) AS total FROM `' . $table . '`')->fetch_assoc()['total'];
            echo $table . ': ' . $count . PHP_EOL;
        }
    } else {
        throw new RuntimeException('Use migrate, seed or status.');
    }
} catch (Throwable $error) {
    // Connection/statement exceptions can contain private details. Do not dump them.
    $message = get_class($error) === RuntimeException::class ? $error->getMessage()
        : 'Check local configuration and migration state.';
    fwrite(STDERR, 'Development database command failed (' . get_class($error) . '): ' . $message . PHP_EOL);
    exit(1);
}
