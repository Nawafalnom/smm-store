-- ============================================
-- SMM Panel - Full Database Setup
-- Run in Supabase SQL Editor
-- ============================================

-- Drop old tables if migrating
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS packages CASCADE;

-- ═══ PROFILES (extends auth.users) ═══
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  balance NUMERIC DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  level INTEGER DEFAULT 1,
  discount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- ═══ CATEGORIES ═══
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ SERVICES ═══
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  platform TEXT DEFAULT '',
  price_per_1000 NUMERIC NOT NULL DEFAULT 0,
  min_quantity INTEGER DEFAULT 10,
  max_quantity INTEGER DEFAULT 100000,
  speed TEXT DEFAULT 'فوري',
  guarantee_days INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

-- ═══ ORDERS ═══
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  link TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  api_order_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(created_at DESC);

-- ═══ RLS POLICIES ═══
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow insert profile on signup" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- Admin full access
CREATE POLICY "Admin full access profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- Categories: public read
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access categories" ON categories FOR ALL USING (true) WITH CHECK (true);

-- Services: public read active
CREATE POLICY "Public read active services" ON services FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access services" ON services FOR ALL USING (true) WITH CHECK (true);

-- Orders: users see own, can create
CREATE POLICY "Users view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin full access orders" ON orders FOR ALL USING (true) WITH CHECK (true);

-- ═══ AUTO-CREATE PROFILE ON SIGNUP ═══
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══ SAMPLE CATEGORIES ═══
INSERT INTO categories (name, sort_order) VALUES
  ('خصم لمدة 24 ساعة !!', 0),
  ('خدمات انستجرام', 1),
  ('خدمات فيسبوك', 2),
  ('خدمات تيك توك', 3),
  ('خدمات يوتيوب', 4),
  ('خدمات تويتر', 5),
  ('خدمات تيليجرام', 6),
  ('خدمات سناب شات', 7);
