<?php
/**
 * Save Settings to Supabase
 * Upserts application settings
 */

require_once __DIR__ . '/config-local.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON body');
    }
    
    $key = $input['key'] ?? null;
    $value = $input['value'] ?? null;
    
    if (!$key) {
        throw new Exception('key is required');
    }
    
    // Upsert setting (PostgreSQL specific)
    $settingData = [
        'key' => $key,
        'value' => $value
    ];
    
    $url = SUPABASE_URL . '/rest/v1/settings';
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($settingData),
        CURLOPT_HTTPHEADER => [
            'apikey: ' . SUPABASE_SERVICE_ROLE_KEY,
            'Authorization: Bearer ' . SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type: application/json',
            'Prefer: resolution=merge-duplicates,return=representation'
        ]
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        throw new Exception('Curl error: ' . curl_error($ch));
    }
    curl_close($ch);
    
    if ($httpCode !== 201) {
        throw new Exception('Failed to save setting: HTTP ' . $httpCode . ' - ' . $response);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Setting saved successfully',
        'key' => $key,
        'value' => $value
    ]);

} catch (Exception $e) {
    error_log('Save Settings Supabase Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
