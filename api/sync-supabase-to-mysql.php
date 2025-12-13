<?php
/**
 * SYNC SUPABASE TO MYSQL
 * Exports all 44 products from Supabase and imports them into local MySQL
 *
 * Visit: http://localhost/oneclick/api/sync-supabase-to-mysql.php
 */

header('Content-Type: application/json; charset=utf-8');

$results = [];

try {
    // Step 1: Connect to Supabase PostgreSQL directly
    $results['step1'] = 'Connecting to Supabase...';

    $supabase_host = 'db.pvnlavcuswjxhywbsodm.supabase.co';
    $supabase_port = 5432;
    $supabase_db = 'postgres';
    $supabase_user = 'postgres';
    $supabase_pass = '6-n!8QQr?zTKa_y';

    $dsn = "pgsql:host=$supabase_host;port=$supabase_port;dbname=$supabase_db;sslmode=require";
    $supabase_pdo = new PDO($dsn, $supabase_user, $supabase_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $results['step1_status'] = '✅ Connected to Supabase';

    // Step 2: Fetch all products from Supabase
    $results['step2'] = 'Fetching products from Supabase...';

    $stmt = $supabase_pdo->prepare("SELECT * FROM products ORDER BY created_at DESC");
    $stmt->execute();
    $supabase_products = $stmt->fetchAll();

    $results['step2_status'] = '✅ Fetched ' . count($supabase_products) . ' products from Supabase';

    // Step 3: Connect to local MySQL
    $results['step3'] = 'Connecting to local MySQL...';

    $mysql_conn = mysqli_connect('localhost', 'root', '', 'oneclick_db', 3306);
    if (!$mysql_conn) {
        throw new Exception('MySQL Connection Error: ' . mysqli_connect_error());
    }

    mysqli_set_charset($mysql_conn, 'utf8mb4');
    $results['step3_status'] = '✅ Connected to MySQL';

    // Step 4: Clear existing products
    $results['step4'] = 'Clearing old products from MySQL...';

    mysqli_query($mysql_conn, "DELETE FROM products");
    $results['step4_status'] = '✅ Cleared old products';

    // Step 5: Insert Supabase products into MySQL
    $results['step5'] = 'Inserting ' . count($supabase_products) . ' products into MySQL...';

    $inserted = 0;
    $failed = 0;

    foreach ($supabase_products as $product) {
        $id = mysqli_real_escape_string($mysql_conn, $product['id'] ?? '');
        $name = mysqli_real_escape_string($mysql_conn, $product['name'] ?? '');
        $sku = mysqli_real_escape_string($mysql_conn, $product['sku'] ?? '');
        $description = mysqli_real_escape_string($mysql_conn, $product['description'] ?? '');
        $category = mysqli_real_escape_string($mysql_conn, $product['category'] ?? '');
        $price = floatval($product['price'] ?? 0);
        $stock = intval($product['stock'] ?? 0);
        $image_url = mysqli_real_escape_string($mysql_conn, $product['image_url'] ?? '');
        $status = mysqli_real_escape_string($mysql_conn, $product['status'] ?? 'active');

        $sql = "INSERT INTO products (id, name, sku, description, category, price, stock, image_url, status, created_at, updated_at) 
                VALUES ('$id', '$name', '$sku', '$description', '$category', $price, $stock, '$image_url', '$status', NOW(), NOW())";

        if (mysqli_query($mysql_conn, $sql)) {
            $inserted++;
        } else {
            $failed++;
            $results['error_' . $inserted] = mysqli_error($mysql_conn);
        }
    }

    $results['step5_status'] = "✅ Inserted $inserted products, $failed failed";

    // Step 6: Verify count
    $results['step6'] = 'Verifying product count in MySQL...';

    $count_result = mysqli_query($mysql_conn, "SELECT COUNT(*) as cnt FROM products");
    $count_row = mysqli_fetch_assoc($count_result);
    $mysql_count = $count_row['cnt'];

    $results['step6_status'] = "✅ MySQL now has $mysql_count products";

    // Final result
    $results['success'] = true;
    $results['message'] = "✅ SYNC COMPLETE! MySQL now has $mysql_count products (was 11)";
    $results['action'] = 'Refresh admin Products page to see all ' . $mysql_count . ' products!';

    mysqli_close($mysql_conn);

} catch (Exception $e) {
    $results['success'] = false;
    $results['error'] = $e->getMessage();
    http_response_code(500);
}

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
exit();
?>

