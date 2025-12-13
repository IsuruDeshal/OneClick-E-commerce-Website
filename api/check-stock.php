<?php
/**
 * Check Stock API - PostgreSQL Version
 * Validates product availability and stock levels
 */

require_once __DIR__ . '/db_connect.php';

try {
    $data = getJSONInput();

    if (!isset($data['items']) || !is_array($data['items'])) {
        sendResponse([
            'success' => false,
            'error' => 'Invalid request: items array required'
        ], 400);
    }

    $errors = [];
    $validItems = [];

    foreach ($data['items'] as $item) {
        $sku = trim($item['sku']);
        $requestedQty = intval($item['quantity']);

        $query = "SELECT id, name, sku, stock FROM products WHERE sku = $1";
        $product = queryOne($query, [$sku]);

        if (!$product) {
            $errors[] = [
                'sku' => $sku,
                'error' => 'Product not found'
            ];
            continue;
        }

        if ($product['stock'] <= 0) {
            $errors[] = [
                'sku' => $sku,
                'name' => $product['name'],
                'error' => 'Out of stock'
            ];
            continue;
        }

        if ($requestedQty > $product['stock']) {
            $errors[] = [
                'sku' => $sku,
                'name' => $product['name'],
                'error' => "Only {$product['stock']} available"
            ];
            continue;
        }

        $validItems[] = [
            'id' => $product['id'],
            'sku' => $sku,
            'name' => $product['name'],
            'available_stock' => $product['stock'],
            'requested_qty' => $requestedQty
        ];
    }

    if (!empty($errors)) {
        sendResponse([
            'success' => false,
            'errors' => $errors,
            'valid_items' => $validItems
        ], 400);
    }

    sendResponse([
        'success' => true,
        'message' => 'All items in stock',
        'items' => $validItems
    ]);

} catch (Exception $e) {
    error_log('Check Stock Error: ' . $e->getMessage());
    sendResponse([
        'success' => false,
        'error' => 'Failed to check stock',
        'message' => DEBUG_MODE ? $e->getMessage() : null
    ], 500);
}
?>
