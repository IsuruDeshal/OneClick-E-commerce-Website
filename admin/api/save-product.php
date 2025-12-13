<?php
/**
 * Admin Product Save API
 * ISSUE #4 FIX: SECURITY CRITICAL
 * 
 * Routes admin product operations through PHP backend.
 * Service role key is stored server-side in environment variables,
 * NEVER exposed in browser JavaScript.
 * 
 * Usage:
 * POST /admin/api/save-product.php
 * Headers: Content-Type: application/json, Authorization: Bearer {admin_token}
 * Body: { action: "create|update|delete", product: {...} }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get input
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// Get action
$action = $input['action'] ?? null;
if (!$action) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing action']);
    exit;
}

// Load environment variables - try both .env and .env.local
foreach ([__DIR__ . '/../../.env.local', __DIR__ . '/../../.env', __DIR__ . '/../.env'] as $envFile) {
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '=') && strpos($line, '#') !== 0) {
                list($key, $value) = explode('=', $line, 2);
                $_ENV[trim($key)] = trim($value, '"');
            }
        }
        break;
    }
}

// Get service role key (from server-side env files, NEVER from browser)
$supabaseUrl = $_ENV['SUPABASE_URL'] ?? $_ENV['VITE_SUPABASE_URL'] ?? null;
$serviceRoleKey = $_ENV['SUPABASE_SERVICE_ROLE_KEY'] ?? null;

if (!$supabaseUrl || !$serviceRoleKey) {
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration missing']);
    exit;
}

// Verify admin authorization (check JWT token if provided, otherwise allow from localhost for development)
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$isLocalhost = in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', 'localhost', '::1']) || $_SERVER['HTTP_HOST'] === 'localhost';

if (!$isLocalhost && (!$authHeader || strpos($authHeader, 'Bearer ') !== 0)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($authHeader && strpos($authHeader, 'Bearer ') === 0) {
    $token = substr($authHeader, 7);
    // Verify token and check admin role
    $verified = verifyAdminToken($token, $supabaseUrl, $serviceRoleKey);
    if (!$verified) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden - admin access required']);
        exit;
    }
}

// Route to handler
$product = $input['product'] ?? [];

try {
    switch ($action) {
        case 'create':
            $result = createProduct($product, $supabaseUrl, $serviceRoleKey);
            break;
        
        case 'update':
            $result = updateProduct($product, $supabaseUrl, $serviceRoleKey);
            break;
        
        case 'delete':
            $result = deleteProduct($product['id'] ?? null, $supabaseUrl, $serviceRoleKey);
            break;
        
        case 'upload-image':
            $result = uploadProductImage($product['id'] ?? null, $supabaseUrl, $serviceRoleKey);
            break;
        
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Unknown action']);
            exit;
    }

    http_response_code(200);
    
    // Extract ID from result for API consistency
    $responseId = null;
    if (is_array($result)) {
        // If result is array of objects (Supabase response), get first item's ID
        if (count($result) > 0 && isset($result[0]['id'])) {
            $responseId = $result[0]['id'];
        }
        // If result is single object, get its ID
        elseif (isset($result['id'])) {
            $responseId = $result['id'];
        }
    } else {
        $responseId = $result;
    }
    
    echo json_encode([
        'success' => true, 
        'id' => $responseId,
        'product_id' => $responseId,
        'data' => $result
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}

/**
 * HELPER: Verify admin JWT token
 */
function verifyAdminToken($token, $supabaseUrl, $serviceRoleKey) {
    // TODO: Implement JWT verification against Supabase
    // For now, just check if token exists and is not empty
    // In production, decode JWT and verify signature + admin claim
    
    if (!$token) {
        return false;
    }

    // Quick check - in production decode JWT properly
    return strlen($token) > 20;
}

/**
 * Create product
 */
function createProduct($product, $supabaseUrl, $serviceRoleKey) {
    $id = bin2hex(random_bytes(16));
    
    $payload = [
        'id' => $id,
        'name' => $product['name'] ?? 'Unknown',
        'description' => $product['description'] ?? '',
        'price' => (int)($product['price'] ?? 0),
        'category' => $product['category'] ?? 'uncategorized',
        'stock_quantity' => (int)($product['stock_quantity'] ?? 0),
        'status' => $product['status'] ?? 'active',
        'main_image_url' => $product['main_image_url'] ?? '',
        'created_at' => date('c'),
        'updated_at' => date('c')
    ];

    $response = makeSupabaseRequest(
        'POST',
        "{$supabaseUrl}/rest/v1/products",
        $payload,
        $serviceRoleKey
    );

    return $response;
}

/**
 * Update product
 */
function updateProduct($product, $supabaseUrl, $serviceRoleKey) {
    $id = $product['id'] ?? null;
    if (!$id) {
        throw new Exception('Product ID required');
    }

    $payload = [
        'name' => $product['name'] ?? null,
        'description' => $product['description'] ?? null,
        'price' => $product['price'] ?? null,
        'category' => $product['category'] ?? null,
        'stock_quantity' => $product['stock_quantity'] ?? null,
        'status' => $product['status'] ?? null,
        'main_image_url' => $product['main_image_url'] ?? null,
        'updated_at' => date('c')
    ];

    // Remove null values
    $payload = array_filter($payload, fn($v) => $v !== null);

    $response = makeSupabaseRequest(
        'PATCH',
        "{$supabaseUrl}/rest/v1/products?id=eq.{$id}",
        $payload,
        $serviceRoleKey
    );

    return $response;
}

/**
 * Delete product
 */
function deleteProduct($id, $supabaseUrl, $serviceRoleKey) {
    if (!$id) {
        throw new Exception('Product ID required');
    }

    $response = makeSupabaseRequest(
        'DELETE',
        "{$supabaseUrl}/rest/v1/products?id=eq.{$id}",
        null,
        $serviceRoleKey
    );

    return ['deleted' => true, 'id' => $id];
}

/**
 * Upload product image
 */
function uploadProductImage($productId, $supabaseUrl, $serviceRoleKey) {
    if (!$productId) {
        throw new Exception('Product ID required');
    }

    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No image provided or upload error');
    }

    $file = $_FILES['image'];
    $bucket = 'product-images';
    $filename = bin2hex(random_bytes(16)) . '.' . pathinfo($file['name'], PATHINFO_EXTENSION);
    $path = "{$productId}/{$filename}";

    $fileContent = file_get_contents($file['tmp_name']);
    
    // Upload to Supabase Storage
    $storageUrl = "{$supabaseUrl}/storage/v1/object/{$bucket}/{$path}";
    
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => $storageUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => $fileContent,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer {$serviceRoleKey}",
            "Content-Type: application/octet-stream"
        ]
    ]);
    
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    if ($httpCode !== 200) {
        throw new Exception('Failed to upload image to storage');
    }

    // Get public URL
    $publicUrl = "{$supabaseUrl}/storage/v1/object/public/{$bucket}/{$path}";

    // Save image URL to product_images table
    $imageRecord = [
        'product_id' => $productId,
        'image_url' => $publicUrl,
        'is_primary' => true,
        'created_at' => date('c')
    ];

    $imageResponse = makeSupabaseRequest(
        'POST',
        "{$supabaseUrl}/rest/v1/product_images",
        $imageRecord,
        $serviceRoleKey
    );

    return [
        'image_url' => $publicUrl,
        'path' => $path
    ];
}

/**
 * Make Supabase API request with service role
 */
function makeSupabaseRequest($method, $url, $data = null, $serviceRoleKey) {
    $curl = curl_init();
    
    $headers = [
        "Authorization: Bearer {$serviceRoleKey}",
        "Content-Type: application/json",
        "apikey: {$serviceRoleKey}"
    ];

    $options = [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers
    ];

    if ($data && ($method === 'POST' || $method === 'PATCH' || $method === 'PUT')) {
        $options[CURLOPT_POSTFIELDS] = json_encode($data);
    }

    curl_setopt_array($curl, $options);
    
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    if ($httpCode >= 400) {
        throw new Exception("Supabase API error: {$httpCode} - {$response}");
    }

    return json_decode($response, true);
}

?>
