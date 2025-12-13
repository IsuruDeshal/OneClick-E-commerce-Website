<?php
/**
 * Admin Login - Supabase Auth API
 * Uses Supabase Authentication API for admin login
 */

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
    ob_clean();
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Configure session
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

    if (empty($email) || empty($password)) {
        http_response_code(400);
        ob_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Email and password are required'
        ]);
        exit();
    }

    // Supabase configuration
    $supabaseUrl = 'https://pvnlavcuswjxhywbsodm.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bmxhdmN1c3dqeGh5d2Jzb2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNTkyOTYsImV4cCI6MjA3NzczNTI5Nn0.pddR-mTtvaELNeK_F1HDwZfjs29xj__k9z-WFOqZbFA';

    // Authenticate with Supabase Auth API
    $authUrl = $supabaseUrl . '/auth/v1/token?grant_type=password';
    
    $ch = curl_init($authUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15); // 15 second timeout
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10); // 10 second connection timeout
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'email' => $email,
        'password' => $password
    ]));
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        http_response_code(500);
        ob_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Connection error'
        ]);
        exit();
    }

    if ($httpCode !== 200) {
        http_response_code(401);
        ob_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password'
        ]);
        exit();
    }

    $authResult = json_decode($response, true);
    
    if (!isset($authResult['access_token']) || !isset($authResult['user'])) {
        http_response_code(401);
        ob_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Authentication failed'
        ]);
        exit();
    }

    // Check if user is admin
    $allowedAdmins = [
        'admin@oneclick.com',
        'inboxtoisuru@gmail.com',
        'inboxtoisuru3@gmail.com'
    ];
    
    if (!in_array($email, $allowedAdmins)) {
        http_response_code(403);
        ob_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Access denied. Admin privileges required.'
        ]);
        exit();
    }

    // SUCCESS - Create session
    $user = $authResult['user'];
    
    session_regenerate_id(true);
    $_SESSION['admin_id'] = $user['id'];
    $_SESSION['admin_email'] = $user['email'];
    $_SESSION['admin_name'] = 'Admin';
    $_SESSION['is_admin'] = true;
    $_SESSION['login_time'] = time();
    $_SESSION['access_token'] = $authResult['access_token'];

    session_write_close();
    
    // Set session cookie
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
            'id' => $user['id'],
            'email' => $user['email'],
            'name' => 'Admin',
            'role' => 'admin'
        ],
        'access_token' => $authResult['access_token'],
        'refresh_token' => $authResult['refresh_token'] ?? null
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
