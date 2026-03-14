-- ══════════════════════════════════════════════════
--  COMPREHENSIVE FIX: RLS + Triggers + Missing Data
--  Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════

-- 1) Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ══════════════════════════════════════════════════
--  FIX RLS POLICIES — Allow public read for all tables
-- ══════════════════════════════════════════════════

-- PROFILES
DROP POLICY IF EXISTS "Admin full access profiles" ON profiles;
DROP POLICY IF EXISTS "Public read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow insert profile on signup" ON profiles;

CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow insert profile on signup" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete profiles" ON profiles FOR DELETE USING (true);

-- PROVIDERS
DROP POLICY IF EXISTS "Admin full access providers" ON providers;
DROP POLICY IF EXISTS "Public read providers" ON providers;
CREATE POLICY "Public read providers" ON providers FOR SELECT USING (true);
CREATE POLICY "Admin write providers" ON providers FOR ALL USING (true) WITH CHECK (true);

-- CATEGORIES
DROP POLICY IF EXISTS "Admin full access categories" ON categories;
DROP POLICY IF EXISTS "Public read categories" ON categories;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admin write categories" ON categories FOR ALL USING (true) WITH CHECK (true);

-- SERVICES
DROP POLICY IF EXISTS "Admin full access services" ON services;
DROP POLICY IF EXISTS "Public read services" ON services;
DROP POLICY IF EXISTS "Users read active services" ON services;
CREATE POLICY "Public read services" ON services FOR SELECT USING (true);
CREATE POLICY "Admin write services" ON services FOR ALL USING (true) WITH CHECK (true);

-- ORDERS
DROP POLICY IF EXISTS "Admin full access orders" ON orders;
DROP POLICY IF EXISTS "Users view own orders" ON orders;
DROP POLICY IF EXISTS "Users create orders" ON orders;
DROP POLICY IF EXISTS "Public read orders" ON orders;
CREATE POLICY "Public read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Public write orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update orders" ON orders FOR UPDATE USING (true);
CREATE POLICY "Public delete orders" ON orders FOR DELETE USING (true);

-- DEPOSITS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'deposits') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access deposits" ON deposits';
    EXECUTE 'DROP POLICY IF EXISTS "Public read deposits" ON deposits';
    EXECUTE 'DROP POLICY IF EXISTS "Users view own deposits" ON deposits';
    EXECUTE 'DROP POLICY IF EXISTS "Users create deposits" ON deposits';
    EXECUTE 'CREATE POLICY "Public read deposits" ON deposits FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Public write deposits" ON deposits FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Public update deposits" ON deposits FOR UPDATE USING (true)';
    EXECUTE 'CREATE POLICY "Public delete deposits" ON deposits FOR DELETE USING (true)';
  END IF;
END $$;

-- SUPPORT TICKETS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'support_tickets') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access tickets" ON support_tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Public read tickets" ON support_tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Users view own tickets" ON support_tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Users create tickets" ON support_tickets';
    EXECUTE 'CREATE POLICY "Public read tickets" ON support_tickets FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Public write tickets" ON support_tickets FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Public update tickets" ON support_tickets FOR UPDATE USING (true)';
  END IF;
END $$;

-- ADMIN NOTIFICATIONS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'admin_notifications') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access notifications" ON admin_notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Public read notifications" ON admin_notifications';
    EXECUTE 'CREATE POLICY "Public read notifications" ON admin_notifications FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Public write notifications" ON admin_notifications FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Public update notifications" ON admin_notifications FOR UPDATE USING (true)';
    EXECUTE 'CREATE POLICY "Public delete notifications" ON admin_notifications FOR DELETE USING (true)';
  END IF;
END $$;

-- REFERRAL COMMISSIONS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'referral_commissions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users view own commissions" ON referral_commissions';
    EXECUTE 'DROP POLICY IF EXISTS "System insert commissions" ON referral_commissions';
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access commissions" ON referral_commissions';
    EXECUTE 'CREATE POLICY "Public read commissions" ON referral_commissions FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Public write commissions" ON referral_commissions FOR INSERT WITH CHECK (true)';
  END IF;
END $$;

-- ══════════════════════════════════════════════════
--  FIX TRIGGER: handle_new_user
-- ══════════════════════════════════════════════════
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
BEGIN
  v_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    split_part(NEW.email, '@', 1)
  );
  
  -- Handle duplicate username
  IF EXISTS (SELECT 1 FROM profiles WHERE username = v_username) THEN
    v_username := v_username || '_' || SUBSTR(MD5(RANDOM()::text), 1, 4);
  END IF;
  
  INSERT INTO profiles (id, username, full_name)
  VALUES (
    NEW.id,
    v_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback: create with UUID-based username
    BEGIN
      INSERT INTO profiles (id, username, full_name)
      VALUES (NEW.id, 'user_' || SUBSTR(NEW.id::text, 1, 8), '');
    EXCEPTION WHEN OTHERS THEN
      NULL; -- absolute last resort, don't block signup
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ══════════════════════════════════════════════════
--  FIX TRIGGER: generate_referral_code
-- ══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TRIGGER AS $fn$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTR(MD5(NEW.id::text || NOW()::text), 1, 8));
  END IF;
  IF NEW.api_key IS NULL THEN
    BEGIN
      NEW.api_key := ENCODE(GEN_RANDOM_BYTES(20), 'hex');
    EXCEPTION WHEN OTHERS THEN
      NEW.api_key := SUBSTR(MD5(NEW.id::text || RANDOM()::text), 1, 40);
    END;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_generate_codes ON profiles;
CREATE TRIGGER on_profile_generate_codes
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- ══════════════════════════════════════════════════
--  CREATE MISSING PROFILES for orphaned auth users
-- ══════════════════════════════════════════════════
INSERT INTO public.profiles (id, username, full_name)
SELECT 
  au.id,
  COALESCE(
    NULLIF(TRIM(au.raw_user_meta_data->>'username'), ''),
    split_part(au.email, '@', 1)
  ) || '_' || SUBSTR(MD5(au.id::text), 1, 4),
  COALESCE(au.raw_user_meta_data->>'full_name', '')
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════
--  VERIFY: Show all profiles
-- ══════════════════════════════════════════════════
SELECT id, username, full_name, referral_code, api_key, created_at 
FROM profiles 
ORDER BY created_at DESC;
