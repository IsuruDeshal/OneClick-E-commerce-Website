<?php
/**
 * Sync Cart - Supabase PostgreSQL
 * Syncs cart items for logged-in user
 */

require_once dirname(__DIR__) . '/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

try {
    session_start();

    if (!isset($_SESSION['user_id'])) {
        sendResponse([
            'success' => false,
            'message' => 'Not authenticated'
        ], 401);
    }

    $userId = $_SESSION['user_id'];
    $input = getJSONInput();

    if (!isset($input['items']) || !is_array($input['items'])) {
        sendResponse([
            'success' => false,
            'message' => 'Invalid items data'
        ], 400);
    }

    beginTransaction();

    try {
        // Clear existing cart
        execute("DELETE FROM carts WHERE user_id = $1", [$userId]);

        // Insert new items
        foreach ($input['items'] as $item) {
            if (!isset($item['id']) || !isset($item['quantity'])) {
                continue;
            }

            $productId = (int)$item['id'];
            $quantity = (int)$item['quantity'];

            if ($quantity <= 0) continue;

            execute(
                "INSERT INTO carts (user_id, product_id, quantity) VALUES ($1, $2, $3)",
                [$userId, $productId, $quantity]
            );
        }

        commit();

        sendResponse([
            'success' => true,
            'message' => 'Cart synced successfully'
        ]);

    } catch (Exception $e) {
        rollback();
        throw $e;
    }

} catch (Exception $e) {
    error_log('Sync Cart Error: ' . $e->getMessage());
    sendResponse([
        'success' => false,
        'message' => 'Failed to sync cart'
    ], 500);
}
?>

