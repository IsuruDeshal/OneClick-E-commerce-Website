<?php
/**
 * Add to Cart (Supabase)
 *
 * Security:
 * - Requires authenticated user (JWT extracted from Authorization header or session)
 * - user_id extracted from JWT; NEVER trusted from client body
 * - Input validated via v_int (product_id) and v_int (quantity)
 * - Uses RLS for insert; anon key can only add to own cart
 *
 * POST /api/cart/add-to-cart
 * Body: { product_id: string|number, quantity?: number (default 1) }
 *
 * Returns: { success: true, message, action: 'created'|'updated', quantity }
 */

require_once __DIR__ . '/../_bootstrap.php';

// Enforce POST method
require_method('POST');

// Get authenticated user (extracts from JWT, fails if not logged in)
$user_id = require_user();

// Parse and validate request body
$input = get_json_input();

// Validate product_id (numeric UUID or string)
$product_id = $input['product_id'] ?? null;
if (!$product_id) {
    json_validation_error('product_id', 'product_id is required');
}

// Validate quantity (optional, default 1)
$quantity = isset($input['quantity']) ? v_int($input['quantity'], 'quantity', 1, 99) : 1;

try {
    // Check if item already exists in user's cart (using service key + filtering)
    $checkPath = '/rest/v1/cart_items?user_id=eq.' . urlencode($user_id) . '&product_id=eq.' . urlencode($product_id);
    [$code, $resp] = supabase_request_anon('GET', $checkPath);
    if ($code !== 200) {
        throw new Exception("Failed to check existing cart item (HTTP $code)");
    }

    $existingItems = json_decode($resp, true);

    if (is_array($existingItems) && count($existingItems) > 0) {
        // UPDATE: existing item; increment quantity
        $existingItem = $existingItems[0];
        $newQuantity = intval($existingItem['quantity'] ?? 0) + $quantity;
        if ($newQuantity > 99) $newQuantity = 99;

        $updatePath = '/rest/v1/cart_items?id=eq.' . urlencode($existingItem['id']);
        [$uCode, $uResp] = supabase_request_anon('PATCH', $updatePath, ['quantity' => $newQuantity]);
        if ($uCode !== 200) {
            throw new Exception("Failed to update cart item (HTTP $uCode)");
        }

        json_success([
            'message' => 'Cart updated',
            'action' => 'updated',
            'quantity' => $newQuantity,
        ]);
    } else {
        // INSERT: new item
        $cartData = [
            'user_id' => $user_id,
            'product_id' => $product_id,
            'quantity' => $quantity,
            'created_at' => date('c'),
        ];

        [$iCode, $iResp] = supabase_request_anon('POST', '/rest/v1/cart_items', $cartData);
        if ($iCode !== 201) {
            throw new Exception("Failed to add to cart (HTTP $iCode): $iResp");
        }

        json_success([
            'message' => 'Added to cart',
            'action' => 'created',
            'quantity' => $quantity,
        ]);
    }

} catch (Exception $e) {
    error_log('Add to Cart Error: ' . $e->getMessage());
    json_error('E_ADD_TO_CART_FAILED', $e->getMessage(), 400);
}
?>
