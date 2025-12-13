<?php
/**
 * Sync Wishlist
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
        // Clear existing wishlist
        execute("DELETE FROM wishlists WHERE user_id = $1", [$userId]);

        // Insert new items
        foreach ($input['items'] as $item) {
            if (!isset($item['id'])) continue;

            $productId = (int)$item['id'];

            execute(
                "INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2)",
                [$userId, $productId]
            );
        }

        commit();

        sendResponse([
            'success' => true,
            'message' => 'Wishlist synced successfully'
        ]);

    } catch (Exception $e) {
        rollback();
        throw $e;
    }

} catch (Exception $e) {
    error_log('Sync Wishlist Error: ' . $e->getMessage());
    sendResponse([
        'success' => false,
        'message' => 'Failed to sync wishlist'
    ], 500);
}
?>

