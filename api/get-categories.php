<?php
require_once __DIR__ . '/db_connect_universal.php';
header('Content-Type: application/json');
try {
    // Prefer categories table if exists
    $categories = [];
    if (tableExists('categories')) {
        $rows = query('SELECT id, name, slug FROM categories ORDER BY name ASC', []);
        $categories = array_map(fn($r)=>[
            'id'=>$r['id'],
            'name'=>$r['name'],
            'slug'=>$r['slug']
        ], $rows);
    } else if (columnExists('products','category')) {
        // Use single quotes for empty string to work in Postgres/MySQL
        $rows = query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category <> \''\' ORDER BY category ASC', []);
        $categories = array_map(fn($r)=>['id'=>$r['category'], 'name'=>$r['category'], 'slug'=>strtolower(str_replace(' ','-', $r['category']))], $rows);
    }
    sendResponse(['success'=>true,'count'=>count($categories),'categories'=>$categories]);
} catch (Exception $e) {
    sendResponse(['success'=>false,'error'=>'Failed to fetch categories','message'=>DEBUG_MODE?$e->getMessage():null],500);
}
?>

