<?php
/**
 * DEBUG GET PRODUCTS API
 * Shows exactly what's happening
 */

// Set headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$response = [];

try {
    // 1. Check connection
    $conn = @mysqli_connect('localhost', 'root', '', 'oneclick_db', 3306);

    if (!$conn) {
        throw new Exception('DB Connection Failed: ' . mysqli_connect_error());
    }

    $response['step1'] = 'MySQL connected OK';

    // 2. Check table exists
    $check = mysqli_query($conn, "SELECT COUNT(*) as cnt FROM products");
    if (!$check) {
        throw new Exception('Table query failed: ' . mysqli_error($conn));
    }

    $count_result = mysqli_fetch_assoc($check);
    $response['step2'] = 'Table exists, total rows: ' . $count_result['cnt'];

    // 3. Try to fetch products
    $sql = "SELECT id, name, sku, price, stock, category, status FROM products LIMIT 5";
    $result = mysqli_query($conn, $sql);

    if (!$result) {
        throw new Exception('Fetch failed: ' . mysqli_error($conn));
    }

    $products = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $products[] = $row;
    }

    $response['step3'] = 'Fetched ' . count($products) . ' products';
    $response['products'] = $products;
    $response['success'] = true;

    mysqli_close($conn);

} catch (Exception $e) {
    $response['success'] = false;
    $response['error'] = $e->getMessage();
}

http_response_code($response['success'] ? 200 : 500);
echo json_encode($response, JSON_PRETTY_PRINT);
exit();
?>

