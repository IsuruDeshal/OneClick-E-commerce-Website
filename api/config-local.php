<?php
/**
 * LOCAL XAMPP CONFIGURATION
 * One Click Computers - Local Development
 *
 * This config automatically detects XAMPP and uses local MySQL
 */

// Detect if running on localhost (XAMPP)
$isLocalhost = (
    $_SERVER['SERVER_NAME'] === 'localhost' ||
    $_SERVER['SERVER_NAME'] === '127.0.0.1' ||
    strpos($_SERVER['HTTP_HOST'], 'localhost') !== false
);

if ($isLocalhost) {
    // ============================================
    // XAMPP LOCAL CONFIGURATION
    // ============================================
    define('DB_HOST', 'localhost');
    define('DB_PORT', '3306');
    define('DB_NAME', 'oneclick_db');
    define('DB_USER', 'root');
    define('DB_PASS', ''); // Default XAMPP has no password
    define('DB_TYPE', 'mysql'); // Use MySQL for XAMPP

    define('API_BASE_URL', 'http://localhost/oneclick/api');
    define('FRONTEND_URL', 'http://localhost/oneclick');

    define('ENVIRONMENT', 'development');
    define('DEBUG_MODE', true); // Show all errors locally

    // Enable error reporting for local development
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('log_errors', 1);
    ini_set('error_log', __DIR__ . '/logs/error.log');

} else {
    // ============================================
    // PRODUCTION EC2 + SUPABASE CONFIGURATION
    // ============================================
    define('DB_HOST', 'db.pvnlavcuswjxhywbsodm.supabase.co');
    define('DB_PORT', '5432');
    define('DB_NAME', 'postgres');
    define('DB_USER', 'postgres');
    define('DB_PASS', '6-n!8QQr?zTKa_y');
    define('DB_SSLMODE', 'require');
    define('DB_TYPE', 'postgresql');

    define('EC2_PUBLIC_IP', '13.62.49.52');
    define('API_BASE_URL', 'http://13.62.49.52/oneclick-computers/api');
    define('FRONTEND_URL', 'http://13.62.49.52/oneclick-computers');

    define('ENVIRONMENT', 'production');
    define('DEBUG_MODE', false);

    // Production error handling
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    ini_set('error_log', __DIR__ . '/logs/php-errors.log');
}

// ============================================
// COMMON CONFIGURATION
// ============================================

// ============================================
// SUPABASE CONFIGURATION (Environment driven)
// ============================================
// NOTE: Keys MUST be provided via environment variables or .env file.
// Never hard-code service role or anon keys in tracked code.
// Expected env vars:
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY (server-side only; never exposed to client)

$__supabase_url = getenv('SUPABASE_URL') ?: 'https://pvnlavcuswjxhywbsodm.supabase.co'; // fallback only for local dev
if (!defined('SUPABASE_URL')) {
    define('SUPABASE_URL', $__supabase_url);
}

// Anon key (safe for client but still loaded from env for rotation ease)
$__anon_key = getenv('SUPABASE_ANON_KEY') ?: '';
if ($__anon_key && !defined('SUPABASE_ANON_KEY')) {
    define('SUPABASE_ANON_KEY', $__anon_key);
}

// Service role key ONLY server-side. Do not echo. If absent, privileged ops disabled.
$__service_role = getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '';
if ($__service_role && !defined('SUPABASE_SERVICE_ROLE_KEY')) {
    define('SUPABASE_SERVICE_ROLE_KEY', $__service_role);
}

// Toggle for product fetching via Supabase (default true)
if (!defined('USE_SUPABASE_PRODUCTS')) {
    define('USE_SUPABASE_PRODUCTS', true);
}

// ============================================
// COMMON CONFIGURATION
// ============================================

// PayHere Configuration (works in both environments)
define('PAYHERE_MERCHANT_ID', '1232664');
define('PAYHERE_MERCHANT_SECRET', 'MTExNzc3MzI0NjIyMzM4NzIwOTgyMTg2MDU2ODUwMjEwMjMwMTEzNA==');
define('PAYHERE_SANDBOX', true); // Keep true for testing

// CORS Settings (allow credentials properly)
$allowed_origins = [
    'http://localhost',
    'http://localhost:80',
    'http://localhost/oneclick',
    'http://localhost:3000',
    'http://127.0.0.1',
    FRONTEND_URL
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin"); // must be explicit when using credentials
} else {
    // Fallback for direct browser calls without Origin header
    header('Access-Control-Allow-Origin: http://localhost');
}
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

// Security Headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');

// Handle preflight requests early
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Timezone
date_default_timezone_set('Asia/Colombo');

// File Upload Settings
define('UPLOAD_DIR', __DIR__ . '/../uploads/products/');
define('UPLOAD_URL', FRONTEND_URL . '/uploads/products/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Session Settings (explicit & stable)
$secureFlag = !$isLocalhost; // only secure in production HTTPS
session_name('ONECLICK_SESSION');
if (function_exists('session_set_cookie_params')) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $secureFlag,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
}
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
if ($secureFlag) {
    ini_set('session.cookie_secure', 1);
}
ini_set('session.cookie_samesite', 'Lax');

// Create logs directory if it doesn't exist
$logsDir = __DIR__ . '/logs';
if (!file_exists($logsDir)) {
    mkdir($logsDir, 0755, true);
}

// Local debug banner
if ($isLocalhost && DEBUG_MODE) {
    $GLOBALS['_LOCAL_MODE'] = true;
}

// Supabase REST configuration (for localhost product listing)
if (!defined('SUPABASE_URL')) {
    define('SUPABASE_URL', getenv('SUPABASE_URL') ?: 'https://pvnlavcuswjxhywbsodm.supabase.co');
}
if (!defined('SUPABASE_ANON_KEY')) {
    // NOTE: Prefer setting SUPABASE_ANON_KEY in environment for security
    define('SUPABASE_ANON_KEY', getenv('SUPABASE_ANON_KEY') ?: '');
}
// Toggle: when true on localhost, product APIs will read from Supabase REST instead of local MySQL
if (!defined('USE_SUPABASE_PRODUCTS')) {
    define('USE_SUPABASE_PRODUCTS', true);
}

// ============================================
// OPTIONAL .env LOADER (Server-side only)
// ============================================
if (!function_exists('oneclick_load_env')) {
    function oneclick_load_env($file) {
        if (!is_file($file)) return [];
        $vars = [];
        foreach (file($file) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') continue;
            if (strpos($line, '=') === false) continue;
            list($k,$v) = explode('=', $line, 2);
            $k = trim($k); $v = trim($v);
            // Strip quotes (compatible with PHP 7+)
            if ((substr($v,0,1)==='"' && substr($v,-1)==='"') || (substr($v,0,1)==="'" && substr($v,-1)==="'")) {
                $v = substr($v,1,-1);
            }
            $vars[$k] = $v;
        }
        return $vars;
    }
}

// Load .env in api/ if present (DO NOT COMMIT your real service role key publicly)
$__env = oneclick_load_env(__DIR__.'/.env');

// Supabase URL already defined earlier; define anon/service role keys securely
if (!defined('SUPABASE_ANON_KEY') || SUPABASE_ANON_KEY === '') {
    $anon_from_env = getenv('SUPABASE_ANON_KEY') ?: ($__env['SUPABASE_ANON_KEY'] ?? '');
    if ($anon_from_env !== '' && !defined('SUPABASE_ANON_KEY')) {
        define('SUPABASE_ANON_KEY', $anon_from_env);
    }
}

// Define service role key ONLY server-side; never expose to client JS
if (!defined('SUPABASE_SERVICE_ROLE_KEY')) {
    $srk = getenv('SUPABASE_SERVICE_ROLE_KEY') ?: ($__env['SUPABASE_SERVICE_ROLE_KEY'] ?? '');
    define('SUPABASE_SERVICE_ROLE_KEY', $srk);
}

// Helper: choose correct Supabase auth header for REST operations
function supabaseHeaders($privileged = false) {
    $key = ($privileged && SUPABASE_SERVICE_ROLE_KEY !== '') ? SUPABASE_SERVICE_ROLE_KEY : (SUPABASE_ANON_KEY ?? '');
    if ($key === '') return [];
    return [
        'apikey: ' . $key,
        'Authorization: Bearer ' . $key,
        'Accept: application/json'
    ];
}

// Helper: build context header string
function supabaseHeaderString($privileged = false) {
    $headers = supabaseHeaders($privileged);
    return implode("\r\n", $headers) . "\r\n";
}

// SECURITY NOTE: Ensure you NEVER echo SUPABASE_SERVICE_ROLE_KEY to the browser.
// If this file is ever served accidentally, rotate keys immediately in Supabase Dashboard.
?>
