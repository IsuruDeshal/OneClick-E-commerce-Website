<?php
/**
 * Get User Cart - Supabase PostgreSQL
 * Returns cart items for logged-in user
 */

require_once dirname(__DIR__) . '/db_connect.php';

try {
    session_start();

    if (!isset($_SESSION['user_id'])) {
        sendResponse([
            'success' => false,
            'message' => 'Not authenticated'
        ], 401);
    }

    $userId = $_SESSION['user_id'];

    // Get cart items with product details
    $query = "
        SELECT
            c.id,
            c.product_id,
            c.quantity,
            p.name,
            p.price,
            p.image_url,
            p.sku,
            p.stock
        FROM carts c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC
    ";

    $items = query($query, [$userId]);

    sendResponse([
        'success' => true,
        'items' => array_map(function($item) {
            return [
                'id' => (int)$item['product_id'],
                'name' => $item['name'],
                'price' => (float)$item['price'],
                'image' => $item['image_url'],
                'sku' => $item['sku'],
                'quantity' => (int)$item['quantity'],
                'stock' => (int)$item['stock']
            ];
        }, $items)
    ]);

} catch (Exception $e) {
    error_log('Get Cart Error: ' . $e->getMessage());
    sendResponse([
        'success' => false,
        'message' => 'Failed to load cart'
    ], 500);
}
?>

