# Clean Architecture - Deployment Checklist

**Status**: Ready for Implementation  
**Date**: November 2025

---

## Pre-Deployment

### Code Review
- [ ] All lib files follow PHP best practices
- [ ] No hardcoded secrets anywhere
- [ ] All functions have clear parameter names
- [ ] error_log() used instead of die()
- [ ] exit used only via json_* helpers

### Security Review
- [ ] CORS whitelist checked (not too permissive)
- [ ] Rate limits reasonable (10-120/min)
- [ ] Validation bounds sensible (1-99 qty, 1-255 string)
- [ ] MIME types restricted (jpg, png, webp only)
- [ ] File size limit set (5MB)
- [ ] JWT validation correct (check 'sub' claim)
- [ ] Admin role check working (check 'role' claim)

### Architecture Review
- [ ] _bootstrap.php loads all 6 libs
- [ ] All endpoints start with bootstrap require
- [ ] No duplication between endpoints
- [ ] Folder structure matches plan
- [ ] Error codes consistent (E_* prefix)
- [ ] Response format unified

---

## Environment Setup

### Local Development
```bash
# Create .env.local (GITIGNORED)
SUPABASE_URL=https://pvnlavcuswjxhywbsodm.supabase.co
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1Qi...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1Qi...
APP_ENV=development
```

### Staging
```bash
# Create environment variables on hosting provider
# AWS Secrets Manager / Azure Key Vault / GitHub Secrets
# Names same as above
```

### Production
```bash
# Same as staging, but with production Supabase project
# Use separate project for isolation
```

---

## Database Setup

### Supabase RLS Policies

**1. Cart Items Policy**
```sql
-- Users can view own cart items
CREATE POLICY "Users can view own cart items"
  ON public.cart_items
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert own cart items
CREATE POLICY "Users can insert own cart items"
  ON public.cart_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own cart items
CREATE POLICY "Users can update own cart items"
  ON public.cart_items
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete own cart items
CREATE POLICY "Users can delete own cart items"
  ON public.cart_items
  FOR DELETE
  USING (auth.uid() = user_id);
```

**2. Wishlist Items Policy** (Similar to cart)

**3. Orders Policy**
```sql
-- Users can view own orders
CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create orders
CREATE POLICY "Users can create orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**4. Addresses Policy** (Similar to orders)

**5. Products Policy**
```sql
-- Anyone can view active products
CREATE POLICY "Public can view active products"
  ON public.products
  FOR SELECT
  USING (status = 'active');

-- Admins can manage all products
CREATE POLICY "Admins can manage products"
  ON public.products
  USING (auth.jwt()->'app_metadata'->>'role' = 'admin');
```

**6. Admin Users Table**
```sql
-- Only admins can view users table
CREATE POLICY "Admins can view users"
  ON public.users
  FOR SELECT
  USING (auth.jwt()->'app_metadata'->>'role' = 'admin');
```

---

## File Structure Verification

```bash
# Verify all files exist
ls -la /api/_bootstrap.php
ls -la /api/lib/response.php
ls -la /api/lib/validation.php
ls -la /api/lib/auth.php
ls -la /api/lib/supabase.php
ls -la /api/lib/rate_limiter.php
ls -la /api/lib/csrf.php

# Verify endpoints
ls -la /api/public/*.php
ls -la /api/user/*.php
ls -la /api/admin/*.php

# Verify uploads directory
mkdir -p /api/../uploads/products
chmod 755 /api/../uploads/products
```

---

## Testing Checklist

### Unit Tests (Per Library)

#### response.php
```php
<?php
require_once __DIR__ . '/api/_bootstrap.php';

// Test success response
ob_start();
json_success(['test' => 'data'], 201);
$output = json_decode(ob_get_clean(), true);
assert($output['success'] === true);
assert($output['data']['test'] === 'data');

// Test error response
ob_start();
json_error('E_TEST', 'Test error', 400);
$output = json_decode(ob_get_clean(), true);
assert($output['success'] === false);
assert($output['error'] === 'E_TEST');

echo "✓ response.php tests passed\n";
?>
```

#### validation.php
```php
<?php
require_once __DIR__ . '/api/_bootstrap.php';

// Test v_int
$result = v_int(50, 'qty', 1, 99);
assert($result === 50);

// Test v_uuid
$uuid = '550e8400-e29b-41d4-a716-446655440000';
$result = v_uuid($uuid, 'id');
assert($result === $uuid);

// Test v_cart_items
$items = v_cart_items([
    ['product_id' => '550e8400-e29b-41d4-a716-446655440000', 'quantity' => 2]
], 'items');
assert(count($items) === 1);

echo "✓ validation.php tests passed\n";
?>
```

#### auth.php
```php
<?php
// Create mock JWT
$header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
$payload = base64_encode(json_encode([
    'sub' => '550e8400-e29b-41d4-a716-446655440000',
    'email' => 'test@example.com',
    'role' => 'authenticated'
]));
$signature = base64_encode('signature');
$jwt = "$header.$payload.$signature";

// Test decode_jwt_payload
$decoded = decode_jwt_payload($jwt);
assert($decoded['sub'] === '550e8400-e29b-41d4-a716-446655440000');

echo "✓ auth.php tests passed\n";
?>
```

### Integration Tests (Per Endpoint)

#### Public Products Endpoint
```bash
# Test 1: Get products (should work)
curl http://localhost:8000/api/public/products.php
# Expected: 200 OK, array of products

# Test 2: Get products with pagination
curl "http://localhost:8000/api/public/products.php?page=1&limit=10"
# Expected: 200 OK, page data

# Test 3: Get products with search
curl "http://localhost:8000/api/public/products.php?q=laptop"
# Expected: 200 OK, filtered products
```

#### User Cart Endpoint
```bash
# Generate test JWT (from Supabase auth)
JWT="eyJ0eXAi..."

# Test 1: Get cart (empty)
curl -H "Authorization: Bearer $JWT" \
  http://localhost:8000/api/user/cart.php?action=get
# Expected: 200 OK, empty array

# Test 2: Add to cart (valid)
curl -X POST -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"550e8400-e29b-41d4-a716-446655440000","quantity":2}' \
  http://localhost:8000/api/user/cart.php?action=add
# Expected: 200 OK, success message

# Test 3: Add to cart (invalid quantity)
curl -X POST -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"550e8400-e29b-41d4-a716-446655440000","quantity":100}' \
  http://localhost:8000/api/user/cart.php?action=add
# Expected: 422, validation error

# Test 4: Add to cart (no JWT)
curl -X POST -H "Content-Type: application/json" \
  -d '{"product_id":"550e8400-e29b-41d4-a716-446655440000","quantity":2}' \
  http://localhost:8000/api/user/cart.php?action=add
# Expected: 401 Unauthorized
```

#### Admin Upload Endpoint
```bash
# Generate CSRF token from session
curl -c cookies.txt http://localhost:8000/api/admin/dashboard.php
CSRF=$(grep csrf_token cookies.txt | awk '{print $NF}')

# Test 1: Upload image (valid)
ADMIN_JWT="eyJ0eXAi..."
curl -X POST \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "X-CSRF-Token: $CSRF" \
  -F "image=@test.jpg" \
  http://localhost:8000/api/admin/upload_image.php
# Expected: 200 OK, image_url in response

# Test 2: Upload image (no CSRF token)
curl -X POST \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -F "image=@test.jpg" \
  http://localhost:8000/api/admin/upload_image.php
# Expected: 403 CSRF error

# Test 3: Upload image (not admin)
USER_JWT="eyJ0eXAi..."
curl -X POST \
  -H "Authorization: Bearer $USER_JWT" \
  -H "X-CSRF-Token: $CSRF" \
  -F "image=@test.jpg" \
  http://localhost:8000/api/admin/upload_image.php
# Expected: 403 Forbidden
```

### Security Tests

#### Privilege Escalation
```bash
USER_JWT="eyJ0eXAi..."  # Regular user's JWT
ADMIN_ID="550e8400..."   # Admin's user ID

# Try to add item to admin's cart (should fail)
curl -X POST \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$ADMIN_ID\",\"product_id\":\"...\",\"quantity\":1}" \
  http://localhost:8000/api/user/cart.php?action=add

# Result: ✓ Item added to USER's cart, not admin's
#         ✗ user_id parameter ignored (RLS + JWT enforced)
```

#### Price Tampering
```bash
JWT="eyJ0eXAi..."

# Try to set $0 order total
curl -X POST \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "items":[{"product_id":"abc-123","quantity":2}],
    "total_amount":0,
    "shipping_address":{...}
  }' \
  http://localhost:8000/api/orders/create

# Result: ✓ Order created with server-calculated total
#         ✗ total_amount parameter ignored
```

#### Rate Limiting
```bash
# Try to add to cart 61 times per minute
for i in {1..61}; do
  curl -X POST -H "Authorization: Bearer $JWT" \
    -H "Content-Type: application/json" \
    -d '{"product_id":"...","quantity":1}' \
    http://localhost:8000/api/user/cart.php?action=add
done

# Results:
# Requests 1-60: ✓ 200 OK
# Request 61: ✗ 429 Too Many Requests
```

#### CORS
```bash
# Request from unauthorized origin
curl -H "Origin: https://attacker.com" \
  http://localhost:8000/api/public/products.php \
  -i

# Result: ✗ Access-Control-Allow-Origin NOT set
#         ✗ Browser blocks response
```

---

## Performance Checks

### Response Time Benchmarks
```bash
# Public endpoint (no auth)
time curl http://localhost:8000/api/public/products.php
# Target: < 100ms

# User endpoint (with JWT)
time curl -H "Authorization: Bearer $JWT" \
  http://localhost:8000/api/user/cart.php?action=get
# Target: < 150ms

# Admin endpoint (with JWT + CSRF)
time curl -X POST \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "X-CSRF-Token: $CSRF" \
  -F "image=@test.jpg" \
  http://localhost:8000/api/admin/upload_image.php
# Target: < 200ms
```

### Resource Usage
```bash
# Check PHP memory usage
ps aux | grep php
# Target: < 50MB per process

# Check file descriptor usage
lsof -p [PID] | wc -l
# Target: < 20 file descriptors
```

---

## Frontend Integration Checklist

- [ ] Update all fetch() calls to new endpoint paths
- [ ] Pass JWT in Authorization header
- [ ] Parse new response schema (data field)
- [ ] Handle error codes (E_VALIDATION_FAILED, etc.)
- [ ] Show validation errors from field_message
- [ ] Update cart merge after login
- [ ] Send CSRF token for admin forms
- [ ] Handle 429 rate limit response
- [ ] Clear localStorage on logout
- [ ] Test on all browsers (Chrome, Firefox, Safari, Edge)

---

## Monitoring & Alerts

### Metrics to Track
- [ ] Request count per endpoint
- [ ] Response time (p50, p95, p99)
- [ ] Error rate (4xx, 5xx)
- [ ] JWT validation failures
- [ ] Rate limit hits
- [ ] CSRF failures
- [ ] File upload failures

### Logs to Monitor
- [ ] `/var/www/error.log` for PHP errors
- [ ] `/var/www/api/logs/` for application logs
- [ ] Supabase dashboard for DB errors
- [ ] CORS errors in browser console

### Alerts
```
If 5xx error rate > 1% → Alert on-call
If rate_limit hits > 100/min → Check for DDoS
If JWT failures > 10/min → Check auth service
If validation errors > 50% → Check frontend code
```

---

## Rollback Plan

If issues found in production:

1. **Immediate**: Revert to previous _bootstrap.php
2. **Within 1 hour**: Revert all lib files
3. **Within 2 hours**: Revert all endpoint changes
4. **Communicate**: Notify users of downtime

---

## Post-Deployment

### Day 1
- [ ] Monitor error logs hourly
- [ ] Check response times
- [ ] Verify JWT extraction working
- [ ] Test rate limiting
- [ ] Confirm CORS working

### Week 1
- [ ] Collect metrics on API usage
- [ ] Review slow queries
- [ ] Check for SQL injection attempts
- [ ] Analyze error patterns

### Month 1
- [ ] Performance analysis
- [ ] Security audit
- [ ] Load testing (10x traffic spike)
- [ ] Cache optimization

---

## Success Criteria

✅ All endpoints return 200 OK  
✅ Average response time < 150ms  
✅ Error rate < 0.5%  
✅ JWT extraction working 100%  
✅ Rate limiting activated  
✅ No hard-coded secrets in logs  
✅ CORS headers set correctly  
✅ RLS policies enforced  
✅ Admin role checks working  
✅ CSRF tokens validated  
✅ Validation errors at 422  
✅ No privilege escalation possible  

---

**Deployment Ready**: ✅ All checks can proceed

