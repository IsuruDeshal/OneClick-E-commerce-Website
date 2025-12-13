<?php
/**
 * Admin Delete Product (Supabase)
 *
 * Security:
 * - Requires admin role (extracted from JWT or PHP session)
 * - Product ID validated via v_int()
 * - Uses service key for DELETE (privileged, admin-only)
 * - Rejects non-admin attempts before any Supabase call
 *
 * DELETE /api/admin/delete-product
 * POST /api/admin/delete-product (for browser compatibility)
 * Body: { id: number (product_id) }
 *
 * Returns: { success: true, message }
 */

require_once __DIR__ . '/_bootstrap.php';

// Allow POST or DELETE
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'DELETE') {
    require_method('DELETE');
} elseif ($method === 'POST') {
    require_method('POST');
} else {
    json_error('E_METHOD_NOT_ALLOWED', 'DELETE or POST required', 405);
}

// Require admin role (extracts from JWT or session, fails if not admin)
require_admin();

// Parse and validate request body
$input = get_json_input();

// Validate product ID (integer)
$product_id = v_int($input['id'] ?? null, 'id', 1);

try {
    // DELETE request to Supabase using service key
    $path = '/rest/v1/products?id=eq.' . urlencode($product_id);
    [$code, $resp] = supabase_request_service('DELETE', $path);

    // Supabase returns 204 (No Content) or 200 on successful delete
    if ($code !== 204 && $code !== 200) {
        throw new Exception("Failed to delete product (HTTP $code): $resp");
    }

    json_success([
        'message' => 'Product deleted successfully',
    ]);

} catch (Exception $e) {
    error_log('Admin Delete Product Error: ' . $e->getMessage());
    json_error('E_DELETE_PRODUCT_FAILED', $e->getMessage(), 400);
}
?>
