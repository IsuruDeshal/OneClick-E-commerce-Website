<?php
// /api/public/products.php
// GET - List products with pagination + filters
require_once __DIR__ . '/../_bootstrap.php';
require_method('GET');

// Light rate limit for public
rate_limit('products_list', 120);

$page  = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
$limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 20;
$offset = ($page - 1) * $limit;

$category = $_GET['category'] ?? null;
$search   = $_GET['q'] ?? null;

// Build query string
$qs = [
    'select=*',
    'status=eq.active',
    'order=created_at.desc',
    "limit=$limit",
    "offset=$offset",
];

if ($category) {
    $qs[] = 'category=eq.' . urlencode($category);
}
if ($search) {
    $qs[] = 'name=ilike.' . urlencode('%' . $search . '%');
}

$query = '/rest/v1/products?' . implode('&', $qs);

[$code, $resp] = supabase_request_anon('GET', $query);
if ($code !== 200) {
    json_error('E_UPSTREAM', 'Failed to load products', 502);
}

$data = json_decode($resp, true) ?: [];
json_success([
    'items' => $data,
    'page'  => $page,
    'limit' => $limit,
]);
?>
