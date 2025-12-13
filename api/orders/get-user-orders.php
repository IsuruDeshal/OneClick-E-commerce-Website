<?php
/**
 * Get User's Orders
 *
 * Security:
 * - Requires authenticated user (JWT extracted from Authorization header or session)
 * - Returns only orders belonging to authenticated user
 * - Uses RLS (anon key filters by user_id automatically)
 *
 * GET /api/orders/get-user-orders
 * No body required; user_id from JWT
 *
 * Returns: { success: true, count, orders: [ { id, user_id, items: [...], ... }, ...] }
 */

require_once __DIR__ . '/../_bootstrap.php';

// Allow GET only
require_method('GET');

// Get authenticated user (extracts from JWT, fails if not logged in)
$user_id = require_user();

try {
    // Fetch user's orders only (RLS enforces this via anon key)
    $ordersPath = '/rest/v1/orders?user_id=eq.' . urlencode($user_id) . '&select=*&order=created_at.desc';
    [$code, $resp] = supabase_request_anon('GET', $ordersPath);

    if ($code !== 200) {
        throw new Exception("Failed to fetch orders (HTTP $code): $resp");
    }

    $orders = json_decode($resp, true);
    if (!is_array($orders)) {
        $orders = [];
    }

    // Fetch order items for each order
    foreach ($orders as &$order) {
        $orderId = $order['id'];
        $itemsPath = '/rest/v1/order_items?order_id=eq.' . urlencode($orderId) . '&select=*';
        [$iCode, $iResp] = supabase_request_anon('GET', $itemsPath);

        if ($iCode === 200) {
            $items = json_decode($iResp, true);
            $order['items'] = is_array($items) ? $items : [];
        } else {
            $order['items'] = [];
        }

        // Decode shipping address if JSON string
        if (isset($order['shipping_address']) && is_string($order['shipping_address'])) {
            $order['shipping_address'] = json_decode($order['shipping_address'], true);
        }
    }

    json_success([
        'count' => count($orders),
        'orders' => $orders,
        'source' => 'supabase',
    ]);

} catch (Exception $e) {
    error_log('Get User Orders Error: ' . $e->getMessage());
    json_error('E_GET_ORDERS_FAILED', $e->getMessage(), 500);
}
?>
