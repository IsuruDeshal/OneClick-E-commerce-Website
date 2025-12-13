<?php
/**
 * CREATE ADMIN USER - EC2 + Supabase
 * One Click Computers
 *
 * This script creates an admin user in Supabase
 * Visit: http://13.62.49.52/oneclick-computers/api/create-admin.php
 */

header('Content-Type: application/json; charset=utf-8');

// Include config
require_once __DIR__ . '/config-local.php';

$response = [
    'success' => false,
    'message' => '',
    'steps' => []
];

try {
    // Step 1: Connect to Supabase
    $response['steps'][] = 'Step 1: Connecting to Supabase...';

    $dsn = "pgsql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";sslmode=" . DB_SSLMODE;

    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $response['steps'][] = '✅ Connected to Supabase';

    // Step 2: Check if admin_users table exists
    $response['steps'][] = 'Step 2: Checking admin_users table...';

    $check = $pdo->query("SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'admin_users'
    )");

    $tableExists = $check->fetchColumn();

    if (!$tableExists) {
        $response['steps'][] = 'Creating admin_users table...';

        $createTable = "
        CREATE TABLE IF NOT EXISTS admin_users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'admin',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        ";

        $pdo->exec($createTable);
        $response['steps'][] = '✅ Created admin_users table';
    } else {
        $response['steps'][] = '✅ admin_users table exists';
    }

    // Step 3: Check if admin already exists
    $response['steps'][] = 'Step 3: Checking for existing admin...';

    $stmt = $pdo->prepare("SELECT * FROM admin_users WHERE email = ?");
    $stmt->execute(['admin@oneclick.com']);
    $adminExists = $stmt->fetch();

    if ($adminExists) {
        $response['steps'][] = '⚠️ Admin user already exists: admin@oneclick.com';
        $response['success'] = true;
        $response['message'] = 'Admin user already exists';
        $response['admin'] = [
            'email' => $adminExists['email'],
            'role' => $adminExists['role'],
            'is_active' => $adminExists['is_active'],
            'created_at' => $adminExists['created_at']
        ];
    } else {
        // Step 4: Create admin user
        $response['steps'][] = 'Step 4: Creating admin user...';

        $email = 'admin@oneclick.com';
        $password = 'admin123';
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        $stmt = $pdo->prepare("
            INSERT INTO admin_users (email, password, role, is_active)
            VALUES (?, ?, 'admin', true)
        ");

        $stmt->execute([$email, $passwordHash]);

        $response['steps'][] = '✅ Admin user created successfully!';
        $response['success'] = true;
        $response['message'] = 'Admin user created';
        $response['admin'] = [
            'email' => $email,
            'password' => $password,
            'role' => 'admin',
            'is_active' => true,
            'note' => 'Use these credentials to login to the admin panel'
        ];
    }

    // Step 5: Verify
    $response['steps'][] = 'Step 5: Verifying...';

    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM admin_users");
    $stmt->execute();
    $count = $stmt->fetchColumn();

    $response['steps'][] = "✅ Total admin users: $count";

    http_response_code(200);

} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = 'Error: ' . $e->getMessage();
    $response['error'] = $e->getMessage();
    http_response_code(500);
}

echo json_encode($response, JSON_PRETTY_PRINT);
exit();

?>

