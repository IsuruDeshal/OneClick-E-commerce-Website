<?php
/**
 * Merge Guest Wishlist into User Wishlist
 *
 * Security:
 * - Requires authenticated user (JWT extracted from Authorization header or session)
 * - user_id extracted from JWT; NEVER trusted from client body
 * - Items validated against strict schema via v_wishlist_items()
 * - Uses batch insert for efficiency (future: RPC with ON CONFLICT)
 *
 * POST /api/wishlist/merge
 * Body: { items: [{ product_id }, ...] }
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

// Validate wishlist items structure (v_wishlist_items exits on error)
$validated_items = v_wishlist_items($items);

// Deduplicate product_ids
$product_ids = [];
foreach ($validated_items as $item) {
    $product_ids[$item['product_id']] = true;
}

try {
    // Build batch insert payload (skip duplicates via RLS)
    $to_insert = [];
    foreach (array_keys($product_ids) as $product_id) {
        $to_insert[] = [
            'user_id' => $user_id,
            'product_id' => $product_id,
            'created_at' => date('c'),
        ];
    }

    // Batch insert all items
    if (!empty($to_insert)) {
        // Use service key for batch operation (privileged insert, bypasses RLS)
        [$code, $resp] = supabase_request_service('POST', '/rest/v1/wishlist_items', $to_insert);
        if ($code !== 201) {
            throw new Exception("Failed to insert wishlist items (HTTP $code): $resp");
        }
    }

    // Fetch merged wishlist snapshot with product details
    $path = '/rest/v1/wishlist_items?user_id=eq.' . urlencode($user_id) . '&select=*,products(*)';
    [$sCode, $sResp] = supabase_request_anon('GET', $path);
    if ($sCode !== 200) {
        throw new Exception("Failed to fetch merged wishlist (HTTP $sCode): $sResp");
    }

    $wishlistItems = json_decode($sResp, true);
    if (!is_array($wishlistItems)) {
        $wishlistItems = [];
    }

    json_success([
        'message' => 'Wishlist merged',
        'count' => count($wishlistItems),
        'items' => $wishlistItems,
    ]);

} catch (Exception $e) {
    error_log('Merge Wishlist Error: ' . $e->getMessage());
    json_error('E_MERGE_FAILED', $e->getMessage(), 400);
}
?>
