<?php
// /api/user/cart.php
// Handles: GET (list), POST action=add, DELETE action=remove, POST action=merge
require_once __DIR__ . '/../_bootstrap.php';

$method = strtoupper($_SERVER['REQUEST_METHOD']);
$action = $_GET['action'] ?? null;

// All cart routes require user authentication
$user_id = require_user();

// Rate limit
rate_limit('cart_' . ($action ?: 'get'), 60);

// GET /api/user/cart.php?action=get
if ($method === 'GET' && $action === 'get') {
    $token = get_bearer_token();
    [$code, $resp] = supabase_request_user_data(
        'GET',
        '/rest/v1/cart_items?select=*&user_id=eq.' . urlencode($user_id),
        $token
    );
    if ($code !== 200) {
        json_error('E_UPSTREAM', 'Failed to get cart', 502);
    }
    $rows = json_decode($resp, true) ?: [];
    json_success($rows);
}

// POST /api/user/cart.php?action=add
if ($method === 'POST' && $action === 'add') {
    $input = get_json_input();
    $pid = v_uuid($input['product_id'] ?? null, 'product_id');
    $qty = v_int($input['quantity'] ?? 1, 'quantity', 1, 99);

    // Validate product exists, active, has stock (public data, use anon)
    [$pCode, $pResp] = supabase_request_anon(
        'GET',
        '/rest/v1/products?select=id,stock,status&id=eq.' . urlencode($pid)
    );
    if ($pCode !== 200) {
        json_error('E_UPSTREAM', 'Failed to validate product', 502);
    }

    $products = json_decode($pResp, true);
    $p = $products[0] ?? null;
    if (!$p || $p['status'] !== 'active') {
        json_error('E_PRODUCT_UNAVAILABLE', 'Product not available', 400);
    }

    // Add to cart (forward JWT for RLS)
    $token = get_bearer_token();
    [$cCode, $cResp] = supabase_request_user_data(
        'POST',
        '/rest/v1/cart_items',
        $token,
        [
            'body' => [
                'user_id'    => $user_id,
                'product_id' => $pid,
                'quantity'   => $qty,
            ],
            'headers' => ['Prefer: resolution=merge-duplicates'],
        ]
    );
    if ($cCode >= 400) {
        json_error('E_CART_UPDATE_FAILED', 'Failed to update cart', 502);
    }

    json_success(['message' => 'Added to cart', 'quantity' => $qty]);
}

// DELETE /api/user/cart.php?action=remove&product_id=xxx
if ($method === 'DELETE' && $action === 'remove') {
    $pid = v_uuid($_GET['product_id'] ?? null, 'product_id');

    $token = get_bearer_token();
    [$code, $resp] = supabase_request_user_data(
        'DELETE',
        '/rest/v1/cart_items?user_id=eq.' . urlencode($user_id)
        . '&product_id=eq.' . urlencode($pid),
        $token
    );
    if ($code >= 400) {
        json_error('E_CART_REMOVE_FAILED', 'Failed to remove item', 502);
    }

    json_success(['message' => 'Removed from cart']);
}

// POST /api/user/cart.php?action=merge
if ($method === 'POST' && $action === 'merge') {
    $input = get_json_input();
    $localItems = v_cart_items($input['items'] ?? [], 'items');

    if (empty($localItems)) {
        json_success(['message' => 'Nothing to merge', 'merged' => []]);
    }

    // Validate all products (public data, use anon)
    $ids = array_values(array_unique(array_column($localItems, 'product_id')));
    $filterParts = [];
    foreach ($ids as $id) {
        $filterParts[] = 'id=eq.' . urlencode($id);
    }
    $filter = implode(',', $filterParts);

    [$pCode, $pResp] = supabase_request_anon(
        'GET',
        '/rest/v1/products?select=id,stock,status&or=(' . $filter . ')'
    );
    if ($pCode !== 200) {
        json_error('E_UPSTREAM', 'Failed to validate products', 502);
    }

    $products = json_decode($pResp, true) ?: [];
    $byId = [];
    foreach ($products as $p) {
        $byId[$p['id']] = $p;
    }

    // Build clean merge list
    $merged = [];
    foreach ($localItems as $li) {
        $pid = $li['product_id'];
        $qty = $li['quantity'];

        if (!isset($byId[$pid])) {
            continue; // invalid product
        }
        $p = $byId[$pid];
        if ($p['status'] !== 'active') {
            continue; // inactive
        }

        // Clamp qty by available stock
        if ($p['stock'] !== null && $p['stock'] < $qty) {
            $qty = max(1, (int)$p['stock']);
        }

        $merged[] = [
            'user_id'    => $user_id,
            'product_id' => $pid,
            'quantity'   => $qty,
        ];
    }

    if (empty($merged)) {
        json_success(['message' => 'Nothing valid to merge', 'merged' => []]);
    }

    // Bulk insert via service role (admin operation)
    [$mCode, $mResp] = supabase_request_service(
        'POST',
        '/rest/v1/cart_items',
        [
            'body' => $merged,
            'headers' => ['Prefer: resolution=merge-duplicates'],
        ]
    );
    if ($mCode >= 400) {
        json_error('E_CART_MERGE_FAILED', 'Failed to merge cart', 502);
    }

    json_success([
        'message' => 'Cart merged',
        'merged'  => count($merged) . ' items',
    ]);
}

json_error('E_INVALID_ROUTE', 'Unknown cart action', 404);
?>
