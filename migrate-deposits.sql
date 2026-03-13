-- ═══════════════════════════════════════
-- Migration: Deposits & Payment System
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════

-- ═══ DEPOSITS TABLE ═══
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL, -- manual, usdt_trc20, usdt_erc20, binance_pay
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, expired
  transaction_id TEXT DEFAULT '', -- user-provided tx hash or reference
  proof_url TEXT DEFAULT '', -- screenshot proof (for manual)
  admin_note TEXT DEFAULT '',
  deposit_number INTEGER DEFAULT nextval('deposits_number_seq'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sequence for deposit numbers
CREATE SEQUENCE IF NOT EXISTS deposits_number_seq START 1;

CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_date ON deposits(created_at DESC);

-- ═══ RLS ═══
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own deposits" ON deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create deposits" ON deposits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin full access deposits" ON deposits FOR ALL USING (true) WITH CHECK (true);

-- ═══ NOTIFY ADMIN ON NEW DEPOSIT ═══
CREATE OR REPLACE FUNCTION notify_new_deposit() RETURNS TRIGGER AS $fn$
BEGIN
  INSERT INTO admin_notifications (type, title, message, metadata)
  VALUES (
    'new_deposit',
    'طلب شحن جديد',
    'طلب شحن $' || NEW.amount || ' عبر ' || NEW.method,
    jsonb_build_object('deposit_id', NEW.id, 'user_id', NEW.user_id, 'amount', NEW.amount, 'method', NEW.method)
  );
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_deposit ON deposits;
CREATE TRIGGER on_new_deposit
  AFTER INSERT ON deposits
  FOR EACH ROW EXECUTE FUNCTION notify_new_deposit();
