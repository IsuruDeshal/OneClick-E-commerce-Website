<?php
/**
 * User Login - Session-based authentication
 */

require_once dirname(__DIR__) . '/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

try {
    $input = getJSONInput();

    $email = validateEmail($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        sendResponse([
            'success' => false,
            'message' => 'Email and password are required'
        ], 400);
    }

    // Get user from database
    $query = "SELECT id, email, password_hash, name, role FROM users WHERE email = $1";
    $user = queryOne($query, [$email]);

    if (!$user) {
        sendResponse([
            'success' => false,
            'message' => 'Invalid email or password'
        ], 401);
    }

    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        sendResponse([
            'success' => false,
            'message' => 'Invalid email or password'
        ], 401);
    }

    // Create session
    session_start();
    session_regenerate_id(true);

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['name'] = $user['name'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['login_time'] = time();

    // Save session to database
    $sessionId = session_id();
    $ip = $_SERVER['REMOTE_ADDR'];
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $expiresAt = date('Y-m-d H:i:s', time() + 86400 * 30); // 30 days

    execute(
        "INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET expires_at = $5",
        [$sessionId, $user['id'], $ip, $userAgent, $expiresAt]
    );

    sendResponse([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'name' => $user['name'],
            'role' => $user['role']
        ]
    ]);

} catch (Exception $e) {
    error_log('Login Error: ' . $e->getMessage());
    sendResponse([
        'success' => false,
        'message' => 'Login failed. Please try again.'
    ], 500);
}
?>

