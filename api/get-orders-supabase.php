<?php
/**
 * Get Orders from Supabase
 * Returns orders with items for a specific user or all orders (admin)
 */

require_once __DIR__ . '/config-local.php';

header('Content-Type: application/json');

try {
    $userId = $_GET['user_id'] ?? null;
    $isAdmin = isset($_GET['admin']) && $_GET['admin'] === 'true';
    
    // Build query
    if ($isAdmin) {
        // Admin gets all orders
        $ordersUrl = SUPABASE_URL . '/rest/v1/orders?select=*&order=created_at.desc';
        $authKey = SUPABASE_SERVICE_ROLE_KEY; // Use service role for admin
    } else {
        if (!$userId) {
            throw new Exception('user_id parameter required for user orders');
        }
        $ordersUrl = SUPABASE_URL . '/rest/v1/orders?user_id=eq.' . urlencode($userId) . '&select=*&order=created_at.desc';
        $authKey = SUPABASE_ANON_KEY;
    }
    
    // Fetch orders
    $ch = curl_init($ordersUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_DNS_CACHE_TIMEOUT => 120,
        CURLOPT_HTTPHEADER => [
            'apikey: ' . $authKey,
            'Authorization: Bearer ' . $authKey,
            'Content-Type: application/json'
        ]
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        throw new Exception('Curl error: ' . curl_error($ch));
    }
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception('Failed to fetch orders: HTTP ' . $httpCode);
    }
    
    $orders = json_decode($response, true);
    if (!is_array($orders)) {
        throw new Exception('Invalid response from Supabase');
    }
    
    // Fetch order items for each order
    foreach ($orders as &$order) {
        $orderId = $order['id'];
        
        $itemsUrl = SUPABASE_URL . '/rest/v1/order_items?order_id=eq.' . urlencode($orderId) . '&select=*';
        
        $ch = curl_init($itemsUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_DNS_CACHE_TIMEOUT => 120,
            CURLOPT_HTTPHEADER => [
                'apikey: ' . $authKey,
                'Authorization: Bearer ' . $authKey,
                'Content-Type: application/json'
            ]
        ]);
        
        $itemsResponse = curl_exec($ch);
        curl_close($ch);
        
        $items = json_decode($itemsResponse, true);
        $order['items'] = is_array($items) ? $items : [];
        
        // Decode shipping address if JSON string
        if (isset($order['shipping_address']) && is_string($order['shipping_address'])) {
            $order['shipping_address'] = json_decode($order['shipping_address'], true);
        }
    }
    
    echo json_encode([
        'success' => true,
        'count' => count($orders),
        'orders' => $orders,
        'source' => 'supabase'
    ]);

} catch (Exception $e) {
    error_log('Get Orders Supabase Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch orders',
        'message' => DEBUG_MODE ? $e->getMessage() : null
    ]);
}
?>
