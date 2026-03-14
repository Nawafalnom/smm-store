-- ═══ FIX: Database error saving new user ═══
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- 1) Make sure pgcrypto is enabled (needed for GEN_RANDOM_BYTES in generate_referral_code)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Update handle_new_user with proper error handling + duplicate username fix
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_suffix TEXT;
BEGIN
  -- Get username from metadata or email
  v_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    split_part(NEW.email, '@', 1)
  );
  
  -- If username already taken, append random suffix
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_suffix := SUBSTR(MD5(NEW.id::text || NOW()::text), 1, 4);
    v_username := v_username || '_' || v_suffix;
  END IF;
  
  -- Insert profile
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    v_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Last resort: use UUID prefix as username
    v_username := SUBSTR(NEW.id::text, 1, 8);
    INSERT INTO public.profiles (id, username, full_name)
    VALUES (
      NEW.id,
      v_username,
      COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log the error but don't block signup
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Safety: make sure generate_referral_code won't crash
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TRIGGER AS $fn$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTR(MD5(NEW.id::text || NOW()::text), 1, 8));
  END IF;
  IF NEW.api_key IS NULL THEN
    BEGIN
      NEW.api_key := ENCODE(GEN_RANDOM_BYTES(20), 'hex');
    EXCEPTION WHEN OTHERS THEN
      -- Fallback if pgcrypto not available
      NEW.api_key := SUBSTR(MD5(NEW.id::text || RANDOM()::text || NOW()::text), 1, 40);
    END;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

-- 5) Diagnostic: check if there are orphaned auth users without profiles
-- (these are users who failed signup — you can clean them from Supabase Auth dashboard)
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC
LIMIT 10;
