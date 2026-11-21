<?php
// Deterministic web-size encodings of the supplied artwork. Originals stay intact.
if (PHP_SAPI !== 'cli') exit(1);
ini_set('memory_limit', '512M');
$root = dirname(__DIR__);
$output = $root . '/assets/img/siklab';
if (!is_dir($output)) mkdir($output, 0755, true);
$assets = ['Throphy' => ['trophy', 900], 'SIKLAB' => ['wordmark', 1100],
    'BC' => ['bc', 240], 'CAS' => ['cas', 240], 'CCS' => ['ccs', 240],
    'CEA' => ['cea', 240], 'CHS' => ['chs', 240], 'CTDE' => ['ctde', 240], 'CTHBM' => ['cthbm', 240],
    'parallax-v3/sky' => ['parallax-sky-v3', 1920, 88],
    'parallax-v3/distance' => ['parallax-distance-v3', 1920, 88],
    'parallax-v3/campus' => ['parallax-campus-v3', 1920, 88],
    'parallax-v3/monument' => ['parallax-monument-v3', 1920, 88],
    'parallax-v3/foreground' => ['parallax-foreground-v3', 1920, 88]];
foreach ($assets as $source => $specification) {
    [$name, $size] = $specification;
    $quality = $specification[2] ?? 88;
    // Some supplied PNGs have a legacy ICC profile. Preserve pixel colors while
    // discarding profile metadata in the web encoding; fail on unreadable input.
    $image = @imagecreatefrompng($root . '/assets/static/' . $source . '.png');
    if ($image === false) throw new RuntimeException('Cannot read visual asset: ' . $source);
    if (str_starts_with($source, 'parallax-v3/')) {
        [$registered_width, $registered_height] = getimagesize($root . '/assets/static/parallax-v3/master.png');
        if (abs(imagesx($image) - $registered_width) > 1 || abs(imagesy($image) - $registered_height) > 1) {
            throw new RuntimeException('Parallax layer exceeds registration tolerance: ' . $source);
        }
        // The recolored monument export is one pixel narrower. Normalize that
        // export rounding difference without cropping the shared scene canvas.
        if (imagesx($image) !== $registered_width || imagesy($image) !== $registered_height) {
            $registered = imagescale($image, $registered_width, $registered_height, IMG_BICUBIC);
            imagedestroy($image);
            $image = $registered;
        }
    }
    // Parallax layers share a full-size registration canvas. Cropping their alpha
    // would shift the scenery and destroy alignment between independent planes.
    $cropped = $source === 'Throphy' || str_starts_with($source, 'parallax-v3/')
        ? false : imagecropauto($image, IMG_CROP_TRANSPARENT);
    if ($cropped !== false) {
        imagedestroy($image);
        $image = $cropped;
    }
    $ratio = min(1, $size / max(imagesx($image), imagesy($image)));
    $result = imagescale($image, max(1, (int)round(imagesx($image) * $ratio)), max(1, (int)round(imagesy($image) * $ratio)), IMG_BICUBIC);
    imagealphablending($result, false);
    imagesavealpha($result, true);
    imagewebp($result, $output . '/' . $name . '.webp', $quality);
    imagedestroy($result);
    imagedestroy($image);
    echo 'Prepared ' . $name . '.webp' . PHP_EOL;
}
