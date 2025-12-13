<?php
/**
 * PayHere Payment Notification Handler - Universal Version
 * Receives server-to-server notifications from PayHere
 */

require_once __DIR__ . '/db_connect_universal.php';

// Log all POST data for debugging
$logFile = __DIR__ . '/logs/payhere.log';
$logDir = dirname($logFile);
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}
file_put_contents($logFile, date('Y-m-d H:i:s') . " - " . print_r($_POST, true) . "\n", FILE_APPEND);

try {
    // Get PayHere POST data
    $merchant_id = $_POST['merchant_id'] ?? '';
    $order_id = $_POST['order_id'] ?? '';
    $payhere_amount = $_POST['payhere_amount'] ?? '';
    $payhere_currency = $_POST['payhere_currency'] ?? '';
    $status_code = $_POST['status_code'] ?? '';
    $md5sig = $_POST['md5sig'] ?? '';

    // Additional data
    $payment_id = $_POST['payment_id'] ?? '';
    $method = $_POST['method'] ?? '';
    $card_holder_name = $_POST['card_holder_name'] ?? '';
    $card_no = $_POST['card_no'] ?? '';

    // Validate signature
    $merchant_secret = PAYHERE_MERCHANT_SECRET;
    $local_md5sig = strtoupper(
        md5(
            $merchant_id .
            $order_id .
            $payhere_amount .
            $payhere_currency .
            $status_code .
            strtoupper(md5($merchant_secret))
        )
    );

    // Check if signature is valid
    if ($local_md5sig !== $md5sig) {
        file_put_contents($logFile, "❌ Invalid signature for order: $order_id\n", FILE_APPEND);
        http_response_code(400);
        exit('Invalid signature');
    }

    // Merchant ID validation
    $expectedMerchant = PAYHERE_MERCHANT_ID;
    if ($merchant_id !== $expectedMerchant) {
        file_put_contents($logFile, "❌ Merchant mismatch posted:$merchant_id expected:$expectedMerchant\n", FILE_APPEND);
        http_response_code(400);
        exit('Merchant mismatch');
    }

    // Status codes:
    // 2 = Success
    // 0 = Pending
    // -1 = Canceled
    // -2 = Failed
    // -3 = Chargedback

    $paymentStatus = 'failed';
    $orderStatus = 'failed';

    switch ($status_code) {
        case '2':
            $paymentStatus = 'completed';
            $orderStatus = 'confirmed';
            break;
        case '0':
            $paymentStatus = 'pending';
            $orderStatus = 'payment_pending';
            break;
        case '-1':
            $paymentStatus = 'canceled';
            $orderStatus = 'canceled';
            break;
        case '-2':
        case '-3':
            $paymentStatus = 'failed';
            $orderStatus = 'failed';
            break;
    }

    // Idempotency: skip if we already processed this order + transaction
    $existing = fetchOne("SELECT id, status FROM payments WHERE order_number = $1 AND transaction_id = $2", [$order_id, $payment_id]);
    if ($existing && $existing['status'] === 'completed') {
        file_put_contents($logFile, "ℹ️ Duplicate notify ignored (already completed) order:$order_id tx:$payment_id\n", FILE_APPEND);
        http_response_code(200);
        exit('OK');
    }

    beginTransaction();

    try {
        // Ensure payment row exists
        if (!$existing) {
            execute("INSERT INTO payments (order_id, order_number, payment_method, amount, status, transaction_id, payment_data) VALUES ((SELECT id FROM orders WHERE order_number = $1), $1, 'payhere', $2, 'pending', $3, '{}'::json)", [$order_id, $payhere_amount ?: 0, $payment_id]);
        }

        // Update payment record
        $paymentData = json_encode([
            'payment_id' => $payment_id,
            'method' => $method,
            'card_holder_name' => $card_holder_name,
            'card_no' => $card_no,
            'status_code' => $status_code,
            'received_at' => date('Y-m-d H:i:s')
        ]);

        $updatePaymentQuery = "UPDATE payments
                               SET status = $1, transaction_id = $2, payment_data = $3
                               WHERE order_number = $4";
        execute($updatePaymentQuery, [$paymentStatus, $payment_id, $paymentData, $order_id]);

        // Update order status
        $updateOrderQuery = "UPDATE orders
                             SET status = $1, payment_status = $2
                             WHERE order_number = $3";
        execute($updateOrderQuery, [$orderStatus, $paymentStatus, $order_id]);

        commit();

        file_put_contents($logFile, "✅ Order $order_id updated to status: $orderStatus\n", FILE_APPEND);

        http_response_code(200);
        echo 'OK';

    } catch (Exception $e) {
        rollback();
        throw $e;
    }

} catch (Exception $e) {
    $order_id = $_POST['order_id'] ?? 'unknown';
    file_put_contents($logFile, "❌ Error updating order $order_id: " . $e->getMessage() . "\n", FILE_APPEND);
    error_log('PayHere Notify Error: ' . $e->getMessage());
    http_response_code(500);
    echo 'Error';
}
?>
