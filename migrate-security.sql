-- ═══ Atomic Balance Deduction (prevents race conditions) ═══
CREATE OR REPLACE FUNCTION deduct_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  -- Lock the row and get current balance
  SELECT balance INTO v_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
  
  IF v_balance IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF v_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  UPDATE profiles SET 
    balance = balance - p_amount,
    total_spent = total_spent + p_amount
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
