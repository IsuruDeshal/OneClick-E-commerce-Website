# ✅ SECURITY CODE REVIEW CHECKLIST

**For**: Pull Request review before merging  
**Time**: 15 minutes per endpoint  
**Audience**: Developers, DevOps, Security engineers  

---

## BEFORE EVERY ENDPOINT

### Authentication & Authorization

- [ ] Endpoint requires `require_user()` or `require_admin()`?
  - If public (no auth): MUST have clear comment explaining why
  - If user endpoint: `$user_id = require_user();` at top
  - If admin endpoint: `$uid = require_admin();` at top

- [ ] Admin endpoints use `require_admin()` BEFORE `supabase_request_service()`?
  - [ ] Code pattern:
    ```php
    $uid = require_admin();  // Role check first
    [$code, $resp] = supabase_request_service(...);  // Then use service key
    ```
  - [ ] NOT:
    ```php
    [$code, $resp] = supabase_request_service(...);  // ❌ Using service key before check
    ```

### CSRF Protection

- [ ] Admin POST/PATCH/DELETE endpoints call `require_csrf()`?
  - [ ] Pattern:
    ```php
    require_method('POST');
    $uid = require_admin();
    require_csrf();  // ← Must be after role check
    ```
  - [ ] Frontend sends `X-CSRF-Token` header (from `csrf_token()`)

- [ ] User API endpoints (React/Vue) DON'T use CSRF?
  - [ ] OK: JWT in `Authorization: Bearer` header
  - [ ] No need for X-CSRF-Token (JWT + same-origin policy sufficient)

### HTTP Method

- [ ] Endpoint calls `require_method('GET')` or similar?
  - [ ] GET endpoints: `require_method('GET')`
  - [ ] POST endpoints: `require_method('POST')`
  - [ ] Only single method per file (or explicit `require_methods(['GET', 'HEAD'])`)

### Rate Limiting

- [ ] Endpoint has `rate_limit($key, $maxPerMinute)`?
  - [ ] Checked early (after method + auth)
  - [ ] Key is descriptive: `'cart_add'`, `'login'`, `'admin_upload'`
  - [ ] Limit is reasonable: 60 for normal, 10-20 for sensitive (login, upload)

---

## INPUT VALIDATION

### JSON Input

- [ ] Parse with `get_json_input()`?
  - [ ] NOT direct `$_POST` or `$_GET`
  - [ ] Pattern:
    ```php
    $input = get_json_input();
    $name = $input['name'] ?? null;
    ```

- [ ] Validate EVERY field that comes from client?
  - [ ] v_* functions for type checking
  - [ ] Bounds checking (min/max length, range)
  - [ ] Fail-fast (validators exit on invalid)

### Specific Validators

- [ ] Product ID / User ID fields → `v_uuid()`
  - [ ] Prevents invalid IDs from reaching database
  
- [ ] Quantities → `v_int($qty, 'quantity', 1, 99)`
  - [ ] Minimum 1, maximum 99 (or your limit)
  
- [ ] Strings → `v_string($name, 'name', 1, 100)`
  - [ ] Length bounds enforced
  
- [ ] Status fields → `v_enum($status, 'status', ['active', 'inactive'])`
  - [ ] Only allowed values accepted

- [ ] Cart items → `v_cart_items($items, 'items')`
  - [ ] Full validation of structure + fields

### Query Parameters

- [ ] Public endpoints with filters use validated query params?
  - [ ] Pattern:
    ```php
    $category = get_query('category');
    $page = v_int(get_query('page', 1), 'page', 1, 1000);
    ```

---

## SUPABASE INTERACTION

### RLS & Keys

- [ ] User endpoints use `supabase_request_user_data($method, $path, $jwt)`?
  - [ ] JWT forwarded to Supabase
  - [ ] Example:
    ```php
    $token = get_bearer_token();
    [$code, $resp] = supabase_request_user_data(
        'GET',
        '/rest/v1/cart_items?user_id=eq.' . urlencode($user_id),
        $token
    );
    ```
  - [ ] NOT using `supabase_request_anon()` on user tables

- [ ] Public endpoints use `supabase_request_anon()`?
  - [ ] Public data only
  - [ ] Example: `/rest/v1/products?status=eq.active`

- [ ] Admin endpoints use `supabase_request_service()` + role check?
  - [ ] After `require_admin()` only
  - [ ] Example:
    ```php
    $uid = require_admin();  // Role verified
    [$code, $resp] = supabase_request_service(
        'DELETE',
        '/rest/v1/products?id=eq.' . urlencode($pid)
    );
    ```

### User ID Filtering

- [ ] User endpoints filter by JWT user_id (not client-supplied)?
  - [ ] Pattern:
    ```php
    $user_id = require_user();  // From JWT
    // Query includes: ?user_id=eq.$user_id
    // NOT: $user_id = $_GET['user_id']  ❌
    ```
  - [ ] Prevents privilege escalation

### Error Handling

- [ ] Check HTTP response code?
  - [ ] Pattern:
    ```php
    [$code, $resp] = supabase_request_user_data(...);
    if ($code !== 200) {
        json_error('E_UPSTREAM', 'Failed', 502);
    }
    ```
  - [ ] NOT assuming success without checking

---

## DATA HANDLING

### No Client Trust

- [ ] Prices/stock calculated server-side?
  - [ ] NOT from client input
  - [ ] Fetch from DB: `$product['price']`
  - [ ] NOT: `$price = $_POST['price']`

- [ ] User relationships verified?
  - [ ] Can't modify another user's order
  - [ ] Can't view another user's cart
  - [ ] Check: `user_id` from JWT matches resource owner

### File Uploads

- [ ] MIME type validated (not extension)?
  - [ ] Use `finfo_file()` to check actual content
  - [ ] Whitelist: `['image/jpeg', 'image/png', 'image/webp']`
  - [ ] Pattern:
    ```php
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmpFile);
    if (!in_array($mime, $allowed, true)) {
        json_validation_error('image', 'Invalid');
    }
    ```

- [ ] Filename secure (no user input)?
  - [ ] Use: `bin2hex(random_bytes(16)) . '.jpg'`
  - [ ] NOT: `$user_filename` directly

- [ ] File size limited?
  - [ ] Check `$_FILES['file']['size']`
  - [ ] Max 5MB for images, adjust for your use case

- [ ] Upload directory NOT executable?
  - [ ] No PHP, CGI scripts in /uploads
  - [ ] Configure in Apache/nginx to prevent execution

---

## ERROR RESPONSES

- [ ] Validation errors use `json_validation_error()`?
  - [ ] Returns 422 + field details
  - [ ] Client can show specific error

- [ ] Auth errors use `json_unauthorized()` or `json_forbidden()`?
  - [ ] `json_unauthorized()` for 401 (not authenticated)
  - [ ] `json_forbidden()` for 403 (authenticated but not allowed)

- [ ] 404 errors for missing resources?
  - [ ] `json_not_found()` if resource doesn't exist

- [ ] Upstream errors use correct status?
  - [ ] `json_error('E_UPSTREAM', '...', 502)` for Supabase errors
  - [ ] Helps client distinguish API errors from backend errors

---

## SPECIAL CASES

### Cart Merge (Guest → User)

If implementing cart merge:

- [ ] Validates all items in guest cart?
  - [ ] `v_cart_items($items, 'items')` checks structure
  - [ ] Fetch product data to verify active + stock
  
- [ ] Filters out invalid/inactive products?
  - [ ] Only merge products that:
    - Exist in database
    - Are status='active'
    - Have available stock
  
- [ ] Clamps quantity to available stock?
  - [ ] `$qty = min($requested_qty, $available_stock)`
  - [ ] Never insert qty > stock
  
- [ ] Inserts via service role (not user key)?
  - [ ] Bulk insert uses `supabase_request_service()`
  - [ ] Prevents RLS bugs with inserts

### Admin Bulk Operations

If admin endpoint updates multiple records:

- [ ] Validates every item in batch?
  - [ ] No partial failures
  - [ ] All-or-nothing atomic operation (if possible)

- [ ] Rate limit reasonable for batch size?
  - [ ] Bulk operation might be expensive
  - [ ] Adjust limit accordingly

---

## DOCUMENTATION

- [ ] Endpoint has clear path comment?
  - [ ] Example: `// GET /api/user/cart.php?action=get`

- [ ] Query parameters documented?
  - [ ] Example: `// ?action=add, ?action=remove, ?action=merge`

- [ ] Authentication requirement documented?
  - [ ] `// Requires: authenticated user (JWT)`
  - [ ] `// Requires: admin role`
  - [ ] `// Public: no authentication`

- [ ] CSRF requirement documented?
  - [ ] `// Admin endpoint: requires X-CSRF-Token header`

---

## TESTING CHECKLIST

### Test Successful Case

- [ ] Endpoint returns 200 with correct data?
- [ ] Response format is `{success: true, data: {...}}`?

### Test Auth Failures

- [ ] Missing JWT → 401
- [ ] Invalid JWT → 401
- [ ] Non-admin calling admin endpoint → 403

### Test Input Validation

- [ ] Missing required field → 422 with field error
- [ ] Out-of-range value → 422 with field error
- [ ] Wrong type → 422 with field error

### Test Rate Limiting

- [ ] Make requests up to limit → all OK
- [ ] Request after limit → 429

### Test Authorization

- [ ] User can't view another user's data → filtered by RLS/backend
- [ ] User can't call admin endpoint → 403

### Test Edge Cases

- [ ] Empty input → handled gracefully
- [ ] Null values → validated or defaulted
- [ ] Very long strings → truncated or rejected
- [ ] Special characters in strings → escaped/validated

---

## DEPLOYMENT

- [ ] Environment variables all set?
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `SUPABASE_JWT_SECRET` (optional, if manual JWT validation)

- [ ] RLS policies applied in Supabase?
  - [ ] Policies exist for all user tables
  - [ ] Test: non-owner can't see resource

- [ ] Upload directory permissions?
  - [ ] Readable, writable, not executable
  - [ ] Separate from code directory

- [ ] Rate limit cleanup scheduled?
  - [ ] Cron job monthly to clean old buckets

- [ ] Monitoring in place?
  - [ ] Error logs captured
  - [ ] 5xx errors alerted
  - [ ] 429 rate limit hits tracked

---

## QUICK PASS/FAIL

```
✅ PASS:
  ✓ Auth required (require_user/admin)
  ✓ CSRF on admin POST/PATCH/DELETE
  ✓ All input validated (v_* functions)
  ✓ Supabase key matches: anon/service/user
  ✓ User ID from JWT (not client)
  ✓ Error handling present
  ✓ Rate limiting set
  ✓ Tests pass locally

❌ FAIL (don't merge):
  ✗ Missing require_user/admin
  ✗ Validation skipped
  ✗ Client-supplied prices
  ✗ No rate limiting
  ✗ Using service key before role check
  ✗ File upload without MIME validation
  ✗ Error response codes wrong
  ✗ Tests failing
```

---

**Use before every PR merge.**  
**Takes 15 min per endpoint.**  
**Prevents 90% of security bugs.**
