<?php
/**
 * Get Products API - Supabase Direct
 * Fetches all products from Supabase database
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Supabase config
    $supabaseUrl = 'https://pvnlavcuswjxhywbsodm.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bmxhdmN1c3dqeGh5d2Jzb2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNTkyOTYsImV4cCI6MjA3NzczNTI5Nn0.pddR-mTtvaELNeK_F1HDwZfjs29xj__k9z-WFOqZbFA';

    // Check if specific ID requested
    $singleProduct = false;
    if (isset($_GET['id'])) {
        $id = intval($_GET['id']);
        $url = $supabaseUrl . '/rest/v1/products?select=*&id=eq.' . $id;
        $singleProduct = true;
    } else {
        // Build query for all products (no status filter for admin)
        $url = $supabaseUrl . '/rest/v1/products?select=*&order=created_at.desc';
    }

    // Fetch from Supabase
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15); // Request timeout
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10); // Connection timeout
    curl_setopt($ch, CURLOPT_DNS_CACHE_TIMEOUT, 120); // Cache DNS
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        throw new Exception('Connection error: ' . $curlError);
    }

    if ($httpCode !== 200) {
        throw new Exception('Supabase returned HTTP ' . $httpCode . ': ' . $response);
    }

    $products = json_decode($response, true);

    if (!is_array($products)) {
        throw new Exception('Invalid response from Supabase');
    }

    // If single product requested, return just that product
    if ($singleProduct) {
        if (empty($products)) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Product not found'
            ]);
            exit();
        }
        
        echo json_encode([
            'success' => true,
            'product' => $products[0],
            'source' => 'supabase'
        ]);
    } else {
        // Return all products
        echo json_encode([
            'success' => true,
            'products' => $products,
            'count' => count($products),
            'source' => 'supabase'
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'message' => 'Failed to load products from database'
    ]);
}

exit();
?>

