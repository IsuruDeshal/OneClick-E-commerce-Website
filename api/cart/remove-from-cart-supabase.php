<?php
/**
 * Remove from Cart (Supabase)
 *
 * Security:
 * - Requires authenticated user (JWT extracted from Authorization header or session)
 * - user_id extracted from JWT; NEVER trusted from client body
 * - Accepts either cart_item_id (RLS filters by user) OR product_id (must match user's cart)
 * - Uses RLS enforcement; anon key can only delete own items
 *
 * POST /api/cart/remove
 * Body: { product_id: string|number } OR { cart_item_id: string }
 *
 * Returns: { success: true, message }
 */

require_once __DIR__ . '/../_bootstrap.php';

// Enforce POST method
require_method('POST');

// Get authenticated user (extracts from JWT, fails if not logged in)
$user_id = require_user();

// Parse and validate request body
$input = get_json_input();

// Accept either cart_item_id OR product_id
$cart_item_id = $input['cart_item_id'] ?? null;
$product_id = $input['product_id'] ?? null;

if (!$cart_item_id && !$product_id) {
    json_validation_error('product_id|cart_item_id', 'Either product_id or cart_item_id is required');
}

try {
    // Build DELETE filter
    if ($cart_item_id) {
        // Delete by cart_item_id (RLS ensures user ownership)
        $filter = 'id=eq.' . urlencode($cart_item_id);
    } else {
        // Delete by product_id + user_id (RLS + explicit user_id in query for safety)
        $filter = 'user_id=eq.' . urlencode($user_id) . '&product_id=eq.' . urlencode($product_id);
    }

    // DELETE request to Supabase
    $path = '/rest/v1/cart_items?' . $filter;
    [$code, $resp] = supabase_request_anon('DELETE', $path);

    // 204 (No Content) or 200 is success
    if ($code !== 204 && $code !== 200) {
        throw new Exception("Failed to remove from cart (HTTP $code): $resp");
    }

    json_success([
        'message' => 'Removed from cart',
    ]);

} catch (Exception $e) {
    error_log('Remove from Cart Error: ' . $e->getMessage());
    json_error('E_REMOVE_FAILED', $e->getMessage(), 400);
}
?>
