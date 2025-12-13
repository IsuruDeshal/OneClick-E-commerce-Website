<?php
/**
 * Get Categories from Supabase
 * Fetches all product categories directly from Supabase REST API
 */

require_once __DIR__ . '/config-local.php';

header('Content-Type: application/json');

try {
    // Get distinct categories from products table
    $url = SUPABASE_URL . '/rest/v1/products?select=category&order=category.asc';
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_DNS_CACHE_TIMEOUT => 120,
        CURLOPT_HTTPHEADER => [
            'apikey: ' . SUPABASE_ANON_KEY,
            'Authorization: Bearer ' . SUPABASE_ANON_KEY,
            'Content-Type: application/json'
        ]
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        throw new Exception('Curl error: ' . curl_error($ch));
    }
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception('Supabase request failed with code: ' . $httpCode);
    }
    
    $products = json_decode($response, true);
    if (!is_array($products)) {
        throw new Exception('Invalid response from Supabase');
    }
    
    // Extract unique categories
    $categoriesMap = [];
    foreach ($products as $product) {
        if (!empty($product['category']) && !isset($categoriesMap[$product['category']])) {
            $categoriesMap[$product['category']] = [
                'id' => $product['category'],
                'name' => $product['category'],
                'slug' => strtolower(str_replace(' ', '-', $product['category']))
            ];
        }
    }
    
    $categories = array_values($categoriesMap);
    
    echo json_encode([
        'success' => true,
        'count' => count($categories),
        'categories' => $categories,
        'source' => 'supabase'
    ]);

} catch (Exception $e) {
    error_log('Get Categories Supabase Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch categories',
        'message' => DEBUG_MODE ? $e->getMessage() : null
    ]);
}
?>
