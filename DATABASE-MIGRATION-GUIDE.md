# Database Migration - Quick Start Guide

## 🎯 Critical: Run This First

Your application needs two missing database tables to function properly:
- `addresses` - For user shipping/billing addresses
- `order_items` - For order line items

## 📋 Step-by-Step Instructions

### Step 1: Access Supabase Dashboard
1. Open your browser
2. Go to: https://supabase.com
3. Login to your account
4. Select your "One Click Computers" project

### Step 2: Open SQL Editor
1. In the left sidebar, click **"SQL Editor"**
2. Click **"New query"** button (top right)

### Step 3: Copy SQL Script
1. Open the file: `sql/create-missing-tables.sql`
2. Copy ALL contents (Ctrl+A, Ctrl+C)

### Step 4: Execute Migration
1. Paste the SQL into Supabase SQL Editor
2. Click **"Run"** button (or press Ctrl+Enter)
3. Wait for execution to complete

### Step 5: Verify Success
You should see success messages like:
```
CREATE TABLE
CREATE INDEX
CREATE POLICY
```

If you see errors, read them carefully and contact support.

### Step 6: Test Tables
Run these test queries to verify:

```sql
-- Test addresses table
SELECT * FROM addresses LIMIT 1;

-- Test order_items table  
SELECT * FROM order_items LIMIT 1;

-- Check orders table has new columns
SELECT 
  customer_name, 
  customer_email, 
  payment_method, 
  payment_status 
FROM orders 
LIMIT 1;
```

All queries should execute without errors (even if they return 0 rows).

## ✅ Expected Results

After successful migration:
- ✅ Users can save shipping addresses
- ✅ "My Account" page loads addresses
- ✅ Order history shows items
- ✅ Admin panel displays order details
- ✅ Checkout process works end-to-end

## ⚠️ Troubleshooting

### Error: "relation already exists"
**Solution:** Tables already created - IGNORE this error, it's safe.

### Error: "permission denied"
**Solution:** Make sure you're logged in as project owner.

### Error: "syntax error"
**Solution:** Copy the ENTIRE file - don't modify any SQL.

## 📞 Need Help?

If migration fails:
1. Take a screenshot of the error message
2. Copy the full error text
3. Check Supabase project logs
4. Verify your Supabase plan includes necessary features

## 🔄 Rollback (If Needed)

If you need to remove the tables:

```sql
-- DANGER: This deletes all address and order item data
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.addresses CASCADE;
```

Only run rollback if absolutely necessary!

## 📊 What Gets Created

### addresses table
- Stores user shipping/billing addresses
- Linked to user accounts
- Supports default address
- Full RLS security enabled

### order_items table  
- Stores individual products in each order
- Linked to orders table
- Includes price, quantity, product details
- Full RLS security enabled

### orders table updates
- Adds customer contact fields
- Adds address fields  
- Adds payment method/status
- Adds order notes

---

**Estimated time:** 2-3 minutes  
**Difficulty:** Easy (just copy & paste)  
**Risk:** Very Low (safe to run multiple times)

🎉 **Ready?** Go to Supabase SQL Editor and paste the script!
