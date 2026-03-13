-- ═══════════════════════════════════════════════════
-- Migration: Reseller API Keys + Affiliate System
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- ═══ 1. ADD API KEY TO PROFILES (for reseller API) ═══
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS api_enabled BOOLEAN DEFAULT false;

-- ═══ 2. ADD AFFILIATE FIELDS TO PROFILES ═══
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_earnings NUMERIC DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_rate NUMERIC DEFAULT 5; -- 5% commission

-- Generate referral codes for existing users who don't have one
UPDATE profiles SET referral_code = UPPER(SUBSTR(MD5(id::text || NOW()::text), 1, 8))
WHERE referral_code IS NULL;

-- Generate API keys for existing users who don't have one
UPDATE profiles SET api_key = ENCODE(GEN_RANDOM_BYTES(20), 'hex')
WHERE api_key IS NULL;

-- ═══ 3. REFERRAL TRACKING TABLE ═══
CREATE TABLE IF NOT EXISTS referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_amount NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 5,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'credited', -- credited, pending
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ref_commissions_referrer ON referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_ref_commissions_referred ON referral_commissions(referred_id);

-- RLS
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own commissions" ON referral_commissions FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "System insert commissions" ON referral_commissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin full access commissions" ON referral_commissions FOR ALL USING (true) WITH CHECK (true);

-- ═══ 4. AUTO-GENERATE REFERRAL CODE ON NEW USER ═══
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TRIGGER AS $fn$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTR(MD5(NEW.id::text || NOW()::text), 1, 8));
  END IF;
  IF NEW.api_key IS NULL THEN
    NEW.api_key := ENCODE(GEN_RANDOM_BYTES(20), 'hex');
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_generate_codes ON profiles;
CREATE TRIGGER on_profile_generate_codes
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- ═══ 5. AUTO COMMISSION ON ORDER (trigger) ═══
CREATE OR REPLACE FUNCTION process_referral_commission() RETURNS TRIGGER AS $fn$
DECLARE
  v_referrer_id UUID;
  v_commission_rate NUMERIC;
  v_commission NUMERIC;
BEGIN
  -- Only process completed orders (or new orders if you want instant commission)
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    -- Find the referrer
    SELECT referred_by, referral_rate INTO v_referrer_id, v_commission_rate
    FROM profiles WHERE id = NEW.user_id;
    
    IF v_referrer_id IS NOT NULL AND v_commission_rate > 0 THEN
      v_commission := ROUND((NEW.price * v_commission_rate / 100)::numeric, 4);
      
      IF v_commission > 0 THEN
        -- Record commission
        INSERT INTO referral_commissions (referrer_id, referred_id, order_id, order_amount, commission_rate, commission_amount)
        VALUES (v_referrer_id, NEW.user_id, NEW.id, NEW.price, v_commission_rate, v_commission);
        
        -- Add to referrer balance & earnings
        UPDATE profiles SET 
          balance = balance + v_commission,
          referral_earnings = referral_earnings + v_commission
        WHERE id = v_referrer_id;
        
        -- Notify admin
        INSERT INTO admin_notifications (type, title, message, metadata)
        VALUES ('referral_commission', 'عمولة إحالة', 
          'عمولة $' || v_commission || ' للمستخدم ' || v_referrer_id::text,
          jsonb_build_object('referrer_id', v_referrer_id, 'referred_id', NEW.user_id, 'commission', v_commission, 'order_id', NEW.id)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_referral_commission ON orders;
CREATE TRIGGER on_order_referral_commission
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION process_referral_commission();

-- ═══ 6. SUPPORT TICKETS — ensure proper structure ═══
-- (Table should already exist, but let's make sure)
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  admin_reply TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);

-- RLS for support tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admin full access tickets" ON support_tickets;
CREATE POLICY "Users view own tickets" ON support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create tickets" ON support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin full access tickets" ON support_tickets FOR ALL USING (true) WITH CHECK (true);

-- ═══ 7. API ORDERS LOG (track reseller API usage) ═══
CREATE TABLE IF NOT EXISTS api_orders_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  request_data JSONB DEFAULT '{}',
  response_data JSONB DEFAULT '{}',
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_log_user ON api_orders_log(user_id);
CREATE INDEX IF NOT EXISTS idx_api_log_date ON api_orders_log(created_at DESC);

ALTER TABLE api_orders_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access api_log" ON api_orders_log FOR ALL USING (true) WITH CHECK (true);
