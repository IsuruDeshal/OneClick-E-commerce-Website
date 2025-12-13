# 🚀 Authentication Fix - Deployment Checklist

**Date:** November 24, 2025  
**Priority:** 🔴 CRITICAL  
**Time Required:** 5 minutes

---

## ⚡ Step-by-Step Deployment

### ✅ Step 1: Fix Authentication Trigger (1 min)
```
Fixes: "Database error granting user" on signup/login
```

1. Open Supabase Dashboard → Project `pvnlavcuswjxhywbsodm`
2. Go to **SQL Editor** → **New Query**
3. Copy/paste: `sql/FIX-AUTH-TRIGGER.sql`
4. Click **Run**
5. Verify: Should see `✅ Auth trigger fix applied successfully`

**Status:** [ ] Complete

---

### ✅ Step 2: Enable Admin Access (1 min)
```
Fixes: Admin 401 errors on dashboard
```

1. **SQL Editor** → **New Query**
2. Copy/paste: `sql/SET-ADMIN-METADATA.sql`
3. Click **Run**
4. Verify: All admin emails show `role = 'admin'`

**Status:** [ ] Complete

---

### ✅ Step 3: Test Customer Auth (2 min)
```
Verifies: Signup and login work
```

1. Clear browser cache (F12 → Application → Clear site data)
2. Test signup: `http://localhost/oneclick/register.html`
3. Test login: `http://localhost/oneclick/login.html`
4. Should NOT see: "Database error granting user"

**Status:** [ ] Complete

---

### ✅ Step 4: Test Admin Dashboard (1 min)
```
Verifies: Admin access works
```

1. Login: `http://localhost/oneclick/admin/login.html`
2. Check console: Should see `✅ Supabase session configured`
3. Verify: Orders and products load without 401 errors

**Status:** [ ] Complete

---

## 🔍 Quick Verification

Run in Supabase SQL Editor:

```sql
-- Check trigger
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- Expected: 1 row

-- Check function
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'handle_new_user';
-- Expected: prosecdef = true

-- Check admin metadata
SELECT email, raw_user_meta_data->>'role' as role 
FROM auth.users 
WHERE email = 'admin@oneclick.com';
-- Expected: role = 'admin'
```

---

## ✅ Success Criteria

- [ ] Trigger exists and enabled
- [ ] Function has SECURITY DEFINER
- [ ] Admin users have role='admin'
- [ ] Customer signup works
- [ ] Customer login works
- [ ] Admin login works
- [ ] No 401 errors in admin dashboard
- [ ] No errors in Supabase logs

---

## 🚨 If Issues Occur

**Temporarily disable trigger:**
```sql
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
```

**Check Supabase logs:**
```
Dashboard → Database → Postgres Logs
```

**Re-enable after fix:**
```sql
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
```

---

## 📁 Files Reference

**SQL Scripts:**
- `sql/FIX-AUTH-TRIGGER.sql` ⭐ Main fix
- `sql/SET-ADMIN-METADATA.sql` 👤 Admin access

**Documentation:**
- `DATABASE-ERROR-GRANTING-USER-FIX.md` 📖 Detailed guide
- `AUTH-FIXES-QUICK-REFERENCE.md` 📋 Quick reference

---

**Deployment Status:** ⏳ PENDING

**Deployed By:** _________________  
**Date:** _________________  
**Verified:** [ ]
