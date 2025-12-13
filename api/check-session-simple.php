<?php
/**
 * Simple Admin Session Check
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Credentials: true');

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check if user is logged in
if (!isset($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'isAuthenticated' => false,
        'message' => 'Not authenticated'
    ]);
    exit();
}

// User is authenticated
http_response_code(200);
echo json_encode([
    'success' => true,
    'isAuthenticated' => true,
    'user' => [
        'id' => $_SESSION['admin_id'] ?? 1,
        'email' => $_SESSION['admin_email'] ?? 'admin@oneclick.com',
        'role' => 'admin'
    ]
]);
exit();
?>

