-- ============================================
-- INSYDETRADAR SUPABASE RLS POLICIES
-- ============================================
-- Run this in the Supabase SQL Editor to secure your data.

-- 1. Enable RLS on all tactical tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. Map Supabase User to Internal Database User
-- This maps auth.uid() (Supabase) to users.id (Our UUID)
CREATE OR REPLACE FUNCTION get_internal_user_id()
RETURNS uuid AS $$
  SELECT id FROM users WHERE open_id = auth.uid()::text
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Define Policies (Owner-Only Access)

-- USERS
CREATE POLICY "Users view own profile" ON users FOR SELECT TO authenticated USING (auth.uid()::text = open_id);
CREATE POLICY "Users update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid()::text = open_id);

-- TRADING ACCOUNTS
CREATE POLICY "Users view own accounts" ON trading_accounts FOR SELECT TO authenticated USING (user_id = get_internal_user_id());
CREATE POLICY "Users manage own accounts" ON trading_accounts FOR ALL TO authenticated USING (user_id = get_internal_user_id());

-- TRADES
CREATE POLICY "Users view own trades" ON trades FOR SELECT TO authenticated USING (user_id = get_internal_user_id());
CREATE POLICY "Users insert own trades" ON trades FOR INSERT TO authenticated WITH CHECK (user_id = get_internal_user_id());

-- POSITIONS
CREATE POLICY "Users view own positions" ON positions FOR SELECT TO authenticated USING (user_id = get_internal_user_id());

-- MARKET DATA (Public to App)
CREATE POLICY "Reading market bars" ON market_bars FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reading signals" ON trading_signals FOR SELECT TO authenticated USING (true);

-- WATCHLISTS & ALERTS
CREATE POLICY "Manage watchlists" ON watchlists FOR ALL TO authenticated USING (user_id = get_internal_user_id());
CREATE POLICY "View alerts" ON risk_alerts FOR SELECT TO authenticated USING (user_id = get_internal_user_id());

-- STRATEGIES & NOTIFICATIONS
CREATE POLICY "View strategies" ON strategies FOR SELECT TO authenticated USING (user_id = get_internal_user_id() OR is_public = true);
CREATE POLICY "View notifications" ON notifications FOR SELECT TO authenticated USING (user_id = get_internal_user_id());
