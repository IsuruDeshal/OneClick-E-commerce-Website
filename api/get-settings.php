<?php
require_once __DIR__ . '/db_connect_universal.php';
header('Content-Type: application/json');
try {
    // Ensure table exists (id SERIAL equivalent for MySQL/Postgres portability)
    if (DB_TYPE === 'mysql') {
        execute("CREATE TABLE IF NOT EXISTS settings (id INT AUTO_INCREMENT PRIMARY KEY, `key` VARCHAR(255) UNIQUE, value TEXT)");
    } else {
        execute("CREATE TABLE IF NOT EXISTS settings (id SERIAL PRIMARY KEY, key VARCHAR(255) UNIQUE, value TEXT)");
    }
    $key = 'whatsapp_number';
    $row = queryOne(DB_TYPE==='mysql' ? "SELECT value FROM settings WHERE `key` = ? LIMIT 1" : "SELECT value FROM settings WHERE key = $1 LIMIT 1", [$key]);
    $number = $row ? $row['value'] : null;
    sendResponse(['success'=>true,'whatsapp'=>$number]);
} catch (Exception $e) {
    sendResponse(['success'=>false,'error'=>'Failed to load settings','message'=>DEBUG_MODE?$e->getMessage():null],500);
}

