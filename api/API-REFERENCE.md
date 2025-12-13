# 📚 API REFERENCE – Complete Library Index

**Last Updated**: November 2025  
**Status**: Single Source of Truth (Matches Actual Code)  
**Generated from**: `/api/lib/*.php` files  

---

## QUICK LOOKUP

```
├── lib/http.php           → HTTP utilities, method enforcement, JSON input parsing
├── lib/response.php       → JSON response helpers (success, error codes)
├── lib/validation.php     → Input validators (integers, strings, UUIDs, etc.)
├── lib/auth.php           → JWT extraction, role verification, authorization
├── lib/supabase.php       → Supabase REST wrapper (3 functions for user/admin/public)
├── lib/rate_limiter.php   → IP-based per-minute rate limiting
├── lib/csrf.php           → Session-based CSRF token management
```

---

## lib/http.php – HTTP Utilities

### `require_method(string $method): void`
**Purpose**: Enforce exact HTTP method or exit 405  
**Usage**:
```php
require_method('POST');  // Exit if not POST
```
**Exits with**: `E_METHOD_NOT_ALLOWED` + 405

---

### `require_methods(array $methods): void`
**Purpose**: Enforce one of multiple HTTP methods or exit 405  
**Usage**:
```php
require_methods(['GET', 'HEAD']);  // Accept both
```
**Exits with**: `E_METHOD_NOT_ALLOWED` + 405

---

### `get_json_input(): array`
**Purpose**: Parse JSON request body (cached)  
**Usage**:
```php
$input = get_json_input();
$name = $input['name'] ?? null;  // Safe null coalescing
```
**Returns**: Array (empty if no body)  
**Caching**: Static variable, called once per request

---

### `get_query(string $key, $default = null): mixed`
**Purpose**: Get query parameter (?key=value)  
**Usage**:
```php
$page = get_query('page', 1);
$search = get_query('q');  // null if missing
```
**Returns**: Value or default

---

### `get_header(string $key): ?string`
**Purpose**: Get HTTP header (case-insensitive)  
**Usage**:
```php
$authHeader = get_header('Authorization');
$contentType = get_header('Content-Type');
```
**Returns**: Header value or null

---

### `get_client_ip(): string`
**Purpose**: Get remote IP (respects X-Forwarded-For if trusted)  
**Usage**:
```php
$ip = get_client_ip();  // Use for rate limiting
```
**Returns**: IP address string  
**⚠️ WARNING**: Only trusts X-Forwarded-For if behind YOUR proxy

---

## lib/response.php – JSON Responses

**Important**: All functions call `exit()` immediately after output

### `json_success($data = null, int $status = 200): never`
**Purpose**: Return success with data  
**Usage**:
```php
json_success(['id' => 123, 'name' => 'Product']);
json_success();  // Empty success
json_success(['result' => true], 201);  // Created
```
**Output**:
```json
{
  "success": true,
  "data": {...}
}
```
**Exits with**: Specified status (default 200)

---

### `json_error(string $code, string $message, int $status = 400, array $extra = []): never`
**Purpose**: Return error  
**Usage**:
```php
json_error('E_PRODUCT_NOT_FOUND', 'No such product', 404);
json_error('E_INVALID_INPUT', 'Bad format', 400, ['field' => 'quantity']);
```
**Output**:
```json
{
  "success": false,
  "error": "E_PRODUCT_NOT_FOUND",
  "message": "No such product"
}
```
**Exits with**: Specified status

---

### `json_validation_error(string $field, string $message): never`
**Purpose**: Return validation failure (422)  
**Usage**:
```php
$qty = v_int($input['qty'] ?? null, 'quantity', 1, 99);
// If invalid, v_int() calls json_validation_error() and exits
```
**Output**:
```json
{
  "success": false,
  "error": "E_VALIDATION_FAILED",
  "message": "Invalid input",
  "field": "quantity",
  "field_message": "Must be >= 1"
}
```
**Exits with**: 422

---

### `json_unauthorized(): never`
**Purpose**: Auth required (401)  
**Usage**:
```php
if (!$token) json_unauthorized();
```
**Output**:
```json
{
  "success": false,
  "error": "E_UNAUTHORIZED",
  "message": "Authentication required"
}
```
**Exits with**: 401

---

### `json_forbidden(): never`
**Purpose**: Not allowed (403)  
**Usage**:
```php
if ($user_id !== $owner_id) json_forbidden();
```
**Output**:
```json
{
  "success": false,
  "error": "E_FORBIDDEN",
  "message": "You are not allowed to perform this action"
}
```
**Exits with**: 403

---

### `json_not_found(): never`
**Purpose**: Resource not found (404)  
**Usage**:
```php
if (!$product) json_not_found();
```
**Output**:
```json
{
  "success": false,
  "error": "E_NOT_FOUND",
  "message": "Resource not found"
}
```
**Exits with**: 404

---

### `json_conflict(): never`
**Purpose**: Resource already exists (409)  
**Usage**:
```php
if ($user_exists) json_conflict();
```
**Output**:
```json
{
  "success": false,
  "error": "E_CONFLICT",
  "message": "Resource already exists"
}
```
**Exits with**: 409

---

### `json_internal_error(): never`
**Purpose**: Server error (500)  
**Usage**:
```php
catch (Exception $e) {
    json_internal_error();
}
```
**Output**:
```json
{
  "success": false,
  "error": "E_INTERNAL_ERROR",
  "message": "Internal server error"
}
```
**Exits with**: 500

---

## lib/validation.php – Input Validators

**Important**: All validators call `json_validation_error()` and exit on failure

### `v_int($value, string $field, int $min = null, int $max = null): int`
**Purpose**: Validate and cast integer with bounds  
**Usage**:
```php
$qty = v_int($input['qty'], 'quantity', 1, 99);  // Between 1-99
$stock = v_int($input['stock'], 'stock', 0);  // Minimum 0
```
**Validation**:
- Must be numeric
- Cast to int
- If `$min` provided: value >= $min
- If `$max` provided: value <= $max
**Exits with**: 422 if invalid

---

### `v_float($value, string $field, float $min = null, float $max = null): float`
**Purpose**: Validate and cast float with bounds  
**Usage**:
```php
$price = v_float($input['price'], 'price', 0.01, 999999.99);
```
**Validation**: Like `v_int()` but for floats  
**Exits with**: 422 if invalid

---

### `v_string($value, string $field, int $minLen = 1, int $maxLen = 255): string`
**Purpose**: Validate and trim string with length bounds  
**Usage**:
```php
$name = v_string($input['name'], 'name', 1, 100);  // 1-100 chars
$email = v_string($input['email'], 'email', 5, 255);
$desc = v_string($input['desc'], 'description', 0, 2000);  // Allow empty
```
**Validation**:
- Trim whitespace
- Check length (multibyte-safe)
- Min length check
- Max length check
**Exits with**: 422 if invalid

---

### `v_enum($value, string $field, array $allowed): string`
**Purpose**: Validate value is in allowed list  
**Usage**:
```php
$status = v_enum($input['status'], 'status', ['active', 'inactive', 'archived']);
$role = v_enum($input['role'], 'role', ['user', 'admin', 'moderator']);
```
**Validation**:
- Strict comparison (`===`)
- Must be in list
**Exits with**: 422 if invalid

---

### `v_uuid($value, string $field): string`
**Purpose**: Validate UUID format (v4)  
**Usage**:
```php
$product_id = v_uuid($input['product_id'], 'product_id');
$user_id = v_uuid($input['user_id'], 'user_id');
```
**Validation**:
- Must be UUID format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- Case-insensitive
**Exits with**: 422 if invalid

---

### `v_cart_items(array $items, string $field): array`
**Purpose**: Validate array of cart items  
**Usage**:
```php
$items = v_cart_items($input['items'] ?? [], 'items');
// Returns: [
//   {'product_id' => '...', 'quantity' => 5},
//   {'product_id' => '...', 'quantity' => 1},
// ]
```
**Validation**:
- Must be non-empty array
- Each item must be object
- Must have `product_id` (UUID)
- Must have `quantity` (1-99)
**Exits with**: 422 if invalid

---

### `v_wishlist_items(array $items, string $field): array`
**Purpose**: Validate array of wishlist items  
**Usage**:
```php
$items = v_wishlist_items($input['items'] ?? [], 'items');
// Returns: [
//   {'product_id' => '...'},
//   {'product_id' => '...'},
// ]
```
**Validation**:
- Must be non-empty array
- Each item must be object
- Must have `product_id` (UUID)
**Exits with**: 422 if invalid

---

### `v_shipping_address(array $addr, string $field): array`
**Purpose**: Validate shipping address  
**Usage**:
```php
$addr = v_shipping_address($input['address'] ?? [], 'address');
// Returns: validated address with all required fields
```
**Validation**:
- Must have: street, city, postal_code, country
- Optional: province, phone
- All strings with length bounds
**Exits with**: 422 if invalid

---

### `escape_html($value): string`
**Purpose**: Escape HTML entities (NOT for database, for display only)  
**Usage**:
```php
echo escape_html($user_name);  // Safe to put in HTML
```
**Note**: Use this for HTML output, NOT for database storage

---

## lib/auth.php – JWT & Authorization

### `get_bearer_token(): ?string`
**Purpose**: Extract JWT from `Authorization: Bearer` header  
**Usage**:
```php
$token = get_bearer_token();  // null if missing
if (!$token) json_unauthorized();
```
**Returns**: JWT string or null

---

### `decode_jwt_payload(string $token): array`
**Purpose**: Decode JWT payload WITHOUT signature verification  
**Usage**:
```php
$payload = decode_jwt_payload($token);
$user_id = $payload['sub'] ?? null;
$role = $payload['role'] ?? null;
```
**Important**:
- NO signature verification (trusts Supabase)
- Expects 3-part JWT (header.payload.signature)
- Returns decoded JSON payload
**Exits with**: 401 if invalid

---

### `verify_jwt_signature(string $token, string $secret): bool`
**Purpose**: Verify JWT signature (optional, for manual validation)  
**Usage**:
```php
$secret = getenv('SUPABASE_JWT_SECRET');
if (!verify_jwt_signature($token, $secret)) {
    json_unauthorized();  // Forged token
}
```
**Algorithm**: HMAC-SHA256  
**Returns**: true if valid, false otherwise

---

### `is_jwt_expired(array $payload): bool`
**Purpose**: Check if JWT is expired (optional, for manual validation)  
**Usage**:
```php
$payload = decode_jwt_payload($token);
if (is_jwt_expired($payload)) {
    json_unauthorized();  // Token expired
}
```
**Checks**: `exp` claim against current time  
**Returns**: true if expired, false if valid

---

### `require_user(): string`
**Purpose**: Enforce authentication, return user_id or exit 401  
**Usage**:
```php
$user_id = require_user();  // Get authenticated user
// user_id is guaranteed valid from JWT 'sub' claim
```
**Validation**:
1. Extract JWT from header
2. Decode payload
3. Check 'sub' claim exists
**Exits with**: 401 if missing/invalid  
**Returns**: User ID (UUID)

---

### `require_admin(): string`
**Purpose**: Enforce admin role, return user_id or exit 403  
**Usage**:
```php
$user_id = require_admin();  // User must be admin
// Before using supabase_request_service()
```
**Validation**:
1. Call require_user() (validates JWT)
2. Check 'role' claim = 'admin'
3. Fallback: check app_metadata.role
**Exits with**: 403 if not admin  
**Returns**: User ID (UUID)

---

### `is_admin(): bool`
**Purpose**: Check admin (non-fatal, returns boolean)  
**Usage**:
```php
if (is_admin()) {
    // Show admin features
}
```
**Returns**: true/false (never exits)

---

## lib/supabase.php – Supabase REST Wrapper

### `supabase_request_user_data(string $method, string $path, string $jwt, array $options = []): array`
**Purpose**: User API call with JWT forwarding (RLS enforced)  
**Usage**:
```php
$token = get_bearer_token();
[$code, $resp] = supabase_request_user_data(
    'GET',
    '/rest/v1/cart_items?user_id=eq.' . urlencode($user_id),
    $token
);
if ($code !== 200) {
    json_error('E_UPSTREAM', 'Failed', 502);
}
$items = json_decode($resp, true);
```
**Why this**:
- Forwards JWT to Supabase
- auth.uid() in RLS = actual user ✅
- Backend doesn't need to filter by user_id (RLS does it)
**Returns**: `[http_code, response_body]`

---

### `supabase_request_anon(string $method, string $path, array $options = []): array`
**Purpose**: Public API call (no auth needed)  
**Usage**:
```php
[$code, $resp] = supabase_request_anon(
    'GET',
    '/rest/v1/products?select=id,name,price&status=eq.active'
);
```
**When to use**:
- Public product data
- Stock availability checks
- Any data without RLS
**Returns**: `[http_code, response_body]`

---

### `supabase_request_service(string $method, string $path, array $options = []): array`
**Purpose**: Admin API call (bypasses RLS with role gate)  
**Usage**:
```php
$user_id = require_admin();  // MUST check role first!
[$code, $resp] = supabase_request_service(
    'POST',
    '/rest/v1/products',
    ['body' => $product_data]
);
```
**Important**:
- ONLY after `require_admin()` check
- Bypasses RLS (uses service role key)
- Never use on user data directly
**Returns**: `[http_code, response_body]`

---

### `supabase_env(string $key): string`
**Purpose**: Get environment variable or error  
**Usage**:
```php
$url = supabase_env('SUPABASE_URL');  // Get or error
```
**Exits with**: Server error if missing  
**Returns**: Environment value

---

## lib/rate_limiter.php – Throttling

### `rate_limit(string $key, int $maxPerMinute): void`
**Purpose**: Check and enforce per-IP per-minute limit  
**Usage**:
```php
rate_limit('login', 10);         // 10 attempts/min per IP
rate_limit('cart_add', 60);      // 60 adds/min per IP
rate_limit('admin_upload', 5);   // 5 uploads/min per IP
```
**Mechanism**:
- Gets client IP (respects X-Forwarded-For if trusted)
- Creates minute-based bucket key
- Increments counter in file
- Exits with 429 if exceeded
**Exits with**: `E_RATE_LIMIT` + 429 if over limit  
**Returns**: void if OK

---

### `rate_limit_cleanup(int $olderThanMinutes = 60): void`
**Purpose**: Delete old bucket files (monthly maintenance)  
**Usage**:
```php
// Run monthly via cron:
// 0 0 1 * * php -r 'include "/path/to/api/_bootstrap.php"; rate_limit_cleanup();'
rate_limit_cleanup();  // Remove files older than 60 min
rate_limit_cleanup(1440);  // Remove files older than 1 day
```
**Important**: Without this, /tmp fills up over time

---

## lib/csrf.php – CSRF Protection

### `csrf_token(): string`
**Purpose**: Get or generate CSRF token (session-based)  
**Usage**:
```php
$token = csrf_token();  // Get token for form
echo "<input type='hidden' name='_csrf' value='$token'>";
```
**Returns**: Token string (stored in `$_SESSION['csrf_token']`)

---

### `require_csrf(): void`
**Purpose**: Validate CSRF token header or exit 403  
**Usage**:
```php
require_csrf();  // Must be called on POST/PATCH/DELETE
// Validates X-CSRF-Token header against session token
```
**Checks**:
- `X-CSRF-Token` header exists
- Token matches session (timing-safe comparison)
**Exits with**: 403 if invalid/missing

---

## RESPONSE STATUS CODES

| Code | Error Code | Meaning |
|------|-----------|---------|
| 200 | (success) | OK |
| 201 | (success) | Created |
| 204 | (success) | No content |
| 400 | E_INVALID_INPUT | Bad input |
| 401 | E_UNAUTHORIZED | Auth required |
| 403 | E_FORBIDDEN | Not allowed |
| 404 | E_NOT_FOUND | Not found |
| 405 | E_METHOD_NOT_ALLOWED | Wrong HTTP method |
| 409 | E_CONFLICT | Already exists |
| 422 | E_VALIDATION_FAILED | Invalid field |
| 429 | E_RATE_LIMIT | Too many requests |
| 500 | E_INTERNAL_ERROR | Server error |
| 502 | E_UPSTREAM | Supabase error |

---

## COMPLETE ENDPOINT TEMPLATE

```php
<?php
require_once __DIR__ . '/../_bootstrap.php';

// 1. HTTP method
require_method('POST');

// 2. Authentication
$user_id = require_user();  // or require_admin() for admin endpoints

// 3. Rate limiting
rate_limit('my_action', 60);  // 60 per minute

// 4. CSRF (admin only)
require_csrf();  // For admin endpoints

// 5. Input parsing
$input = get_json_input();
$name = v_string($input['name'] ?? null, 'name', 1, 100);

// 6. Business logic
$user_id = require_user();
$token = get_bearer_token();
[$code, $resp] = supabase_request_user_data(
    'GET',
    '/rest/v1/my_table?...',
    $token
);
if ($code !== 200) {
    json_error('E_UPSTREAM', 'Error', 502);
}

// 7. Response
$data = json_decode($resp, true);
json_success(['items' => $data]);
?>
```

---

## CHECKLISTS

### Before Using a Function

- [ ] It's in this list (don't guess)
- [ ] You understand what it exits on
- [ ] You handle the exit (test locally)
- [ ] It matches the actual code (not outdated docs)

### When Adding New Endpoints

- [ ] Use `require_method()`
- [ ] Use `require_user()` or `require_admin()`
- [ ] Use `rate_limit()`
- [ ] Validate all input with `v_*()` functions
- [ ] User data: use `supabase_request_user_data()` + JWT
- [ ] Public data: use `supabase_request_anon()`
- [ ] Admin: use `supabase_request_service()` after `require_admin()`
- [ ] Admin POST/PATCH/DELETE: add `require_csrf()`
- [ ] Response: use `json_success()` or `json_error()`

---

**Generated**: November 2025  
**Next Update**: After any lib/*.php changes  
**Truth Source**: The actual code, not outdated docs  

