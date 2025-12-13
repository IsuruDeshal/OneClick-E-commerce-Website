<?php
/**
 * Quick Health Check API
 * Tests Supabase connectivity and product loading
 */

header('Content-Type: application/json; charset=utf-8');

$startTime = microtime(true);

try {
    require_once __DIR__ . '/config-local.php';

    $check = [
        'timestamp' => date('Y-m-d H:i:s'),
        'supabase_url' => SUPABASE_URL,
        'supabase_key_set' => !empty(SUPABASE_ANON_KEY),
        'use_supabase_products' => defined('USE_SUPABASE_PRODUCTS') ? USE_SUPABASE_PRODUCTS : false,
        'curl_available' => function_exists('curl_init'),
        'debug_mode' => DEBUG_MODE ?? false,
        'environment' => ENVIRONMENT ?? 'unknown'
    ];

    // Test Supabase connectivity
    if (function_exists('curl_init') && !empty(SUPABASE_ANON_KEY)) {
        $testStart = microtime(true);
        $url = SUPABASE_URL . '/rest/v1/products?select=count()&limit=1';
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_HTTPHEADER => [
                'apikey: ' . SUPABASE_ANON_KEY,
                'Authorization: Bearer ' . SUPABASE_ANON_KEY
            ]
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $check['supabase_test'] = [
            'http_code' => $httpCode,
            'response_received' => $response !== false,
            'time_ms' => round((microtime(true) - $testStart) * 1000)
        ];

        if ($httpCode === 200) {
            $data = json_decode($response, true);
            $check['supabase_test']['product_count'] = is_array($data) && count($data) > 0 ? $data[0]['count'] ?? 'N/A' : 0;
        }
    }

    $check['total_time_ms'] = round((microtime(true) - $startTime) * 1000);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'check' => $check
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'time_ms' => round((microtime(true) - $startTime) * 1000)
    ], JSON_PRETTY_PRINT);
}
?>

