<?php
/**
 * Get Products API - Returns ALL products (no limits)
 * Supports both Supabase REST API and local MySQL/PostgreSQL
 * With automatic fallback if Supabase is unavailable
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    require_once __DIR__ . '/config-local.php';
    require_once __DIR__ . '/db_connect_universal.php';

    // Determine if we should try Supabase
    $useSupabase = defined('USE_SUPABASE_PRODUCTS') && USE_SUPABASE_PRODUCTS && !empty(SUPABASE_ANON_KEY);
    $fallbackToLocal = false;

    if ($useSupabase) {
        // Try Supabase REST API with CURL (faster than file_get_contents)
        if (function_exists('curl_init')) {
            try {
                $filters = 'status=eq.active';

                // Handle multiple categories
                if (!empty($_GET['categories'])) {
                    $cats = array_map('trim', explode(',', $_GET['categories']));
                    $cats = array_filter($cats);
                    if (!empty($cats)) {
                        $catFilter = 'category=in.(' . implode(',', array_map('urlencode', $cats)) . ')';
                        $filters .= '&' . $catFilter;
                    }
                } elseif (!empty($_GET['category'])) {
                    $filters .= '&category=eq.' . urlencode($_GET['category']);
                }

                if (!empty($_GET['featured'])) {
                    $filters .= '&featured=eq.true';
                }

                if (!empty($_GET['condition'])) {
                    $filters .= '&condition=eq.' . urlencode($_GET['condition']);
                }

                // Build Supabase REST URL
                $url = SUPABASE_URL . '/rest/v1/products?select=*&' . $filters . '&order=featured.desc,created_at.desc&limit=1000';

                $ch = curl_init($url);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 3,
                    CURLOPT_CONNECTTIMEOUT => 2,
                    CURLOPT_HTTPHEADER => [
                        'apikey: ' . SUPABASE_ANON_KEY,
                        'Authorization: Bearer ' . SUPABASE_ANON_KEY,
                        'Accept: application/json'
                    ]
                ]);

                $raw = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode === 200 && $raw !== false) {
                    $rows = json_decode($raw, true);
                    if (is_array($rows)) {
                        echo json_encode([
                            'success' => true,
                            'products' => $rows,
                            'count' => count($rows),
                            'source' => 'supabase'
                        ]);
                        exit();
                    }
                }
                $fallbackToLocal = true;
            } catch (Exception $e) {
                $fallbackToLocal = true;
            }
        } else {
            $fallbackToLocal = true;
        }
    }

    // Fallback to local database
    error_log('[get-products] Using local database fallback');

    if (!tableExists('products')) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Products table not found',
            'message' => DEBUG_MODE ? 'Table `products` does not exist in local database' : 'Server error'
        ]);
        exit();
    }

    $isMysql = (DB_TYPE === 'mysql');

    // Build SQL query
    $selectCols = "id, name, sku, description, category, price, offer_price, stock, image_url, status, featured, created_at";
    if (columnExists('products', 'brand')) {
        $selectCols .= ", brand";
    }

    $sql = "SELECT $selectCols FROM products WHERE status = 'active'";
    $params = [];
    $paramIndex = 1;

    // Handle category filter
    if (!empty($_GET['categories'])) {
        $cats = array_map('trim', explode(',', $_GET['categories']));
        $cats = array_filter($cats);
        if (!empty($cats)) {
            if ($isMysql) {
                $placeholders = array_fill(0, count($cats), '?');
                $sql .= " AND category IN (" . implode(',', $placeholders) . ")";
                $params = array_merge($params, $cats);
            } else {
                $placeholders = [];
                foreach ($cats as $cat) {
                    $placeholders[] = '$' . $paramIndex++;
                    $params[] = $cat;
                }
                $sql .= " AND category IN (" . implode(',', $placeholders) . ")";
            }
        }
    } elseif (!empty($_GET['category'])) {
        $sql .= " AND category = " . ($isMysql ? '?' : '$' . $paramIndex++);
        $params[] = trim($_GET['category']);
    }

    // Handle featured filter
    if (!empty($_GET['featured'])) {
        $sql .= $isMysql ? " AND featured = 1" : " AND featured = true";
    }

    // Handle condition filter
    if (!empty($_GET['condition'])) {
        $colName = $isMysql ? "`condition`" : "\"condition\"";
        $sql .= " AND $colName = " . ($isMysql ? '?' : '$' . $paramIndex++);
        $params[] = trim($_GET['condition']);
    }

    // Order by featured, then newest
    $sql .= " ORDER BY featured DESC, created_at DESC";

    // Execute query
    $products = query($sql, $params);

    error_log('[get-products] Local query success: ' . count($products) . ' products');

    echo json_encode([
        'success' => true,
        'products' => $products,
        'count' => count($products),
        'source' => 'local'
    ]);

} catch (Exception $e) {
    error_log('[get-products] Exception: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to retrieve products',
        'message' => DEBUG_MODE ? $e->getMessage() : 'Server error',
        'debug' => DEBUG_MODE ? $e->getTraceAsString() : null
    ]);
}
?>


