-- ============================================
-- INSYDETRADAR SUPABASE RLS POLICIES
-- ============================================
-- This script enables Row Level Security (RLS) and defines access policies
-- for all user-facing tables. 
-- Run this in the Supabase SQL Editor.

-- Enable RLS on all tables
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

-- --------------------------------------------
-- Helper Function: Get Internal User ID
-- --------------------------------------------
-- Maps Supabase auth.uid() to our internal users.id (UUID)
CREATE OR REPLACE FUNCTION get_internal_user_id()
RETURNS uuid AS $$
  SELECT id FROM users WHERE open_id = auth.uid()::text
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- --------------------------------------------
-- POLICIES: USERS
-- --------------------------------------------
CREATE POLICY "Users can view their own profile" 
ON users FOR SELECT 
TO authenticated 
USING (auth.uid()::text = open_id);

CREATE POLICY "Users can update their own profile" 
ON users FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = open_id);

-- --------------------------------------------
-- POLICIES: TRADING ACCOUNTS
-- --------------------------------------------
CREATE POLICY "Users can view their own accounts" 
ON trading_accounts FOR SELECT 
TO authenticated 
USING (user_id = get_internal_user_id());

CREATE POLICY "Users can manage their own accounts" 
ON trading_accounts FOR ALL 
TO authenticated 
USING (user_id = get_internal_user_id());

-- --------------------------------------------
-- POLICIES: TRADES
-- --------------------------------------------
CREATE POLICY "Users can view their own trades" 
ON trades FOR SELECT 
TO authenticated 
USING (user_id = get_internal_user_id());

CREATE POLICY "Users can insert their own trades" 
ON trades FOR INSERT 
TO authenticated 
WITH CHECK (user_id = get_internal_user_id());

-- --------------------------------------------
-- POLICIES: POSITIONS
-- --------------------------------------------
CREATE POLICY "Users can view their own positions" 
ON positions FOR SELECT 
TO authenticated 
USING (user_id = get_internal_user_id());

-- --------------------------------------------
-- POLICIES: MARKET BARS
-- --------------------------------------------
CREATE POLICY "All authenticated users can read market bars" 
ON market_bars FOR SELECT 
TO authenticated 
USING (true);

-- --------------------------------------------
-- POLICIES: TRADING SIGNALS
-- --------------------------------------------
CREATE POLICY "All authenticated users can read trading signals" 
ON trading_signals FOR SELECT 
TO authenticated 
USING (true);

-- --------------------------------------------
-- POLICIES: PORTFOLIO SNAPSHOTS
-- --------------------------------------------
CREATE POLICY "Users can view their own snapshots" 
ON portfolio_snapshots FOR SELECT 
TO authenticated 
USING (user_id = get_internal_user_id());

-- --------------------------------------------
-- POLICIES: AUDIT LOGS
-- --------------------------------------------
CREATE POLICY "Users can view their own audit logs" 
ON audit_logs FOR SELECT 
TO authenticated 
USING (user_id = get_internal_user_id());

-- --------------------------------------------
-- POLICIES: WATCHLISTS
-- --------------------------------------------
CREATE POLICY "Users can manage their own watchlists" 
ON watchlists FOR ALL 
TO authenticated 
USING (user_id = get_internal_user_id());

-- --------------------------------------------
-- POLICIES: RISK ALERTS
-- --------------------------------------------
CREATE POLICY "Users can view their own alerts" 
ON risk_alerts FOR SELECT 
TO authenticated 
USING (user_id = get_internal_user_id());

-- --------------------------------------------
-- POLICIES: STRATEGIES
-- --------------------------------------------
CREATE POLICY "Users can view their own or public strategies" 
ON strategies FOR SELECT 
TO authenticated 
USING (user_id = get_internal_user_id() OR is_public = true);

CREATE POLICY "Users can manage their own strategies" 
ON strategies FOR ALL 
TO authenticated 
USING (user_id = get_internal_user_id());

-- --------------------------------------------
-- POLICIES: NOTIFICATIONS
-- --------------------------------------------
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
TO authenticated 
USING (user_id = get_internal_user_id());

CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
TO authenticated 
USING (user_id = get_internal_user_id());

-- --------------------------------------------
-- ADMIN OVERRIDE (Optional but recommended)
-- --------------------------------------------
-- Uncomment the following if you want admins to see everything
/*
CREATE POLICY "Admins can view all users" ON users FOR SELECT TO authenticated 
USING ((SELECT role FROM users WHERE open_id = auth.uid()::text) = 'admin');
*/
