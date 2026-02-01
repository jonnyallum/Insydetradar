import "dotenv/config";
import postgres from "postgres";

const sql_script = `
-- ============================================
-- INSYDETRADAR SUPABASE RLS POLICIES
-- ============================================

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

-- Helper Function: Get Internal User ID
CREATE OR REPLACE FUNCTION get_internal_user_id()
RETURNS uuid AS $$
  SELECT id FROM users WHERE open_id = auth.uid()::text
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- USERS
DROP POLICY IF EXISTS "Users view own profile" ON users;
CREATE POLICY "Users view own profile" ON users FOR SELECT TO authenticated USING (auth.uid()::text = open_id);
DROP POLICY IF EXISTS "Users update own profile" ON users;
CREATE POLICY "Users update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid()::text = open_id);

-- TRADING ACCOUNTS
DROP POLICY IF EXISTS "Users view own accounts" ON trading_accounts;
CREATE POLICY "Users view own accounts" ON trading_accounts FOR SELECT TO authenticated USING (user_id = get_internal_user_id());
DROP POLICY IF EXISTS "Users manage own accounts" ON trading_accounts;
CREATE POLICY "Users manage own accounts" ON trading_accounts FOR ALL TO authenticated USING (user_id = get_internal_user_id());

-- TRADES
DROP POLICY IF EXISTS "Users view own trades" ON trades;
CREATE POLICY "Users view own trades" ON trades FOR SELECT TO authenticated USING (user_id = get_internal_user_id());
DROP POLICY IF EXISTS "Users insert own trades" ON trades;
CREATE POLICY "Users insert own trades" ON trades FOR INSERT TO authenticated WITH CHECK (user_id = get_internal_user_id());

-- POSITIONS
DROP POLICY IF EXISTS "Users view own positions" ON positions;
CREATE POLICY "Users view own positions" ON positions FOR SELECT TO authenticated USING (user_id = get_internal_user_id());

-- MARKET DATA (Public to App)
DROP POLICY IF EXISTS "Reading market bars" ON market_bars;
CREATE POLICY "Reading market bars" ON market_bars FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Reading signals" ON trading_signals;
CREATE POLICY "Reading signals" ON trading_signals FOR SELECT TO authenticated USING (true);

-- WATCHLISTS & ALERTS
DROP POLICY IF EXISTS "Manage watchlists" ON watchlists;
CREATE POLICY "Manage watchlists" ON watchlists FOR ALL TO authenticated USING (user_id = get_internal_user_id());
DROP POLICY IF EXISTS "View alerts" ON risk_alerts;
CREATE POLICY "View alerts" ON risk_alerts FOR SELECT TO authenticated USING (user_id = get_internal_user_id());

-- STRATEGIES & NOTIFICATIONS
DROP POLICY IF EXISTS "View strategies" ON strategies;
CREATE POLICY "View strategies" ON strategies FOR SELECT TO authenticated USING (user_id = get_internal_user_id() OR is_public = true);
DROP POLICY IF EXISTS "View notifications" ON notifications;
CREATE POLICY "View notifications" ON notifications FOR SELECT TO authenticated USING (user_id = get_internal_user_id());
`;

async function applyRLS() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("❌ DATABASE_URL not found in .env");
        process.exit(1);
    }

    console.log("🚀 Connecting to Supabase and applying RLS policies...");

    const sql = postgres(dbUrl, { ssl: 'require' });

    try {
        // We execute the script in a transaction or as separate statements
        // Since some statements like CREATE POLICY cannot be run in a block easily with postgres.js 
        // without some care, we'll split them or just try running as one big string if the driver supports it.
        // Actually, CREATE POLICY and ALTER TABLE can be run in sequence.

        await sql.unsafe(sql_script);

        console.log("✅ RLS Policies applied successfully Operative.");
    } catch (error) {
        console.error("❌ Protocol Failure while applying RLS:");
        console.error(error);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

applyRLS();
