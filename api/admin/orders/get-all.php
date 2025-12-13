<?php
/**
 * Get All Orders (Admin Only)
 *
 * Security:
 * - Requires admin role (extracted from JWT user claims or PHP session)
 * - Uses service key to bypass RLS and fetch all orders
 * - Admin role verified before service key usage
 *
 * GET /api/admin/orders/get-all
 * No body required; admin role checked via JWT/session
 *
 * Returns: { success: true, count, orders: [ { id, user_id, items: [...], ... }, ...] }
 */

require_once __DIR__ . '/../../_bootstrap.php';

// Allow GET only
require_method('GET');

// Require admin role (extracts from JWT or session, fails if not admin)
require_admin();

try {
    // Fetch ALL orders (service key bypasses RLS)
    $ordersPath = '/rest/v1/orders?select=*&order=created_at.desc';
    [$code, $resp] = supabase_request_service('GET', $ordersPath);

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
        [$iCode, $iResp] = supabase_request_service('GET', $itemsPath);

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
    error_log('Get All Orders Error: ' . $e->getMessage());
    json_error('E_GET_ORDERS_FAILED', $e->getMessage(), 500);
}
?>
