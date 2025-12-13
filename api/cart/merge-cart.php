<?php
/**
 * Merge Guest Cart into User Cart
 *
 * Security:
 * - Requires authenticated user (JWT extracted from Authorization header or session)
 * - user_id extracted from JWT; NEVER trusted from client body
 * - Items validated against strict schema via v_cart_items()
 * - Uses batch insert for efficiency (future: RPC with ON CONFLICT)
 *
 * POST /api/cart/merge
 * Body: { items: [{ product_id, quantity }, ...] }
 *
 * Returns: { success: true, message, count, items }
 */

require_once __DIR__ . '/../_bootstrap.php';

// Enforce POST method
require_method('POST');

// Get authenticated user (extracts from JWT, fails if not logged in)
$user_id = require_user();

// Parse and validate request body
$input = get_json_input();
$items = $input['items'] ?? [];

// Validate cart items structure (v_cart_items exits on error)
$validated_items = v_cart_items($items);

// Aggregate quantities by product_id to consolidate duplicates
$aggregated = [];
foreach ($validated_items as $item) {
    $pid = $item['product_id'];
    $qty = $item['quantity'];
    if (!isset($aggregated[$pid])) {
        $aggregated[$pid] = 0;
    }
    $aggregated[$pid] += $qty;
    // Cap per product at 99 quantity
    if ($aggregated[$pid] > 99) {
        $aggregated[$pid] = 99;
    }
}

try {
    // Build batch insert payload
    $to_insert = [];
    foreach ($aggregated as $product_id => $quantity) {
        $to_insert[] = [
            'user_id' => $user_id,
            'product_id' => $product_id,
            'quantity' => $quantity,
            'created_at' => date('c'),
        ];
    }

    // Batch insert all items (or skip if empty)
    if (!empty($to_insert)) {
        // Use service key for batch operation (privileged insert, bypasses RLS)
        [$code, $resp] = supabase_request_service('POST', '/rest/v1/cart_items', $to_insert);
        if ($code !== 201) {
            throw new Exception("Failed to insert cart items (HTTP $code): $resp");
        }
    }

    // Fetch merged cart snapshot with product details
    $path = '/rest/v1/cart_items?user_id=eq.' . urlencode($user_id) . '&select=*,products(*)';
    [$sCode, $sResp] = supabase_request_anon('GET', $path);
    if ($sCode !== 200) {
        throw new Exception("Failed to fetch merged cart (HTTP $sCode): $sResp");
    }

    $cartItems = json_decode($sResp, true);
    if (!is_array($cartItems)) {
        $cartItems = [];
    }

    json_success([
        'message' => 'Cart merged',
        'count' => count($cartItems),
        'items' => $cartItems,
    ]);

} catch (Exception $e) {
    error_log('Merge Cart Error: ' . $e->getMessage());
    json_error('E_MERGE_FAILED', $e->getMessage(), 400);
}
?>
