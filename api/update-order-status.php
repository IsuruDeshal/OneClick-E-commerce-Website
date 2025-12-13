<?php
/**
 * Update Order Status API
 * Supports PayHere callbacks and manual status changes from frontend.
 * Accepts JSON: { order_id | order_number, status, payment_status }
 * Updates both orders and payments tables when applicable.
 */
require_once __DIR__ . '/db_connect_universal.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success'=>false,'error'=>'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) throw new Exception('Invalid JSON body');

    $orderIdentifier = $input['order_id'] ?? $input['order_number'] ?? null; // PayHere returns order_id
    $newStatus = trim($input['status'] ?? '');
    $paymentStatus = trim($input['payment_status'] ?? '');

    if (!$orderIdentifier) throw new Exception('order_id or order_number is required');
    if (!$newStatus && !$paymentStatus) throw new Exception('At least one of status or payment_status required');

    // Determine column to match (we store order_number in orders table)
    $matchColumn = 'order_number';
    $matchValue = $orderIdentifier; // assume passed order_id is actually the order_number generated earlier

    // Fetch order
    $order = queryOne("SELECT id, order_number, status, payment_status FROM orders WHERE $matchColumn = $1", [$matchValue]);
    if (!$order) throw new Exception('Order not found');

    $updates = [];
    $params = [];
    $idx = 1;

    if ($newStatus) { $updates[] = "status = $" . $idx; $params[] = $newStatus; $idx++; }
    if ($paymentStatus) { $updates[] = "payment_status = $" . $idx; $params[] = $paymentStatus; $idx++; }
    $updates[] = "updated_at = CURRENT_TIMESTAMP";

    $params[] = $matchValue;

    $sql = "UPDATE orders SET " . implode(', ', $updates) . " WHERE $matchColumn = $" . $idx . " RETURNING id";
    $updated = queryOne($sql, $params);
    if (!$updated) throw new Exception('Order update failed');

    // Update payments table if payment_status provided
    if ($paymentStatus && function_exists('tableExists') && tableExists('payments')) {
        execute("UPDATE payments SET status = $1 WHERE order_number = $2", [$paymentStatus, $matchValue]);
    }

    echo json_encode([
        'success'=>true,
        'message'=>'Order updated',
        'order_number'=>$matchValue,
        'status'=>$newStatus ?: $order['status'],
        'payment_status'=>$paymentStatus ?: $order['payment_status']
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
}
?>
