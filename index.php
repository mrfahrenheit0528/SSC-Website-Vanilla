<?php
session_start();
require_once "config/database.php";

// Dynamic counts from DB — single query with GROUP BY
$doc_count = $treas_count = $legis_count = $sec_count = 0;
$_counts_res = mysqli_query($conn, "SELECT category, COUNT(*) AS total FROM documents GROUP BY category");
if ($_counts_res) {
    while ($r = mysqli_fetch_assoc($_counts_res)) {
        $doc_count += (int)$r['total'];
        if ($r['category'] === 'treasurer')   $treas_count = (int)$r['total'];
        elseif ($r['category'] === 'legislative') $legis_count = (int)$r['total'];
        elseif ($r['category'] === 'secretary')   $sec_count   = (int)$r['total'];
    }
    mysqli_free_result($_counts_res);
}

// Get current event banner photo
$event_photo = null;
$_ep = mysqli_query($conn, "SELECT setting_value FROM site_settings WHERE setting_key='event_photo'");
if($_ep){
    $_ep_row = mysqli_fetch_assoc($_ep);
    if($_ep_row && !empty($_ep_row['setting_value']) && file_exists($_ep_row['setting_value'])){
        $event_photo = $_ep_row['setting_value'];
    }
    mysqli_free_result($_ep);
}

require_once __DIR__ . '/includes/theme.php';
$latest_documents = [];
if ($site_theme === 'siklab') {
    $latest_result = mysqli_query($conn, "SELECT id, original_name, file_path, category, created_at FROM documents ORDER BY created_at DESC LIMIT 3");
    if ($latest_result) {
        while ($row = mysqli_fetch_assoc($latest_result)) $latest_documents[] = $row;
    }
}
$page_title = $site_theme === 'siklab' ? 'SIKLAB 2026 | CSPC Supreme Student Council' : 'CSPC ? Supreme Student Council | Home';
$page_description = $site_theme === 'siklab'
    ? 'SIKLAB: CSPC Intramurals 2026. Celebrate the spirit of every team and stay connected with the CSPC Supreme Student Council.'
    : 'Promoting transparency and student welfare through accessible documentation and information sharing.';
$current_page = 'home';
include 'includes/head.php';
?>
<body class="<?php echo $site_theme === 'siklab' ? 'event-home' : 'bg-gray-50 font-sans min-h-screen flex flex-col'; ?>">
<?php if ($site_theme === 'siklab'): ?><div class="event-frame"><?php endif; ?>
<?php include 'includes/nav.php'; ?>
<?php include $site_theme === 'siklab' ? 'includes/home-siklab.php' : 'includes/home-regular.php'; ?>
