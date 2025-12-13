<?php
// /api/public/stock.php
// GET - Check product stock availability
require_once __DIR__ . '/../_bootstrap.php';
require_method('GET');

rate_limit('stock_check', 180);

$product_id = v_uuid($_GET['product_id'] ?? null, 'product_id');
$quantity = isset($_GET['quantity']) ? v_int($_GET['quantity'], 'quantity', 1, 99) : 1;

[$code, $resp] = supabase_request_anon(
    'GET',
    '/rest/v1/products?select=id,stock,status&id=eq.' . urlencode($product_id)
);

if ($code !== 200) {
    json_error('E_UPSTREAM', 'Failed to check stock', 502);
}

$products = json_decode($resp, true) ?: [];
$product = $products[0] ?? null;

if (!$product || $product['status'] !== 'active') {
    json_error('E_PRODUCT_UNAVAILABLE', 'Product not available', 400);
}

$available = ($product['stock'] ?? 0) >= $quantity;

json_success([
    'available' => $available,
    'stock'     => $product['stock'],
    'requested' => $quantity,
]);
?>
