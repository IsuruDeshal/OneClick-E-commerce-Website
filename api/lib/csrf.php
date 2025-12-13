<?php
// /api/lib/csrf.php
// CSRF protection for admin forms (session-based tokens)

function csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function require_csrf() {
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? $_GET['csrf_token'] ?? '');
    $valid = $_SESSION['csrf_token'] ?? null;

    if (!$sent || !$valid || !hash_equals($valid, $sent)) {
        json_error('E_CSRF', 'Invalid CSRF token', 403);
    }
}

// Initialize session token on first request
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>
