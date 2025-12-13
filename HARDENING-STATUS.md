# Endpoint Hardening Status

## Phase 1: Foundation (Completed ✓)
- [x] `api/_bootstrap.php` - Central loader, CORS, session, lib loading
- [x] `api/lib/response.php` - Centralized JSON response format
- [x] `api/lib/validation.php` - Input validators (v_int, v_string, v_uuid, v_cart_items, v_wishlist_items, v_product, etc.)
- [x] `api/lib/auth.php` - JWT extraction, role checks, service key helpers

---

## Phase 2: User Flows (Completed ✓)

### Cart Management
| Endpoint | Status | Changes |
|----------|--------|---------|
| `cart/add-to-cart-supabase.php` | ✅ Hardened | Uses _bootstrap, JWT user_id, v_int validation, json_success/error |
| `cart/remove-from-cart-supabase.php` | ✅ Hardened | Uses _bootstrap, JWT user_id, accepts product_id OR cart_item_id |
| `cart/merge-cart.php` | ✅ Hardened | Uses _bootstrap, require_user(), v_cart_items(), batch insert |
| `cart/get-cart-supabase.php` | ⏳ Pending | Needs _bootstrap + json_success |
| `cart/sync-cart.php` | ⏳ Pending | Needs _bootstrap + JWT validation |
| `cart/get-cart.php` | 🗑️ Legacy | MySQL fallback; candidate for deletion |

### Wishlist Management
| Endpoint | Status | Changes |
|----------|--------|---------|
| `wishlist/add-to-wishlist-supabase.php` | ✅ Hardened | Uses _bootstrap, JWT user_id, json_success/error |
| `wishlist/remove-from-wishlist-supabase.php` | ✅ Hardened | Uses _bootstrap, JWT user_id, accepts product_id OR wishlist_item_id |
| `wishlist/merge-wishlist.php` | ✅ Hardened | Uses _bootstrap, require_user(), v_wishlist_items(), batch insert |
| `wishlist/get-wishlist-supabase.php` | ⏳ Pending | Needs _bootstrap + json_success |
| `wishlist/sync-wishlist.php` | ⏳ Pending | Needs _bootstrap + JWT validation |
| `wishlist/get-wishlist.php` | 🗑️ Legacy | MySQL fallback; candidate for deletion |

### Order Management
| Endpoint | Status | Changes |
|----------|--------|---------|
| `create-order-supabase.php` | ✅ Hardened | Uses _bootstrap, JWT user_id, recalcs totals, validates stock |
| `orders/get-user-orders.php` | ✅ Hardened | NEW; user-only view via RLS (anon key) |
| `admin/orders/get-all.php` | ✅ Hardened | NEW; admin-only view via service key + require_admin() |
| `get-orders-supabase.php` | 🗑️ Legacy | DEPRECATED; replaced by get-user-orders.php + get-all.php |
| `update-order-status-supabase.php` | ⏳ Pending | Needs _bootstrap + require_admin() + role check |
| `get-orders.php` | 🗑️ Legacy | MySQL fallback; candidate for deletion |
| `create-order.php` | 🗑️ Legacy | MySQL fallback; candidate for deletion |
| `update-order-status.php` | 🗑️ Legacy | MySQL fallback; candidate for deletion |
| `payhere-notify.php` | ⏳ Pending | Webhook handler; needs auth verification |

---

## Phase 3: Product Management

### Products (Public Read-Only)
| Endpoint | Status | Changes |
|----------|--------|---------|
| `get-products-v2.php` | ✅ Ready | Anon key OK; no auth needed; candidate for JS direct query |
| `get-products.php` | 🗑️ Legacy | v1 fallback; candidate for deletion |
| `check-stock-supabase.php` | ⏳ Pending | Needs _bootstrap + anon key OK |
| `debug-products.php` | 🗑️ Test | Candidate for deletion |
| `get-categories-supabase.php` | ⏳ Pending | Needs _bootstrap |
| `get-categories.php` | 🗑️ Legacy | MySQL fallback; candidate for deletion |

### Products (Admin Write)
| Endpoint | Status | Changes |
|----------|--------|---------|
| `admin-save-product.php` | ⏳ Pending | Needs _bootstrap + require_admin() + v_product() + service key |
| `admin-delete-product.php` | ⏳ Pending | Needs _bootstrap + require_admin() + v_uuid() + service key |
| `admin-upload-image.php` | ⏳ Pending | Needs _bootstrap + require_admin() + file validation |

---

## Phase 4: Authentication

| Endpoint | Status | Changes |
|----------|--------|---------|
| `admin-login-supabase.php` | ⏳ Pending | Review; may need refactor to use auth.php helpers |
| `admin-logout.php` | ⏳ Pending | Review; ensure JWT token clearing |
| `user-login.php` | ⏳ Pending | Review; ensure JWT in response/cookie |
| `user-logout.php` | ⏳ Pending | Review; ensure JWT clearing |
| `user-register.php` | ⏳ Pending | Review; hash validation |
| `auth/login.php` | ⏳ Pending | Needs review; may be newer endpoint |
| `auth/logout.php` | ⏳ Pending | Needs review |
| `auth/register.php` | ⏳ Pending | Needs review |
| `check-admin-session.php` | ⏳ Pending | Needs refactor to use require_admin() |
| `check-user-session.php` | ⏳ Pending | Needs refactor to use require_user() |
| `check-session-simple.php` | 🗑️ Legacy | Candidate for deletion |
| `admin-login-simple.php` | 🗑️ Legacy | Candidate for deletion |
| `admin-login-standalone.php` | 🗑️ Legacy | Candidate for deletion |
| `admin-login-test.php` | 🗑️ Legacy | Test file; candidate for deletion |
| `admin-logout-simple.php` | 🗑️ Legacy | Candidate for deletion |
| `check-supabase-admin.php` | 🗑️ Legacy | Candidate for deletion |

---

## Phase 5: Settings & Addresses

| Endpoint | Status | Changes |
|----------|--------|---------|
| `get-settings-supabase.php` | ⏳ Pending | Needs _bootstrap (likely anon OK for public settings) |
| `save-settings-supabase.php` | ⏳ Pending | Needs _bootstrap + require_admin() for settings write |
| `get-settings.php` | 🗑️ Legacy | MySQL fallback; candidate for deletion |
| `save-settings.php` | 🗑️ Legacy | MySQL fallback; candidate for deletion |
| `addresses/get-addresses-supabase.php` | ⏳ Pending | Needs _bootstrap + require_user() + RLS check |

---

## Phase 6: Cleanup

### Files to Delete (Legacy/Test)
- [x] Identified: 20+ MySQL fallbacks, test files, older login variants
- [ ] Action: Once Phase 2-5 endpoints are hardened, delete these:
  - `admin-login-simple.php`, `admin-login-standalone.php`, `admin-login-test.php`, `admin-logout-simple.php`
  - `check-session-simple.php`, `check-supabase-admin.php`
  - `get-products.php`, `get-categories.php`, `get-orders.php`, `create-order.php`, `update-order-status.php`
  - `get-cart.php`, `get-settings.php`, `save-settings.php`
  - `debug-products.php`, `debug-errors.php` (temp files)
  - `test-products.php`, `setup-xampp.php`, `sync-supabase-to-mysql.php` (setup scripts)

---

## Implementation Pattern

All hardened endpoints follow this template:

```php
<?php
/**
 * [Endpoint Name]
 * Security comments (JWT extraction, user_id source, validation, RLS info)
 * HTTP method and path
 * Request/response schema
 */

require_once __DIR__ . '/../_bootstrap.php';  // or adjust path

// Enforce HTTP method
require_method('POST');  // or GET, DELETE, PATCH

// Get authenticated user (JWT or session); fails if not logged in
$user_id = require_user();
// OR for admin:
// require_admin();

// Parse and validate input
$input = get_json_input();
$validated_data = v_string($input['field'], 'field');

try {
    // Business logic
    [$code, $resp] = supabase_request_anon('GET', $path);
    if ($code !== 200) throw new Exception("Failed (HTTP $code)");
    
    $data = json_decode($resp, true);
    
    // Return success
    json_success(['key' => $value]);

} catch (Exception $e) {
    error_log('Endpoint Error: ' . $e->getMessage());
    json_error('E_ERROR_CODE', $e->getMessage(), 400);
}
?>
```

---

## Progress Metrics

- **Total Endpoints**: 70 PHP files
- **Hardened**: 9 (Foundation + Cart/Wishlist + Orders)
- **Pending**: 18 (Product mgmt, Auth, Settings, Addresses)
- **Legacy (to delete)**: 20+
- **Tooling/Config**: 15+ (config, db_connect, lib files)

**Next Step**: Batch harden remaining ~18 endpoints using _bootstrap pattern.

