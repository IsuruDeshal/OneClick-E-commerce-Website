# Pre-EC2 Deployment Checklist

## ✅ FIXED - Supabase Integration

### Product Management APIs
- ✅ **get-products-v2.php** - Fetches all products from Supabase
- ✅ **admin-save-product.php** - Saves/updates products to Supabase  
- ✅ **admin-delete-product.php** - Deletes products from Supabase
- ✅ **product-details.html** - Fixed to use get-products-v2.php

### Authentication
- ✅ **admin-login-supabase.php** - Admin login via Supabase Auth
- ✅ **user-login.php** - User login with Supabase database
- ✅ **user-register.php** - User registration to Supabase
- ✅ **check-user-session.php** - Session persistence
- ✅ **auth-check.js** - Auto-login verification

### Admin Dashboard
- ✅ **Edit Product** - Loads product data correctly
- ✅ **Auto-generate SKU** - From category selection
- ✅ **Delete Product** - Works with Supabase
- ✅ **Add Product** - Saves to Supabase

## 🔧 CONFIGURATION NEEDED FOR EC2

### 1. Update config-local.php
```php
// Change detection logic to:
$isLocalhost = (
    $_SERVER['SERVER_NAME'] === 'localhost' ||
    $_SERVER['SERVER_NAME'] === '127.0.0.1'
);
// EC2 IP 13.62.49.52 will use production config
```

### 2. Image Upload Path
- Current: `uploads/products/`
- Make sure this directory exists and is writable on EC2
- Command: `chmod 755 uploads/products`

### 3. Admin Whitelist Emails (admin-login-supabase.php)
Current whitelisted:
- admin@oneclick.com
- inboxtoisuru@gmail.com
- inboxtoisuru3@gmail.com

### 4. Session Configuration
- Uses `ONECLICK_SESSION` cookie name
- SameSite: Lax
- Secure: false (set to true if using HTTPS)

## 📋 TESTING BEFORE UPLOAD

### Test Locally:
1. ✅ Login as admin
2. ✅ Add new product
3. ✅ Edit existing product
4. ✅ Delete product
5. View product details page
6. Test user registration
7. Test user login
8. Test session persistence

### Test on EC2 After Upload:
1. Verify Supabase connection
2. Test admin login
3. Test product CRUD operations
4. Verify images upload
5. Check product display on frontend

## 🚀 DEPLOYMENT COMMANDS

```bash
# On EC2:
cd /var/www/html/oneclick-computers

# Set permissions
chmod 755 api/
chmod 755 uploads/products/

# Check PHP extensions
php -m | grep curl
php -m | grep json

# Restart Apache
sudo systemctl restart apache2
```

## ⚠️ IMPORTANT NOTES

1. All APIs now use Supabase - no local MySQL needed on EC2
2. Service role key is used for admin operations
3. Anon key is used for public reads
4. Make sure EC2 can reach Supabase (port 443 open)
5. Test from different browsers to verify session cookies work
