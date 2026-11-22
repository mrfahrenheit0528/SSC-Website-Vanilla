<?php
session_start();
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/current-academic-year.php';
$categories = [
    'treasurer' => ['name' => 'Treasurer Files', 'role' => 'Treasurer'],
    'legislative' => ['name' => 'Legislative Files', 'role' => 'Vice President for Internal Affairs'],
    'secretary' => ['name' => 'Secretary Files', 'role' => 'Secretary'],
];
$section = is_string($_GET['section'] ?? null) && isset($categories[$_GET['section']]) ? $_GET['section'] : 'all';
$search = is_string($_GET['search'] ?? null) ? trim(substr($_GET['search'], 0, 640)) : '';
$escape = static fn($value) => htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$library_url = static function ($category = 'all', $query = '', $library_page = 1) {
    $params = [];
    if ($category !== 'all') $params['section'] = $category;
    if ($query !== '') $params['search'] = $query;
    if ($library_page > 1) $params['page'] = $library_page;
    return 'documents.php' . ($params ? '?' . http_build_query($params) : '');
};
$counts = ['all' => 0] + array_fill_keys(array_keys($categories), 0);
$count_result = $conn->query('SELECT category, COUNT(*) AS total FROM documents GROUP BY category');
while ($count = $count_result->fetch_assoc()) {
    $counts['all'] += (int)$count['total'];
    if (isset($categories[$count['category']])) $counts[$count['category']] = (int)$count['total'];
}
$sql = 'SELECT d.id, d.original_name, d.file_path, d.category, d.created_at, COALESCE(NULLIF(d.display_name, \'\'), u.name) AS display_label FROM documents d JOIN users u ON d.uploaded_by = u.id';
$conditions = $params = [];
$types = '';
if ($section !== 'all') {
    $conditions[] = 'd.category = ?';
    $params[] = $section;
    $types .= 's';
}
if ($search !== '') {
    $conditions[] = '(d.original_name LIKE ? OR d.description LIKE ?)';
    $params[] = '%' . $search . '%';
    $params[] = '%' . $search . '%';
    $types .= 'ss';
}
if ($conditions) $sql .= ' WHERE ' . implode(' AND ', $conditions);
$count_sql = 'SELECT COUNT(*) AS total FROM documents d JOIN users u ON d.uploaded_by = u.id' . ($conditions ? ' WHERE ' . implode(' AND ', $conditions) : '');
$stmt = $conn->prepare($count_sql);
if ($params) $stmt->bind_param($types, ...$params);
$stmt->execute();
$total = (int)$stmt->get_result()->fetch_assoc()['total'];
$stmt->close();
$page_size = 12;
$total_pages = max(1, (int)ceil($total / $page_size));
$requested_page = is_string($_GET['page'] ?? null) ? filter_var($_GET['page'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) : false;
$library_page = min($requested_page ?: 1, $total_pages);
$offset = ($library_page - 1) * $page_size;
$sql .= ' ORDER BY d.created_at DESC, d.id DESC LIMIT ? OFFSET ?';
$params[] = $page_size;
$params[] = $offset;
$types .= 'ii';
$stmt = $conn->prepare($sql);
if ($params) $stmt->bind_param($types, ...$params);
$stmt->execute();
$documents = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$office_holders = [];
if ($section !== 'all') {
    $rosters = require __DIR__ . '/includes/officer-rosters.php';
    $portraits = json_decode(file_get_contents(__DIR__ . '/assets/img/officers/manifest.json'), true) ?? [];
    foreach (array_reverse($rosters, true) as $year => $roster) {
        foreach ($roster as $officer) {
            if ($officer['role'] !== $categories[$section]['role']) continue;
            $officer['year'] = (string)$year;
            $officer['portrait'] = $portraits[$officer['image']]['path'] ?? 'assets/img/officers/silhouette.svg';
            $office_holders[] = $officer;
            break;
        }
    }
}
// Keep public links compatible with legacy Windows upload paths and encode
// filenames as URL segments (including spaces, apostrophes and # characters).
$public_file = static function ($stored_path) {
    $path = str_replace('\\', '/', $stored_path);
    if (preg_match('~(?:^|/)((?:uploads|documents)/.+)$~i', $path, $match)) $path = $match[1];
    else return null;
    $parts = explode('/', $path);
    if (in_array('..', $parts, true) || str_contains($path, "\0") || str_contains($path, '?')) return null;
    return ['path' => $path, 'url' => implode('/', array_map('rawurlencode', $parts))];
};
$page_title = 'Official Documents | CSPC Supreme Student Council';
$page_description = 'Access official SSC documents, Treasurer files, Legislative files and Secretary records.';
$current_page = 'documents';
include __DIR__ . '/includes/head.php';
?>
<body class="documents-page min-h-screen flex flex-col">
<?php include __DIR__ . '/includes/nav.php'; ?>
<main id="main-content" class="library-main" tabindex="-1">
    <header class="library-introduction library-width">
        <div><p class="library-kicker">CSPC SUPREME STUDENT COUNCIL</p><h1>OFFICIAL DOCUMENTS</h1><p class="library-lead">Official SSC documents &mdash; Treasurer, Legislative &amp; Secretary records.<br>Accessible information. Transparent student leadership.</p></div>
        <img class="library-crest" src="assets/static/SSC%20LOGO.png" width="1437" height="1570" alt="CSPC Supreme Student Council">
    </header>
    <section class="library-tools library-width" aria-label="Document library controls">
        <div><p class="library-control-label" id="library-category-label">Browse by office</p>
            <nav class="library-categories" aria-labelledby="library-category-label" data-library-categories>
                <?php foreach (['all' => ['name' => 'All Documents']] + $categories as $key => $category): ?>
                <a class="library-category category-<?php echo $key; ?><?php if ($key === $section): ?> is-selected<?php endif; ?>" href="<?php echo $escape($library_url($key, $search)); ?>" data-library-category="<?php echo $key; ?>" <?php if ($key === $section): ?>aria-current="page"<?php endif; ?>><span><?php echo $category['name']; ?></span><span class="library-category-count" aria-label="<?php echo $counts[$key]; ?> documents in this category"><?php echo $counts[$key]; ?></span></a>
                <?php endforeach; ?>
            </nav>
        </div>
        <form class="library-search" method="get" action="documents.php" role="search" data-library-search>
            <input type="hidden" name="section" value="<?php echo $section; ?>" data-library-section>
            <label for="document-search">Find a document</label>
            <div class="library-search-controls"><div class="library-search-field"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input id="document-search" type="search" name="search" maxlength="160" value="<?php echo $escape($search); ?>" placeholder="Search titles or descriptions" autocomplete="off"></div><button type="submit" class="library-button">Search</button></div>
        </form>
        <p class="library-load-status" role="status" aria-live="polite" data-library-status hidden></p>
    </section>

    <?php if (($_GET['error'] ?? '') === 'notfound'): ?><p class="library-notice library-width" role="status">That document could not be found. Browse the available records below.</p><?php endif; ?>
    <section class="library-results library-width" id="library-results" tabindex="-1" aria-labelledby="library-results-title" data-library-results data-section="<?php echo $section; ?>" data-search="<?php echo $escape($search); ?>" data-page="<?php echo $library_page; ?>">
        <header class="library-results-heading"><div><h2 id="library-results-title"><?php echo $section === 'all' ? 'All Documents' : $categories[$section]['name']; ?></h2><p><?php echo $total; ?> document<?php echo $total === 1 ? '' : 's'; ?><?php if ($search !== ''): ?> matching &ldquo;<?php echo $escape($search); ?>&rdquo;<?php endif; ?></p></div><?php if ($search !== ''): ?><a class="library-clear" href="<?php echo $escape($library_url($section)); ?>" data-library-link>Clear search</a><?php endif; ?></header>

        <?php if ($office_holders): ?>
        <aside class="library-holders" aria-labelledby="library-holders-title"><h3 id="library-holders-title">OFFICE HOLDERS</h3><div class="library-holder-grid">
            <?php foreach ($office_holders as $officer): $is_current = $officer['year'] === SSC_CURRENT_ACADEMIC_YEAR; ?>
            <a class="library-holder<?php if ($is_current): ?> is-current<?php endif; ?>" href="officers.php?year=<?php echo $officer['year']; ?>"><img src="<?php echo $escape($officer['portrait']); ?>" width="640" height="800" alt="" loading="lazy" data-holder-portrait><div><p class="library-holder-year"><?php if ($is_current): ?>Current &middot; <?php endif; ?>AY <?php echo $officer['year']; ?>&ndash;<?php echo (int)$officer['year'] + 1; ?></p><h4><?php echo $escape($officer['name']); ?></h4><p><?php echo $escape($officer['role']); ?></p><p class="library-holder-course"><?php echo $escape($officer['course']); ?></p></div></a>
            <?php endforeach; ?>
        </div></aside>
        <?php endif; ?>

        <?php if (!$documents): ?>
        <div class="library-empty"><span class="library-empty-icon" aria-hidden="true"><i class="far fa-folder-open"></i></span><h3>No documents found</h3><p><?php echo $search !== '' ? 'Try a different title or description, or clear your search.' : 'There are no documents in this category yet.'; ?></p><?php if ($search !== '' || $section !== 'all'): ?><a class="library-button" href="documents.php" data-library-link>View all documents</a><?php endif; ?></div>
        <?php else: ?>
        <div class="library-grid">
            <?php foreach ($documents as $doc): $file = $public_file($doc['file_path']); $category = isset($categories[$doc['category']]) ? $doc['category'] : 'other'; $timestamp = strtotime($doc['created_at']); $download_url = $file ? $file['url'] . '?v=' . $doc['id'] . '-' . $timestamp : null; ?>
            <article class="library-card category-<?php echo $category; ?>" data-document-record>
                <div class="library-card-top"><span class="library-file-icon" aria-hidden="true"><svg viewBox="0 0 32 38" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 1H2v36h28V11L20 1Z"/><path d="M20 1v10h10M8 20h16M8 26h16"/></svg><span>PDF</span></span><span class="library-file-category"><?php echo $escape($categories[$category]['name'] ?? ucfirst($doc['category'] ?: 'Document')); ?></span></div>
                <h3><?php echo $escape($doc['original_name']); ?></h3>
                <dl class="library-file-meta"><div><dt>Published by</dt><dd><?php echo $escape($doc['display_label'] ?: 'SSC'); ?></dd></div><div><dt>Date uploaded</dt><dd><time datetime="<?php echo date('Y-m-d', $timestamp); ?>"><?php echo date('M d, Y', $timestamp); ?></time></dd></div></dl>
                <div class="library-file-actions">
                    <?php if ($file): ?>
                    <a class="library-button" href="pdfviewer.php?file=<?php echo rawurlencode($file['path']); ?>" aria-label="<?php echo $escape('View ' . $doc['original_name']); ?>">View document</a>
                    <button class="library-icon-button" type="button" data-document-qr="<?php echo $escape($download_url); ?>" data-document-name="<?php echo $escape($doc['original_name']); ?>" aria-label="<?php echo $escape('QR code for ' . $doc['original_name']); ?>" title="Show QR code" hidden><i class="fas fa-qrcode" aria-hidden="true"></i></button>
                    <a class="library-icon-button" href="<?php echo $escape($download_url); ?>" download aria-label="<?php echo $escape('Download ' . $doc['original_name']); ?>" title="Download PDF"><i class="fas fa-download" aria-hidden="true"></i></a>
                    <?php else: ?><span class="library-unavailable">Document link unavailable</span><?php endif; ?>
                </div>
            </article>
            <?php endforeach; ?>
        </div>
        <?php if ($total_pages > 1): ?>
        <nav class="library-pagination" aria-label="Document pages"><p>Showing <?php echo $offset + 1; ?>&ndash;<?php echo min($offset + $page_size, $total); ?> of <?php echo $total; ?> documents</p><div><?php if ($library_page > 1): ?><a href="<?php echo $escape($library_url($section, $search, $library_page - 1)); ?>" data-library-link data-library-page>Previous</a><?php endif; ?><span aria-current="page">Page <?php echo $library_page; ?> of <?php echo $total_pages; ?></span><?php if ($library_page < $total_pages): ?><a href="<?php echo $escape($library_url($section, $search, $library_page + 1)); ?>" data-library-link data-library-page>Next</a><?php endif; ?></div></nav>
        <?php endif; ?>
        <?php endif; ?>
    </section>
</main>
<dialog class="library-qr-dialog" aria-labelledby="library-qr-title" data-library-qr>
    <div class="library-qr-heading"><h2 id="library-qr-title">Document QR code</h2><form method="dialog"><button class="library-icon-button" aria-label="Close QR code"><i class="fas fa-times" aria-hidden="true"></i></button></form></div>
    <p class="library-qr-name" data-qr-name></p><div class="library-qr-image" data-qr-image></div><p class="library-qr-status" role="status" data-qr-status></p><p>Scan to view or download this document.</p><a class="library-button" data-qr-link>Open document</a>
</dialog>
<?php include __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
