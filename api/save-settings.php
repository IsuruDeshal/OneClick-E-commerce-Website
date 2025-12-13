<?php
require_once __DIR__ . '/db_connect_universal.php';
header('Content-Type: application/json');
try {
    $data = getJSONInput();
    if (!isset($data['whatsapp']) || !trim($data['whatsapp'])) {
        sendResponse(['success'=>false,'error'=>'Missing whatsapp number'],400);
    }
    $value = trim($data['whatsapp']);
    $key = 'whatsapp_number';
    // Ensure table exists
    if (DB_TYPE === 'mysql') {
        execute("CREATE TABLE IF NOT EXISTS settings (id INT AUTO_INCREMENT PRIMARY KEY, `key` VARCHAR(255) UNIQUE, value TEXT)");
        // Upsert (MySQL)
        execute("INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [$key, $value]);
    } else {
        execute("CREATE TABLE IF NOT EXISTS settings (id SERIAL PRIMARY KEY, key VARCHAR(255) UNIQUE, value TEXT)");
        // Upsert (Postgres)
        execute("INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [$key, $value]);
    }
    sendResponse(['success'=>true,'whatsapp'=>$value]);
} catch (Exception $e) {
    sendResponse(['success'=>false,'error'=>'Failed to save settings','message'=>DEBUG_MODE?$e->getMessage():null],500);
}

