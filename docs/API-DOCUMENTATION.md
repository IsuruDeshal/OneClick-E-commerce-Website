# OneClick Computers - API Documentation

## Complete Supabase Backend APIs

All APIs are located in `/api/` directory and use Supabase REST API with cURL (no PostgreSQL extension required).

---

## 📦 Product Management

### Get All Products
**Endpoint:** `GET /api/get-products-v2.php`

**Query Parameters:**
- `status` - Filter by status (active, inactive)
- `category` - Filter by category name
- `featured` - Filter featured products (1 or true)
- `condition` - Filter by condition (Brand New, Used, Refurbished)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "products": [...],
  "source": "supabase"
}
```

### Get Single Product
**Endpoint:** `GET /api/get-products-v2.php?id={product_id}`

**Response:**
```json
{
  "success": true,
  "product": {...},
  "source": "supabase"
}
```

### Save Product (Add/Edit)
**Endpoint:** `POST /api/admin-save-product.php`

**Body:**
```json
{
  "id": "optional-for-edit",
  "name": "Product Name",
  "sku": "SKU-123",
  "category": "Laptops",
  "price": 50000,
  "stock": 10,
  "description": "Product description",
  "image_url": "https://...",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product saved successfully",
  "product_id": "123"
}
```

### Delete Product
**Endpoint:** `POST /api/admin-delete-product.php`

**Body:**
```json
{
  "id": "product-id"
}
```

### Upload Product Image
**Endpoint:** `POST /api/admin-upload-image.php`

**Body:** multipart/form-data with `image` field

---

## 📂 Categories

### Get All Categories
**Endpoint:** `GET /api/get-categories-supabase.php`

**Response:**
```json
{
  "success": true,
  "count": 5,
  "categories": [
    {
      "id": "Laptops",
      "name": "Laptops",
      "slug": "laptops"
    }
  ],
  "source": "supabase"
}
```

---

## 📦 Orders

### Get User Orders
**Endpoint:** `GET /api/get-orders-supabase.php?user_id={user_id}`

**Response:**
```json
{
  "success": true,
  "count": 3,
  "orders": [
    {
      "id": "order-id",
      "order_number": "ORD-123456",
      "user_id": "user-id",
      "total_amount": 50000,
      "status": "pending",
      "payment_status": "pending",
      "items": [...]
    }
  ]
}
```

### Get All Orders (Admin)
**Endpoint:** `GET /api/get-orders-supabase.php?admin=true`

Uses service role key to fetch all orders.

### Create Order
**Endpoint:** `POST /api/create-order-supabase.php`

**Body:**
```json
{
  "user_id": "user-id",
  "total_amount": 50000,
  "status": "pending",
  "payment_status": "pending",
  "payment_method": "payhere",
  "shipping_address": {
    "name": "John Doe",
    "address": "123 Main St",
    "city": "Colombo",
    "phone": "0771234567"
  },
  "items": [
    {
      "product_id": "prod-id",
      "product_name": "Product Name",
      "sku": "SKU-123",
      "quantity": 2,
      "price": 25000,
      "subtotal": 50000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "order_id": "order-id",
  "order_number": "ORD-123456"
}
```

### Update Order Status
**Endpoint:** `POST /api/update-order-status-supabase.php`

**Body:**
```json
{
  "order_id": "order-id",
  "status": "processing",
  "payment_status": "paid"
}
```

---

## 🛒 Shopping Cart

### Get Cart
**Endpoint:** `GET /api/cart/get-cart-supabase.php?user_id={user_id}`

**Response:**
```json
{
  "success": true,
  "count": 2,
  "items": [
    {
      "id": "cart-item-id",
      "user_id": "user-id",
      "product_id": "prod-id",
      "quantity": 2,
      "products": {
        "name": "Product Name",
        "price": 25000,
        "image_url": "..."
      }
    }
  ],
  "total_amount": 50000
}
```

### Add to Cart
**Endpoint:** `POST /api/cart/add-to-cart-supabase.php`

**Body:**
```json
{
  "user_id": "user-id",
  "product_id": "prod-id",
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Added to cart",
  "action": "created"
}
```

### Remove from Cart
**Endpoint:** `POST /api/cart/remove-from-cart-supabase.php`

**Body:**
```json
{
  "user_id": "user-id",
  "product_id": "prod-id"
}
```

---

## ❤️ Wishlist

### Get Wishlist
**Endpoint:** `GET /api/wishlist/get-wishlist-supabase.php?user_id={user_id}`

### Add to Wishlist
**Endpoint:** `POST /api/wishlist/add-to-wishlist-supabase.php`

**Body:**
```json
{
  "user_id": "user-id",
  "product_id": "prod-id"
}
```

### Remove from Wishlist
**Endpoint:** `POST /api/wishlist/remove-from-wishlist-supabase.php`

**Body:**
```json
{
  "user_id": "user-id",
  "product_id": "prod-id"
}
```

---

## ⚙️ Settings

### Get Settings
**Endpoint:** `GET /api/get-settings-supabase.php?key={setting_key}`

**Response:**
```json
{
  "success": true,
  "key": "whatsapp_number",
  "value": "+94771234567",
  "whatsapp": "+94771234567"
}
```

### Save Settings
**Endpoint:** `POST /api/save-settings-supabase.php`

**Body:**
```json
{
  "key": "whatsapp_number",
  "value": "+94771234567"
}
```

---

## 📊 Stock Management

### Check Stock
**Endpoint:** `GET /api/check-stock-supabase.php?product_id={product_id}&quantity={qty}`

**Response:**
```json
{
  "success": true,
  "available": true,
  "product_id": "prod-id",
  "stock": 10,
  "requested_quantity": 2
}
```

---

## 🔐 Authentication

### Admin Login
**Endpoint:** `POST /api/admin-login-supabase.php`

**Body:**
```json
{
  "email": "admin@oneclick.com",
  "password": "password123"
}
```

### User Login
**Endpoint:** `POST /api/user-login.php`

### User Register
**Endpoint:** `POST /api/user-register.php`

### Check Session
**Endpoint:** `GET /api/check-user-session.php`
**Endpoint:** `GET /api/check-admin-session.php`

---

## 🎯 Frontend Integration

### Using API Config (Recommended)
```javascript
// api-config.js is loaded automatically
const products = await API.get(API.endpoints.products.getAll);
const cart = await API.get(API.endpoints.cart.get(userId));
const order = await API.post(API.endpoints.orders.create, orderData);
```

### Direct Fetch
```javascript
const response = await fetch('/api/get-products-v2.php?status=active', {
  credentials: 'include'
});
const data = await response.json();
```

---

## 🚀 Deployment Notes

### Environment Detection
- APIs automatically detect localhost vs production
- `config-local.php` handles environment-specific settings
- Localhost uses `/oneclick/api`, production uses `/api`

### CORS Headers
All APIs include proper CORS headers for cross-origin requests.

### Authentication
- Admin operations use `SUPABASE_SERVICE_ROLE_KEY`
- User operations use `SUPABASE_ANON_KEY`
- Sessions handled via PHP `$_SESSION`

### Error Handling
All APIs return consistent error format:
```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error (DEBUG_MODE only)"
}
```

---

## 📝 Database Tables (Supabase)

### Required Tables
- `products` - Product catalog
- `categories` - Product categories (optional, extracted from products)
- `orders` - Order records
- `order_items` - Order line items
- `cart_items` - Shopping cart
- `wishlist_items` - User wishlist
- `settings` - Application settings
- `users` - User accounts (Supabase Auth)

### Schema
See `/api/supabase-schema.sql` for complete database schema.

---

## 🔧 Configuration

### Supabase Credentials
Located in `/api/config-local.php`:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

### Feature Flags
```javascript
window.API_CONFIG.features = {
  useSupabaseProducts: true,
  useSupabaseAuth: true
};
```

---

**Last Updated:** November 2025
