-- ═══════════════════════════════════════
-- Migration: Bilingual Support (name_en)
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════

-- Add name_en to categories (stores original English name)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'name_en') THEN
    ALTER TABLE categories ADD COLUMN name_en TEXT DEFAULT '';
  END IF;
END $$;

-- Add name_en to services (stores original English name)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'name_en') THEN
    ALTER TABLE services ADD COLUMN name_en TEXT DEFAULT '';
  END IF;
END $$;
