<?php
/**
 * Get User's Addresses (Supabase)
 *
 * Security:
 * - Requires authenticated user (JWT extracted from Authorization header or session)
 * - user_id extracted from JWT; NOT trusted from query params
 * - Returns only addresses belonging to authenticated user (RLS enforced)
 * - Limit parameter validated via v_int
 *
 * GET /api/addresses/get-addresses
 * Query: limit=N (optional, default 10, max 100)
 *
 * Returns: { success: true, count, addresses: [ { id, name, full_name, phone, address_line1, ... }, ...] }
 */

require_once __DIR__ . '/../_bootstrap.php';

// Allow GET only
require_method('GET');

// Get authenticated user (extracts from JWT, fails if not logged in)
$user_id = require_user();

// Get optional limit parameter
$limit = isset($_GET['limit']) ? v_int($_GET['limit'], 'limit', 1, 100) : 10;

try {
    // Fetch user's addresses (RLS ensures only own addresses returned)
    $select = 'id,name,full_name,phone,address_line1,address_line2,city,postal_code,country,is_default,default_shipping,default_billing,updated_at';
    $path = '/rest/v1/addresses?user_id=eq.' . urlencode($user_id) 
        . '&select=' . urlencode($select) 
        . '&order=is_default.desc,updated_at.desc'
        . '&limit=' . $limit;

    [$code, $resp] = supabase_request_anon('GET', $path);

    if ($code !== 200) {
        throw new Exception("Failed to fetch addresses (HTTP $code): $resp");
    }

    $addresses = json_decode($resp, true);
    if (!is_array($addresses)) {
        $addresses = [];
    }

    json_success([
        'count' => count($addresses),
        'addresses' => $addresses,
    ]);

} catch (Exception $e) {
    error_log('Get Addresses Error: ' . $e->getMessage());
    json_error('E_GET_ADDRESSES_FAILED', $e->getMessage(), 500);
}
?>
