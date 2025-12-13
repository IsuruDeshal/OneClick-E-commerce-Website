<?php
/**
 * User Login - Supabase Authentication
 * For regular users (non-admin)
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

    // Connect to Supabase PostgreSQL
    if (!function_exists('pg_connect')) {
        http_response_code(500);
        ob_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Database extension not available'
        ]);
        exit();
    }

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
        http_response_code(500);
        ob_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Database connection failed'
        ]);
        exit();
    }

    // Check users table for regular user or admin
    $result = @pg_query_params($conn, 
        "SELECT id, email, password_hash, role, name FROM users WHERE email = $1 LIMIT 1", 
        [$email]
    );
    
    $authenticated = false;
    $userData = null;

    if ($result) {
        $user = pg_fetch_assoc($result);
        
        if ($user) {
            // Verify password
            if (isset($user['password_hash']) && !empty($user['password_hash'])) {
                if (password_verify($password, $user['password_hash'])) {
                    $authenticated = true;
                    $userData = [
                        'id' => $user['id'],
                        'email' => $user['email'],
                        'name' => $user['name'] ?? 'User',
                        'role' => $user['role'] ?? 'user'
                    ];
                }
            }
        }
    }

    @pg_close($conn);

    if (!$authenticated) {
        http_response_code(401);
        ob_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password'
        ]);
        exit();
    }

    // SUCCESS - Create session
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userData['id'];
    $_SESSION['user_email'] = $userData['email'];
    $_SESSION['user_name'] = $userData['name'];
    $_SESSION['user_role'] = $userData['role'];
    $_SESSION['is_logged_in'] = true;
    $_SESSION['login_time'] = time();

    // Force save session
    session_write_close();
    
    // Re-send session cookie
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
    ob_clean();
    
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => $userData['id'],
            'email' => $userData['email'],
            'name' => $userData['name'],
            'role' => $userData['role']
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    ob_clean();
    
    echo json_encode([
        'success' => false,
        'message' => 'Login failed. Please try again.'
    ]);
}

ob_end_flush();
?>