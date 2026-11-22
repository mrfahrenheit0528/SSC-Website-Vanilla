<?php
session_start();
if (!empty($_SESSION['loggedin'])) { header('Location: dashboard.php'); exit; }
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/form-security.php';
$username = $username_err = $password_err = $login_err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = is_string($_POST['username'] ?? null) ? trim($_POST['username']) : '';
    $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';
    if ($username === '') $username_err = 'Please enter your email address.';
    elseif (!filter_var($username, FILTER_VALIDATE_EMAIL)) $username_err = 'Please enter a valid email address.';
    if ($password === '') $password_err = 'Please enter your password.';
    if (!council_valid_csrf()) $login_err = 'Your session expired. Please try again.';
    elseif ($username_err === '' && $password_err === '') {
        $stmt = $conn->prepare('SELECT id, name, password, is_admin FROM users WHERE email = ?');
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $account = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($account && password_verify($password, $account['password'])) {
            session_regenerate_id(true);
            $_SESSION = ['loggedin' => true, 'id' => (int)$account['id'], 'username' => $account['name'], 'role' => $account['is_admin'] ? 'admin' : 'user'];
            header('Location: dashboard.php');
            exit;
        }
        $login_err = 'Invalid username or password.';
    }
}
$escape = static fn($value) => htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$current_page = 'login';
$page_title = 'Council Sign In | CSPC Supreme Student Council';
$page_description = 'Sign in to the council workspace to manage official documents and event announcements.';
include __DIR__ . '/includes/head.php';
?>
<body class="council-page login-page min-h-screen flex flex-col">
<?php include __DIR__ . '/includes/nav.php'; ?>
<main class="login-main council-width" id="main-content" tabindex="-1">
    <section class="login-introduction" aria-labelledby="login-title"><img src="assets/static/SSC%20LOGO.png" width="1437" height="1570" alt="CSPC Supreme Student Council"><p class="council-kicker">COUNCIL WORKSPACE</p><h1 id="login-title">WELCOME BACK.</h1><p>Manage council records, keep documents accessible, and share the latest event announcements.</p><a class="council-text-link" href="documents.php">Browse public documents</a></section>
    <section class="council-panel login-panel" aria-labelledby="sign-in-heading"><p class="council-kicker">CSPC &mdash; SUPREME STUDENT COUNCIL</p><h2 id="sign-in-heading">Council sign in</h2><p class="council-muted">Enter your council account details to continue.</p>
        <?php if ($login_err !== ''): ?><div class="council-alert is-error" role="alert"><?php echo $escape($login_err); ?></div><?php endif; ?>
        <form action="login.php" method="post" class="council-form">
            <?php echo council_csrf_field(); ?>
            <div><label for="login-email">Email address</label><input id="login-email" type="email" name="username" autocomplete="username" value="<?php echo $escape($username); ?>" placeholder="Your council email" required <?php if ($username_err): ?>aria-invalid="true" aria-describedby="email-error"<?php endif; ?>><?php if ($username_err): ?><p id="email-error" class="council-field-error"><?php echo $escape($username_err); ?></p><?php endif; ?></div>
            <div><label for="login-password">Password</label><div class="login-password-field"><input id="login-password" type="password" name="password" autocomplete="current-password" placeholder="Your password" required <?php if ($password_err): ?>aria-invalid="true" aria-describedby="password-error"<?php endif; ?>><button type="button" class="login-password-toggle" aria-label="Show password" aria-pressed="false" aria-controls="login-password" data-password-toggle hidden>Show</button></div><?php if ($password_err): ?><p id="password-error" class="council-field-error"><?php echo $escape($password_err); ?></p><?php endif; ?></div>
            <button type="submit" class="council-button">Sign in</button>
        </form><p class="login-help">Need access? Contact your council account administrator.</p>
    </section>
</main>
<?php include __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
