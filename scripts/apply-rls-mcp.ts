import { Client } from 'pg';

const script = `
-- INSYDETRADAR SUPABASE RLS POLICIES
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

CREATE OR REPLACE FUNCTION get_internal_user_id()
RETURNS uuid AS $$
  SELECT id FROM users WHERE open_id = auth.uid()::text
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Cleanup existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

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
`;

async function run() {
    // We use the direct IPv6 address we discovered via nslookup
    const client = new Client({
        host: '2a05:d01c:30c:9d02:6868:400e:b39f:686d',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: 'Aprilia100!69.',
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Connecting to Supabase (Direct IPv6)...');
        await client.connect();
        console.log('Connected! Applying script...');
        await client.query(script);
        console.log('✅ RLS Policies Applied Successfully.');
    } catch (err) {
        console.error('❌ Direct Connection Failed:', err.message);

        console.log('Trying Pooler (IPv4)...');
        const poolerClient = new Client({
            host: '18.135.253.94',
            port: 6543,
            database: 'postgres',
            user: 'postgres.kerqqobkiziadwtkpprx',
            password: 'Aprilia100!69.',
            ssl: {
                rejectUnauthorized: false
            }
        });

        try {
            await poolerClient.connect();
            console.log('Connected to Pooler! Applying script...');
            await poolerClient.query(script);
            console.log('✅ RLS Policies Applied Successfully via Pooler.');
        } catch (poolerErr) {
            console.error('❌ Pooler Connection Failed:', poolerErr.message);
        } finally {
            await poolerClient.end();
        }

    } finally {
        await client.end();
    }
}

run();
