<?php $executive_officers = require __DIR__ . '/executive-officers.php'; ?>
<main id="main-content" tabindex="-1">
    <section class="opening-scene" aria-labelledby="hero-heading" data-opening-scene>
        <div class="scene-stage" data-parallax-stage>
            <div class="scene-background" aria-hidden="true">
                <img class="parallax-layer layer-sky" src="assets/img/siklab/parallax-sky-v3.webp" alt="" width="1672" height="941" data-scene-layer data-depth="0.06" fetchpriority="high">
                <div class="scene-landscape">
                    <img class="parallax-layer layer-distance" src="assets/img/siklab/parallax-distance-v3.webp" alt="" width="1672" height="941" data-scene-layer data-depth="0.18">
                    <img class="parallax-layer layer-campus" src="assets/img/siklab/parallax-campus-v3.webp" alt="" width="1672" height="941" data-scene-layer data-depth="0.38">
                    <img class="parallax-layer layer-monument" src="assets/img/siklab/parallax-monument-v3.webp" alt="" width="1672" height="941" data-scene-layer data-depth="0.68">
                    <div class="parallax-layer layer-foreground" data-scene-layer data-depth="1"><img src="assets/img/siklab/parallax-foreground-v3.webp" alt="" width="1672" height="941"></div>
                </div>
            </div>
            <div class="scene-shade" aria-hidden="true"></div>
            <div class="scene-particles" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
            <div class="opening-content page-width" data-scene-copy>
                <div class="opening-copy">
                    <p class="section-kicker">CSPC SUPREME STUDENT COUNCIL</p>
                    <h1 id="hero-heading"><img src="assets/img/siklab/wordmark.webp" width="1100" height="202" alt="SIKLAB" class="opening-wordmark"></h1>
                    <p class="event-kicker">CSPC INTRAMURALS 2026</p>
                    <p class="council-introduction">Promoting transparency and student welfare through accessible documentation and information sharing. Empowering students through leadership, service, and advocacy.</p>
                    <div class="hero-actions">
                        <a class="button button-primary" href="#official-documents">Explore Documents <span aria-hidden="true">&#8599;</span></a>
                        <a class="button button-gold" href="#executive-officers">Meet the Council</a>
                    </div>
                    <div class="opening-event">
                        <img class="opening-trophy" src="assets/img/siklab/trophy.webp" width="464" height="900" alt="The official SIKLAB trophy with seven colorful flames and a gold base">
                        <div>
                            <?php if ($event_photo): ?>
                            <button class="poster-trigger" type="button" data-event-poster-open>View event announcement <span aria-hidden="true">&#8599;</span></button>
                            <?php else: ?>
                            <p class="announcement-note">Event announcements will appear here when posted.</p>
                            <?php endif; ?>
                            <a class="about-link" href="about.php">About This Platform <span aria-hidden="true">&#8599;</span></a>
                        </div>
                    </div>
                </div>
            </div>
            <div class="opening-bottom page-width"><span>CSPC Supreme Student Council</span><a href="#official-documents">Scroll to explore <span aria-hidden="true">&#8595;</span></a><span>SIKLAB &middot; 2026</span></div>
        </div>
    </section>

    <section class="document-chapter" id="official-documents" aria-labelledby="documents-heading">
        <div class="page-width">
            <div class="chapter-heading" data-reveal>
                <div><p class="section-kicker">01 / OPEN ACCESS</p><h2 id="documents-heading">Official<br><span>Documents</span></h2></div>
                <div class="chapter-introduction"><p>Publicly accessible SSC records by category. Choose a card to discover what’s inside.</p><a href="documents.php" class="all-documents-link"><?php echo $doc_count; ?> total documents <span aria-hidden="true">↗</span></a></div>
            </div>
            <div class="document-deck">
                <?php
                $document_categories = [
                    ['treasurer', 'Treasurer', 'Financial records', 'Reports and records from the council treasurer.', $treas_count, 'fa-coins', '01'],
                    ['legislative', 'Legislative', 'Council legislation', 'Council resolutions and legislative records.', $legis_count, 'fa-gavel', '02'],
                    ['secretary', 'Secretary', 'Council documentation', 'Official records and documents from the council secretary.', $sec_count, 'fa-pen-nib', '03'],
                ];
                foreach ($document_categories as [$category, $label, $subtitle, $description, $count, $icon, $number]): ?>
                <article class="document-card category-<?php echo $category; ?>" data-document-card data-reveal>
                    <div class="card-flipper">
                        <div class="card-face card-front">
                            <span class="card-index"><?php echo $number; ?> / SSC RECORDS</span>
                            <span class="card-ornament" aria-hidden="true"><i class="fas <?php echo $icon; ?>"></i></span>
                            <div class="card-title"><p><?php echo $subtitle; ?></p><h3><?php echo $label; ?></h3></div>
                            <button type="button" class="card-flip-trigger" aria-label="Reveal <?php echo $label; ?> documents" aria-expanded="false" aria-controls="category-back-<?php echo $category; ?>" data-card-open>Explore category <span aria-hidden="true">↻</span></button>
                        </div>
                        <div class="card-face card-back" id="category-back-<?php echo $category; ?>">
                            <span class="card-index"><?php echo $label; ?> / DOCUMENTS</span>
                            <p class="card-count"><?php echo $count; ?><span>available documents</span></p>
                            <p class="card-description"><?php echo $description; ?></p>
                            <a class="card-category-link" href="documents.php?section=<?php echo $category; ?>">View files <span aria-hidden="true">↗</span></a>
                            <button type="button" class="card-reset" data-card-close aria-label="Turn <?php echo $label; ?> card back">↶ Back to card</button>
                        </div>
                    </div>
                </article>
                <?php endforeach; ?>
            </div>
            <p class="deck-note">Transparency · Leadership · Service · Advocacy</p>
        </div>
    </section>

    <section class="officer-chapter" id="executive-officers" aria-labelledby="officers-heading">
        <div class="officer-chapter-heading page-width" data-reveal><p class="section-kicker">02 / THE COUNCIL</p><h2 id="officers-heading">Executive Officers</h2><p>Meet our dedicated team of student leaders who work tirelessly to serve the CSPC community.</p><span class="roster-year">Academic Year 2025-2026</span></div>
        <nav class="officer-jump-nav" aria-label="Jump to an executive officer"><div class="page-width">
            <?php foreach ($executive_officers as $index => $officer): ?><a href="#officer-<?php echo $index + 1; ?>" aria-label="<?php echo htmlspecialchars($officer['role'], ENT_QUOTES, 'UTF-8'); ?>"><?php echo str_pad($index + 1, 2, '0', STR_PAD_LEFT); ?></a><?php endforeach; ?>
        </div></nav>
        <?php foreach ($executive_officers as $index => $officer): $officer_number = $index + 1; ?>
        <section class="officer-scene officer-color-<?php echo $index % 4; ?> <?php echo $index % 2 ? 'officer-reversed' : ''; ?>" id="officer-<?php echo $officer_number; ?>" aria-labelledby="officer-name-<?php echo $officer_number; ?>" data-officer-section>
            <div class="officer-scene-inner page-width">
                <div class="officer-copy" data-reveal>
                    <p class="section-kicker">EXECUTIVE OFFICER / <?php echo str_pad($officer_number, 2, '0', STR_PAD_LEFT); ?></p>
                    <p class="officer-role"><?php echo htmlspecialchars($officer['role']); ?></p>
                    <h3 id="officer-name-<?php echo $officer_number; ?>"><?php echo htmlspecialchars($officer['name']); ?></h3>
                    <dl class="officer-details"><div><dt>Program</dt><dd><?php echo htmlspecialchars($officer['course']); ?></dd></div><div><dt>Hometown</dt><dd><?php echo htmlspecialchars($officer['location']); ?></dd></div></dl>
                    <p class="officer-birthday"><?php echo htmlspecialchars($officer['birthday']); ?></p>
                    <div class="officer-contact-actions"><?php foreach ($officer['contacts'] as $contact): ?><a class="button <?php echo str_starts_with($contact, 'tel:') ? 'button-primary' : 'button-white'; ?>" href="<?php echo htmlspecialchars($contact, ENT_QUOTES, 'UTF-8'); ?>"><?php echo str_starts_with($contact, 'tel:') ? 'Call officer' : 'Send email'; ?> <span aria-hidden="true">↗</span></a><?php endforeach; ?></div>
                    <a class="next-officer-link" href="<?php echo $officer_number < count($executive_officers) ? '#officer-' . ($officer_number + 1) : 'officers.php'; ?>"><?php echo $officer_number < count($executive_officers) ? 'Next executive officer ↓' : 'View All Officers ↗'; ?></a>
                </div>
                <div class="officer-visual" data-reveal>
                    <span class="officer-number" aria-hidden="true"><?php echo str_pad($officer_number, 2, '0', STR_PAD_LEFT); ?></span>
                    <figure class="officer-portrait"><span class="portrait-corner corner-top" aria-hidden="true"></span><div class="portrait-image"><img src="<?php echo htmlspecialchars($officer['image'], ENT_QUOTES, 'UTF-8'); ?>" alt="<?php echo htmlspecialchars($officer['name'], ENT_QUOTES, 'UTF-8'); ?>" width="640" height="800" loading="lazy" decoding="async"><span class="portrait-placeholder" aria-hidden="true">SSC</span></div><figcaption><span>CSPC · SSC</span><span>2025—2026</span></figcaption><span class="portrait-corner corner-bottom" aria-hidden="true"></span></figure>
                </div>
            </div>
        </section>
        <?php endforeach; ?>
    </section>

    <section class="college-chapter" aria-labelledby="colleges-heading"><div class="page-width"><p class="section-kicker" id="colleges-heading">THE SEVEN COLLEGES</p><ul class="college-lineup">
        <?php foreach ([['BUHI', 'bc'], ['CAS', 'cas'], ['CCS', 'ccs'], ['CEA', 'cea'], ['CHS', 'chs'], ['CTDE', 'ctde'], ['CTHBM', 'cthbm']] as [$college, $asset]): ?>
        <li><img src="assets/img/siklab/<?php echo $asset; ?>.webp" alt="" width="240" height="240" loading="lazy"><span><?php echo $college; ?></span></li>
        <?php endforeach; ?>
    </ul></div></section>
</main>
<?php if ($event_photo): ?>
<dialog class="event-poster-dialog" id="event-poster-dialog" aria-labelledby="event-poster-heading"><form method="dialog"><button type="submit" aria-label="Close event announcement">Close ×</button></form><h2 id="event-poster-heading">Event announcement</h2><img src="<?php echo htmlspecialchars($event_photo, ENT_QUOTES, 'UTF-8'); ?>" alt="Upcoming Event"></dialog>
<?php endif; ?>
<?php include __DIR__ . '/footer.php'; ?>
</body>
</html>
