<?php
// /api/admin/upload_image.php
// POST - Secure product image upload (admin only)
require_once __DIR__ . '/../_bootstrap.php';
require_method('POST');
require_admin();
require_csrf();

if (empty($_FILES['image'])) {
    json_validation_error('image', 'Image file is required');
}

$file = $_FILES['image'];

// Validate file size (5MB max)
if ($file['size'] > 5 * 1024 * 1024) {
    json_validation_error('image', 'File too large (max 5MB)');
}

// Check upload errors
if ($file['error'] !== UPLOAD_ERR_OK) {
    json_error('E_UPLOAD_FAILED', 'File upload error', 400);
}

// Validate extension (whitelist)
$allowedExt = ['jpg', 'jpeg', 'png', 'webp'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, $allowedExt, true)) {
    json_validation_error('image', 'Invalid image type (jpg, png, webp only)');
}

// Validate MIME type
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
$allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
if (!in_array($mime, $allowedMime, true)) {
    json_validation_error('image', 'Invalid image content');
}

// Generate secure filename
$newName = bin2hex(random_bytes(16)) . '.' . $ext;
$uploadDir = __DIR__ . '/../../uploads/products/';

if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

$dest = $uploadDir . $newName;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $dest)) {
    json_error('E_UPLOAD_MOVE_FAILED', 'Failed to save file', 500);
}

// Set file permissions
chmod($dest, 0644);

// Return image URL (relative path)
$imageUrl = '/uploads/products/' . $newName;

json_success([
    'image_url' => $imageUrl,
    'filename'  => $newName,
]);
?>
