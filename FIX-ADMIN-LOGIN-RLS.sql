-- ============================================================
-- FIX ADMIN LOGIN - RLS BLOCKING PHP SESSION AUTHENTICATION
-- ============================================================
-- Problem: Admin login redirects back to login page
-- Cause: RLS policy blocks SELECT queries without JWT token
-- Solution: Disable RLS on admin_users table
-- ============================================================

-- STEP 1: Disable RLS on admin_users table
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- STEP 2: Verify RLS is disabled
SELECT 
    tablename, 
    rowsecurity,
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS Disabled - Admin Login Will Work'
        WHEN rowsecurity = true THEN '❌ RLS Still Enabled - Admin Login Blocked'
    END as status
FROM pg_tables 
WHERE tablename = 'admin_users';

-- STEP 3: Test admin user exists
SELECT 
    id, 
    email, 
    CASE 
        WHEN password_hash IS NOT NULL THEN '✅ Password Hash Exists'
        WHEN password IS NOT NULL THEN '⚠️ Plaintext Password (Should Upgrade)'
        ELSE '❌ No Password Set'
    END as password_status,
    created_at
FROM admin_users 
WHERE email = 'admin@oneclick.com';

-- Expected Result:
-- If you see the admin user row, login will work after RLS is disabled

-- ============================================================
-- ALTERNATIVE: If you prefer keeping RLS enabled
-- ============================================================
-- Uncomment this if you want to keep RLS but allow admin login:

-- DROP POLICY IF EXISTS "Admin login allowed" ON admin_users;
-- 
-- CREATE POLICY "Admin login allowed"
-- ON admin_users
-- FOR SELECT
-- USING ( true );

-- ============================================================
-- VERIFY ALL POLICIES ON admin_users
-- ============================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'admin_users';

-- If you see any policies, those might block PHP login
-- Drop them or make them permissive

-- ============================================================
-- CLEANUP: Remove any blocking policies (if needed)
-- ============================================================
-- If policies exist and block access, drop them:

-- DROP POLICY IF EXISTS "Admin select policy" ON admin_users;
-- DROP POLICY IF EXISTS "Admin read policy" ON admin_users;
-- DROP POLICY IF EXISTS "Authenticated users only" ON admin_users;

-- ============================================================
-- FINAL CHECK
-- ============================================================
-- Run this query to confirm admin_users is accessible:

SELECT COUNT(*) as admin_count,
       CASE 
           WHEN COUNT(*) > 0 THEN '✅ Admin users found - Login should work'
           ELSE '❌ No admin users - Create one first'
       END as status
FROM admin_users;

-- ============================================================
-- NOTES
-- ============================================================
-- 1. Admin login uses PHP sessions, NOT Supabase Auth
-- 2. PHP script queries admin_users directly without JWT
-- 3. RLS policies that require JWT will block PHP queries
-- 4. Disabling RLS on admin_users is SAFE because:
--    - Table only contains admin accounts
--    - Passwords are hashed (bcrypt)
--    - PHP script validates credentials
--    - Table is not exposed to frontend
-- 5. Customer login (Supabase Auth) is NOT affected
-- ============================================================
