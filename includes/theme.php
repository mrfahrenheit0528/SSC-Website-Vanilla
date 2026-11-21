<?php
// SIKLAB stays active for the whole of December 5, 2026 in the owner's timezone.
// Query parameters and old preference cookies cannot override this schedule.
function ssc_theme_for_time(?DateTimeImmutable $now = null): string
{
    $timezone = new DateTimeZone('Asia/Taipei');
    $cutoff = new DateTimeImmutable('2026-12-06 00:00:00', $timezone);
    return ($now ?? new DateTimeImmutable('now', $timezone)) < $cutoff ? 'siklab' : 'regular';
}

$site_theme = ssc_theme_for_time();
