-- ============================================
-- DISABLE EMAIL CONFIRMATION - MINIMAL VERSION
-- Run this in Supabase SQL Editor
-- ============================================

-- Verify all users (no email needed)
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

UPDATE public.users 
SET email_verified = true 
WHERE email_verified = false;

-- Done! Now go to Supabase Dashboard:
-- Authentication → Settings → Email Auth
-- Turn OFF "Enable email confirmations"
