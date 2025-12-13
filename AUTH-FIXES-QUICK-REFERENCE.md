# 🔐 Authentication Fixes - Quick Reference

## Overview
Complete guide to all authentication-related fixes for the One Click Computers platform.

---

## 📋 Fix Index

### 1. "Database error granting user" - Trigger Fix ⭐ **MOST COMMON**
**File:** [DATABASE-ERROR-GRANTING-USER-FIX.md](DATABASE-ERROR-GRANTING-USER-FIX.md)  
**Script:** `sql/FIX-AUTH-TRIGGER.sql`

**Issue:** Broken `handle_new_user()` trigger crashes all login/signup attempts  
**Symptoms:**
- ❌ Users can't sign up
- ❌ Users can't log in
- ❌ Error: "Database error granting user"
- ❌ HTTP 500 from Supabase

**Quick Fix:**
```sql
-- Run in Supabase SQL Editor
-- Copy/paste entire file: sql/FIX-AUTH-TRIGGER.sql
```

---

### 2. "Database error granting user" - RLS Recursion
**File:** [FIX-USER-LOGIN-GUIDE.md](FIX-USER-LOGIN-GUIDE.md)  
**Script:** `sql/RLS-FINAL-FIX.sql`

**Issue:** RLS policies cause infinite recursion  
**Symptoms:**
- ❌ Only login fails (signup works)
- ❌ Only affects certain users
- ❌ Database timeout/crash

**Quick Fix:**
```sql
-- Run in Supabase SQL Editor
-- Copy/paste entire file: sql/RLS-FINAL-FIX.sql
```

---

### 3. Admin Dashboard 401 Errors
**File:** [ADMIN-401-FIX-COMPLETE.md](ADMIN-401-FIX-COMPLETE.md)  
**Scripts:** 
- `sql/SET-ADMIN-METADATA.sql`
- Modified: `admin/login.html`, `admin/index.html`, `api/admin-login-supabase.php`

**Issue:** Admin can't access orders/protected data  
**Symptoms:**
- ✅ Admin login works
- ❌ Dashboard shows 401 errors
- ❌ Orders don't load
- ❌ Products load slowly

**Quick Fix:**
```sql
-- 1. Run in Supabase SQL Editor
-- Copy/paste entire file: sql/SET-ADMIN-METADATA.sql

-- 2. Clear browser localStorage and login again
```

---

### 4. Complete Database Schema
**File:** `sql/COMPLETE-SCHEMA-FIXED-V2.sql`  
**Purpose:** Fresh database setup with all fixes included

**Includes:**
- ✅ Fixed `handle_new_user()` trigger
- ✅ Non-recursive RLS policies
- ✅ Admin metadata support
- ✅ All 16 tables for e-commerce
- ✅ Sample data

**Use When:**
- Setting up new database
- Resetting existing database
- Comprehensive update needed

---

## 🚀 Deployment Order

### For Existing Database (Incremental Fixes):

```bash
# Step 1: Fix authentication trigger (CRITICAL - Do this first!)
# Run: sql/FIX-AUTH-TRIGGER.sql in Supabase SQL Editor

# Step 2: Fix RLS recursion (if still seeing login errors)
# Run: sql/RLS-FINAL-FIX.sql in Supabase SQL Editor

# Step 3: Enable admin access (if admins getting 401)
# Run: sql/SET-ADMIN-METADATA.sql in Supabase SQL Editor

# Step 4: Test
# - Try signup: http://localhost/oneclick/register.html
# - Try login: http://localhost/oneclick/login.html
# - Try admin: http://localhost/oneclick/admin/login.html
```

### For Fresh Database (Complete Setup):

```bash
# One script does it all:
# Run: sql/COMPLETE-SCHEMA-FIXED-V2.sql in Supabase SQL Editor

# Then set admin metadata:
# Run: sql/SET-ADMIN-METADATA.sql in Supabase SQL Editor
```

---

## 🔍 Troubleshooting Decision Tree

```
❓ Getting "Database error granting user"?
│
├─❓ Does it happen on SIGNUP?
│  └─ ✅ YES → Fix #1: Broken Trigger
│     📄 DATABASE-ERROR-GRANTING-USER-FIX.md
│     🔧 sql/FIX-AUTH-TRIGGER.sql
│
├─❓ Does it happen on LOGIN ONLY?
│  └─ ✅ YES → Fix #2: RLS Recursion
│     📄 FIX-USER-LOGIN-GUIDE.md
│     🔧 sql/RLS-FINAL-FIX.sql
│
└─❓ Login works but getting 401 errors?
   └─ ✅ YES → Fix #3: Admin Access
      📄 ADMIN-401-FIX-COMPLETE.md
      🔧 sql/SET-ADMIN-METADATA.sql
```

---

## 📊 Error Messages Reference

| Error Message | Fix | Script |
|--------------|-----|--------|
| `Database error granting user` (signup fails) | #1 Trigger | `FIX-AUTH-TRIGGER.sql` |
| `Database error granting user` (login fails) | #2 RLS | `RLS-FINAL-FIX.sql` |
| `401 Unauthorized` on orders | #3 Admin | `SET-ADMIN-METADATA.sql` |
| Products load slowly | #3 Admin | `SET-ADMIN-METADATA.sql` |
| `infinite recursion detected` | #2 RLS | `RLS-FINAL-FIX.sql` |
| Request timeout (10s+) | Check DNS, increase timeouts | See ADMIN-401-FIX |

---

## 🧪 Verification Checklist

After applying fixes, verify:

### Customer Authentication:
- [ ] New user can sign up (`register.html`)
- [ ] Existing user can log in (`login.html`)
- [ ] User data appears in `public.users` table
- [ ] No "Database error granting user" in console
- [ ] No 500 errors in Network tab

### Admin Authentication:
- [ ] Admin can log in (`admin/login.html`)
- [ ] Dashboard loads without 401 errors
- [ ] Orders data loads successfully
- [ ] Products data loads successfully
- [ ] Console shows "Supabase session configured"

### Database Verification:
```sql
-- Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check function has SECURITY DEFINER
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'handle_new_user';

-- Check admin metadata
SELECT email, raw_user_meta_data->>'role' as role 
FROM auth.users 
WHERE email IN ('admin@oneclick.com', 'inboxtoisuru@gmail.com');

-- Check RLS policies
SELECT polname FROM pg_policy WHERE polrelid = 'public.users'::regclass;
```

---

## 🎯 Quick Command Reference

### Check Supabase Logs:
```
Supabase Dashboard → Database → Postgres Logs
```

### Run SQL Scripts:
```
Supabase Dashboard → SQL Editor → New Query → Paste → Run
```

### Clear Browser State:
```javascript
// DevTools Console (F12)
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Test Authentication:
```javascript
// Signup test
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'test123456'
});
console.log('Signup:', error || 'Success');

// Login test
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'test123456'
});
console.log('Login:', error || 'Success');
```

---

## 📁 File Structure

```
oneclick/
├── sql/
│   ├── FIX-AUTH-TRIGGER.sql          ⭐ Fix broken trigger
│   ├── RLS-FINAL-FIX.sql             🔄 Fix RLS recursion
│   ├── SET-ADMIN-METADATA.sql        👤 Enable admin access
│   └── COMPLETE-SCHEMA-FIXED-V2.sql  🗄️ Complete schema
├── admin/
│   ├── login.html                     (Modified for token storage)
│   └── index.html                     (Modified for session config)
├── api/
│   └── admin-login-supabase.php       (Modified to return tokens)
├── DATABASE-ERROR-GRANTING-USER-FIX.md    ⭐ Main fix guide
├── FIX-USER-LOGIN-GUIDE.md                🔄 RLS recursion guide
├── ADMIN-401-FIX-COMPLETE.md              👤 Admin access guide
└── AUTH-FIXES-QUICK-REFERENCE.md          📋 This file
```

---

## 🆘 Still Having Issues?

### 1. Check Supabase Project Logs
```
Dashboard → Database → Postgres Logs
```
Look for actual SQL error messages (not just "Database error granting user")

### 2. Verify Deployment
```sql
-- Check current state
SELECT 
  'Trigger' as type, 
  tgname as name, 
  tgenabled as enabled
FROM pg_trigger WHERE tgname = 'on_auth_user_created'
UNION ALL
SELECT 
  'Function' as type,
  proname as name,
  prosecdef::text as enabled
FROM pg_proc WHERE proname = 'handle_new_user';
```

### 3. Check Network Tab (DevTools)
- Request URL should be `https://pvnlavcuswjxhywbsodm.supabase.co/auth/v1/...`
- Response should be 200 (not 500)
- Response body should have `access_token` (not error message)

### 4. Check Console Logs
Look for specific error patterns:
- `Database error granting user` → Trigger issue
- `infinite recursion` → RLS issue  
- `401 Unauthorized` → Admin metadata issue
- `timeout` → Network/DNS issue

---

## 📞 Support Resources

- **Supabase Docs:** https://supabase.com/docs/guides/auth
- **RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security
- **Triggers Guide:** https://supabase.com/docs/guides/database/postgres/triggers

---

## ✅ Summary

| Issue | Fix Script | Time to Deploy |
|-------|-----------|----------------|
| Trigger broken | `FIX-AUTH-TRIGGER.sql` | 1 minute |
| RLS recursion | `RLS-FINAL-FIX.sql` | 1 minute |
| Admin 401s | `SET-ADMIN-METADATA.sql` | 1 minute |
| Fresh setup | `COMPLETE-SCHEMA-FIXED-V2.sql` | 5 minutes |

**Total Fix Time:** ~5 minutes for all issues

---

**Last Updated:** November 24, 2025  
**Status:** ✅ ALL FIXES VERIFIED WORKING  
**Tested On:** Supabase Project `pvnlavcuswjxhywbsodm`
