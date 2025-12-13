<?php
/**
 * Admin Save Product (Supabase)
 *
 * Security:
 * - Requires admin role (extracted from JWT or PHP session)
 * - Input validated via v_product() helper
 * - Uses service key for INSERT/UPDATE (privileged, admin-only)
 * - Rejects non-admin attempts before any Supabase call
 *
 * POST /api/admin/save-product
 * Body: { name, sku, price, offer_price?, stock, category?, description?, image_url?, condition?, featured?, status? }
 *
 * Returns: { success: true, message, product_id, product }
 */

require_once __DIR__ . '/_bootstrap.php';

// Enforce POST
require_method('POST');

// Require admin role (extracts from JWT or session, fails if not admin)
require_admin();

// Parse and validate request body
$input = get_json_input();

// Validate product data using centralized validator
$validated_product = v_product($input);

try {
    // Check if UPDATE or INSERT
    $product_id = $validated_product['id'] ?? null;
    $is_update = !empty($product_id);

    // Prepare payload (ensure correct types)
    $productData = [
        'name' => $validated_product['name'],
        'sku' => $validated_product['sku'],
        'price' => floatval($validated_product['price']),
        'offer_price' => $validated_product['offer_price'] ?? null,
        'stock' => intval($validated_product['stock'] ?? 0),
        'category' => $validated_product['category'] ?? '',
        'description' => $validated_product['description'] ?? '',
        'image_url' => $validated_product['image_url'] ?? '',
        'condition' => $validated_product['condition'] ?? 'Brand New',
        'featured' => (bool)($validated_product['featured'] ?? false),
        'status' => $validated_product['status'] ?? 'active',
    ];

    if ($is_update) {
        // UPDATE existing product
        $path = '/rest/v1/products?id=eq.' . urlencode($product_id);
        [$code, $resp] = supabase_request_service('PATCH', $path, $productData);
        $message = 'Product updated successfully';
    } else {
        // INSERT new product
        $productData['created_at'] = date('c');
        [$code, $resp] = supabase_request_service('POST', '/rest/v1/products', $productData);
        $message = 'Product created successfully';
    }

    // Validate response
    if ($code !== 200 && $code !== 201) {
        throw new Exception("Failed to save product (HTTP $code): $resp");
    }

    $result = json_decode($resp, true);
    if (!is_array($result) || empty($result)) {
        throw new Exception('Invalid response from Supabase');
    }

    json_success([
        'message' => $message,
        'product_id' => $is_update ? $product_id : $result[0]['id'],
        'product' => $result[0],
    ]);

} catch (Exception $e) {
    error_log('Admin Save Product Error: ' . $e->getMessage());
    json_error('E_SAVE_PRODUCT_FAILED', $e->getMessage(), 400);
}
?>
