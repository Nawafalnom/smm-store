-- ============================================
-- Migration: Multi-Provider Support
-- Run in Supabase SQL Editor
-- ============================================

-- ═══ PROVIDERS TABLE ═══
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access providers" ON providers FOR ALL USING (true) WITH CHECK (true);

-- ═══ Add provider_id to services ═══
ALTER TABLE services ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES providers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);
