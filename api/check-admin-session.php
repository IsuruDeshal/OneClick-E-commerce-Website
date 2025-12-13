<?php
/**
 * Check Admin Session
 * Verifies if user is logged in as admin
 */

require_once __DIR__ . '/config-local.php';

// Configure session with same settings as login
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_samesite', 'Lax');
    session_name('ONECLICK_SESSION');
    session_start();
}

header('Content-Type: application/json');

// Check if admin is logged in
if (isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true && isset($_SESSION['admin_email'])) {
    // Session is valid
    echo json_encode([
        'success' => true,
        'isAuthenticated' => true,
        'user' => [
            'id' => $_SESSION['admin_id'] ?? null,
            'email' => $_SESSION['admin_email'],
            'role' => 'admin'
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
