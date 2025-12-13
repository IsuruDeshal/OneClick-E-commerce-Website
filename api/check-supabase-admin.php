<?php
/**
 * Check Supabase Admin Users
 */

header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/config-local.php';

$results = [];

try {
    // Connect to Supabase PostgreSQL
    $conn_string = sprintf(
        "host=%s port=%s dbname=%s user=%s password=%s sslmode=require",
        'db.pvnlavcuswjxhywbsodm.supabase.co',
        '5432',
        'postgres',
        'postgres',
        '6-n!8QQr?zTKa_y'
    );

    $conn = pg_connect($conn_string);

    if (!$conn) {
        throw new Exception('Failed to connect to Supabase: ' . pg_last_error());
    }

    $results['connection'] = 'success';

    // Check users table
    $query = "SELECT id, email, role, created_at FROM users WHERE role = 'admin' OR email LIKE '%admin%' ORDER BY created_at DESC";
    $result = pg_query($conn, $query);
    
    if ($result) {
        $users = pg_fetch_all($result) ?: [];
        $results['users_table'] = [
            'count' => count($users),
            'users' => $users
        ];
    } else {
        $results['users_table'] = ['error' => pg_last_error($conn)];
    }

    // Check if users table has password_hash column
    $query = "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('password', 'password_hash', 'hashed_password')";
    $result = pg_query($conn, $query);
    if ($result) {
        $cols = pg_fetch_all($result) ?: [];
        $results['users_password_columns'] = $cols;
    }

    // Check admin_users table if it exists
    $query = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users')";
    $result = pg_query($conn, $query);
    if ($result) {
        $row = pg_fetch_row($result);
        if ($row[0] === 't') {
            $query = "SELECT id, email, created_at FROM admin_users ORDER BY created_at DESC";
            $result = pg_query($conn, $query);
            if ($result) {
                $admins = pg_fetch_all($result) ?: [];
                $results['admin_users_table'] = [
                    'count' => count($admins),
                    'users' => $admins
                ];
            }
        } else {
            $results['admin_users_table'] = 'table does not exist';
        }
    }

    // Check auth.users table (Supabase Auth)
    $query = "SELECT id, email, created_at, confirmed_at FROM auth.users WHERE email LIKE '%admin%' ORDER BY created_at DESC LIMIT 10";
    $result = pg_query($conn, $query);
    if ($result) {
        $authUsers = pg_fetch_all($result) ?: [];
        $results['auth_users'] = [
            'count' => count($authUsers),
            'users' => $authUsers
        ];
    } else {
        $results['auth_users'] = ['error' => pg_last_error($conn)];
    }

    pg_close($conn);

} catch (Exception $e) {
    $results['error'] = $e->getMessage();
}

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
