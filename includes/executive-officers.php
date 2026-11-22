<?php
require_once __DIR__ . '/current-academic-year.php';
$rosters = require __DIR__ . '/officer-rosters.php';
$manifest_file = __DIR__ . '/../assets/img/officers/manifest.json';
$portraits = is_file($manifest_file) ? (json_decode(file_get_contents($manifest_file), true) ?? []) : [];
$roles = ['President and Student Trustee', 'Vice President for External Affairs',
    'Vice President for Internal Affairs', 'Secretary', 'Treasurer',
    'Property Custodian', 'Auditor', 'Public Relations Officer'];
$officers = array_values(array_filter($rosters[SSC_CURRENT_ACADEMIC_YEAR], static fn($officer) => in_array($officer['role'], $roles, true)));
foreach ($officers as &$officer) {
    $officer['image'] = $portraits[$officer['image']]['path'] ?? 'assets/img/officers/silhouette.svg';
}
unset($officer);
return $officers;
