# 🗄️ Database Setup Guide

## 📋 What's Included

**COMPLETE-DATABASE-SETUP.sql** - Your single, production-ready SQL file containing:

### ✅ 14 Essential Tables
1. **users** - Customer accounts (synced with Supabase Auth)
2. **categories** - Product categories
3. **products** - Product catalog
4. **product_images** - Product photo gallery
5. **orders** - Customer orders
6. **order_items** - Items in each order
7. **user_carts** - Shopping cart
8. **addresses** - Shipping addresses
9. **product_reviews** - Customer reviews & ratings
10. **stock_movements** - Inventory audit log
11. **wishlists** - Save for later
12. **payments** - PayHere payment tracking
13. **coupons** - Discount codes (WELCOME10 included!)
14. **settings** - Store configuration

### 🔒 Security Features
- ✅ Row Level Security (RLS) on all tables
- ✅ `is_admin()` helper function
- ✅ Role-Based Access Control (RBAC)
- ✅ Fixed auth trigger (no more "Database error granting user")

### ⚡ Automatic Triggers
- ✅ Auth sync (creates user profile on signup)
- ✅ Order numbers (ORD-20241124-0001)
- ✅ Stock tracking (decrements on order)
- ✅ Product ratings (auto-calculates from reviews)
- ✅ Timestamps (auto-updates updated_at)

## 🚀 How to Deploy

### Step 1: Open Supabase
1. Go to https://supabase.com/dashboard
2. Select your project: `pvnlavcuswjxhywbsodm`
3. Click **SQL Editor** in left menu

### Step 2: Run the Script
1. Click **New Query**
2. Open `COMPLETE-DATABASE-SETUP.sql`
3. Copy **entire file** contents
4. Paste into SQL Editor
5. Click **Run** (or press `Ctrl+Enter`)

### Step 3: Verify Success
Look for the success message showing:
```
✅ ONE CLICK COMPUTERS DATABASE SETUP COMPLETE!
📊 Tables Created: 14
🔒 RLS Policies: XX
⚡ Triggers: XX
```

### Step 4: Test Admin Access
1. Go to your website
2. Your admin accounts are ready:
   - admin@oneclick.com
   - inboxtoisuru@gmail.com
   - inboxtoisuru3@gmail.com
3. **Important**: Log out and log back in to get new admin permissions
4. Go to `/admin/index.html` to access dashboard

## ⚙️ Configuration

### Admin Users
Edit line 513-515 in the SQL file to change admin emails:
```sql
WHERE email IN ('admin@oneclick.com', 'your-email@example.com');
```

### Sample Coupon
Line 506-508 creates a welcome coupon:
- Code: `WELCOME10`
- Discount: 10% off
- Min Purchase: LKR 10,000
- Valid: 30 days
- **Comment out if not needed**

### Settings
Pre-configured settings:
- `site_name`: One Click Computers
- `currency`: LKR
- `tax_rate`: 0
- `free_shipping_threshold`: 50000

## 🔧 Troubleshooting

### "Database error granting user"
✅ **Fixed!** The SQL file includes error handling in the auth trigger.

### RLS blocking queries
- Make sure admin users log out/in after running SQL
- Check `is_admin()` function is created
- Verify user role is set to 'admin' in both `auth.users` and `public.users`

### Tables already exist
The SQL uses `CREATE TABLE IF NOT EXISTS` - safe to run multiple times!

### Need to reset?
Uncomment line 14 to wipe everything:
```sql
DROP SCHEMA public CASCADE; CREATE SCHEMA public; ...
```

## 📊 Features by Table

| Table | Customer Access | Admin Access | Features |
|-------|----------------|--------------|----------|
| users | Own profile | All users | Auth sync, role management |
| products | Read active | Full CRUD | Ratings, stock, featured |
| categories | Read all | Full CRUD | Hierarchical support |
| orders | Own orders | All orders | Auto number, status tracking |
| carts | Own cart | N/A | Merge on login |
| wishlists | Own wishlist | N/A | Save for later |
| addresses | Own addresses | N/A | Default shipping |
| reviews | Read approved | Approve/delete | Star ratings |
| payments | Own payments | All payments | PayHere integration |
| coupons | Active only | Full CRUD | Percentage/fixed discounts |

## 🎉 What's Next?

1. ✅ Database setup complete
2. ⏭️ Add products via Admin Dashboard
3. ⏭️ Configure PayHere merchant ID
4. ⏭️ Upload product images to Supabase Storage
5. ⏭️ Test checkout flow
6. ⏭️ Launch! 🚀

## 📝 Notes

- File size: ~450 lines (much better than 1500!)
- Includes all features your project actually uses
- Production-ready with security & automation
- Safe to run multiple times (idempotent)
- Compatible with your existing frontend code

---

**Need help?** Check the main file comments or reach out!
