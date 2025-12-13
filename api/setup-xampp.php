<?php
/**
 * XAMPP DATABASE SETUP
 * Creates all tables for One Click Computers
 * Run this file in browser: http://localhost/oneclick/api/setup-xampp.php
 */

require_once 'config-local.php';

// Force MySQL for setup
if (DB_TYPE !== 'mysql') {
    die('This setup script is for XAMPP (MySQL) only. Use setup.php for PostgreSQL.');
}

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, '', DB_PORT);

if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}

echo "<!DOCTYPE html>
<html>
<head>
    <title>XAMPP Database Setup</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; margin: 10px 0; border-radius: 5px; }
        h1 { color: #333; }
        pre { background: #fff; padding: 10px; border: 1px solid #ddd; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🚀 One Click Computers - XAMPP Setup</h1>
";

// Create database
$sql = "CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";

if ($conn->query($sql) === TRUE) {
    echo "<div class='success'>✅ Database '" . DB_NAME . "' created successfully</div>";
} else {
    echo "<div class='error'>❌ Error creating database: " . $conn->error . "</div>";
}

// Select database
$conn->select_db(DB_NAME);

// Create tables
$tables = [];

// Products table
$tables['products'] = "CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    category VARCHAR(100),
    description TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sku (sku),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

// Users table
$tables['users'] = "CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(20),
    role ENUM('user', 'admin', 'shop-owner') DEFAULT 'user',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

// Sessions table
$tables['sessions'] = "CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

// Orders table
$tables['orders'] = "CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT,
    user_email VARCHAR(255),
    shipping_address JSON NOT NULL,
    shipping_method VARCHAR(50) NOT NULL,
    shipping_cost DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_order_number (order_number),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

// Order items table
$tables['order_items'] = "CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    INDEX idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

// Payments table
$tables['payments'] = "CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    order_number VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payhere_order_id VARCHAR(100),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    transaction_id VARCHAR(100),
    payment_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_number (order_number),
    INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

// Carts table
$tables['carts'] = "CREATE TABLE IF NOT EXISTS carts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    session_id VARCHAR(64),
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cart_item (user_id, product_id),
    INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

// Wishlists table
$tables['wishlists'] = "CREATE TABLE IF NOT EXISTS wishlists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_wishlist_item (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

// Addresses table
$tables['addresses'] = "CREATE TABLE IF NOT EXISTS addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Sri Lanka',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

// Password reset tokens
$tables['password_reset_tokens'] = "CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

// Create all tables
foreach ($tables as $tableName => $sql) {
    if ($conn->query($sql) === TRUE) {
        echo "<div class='success'>✅ Table '$tableName' created successfully</div>";
    } else {
        echo "<div class='error'>❌ Error creating table '$tableName': " . $conn->error . "</div>";
    }
}

// Create admin user
$adminEmail = 'admin@oneclick.com';
$adminPassword = password_hash('admin123', PASSWORD_BCRYPT);

$checkAdmin = $conn->query("SELECT id FROM users WHERE email = '$adminEmail'");

if ($checkAdmin->num_rows == 0) {
    $sql = "INSERT INTO users (email, password_hash, name, role, email_verified)
            VALUES ('$adminEmail', '$adminPassword', 'Admin User', 'admin', TRUE)";

    if ($conn->query($sql) === TRUE) {
        echo "<div class='success'>✅ Admin user created: admin@oneclick.com / admin123</div>";
    } else {
        echo "<div class='error'>❌ Error creating admin user: " . $conn->error . "</div>";
    }
} else {
    echo "<div class='info'>ℹ️ Admin user already exists</div>";
}

// Seed products
$checkProducts = $conn->query("SELECT COUNT(*) as count FROM products");
$row = $checkProducts->fetch_assoc();

if ($row['count'] == 0) {
    echo "<div class='info'>📦 Seeding products...</div>";

    $products = [
        ['Gaming Mouse RGB Pro', 'OCC-MOU-' . rand(1000, 9999), 4500.00, 30, 'Mouse', 'Premium RGB gaming mouse with 16000 DPI', '/assets/img/products/mouse1.webp'],
        ['Wireless Mouse Silent', 'OCC-MOU-' . rand(1000, 9999), 2800.00, 45, 'Mouse', 'Silent click wireless mouse for office', '/assets/img/products/mouse2.webp'],
        ['Mechanical Keyboard RGB', 'OCC-KEY-' . rand(1000, 9999), 8500.00, 20, 'Keyboard', 'Cherry MX RGB mechanical keyboard', '/assets/img/products/keyboard1.webp'],
        ['Wireless Keyboard Combo', 'OCC-KEY-' . rand(1000, 9999), 4200.00, 35, 'Keyboard', 'Wireless keyboard and mouse combo', '/assets/img/products/keyboard2.webp'],
        ['24" Full HD Monitor', 'OCC-MON-' . rand(1000, 9999), 28000.00, 15, 'Monitor', '24 inch IPS Full HD display', '/assets/img/products/monitor1.webp'],
        ['27" Gaming Monitor 144Hz', 'OCC-MON-' . rand(1000, 9999), 45000.00, 10, 'Monitor', '27 inch 144Hz gaming monitor', '/assets/img/products/monitor2.webp'],
        ['Gaming Headset RGB', 'OCC-HDS-' . rand(1000, 9999), 6500.00, 25, 'Headset', '7.1 surround sound gaming headset', '/assets/img/products/headset1.webp'],
        ['Wireless Headset Pro', 'OCC-HDS-' . rand(1000, 9999), 8900.00, 18, 'Headset', 'Premium wireless headset with ANC', '/assets/img/products/headset2.webp'],
        ['SSD 500GB NVMe', 'OCC-SSD-' . rand(1000, 9999), 9500.00, 30, 'SSD', 'High-speed NVMe SSD 500GB', '/assets/img/products/ssd1.webp'],
        ['External SSD 1TB', 'OCC-EXT-' . rand(1000, 9999), 15000.00, 20, 'External SSD', 'Portable external SSD 1TB', '/assets/img/products/ssd2.webp']
    ];

    foreach ($products as $product) {
        list($name, $sku, $price, $stock, $category, $description, $image) = $product;

        $stmt = $conn->prepare("INSERT INTO products (name, sku, price, stock, category, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssdisss", $name, $sku, $price, $stock, $category, $description, $image);
        $stmt->execute();
    }

    echo "<div class='success'>✅ Seeded " . count($products) . " sample products</div>";
} else {
    echo "<div class='info'>ℹ️ Products already exist (" . $row['count'] . " products found)</div>";
}

echo "<br><div class='success'>
    <h2>🎉 Setup Complete!</h2>
    <p><strong>Your XAMPP environment is ready!</strong></p>
    <ul>
        <li>Database: <code>oneclick_db</code></li>
        <li>Admin Login: <code>admin@oneclick.com</code> / <code>admin123</code></li>
        <li>Products: " . ($row['count'] > 0 ? $row['count'] : count($products)) . " products available</li>
    </ul>
    <h3>Access Your Site:</h3>
    <ul>
        <li>Frontend: <a href='http://localhost/oneclick/'>http://localhost/oneclick/</a></li>
        <li>Admin: <a href='http://localhost/oneclick/admin/'>http://localhost/oneclick/admin/</a></li>
        <li>API: <a href='http://localhost/oneclick/api/'>http://localhost/oneclick/api/</a></li>
        <li>phpMyAdmin: <a href='http://localhost/phpmyadmin/'>http://localhost/phpmyadmin/</a></li>
    </ul>
</div>";

echo "</body></html>";

$conn->close();
?>

