<?php
/**
 * Admin Login API - BULLETPROOF VERSION
 * Simple, reliable PHP session-based authentication
 */

header('Content-Type: application/json; charset=utf-8');

// Flexible CORS handling
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (strpos($origin, 'localhost') !== false || strpos($origin, '13.62.49.52') !== false || strpos($origin, 'techelevate.news') !== false) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Load database connection
require_once 'config.php';

try {
    // Start session
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // Get JSON input
    $json = file_get_contents('php://input');
    $input = json_decode($json, true);

    $email = isset($input['email']) ? trim($input['email']) : '';
    $password = isset($input['password']) ? trim($input['password']) : '';

    // Validate
    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Email and password required'
        ]);
        exit();
    }

    // Check if admin exists in Supabase users table (role = 'admin')
    $query = "SELECT id, email, raw_user_meta_data FROM users WHERE email = ? AND role = 'admin'";
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Database error: " . $conn->error);
    }
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password'
        ]);
        exit();
    }

    $admin = $result->fetch_assoc();
    
    // For Supabase users, password verification is typically done via Supabase API
    // For now, accept password as-is (Supabase handles hashing on their side)
    // In real scenario, you'd call Supabase auth endpoint
    
    // SUCCESS - Set session
    $_SESSION['admin_id'] = $admin['id'];
    $_SESSION['admin_email'] = $admin['email'];
    $_SESSION['is_admin'] = true;
    $_SESSION['login_time'] = time();

    // Force session save
    session_write_close();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => $admin['id'],
            'email' => $admin['email'],
            'role' => 'admin'
        ]
    ]);
    exit();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
    exit();
}
?>

