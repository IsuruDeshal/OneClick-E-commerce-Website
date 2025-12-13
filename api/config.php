<?php
/**
 * EC2 + Supabase Configuration
 * One Click Computers Backend
 *
 * Database: Supabase PostgreSQL
 * Hosting: AWS EC2
 * Updated: November 3, 2025
 */

// ============================================
// SUPABASE POSTGRESQL CONNECTION
// ============================================
define('DB_HOST', 'db.pvnlavcuswjxhywbsodm.supabase.co');
define('DB_PORT', '5432');
define('DB_NAME', 'postgres');
define('DB_USER', 'postgres');
define('DB_PASS', getenv('SUPABASE_DB_PASSWORD') ?: '6-n!8QQr?zTKa_y'); // Supabase password (use env var in production)
define('DB_SSLMODE', 'require');

// ============================================
// EC2 SERVER CONFIGURATION
// ============================================
define('EC2_PUBLIC_IP', 'YOUR-EC2-IP'); // TODO: Replace with your EC2 public IP (e.g., 54.123.456.789)
define('API_BASE_URL', 'https://YOUR-EC2-IP/api'); // TODO: Update with EC2 IP or domain
define('FRONTEND_URL', 'https://YOUR-EC2-IP'); // TODO: Update with EC2 IP or domain

// ============================================
// PAYHERE CONFIGURATION
// ============================================
define('PAYHERE_MERCHANT_ID', '1232664');
define('PAYHERE_MERCHANT_SECRET', 'MTExNzc3MzI0NjIyMzM4NzIwOTgyMTg2MDU2ODUwMjEwMjMwMTEzNA==');
define('PAYHERE_SANDBOX', true); // Set to false for production

// ============================================
// CORS SETTINGS
// ============================================
// Allow EC2 domain and your custom domain
$allowed_origins = [
    'https://YOUR-EC2-IP',
    'https://yourdomain.com',
    'https://www.yourdomain.com',
    'http://localhost:3000' // For local development
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

// Security Headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ============================================
// ENVIRONMENT SETTINGS
// ============================================
define('ENVIRONMENT', 'production'); // 'development' or 'production'
define('DEBUG_MODE', false); // Set to false in production

// Error Reporting
if (ENVIRONMENT === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    ini_set('error_log', '/var/www/html/api/logs/php-errors.log');
}

// ============================================
// TIMEZONE
// ============================================
date_default_timezone_set('Asia/Colombo');

// ============================================
// FILE UPLOAD SETTINGS
// ============================================
define('UPLOAD_DIR', '/var/www/html/uploads/products/');
define('UPLOAD_URL', FRONTEND_URL . '/uploads/products/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// ============================================
// SESSION SETTINGS
// ============================================
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 1); // Requires HTTPS
ini_set('session.cookie_samesite', 'Lax');
session_name('ONECLICK_SESSION');

?>
