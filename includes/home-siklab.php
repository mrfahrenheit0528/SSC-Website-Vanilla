<main id="main-content" tabindex="-1">
    <section class="siklab-hero" aria-labelledby="hero-heading">
        <div class="hero-copy">
            <div class="event-eyebrow"><span class="eyebrow-line"></span>Academic Year 2025-2026</div>
            <img class="event-wordmark" src="assets/img/siklab/wordmark.webp" width="1100" height="203" alt="SIKLAB" aria-hidden="true">
            <h1 id="hero-heading">CSPC Supreme Student Council</h1>
            <p class="hero-description">Promoting transparency and student welfare through accessible documentation and information sharing. Empowering students through leadership, service, and advocacy.</p>
            <div class="hero-actions">
                <a class="button button-primary" href="officers.php">View Officers</a>
                <a class="button button-pink" href="documents.php">Documents</a>
                <button class="button button-gold" type="button" onclick="document.getElementById('aboutModal').classList.remove('hidden')">About Platform</button>
            </div>
        </div>
        <figure class="trophy-stage" aria-label="SIKLAB trophy and the seven participating colleges">
            <img class="trophy-art" src="assets/img/siklab/trophy.webp" width="464" height="900" alt="The official SIKLAB trophy with seven colorful flames and a gold base" fetchpriority="high">
            <ul class="college-emblems" aria-label="Participating colleges">
                <?php
                $colleges = [
                    ['BUHI', 'bc', 24, 8],
                    ['CAS', 'cas', 81, 18],
                    ['CCS', 'ccs', 88, 53],
                    ['CEA', 'cea', 77, 85],
                    ['CHS', 'chs', 23, 86],
                    ['CTDE', 'ctde', 12, 59],
                    ['CTHBM', 'cthbm', 12, 27],
                ];
                foreach ($colleges as [$name, $asset, $x, $y]): ?>
                <li class="college-emblem" style="--emblem-x: <?php echo $x; ?>%; --emblem-y: <?php echo $y; ?>%;">
                    <img src="assets/img/siklab/<?php echo $asset; ?>.webp" width="240" height="240" alt="">
                    <span><?php echo $name; ?></span>
                </li>
                <?php endforeach; ?>
            </ul>
        </figure>
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
