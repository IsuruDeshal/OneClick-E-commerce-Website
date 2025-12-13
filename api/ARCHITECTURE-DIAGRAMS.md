# Clean API Architecture - Visual Diagrams

## 1. Request Flow Diagram

```
┌─────────────────────────────┐
│   Frontend (JavaScript)      │
│   JWT in Authorization       │
└──────────────┬──────────────┘
               │
        POST /api/user/cart.php
        Headers: Authorization: Bearer JWT
        Body: { product_id, quantity }
               │
        ┌──────▼─────────────────────────────────────────┐
        │   _bootstrap.php (UNIVERSAL ENTRY)             │
        │                                                 │
        │   ✓ Load lib/response.php                      │
        │   ✓ Load lib/validation.php                    │
        │   ✓ Load lib/auth.php                          │
        │   ✓ Load lib/supabase.php                      │
        │   ✓ Load lib/rate_limiter.php                  │
        │   ✓ Load lib/csrf.php                          │
        │   ✓ Set CORS, security headers                │
        │   ✓ Start session                              │
        └──────┬─────────────────────────────────────────┘
               │
        ┌──────▼──────────────────────────────┐
        │   cart.php (BUSINESS LOGIC)          │
        │                                      │
        │  Step 1: require_method('POST')     │
        │  Step 2: $uid = require_user()      │ ◄─── JWT 'sub'
        │  Step 3: rate_limit('cart', 60)     │ ◄─── Per IP/min
        │  Step 4: $input = get_json_input()  │
        │  Step 5: v_uuid($pid, ...)          │ ◄─── Validator exit
        │  Step 6: v_int($qty, ..., 1, 99)    │ ◄─── Bounds check
        │  Step 7: Validate product (anon)    │ ◄─── RLS enforced
        │  Step 8: POST to cart_items (anon)  │
        │  Step 9: json_success([...])        │
        └──────┬──────────────────────────────┘
               │
        ┌──────▼──────────────────────────────────┐
        │   Supabase REST API (Anon Key)           │
        │                                          │
        │   RLS POLICY: user_id = auth.uid()      │
        │   → Only user's own rows visible         │
        │   → Insert/update only own cart items    │
        └──────┬──────────────────────────────────┘
               │
        ┌──────▼──────────────────────────────────┐
        │   PostgreSQL (Database)                  │
        │                                          │
        │   INSERT INTO cart_items (...)          │
        │   WHERE user_id = 'current-user-id'     │
        └──────┬──────────────────────────────────┘
               │
        ┌──────▼──────────────────────────────┐
        │   Response Flow (Back to Frontend)   │
        │                                      │
        │   {                                  │
        │     "success": true,                 │
        │     "data": {                        │
        │       "message": "Added to cart",    │
        │       "quantity": 2                  │
        │     }                                │
        │   }                                  │
        │                                      │
        │   HTTP 200 OK                        │
        └──────┬──────────────────────────────┘
               │
        ┌──────▼──────────────────┐
        │   Frontend (Success UI)  │
        │   Show cart updated      │
        └──────────────────────────┘
```

---

## 2. Authentication Flow

```
┌──────────────────────────────────────────────────────┐
│              SUPABASE AUTH (JWT Issuer)              │
│                                                      │
│  POST /auth/v1/token (email + password)             │
│  → Issues JWT with claims:                          │
│    - sub: user-id (uuid)                            │
│    - email: user@example.com                        │
│    - role: authenticated | admin                    │
│    - iat, exp, iss, aud                             │
│                                                      │
└──────────────────┬───────────────────────────────────┘
                   │
        JWT = eyJ0eXAiOiJKV1QiLCJhbGc...
                   │
        ┌──────────▼──────────────────────┐
        │   Frontend (Storage)             │
        │   - httpOnly cookie (auto)       │
        │   - localStorage (fallback)      │
        └──────────────────────────────────┘
                   │
   ┌──────────────────────────────────────────────┐
   │          EVERY AUTHENTICATED REQUEST          │
   │                                              │
   │  Authorization: Bearer <JWT>                 │
   └──────────────────┬───────────────────────────┘
                      │
        ┌─────────────▼──────────────┐
        │   Backend: require_user()   │
        │                             │
        │  1. Extract Bearer token    │
        │  2. Decode JWT payload      │
        │  3. Extract 'sub' claim     │
        │  4. Return user_id          │
        │  5. Or: json_unauthorized() │
        └─────────────┬────────────────┘
                      │
        ┌─────────────▼────────────────────┐
        │   JWT Payload (Decoded)           │
        │                                   │
        │  {                               │
        │    "sub": "uuid-1234",            │
        │    "email": "user@example.com",   │
        │    "role": "authenticated",       │
        │    "iat": 1700000000,             │
        │    "exp": 1700086400,             │
        │    "iss": "https://...supabase.co"│
        │  }                                │
        └─────────────┬────────────────────┘
                      │
        ┌─────────────▼──────────────────────┐
        │   use $user_id in business logic   │
        │   No client input used             │
        └────────────────────────────────────┘
```

---

## 3. Security Layers

```
┌────────────────────────────────────────────────────┐
│  LAYER 1: Frontend (Browser Security)              │
│  ✓ JWT in httpOnly cookie (CSRF safe)              │
│  ✓ Session storage for fallback                    │
│  ✓ HTTPS only (production)                         │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  LAYER 2: CORS (Origin Whitelist)                  │
│  ✓ Access-Control-Allow-Origin: whitelisted        │
│  ✓ Credentials: true (httpOnly cookie flow)        │
│  ✗ Requests from unauthorized origins blocked      │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  LAYER 3: Rate Limiting (IP-based)                 │
│  ✓ Per IP per minute buckets                       │
│  ✓ Throttle: login (10), order (5), list (120)     │
│  ✗ Brute-force attacks blocked                     │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  LAYER 4: JWT Extraction (User ID Source)          │
│  ✓ Extract from Authorization header only          │
│  ✓ Never accept client-supplied user_id            │
│  ✗ Privilege escalation attacks blocked            │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  LAYER 5: Input Validation (Bounds Checking)       │
│  ✓ v_int validates min/max (1-99)                 │
│  ✓ v_uuid validates UUID format                    │
│  ✓ v_cart_items validates array schema             │
│  ✗ Invalid input exits immediately                 │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  LAYER 6: Admin Role Check (JWT 'role' claim)      │
│  ✓ require_admin() checks JWT 'role' = 'admin'     │
│  ✓ Only then use service key                       │
│  ✗ Non-admin cannot access admin endpoints         │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  LAYER 7: CSRF Token (Admin Forms)                 │
│  ✓ Session generates secure token                  │
│  ✓ X-CSRF-Token header validated                   │
│  ✗ CSRF attacks blocked                            │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  LAYER 8: Row-Level Security (Database Level)      │
│  ✓ RLS policies enforce user isolation             │
│  ✓ Anon key: users see only own rows               │
│  ✓ Service key (admin): see all rows               │
│  ✗ SQL injection + data leaks blocked              │
└────────────────────────────────────────────────────┘

Result: Defense-in-depth ⭐⭐⭐⭐⭐
```

---

## 4. Library Dependency Tree

```
_bootstrap.php (Root)
│
├─→ lib/response.php
│   └─ json_success()
│   └─ json_error()
│   └─ require_method()
│
├─→ lib/validation.php
│   └─ v_int()
│   └─ v_string()
│   └─ v_uuid()
│   └─ v_cart_items()
│   └─ get_json_input()
│   └─ escape_html()
│
├─→ lib/auth.php
│   ├─ require_user()      ◄─── uses lib/response.php
│   ├─ require_admin()
│   └─ decode_jwt_payload()
│
├─→ lib/supabase.php       ◄─── uses lib/response.php
│   ├─ supabase_request_anon()
│   ├─ supabase_request_service()
│   └─ get_json_input()
│
├─→ lib/rate_limiter.php   ◄─── uses lib/response.php
│   └─ rate_limit()
│
└─→ lib/csrf.php           ◄─── uses lib/response.php
    ├─ csrf_token()
    └─ require_csrf()


Endpoint Files (Use _bootstrap, then call lib functions):

/api/public/
├─ products.php
│  ├─ require_method()
│  ├─ rate_limit()
│  ├─ supabase_request_anon()
│  └─ json_success()
│
/api/user/
├─ cart.php
│  ├─ require_user()
│  ├─ get_json_input()
│  ├─ v_int(), v_uuid()
│  ├─ supabase_request_anon()
│  ├─ supabase_request_service()
│  └─ json_success()/json_error()
│
/api/admin/
├─ upload_image.php
   ├─ require_admin()
   ├─ require_csrf()
   ├─ rate_limit()
   ├─ json_validation_error()
   └─ json_success()
```

---

## 5. Key Decision Tree

```
                    ┌─ NEW REQUEST ─┐
                    │                │
                    └────┬───────────┘
                         │
              ┌──────────▼──────────────┐
              │ Is it public data?      │
              │ (products, stock, etc)  │
              └──────────┬──────────────┘
                    ┌────┴────┐
                    │         │
                   YES       NO
                    │         │
         ┌──────────▼─┐   ┌──▼──────────────┐
         │ Public     │   │ Needs JWT?      │
         │ endpoint   │   └──┬──────────────┘
         │            │      │
         │ • rate_    │      ├─► YES: User data
         │   limit    │      │   require_user()
         │ • anon     │      │
         │   key RLS  │      └─► MAYBE Admin
         │ • success  │          require_admin()
         │            │
         └────────────┘   ┌───────────────┐
                          │ Admin action? │
                          └──┬────────────┘
                             │
                      ┌──────┴──────┐
                      │             │
                     YES           NO
                      │             │
              ┌───────▼────┐   ┌───▼────────┐
              │ Admin code │   │ User code  │
              │            │   │            │
              │ • require_ │   │ • require_ │
              │   admin()  │   │   user()   │
              │ • require_ │   │ • rate_    │
              │   csrf()   │   │   limit()  │
              │ • service  │   │ • anon key │
              │   key      │   │ • validate │
              │ • validate │   │ • respond  │
              │ • respond  │   │            │
              └────────────┘   └────────────┘
```

---

## 6. File Upload Security

```
File Upload Request
↓
┌─────────────────────────────────────────┐
│ Step 1: Authentication                   │
│ require_admin() → JWT + role check       │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│ Step 2: CSRF Protection                  │
│ require_csrf() → session token check     │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│ Step 3: Rate Limiting                    │
│ rate_limit('admin_upload', 10)           │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│ Step 4: File Size Check                  │
│ if size > 5MB: reject                    │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│ Step 5: Extension Check (Whitelist)      │
│ allowed: jpg, jpeg, png, webp            │
│ blocked: php, exe, sh, etc               │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│ Step 6: MIME Type Check                  │
│ finfo_file() must be image/jpeg, etc     │
│ (not trusting user-supplied MIME)        │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│ Step 7: Safe Filename                    │
│ bin2hex(random_bytes(16)) + ext          │
│ no user input in filename                │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│ Step 8: Move to Uploads Dir              │
│ /uploads/products/abc123.jpg             │
│ chmod 644 (read-only for web)            │
└────────────────┬────────────────────────┘
                 │
            SUCCESS ✓
            └─► json_success(['image_url'])
```

---

## 7. Merge Cart Flow (Guest → User)

```
Guest has localStorage cart:
[
  { product_id: "abc", quantity: 2 },
  { product_id: "def", quantity: 1 }
]

User logs in → JWT received
POST /api/user/cart.php?action=merge
Authorization: Bearer JWT
Body: { items: [...] }

┌─────────────────────────────────────────┐
│ Step 1: Authenticate                    │
│ $user_id = require_user()  ← Extract JWT │
└────────┬────────────────────────────────┘
         │
┌────────▼────────────────────────────────┐
│ Step 2: Validate Items                   │
│ v_cart_items([...])                     │
│ Check each product_id is UUID           │
│ Check each quantity is 1-99             │
└────────┬────────────────────────────────┘
         │
┌────────▼────────────────────────────────┐
│ Step 3: Fetch Product Data               │
│ Query: GET /products?id=abc,def          │
│ Via: anon key (RLS not needed for read)  │
└────────┬────────────────────────────────┘
         │
         products = [
           { id: "abc", status: "active", stock: 100 },
           { id: "def", status: "active", stock: 5 }
         ]
         │
┌────────▼────────────────────────────────┐
│ Step 4: Filter Valid Products            │
│ Skip if: status != "active" or not found │
│ Clamp: qty to available stock            │
└────────┬────────────────────────────────┘
         │
         merged = [
           { user_id, product_id: "abc", quantity: 2 },
           { user_id, product_id: "def", quantity: 1 }
         ]
         │
┌────────▼────────────────────────────────┐
│ Step 5: Bulk Insert via Service Key      │
│ POST /cart_items with service role       │
│ (requires require_admin check first)     │
│ On conflict: merge quantities            │
└────────┬────────────────────────────────┘
         │
      SUCCESS ✓
      └─► json_success(['merged' => 2])
          └─ Frontend clears localStorage
          └─ Fetches updated cart from DB
```

---

## 8. Error Handling Flow

```
Request comes in
│
├─► require_method() fails
│   └─► json_error('E_INVALID_METHOD', ..., 405)
│
├─► require_user() fails (no JWT)
│   └─► json_unauthorized() [401]
│
├─► require_admin() fails (not admin role)
│   └─► json_forbidden() [403]
│
├─► v_int() fails (value < min)
│   └─► json_validation_error('field', 'Must be >= 1') [422]
│
├─► rate_limit() fails (too many requests)
│   └─► json_error('E_RATE_LIMIT', ..., 429)
│
├─► require_csrf() fails (bad token)
│   └─► json_error('E_CSRF', ..., 403)
│
├─► Supabase returns 404
│   └─► json_error('E_UPSTREAM', 'Not found', 502)
│
└─► File upload > 5MB
    └─► json_validation_error('image', 'File too large') [422]

All errors return consistent JSON:
{
  "success": false,
  "error": "E_CODE",
  "message": "Human message",
  "field": "field_name"  (if validation error)
}
```

---

## Summary: 8 Security Layers + Fail-Fast Pattern

```
                    REQUEST
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                   │
   CORS         Rate Limit            JWT Check
   (Layer 2)     (Layer 3)            (Layer 4)
    │                  │                   │
    └──────────────────┼──────────────────┘
                       │
                 Input Validation
                    (Layer 5)
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                   │
  Public         User Endpoint          Admin
 Endpoint      (User must pass)    (Admin + CSRF)
              (Roles Layer 6)     (Layer 6 + 7)
    │                  │                   │
    └──────────────────┼──────────────────┘
                       │
              Use Correct API Key
              (Anon vs Service)
                       │
           Supabase RLS Policy
              (Layer 8)
                       │
              Database Enforces
            (rows filtered by user_id)
                       │
                    SUCCESS
```

Each layer exits immediately on failure ✓
No partial processing ✓
Consistent error format ✓

