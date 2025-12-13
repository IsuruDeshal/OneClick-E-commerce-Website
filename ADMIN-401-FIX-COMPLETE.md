# Admin Dashboard 401 Error - Complete Fix

## ⚠️ READ FIRST

**This fix addresses 401 errors in the admin dashboard.**

**If you're getting "Database error granting user" during login/signup**, see:
👉 **[DATABASE-ERROR-GRANTING-USER-FIX.md](DATABASE-ERROR-GRANTING-USER-FIX.md)** instead.

---

## Problem
Admin dashboard was getting **401 Unauthorized** errors when trying to load orders and other protected data from Supabase, despite successful authentication.

## Root Cause
1. **Admin login was not passing access tokens** to the frontend
2. **Admin dashboard was using anonymous Supabase key** instead of authenticated session
3. **Admin users didn't have `role='admin'` in user_metadata**, so RLS policies blocked access

## Solution Overview

### Files Modified
1. `api/admin-login-supabase.php` - Returns access/refresh tokens
2. `admin/login.html` - Stores tokens in localStorage
3. `admin/index.html` - Configures Supabase session with admin tokens
4. `sql/SET-ADMIN-METADATA.sql` - New script to set admin role in user metadata

---

## Changes Made

### 1. PHP Backend - Return Tokens
**File:** `api/admin-login-supabase.php`

Added `access_token` and `refresh_token` to login response:

```php
echo json_encode([
    'success' => true,
    'message' => 'Login successful',
    'user' => [
        'id' => $user['id'],
        'email' => $user['email'],
        'name' => 'Admin',
        'role' => 'admin'
    ],
    'access_token' => $authResult['access_token'],
    'refresh_token' => $authResult['refresh_token'] ?? null
]);
```

### 2. Login Page - Store Tokens
**File:** `admin/login.html`

Added token storage to localStorage:

```javascript
localStorage.setItem('admin_access_token', data.access_token || '');
localStorage.setItem('admin_refresh_token', data.refresh_token || '');
```

### 3. Admin Dashboard - Configure Session
**File:** `admin/index.html`

Modified `checkAdminAuth()` to set Supabase session:

```javascript
const accessToken = localStorage.getItem('admin_access_token');

if (accessToken && window.supabaseClient) {
  try {
    await window.supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: localStorage.getItem('admin_refresh_token') || ''
    });
    console.log('✅ Supabase session configured with admin token');
  } catch (err) {
    console.warn('⚠️ Failed to set Supabase session:', err);
  }
}
```

### 4. Database - Set Admin Metadata
**File:** `sql/SET-ADMIN-METADATA.sql` (NEW)

Updates admin users to include `role='admin'` in user_metadata:

```sql
UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN '{"role": "admin"}'::jsonb
    ELSE raw_user_meta_data || '{"role": "admin"}'::jsonb
  END
WHERE email = 'admin@oneclick.com';
```

---

## Deployment Steps

### Step 1: Update Admin Metadata in Supabase
1. Open Supabase SQL Editor
2. Run the script: `sql/SET-ADMIN-METADATA.sql`
3. Verify with the SELECT query at the end of the script
4. Confirm that `role` column shows `'admin'` for all admin users

### Step 2: Deploy Updated Files
```powershell
# Clear any cached admin sessions
Remove-Item "C:\xampp\htdocs\oneclick\admin\*.cache" -ErrorAction SilentlyContinue

# No need to restart Apache as these are frontend/PHP changes
```

### Step 3: Test the Fix
1. **Clear browser cache and localStorage:**
   - Open DevTools (F12)
   - Application → Storage → Clear site data
   
2. **Login to admin dashboard:**
   - Navigate to `http://localhost/oneclick/admin/login.html`
   - Login with admin credentials
   
3. **Verify in console:**
   ```
   ✅ Supabase session configured with admin token
   ✅ Admin authenticated
   ```
   
4. **Check orders load:**
   - Dashboard should show orders without 401 errors
   - Check DevTools Network tab - orders API should return 200

---

## How It Works

### Authentication Flow
```
1. User logs in → admin/login.html
2. PHP validates credentials → api/admin-login-supabase.php
3. Supabase Auth returns access_token
4. PHP passes tokens to frontend
5. Frontend stores tokens in localStorage
6. Dashboard loads → admin/index.html
7. checkAdminAuth() reads tokens
8. Configures supabaseClient.auth.setSession()
9. All Supabase queries now include authenticated JWT
10. JWT includes user_metadata.role = 'admin'
11. RLS policies check JWT and grant access
```

### RLS Policy Logic
**From:** `sql/COMPLETE-SCHEMA-FIXED-V2.sql`

```sql
CREATE POLICY orders_admin_select ON public.orders
   FOR SELECT USING (
      auth.role() = 'service_role' OR 
      (auth.jwt() ->> 'role')::text = 'admin' OR
      (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
   );
```

The policy allows access if:
- ✅ Request uses service_role key (backend PHP)
- ✅ JWT has `role='admin'` at root level
- ✅ JWT has `user_metadata.role='admin'` (OUR CASE)

---

## Verification Checklist

- [ ] Admin metadata updated in Supabase (`SET-ADMIN-METADATA.sql` executed)
- [ ] All three files deployed (PHP, login.html, index.html)
- [ ] Browser cache cleared
- [ ] localStorage cleared
- [ ] Admin login successful
- [ ] Console shows "Supabase session configured"
- [ ] Orders load without 401 errors
- [ ] Products load without 401 errors
- [ ] All dashboard sections accessible

---

## Troubleshooting

### Still Getting 401 Errors?

**Check 1: User Metadata**
```sql
-- Run in Supabase SQL Editor
SELECT email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'your-admin@email.com';
```
Should show: `{"role": "admin"}`

**Check 2: Token in Console**
```javascript
// In browser DevTools console
console.log(localStorage.getItem('admin_access_token'));
```
Should show a JWT token (not null)

**Check 3: Session Configured**
```javascript
// In browser DevTools console
window.supabaseClient.auth.getSession().then(console.log);
```
Should show session with access_token

**Check 4: JWT Decode**
- Copy access_token from localStorage
- Go to https://jwt.io
- Paste token
- Check if `user_metadata.role = 'admin'` exists

### Common Issues

**Issue:** "Supabase session configured" not appearing in console
- **Fix:** Check if `window.supabaseClient` is defined. Ensure `supabase-init.js` loaded.

**Issue:** Token stored but still 401
- **Fix:** User metadata not set. Run `SET-ADMIN-METADATA.sql` again and log out/in.

**Issue:** No access_token in localStorage
- **Fix:** Login again. Check if PHP returning token in response (Network tab).

---

## Related Files
- `sql/RLS-FINAL-FIX.sql` - RLS policy fixes
- `sql/COMPLETE-SCHEMA-FIXED-V2.sql` - Full schema with admin policies
- `assets/js/supabase-init.js` - Supabase client initialization
- `FIX-USER-LOGIN-GUIDE.md` - Customer login fixes

---

## Summary
The admin 401 errors were caused by the dashboard using the anonymous Supabase key instead of the authenticated admin's access token. The fix ensures:

1. ✅ Admin tokens are returned from PHP backend
2. ✅ Tokens are stored in localStorage
3. ✅ Supabase client is configured with admin session
4. ✅ Admin users have `role='admin'` in metadata
5. ✅ RLS policies grant access based on JWT claims

**Status:** ✅ COMPLETE - Ready to deploy
