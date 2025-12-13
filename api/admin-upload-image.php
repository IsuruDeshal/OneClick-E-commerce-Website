<?php
/**
 * Admin Upload Image
 *
 * Security:
 * - Requires admin role (extracted from JWT or PHP session)
 * - File type validated (image/jpeg, image/png, image/webp only)
 * - File size validated (max 5MB)
 * - Filename sanitized and randomized
 * - Stored locally (future: upload to Supabase Storage)
 *
 * POST /api/admin/upload-image
 * Multipart form-data: image (file)
 *
 * Returns: { success: true, url, fullUrl }
 */

require_once __DIR__ . '/_bootstrap.php';

// Enforce POST
require_method('POST');

// Require admin role (extracts from JWT or session, fails if not admin)
require_admin();

// File upload configuration
$uploadDir = dirname(__DIR__) . '/uploads/products';
$maxFileSize = 5 * 1024 * 1024; // 5 MB
$allowedTypes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];

try {
    // Create upload directory if not exists
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            throw new Exception('Failed to create uploads directory');
        }
    }

    // Check if file was uploaded
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        $fileError = $_FILES['image']['error'] ?? 'Unknown error';
        throw new Exception("Upload failed: error code $fileError");
    }

    $file = $_FILES['image'];

    // Validate file size
    if ($file['size'] > $maxFileSize) {
        throw new Exception("File too large (max 5MB)");
    }

    // Validate MIME type
    $mimeType = mime_content_type($file['tmp_name']);
    if (!isset($allowedTypes[$mimeType])) {
        throw new Exception("Unsupported file type: $mimeType (allowed: JPEG, PNG, WebP)");
    }

    // Sanitize and generate unique filename
    $ext = $allowedTypes[$mimeType];
    $basename = 'prod_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $target = $uploadDir . '/' . $basename;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $target)) {
        throw new Exception('Failed to save uploaded file');
    }

    // Set file permissions
    chmod($target, 0644);

    // Build response URLs
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $baseDir = dirname(dirname($_SERVER['SCRIPT_NAME']));
    $fullUrl = $protocol . '://' . $host . $baseDir . '/uploads/products/' . $basename;
    $relativeUrl = 'uploads/products/' . $basename;

    json_success([
        'url' => $relativeUrl,
        'fullUrl' => $fullUrl,
    ]);

} catch (Exception $e) {
    error_log('Admin Upload Image Error: ' . $e->getMessage());
    json_error('E_UPLOAD_FAILED', $e->getMessage(), 400);
}
?>
