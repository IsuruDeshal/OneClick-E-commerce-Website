<?php
/**
 * Image upload endpoint (local uploads folder)
 * Accepts multipart/form-data with field name 'file'
 * Saves to /uploads and returns JSON { success: true, url: 'uploads/...' }
 */

// CORS for local testing
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

function sendJson($data, $code=200){ http_response_code($code); header('Content-Type: application/json'); echo json_encode($data); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  sendJson(['success'=>false,'message'=>'Method not allowed'], 405);
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
  sendJson(['success'=>false,'message'=>'No file uploaded or upload error'], 400);
}

$root = realpath(__DIR__ . '/..');
$uploadDir = $root . DIRECTORY_SEPARATOR . 'uploads';
if (!is_dir($uploadDir)) {
  if (!mkdir($uploadDir, 0775, true)) {
    sendJson(['success'=>false,'message'=>'Failed to prepare upload directory'], 500);
  }
}

$orig = $_FILES['file']['name'];
$ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
$allowed = ['jpg','jpeg','png','webp','gif'];
if (!in_array($ext, $allowed, true)) {
  sendJson(['success'=>false,'message'=>'Unsupported file type'], 400);
}

$base = preg_replace('/[^a-zA-Z0-9_-]/','-', pathinfo($orig, PATHINFO_FILENAME));
$unique = bin2hex(random_bytes(4));
$filename = $base.'-'.$unique.'.'.$ext;
$dest = $uploadDir . DIRECTORY_SEPARATOR . $filename;

if (!move_uploaded_file($_FILES['file']['tmp_name'], $dest)) {
  sendJson(['success'=>false,'message'=>'Failed to move uploaded file'], 500);
}

// Return a project-relative URL (served from /oneclick/uploads/...)
$url = 'uploads/'.$filename;
sendJson(['success'=>true,'url'=>$url]);

