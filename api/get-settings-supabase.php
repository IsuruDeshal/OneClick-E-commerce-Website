<?php
/**
 * Get Settings from Supabase
 * Fetches application settings like WhatsApp number
 */

require_once __DIR__ . '/config-local.php';

header('Content-Type: application/json');

try {
    $key = $_GET['key'] ?? 'whatsapp_number';
    
    $url = SUPABASE_URL . '/rest/v1/settings?key=eq.' . urlencode($key) . '&select=*';
    
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
        throw new Exception('Supabase request failed: HTTP ' . $httpCode);
    }
    
    $settings = json_decode($response, true);
    
    $value = null;
    if (is_array($settings) && count($settings) > 0) {
        $value = $settings[0]['value'] ?? null;
    }
    
    echo json_encode([
        'success' => true,
        'key' => $key,
        'value' => $value,
        'whatsapp' => $key === 'whatsapp_number' ? $value : null,
        'source' => 'supabase'
    ]);

} catch (Exception $e) {
    error_log('Get Settings Supabase Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch settings',
        'message' => DEBUG_MODE ? $e->getMessage() : null
    ]);
}
?>
