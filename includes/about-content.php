<?php
// Keep original platform credits while deriving current service from the shared roster.
require_once __DIR__ . '/current-academic-year.php';
$platform_rosters = require __DIR__ . '/officer-rosters.php';
$platform_current_officers = array_column($platform_rosters[SSC_CURRENT_ACADEMIC_YEAR], null, 'name');
$platform_profiles = [
    'jeriel' => [
        'name' => 'Jeriel Agua', 'cardName' => 'Jeriel Agua', 'role' => 'PRO', 'rosterName' => 'Jeriel L. Agua',
        'project' => 'TransFormation: An Information Disclosure System',
        'image' => 'https://i.ibb.co/FLSYqMqP/Jeriel-Agua.png',
        'currentRole' => 'P.R.O. AY 2025-2026',
        'history' => [
            ['year' => '2025-2026', 'position' => 'P.R.O.'],
            ['year' => '2024-2025', 'position' => 'Assistant P.R.O. Multimedia and Design Officer'],
        ],
    ],
    'jessil' => [
        'name' => 'Jessil C. Martinez', 'cardName' => 'Jessil C. Martinez', 'role' => 'Treasurer', 'rosterName' => 'Jessil C. Martinez',
        'project' => 'FinTech: Empowering Financial Transparency',
        'image' => 'https://i.ibb.co/WvwNbFN7/Jessil-Martinez.png',
        'currentRole' => 'Treasurer AY 2025-2026',
        'history' => [
            ['year' => '2025-2026', 'position' => 'Treasurer'],
            ['year' => '2024-2025', 'position' => 'Treasurer'],
        ],
    ],
    'ralph' => [
        'name' => 'Ralph Joefrancis Abonal', 'cardName' => 'Ralph Abonal', 'role' => 'Secretary', 'rosterName' => 'Ralph Joefrancis D. Abonal',
        'project' => 'Document Management and Tracking for Council Files',
        'image' => 'https://i.ibb.co/Cp00D5nf/Ralph-Joefrancis-Abonal.png',
        'currentRole' => 'Secretary AY 2025-2026',
        'history' => [
            ['year' => '2025-2026', 'position' => 'Secretary'],
            ['year' => '2024-2025', 'position' => 'Assistant Secretary'],
        ],
    ],
    'jancee' => [
        'name' => 'Jancee Kenn Abonita', 'cardName' => 'Jancee Kenn Abonita', 'role' => 'Assistant P.R.O. Technical Director', 'rosterName' => 'Jancee Kenn E. Abonita',
        'project' => 'Platform Architecture & Development Lead',
        'image' => 'https://i.ibb.co/5hvDh0Dj/Jancee-Kenn-Abonita.png',
        'currentRole' => 'Assistant P.R.O. Technical Director AY 2025-2026',
        'history' => [
            ['year' => '2025-2026', 'position' => 'Assistant P.R.O. Technical Director'],
            ['year' => '2024-2025', 'position' => 'Assistant P.R.O. Multimedia and Design Officer/Technical'],
        ],
    ],
    'joberth' => [
        'name' => 'Joberth Iballar', 'cardName' => 'Joberth Iballar', 'role' => 'Auditor', 'rosterName' => 'Joberth B. Iballar',
        'project' => 'E-Audit Compass',
        'image' => 'https://i.ibb.co/Qv1rPHBq/Joberth-Iballar.png',
        'currentRole' => 'Auditor AY 2025-2026',
        'history' => [
            ['year' => '2025-2026', 'position' => 'Auditor'],
            ['year' => '2024-2025', 'position' => 'Assistant Auditor'],
            ['year' => '2023-2024', 'position' => 'Environmental Concerns Committee Director'],
        ],
    ],
];
$platform_portraits = json_decode(file_get_contents(__DIR__ . '/../assets/img/officers/manifest.json'), true) ?? [];
foreach ($platform_profiles as &$profile) {
    $current_officer = $platform_current_officers[$profile['rosterName']] ?? null;
    $profile['isCurrent'] = $current_officer !== null;
    $profile['termLabel'] = $current_officer ? 'Current officer · AY ' . SSC_CURRENT_ACADEMIC_YEAR_LABEL : 'Previous term · AY 2025–2026';
    if ($current_officer) {
        $profile['role'] = $current_officer['role'];
        $profile['currentRole'] = $current_officer['role'] . ' · AY ' . SSC_CURRENT_ACADEMIC_YEAR_LABEL;
        $profile['image'] = $current_officer['image'] ?: $profile['image'];
        array_unshift($profile['history'], ['year' => SSC_CURRENT_ACADEMIC_YEAR_LABEL, 'position' => $current_officer['role'], 'current' => true]);
    }
    $profile['image'] = $platform_portraits[$profile['image']]['path'] ?? 'assets/img/officers/silhouette.svg';
}
unset($profile);
$about_escape = static fn($value) => htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
?>
<section class="about-team about-width" id="about-platform-content" aria-labelledby="about-team-title">
    <header class="about-team-heading"><div><p class="about-kicker">THE PEOPLE BEHIND THE PLATFORM</p><h2 id="about-team-title">Platform Proposers &amp; Developers</h2></div><p class="about-team-year">Original team &middot; AY 2025&ndash;2026</p></header>
    <div class="about-team-grid">
        <?php foreach ($platform_profiles as $profile_id => $profile): ?>
        <article class="about-developer">
            <div class="about-developer-photo"><img src="<?php echo $about_escape($profile['image']); ?>" width="640" height="800" alt="<?php echo $about_escape($profile['name']); ?>" loading="lazy" decoding="async" data-about-portrait></div>
            <div class="about-developer-content"><p class="about-developer-term<?php echo $profile['isCurrent'] ? ' is-current' : ''; ?>"><?php echo $about_escape($profile['termLabel']); ?></p><p class="about-developer-role"><?php echo $about_escape($profile['role']); ?></p><h3><?php echo $about_escape($profile['cardName']); ?></h3><p class="about-developer-project"><?php echo $about_escape($profile['project']); ?></p><button type="button" class="about-profile-button" data-profile-open="<?php echo $profile_id; ?>" aria-haspopup="dialog" aria-controls="profileModal" aria-label="<?php echo $about_escape('View profile of ' . $profile['name']); ?>" hidden>View profile</button>
                <details class="about-history-fallback" data-profile-fallback><summary>Position history</summary><ul><?php foreach ($profile['history'] as $position): ?><li><strong><?php echo $about_escape($position['position']); ?></strong><span>Academic Year <?php echo $about_escape($position['year']); ?></span></li><?php endforeach; ?></ul></details>
            </div>
        </article>
        <?php endforeach; ?>
    </div>
    <p class="about-team-note">CSPC Supreme Student Council &middot; Original platform team</p>
</section>
<dialog id="profileModal" class="about-profile-dialog" aria-labelledby="profileName" aria-describedby="profileCurrentRole">
    <form method="dialog" class="about-profile-close"><button type="submit" aria-label="Close profile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></form>
    <div class="about-profile-heading"><img id="profileImage" width="640" height="800" alt="" data-about-portrait><div><p class="about-kicker">PLATFORM PROPONENT</p><h2 id="profileName"></h2><p id="profileTerm" class="about-profile-term"></p><p id="profileCurrentRole"></p></div></div>
    <div class="about-profile-body"><section class="about-profile-contribution" aria-labelledby="profileContributionHeading"><h3 id="profileContributionHeading">Platform contribution</h3><p id="profileProject" class="about-profile-project"></p></section><h3>Position history</h3><ul id="profileHistory" class="about-profile-history"></ul></div>
</dialog>
<script id="platform-profiles" type="application/json"><?php echo json_encode($platform_profiles, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE); ?></script>
