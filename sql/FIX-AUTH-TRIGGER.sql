-- ============================================
-- FIX AUTH TRIGGER - Run this in Supabase SQL Editor
-- ============================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Grant permissions
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO anon;

-- Recreate the fixed function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
   -- Try to insert/update user profile
   INSERT INTO public.users (
      id, 
      email, 
      full_name, 
      phone, 
      role, 
      email_verified,
      last_login,
      created_at,
      updated_at
   )
   VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
      NEW.email_confirmed_at IS NOT NULL,
      NEW.last_sign_in_at,
      NEW.created_at,
      NOW()
   )
   ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      email_verified = EXCLUDED.email_verified,
      last_login = COALESCE(NEW.last_sign_in_at, public.users.last_login),
      updated_at = NOW();
   
   RETURN NEW;

EXCEPTION WHEN OTHERS THEN
   -- Don't fail the auth operation, just log warning
   RAISE WARNING 'handle_new_user failed for user %: %', NEW.email, SQLERRM;
   RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
   AFTER INSERT OR UPDATE ON auth.users
   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Test by trying to login with existing user
-- This will trigger the function and should not fail
