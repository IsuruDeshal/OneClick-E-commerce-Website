<?php
/**
 * Update Order Status in Supabase
 * Updates order status and payment status
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
    
    $orderId = $input['order_id'] ?? $input['id'] ?? null;
    $orderNumber = $input['order_number'] ?? null;
    $newStatus = $input['status'] ?? null;
    $paymentStatus = $input['payment_status'] ?? null;
    
    if (!$orderId && !$orderNumber) {
        throw new Exception('order_id or order_number is required');
    }
    
    if (!$newStatus && !$paymentStatus) {
        throw new Exception('status or payment_status is required');
    }
    
    // Build update payload
    $updateData = [];
    if ($newStatus) {
        $updateData['status'] = $newStatus;
    }
    if ($paymentStatus) {
        $updateData['payment_status'] = $paymentStatus;
    }
    $updateData['updated_at'] = date('c'); // ISO 8601 format
    
    // Build query filter
    $filter = $orderId ? 'id=eq.' . urlencode($orderId) : 'order_number=eq.' . urlencode($orderNumber);
    
    $url = SUPABASE_URL . '/rest/v1/orders?' . $filter;
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'PATCH',
        CURLOPT_POSTFIELDS => json_encode($updateData),
        CURLOPT_HTTPHEADER => [
            'apikey: ' . SUPABASE_SERVICE_ROLE_KEY,
            'Authorization: Bearer ' . SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type: application/json',
            'Prefer: return=representation'
        ]
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        throw new Exception('Curl error: ' . curl_error($ch));
    }
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception('Failed to update order: HTTP ' . $httpCode . ' - ' . $response);
    }
    
    $updated = json_decode($response, true);
    
    echo json_encode([
        'success' => true,
        'message' => 'Order updated successfully',
        'order' => is_array($updated) && count($updated) > 0 ? $updated[0] : $updateData
    ]);

} catch (Exception $e) {
    error_log('Update Order Status Supabase Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
