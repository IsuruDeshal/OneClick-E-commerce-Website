<?php
/**
 * Seed Products - Add Sample Data
 * Inserts 20 sample products into Supabase PostgreSQL
 */

require_once __DIR__ . '/db_connect.php';

// Sample product data
$products = [
    // Mice
    ['Gaming Mouse RGB Pro', 'Mouse', 4500.00, 30, 'Premium RGB gaming mouse with 16000 DPI', '/assets/img/products/mouse1.webp'],
    ['Wireless Mouse Silent', 'Mouse', 2800.00, 45, 'Silent click wireless mouse for office', '/assets/img/products/mouse2.webp'],
    ['Ergonomic Mouse Vertical', 'Mouse', 3200.00, 25, 'Vertical ergonomic design reduces wrist strain', '/assets/img/products/mouse3.webp'],

    // Keyboards
    ['Mechanical Keyboard RGB', 'Keyboard', 8500.00, 20, 'Cherry MX RGB mechanical keyboard', '/assets/img/products/keyboard1.webp'],
    ['Wireless Keyboard Combo', 'Keyboard', 4200.00, 35, 'Wireless keyboard and mouse combo', '/assets/img/products/keyboard2.webp'],
    ['Gaming Keyboard LED', 'Keyboard', 5800.00, 28, 'LED backlit gaming keyboard', '/assets/img/products/keyboard3.webp'],

    // Monitors
    ['24" Full HD Monitor', 'Monitor', 28000.00, 15, '24 inch IPS Full HD display', '/assets/img/products/monitor1.webp'],
    ['27" Gaming Monitor 144Hz', 'Monitor', 45000.00, 10, '27 inch 144Hz gaming monitor', '/assets/img/products/monitor2.webp'],
    ['32" 4K UHD Monitor', 'Monitor', 65000.00, 8, '32 inch 4K Ultra HD monitor', '/assets/img/products/monitor3.webp'],

    // Headsets
    ['Gaming Headset RGB', 'Headset', 6500.00, 25, '7.1 surround sound gaming headset', '/assets/img/products/headset1.webp'],
    ['Wireless Headset Pro', 'Headset', 8900.00, 18, 'Premium wireless headset with ANC', '/assets/img/products/headset2.webp'],
    ['Budget Headset', 'Headset', 2200.00, 40, 'Affordable gaming headset', '/assets/img/products/headset3.webp'],

    // Storage
    ['SSD 500GB NVMe', 'SSD', 9500.00, 30, 'High-speed NVMe SSD 500GB', '/assets/img/products/ssd1.webp'],
    ['SSD 1TB SATA', 'SSD', 12000.00, 25, '1TB SATA SSD 2.5 inch', '/assets/img/products/ssd2.webp'],
    ['External SSD 1TB', 'External SSD', 15000.00, 20, 'Portable external SSD 1TB', '/assets/img/products/ssd3.webp'],

    // Graphics Cards
    ['RTX 4060 8GB', 'Graphics Card', 95000.00, 5, 'NVIDIA RTX 4060 8GB GDDR6', '/assets/img/products/gpu1.webp'],
    ['RX 7600 8GB', 'Graphics Card', 85000.00, 6, 'AMD Radeon RX 7600 8GB', '/assets/img/products/gpu2.webp'],

    // Accessories
    ['Gaming Mousepad XXL', 'Mousepad', 1800.00, 50, 'Extra large RGB gaming mousepad', '/assets/img/products/pad1.webp'],
    ['Webcam 1080p', 'Webcam', 6800.00, 22, 'Full HD 1080p webcam with microphone', '/assets/img/products/webcam1.webp'],
    ['USB Hub 7-Port', 'USB Device', 2500.00, 35, '7-port USB 3.0 hub', '/assets/img/products/hub1.webp']
];

try {
    // Check if products already exist
    $existingCount = queryOne("SELECT COUNT(*) as count FROM products");

    if ($existingCount && $existingCount['count'] > 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Products already exist in database',
            'count' => $existingCount['count']
        ]);
        exit;
    }

    beginTransaction();

    $inserted = 0;

    foreach ($products as $product) {
        list($name, $category, $price, $stock, $description, $image) = $product;

        // Generate SKU
        $sku = 'OCC-' . strtoupper(substr($category, 0, 3)) . '-' . rand(1000, 9999);

        // Insert product
        $query = "INSERT INTO products (name, sku, price, stock, category, description, image_url)
                  VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id";

        $result = queryOne($query, [$name, $sku, $price, $stock, $category, $description, $image]);

        if ($result) {
            $inserted++;
        }
    }

    commit();

    echo json_encode([
        'success' => true,
        'message' => 'Sample products added successfully',
        'inserted' => $inserted
    ]);

} catch (Exception $e) {
    rollback();
    error_log('Seed Products Error: ' . $e->getMessage());

    echo json_encode([
        'success' => false,
        'message' => 'Failed to seed products',
        'error' => DEBUG_MODE ? $e->getMessage() : null
    ]);
}
?>
