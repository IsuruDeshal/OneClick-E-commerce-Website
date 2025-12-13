<?php
/**
 * Get User Orders API - PostgreSQL Version
 * Returns all orders for a specific user
 */

require_once __DIR__ . '/db_connect.php';

try {
    if (!isset($_GET['user_id'])) {
        sendResponse([
            'success' => false,
            'error' => 'user_id parameter required'
        ], 400);
    }

    $userId = trim($_GET['user_id']);

    // Get orders
    $ordersQuery = "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC";
    $orders = query($ordersQuery, [$userId]);

    // Get items for each order
    foreach ($orders as &$order) {
        $orderId = $order['id'];

        $itemsQuery = "SELECT * FROM order_items WHERE order_id = $1";
        $items = query($itemsQuery, [$orderId]);

        $order['items'] = $items;
        $order['shipping_address'] = json_decode($order['shipping_address'], true);
    }

    sendResponse([
        'success' => true,
        'count' => count($orders),
        'orders' => $orders
    ]);

} catch (Exception $e) {
    error_log('Get Orders Error: ' . $e->getMessage());
    sendResponse([
        'success' => false,
        'error' => 'Failed to retrieve orders',
        'message' => DEBUG_MODE ? $e->getMessage() : null
    ], 500);
}
?>
