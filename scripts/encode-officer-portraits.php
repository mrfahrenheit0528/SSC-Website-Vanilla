<?php
// CLI-only encoding/validation. Original URLs and roster fields stay intact.
if (PHP_SAPI !== 'cli') exit(1);
ini_set('memory_limit', '512M');
$root = isset($argv[2]) ? realpath($argv[2]) : dirname(__DIR__);
if (!$root || !is_dir($root)) throw new RuntimeException('Invalid output workspace');
$sources = json_decode(file_get_contents($argv[1]), true, flags: JSON_THROW_ON_ERROR);
$directory = $root . '/assets/img/officers';
if (!is_dir($directory)) mkdir($directory, 0755, true);
$manifest = [];
$ready = 0;
foreach ($sources as $source) {
    $record = ['path' => null, 'reason' => 'Unavailable image'];
    $bytes = $source['source'] ? file_get_contents($source['source']) : false;
    $image = $bytes ? @imagecreatefromstring($bytes) : false;
    if ($image !== false) {
        $width = imagesx($image);
        $height = imagesy($image);
        $cyan = $samples = 0;
        // The provider can return its cyan error graphic with HTTP 200.
        // Check the actual pixels rather than trusting an onerror event.
        for ($y = 0; $y < $height; $y += max(1, (int)($height / 24))) {
            for ($x = 0; $x < $width; $x += max(1, (int)($width / 24))) {
                $color = imagecolorsforindex($image, imagecolorat($image, $x, $y));
                if ($color['red'] < 80 && $color['green'] > 120 && $color['blue'] > 160 && $color['blue'] > $color['red'] + 80) $cyan++;
                $samples++;
            }
        }
        $record['source_sha256'] = hash('sha256', $bytes);
        $record['source_dimensions'] = [$width, $height];
        if ($width < 64 || $height < 64 || $cyan / $samples > .6) {
            $record['reason'] = 'Provider placeholder or invalid portrait';
        } else {
            $ratio = min(1, 800 / max($width, $height));
            $prepared = imagescale($image, (int)round($width * $ratio), (int)round($height * $ratio), IMG_BICUBIC);
            imagealphablending($prepared, false);
            imagesavealpha($prepared, true);
            $record['path'] = 'assets/img/officers/' . $source['key'] . '.webp';
            if (!imagewebp($prepared, $root . '/' . $record['path'], 85)) throw new RuntimeException('Portrait encoding failed');
            imagedestroy($prepared);
            $record['reason'] = null;
            $ready++;
        }
        imagedestroy($image);
    }
    $manifest[$source['url']] = $record;
}
file_put_contents($directory . '/manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . PHP_EOL);
echo 'Prepared ' . $ready . ' local portraits; ' . (count($sources) - $ready) . ' use silhouettes.' . PHP_EOL;
