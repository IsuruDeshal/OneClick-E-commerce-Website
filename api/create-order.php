<?php
/**
 * Create Order API - PostgreSQL Version
 * Creates new order and order items in Supabase
 */

require_once __DIR__ . '/db_connect.php';

try {
    $data = getJSONInput();

    // Validate required fields
    $required = ['user_id', 'items', 'shipping_address', 'shipping_method', 'shipping_cost', 'payment_method', 'subtotal', 'total'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            sendResponse([
                'success' => false,
                'error' => "Missing required field: $field"
            ], 400);
        }
    }

    // Generate order number
    $orderNumber = 'OCC-' . time() . rand(1000, 9999);

    // Prepare order data
    $userId = trim($data['user_id']);
    $userEmail = isset($data['user_email']) ? trim($data['user_email']) : '';
    $shippingAddress = json_encode($data['shipping_address']);
    $shippingMethod = trim($data['shipping_method']);
    $shippingCost = floatval($data['shipping_cost']);
    $paymentMethod = trim($data['payment_method']);
    $subtotal = floatval($data['subtotal']);
    $tax = isset($data['tax']) ? floatval($data['tax']) : 0;
    $discount = isset($data['discount']) ? floatval($data['discount']) : 0;
    $total = floatval($data['total']);
    $status = $paymentMethod === 'card' ? 'payment_pending' : 'pending';

    // Start transaction
    beginTransaction();

    try {
        // Insert order
        $orderQuery = "INSERT INTO orders (
            order_number, user_id, user_email, shipping_address, shipping_method,
            shipping_cost, payment_method, subtotal, tax, discount, total, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id";

        $orderResult = queryOne($orderQuery, [
            $orderNumber, $userId, $userEmail, $shippingAddress, $shippingMethod,
            $shippingCost, $paymentMethod, $subtotal, $tax, $discount, $total, $status
        ]);

        if (!$orderResult) {
            throw new Exception('Failed to create order');
        }

        $orderId = $orderResult['id'];

        // Insert order items and update stock
        foreach ($data['items'] as $item) {
            $productId = isset($item['productId']) ? intval($item['productId']) : 0;
            $productName = trim($item['name']);
            $sku = trim($item['sku']);
            $quantity = intval($item['quantity']);
            $price = floatval($item['price']);
            $itemSubtotal = floatval($item['subtotal']);

            // Insert order item
            $itemQuery = "INSERT INTO order_items (
                order_id, product_id, product_name, sku, quantity, price, subtotal
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)";

            execute($itemQuery, [
                $orderId, $productId, $productName, $sku, $quantity, $price, $itemSubtotal
            ]);

            // Reduce stock
            $stockQuery = "UPDATE products SET stock = stock - $1 WHERE sku = $2";
            execute($stockQuery, [$quantity, $sku]);
        }

        // Create payment record
        $paymentQuery = "INSERT INTO payments (
            order_id, order_number, payment_method, amount, status
        ) VALUES ($1, $2, $3, $4, 'pending')";

        execute($paymentQuery, [$orderId, $orderNumber, $paymentMethod, $total]);

        // Commit transaction
        commit();

        sendResponse([
            'success' => true,
            'message' => 'Order created successfully',
            'order' => [
                'id' => $orderId,
                'order_number' => $orderNumber,
                'status' => $status,
                'total' => $total
            ]
        ], 201);

    } catch (Exception $e) {
        // Rollback on error
        rollback();
        throw $e;
    }

} catch (Exception $e) {
    error_log('Create Order Error: ' . $e->getMessage());
    sendResponse([
        'success' => false,
        'error' => 'Failed to create order',
        'message' => DEBUG_MODE ? $e->getMessage() : null
    ], 500);
}
?>
