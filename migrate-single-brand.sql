-- ============================================
-- Migration: Remove brand_slug columns
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop old indexes
DROP INDEX IF EXISTS idx_packages_brand;
DROP INDEX IF EXISTS idx_packages_active;
DROP INDEX IF EXISTS idx_orders_brand;

-- Remove brand_slug from packages
ALTER TABLE packages DROP COLUMN IF EXISTS brand_slug;

-- Remove brand_slug from orders
ALTER TABLE orders DROP COLUMN IF EXISTS brand_slug;

-- Recreate index for packages
CREATE INDEX IF NOT EXISTS idx_packages_active ON packages(is_active);
