<?php
/**
 * Check User Session
 * Verifies if user is logged in
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configure session
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_samesite', 'Lax');
    session_name('ONECLICK_SESSION');
    session_start();
}

// Check if user is logged in
if (isset($_SESSION['is_logged_in']) && $_SESSION['is_logged_in'] === true && isset($_SESSION['user_email'])) {
    // Session is valid
    echo json_encode([
        'success' => true,
        'isAuthenticated' => true,
        'user' => [
            'id' => $_SESSION['user_id'] ?? null,
            'email' => $_SESSION['user_email'],
            'name' => $_SESSION['user_name'] ?? 'User',
            'role' => $_SESSION['user_role'] ?? 'user'
        ]
    ]);
} else {
    // Not authenticated
    echo json_encode([
        'success' => false,
        'isAuthenticated' => false,
        'message' => 'Not authenticated'
    ]);
}
?>
