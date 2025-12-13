<?php
/**
 * Get Wishlist Items
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

    // Get wishlist items with product details
    $query = "
        SELECT
            w.id,
            w.product_id,
            p.name,
            p.price,
            p.image_url,
            p.sku,
            p.stock
        FROM wishlists w
        JOIN products p ON w.product_id = p.id
        WHERE w.user_id = $1
        ORDER BY w.created_at DESC
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
                'stock' => (int)$item['stock']
            ];
        }, $items)
    ]);

} catch (Exception $e) {
    error_log('Get Wishlist Error: ' . $e->getMessage());
    sendResponse([
        'success' => false,
        'message' => 'Failed to load wishlist'
    ], 500);
}
?>

