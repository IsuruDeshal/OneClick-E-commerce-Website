<?php
/**
 * Admin Login API - Local Authentication (robust)
 * Authenticates admin users from MySQL (XAMPP) or PostgreSQL (Supabase)
 */

require_once __DIR__ . '/config-local.php';
require_once __DIR__ . '/db_connect_universal.php';

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

try {
    // Get JSON input
    $input = getJSONInput();

    $email = isset($input['email']) ? trim($input['email']) : '';
    $password = isset($input['password']) ? trim($input['password']) : '';

    // Validate input
    if (empty($email) || empty($password)) {
        sendResponse([
            'success' => false,
            'message' => 'Email and password are required'
        ], 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse([
            'success' => false,
            'message' => 'Invalid email format'
        ], 400);
    }

    $admin = null;
    $passwordMatch = false;

    if (DB_TYPE === 'mysql') {
        $conn = getDB();

        // 1) Preferred path: users table with password_hash and role='admin'
        $stmt = $conn->prepare("SELECT id, email, password_hash FROM users WHERE email = ? AND role = 'admin' LIMIT 1");
        if ($stmt) {
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $result = $stmt->get_result();
            $admin = $result->fetch_assoc() ?: null;
            if ($admin && !empty($admin['password_hash'])) {
                $passwordMatch = password_verify($password, $admin['password_hash']);
            }
        }

        // 2) Fallback: users table with plaintext password column
        if (!$admin || !$passwordMatch) {
            // Check if users has a plaintext password column
            $hasPlainPassword = false;
            $res = $conn->query("SHOW COLUMNS FROM users LIKE 'password'");
            if ($res && $res->num_rows > 0) { $hasPlainPassword = true; }

            if ($hasPlainPassword) {
                $stmt2 = $conn->prepare("SELECT id, email, password as plain_password FROM users WHERE email = ? AND (role = 'admin' OR role IS NULL) LIMIT 1");
                if ($stmt2) {
                    $stmt2->bind_param("s", $email);
                    $stmt2->execute();
                    $result2 = $stmt2->get_result();
                    $row = $result2->fetch_assoc();
                    if ($row) {
                        $admin = [ 'id' => $row['id'], 'email' => $row['email'] ];
                        if (hash_equals((string)$row['plain_password'], (string)$password)) {
                            $passwordMatch = true;
                        }
                    }
                }
            }
        }

        // 3) Fallback: legacy admin_users table
        if (!$passwordMatch) {
            $hasAdminUsers = false;
            $res2 = $conn->query("SHOW TABLES LIKE 'admin_users'");
            if ($res2 && $res2->num_rows > 0) { $hasAdminUsers = true; }

            if ($hasAdminUsers) {
                // Try hashed first
                $stmt3 = $conn->prepare("SELECT id, email, password_hash FROM admin_users WHERE email = ? LIMIT 1");
                if ($stmt3) {
                    $stmt3->bind_param("s", $email);
                    $stmt3->execute();
                    $result3 = $stmt3->get_result();
                    $row3 = $result3->fetch_assoc();
                    if ($row3 && !empty($row3['password_hash'])) {
                        if (password_verify($password, $row3['password_hash'])) {
                            $admin = [ 'id' => $row3['id'], 'email' => $row3['email'] ];
                            $passwordMatch = true;
                        }
                    }
                }
                // Fallback to plaintext column if exists
                if (!$passwordMatch) {
                    $res3 = $conn->query("SHOW COLUMNS FROM admin_users LIKE 'password'");
                    if ($res3 && $res3->num_rows > 0) {
                        $stmt4 = $conn->prepare("SELECT id, email, password as plain_password FROM admin_users WHERE email = ? LIMIT 1");
                        if ($stmt4) {
                            $stmt4->bind_param("s", $email);
                            $stmt4->execute();
                            $result4 = $stmt4->get_result();
                            $row4 = $result4->fetch_assoc();
                            if ($row4 && hash_equals((string)$row4['plain_password'], (string)$password)) {
                                $admin = [ 'id' => $row4['id'], 'email' => $row4['email'] ];
                                $passwordMatch = true;
                            }
                        }
                    }
                }
            }
        }

    } else {
        // PostgreSQL (Supabase): users table must have password_hash (local table), or use Supabase Auth via frontend
        $admin = queryOne("SELECT id, email, password_hash FROM users WHERE email = $1 AND role = 'admin'", [$email]);
        if ($admin && !empty($admin['password_hash'])) {
            $passwordMatch = password_verify($password, $admin['password_hash']);
        }

        // Fallback: check admin_users table
        if (!$admin || !$passwordMatch) {
            $admin = queryOne("SELECT id, email, password FROM admin_users WHERE email = $1", [$email]);
            if ($admin && !empty($admin['password'])) {
                // Check if password is hashed
                if (password_verify($password, $admin['password'])) {
                    $passwordMatch = true;
                } elseif (hash_equals($admin['password'], $password)) {
                    $passwordMatch = true;
                }
            }
        }
    }

    if (!$admin || !$passwordMatch) {
        sendResponse([
            'success' => false,
            'message' => 'Invalid email or password'
        ], 401);
    }

    // Create session
    // Make sure session settings were defined in config-local.php
    if (session_status() !== PHP_SESSION_ACTIVE) session_start();
    session_regenerate_id(true);

    $_SESSION['admin_id'] = $admin['id'];
    $_SESSION['admin_email'] = $admin['email'];
    $_SESSION['is_admin'] = true;
    $_SESSION['login_time'] = time();

    // Explicitly write and close session to ensure cookie is sent in response to fetch/XHR
    session_write_close();

    // Ensure the session cookie is explicitly set with safe attributes (helps with fetch() in some browsers)
    $cookieParams = session_get_cookie_params();
    $cookieName = session_name();
    $cookieValue = session_id();

    // Build options for setcookie (PHP >= 7.3 supports options array)
    $options = [
        'expires' => 0,
        'path' => $cookieParams['path'] ?? '/',
        'domain' => $cookieParams['domain'] ?? '',
        'secure' => isset($cookieParams['secure']) ? (bool)$cookieParams['secure'] : false,
        'httponly' => true,
        'samesite' => $cookieParams['samesite'] ?? 'Lax'
    ];

    // Try to set cookie via array options if supported
    if (PHP_VERSION_ID >= 70300) {
        setcookie($cookieName, $cookieValue, $options);
    } else {
        // Fallback for older PHP
        setcookie($cookieName, $cookieValue, 0, $options['path'] . '; samesite=' . $options['samesite'], $options['domain'], $options['secure'], $options['httponly']);
    }

    sendResponse([
        'success' => true,
        'message' => 'Login successful',
        'user' => [ 'id' => $admin['id'], 'email' => $admin['email'] ]
    ]);

} catch (Exception $e) {
    error_log('Admin Login Error: ' . $e->getMessage());
    sendResponse([
        'success' => false,
        'message' => 'Login failed. Please try again.',
        'error' => DEBUG_MODE ? $e->getMessage() : null
    ], 500);
}
?>
