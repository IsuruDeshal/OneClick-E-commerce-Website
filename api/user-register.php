<?php
/**
 * User Registration - Supabase
 * Register new users directly to Supabase database
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
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Get JSON input
    $json = file_get_contents('php://input');
    $input = json_decode($json, true);

    $email = isset($input['email']) ? trim($input['email']) : '';
    $password = isset($input['password']) ? trim($input['password']) : '';
    $name = isset($input['name']) ? trim($input['name']) : '';
    $role = isset($input['role']) ? trim($input['role']) : 'user';

    // Validate input
    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Email and password are required'
        ]);
        exit();
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email format'
        ]);
        exit();
    }

    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Password must be at least 6 characters'
        ]);
        exit();
    }

    // Only allow 'user' role for public registration
    if ($role !== 'user' && $role !== 'admin') {
        $role = 'user';
    }

    // Connect to Supabase
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

    // Check if email already exists
    $result = @pg_query_params($conn, 
        "SELECT id FROM users WHERE email = $1 LIMIT 1", 
        [$email]
    );
    
    if ($result && pg_num_rows($result) > 0) {
        @pg_close($conn);
        http_response_code(400);
        ob_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Email already registered'
        ]);
        exit();
    }

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    // Insert new user
    $result = @pg_query_params($conn,
        "INSERT INTO users (email, password_hash, name, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id",
        [$email, $passwordHash, $name, $role]
    );

    if (!$result) {
        @pg_close($conn);
        http_response_code(500);
        ob_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Registration failed'
        ]);
        exit();
    }

    $user = pg_fetch_assoc($result);
    $userId = $user['id'];

    @pg_close($conn);

    // Success
    http_response_code(201);
    ob_clean();
    
    echo json_encode([
        'success' => true,
        'message' => 'Registration successful',
        'user' => [
            'id' => $userId,
            'email' => $email,
            'name' => $name,
            'role' => $role
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    ob_clean();
    
    echo json_encode([
        'success' => false,
        'message' => 'Registration failed. Please try again.'
    ]);
}

ob_end_flush();
?>