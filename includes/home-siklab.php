<main id="main-content" tabindex="-1">
    <section class="siklab-hero" aria-labelledby="hero-heading">
        <div class="hero-copy">
            <div class="event-eyebrow"><span class="eyebrow-line"></span>Academic Year 2025-2026</div>
            <img class="event-wordmark" src="assets/img/siklab/wordmark.webp" width="1100" height="203" alt="SIKLAB" aria-hidden="true">
            <h1 id="hero-heading">CSPC Supreme Student Council</h1>
            <p class="hero-description">Promoting transparency and student welfare through accessible documentation and information sharing. Empowering students through leadership, service, and advocacy.</p>
            <div class="hero-actions">
                <a class="button button-primary" href="officers.php">View Officers</a>
                <a class="button button-glass" href="documents.php">Documents</a>
                <button class="button button-glass" type="button" onclick="document.getElementById('aboutModal').classList.remove('hidden')">About Platform</button>
            </div>
        </div>
        <div class="trophy-stage" aria-label="SIKLAB trophy showcase">
            <div class="stage-orbit orbit-one" aria-hidden="true"></div>
            <div class="stage-orbit orbit-two" aria-hidden="true"></div>
            <span class="stage-spark spark-one" aria-hidden="true"></span>
            <span class="stage-spark spark-two" aria-hidden="true"></span>
            <div class="trophy-shadow" aria-hidden="true"></div>
            <div class="trophy-scene" data-trophy-scene data-model-url="assets/static/SIKLAB_Trophy.glb">
                <img class="trophy-fallback" src="assets/img/siklab/trophy.webp" width="464" height="900" alt="The multicolored SIKLAB flame on a gold trophy base">
                <canvas id="siklab-trophy-canvas" class="trophy-canvas" hidden tabindex="0" role="img" aria-label="3D SIKLAB trophy. Drag horizontally or use left and right arrow keys to rotate. Home resets the view."></canvas>
            </div>
            <div class="scene-caption"><span data-scene-caption>SIKLAB 2026</span><button class="motion-button" type="button" data-scene-toggle aria-controls="siklab-trophy-canvas" hidden>Pause animation</button></div>
        </div>
    </section>
</main>
</div><!-- event-frame -->

<section class="home-announcement content-width" aria-labelledby="announcement-heading">
    <?php if ($event_photo): ?>
    <div class="home-announcement-image"><img src="<?php echo htmlspecialchars($event_photo, ENT_QUOTES, 'UTF-8'); ?>" alt="Upcoming Event"></div>
    <div><h2 id="announcement-heading">Upcoming Event</h2></div>
    <?php else: ?>
    <div><h2 id="announcement-heading">No Upcoming Event</h2><p>Check back soon for announcements.</p></div>
    <?php endif; ?>
</section>
<?php include __DIR__ . '/home-content.php'; ?>
