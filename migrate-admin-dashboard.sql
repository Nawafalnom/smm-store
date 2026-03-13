-- ============================================
-- Admin Dashboard Extensions
-- Run in Supabase SQL Editor
-- ============================================

-- ═══ SUPPORT TICKETS ═══
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
CREATE INDEX IF NOT EXISTS idx_tickets_date ON support_tickets(created_at DESC);

-- ═══ ADMIN NOTIFICATIONS ═══
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- new_order, new_user, failed_order, new_ticket, low_balance
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_date ON admin_notifications(created_at DESC);

-- ═══ RLS POLICIES ═══
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Tickets: users see own, can create own
CREATE POLICY "Users view own tickets" ON support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create tickets" ON support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin full access tickets" ON support_tickets FOR ALL USING (true) WITH CHECK (true);

-- Notifications: admin only (using anon key with full access for admin panel)
CREATE POLICY "Admin full access notifications" ON admin_notifications FOR ALL USING (true) WITH CHECK (true);

-- ═══ ADD start_count and remains to orders if missing ═══
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'start_count') THEN
    ALTER TABLE orders ADD COLUMN start_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'remains') THEN
    ALTER TABLE orders ADD COLUMN remains INTEGER DEFAULT 0;
  END IF;
END $$;

-- ═══ TRIGGER: Auto-create notification on new order ═══
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_notifications (type, title, message, metadata)
  VALUES (
    'new_order',
    'طلب جديد',
    'طلب جديد بقيمة $' || NEW.price || ' من المستخدم',
    jsonb_build_object('order_id', NEW.id, 'user_id', NEW.user_id, 'price', NEW.price)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_order ON orders;
CREATE TRIGGER on_new_order
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION notify_new_order();

-- ═══ TRIGGER: Auto-create notification on new user ═══
CREATE OR REPLACE FUNCTION notify_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_notifications (type, title, message, metadata)
  VALUES (
    'new_user',
    'مستخدم جديد',
    'انضم مستخدم جديد: ' || NEW.username,
    jsonb_build_object('user_id', NEW.id, 'username', NEW.username)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_profile ON profiles;
CREATE TRIGGER on_new_profile
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION notify_new_user();

-- ═══ TRIGGER: Notify on failed order ═══
CREATE OR REPLACE FUNCTION notify_failed_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'partial') AND OLD.status NOT IN ('cancelled', 'partial') THEN
    INSERT INTO admin_notifications (type, title, message, metadata)
    VALUES (
      'failed_order',
      'طلب فاشل',
      'الطلب #' || LEFT(NEW.id::text, 8) || ' تغيرت حالته إلى ' || NEW.status,
      jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_change ON orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION notify_failed_order();

-- ═══ TRIGGER: Notify on new ticket ═══
CREATE OR REPLACE FUNCTION notify_new_ticket()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_notifications (type, title, message, metadata)
  VALUES (
    'new_ticket',
    'تذكرة دعم جديدة',
    NEW.subject,
    jsonb_build_object('ticket_id', NEW.id, 'user_id', NEW.user_id, 'priority', NEW.priority)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_ticket ON support_tickets;
CREATE TRIGGER on_new_ticket
  AFTER INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION notify_new_ticket();
