<?php
/**
 * Create Order (Supabase)
 *
 * Security:
 * - Requires authenticated user (JWT extracted from Authorization header or session)
 * - user_id extracted from JWT; NEVER trusted from client body
 * - Recalculates total_amount server-side (never trusts client value)
 * - Re-fetches product prices to prevent price tampering
 * - Validates quantities against available stock
 * - Uses service key for privileged insert
 *
 * POST /api/orders/create
 * Body: { items: [ { product_id, quantity }, ...], shipping_address: {...}, payment_method: 'payhere'|... }
 *
 * Returns: { success: true, message, order_id, order_number, order }
 */

require_once __DIR__ . '/_bootstrap.php';

// Enforce POST method
require_method('POST');

// Get authenticated user (extracts from JWT, fails if not logged in)
$user_id = require_user();

// Parse and validate request body
$input = get_json_input();

// Validate items (v_cart_items reuses cart item schema)
$items = $input['items'] ?? [];
$validated_items = v_cart_items($items);

// Validate shipping address (must be present)
$shipping_address = $input['shipping_address'] ?? null;
if (!$shipping_address || !is_array($shipping_address)) {
    json_validation_error('shipping_address', 'shipping_address object is required');
}

// Validate payment method (optional, default to 'payhere')
$payment_method = $input['payment_method'] ?? 'payhere';
if (!in_array($payment_method, ['payhere', 'card', 'bank_transfer'], true)) {
    json_validation_error('payment_method', 'Invalid payment_method');
}

try {
    // Step 1: Fetch fresh product data (price + stock)
    $productIds = array_column($validated_items, 'product_id');
    $placeholders = implode(',', array_fill(0, count($productIds), '?'));
    
    // Build OR filter for product_id
    $orFilters = [];
    foreach ($productIds as $pid) {
        $orFilters[] = 'id=eq.' . urlencode($pid);
    }
    $productFilter = implode('&or=', $orFilters);
    
    $productsPath = '/rest/v1/products?select=id,name,sku,price,stock&' . $productFilter;
    [$pCode, $pResp] = supabase_request_anon('GET', $productsPath);
    
    if ($pCode !== 200) {
        throw new Exception("Failed to fetch products (HTTP $pCode)");
    }
    
    $products = json_decode($pResp, true);
    if (!is_array($products)) {
        throw new Exception('Invalid product data from Supabase');
    }
    
    // Index products by ID for quick lookup
    $productMap = [];
    foreach ($products as $prod) {
        $productMap[$prod['id']] = $prod;
    }
    
    // Step 2: Recalculate total_amount server-side using fresh prices
    $total_amount = 0;
    $order_items = [];
    
    foreach ($validated_items as $item) {
        $product_id = $item['product_id'];
        $quantity = $item['quantity'];
        
        if (!isset($productMap[$product_id])) {
            throw new Exception("Product $product_id not found");
        }
        
        $product = $productMap[$product_id];
        $price = floatval($product['price'] ?? 0);
        $stock = intval($product['stock'] ?? 0);
        
        // Validate stock
        if ($quantity > $stock) {
            throw new Exception("Insufficient stock for {$product['name']} (requested: $quantity, available: $stock)");
        }
        
        $subtotal = $price * $quantity;
        $total_amount += $subtotal;
        
        $order_items[] = [
            'product_id' => $product_id,
            'product_name' => $product['name'] ?? '',
            'sku' => $product['sku'] ?? '',
            'quantity' => $quantity,
            'price' => $price,
            'subtotal' => $subtotal,
        ];
    }
    
    // Generate order number
    $orderNumber = 'ORD-' . time() . '-' . rand(1000, 9999);
    
    // Step 3: Create order with recalculated total
    $orderData = [
        'order_number' => $orderNumber,
        'user_id' => $user_id,
        'total_amount' => round($total_amount, 2),
        'status' => 'pending',
        'payment_status' => 'pending',
        'payment_method' => $payment_method,
        'shipping_address' => json_encode($shipping_address),
        'created_at' => date('c'),
    ];
    
    // Insert order using service key (privileged)
    [$oCode, $oResp] = supabase_request_service('POST', '/rest/v1/orders', $orderData);
    
    if ($oCode !== 201) {
        throw new Exception("Failed to create order (HTTP $oCode): $oResp");
    }
    
    $createdOrder = json_decode($oResp, true);
    if (!is_array($createdOrder) || empty($createdOrder)) {
        throw new Exception('Invalid response from Supabase');
    }
    
    $order_id = $createdOrder[0]['id'];
    
    // Step 4: Insert order items
    foreach ($order_items as &$oi) {
        $oi['order_id'] = $order_id;
    }
    
    if (!empty($order_items)) {
        [$iCode, $iResp] = supabase_request_service('POST', '/rest/v1/order_items', $order_items);
        
        if ($iCode !== 201) {
            // Log but don't fail (order created; items may have insert issues)
            error_log("Create Order: Failed to insert order items (HTTP $iCode): $iResp");
        }
    }
    
    json_success([
        'message' => 'Order created successfully',
        'order_id' => $order_id,
        'order_number' => $orderNumber,
        'order' => $createdOrder[0],
    ]);

} catch (Exception $e) {
    error_log('Create Order Error: ' . $e->getMessage());
    json_error('E_CREATE_ORDER_FAILED', $e->getMessage(), 400);
}
?>
