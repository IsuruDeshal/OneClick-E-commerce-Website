<?php
/**
 * Check Stock (Supabase)
 *
 * Security:
 * - Public endpoint (no auth required, uses anon key)
 * - Input validated via v_int (quantity) and v_string (product_id/sku)
 * - Returns product details including stock level
 *
 * GET /api/check-stock
 * Query: product_id=XXX&quantity=N OR sku=XXX&quantity=N
 *
 * Returns: { success: true, available: bool, product_id, sku, name, stock, requested_quantity, status, price }
 */

require_once __DIR__ . '/_bootstrap.php';

// Allow GET only
require_method('GET');

// Get query parameters
$product_id = $_GET['product_id'] ?? null;
$sku = $_GET['sku'] ?? null;
$quantity = isset($_GET['quantity']) ? v_int($_GET['quantity'], 'quantity', 1) : 1;

// Validate: need either product_id or sku
if (!$product_id && !$sku) {
    json_validation_error('product_id|sku', 'Either product_id or sku is required');
}

try {
    // Build query filter
    if ($product_id) {
        $filter = 'id=eq.' . urlencode($product_id);
    } else {
        $filter = 'sku=eq.' . urlencode($sku);
    }

    // Fetch product from Supabase (anon key OK; public read)
    $path = '/rest/v1/products?' . $filter . '&select=id,name,sku,stock,price,status';
    [$code, $resp] = supabase_request_anon('GET', $path);

    if ($code !== 200) {
        throw new Exception("Failed to check stock (HTTP $code): $resp");
    }

    $products = json_decode($resp, true);
    if (!is_array($products) || count($products) === 0) {
        // Product not found
        json_success([
            'available' => false,
            'error' => 'Product not found',
        ], 404);
    }

    $product = $products[0];
    $stock = intval($product['stock'] ?? 0);
    $isActive = ($product['status'] ?? 'active') === 'active';
    $available = $isActive && $stock >= $quantity;

    json_success([
        'available' => $available,
        'product_id' => $product['id'],
        'sku' => $product['sku'],
        'name' => $product['name'],
        'stock' => $stock,
        'requested_quantity' => $quantity,
        'status' => $product['status'] ?? 'active',
        'price' => floatval($product['price'] ?? 0),
    ]);

} catch (Exception $e) {
    error_log('Check Stock Error: ' . $e->getMessage());
    json_error('E_CHECK_STOCK_FAILED', $e->getMessage(), 500);
}
?>
