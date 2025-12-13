<?php
// /api/lib/validation.php - Input validation guards (fail-fast pattern)

function v_int($value, string $field, int $min = null, int $max = null): int {
    if (!is_numeric($value)) {
        json_validation_error($field, 'Must be a number');
    }
    $i = (int)$value;
    if ($min !== null && $i < $min) {
        json_validation_error($field, "Must be >= $min");
    }
    if ($max !== null && $i > $max) {
        json_validation_error($field, "Must be <= $max");
    }
    return $i;
}

function v_float($value, string $field, float $min = null, float $max = null): float {
    if (!is_numeric($value)) {
        json_validation_error($field, 'Must be a number');
    }
    $f = (float)$value;
    if ($min !== null && $f < $min) {
        json_validation_error($field, "Must be >= $min");
    }
    if ($max !== null && $f > $max) {
        json_validation_error($field, "Must be <= $max");
    }
    return $f;
}

function v_string($value, string $field, int $minLen = 1, int $maxLen = 255): string {
    $s = trim((string)$value);
    if (mb_strlen($s) < $minLen) {
        json_validation_error($field, "Must be at least $minLen characters");
    }
    if (mb_strlen($s) > $maxLen) {
        json_validation_error($field, "Must be at most $maxLen characters");
    }
    return $s;
}

function v_enum($value, string $field, array $allowed): string {
    $s = (string)$value;
    if (!in_array($s, $allowed, true)) {
        json_validation_error($field, 'Invalid value: ' . implode(', ', $allowed));
    }
    return $s;
}

function v_uuid($value, string $field): string {
    $s = trim((string)$value);
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $s)) {
        json_validation_error($field, 'Invalid ID format');
    }
    return strtolower($s);
}

function v_email($value, string $field): string {
    $s = trim((string)$value);
    if (!filter_var($s, FILTER_VALIDATE_EMAIL)) {
        json_validation_error($field, 'Invalid email address');
    }
    return $s;
}

function v_url($value, string $field): string {
    $s = trim((string)$value);
    if (!filter_var($s, FILTER_VALIDATE_URL)) {
        json_validation_error($field, 'Invalid URL');
    }
    return $s;
}

function v_cart_items(array $items, string $field = 'items'): array {
    if (!is_array($items) || empty($items)) {
        json_validation_error($field, 'Must be a non-empty array');
    }
    $clean = [];
    foreach ($items as $idx => $item) {
        if (!is_array($item)) {
            json_validation_error($field, "Item at index $idx must be an object");
        }
        $pid = v_uuid($item['product_id'] ?? null, "$field[$idx].product_id");
        $qty = v_int($item['quantity'] ?? 1, "$field[$idx].quantity", 1, 99);
        $clean[] = [
            'product_id' => $pid,
            'quantity'   => $qty,
        ];
    }
    return $clean;
}

function v_wishlist_items(array $items, string $field = 'items'): array {
    if (!is_array($items) || empty($items)) {
        json_validation_error($field, 'Must be a non-empty array');
    }
    $clean = [];
    foreach ($items as $idx => $item) {
        if (!is_array($item)) {
            json_validation_error($field, "Item at index $idx must be an object");
        }
        $pid = v_uuid($item['product_id'] ?? null, "$field[$idx].product_id");
        $clean[] = ['product_id' => $pid];
    }
    return $clean;
}

function v_shipping_address(array $addr, string $field = 'shipping_address'): array {
    return [
        'full_name'     => v_string($addr['full_name'] ?? '', "$field.full_name", 1, 255),
        'phone'         => v_string($addr['phone'] ?? '', "$field.phone", 7, 20),
        'address_line1' => v_string($addr['address_line1'] ?? '', "$field.address_line1", 1, 255),
        'address_line2' => (string)($addr['address_line2'] ?? ''),
        'city'          => v_string($addr['city'] ?? '', "$field.city", 1, 100),
        'postal_code'   => v_string($addr['postal_code'] ?? '', "$field.postal_code", 1, 20),
        'country'       => v_string($addr['country'] ?? 'Sri Lanka', "$field.country", 1, 100),
    ];
}

function escape_html(string $str): string {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

/**
 * Validate and return enum value
 */
function v_enum($value, $allowed = []) {
    if (!in_array($value, $allowed, true)) {
        json_error('E_INVALID', 'Invalid value. Allowed: ' . implode(', ', $allowed));
    }
    return $value;
}

/**
 * Validate and return SKU
 */
function v_sku($value) {
    $val = v_string($value, ['min' => 3, 'max' => 50, 'pattern' => '/^[A-Z0-9\-]+$/']);
    return $val;
}

/**
 * Validate and return phone number (basic)
 */
function v_phone($value) {
    $val = v_string($value, ['min' => 6, 'max' => 20, 'pattern' => '/^[\d\s\-\+\(\)]+$/']);
    return $val;
}

/**
 * Validate and return URL
 */
function v_url($value) {
    $val = filter_var($value, FILTER_VALIDATE_URL);
    if ($val === false) {
        json_error('E_INVALID', 'Invalid URL');
    }
    return $val;
}

/**
 * Validate and return boolean
 */
function v_bool($value) {
    if (is_bool($value)) {
        return $value;
    }
    if (in_array($value, [1, '1', true, 'true'], true)) {
        return true;
    }
    if (in_array($value, [0, '0', false, 'false'], true)) {
        return false;
    }
    json_error('E_INVALID', 'Value must be a boolean');
}

/**
 * Validate array of cart items
 * Expects: [{ product_id: string|int, quantity: int }, ...]
 */
function v_cart_items($items) {
    if (!is_array($items) || empty($items)) {
        json_error('E_INVALID', 'Cart items must be a non-empty array');
    }
    
    $validated = [];
    foreach ($items as $i => $item) {
        if (!is_array($item)) {
            json_error('E_INVALID', "Cart item $i must be an object");
        }
        
        $product_id = $item['product_id'] ?? null;
        $quantity = $item['quantity'] ?? 1;
        
        if (!$product_id) {
            json_error('E_INVALID', "Cart item $i missing product_id");
        }
        
        $qty = v_int($quantity, ['min' => 1, 'max' => 99]);
        $validated[] = [
            'product_id' => (string)$product_id,
            'quantity' => $qty,
        ];
    }
    
    return $validated;
}

/**
 * Validate array of wishlist items
 * Expects: [{ product_id: string|int }, ...]
 */
function v_wishlist_items($items) {
    if (!is_array($items) || empty($items)) {
        json_error('E_INVALID', 'Wishlist items must be a non-empty array');
    }
    
    $validated = [];
    foreach ($items as $i => $item) {
        if (!is_array($item)) {
            json_error('E_INVALID', "Wishlist item $i must be an object");
        }
        
        $product_id = $item['product_id'] ?? null;
        if (!$product_id) {
            json_error('E_INVALID', "Wishlist item $i missing product_id");
        }
        
        $validated[] = ['product_id' => (string)$product_id];
    }
    
    return $validated;
}

/**
 * Escape HTML entities for safe display
 */
function escape_html($value) {
    return htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/**
 * Validate product data for create/update
 */
function v_product($data) {
    $validated = [];
    
    if (isset($data['name'])) {
        $validated['name'] = v_string($data['name'], ['min' => 3, 'max' => 255]);
    }
    
    if (isset($data['sku'])) {
        $validated['sku'] = v_sku($data['sku']);
    }
    
    if (isset($data['price'])) {
        $validated['price'] = v_float($data['price'], ['min' => 0]);
    }
    
    if (isset($data['stock'])) {
        $validated['stock'] = v_int($data['stock'], ['min' => 0]);
    }
    
    if (isset($data['category'])) {
        $validated['category'] = v_string($data['category'], ['min' => 1, 'max' => 100]);
    }
    
    if (isset($data['description'])) {
        $validated['description'] = v_string($data['description'], ['min' => 0, 'max' => 2000]);
    }
    
    if (isset($data['image_url'])) {
        $validated['image_url'] = v_url($data['image_url']);
    }
    
    if (isset($data['status'])) {
        $validated['status'] = v_enum($data['status'], ['active', 'inactive', 'discontinued']);
    }
    
    if (isset($data['featured'])) {
        $validated['featured'] = v_bool($data['featured']);
    }
    
    return $validated;
}
