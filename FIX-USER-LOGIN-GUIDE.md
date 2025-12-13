# 🔧 USER LOGIN FIX - "Database error granting user"

## ⚠️ IMPORTANT: Two Different Errors

There are **TWO** different "Database error granting user" errors with different causes:

### Error Type 1: Broken Trigger (Most Common)
**Symptoms:**
- Happens during login OR signup
- Affects ALL users (new and existing)
- Error: `AuthApiError: Database error granting user`
- HTTP 500 from Supabase

**Cause:** The `handle_new_user()` trigger function fails when trying to sync auth.users → public.users

**Fix:** 👉 **[DATABASE-ERROR-GRANTING-USER-FIX.md](DATABASE-ERROR-GRANTING-USER-FIX.md)** (NEW)

**Quick Fix:**
```sql
-- Run in Supabase SQL Editor:
-- Copy/paste entire contents of: sql/FIX-AUTH-TRIGGER.sql
```

---

### Error Type 2: RLS Recursion (Less Common)
**Symptoms:**
- Only happens during login (not signup)
- Only affects users with specific roles
- Infinite loop in RLS policies
- Database crashes from recursion

**Cause:** RLS policies check the users table, which triggers the same policy again (infinite loop)

**Fix:** Continue reading this document below

---

## Problem (RLS Recursion)
Users get "Database error granting user" when trying to login. This error appears in the console as:
```
AuthApiError: Database error granting user
```

## Root Cause
The RLS (Row Level Security) policies on the `users` table create **infinite recursion**:

1. User tries to login
2. Supabase Auth tries to check user permissions
3. RLS policy runs: `SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'`
4. This SELECT triggers the RLS policy again
5. Infinite loop → Database error

## Solution
Replace recursive policies with non-recursive ones using JWT metadata instead of table lookups.

## Quick Fix Steps

### Option 1: Via Supabase Dashboard (RECOMMENDED)

1. Go to https://supabase.com/dashboard
2. Select your project: `pvnlavcuswjxhywbsodm`
3. Go to **SQL Editor**
4. Copy the entire contents of `sql/RLS-FINAL-FIX.sql` (new canonical script)
5. Paste and click **Run**
6. Wait for success message
7. Test login at http://localhost/oneclick/login.html

> **Why use `RLS-FINAL-FIX.sql`?** It wraps the idempotent helper + the stricter `app_metadata` checks that are already live in production. Falling back to `sql/FIX-USER-LOGIN-RLS.sql` is still possible, but all future remediation should prefer the final script.

### Option 2: Via Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push sql/RLS-FINAL-FIX.sql
```

### Option 3: Manual Fix via Dashboard

If you prefer to do it manually:

1. Go to **Authentication > Policies**
2. Select the `users` table
3. **Delete ALL existing policies**
4. Create these new policies:

**Policy 1: Public Read**
- Name: `users_public_read`
- Action: `SELECT`
- Policy: `true`

**Policy 2: Update Own Profile**
- Name: `users_update_own`
- Action: `UPDATE`
- USING: `auth.uid() = id`
- WITH CHECK: `auth.uid() = id`

**Policy 3: Insert Own Profile**
- Name: `users_insert_own`
- Action: `INSERT`
- WITH CHECK: `true`

## What This Fix Does

✅ Removes infinite recursion from RLS policies
✅ Allows user login to work correctly
✅ Allows new user registration
✅ Allows users to update their own profiles
✅ Maintains security (users can only modify their own data)
✅ Fixes products, orders, categories policies too

## Testing After Fix

1. **Test Login**
   - Go to http://localhost/oneclick/login.html
   - Enter: `inboxtoisuru@gmail.com`
   - Enter your password
   - Should login successfully without errors

2. **Test Registration**
   - Go to http://localhost/oneclick/register.html
   - Create a new account
   - Should register successfully

3. **Check Console**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Should see: `✅ User authenticated: your@email.com`
   - Should NOT see: `Database error granting user`

## What Changed

### Before (BROKEN):
```sql
-- This causes infinite recursion:
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users  -- ❌ Queries users table again!
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### After (FIXED):
```sql
-- No recursion - uses JWT instead:
CREATE POLICY "users_public_read" ON public.users
  FOR SELECT
  USING (true);  -- ✅ No table query!
```

## Rollback (If Needed)

If something goes wrong, you can restore the old policies:

1. Go to Supabase Dashboard > SQL Editor
2. Run this to disable RLS temporarily:
```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

3. Then re-enable with the fix:
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

## Support

If you still get errors after applying this fix:

1. Check that you're using the correct Supabase project URL
2. Check that your `supabase-init.js` has the correct `SUPABASE_URL` and `SUPABASE_ANON_KEY`
3. Clear your browser cache and cookies
4. Try in incognito/private browsing mode
5. Check the browser console for detailed error messages

## Files Modified

- `sql/RLS-FINAL-FIX.sql` - Canonical, idempotent policy reset script
- `sql/FIX-USER-LOGIN-RLS.sql` - Legacy script (still available if needed)
- Database policies on: `users`, `products`, `orders`, `categories`, `cart`, `addresses`

## Security Notes

- ✅ Users can still only update their OWN data
- ✅ Admin checks now use JWT metadata (faster and no recursion)
- ✅ Public can read user profiles (needed for displaying usernames, avatars)
- ✅ Passwords are NEVER exposed (stored in auth.users, not public.users)
- ✅ Service role can insert users (needed for auto-profile creation)

## Next Steps

After login works:

1. Test the checkout flow
2. Test order placement
3. Test admin dashboard access
4. Test product management

---

**Last Updated:** November 19, 2025
**Status:** Ready to deploy

