<?php
// /api/_bootstrap.php
// Central entry point - EVERY endpoint requires this first

// Load all library files
require_once __DIR__ . '/lib/http.php';           // HTTP utilities (must load first)
require_once __DIR__ . '/lib/response.php';       // JSON responses
require_once __DIR__ . '/lib/validation.php';     // Input validation
require_once __DIR__ . '/lib/auth.php';           // JWT + roles
require_once __DIR__ . '/lib/rate_limiter.php';   // IP-based throttling
require_once __DIR__ . '/lib/csrf.php';           // CSRF tokens
require_once __DIR__ . '/lib/supabase.php';       // Supabase API wrapper

// Set JSON response type
header('Content-Type: application/json; charset=utf-8');

// CORS Whitelist
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = [
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:8000',
    'http://localhost:8080',
    'http://127.0.0.1',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8000',
    'https://oneclick.lk',
    'https://www.oneclick.lk',
];

if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');

// Preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-XSS-Protection: 1; mode=block');

// Session for CSRF tokens
session_start();

// Timezone
date_default_timezone_set('Asia/Colombo');
