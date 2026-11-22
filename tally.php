<?php
session_start();
$page_title = 'Official Tally Board | SIKLAB 2026';
$page_description = 'The official tally board is underway';
$current_page = 'tally';
include __DIR__ . '/includes/head.php';
?>
<body class="event-home tally-page">
<?php include __DIR__ . '/includes/nav.php'; ?>
<main id="main-content" class="tally-main" tabindex="-1">
    <div class="tally-content">
        <img class="tally-wordmark" src="assets/img/siklab/wordmark.webp" width="1100" height="202" alt="SIKLAB">
        <p class="section-kicker">CSPC INTRAMURALS 2026</p>
        <p class="tally-label">Official tally board</p>
        <h1>The official tally board is underway</h1>
        <p class="tally-date"><time datetime="2026-11-23">November 23</time>–<time datetime="2026-11-28">28, 2026</time></p>
        <a class="button button-primary" href="index.php">Back to SIKLAB</a>
    </div>
</main>
<?php include __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
