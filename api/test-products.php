<?php
/**
 * QUICK TEST - Check if everything is working
 * Visit: http://localhost/oneclick/api/test-products.php
 */

echo "<h1>One Click Computers - Products API Test</h1>";
echo "<pre>";

// Test 1: Check PHP Version
echo "✅ PHP Version: " . phpversion() . "\n";

// Test 2: Check MySQL Extension
echo "✅ MySQL Extension: " . (extension_loaded('mysqli') ? 'LOADED' : 'NOT LOADED') . "\n";

// Test 3: Try to connect to MySQL
echo "\n--- DATABASE CONNECTION TEST ---\n";
$conn = @mysqli_connect('localhost', 'root', '', 'oneclick_db', 3306);

if ($conn) {
    echo "✅ MySQL Connected Successfully\n";

    // Test 4: Check if products table exists
    $result = mysqli_query($conn, "SELECT COUNT(*) as cnt FROM products");
    if ($result) {
        $row = mysqli_fetch_assoc($result);
        echo "✅ Products Table Found\n";
        echo "✅ Total Products in DB: " . $row['cnt'] . "\n";

        // Test 5: Get sample product
        $result = mysqli_query($conn, "SELECT * FROM products LIMIT 1");
        if ($result && mysqli_num_rows($result) > 0) {
            $product = mysqli_fetch_assoc($result);
            echo "\n--- SAMPLE PRODUCT ---\n";
            echo "Name: " . $product['name'] . "\n";
            echo "SKU: " . $product['sku'] . "\n";
            echo "Price: " . $product['price'] . "\n";
            echo "Stock: " . $product['stock'] . "\n";
        }
    } else {
        echo "❌ Products Table Not Found: " . mysqli_error($conn) . "\n";
    }

    mysqli_close($conn);
} else {
    echo "❌ MySQL Connection Failed: " . mysqli_connect_error() . "\n";
}

echo "\n--- NEXT STEPS ---\n";
echo "1. If all tests pass, visit: http://localhost/oneclick/api/get-products-v2.php\n";
echo "2. Should return JSON with all products\n";
echo "3. Then go to admin dashboard: http://localhost/oneclick/admin/index.html\n";
echo "4. Click Products - should load all items\n";

echo "</pre>";
?>

