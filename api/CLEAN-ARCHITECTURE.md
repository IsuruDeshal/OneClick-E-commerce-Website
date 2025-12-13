# Clean API Architecture - Implementation Guide

**Status**: ✅ Production Ready  
**Version**: 2.0 (Clean Modular)  
**Last Updated**: November 2025

---

## Quick Start

### Folder Structure (Clean)
```
/api
  _bootstrap.php          ← EVERY endpoint requires this first

  lib/
    response.php          ← JSON response helpers
    validation.php        ← Input validators (fail-fast)
    auth.php             ← JWT extraction & role checks
    rate_limiter.php     ← IP-based throttling
    csrf.php             ← Admin CSRF tokens
    supabase.php         ← REST API wrapper (anon vs service)

  public/
    products.php         ← GET products with pagination
    stock.php            ← GET stock availability

  user/
    cart.php             ← GET/POST/DELETE/MERGE cart
    wishlist.php         ← (similar to cart)
    orders.php           ← POST create, GET user's orders
    addresses.php        ← GET/POST user addresses

  admin/
    products.php         ← POST/PATCH/DELETE products
    orders.php           ← GET all orders, PATCH status
    settings.php         ← Admin settings
    upload_image.php     ← POST image upload
```

---

## Core Rules

### Rule 1: Every Endpoint Starts With Bootstrap
```php
<?php
require_once __DIR__ . '/../_bootstrap.php';
// Everything loaded automatically:
// - CORS headers
// - Security headers
// - lib/response.php
// - lib/validation.php
// - lib/auth.php
// - lib/rate_limiter.php
// - lib/csrf.php
// - lib/supabase.php
?>
```

### Rule 2: Enforce HTTP Method
```php
require_method('GET');        // Exit if not GET
require_method('POST');       // Exit if not POST
require_method('DELETE');     // Exit if not DELETE
```

### Rule 3: Authenticate (Fail-Fast)
```php
// User endpoints:
$user_id = require_user();    // Exits if no JWT, returns user_id

// Admin endpoints:
$admin_id = require_admin();  // Exits if not admin JWT, returns user_id
```

### Rule 4: Rate Limit Sensitive Routes
```php
rate_limit('cart_add', 60);           // 60 per minute per IP
rate_limit('order_create', 5);        // 5 per minute per IP
rate_limit('login', 10);              // 10 per minute per IP
```

### Rule 5: Validate ALL Inputs
```php
$input = get_json_input();
$qty = v_int($input['quantity'], 'quantity', 1, 99);      // Exits if invalid
$email = v_email($input['email'], 'email');               // Exits if invalid
$items = v_cart_items($input['items'], 'items');          // Exits if invalid
```

### Rule 6: Admin Actions Need CSRF
```php
// In HTML form:
<input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">

// In PHP endpoint:
require_csrf();  // Exits if invalid token
```

### Rule 7: Use Correct Supabase Key
```php
// Public/user data (RLS enforced):
supabase_request_anon('GET', '/rest/v1/products');

// Admin operations (ONLY after require_admin):
supabase_request_service('POST', '/rest/v1/products', $data);
```

### Rule 8: Return Consistent JSON
```php
// Success:
json_success(['data' => $result]);
json_success(['message' => 'Created'], 201);

// Errors:
json_error('E_INVALID', 'Invalid input', 400);
json_unauthorized();      // 401
json_forbidden();         // 403
json_not_found();         // 404
json_validation_error('field_name', 'Error message');
```

---

## Library Reference

### response.php
```php
json_success($data, $status = 200)              // 200, 201, etc.
json_error($code, $message, $status, $extra)    // 400, 401, 403, 404, 500
json_validation_error($field, $message)         // 422
json_unauthorized()                              // 401
json_forbidden()                                 // 403
json_not_found()                                 // 404
json_conflict()                                  // 409
json_internal_error()                            // 500
require_method($method)                          // GET, POST, DELETE, etc.
```

### validation.php
```php
// Scalars:
v_int($value, $field, $min, $max)              // 1..99
v_float($value, $field, $min, $max)            // 0.0..999.99
v_string($value, $field, $minLen, $maxLen)     // 1..255
v_enum($value, $field, ['a', 'b', 'c'])        // Whitelist
v_uuid($value, $field)                          // UUID format
v_email($value, $field)                         // RFC 5322
v_url($value, $field)                           // HTTP/HTTPS

// Arrays:
v_cart_items($items, $field)                   // [{ product_id, quantity }]
v_wishlist_items($items, $field)               // [{ product_id }]
v_shipping_address($addr, $field)              // { full_name, phone, address_line1, etc. }

// Helpers:
escape_html($string)                            // XSS prevention
get_json_input()                                // Parse request body
```

### auth.php
```php
require_user()                                   // Exit if no JWT; return user_id
require_admin()                                  // Exit if not admin; return user_id
get_bearer_token()                              // Get JWT from Authorization header
decode_jwt_payload($token)                      // Decode JWT claims
is_admin()                                      // Boolean check
```

### supabase.php
```php
supabase_request_anon($method, $path, $options)     // Anon key
supabase_request_service($method, $path, $options)  // Service key
supabase_env($key)                                  // Get env var or error
get_json_input()                                    // Parse JSON body
```

### rate_limiter.php
```php
rate_limit($key, $maxPerMinute)                // Throttle per IP/minute
```

### csrf.php
```php
csrf_token()                                    // Get session token for HTML
require_csrf()                                  // Verify POST token
```

---

## Endpoint Template

### Public Endpoint (No Auth)
```php
<?php
require_once __DIR__ . '/../_bootstrap.php';
require_method('GET');

rate_limit('my_endpoint', 120);

// No require_user() - public access

$search = $_GET['q'] ?? '';

[$code, $resp] = supabase_request_anon('GET', '/rest/v1/...');
if ($code !== 200) {
    json_error('E_UPSTREAM', 'Failed', 502);
}

$data = json_decode($resp, true) ?: [];
json_success($data);
?>
```

### User Endpoint (Requires JWT)
```php
<?php
require_once __DIR__ . '/../_bootstrap.php';
require_method('POST');

$user_id = require_user();
rate_limit('my_user_action', 30);

$input = get_json_input();
$name = v_string($input['name'], 'name', 1, 100);

[$code, $resp] = supabase_request_anon('POST', '/rest/v1/...', [
    'body' => ['user_id' => $user_id, 'name' => $name],
]);

if ($code >= 400) {
    json_error('E_FAILED', 'Operation failed', 502);
}

json_success(['message' => 'Success']);
?>
```

### Admin Endpoint (Requires Admin JWT + CSRF)
```php
<?php
require_once __DIR__ . '/../_bootstrap.php';
require_method('POST');

$admin_id = require_admin();  // Dies if not admin
require_csrf();               // Dies if CSRF invalid

rate_limit('admin_action', 10);

$input = get_json_input();
$data = v_product($input);    // Custom validator

[$code, $resp] = supabase_request_service('POST', '/rest/v1/...', [
    'body' => $data,
]);

if ($code >= 400) {
    json_error('E_FAILED', 'Operation failed', 502);
}

json_success(['id' => ..., 'message' => 'Created'], 201);
?>
```

---

## Common Patterns

### Get with Pagination
```php
$page  = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
$limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 20;
$offset = ($page - 1) * $limit;

$qs = "select=*&order=created_at.desc&limit=$limit&offset=$offset";

[$code, $resp] = supabase_request_anon('GET', "/rest/v1/products?$qs");
$data = json_decode($resp, true) ?: [];

json_success([
    'items' => $data,
    'page'  => $page,
    'limit' => $limit,
]);
```

### Safe Merge (Guest → User)
```php
$localItems = v_cart_items($input['items'], 'items');

// Validate all products exist + are active
$ids = array_unique(array_column($localItems, 'product_id'));
// ... fetch products via anon key, check status ...

// Build clean merge
$merged = [];
foreach ($localItems as $li) {
    // ignore inactive/unavailable products
    if ($product['status'] === 'active') {
        $merged[] = [
            'user_id'    => $user_id,
            'product_id' => $li['product_id'],
            'quantity'   => $li['quantity'],
        ];
    }
}

// Bulk insert via SERVICE role
[$code, $resp] = supabase_request_service('POST', '/rest/v1/cart_items', [
    'body' => $merged,
    'headers' => ['Prefer: resolution=merge-duplicates'],
]);
```

### Server-Side Validation (Price Tampering)
```php
// Don't trust client-supplied total
$items = $input['items'];  // [{ product_id, quantity }]

// Fetch fresh prices from DB
[$pCode, $pResp] = supabase_request_anon('GET', '/rest/v1/products?select=id,price&...');
$products = json_decode($pResp, true);

// Recalculate total
$total = 0;
foreach ($items as $item) {
    $p = $products_by_id[$item['product_id']] ?? null;
    if (!$p) continue;
    $total += $p['price'] * $item['quantity'];
}

// Validate stock before order
// Create order with SERVER-CALCULATED total, not client-supplied
```

---

## Security Checklist

- [ ] Every endpoint has `require_once __DIR__ . '/../_bootstrap.php';` first
- [ ] Every user endpoint has `$user_id = require_user();`
- [ ] Every admin endpoint has `require_admin();` + `require_csrf();`
- [ ] All inputs validated with `v_*()` functions
- [ ] No hard-coded keys in code; all env-driven
- [ ] Rate limiting on sensitive routes (login, order_create, etc.)
- [ ] Anon key for user data (RLS enforced)
- [ ] Service key ONLY after `require_admin()`
- [ ] Server-side price/total recalculation for orders
- [ ] MIME + size validation for file uploads
- [ ] No client-supplied user_id; extracted from JWT only

---

## Deployment

1. **Copy all files** to `/api/` (bootstrap, lib/, public/, user/, admin/)
2. **Set environment variables**:
   ```
   SUPABASE_URL=https://...supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   APP_ENV=production
   ```
3. **Apply RLS policies** on Supabase:
   - Users can only see/modify their own cart, wishlist, orders, addresses
   - Admins can see all data
4. **Update frontend** to use new endpoints:
   - `/api/public/products.php`
   - `/api/user/cart.php?action=add`
   - `/api/user/cart.php?action=get`
   - `/api/admin/upload_image.php`
   - etc.
5. **Test**:
   - Authentication (JWT extraction)
   - Authorization (role checks)
   - Validation (invalid inputs rejected)
   - Rate limiting (repeated requests throttled)
   - CORS (cross-origin requests allowed for whitelisted domains)

---

## Testing Examples

### Test Public Endpoint
```bash
curl http://localhost:8000/api/public/products.php?page=1&limit=10
```

### Test User Endpoint (needs JWT)
```bash
JWT="eyJ0eXAi..."
curl -X POST http://localhost:8000/api/user/cart.php?action=add \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"abc-123","quantity":2}'
```

### Test Admin Endpoint (needs admin JWT + CSRF)
```bash
ADMIN_JWT="eyJ0eXAi..."
CSRF="abc123..."
curl -X POST http://localhost:8000/api/admin/upload_image.php \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "X-CSRF-Token: $CSRF" \
  -F "image=@product.jpg"
```

### Test Rate Limiting
```bash
# First 60 requests OK
for i in {1..60}; do curl http://localhost:8000/api/public/products.php; done

# 61st request -> 429 Too Many Requests
curl http://localhost:8000/api/public/products.php
```

---

## Next Steps

1. **Implement remaining endpoints** (wishlist, orders, addresses) using same pattern
2. **Add more validators** as needed (v_product, v_order_status, etc.)
3. **Add audit logging** for sensitive operations
4. **Implement caching** (products via Redis)
5. **Migrate to Node.js** (optional, for better performance)

---

**Status**: ✅ All libraries created. Ready for endpoint implementation.

