-- ═══════════════════════════════════════
-- Migration: Auto-increment Order Number
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════

-- Add order_number column with auto-increment
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_number') THEN
    -- Create sequence
    CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq START 1;
    
    -- Add column with default from sequence
    ALTER TABLE orders ADD COLUMN order_number INTEGER DEFAULT nextval('orders_order_number_seq');
    
    -- Set existing orders' numbers based on creation date
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
      FROM orders
    )
    UPDATE orders SET order_number = numbered.rn
    FROM numbered WHERE orders.id = numbered.id;
    
    -- Update sequence to continue from the last number
    SELECT setval('orders_order_number_seq', COALESCE((SELECT MAX(order_number) FROM orders), 0) + 1);
    
    -- Make it unique and not null
    ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
  END IF;
END $$;
