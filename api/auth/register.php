<?php
/**
 * User Registration
 */

require_once dirname(__DIR__) . '/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

try {
    $input = getJSONInput();

    $email = validateEmail($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $name = sanitize($input['name'] ?? '');

    if (!$email) {
        sendResponse([
            'success' => false,
            'message' => 'Valid email is required'
        ], 400);
    }

    if (strlen($password) < 6) {
        sendResponse([
            'success' => false,
            'message' => 'Password must be at least 6 characters'
        ], 400);
    }

    // Check if email already exists
    $existing = queryOne("SELECT id FROM users WHERE email = $1", [$email]);

    if ($existing) {
        sendResponse([
            'success' => false,
            'message' => 'Email already registered'
        ], 400);
    }

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    // Insert user
    $query = "INSERT INTO users (email, password_hash, name, role)
              VALUES ($1, $2, $3, 'user')
              RETURNING id, email, name, role";

    $user = queryOne($query, [$email, $passwordHash, $name]);

    if (!$user) {
        throw new Exception('Failed to create user');
    }

    sendResponse([
        'success' => true,
        'message' => 'Registration successful',
        'user' => $user
    ], 201);

} catch (Exception $e) {
    error_log('Registration Error: ' . $e->getMessage());
    sendResponse([
        'success' => false,
        'message' => 'Registration failed. Please try again.'
    ], 500);
}
?>

