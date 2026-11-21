<?php
require_once __DIR__ . '/theme.php';
$current_page = $current_page ?? '';
$nav_links = [['index.php','Home','home'], ['officers.php','Officers','officers'], ['documents.php','Documents','documents'], ['about.php','About','about']];
if (!empty($_SESSION['loggedin'])) $nav_links[] = ['dashboard.php','Dashboard','dashboard'];
?>
<a class="skip-link" href="#main-content">Skip to content</a>
<header class="site-header">
    <nav class="site-navigation" aria-label="Main navigation">
        <a class="council-brand" href="index.php" aria-label="CSPC Supreme Student Council home">
            <img src="https://i.ibb.co/Cp38FdLC/logo.png" width="42" height="42" alt="">
            <span><strong>CSPC <span class="brand-slash">/</span> SSC</strong><small>Supreme Student Council</small></span>
        </a>
        <button class="navigation-toggle" type="button" aria-label="Open navigation" aria-controls="site-navigation-links" aria-expanded="false" data-navigation-toggle><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
        <div class="navigation-links" id="site-navigation-links" data-navigation>
            <?php foreach ($nav_links as [$href, $label, $page]): ?>
            <a class="navigation-link <?php echo $page === $current_page ? 'is-current' : ''; ?>" href="<?php echo $href; ?>" <?php echo $page === $current_page ? 'aria-current="page"' : ''; ?>><?php echo $label; ?></a>
            <?php endforeach; ?>
            <?php if (!empty($_SESSION['loggedin'])): ?><a class="navigation-account" href="logout.php">Sign out</a><?php else: ?><a class="navigation-account" href="login.php">Council login</a><?php endif; ?>
        </div>
    </nav>
</header>
