<?php $executive_officers = require __DIR__ . '/executive-officers.php'; ?>
<main id="main-content" tabindex="-1">
    <section class="event-hero" aria-labelledby="hero-heading">
        <div class="hero-film" aria-hidden="true">
            <video class="hero-video" data-hero-video data-src="assets/video/siklab-2026-loop.mp4" poster="assets/img/siklab/event-video-poster.webp" width="1280" height="720" muted loop playsinline preload="none" tabindex="-1"></video>
        </div>
        <div class="hero-shade" aria-hidden="true"></div>
        <div class="hero-center page-width">
            <h1 id="hero-heading"><span class="visually-hidden">SIKLAB: CSPC Intramurals 2026</span><img src="assets/img/siklab/wordmark.webp" width="1100" height="202" alt="" class="hero-wordmark" fetchpriority="high"></h1>
            <p class="hero-subtitle">CSPC Intramurals 2026</p>
            <p class="hero-dates"><time datetime="2026-11-23">November 23</time>–<time datetime="2026-11-28">28, 2026</time></p>
            <a class="button button-gold tally-button" href="tally.php">Official tally board</a>
        </div>
        <div class="hero-bottom page-width">
            <a class="hero-scroll-link" href="#official-documents">Explore the page</a>
            <ul class="hero-colleges" aria-label="Participating colleges">
                <?php foreach ([['BUHI', 'bc'], ['CAS', 'cas'], ['CCS', 'ccs'], ['CEA', 'cea'], ['CHS', 'chs'], ['CTDE', 'ctde'], ['CTHBM', 'cthbm']] as [$college, $asset]): ?>
                <li><img src="assets/img/siklab/<?php echo $asset; ?>.webp" alt="<?php echo $college; ?>" width="240" height="240"></li>
                <?php endforeach; ?>
            </ul>
            <button class="video-toggle" type="button" data-video-toggle hidden>Play video</button>
        </div>
    </section>

    <section class="document-chapter" id="official-documents" aria-labelledby="documents-heading">
        <div class="page-width">
            <div class="chapter-heading" data-reveal>
                <h2 id="documents-heading">OFFICIAL DOCUMENTS</h2>
                <div class="chapter-introduction"><p>Publicly accessible SSC records, all in one place. Explore a category to find the documents you need.</p><a href="documents.php" class="all-documents-link">Browse all <?php echo $doc_count; ?> documents</a></div>
            </div>
            <div class="document-deck">
                <?php
                $document_categories = [
                    ['treasurer', 'Treasurer', 'Financial records', 'Reports and records from the council treasurer.', $treas_count, 'fa-coins'],
                    ['legislative', 'Legislative', 'Council legislation', 'Council resolutions and legislative records.', $legis_count, 'fa-gavel'],
                    ['secretary', 'Secretary', 'Council documentation', 'Official records and documents from the council secretary.', $sec_count, 'fa-pen-nib'],
                ];
                foreach ($document_categories as [$category, $label, $subtitle, $description, $count, $icon]): ?>
                <article class="document-card category-<?php echo $category; ?>" data-document-card data-reveal>
                    <div class="card-flipper">
                        <div class="card-face card-front">
                            <p class="card-eyebrow"><?php echo $subtitle; ?></p>
                            <div class="document-art" aria-hidden="true"><div class="document-sheet"><span></span><span></span><span></span><i class="fas <?php echo $icon; ?>"></i></div><span class="document-stamp">SSC</span></div>
                            <h3><?php echo $label; ?></h3>
                            <button type="button" class="card-flip-trigger" aria-label="Reveal <?php echo $label; ?> documents" aria-expanded="false" aria-controls="category-back-<?php echo $category; ?>" data-card-open></button>
                        </div>
                        <div class="card-face card-back" id="category-back-<?php echo $category; ?>">
                            <p class="card-eyebrow"><?php echo $label; ?></p>
                            <p class="card-count"><?php echo $count; ?><span>available documents</span></p>
                            <p class="card-description"><?php echo $description; ?></p>
                            <a class="card-category-link" href="documents.php?section=<?php echo $category; ?>">View documents</a>
                            <button type="button" class="card-reset" data-card-close aria-label="Turn <?php echo $label; ?> card back"></button>
                        </div>
                    </div>
                </article>
                <?php endforeach; ?>
            </div>
        </div>
    </section>

    <section class="officer-chapter" id="executive-officers" aria-labelledby="officers-heading">
        <div class="officer-scroll" data-officer-scroll>
            <div class="officer-rail" data-officer-rail>
                <div class="chapter-heading officer-heading page-width">
                    <h2 id="officers-heading">EXECUTIVE OFFICERS</h2>
                    <div class="chapter-introduction"><p>Meet our dedicated team of student leaders serving the CSPC community.</p><span class="roster-year">Academic Year <?php echo SSC_CURRENT_ACADEMIC_YEAR_LABEL; ?></span></div>
                </div>
                <div class="officer-track" data-officer-track>
                    <?php foreach ($executive_officers as $index => $officer): $officer_number = $index + 1; ?>
                    <section class="officer-panel officer-color-<?php echo $index % 4; ?>" id="officer-<?php echo $officer_number; ?>" aria-labelledby="officer-name-<?php echo $officer_number; ?>" data-officer-section>
                        <div class="officer-copy">
                            <p class="officer-role"><?php echo htmlspecialchars($officer['role']); ?></p>
                            <h3 id="officer-name-<?php echo $officer_number; ?>"><?php echo htmlspecialchars($officer['name']); ?></h3>
                            <dl class="officer-details"><div><dt>Program</dt><dd><?php echo htmlspecialchars($officer['course']); ?></dd></div><div><dt>Hometown</dt><dd><?php echo htmlspecialchars($officer['location']); ?></dd></div></dl>
                            <p class="officer-birthday"><?php echo htmlspecialchars($officer['birthday']); ?></p>
                            <div class="officer-contact-actions"><?php foreach ($officer['contacts'] as $contact): ?><a class="officer-contact" href="<?php echo htmlspecialchars($contact, ENT_QUOTES, 'UTF-8'); ?>"><?php echo str_starts_with($contact, 'tel:') ? 'Call officer' : 'Send email'; ?></a><?php endforeach; ?></div>
                        </div>
                        <figure class="officer-portrait"><div class="portrait-image"><img src="<?php echo htmlspecialchars($officer['image'], ENT_QUOTES, 'UTF-8'); ?>" alt="<?php echo htmlspecialchars($officer['name'], ENT_QUOTES, 'UTF-8'); ?>" width="640" height="800" loading="lazy" decoding="async"><span class="portrait-placeholder" aria-hidden="true">SSC</span></div><figcaption>CSPC Supreme Student Council</figcaption></figure>
                    </section>
                    <?php endforeach; ?>
                </div>
                <div class="officer-rail-controls page-width" data-rail-controls hidden>
                    <p>Scroll down to meet the council</p>
                    <div class="officer-progress" aria-hidden="true"><span data-rail-progress></span></div>
                    <span class="officer-position" data-rail-position>1 / <?php echo count($executive_officers); ?></span>
                    <div class="officer-buttons"><button type="button" data-rail-previous aria-label="Previous executive officer">Previous</button><button type="button" data-rail-next aria-label="Next executive officer">Next</button></div>
                </div>
            </div>
        </div>
        <div class="officer-end page-width"><a class="button button-primary" href="officers.php">View all officers</a></div>
    </section>
</main>
<?php include __DIR__ . '/footer.php'; ?>
</body>
</html>
