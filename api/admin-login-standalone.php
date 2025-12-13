<?php
/**
 * Admin Login - Simple & Secure
 * No Supabase dependency - Pure PHP session authentication
 */

// Suppress all output before JSON
error_reporting(0);
ini_set('display_errors', 0);
ob_start();

header('Content-Type: application/json; charset=utf-8');

// CORS handling
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = ['localhost', '127.0.0.1', '13.62.49.52', 'techelevate.news', 'oneclick.news'];
foreach ($allowed_origins as $allowed) {
    if (strpos($origin, $allowed) !== false) {
        header('Access-Control-Allow-Origin: ' . $origin);
        break;
    }
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Configure session before starting
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_samesite', 'Lax');
    session_name('ONECLICK_SESSION');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

try {
    // Get JSON input
    $json = file_get_contents('php://input');
    $input = json_decode($json, true);

    $email = isset($input['email']) ? trim($input['email']) : '';
    $password = isset($input['password']) ? trim($input['password']) : '';

    // Validate input
    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Email and password are required'
        ]);
        exit();
    }

    // ================================================================
    // SUPABASE DIRECT AUTHENTICATION
    // ================================================================
    $authenticated = false;
    $adminData = null;

    // Connect to Supabase PostgreSQL
    if (!function_exists('pg_connect')) {
        http_response_code(500);
        ob_clean();
        echo json_encode([
            'success' => false,
            'message' => 'PostgreSQL extension not available. Please enable it in php.ini'
        ]);
        exit();
    }

    try {
        $conn_string = sprintf(
            "host=%s port=%s dbname=%s user=%s password=%s sslmode=require",
            'db.pvnlavcuswjxhywbsodm.supabase.co',
            '5432',
            'postgres',
            'postgres',
            '6-n!8QQr?zTKa_y'
        );

        $conn = @pg_connect($conn_string);

        if (!$conn) {
            throw new Exception('Failed to connect to database');
        }

        // Check users table for admin role
        $result = @pg_query_params($conn, 
            "SELECT id, email, password_hash, role, name FROM users WHERE email = $1 LIMIT 1", 
            [$email]
        );
        
        if ($result) {
            $user = pg_fetch_assoc($result);
            
            if ($user) {
                // Check if user has admin role
                $isAdmin = (isset($user['role']) && $user['role'] === 'admin');
                
                // Verify password
                $passwordValid = false;
                if (isset($user['password_hash']) && !empty($user['password_hash'])) {
                    $passwordValid = password_verify($password, $user['password_hash']);
                }
                
                if ($passwordValid && $isAdmin) {
                    $authenticated = true;
                    $adminData = [
                        'id' => $user['id'],
                        'email' => $user['email'],
                        'name' => $user['name'] ?? 'Admin',
                        'role' => 'admin'
                    ];
                }
            }
        }

        @pg_close($conn);

    } catch (Exception $e) {
        http_response_code(500);
        ob_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Database connection error'
        ]);
        exit();
    }

    if (!$authenticated) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password'
        ]);
        exit();
    }

    // SUCCESS - Create session
    session_regenerate_id(true);
    $_SESSION['admin_id'] = $adminData['id'];
    $_SESSION['admin_email'] = $adminData['email'];
    $_SESSION['admin_name'] = $adminData['name'];
    $_SESSION['is_admin'] = true;
    $_SESSION['login_time'] = time();

    // Force save session before response
    session_write_close();
    
    // Re-send session cookie header explicitly
    $sessionName = session_name();
    $sessionId = session_id();
    if ($sessionId) {
        setcookie($sessionName, $sessionId, [
            'expires' => 0,
            'path' => '/',
            'domain' => '',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }

    http_response_code(200);
    
    // Clear any buffered output
    ob_clean();
    
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => $adminData['id'],
            'email' => $adminData['email'],
            'name' => $adminData['name'] ?? 'Admin',
            'role' => 'admin'
        ]
    ]);

} catch (Exception $e) {
    error_log('Admin Login Error: ' . $e->getMessage());
    http_response_code(500);
    
    // Clear any buffered output
    ob_clean();
    
    echo json_encode([
        'success' => false,
        'message' => 'Login failed. Please try again.'
    ]);
}

ob_end_flush();
?>
