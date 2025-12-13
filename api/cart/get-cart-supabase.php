<?php
/**
 * Get Cart from Supabase
 * Fetches user's shopping cart items
 */

require_once __DIR__ . '/../config-local.php';

header('Content-Type: application/json');

try {
    $userId = $_GET['user_id'] ?? null;
    
    if (!$userId) {
        throw new Exception('user_id is required');
    }
    
    // Fetch cart items with product details
    $url = SUPABASE_URL . '/rest/v1/cart_items?user_id=eq.' . urlencode($userId) . '&select=*,products(*)';
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'apikey: ' . SUPABASE_ANON_KEY,
            'Authorization: Bearer ' . SUPABASE_ANON_KEY,
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
        throw new Exception('Failed to fetch cart: HTTP ' . $httpCode);
    }
    
    $cartItems = json_decode($response, true);
    
    if (!is_array($cartItems)) {
        $cartItems = [];
    }
    
    // Calculate totals
    $totalAmount = 0;
    foreach ($cartItems as $item) {
        $quantity = intval($item['quantity'] ?? 1);
        $price = floatval($item['products']['price'] ?? 0);
        $totalAmount += ($price * $quantity);
    }
    
    echo json_encode([
        'success' => true,
        'count' => count($cartItems),
        'items' => $cartItems,
        'total_amount' => $totalAmount,
        'source' => 'supabase'
    ]);

} catch (Exception $e) {
    error_log('Get Cart Supabase Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch cart',
        'message' => DEBUG_MODE ? $e->getMessage() : null
    ]);
}
?>
