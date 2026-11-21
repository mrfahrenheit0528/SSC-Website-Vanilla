<?php
$siklab_teams = [
    ['BC', 'bc', '#e72bb8'], ['CAS', 'cas', '#de222b'], ['CCS', 'ccs', '#f3b600'],
    ['CEA', 'cea', '#8891a4'], ['CHS', 'chs', '#8435d6'],
    ['CTDE', 'ctde', '#214fe2'], ['CTHBM', 'cthbm', '#59b916'],
];
$document_labels = ['treasurer' => 'Finance', 'legislative' => 'Legislative', 'secretary' => 'Secretariat'];
?>
<main id="main-content" tabindex="-1">
    <section class="siklab-hero" aria-labelledby="hero-heading">
        <div class="hero-copy">
            <div class="event-eyebrow"><span class="eyebrow-line"></span>CSPC INTRAMURALS 2026</div>
            <img class="event-wordmark" src="assets/img/siklab/wordmark.webp" width="1100" height="203" alt="SIKLAB">
            <h1 id="hero-heading">Different colors.<br>One <span>burning spirit.</span></h1>
            <p class="hero-description">The passion. The pride. The people.<br>Come together for SIKLAB: CSPC Intramurals 2026.</p>
            <div class="hero-actions">
                <a class="button button-primary" href="#teams">Meet the teams</a>
                <a class="button button-glass" href="#council-updates">Council updates</a>
            </div>
            <div class="hero-signature"><span class="signature-line"></span><p>Every color has a story.<br><strong>This is ours to ignite.</strong></p></div>
        </div>
        <div class="trophy-stage" aria-label="SIKLAB trophy showcase">
            <div class="stage-orbit orbit-one" aria-hidden="true"></div>
            <div class="stage-orbit orbit-two" aria-hidden="true"></div>
            <span class="stage-spark spark-one" aria-hidden="true"></span>
            <span class="stage-spark spark-two" aria-hidden="true"></span>
            <div class="trophy-shadow" aria-hidden="true"></div>
            <div class="trophy-scene" data-trophy-scene>
                <img class="trophy-fallback" src="assets/img/siklab/trophy.webp" width="464" height="900" alt="The multicolored SIKLAB flame on a gold trophy base">
                <canvas id="siklab-trophy-canvas" class="trophy-canvas" hidden tabindex="0" role="img" aria-label="3D SIKLAB trophy. Drag horizontally or use left and right arrow keys to rotate. Home resets the view."></canvas>
            </div>
            <div class="scene-caption"><span data-scene-caption>THE SIKLAB SPIRIT, IN EVERY DIMENSION</span><button class="motion-button" type="button" data-scene-toggle aria-controls="siklab-trophy-canvas" hidden>Pause animation</button></div>
        </div>
    </section>
    <section class="teams-section" id="teams" aria-labelledby="teams-heading">
        <div class="teams-intro"><span class="section-overline">THE COLORS WE CARRY</span><h2 id="teams-heading">Seven teams. One shared flame.</h2></div>
        <ul class="team-lineup" aria-label="SIKLAB teams">
            <?php foreach ($siklab_teams as [$code, $asset, $color]): ?>
            <li class="team" style="--team-color:<?php echo $color; ?>">
                <img src="assets/img/siklab/<?php echo $asset; ?>.webp" alt="<?php echo $code; ?> team emblem" width="120" height="120">
                <span><?php echo $code; ?></span>
            </li>
            <?php endforeach; ?>
        </ul>
    </section>
    <div class="event-frame-note"><span>CAMARINES SUR POLYTECHNIC COLLEGES</span><span>Presented by your Supreme Student Council</span></div>
</main>
</div><!-- event-frame -->

<section class="council-hub content-width" id="council-updates" aria-labelledby="council-heading">
    <div class="hub-heading"><div><span class="section-overline">BEYOND THE GAMES</span><h2 id="council-heading">Your council.<br>Still at your service.</h2></div><p>Celebrate the moment. Stay connected to the work behind it. Your officers, official records, and council updates are always within reach.</p></div>
    <div class="hub-grid">
        <a class="hub-link" href="documents.php"><span class="hub-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h6"/></svg></span><div><h3>Open records. Open access.</h3><p><?php echo $doc_count; ?> official document<?php echo $doc_count === 1 ? '' : 's'; ?> available to explore.</p><span class="text-link">Browse documents</span></div></a>
        <a class="hub-link" href="officers.php"><span class="hub-icon pink-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5"/></svg></span><div><h3>The people behind the service.</h3><p>Meet your student leaders and explore council rosters.</p><span class="text-link">Meet the council</span></div></a>
    </div>
    <?php if ($event_photo): ?>
    <div class="council-announcement"><img src="<?php echo htmlspecialchars($event_photo, ENT_QUOTES, 'UTF-8'); ?>" alt="Current announcement from the Supreme Student Council" loading="lazy"><div><span class="section-overline">FROM YOUR COUNCIL</span><h3>Stay in the loop.</h3><p>The latest announcement, straight from your Supreme Student Council.</p><a class="button button-primary" href="https://www.facebook.com/CSPC.SSC" target="_blank" rel="noopener noreferrer">Visit the SSC page</a></div></div>
    <?php endif; ?>
</section>

<section class="records-section content-width" aria-labelledby="records-heading">
    <div class="records-heading"><div><span class="section-overline">TRANSPARENCY, ALWAYS</span><h2 id="records-heading">The latest from our records.</h2></div><a class="text-link" href="documents.php">View all documents</a></div>
    <?php if ($latest_documents): ?>
    <div class="latest-records">
        <?php foreach ($latest_documents as $document): ?>
        <a class="record-row" href="pdfviewer.php?file=<?php echo urlencode($document['file_path']); ?>">
            <span class="record-type"><?php echo htmlspecialchars($document_labels[$document['category']] ?? 'Council record', ENT_QUOTES, 'UTF-8'); ?></span>
            <h3><?php echo htmlspecialchars(preg_replace('/\.pdf$/i', '', $document['original_name']), ENT_QUOTES, 'UTF-8'); ?></h3>
            <span class="record-date"><?php echo date('M j, Y', strtotime($document['created_at'])); ?></span>
            <span class="record-action">Read document <span class="pdf-label">PDF</span></span>
        </a>
        <?php endforeach; ?>
    </div>
    <?php else: ?><p class="empty-records">New council records will appear here when published.</p><?php endif; ?>
</section>
<section class="community-note content-width"><span class="section-overline">LET'S KEEP THE SPIRIT ALIVE</span><h2>For every student.<br>In every color.</h2><a class="button button-primary" href="https://www.facebook.com/CSPC.SSC" target="_blank" rel="noopener noreferrer">Follow CSPC–SSC</a></section>
<?php include 'includes/footer.php'; ?>
<script type="module" src="assets/js/siklab-scene.bundle.js?v=<?php echo filemtime(__DIR__ . '/../assets/js/siklab-scene.bundle.js'); ?>"></script>
</body>
</html>
