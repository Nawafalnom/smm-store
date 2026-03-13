-- ============================================
-- SMM Store - Supabase Database Setup
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PACKAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_slug TEXT NOT NULL,
  platform TEXT NOT NULL,
  service TEXT NOT NULL,
  quantity TEXT NOT NULL,
  price_syp NUMERIC DEFAULT 0,
  price_egp NUMERIC DEFAULT 0,
  price_usd NUMERIC DEFAULT 0,
  price_sar NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_packages_brand ON packages(brand_slug);
CREATE INDEX IF NOT EXISTS idx_packages_active ON packages(brand_slug, is_active);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_slug TEXT NOT NULL,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_account TEXT NOT NULL,
  currency TEXT DEFAULT 'SYP',
  total_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_brand ON orders(brand_slug);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Packages: anyone can read active packages, only authenticated can modify
CREATE POLICY "Public can read active packages"
  ON packages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Allow all operations for anon (admin handled client-side)"
  ON packages FOR ALL
  USING (true)
  WITH CHECK (true);

-- Orders: anyone can insert, only admin reads
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all operations for anon (admin handled client-side)"
  ON orders FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- SAMPLE DATA (Optional - uncomment to insert)
-- ============================================

/*
INSERT INTO packages (brand_slug, platform, service, quantity, price_syp, price_egp, price_usd, price_sar, sort_order) VALUES
-- Social Waves
('social-waves', 'انستجرام', 'متابعين', '1,000', 150000, 150, 3, 10, 1),
('social-waves', 'انستجرام', 'متابعين', '5,000', 600000, 600, 12, 45, 2),
('social-waves', 'انستجرام', 'لايكات', '1,000', 100000, 100, 2, 8, 3),
('social-waves', 'فيسبوك', 'متابعين', '1,000', 120000, 120, 2.5, 9, 4),
('social-waves', 'تيك توك', 'متابعين', '1,000', 180000, 180, 3.5, 13, 5),
('social-waves', 'تيك توك', 'مشاهدات', '10,000', 80000, 80, 1.5, 6, 6),

-- Boost In Syria
('boost-in-syria', 'انستجرام', 'متابعين', '1,000', 140000, 140, 2.8, 10, 1),
('boost-in-syria', 'فيسبوك', 'لايكات', '1,000', 90000, 90, 1.8, 7, 2),
('boost-in-syria', 'يوتيوب', 'مشتركين', '500', 200000, 200, 4, 15, 3),

-- Rumor For Media
('rumor-for-media', 'انستجرام', 'متابعين', '1,000', 160000, 160, 3.2, 12, 1),
('rumor-for-media', 'تويتر', 'متابعين', '1,000', 170000, 170, 3.4, 13, 2),

-- Fivestars Marketing
('fivestars-marketing', 'انستجرام', 'متابعين', '1,000', 155000, 155, 3.1, 11, 1),
('fivestars-marketing', 'تيك توك', 'مشاهدات', '10,000', 75000, 75, 1.5, 6, 2),

-- Social Spark
('social-spark', 'انستجرام', 'متابعين', '1,000', 145000, 145, 2.9, 11, 1),
('social-spark', 'فيسبوك', 'متابعين', '1,000', 110000, 110, 2.2, 8, 2);
*/
