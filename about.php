<?php
session_start();
$page_title = 'About This Platform | CSPC Supreme Student Council';
$page_description = 'Meet the SSC officers who proposed and developed the council information disclosure platform.';
$current_page = 'about';
include __DIR__ . '/includes/head.php';
?>
<body class="about-page min-h-screen flex flex-col">
<?php include __DIR__ . '/includes/nav.php'; ?>
<main id="main-content" class="about-main" tabindex="-1">
    <header class="about-introduction about-width">
        <div><p class="about-kicker">CSPC SUPREME STUDENT COUNCIL</p><h1>ABOUT THIS PLATFORM</h1><p class="about-lead">This information disclosure system was proposed and developed by dedicated SSC officers to promote transparency, financial accountability, and accessible documentation for the CSPC student body.</p></div>
        <img class="about-crest" src="assets/static/SSC%20LOGO.png" width="1437" height="1570" alt="CSPC Supreme Student Council">
    </header>
    <section class="about-platform about-width" aria-labelledby="about-platform-title">
        <div class="about-platform-summary"><p class="about-kicker">THE PLATFORM</p><h2 id="about-platform-title">TransFormation</h2><p>SSC Information Disclosure System</p><div class="about-platform-links"><a class="about-button" href="documents.php">Browse official documents</a><a class="about-text-link" href="officers.php">Meet the council</a></div></div>
        <ul class="about-principles" aria-label="Platform purpose"><li><span class="about-principle-mark" aria-hidden="true"></span><div><h3>Transparency</h3><p>Council information available to the student body.</p></div></li><li><span class="about-principle-mark" aria-hidden="true"></span><div><h3>Financial accountability</h3><p>Accessible Treasurer files and financial records.</p></div></li><li><span class="about-principle-mark" aria-hidden="true"></span><div><h3>Accessible documentation</h3><p>Official documents organized by council office.</p></div></li></ul>
    </section>
    <?php include __DIR__ . '/includes/about-content.php'; ?>
</main>
<?php include __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
