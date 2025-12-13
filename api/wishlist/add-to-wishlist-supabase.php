<?php
/**
 * Add to Wishlist (Supabase)
 *
 * Security:
 * - Requires authenticated user (JWT extracted from Authorization header or session)
 * - user_id extracted from JWT; NEVER trusted from client body
 * - Input validated via product_id validation
 * - Uses RLS for insert; anon key can only add to own wishlist
 *
 * POST /api/wishlist/add
 * Body: { product_id: string|number }
 *
 * Returns: { success: true, message, action: 'created'|'exists' }
 */

require_once __DIR__ . '/../_bootstrap.php';

// Enforce POST method
require_method('POST');

// Get authenticated user (extracts from JWT, fails if not logged in)
$user_id = require_user();

// Parse and validate request body
$input = get_json_input();

// Validate product_id
$product_id = $input['product_id'] ?? null;
if (!$product_id) {
    json_validation_error('product_id', 'product_id is required');
}

try {
    // Check if item already exists in user's wishlist
    $checkPath = '/rest/v1/wishlist_items?user_id=eq.' . urlencode($user_id) . '&product_id=eq.' . urlencode($product_id);
    [$code, $resp] = supabase_request_anon('GET', $checkPath);
    if ($code !== 200) {
        throw new Exception("Failed to check existing wishlist item (HTTP $code)");
    }

    $existingItems = json_decode($resp, true);

    if (is_array($existingItems) && count($existingItems) > 0) {
        // Already exists
        json_success([
            'message' => 'Already in wishlist',
            'action' => 'exists',
        ]);
    }

    // INSERT: new wishlist item
    $wishlistData = [
        'user_id' => $user_id,
        'product_id' => $product_id,
        'created_at' => date('c'),
    ];

    [$iCode, $iResp] = supabase_request_anon('POST', '/rest/v1/wishlist_items', $wishlistData);
    if ($iCode !== 201) {
        throw new Exception("Failed to add to wishlist (HTTP $iCode): $iResp");
    }

    json_success([
        'message' => 'Added to wishlist',
        'action' => 'created',
    ]);

} catch (Exception $e) {
    error_log('Add to Wishlist Error: ' . $e->getMessage());
    json_error('E_ADD_TO_WISHLIST_FAILED', $e->getMessage(), 400);
}
?>
