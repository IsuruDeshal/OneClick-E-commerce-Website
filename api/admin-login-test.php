<?php
/**
 * Admin Login Test/Debug Endpoint
 * Helps diagnose login issues
 */

header('Content-Type: application/json; charset=utf-8');

// Flexible CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (strpos($origin, 'localhost') !== false || strpos($origin, '13.62.49.52') !== false || strpos($origin, 'techelevate.news') !== false) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Test data
$test_results = [
    'timestamp' => date('Y-m-d H:i:s'),
    'environment' => [
        'server' => gethostname(),
        'ip' => $_SERVER['SERVER_ADDR'] ?? 'unknown',
        'origin' => $_SERVER['HTTP_ORIGIN'] ?? 'none',
        'method' => $_SERVER['REQUEST_METHOD'],
        'php_version' => PHP_VERSION,
        'session_status' => session_status() === PHP_SESSION_NONE ? 'none' : (session_status() === PHP_SESSION_ACTIVE ? 'active' : 'disabled')
    ],
    'credentials' => [
        'expected_email' => 'admin@oneclick.com',
        'expected_password' => 'admin123',
        'test_email' => 'admin@oneclick.com',
        'test_password' => 'admin123',
        'match' => true
    ]
];

// If POST with test data
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $json = file_get_contents('php://input');
    $input = json_decode($json, true);

    $email = isset($input['email']) ? trim($input['email']) : '';
    $password = isset($input['password']) ? trim($input['password']) : '';

    $test_results['input'] = [
        'email_received' => $email,
        'password_received' => $password,
        'email_matches' => ($email === 'admin@oneclick.com'),
        'password_matches' => ($password === 'admin123'),
        'both_match' => ($email === 'admin@oneclick.com' && $password === 'admin123')
    ];

    // Try session
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if ($email === 'admin@oneclick.com' && $password === 'admin123') {
        $_SESSION['admin_id'] = 1;
        $_SESSION['admin_email'] = $email;
        $_SESSION['is_admin'] = true;
        $_SESSION['login_time'] = time();
        session_write_close();

        $test_results['login'] = [
            'success' => true,
            'session_set' => true,
            'session_id' => session_id(),
            'message' => 'Login successful'
        ];

        http_response_code(200);
        echo json_encode($test_results);
    } else {
        $test_results['login'] = [
            'success' => false,
            'session_set' => false,
            'message' => 'Invalid credentials'
        ];

        http_response_code(401);
        echo json_encode($test_results);
    }
} else {
    // GET - just return test info
    http_response_code(200);
    echo json_encode($test_results);
}
?>

