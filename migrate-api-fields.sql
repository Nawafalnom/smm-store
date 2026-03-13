-- ============================================
-- Migration: Add API integration fields
-- Run in Supabase SQL Editor
-- ============================================

-- Add api_service_id to services
ALTER TABLE services ADD COLUMN IF NOT EXISTS api_service_id INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS can_refill BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS can_cancel BOOLEAN DEFAULT false;

-- Add api fields to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS api_order_id TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS start_count INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS remains INTEGER DEFAULT 0;

-- Index for API order lookup
CREATE INDEX IF NOT EXISTS idx_orders_api ON orders(api_order_id);
CREATE INDEX IF NOT EXISTS idx_services_api ON services(api_service_id);
