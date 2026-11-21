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
    'photo-parallax-v1/original' => ['campus-photo-v1', 1920, 90, 'jpg'],
    'photo-parallax-v1/sky-fill' => ['photo-sky-fill-v1', 1920, 88],
    'photo-parallax-v1/campus-fill' => ['photo-campus-fill-v1', 1920, 88]];
foreach ($assets as $source => $specification) {
    [$name, $size] = $specification;
    $quality = $specification[2] ?? 88;
    // Some supplied PNGs have a legacy ICC profile. Preserve pixel colors while
    // discarding profile metadata in the web encoding; fail on unreadable input.
    $extension = $specification[3] ?? 'png';
    $source_path = $root . '/assets/static/' . $source . '.' . $extension;
    $image = $extension === 'jpg' ? @imagecreatefromjpeg($source_path) : @imagecreatefrompng($source_path);
    if ($image === false) throw new RuntimeException('Cannot read visual asset: ' . $source);
    $photo_asset = str_starts_with($source, 'photo-parallax-v1/');
    if ($photo_asset) {
        [$registered_width, $registered_height] = getimagesize($root . '/assets/static/photo-parallax-v1/original.jpg');
        $source_ratio = imagesx($image) / imagesy($image);
        if (abs($source_ratio / ($registered_width / $registered_height) - 1) > .01) {
            throw new RuntimeException('Photo matte has a different framing ratio: ' . $source);
        }
        // Matte/backplate exports can differ in resolution. Register their full
        // frames to the untouched photograph; never crop masks to their bounds.
        if (imagesx($image) !== $registered_width || imagesy($image) !== $registered_height) {
            $registered = imagescale($image, $registered_width, $registered_height, IMG_BICUBIC);
            imagedestroy($image);
            $image = $registered;
        }
    }
    // Parallax layers share a full-size registration canvas. Cropping their alpha
    // would shift the scenery and destroy alignment between independent planes.
    $cropped = $source === 'Throphy' || $photo_asset
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

// Use generated cutouts only as matting guides. Every displayed campus surface
// samples original.jpg; generated RGB is discarded from the runtime masks.
[$source_width, $source_height] = getimagesize($root . '/assets/static/photo-parallax-v1/original.jpg');
$scale = min(1, 1920 / max($source_width, $source_height));
$width = (int)round($source_width * $scale);
$height = (int)round($source_height * $scale);
$guides = [];
foreach (['sky', 'monument', 'foreground'] as $plane) {
    $raw = imagecreatefrompng($root . '/assets/static/photo-parallax-v1/' . $plane . '-mask.png');
    if (abs((imagesx($raw) / imagesy($raw)) / ($source_width / $source_height) - 1) > .01) {
        throw new RuntimeException('Photo matte has a different framing ratio: ' . $plane);
    }
    $guides[$plane] = imagescale($raw, $width, $height, IMG_BICUBIC);
    imagedestroy($raw);
}
$masks = [];
foreach (['sky', 'campus', 'monument', 'foreground', 'gap'] as $plane) {
    $masks[$plane] = imagecreatetruecolor($width, $height);
    imagealphablending($masks[$plane], false);
    imagesavealpha($masks[$plane], true);
}
for ($y = 0; $y < $height; $y++) {
    for ($x = 0; $x < $width; $x++) {
        // Exclusive labels prevent duplicate buildings/globe edges when moving.
        // Their four masks cover every original-photo pixel exactly once at rest.
        $owner = 'campus';
        foreach (['foreground', 'monument', 'sky'] as $plane) {
            if (((imagecolorat($guides[$plane], $x, $y) >> 24) & 127) < 64) {
                $owner = $plane;
                break;
            }
        }
        foreach ($masks as $plane => $mask) {
            $visible = $plane === 'gap' ? in_array($owner, ['monument', 'foreground'], true) : $plane === $owner;
            imagesetpixel($mask, $x, $y, (($visible ? 0 : 127) << 24) | 0xFFFFFF);
        }
    }
}
foreach ($masks as $plane => $mask) {
    imagewebp($mask, $output . '/photo-' . $plane . '-mask-v1.webp', 100);
    imagedestroy($mask);
    echo 'Prepared photo-' . $plane . '-mask-v1.webp' . PHP_EOL;
}
foreach ($guides as $guide) imagedestroy($guide);
