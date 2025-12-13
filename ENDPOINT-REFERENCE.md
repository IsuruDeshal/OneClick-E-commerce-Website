# Quick Reference: New Endpoint Pattern

All new/hardened endpoints follow this template:

```php
<?php
/**
 * [Endpoint Name]
 *
 * Security Notes:
 * - [User auth required? JWT-only? Admin role?]
 * - [Input validation approach]
 * - [Supabase key used: anon or service?]
 * - [RLS enforcement info]
 *
 * HTTP [GET|POST|DELETE|PATCH] /api/[path]
 * Query: [if GET]
 * Body: { field: type, ... }
 *
 * Returns: { success: true, data: {...} } or { success: false, error: {...} }
 */

require_once __DIR__ . '/../_bootstrap.php';

// Step 1: Enforce HTTP method
require_method('POST');

// Step 2: Authenticate & authorize
$user_id = require_user();          // User: extract from JWT
// OR
require_admin();                    // Admin: extract & check role

// Step 3: Parse & validate input
$input = get_json_input();
$field = v_string($input['field'], 'field', 1, 100);  // Validators exit on error
$quantity = v_int($input['quantity'], 'quantity', 1, 99);

try {
    // Step 4: Business logic
    $path = '/rest/v1/table_name?user_id=eq.' . urlencode($user_id);
    [$code, $resp] = supabase_request_anon('GET', $path);
    
    if ($code !== 200) {
        throw new Exception("Failed to fetch (HTTP $code): $resp");
    }
    
    $data = json_decode($resp, true);
    
    // Step 5: Return response
    json_success([
        'message' => 'Operation successful',
        'data' => $data,
    ]);

} catch (Exception $e) {
    error_log('Operation Error: ' . $e->getMessage());
    json_error('E_OPERATION_FAILED', $e->getMessage(), 400);
}
?>
```

---

## Validator Functions

| Function | Usage | Exits If |
|----------|-------|----------|
| `v_int(value, name, min?, max?)` | `v_int($_GET['id'], 'id', 1)` | Not int, or out of range |
| `v_float(value, name, min?, max?)` | `v_float($input['price'], 'price', 0.01)` | Not float, or out of range |
| `v_string(value, name, minLen?, maxLen?)` | `v_string($input['name'], 'name', 1, 100)` | Not string, or length invalid |
| `v_uuid(value, name)` | `v_uuid($input['id'], 'id')` | Not UUID format |
| `v_enum(value, name, [...])` | `v_enum($input['status'], 'status', ['active', 'inactive'])` | Not in enum |
| `v_sku(value, name)` | `v_sku($input['sku'], 'sku')` | Invalid SKU pattern |
| `v_phone(value, name)` | `v_phone($input['phone'], 'phone')` | Invalid phone pattern |
| `v_url(value, name)` | `v_url($input['url'], 'url')` | Invalid URL |
| `v_bool(value, name)` | `v_bool($input['featured'], 'featured')` | Not boolean-like |
| `v_cart_items(items)` | `v_cart_items($input['items'])` | Invalid cart item schema |
| `v_wishlist_items(items)` | `v_wishlist_items($input['items'])` | Invalid wishlist item schema |
| `v_product(data)` | `v_product($input)` | Invalid product schema |
| `escape_html(value)` | `escape_html($user_input)` | (Returns escaped string) |

---

## Auth Functions

| Function | Purpose | Exits If | Returns |
|----------|---------|----------|---------|
| `require_user()` | Require authenticated user | Not logged in | `user_id` (string) |
| `require_admin()` | Require admin role | Not admin | (void; or exit) |
| `is_admin()` | Check if admin | (never) | `bool` |
| `get_user_id_from_jwt()` | Extract user_id from JWT | JWT invalid | `user_id` or `null` |
| `get_jwt_token()` | Get raw JWT token | (never) | `string` or `null` |
| `require_method(method)` | Enforce HTTP verb | Method mismatch | (void; or exit) |

---

## Supabase Request Functions

| Function | Purpose | Returns | When to Use |
|----------|---------|---------|------------|
| `supabase_request_anon(method, path, body?)` | GET/POST/DELETE (user data) | `[http_code, response_json]` | User-owned data (cart, orders, etc.) |
| `supabase_request_service(method, path, body?)` | GET/POST/DELETE (admin operations) | `[http_code, response_json]` | After `require_admin()` check |

**Usage**:
```php
[$code, $resp] = supabase_request_anon('GET', '/rest/v1/products?id=eq.123');
if ($code !== 200) throw new Exception("Failed (HTTP $code)");
$product = json_decode($resp, true);
```

---

## Response Helpers

| Function | Usage | Status Code | Schema |
|----------|-------|-------------|--------|
| `json_success(data?, code?)` | `json_success(['id' => 123], 201)` | 200 or custom | `{success:true,data:{...}}` |
| `json_error(code, msg, status?)` | `json_error('E_NOT_FOUND', 'Product not found', 404)` | 400 or custom | `{success:false,error:{code,message}}` |
| `json_validation_error(field, msg)` | `json_validation_error('email', 'Invalid format')` | 400 | `{success:false,error:{field,message}}` |
| `json_unauthorized()` | (auto-called by require_user) | 401 | `{success:false,error:{code,message}}` |
| `json_forbidden()` | (auto-called by require_admin) | 403 | `{success:false,error:{code,message}}` |
| `json_not_found()` | Manual use | 404 | `{success:false,error:{code,message}}` |
| `json_internal_error()` | Catch-all for 500 | 500 | `{success:false,error:{code,message}}` |

---

## Path Examples

### User Endpoints (Require JWT)
```
GET    /api/orders/get-user-orders
GET    /api/cart/get-cart?limit=10
POST   /api/cart/add-to-cart
DELETE /api/cart/remove
GET    /api/wishlist/get-wishlist
POST   /api/wishlist/add
DELETE /api/wishlist/remove
POST   /api/cart/merge
POST   /api/wishlist/merge
POST   /api/orders/create
GET    /api/addresses/get-addresses
```

### Admin Endpoints (Require Admin JWT)
```
POST   /api/admin/save-product
DELETE /api/admin/delete-product
POST   /api/admin/upload-image
GET    /api/admin/orders/get-all
```

### Public Endpoints (No Auth)
```
GET    /api/get-products-v2
GET    /api/check-stock?product_id=1
GET    /api/get-categories
```

---

## Common Error Codes

| Code | Meaning | Status |
|------|---------|--------|
| `E_UNAUTHORIZED` | JWT invalid or missing | 401 |
| `E_FORBIDDEN` | User authenticated but not admin | 403 |
| `E_NOT_FOUND` | Resource not found | 404 |
| `E_VALIDATION_ERROR` | Input validation failed | 400 |
| `E_CONFLICT` | Resource conflict (e.g., duplicate) | 409 |
| `E_[OPERATION]_FAILED` | Operation-specific error | 400-500 |

---

## Environment Variables

These must be set before deployment:

```bash
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="eyJ0eXAi..."          # Client-safe (public)
SUPABASE_SERVICE_ROLE_KEY="eyJ0eXAi..."  # Admin-only (SECRET!)
```

**Location**: Environment config, NOT in PHP code.

**Access in PHP**:
```php
$url = getenv('SUPABASE_URL');
$anonKey = getenv('SUPABASE_ANON_KEY');
$serviceKey = getenv('SUPABASE_SERVICE_ROLE_KEY');
```

---

## Debugging Tips

### Check JWT Extraction
```php
$jwt = get_jwt_token();
echo "JWT: " . substr($jwt, 0, 20) . "...\n";

$decoded = decode_jwt($jwt);
echo "Decoded: " . json_encode($decoded) . "\n";

$user_id = $decoded['sub'] ?? null;
echo "User ID: $user_id\n";
```

### Check Supabase Request
```php
[$code, $resp] = supabase_request_anon('GET', '/rest/v1/products?id=eq.1');
echo "HTTP Code: $code\n";
echo "Response: $resp\n";

$data = json_decode($resp, true);
echo "Decoded: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
```

### Check Validation
```php
try {
    $qty = v_int($_GET['qty'], 'qty', 1, 99);
    echo "Validation passed: $qty\n";
} catch (Exception $e) {
    echo "Validation failed (this exit happens in v_int, so you won't see this)\n";
}
```

---

## Security Checklist (Per Endpoint)

- [ ] Does endpoint call `require_user()` or `require_admin()` as appropriate?
- [ ] Does endpoint use JWT user_id, never client-supplied user_id?
- [ ] Does endpoint validate all inputs via v_* functions?
- [ ] Does endpoint use `json_success()` / `json_error()` for responses?
- [ ] Does endpoint use appropriate key (anon for user, service for admin)?
- [ ] Does endpoint call `require_method()` to enforce HTTP verb?
- [ ] Does error_log include endpoint name for debugging?
- [ ] No hard-coded secrets in file?
- [ ] No manual HTTP headers (all in _bootstrap)?

