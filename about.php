<?php
session_start();
$page_title = 'About This Platform | CSPC Supreme Student Council';
$page_description = 'Meet the SSC officers who proposed and developed the council information disclosure platform.';
$current_page = 'about';
include __DIR__ . '/includes/head.php';
?>
<body class="about-page bg-gray-50 min-h-screen flex flex-col">
<?php include __DIR__ . '/includes/nav.php'; ?>
<main id="main-content" class="about-main" tabindex="-1">
    <div class="about-introduction">
        <p class="section-kicker">CSPC SUPREME STUDENT COUNCIL</p>
        <h1>About This Platform</h1>
        <p>This information disclosure system was proposed and developed by dedicated SSC officers to promote transparency, financial accountability, and accessible documentation for the CSPC student body.</p>
        <a href="index.php">&larr; Back to home</a>
    </div>
    <?php include __DIR__ . '/includes/about-content.php'; ?>
</main>
<?php include __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
