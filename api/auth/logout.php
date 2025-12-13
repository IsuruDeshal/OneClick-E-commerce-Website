<?php
/**
 * User Logout
 */

session_start();

// Delete session from database
if (isset($_SESSION['user_id'])) {
    require_once dirname(__DIR__) . '/db_connect.php';

    try {
        $sessionId = session_id();
        execute("DELETE FROM sessions WHERE id = $1", [$sessionId]);
    } catch (Exception $e) {
        error_log('Logout Error: ' . $e->getMessage());
    }
}

// Destroy session
session_unset();
session_destroy();

// Clear session cookie
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time() - 3600, '/');
}

header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'message' => 'Logged out successfully'
]);
?>

