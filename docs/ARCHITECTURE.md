# OneClick Computers – Full System Architecture

Last Updated: 2025-11-15

## 1. High-Level Overview
OneClick Computers is a hybrid static + dynamic e‑commerce platform. The frontend consists of static HTML pages enhanced by modular JavaScript managers. All dynamic data operations (products, cart, wishlist, orders, addresses, settings) are performed through a PHP proxy API layer talking to Supabase PostgREST endpoints. Authentication leverages Supabase Auth, with a legacy PHP session fallback for admin authentication.

```
[Browser] ──(HTML/JS/CSS)──▶ Frontend Pages
    │
    ├─(fetch)──▶ PHP API Endpoints (/api/*.php)
    │              │
    │              └─(cURL REST)──▶ Supabase PostgREST / Auth / Storage
    │
    └─(localStorage guest state)──▶ cart / wishlist (merged after login)
```

## 2. Architectural Layers
| Layer | Responsibility | Technologies |
|-------|----------------|--------------|
| Presentation | Render UI, capture user actions | HTML, CSS, Vanilla JS, FontAwesome |
| Client Modules | Product loading, cart manager, auth wrapper, DB helper | `product-loader.js`, `cart-manager.js`, `supabase-auth.js`, `supabase-db.js` |
| API Gateway (PHP) | Validation, normalization, security boundary, fallbacks | PHP 7+/8+, cURL |
| Data Services | CRUD via REST, row security, auth tokens | Supabase (PostgREST, Auth, Storage, RLS) |
| Persistence | Tables for domain entities | PostgreSQL (managed by Supabase) |
| State (Guest) | Temporary cart/wishlist pre-login | localStorage |
| State (Auth) | Durable user data + orders | Supabase tables |

## 3. Data Flow Scenarios
### 3.1 Product Listing
1. User visits `shop.html`.
2. JS calls `/api/get-products-v2.php` (filters applied via query params).
3. PHP performs cURL to `SUPABASE_URL/rest/v1/products` with anon key and status filters.
4. Response normalized and sent back to browser.
5. Browser renders product cards, wires cart buttons.

### 3.2 Guest Add to Cart
1. Click 'Add to Cart'.
2. `cart-manager.js` updates `localStorage['oneclick_cart']` + badge.
3. No server write until user logs in.

### 3.3 Login & Merge
1. Supabase Auth establishes session.
2. `account.html` detects login; runs `mergeGuestState(user)`.
3. Posts guest cart items to `/api/cart/merge-cart.php` ⇒ upsert into `cart_items`.
4. Posts guest wishlist items to `/api/wishlist/merge-wishlist.php` ⇒ insert missing rows.
5. Local cart replaced with merged server snapshot; wishlist local key cleared.

### 3.4 Order Creation
1. User checks out; frontend builds order payload.
2. `create-order-supabase.php` validates JSON; generates order number.
3. Inserts order into `orders`; inserts each line into `order_items` via Supabase REST.
4. Returns `order_id`, `order_number` to frontend.

### 3.5 Admin Product Update
1. Admin opens modal in `admin/index.html`.
2. Submit triggers `admin-save-product.php` (PHP mode) or direct Supabase update (Supabase mode).
3. Endpoint uses POST or PATCH through Supabase REST; returns success JSON.
4. Dashboard refreshes products table.

## 4. Core Components
### 4.1 Frontend Modules
- `cart-manager.js`: Local cart operations, notifications, badge updates, merge cooperation.
- `supabase-auth.js`: Wrapper for Supabase Auth routines (init, session events).
- `supabase-db.js`: Optional helper for profile queries and structured data access.
- `product-loader.js`: Unified fetch for products via `get-products-v2.php`.
- Dashboard inline JS (`admin/index.html`): Dual-mode (PHP session / Supabase) data loading.

### 4.2 PHP API Endpoints (Representative)
| Domain | Files | Purpose |
|--------|-------|---------|
| Products | `get-products-v2.php`, `admin-save-product.php`, `admin-delete-product.php`, `admin-upload-image.php` | Read/CRUD + image handling |
| Orders | `get-orders-supabase.php`, `create-order-supabase.php`, `update-order-status-supabase.php` | User + admin order management |
| Cart | `cart/get-cart-supabase.php`, `cart/add-to-cart-supabase.php`, `cart/remove-from-cart-supabase.php`, `cart/merge-cart.php` | Persistent cart operations |
| Wishlist | `wishlist/get-wishlist-supabase.php`, `wishlist/add-to-wishlist-supabase.php`, `wishlist/remove-from-wishlist-supabase.php`, `wishlist/merge-wishlist.php` | Persistent wishlist operations |
| Addresses | `addresses/get-addresses-supabase.php` | Saved addresses retrieval |
| Settings | `get-settings-supabase.php`, `save-settings-supabase.php` | App settings CRUD |
| Auth | `admin-login-supabase.php`, `user-login.php`, `check-user-session.php`, `check-admin-session.php` | Authentication & session checks |
| Stock | `check-stock-supabase.php` | Inventory validation before purchase |

### 4.3 Configuration
- `config-local.php` handles:
  - Environment detection (localhost vs EC2).
  - DB legacy vars (unused for Supabase main flows but retained).
  - Supabase keys (anon + service role – MUST move service role to environment in production).
  - CORS + security headers.
  - Session cookie settings.
  - Optional `.env` loader for secrets.

## 5. Security Model
### 5.1 Authentication
- Users: Supabase Auth tokens persisted by client library.
- Admin: First attempt via PHP `check-admin-session.php` (session cookie). Fallback: Supabase Auth + role check.

### 5.2 Authorization
- RLS policies (recommended) ensure row ownership (e.g., `cart_items.user_id = auth.uid()`).
- Admin operations requiring broad access should route through endpoints that use service role key server-side only.

### 5.3 Secrets & Keys
- `SUPABASE_SERVICE_ROLE_KEY` currently appears directly in `config-local.php` (risk). Should be loaded from environment and never committed.
- Anon key acceptable client exposure (read scope under RLS). Rotate both keys if accidental leak occurs.

### 5.4 Input Validation
- Present: Basic presence & numeric checks in individual endpoints.
- Missing: Centralized sanitization library, strict format enforcement (SKU regex, phone pattern, category whitelist).
- Recommendation: Introduce `lib/validation.php` with reusable validators.

### 5.5 Attack Surface
| Vector | Mitigation |
|--------|-----------|
| Parameter tampering | Validate & cast values (expand validation). |
| Unauthorized access | Enforce RLS; verify admin role before service role usage. |
| Key leakage | Move service role key to environment; rotate keys. |
| CSRF (POST endpoints) | SameSite=Lax session cookies; could add CSRF token for admin forms. |
| XSS (content rendering) | Escape product fields in admin table and user UI; review all dynamic insertions. |

## 6. Error Handling & Resilience
- Standard response schema: `{ success: boolean, error?: string, message?: string }`.
- Frontend fallbacks: Orders & addresses attempt Supabase then PHP proxy.
- Merge endpoints use idempotency flags to avoid duplicate merges.
- Suggested enhancement: Add structured error codes (`E_CART_NOT_FOUND`, `E_PRODUCT_SAVE_FAILED`).

## 7. Performance Considerations
| Area | Current | Improvements |
|------|---------|-------------|
| Product listing | Direct REST filter; no pagination | Add `limit`, `offset`, caching headers |
| Cart merge | Item-by-item loop REST calls | Batch POST or RPC function for upsert |
| Wishlist merge | Item-by-item inserts | Batch insert with `Prefer: resolution=merge-duplicates` if supported |
| Image loading | Direct external URLs | Employ Supabase Storage + CDN caching |
| Dashboard counts | Separate queries | Aggregate single RPC or view |

## 8. Deployment Model
- Local: XAMPP (Apache + PHP) + static asset directory.
- Production: EC2 instance serving same file tree; environment-specific config via `config-local.php`.
- Future: Containerization (Docker) recommended for consistent environment; secrets injected as environment variables.

## 9. Database Schema Summary (Essential Fields)
```
products(id, name, sku, category, price, stock, description, image_url, status, featured, condition, created_at)
orders(id, order_number, user_id, total_amount, status, payment_status, payment_method, created_at)
order_items(id, order_id, product_id, product_name, sku, quantity, price, subtotal)
cart_items(id, user_id, product_id, quantity, created_at)
wishlist_items(id, user_id, product_id, created_at)
addresses(id, user_id, name, full_name, phone, address_line1, address_line2, city, postal_code, country, is_default, default_shipping, default_billing, updated_at)
settings(id, key, value, updated_at)
users(id, email, role, name/full_name, phone, created_at)
```

## 10. State Management
| State | Storage | Lifecycle |
|-------|---------|-----------|
| Guest cart | `localStorage.oneclick_cart` | Until login or manual clear |
| Guest wishlist | `localStorage.oneclick_wishlist` | Until login or manual clear |
| Auth cart | `cart_items` | Persistent per user |
| Auth wishlist | `wishlist_items` | Persistent per user |
| Session flags | `localStorage cartMerged:<uid>` | Prevents re-merging |

## 11. Admin Dashboard Dual-Mode Logic
1. Attempt PHP session (fast path for legacy setup).
2. If missing, fallback to Supabase session & role check.
3. Data loaders (`loadProducts`, `loadOrders`) branch on `authMode`.
4. CRUD: PHP endpoints vs direct Supabase calls depending on mode.

## 12. Observability & Logging
- PHP: `error_log()` to `logs/error.log` or `php-errors.log` (production).
- Frontend: Console diagnostics with contextual prefixes `[loadProducts]`, `[Auth]`.
- Missing: Structured event logging, performance timings, monitoring hooks.

## 13. Extensibility Points
| Feature | Approach |
|---------|----------|
| Pagination | Add query params `page`, `limit`; server calculates `range` for Supabase REST. |
| Search | Introduce `ilike` filters or a dedicated search view. |
| Promotions | New table `promotions`; join in product listing endpoint. |
| Inventory reservations | Add `reserved_stock` column or separate `stock_movements` table. |
| Payment webhooks | Create `/api/webhooks/payhere.php` verifying signatures and updating `orders`. |
| Activity log | `audit_logs(user_id, action, entity, entity_id, meta, created_at)`. |

## 14. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Service role key exposed | Full DB access to attacker | Move to env; rotate immediately |
| Missing RLS policies | Data leakage/modification | Implement recommended RLS set |
| Lack of input constraints | Potential injection or data anomalies | Central validation + whitelists |
| Merge race conditions | Double quantities | Use single upsert RPC or transactional function |
| Large guest cart | Slow merge (multiple sequential requests) | Batch operations / concurrency limiting |

## 15. Recommended Immediate Improvements (Priority Order)
1. Environment secret hardening (remove service role key from repo).
2. Implement full RLS policies and test with anon key.
3. Central validation helper + normalize error codes.
4. Batch cart/wishlist merge optimization.
5. Pagination & search enhancements for products.
6. Monitoring: Add lightweight health endpoint and metrics.
7. Introduce `wishlist-manager.js` mirroring cart for symmetry.
8. Payment webhook integration for order status automation.

## 16. Textual Sequence Diagram (Login + Merge)
```
User -> Browser: Enter credentials
Browser -> Supabase Auth: signIn(email, password)
Supabase Auth -> Browser: session(token)
Browser -> account.html: onAuthStateChange(user)
account.html -> localStorage: read oneclick_cart / oneclick_wishlist
account.html -> merge-cart.php: POST { user_id, items[] }
merge-cart.php -> Supabase REST: GET existing + PATCH/POST upserts
Supabase REST -> merge-cart.php: merged rows
merge-cart.php -> account.html: merged snapshot
account.html -> CartManager: replace local data
account.html -> merge-wishlist.php: POST { user_id, items[] }
account.html -> Dashboard loaders: fetch orders, addresses
```

## 17. Deployment Checklist (Condensed)
- Remove service role key from tracked files.
- Set environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Confirm RLS policies active for all sensitive tables.
- Run migrations / schema validation on Supabase.
- Test fallback endpoints (orders, addresses) without Supabase JS to confirm resilience.
- Configure domain & CORS allowed origins.
- Set up log rotation / watch for error surge.
- Optional: Add WAF / Cloudflare for basic DDoS mitigation.

## 18. Future Migration Path
Potential evolution: Move from PHP cURL wrappers to a Node.js or Go microservice layer with typed SDK usage, OR adopt Supabase Edge Functions for selected operations (e.g., merge logic). Transition cart merge into a single RPC inside Supabase for atomicity.

## 19. Summary
The system deliberately balances simplicity (static pages + straightforward PHP proxies) with cloud managed services (Supabase) for authentication and persistence. Recent additions (cart/wishlist merge and fallback endpoints) improve UX continuity and resilience. Key next steps focus on security hardening, performance tuning, and structured validation.

---
**Questions / Next Actions:** Ask for “RLS details” or “hardening plan” to proceed deeper.
