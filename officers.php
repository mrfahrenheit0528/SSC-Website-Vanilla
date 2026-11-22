<?php
session_start();
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/current-academic-year.php';
$rosters = require __DIR__ . '/includes/officer-rosters.php';
$offices = require __DIR__ . '/includes/council-offices.php';
$executive_roles = require __DIR__ . '/includes/executive-roles.php';
$portrait_manifest = __DIR__ . '/assets/img/officers/manifest.json';
$portraits = is_file($portrait_manifest) ? (json_decode(file_get_contents($portrait_manifest), true) ?? []) : [];
$year = is_string($_GET['year'] ?? null) && isset($rosters[$_GET['year']]) ? $_GET['year'] : SSC_CURRENT_ACADEMIC_YEAR;
if ($year === SSC_CURRENT_ACADEMIC_YEAR) {
    $offices = ['presidency' => $offices['presidency'], 'external-affairs' => $offices['external-affairs'], 'internal-affairs' => $offices['internal-affairs']] + $offices;
}
$year_label = $year . '–' . ((int)$year + 1);
$search = is_string($_GET['q'] ?? null) ? trim(substr($_GET['q'], 0, 160)) : '';
$query = strtolower($search);
$escape = static fn($value) => htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$groups = [];
$visible_count = 0;
foreach ($offices as $office_id => $office) {
    $members = array_values(array_filter($rosters[$year], static fn($member) => $member['office'] === $office_id));
    if (!$members) continue;
    $count = 0;
    foreach ($members as &$member) {
        $member['search_text'] = $member['name'] . ' ' . $member['role'] . ' ' . $office['name'];
        $member['matches'] = $query === '' || str_contains(strtolower($member['search_text']), $query);
        if ($member['matches']) $count++;
    }
    unset($member);
    $groups[$office_id] = [...$office, 'members' => $members, 'visible' => $count];
    $visible_count += $count;
}
$page_title = 'Our Officers | CSPC Supreme Student Council';
$page_description = 'Meet the dedicated student leaders who serve the CSPC community. Explore council offices and academic-year rosters.';
$current_page = 'officers';
include __DIR__ . '/includes/head.php';
?>
<body class="officers-page min-h-screen flex flex-col">
<?php include __DIR__ . '/includes/nav.php'; ?>
<main id="main-content" class="directory-main" tabindex="-1">
    <header class="directory-introduction directory-width">
        <div>
            <p class="directory-kicker">CSPC SUPREME STUDENT COUNCIL</p>
            <h1>OUR OFFICERS</h1>
            <p class="directory-lead">Meet the dedicated student leaders who serve the CSPC community with passion, integrity, and commitment to excellence.</p>
        </div>
        <div class="directory-brand"><img src="assets/static/SSC%20LOGO.png" width="1437" height="1570" alt="CSPC Supreme Student Council"></div>
    </header>

    <section class="directory-tools directory-width" aria-label="Officer directory controls">
        <nav class="directory-years" aria-label="Academic year">
            <p class="directory-control-label">Academic year</p>
            <div class="directory-year-options" data-directory-year-tabs>
            <?php foreach (array_keys($rosters) as $roster_year): $label = $roster_year . '–' . ($roster_year + 1); ?>
            <a id="directory-year-<?php echo $roster_year; ?>" data-directory-year="<?php echo $roster_year; ?>" class="directory-year-link <?php echo (string)$roster_year === $year ? 'is-selected' : ''; ?>" href="officers.php?year=<?php echo $roster_year; ?>" <?php if ((string)$roster_year === $year): ?>aria-current="page"<?php endif; ?>><?php echo $escape($label); ?></a>
            <?php endforeach; ?>
            </div>
        </nav>
        <?php if ($rosters[$year]): ?>
        <div class="directory-filters">
            <form class="directory-search" method="get" action="officers.php" role="search">
                <input type="hidden" name="year" value="<?php echo $escape($year); ?>" data-directory-year-field>
                <label for="officer-search">Find an officer</label>
                <div class="directory-search-field"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input type="search" id="officer-search" name="q" value="<?php echo $escape($search); ?>" maxlength="160" placeholder="Search by name, role or office" autocomplete="off" data-officer-search></div>
                <noscript><button class="directory-submit" type="submit">Search officers</button></noscript>
            </form>
            <label class="directory-jump" data-office-navigation hidden>Jump to an office<select aria-label="Jump to an office" data-office-jump><option value="">Choose an office</option><?php foreach ($groups as $office_id => $office): ?><option value="office-<?php echo $office_id; ?>" <?php if (!$office['visible']): ?>hidden disabled<?php endif; ?>><?php echo $escape($office['short']); ?></option><?php endforeach; ?></select></label>
        </div>
        <noscript><nav class="directory-index" aria-label="Council offices"><?php foreach ($groups as $office_id => $office): if (!$office['visible']) continue; ?><a href="#office-<?php echo $office_id; ?>"><?php echo $escape($office['short']); ?></a><?php endforeach; ?></nav></noscript>
        <?php endif; ?>
        <p class="directory-year-status" role="status" aria-live="polite" data-directory-year-status hidden></p>
    </section>

    <div class="directory-offices directory-width" id="directory-roster-panel" data-directory-content>
        <?php foreach ($groups as $office_id => $office): ?>
        <section class="office-section office-<?php echo $office_id; ?>" id="office-<?php echo $office_id; ?>" aria-labelledby="heading-<?php echo $office_id; ?>" data-office-section <?php if (!$office['visible']): ?>hidden<?php endif; ?>>
            <header class="office-heading" data-directory-reveal><h2 id="heading-<?php echo $office_id; ?>" aria-label="<?php echo $escape($office['name']); ?>"><span class="office-title-full"><?php echo $escape($office['name']); ?></span><span class="office-title-compact"><?php echo $escape($office['short']); ?></span></h2><span data-office-count><?php echo $office['visible']; ?> <?php echo $office['visible'] === 1 ? 'officer' : 'officers'; ?></span></header>
            <div class="office-grid <?php echo count($office['members']) === 1 ? 'is-solo' : ''; ?>">
                <?php foreach ($office['members'] as $member):
                    $portrait = $portraits[$member['image']]['path'] ?? null;
                    $has_portrait = $portrait && is_file(__DIR__ . '/' . $portrait);
                    $birthday = trim(preg_replace('/^Birthday:\s*/', '', $member['birthday']));
                    $phone = array_values(array_filter($member['contacts'], static fn($contact) => str_starts_with($contact, 'tel:')))[0] ?? null;
                    $email = array_values(array_filter($member['contacts'], static fn($contact) => str_starts_with($contact, 'mailto:')))[0] ?? null;
                ?>
                <article class="directory-card<?php if (in_array($member['role'], $executive_roles, true)): ?> is-executive<?php endif; ?>" data-directory-card data-directory-reveal data-search-text="<?php echo $escape($member['search_text']); ?>" <?php if (!$member['matches']): ?>hidden<?php endif; ?>>
                    <div class="directory-portrait <?php echo $has_portrait ? '' : 'is-unavailable'; ?>"><span class="directory-photo-fallback" aria-hidden="true"><svg viewBox="0 0 200 240" fill="currentColor"><circle cx="100" cy="69" r="43"/><path d="M100 123c-49 0-81 31-81 81v25h162v-25c0-50-32-81-81-81Z"/></svg></span><?php if ($has_portrait): ?><img src="<?php echo $escape($portrait); ?>" alt="<?php echo $escape($member['name']); ?>" width="640" height="800" loading="lazy" decoding="async"><?php endif; ?></div>
                    <div class="directory-card-content">
                        <p class="directory-role"><?php echo $escape($member['role']); ?></p>
                        <h3><?php echo $escape($member['name']); ?></h3>
                        <dl class="directory-details">
                            <?php foreach (['Program' => $member['course'], 'Hometown' => $member['location'], 'Birthday' => $birthday] as $field => $value): ?>
                            <div><dt><?php echo $field; ?></dt><dd<?php if ($value === ''): ?> class="directory-placeholder"<?php endif; ?>><?php echo $escape($value !== '' ? $value : 'Not provided'); ?></dd></div>
                            <?php endforeach; ?>
                        </dl>
                        <div class="directory-contacts">
                            <?php foreach ([['Call officer', $phone, 'Phone number'], ['Send email', $email, 'Email address']] as [$label, $contact, $detail]): ?>
                            <?php if ($contact): ?><a href="<?php echo $escape($contact); ?>" aria-label="<?php echo $escape(($detail === 'Phone number' ? 'Call ' : 'Email ') . $member['name']); ?>"><?php echo $label; ?></a>
                            <?php else: ?><button type="button" class="directory-contact-unavailable" disabled title="<?php echo $detail; ?> not provided" aria-label="<?php echo $escape($label . ' — ' . $detail . ' not provided for ' . $member['name']); ?>"><?php echo $label; ?></button><?php endif; ?>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </article>
                <?php endforeach; ?>
            </div>
        </section>
        <?php endforeach; ?>
        <?php if (!$rosters[$year]): ?>
        <section class="directory-empty" aria-labelledby="roster-pending"><p class="directory-kicker">ACADEMIC YEAR <?php echo $escape($year_label); ?></p><h2 id="roster-pending">Coming Soon</h2><p>The officers for Academic Year <?php echo $escape($year_label); ?> will be announced soon.</p><a href="officers.php?year=2025">View the 2025–2026 officers</a></section>
        <?php else: ?>
        <div class="directory-empty" role="status" data-directory-empty <?php if ($visible_count): ?>hidden<?php endif; ?>><h2>No officers found</h2><p>Try another name, role or office, or clear your search.</p></div>
        <?php endif; ?>
    </div>
</main>
<?php include __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
