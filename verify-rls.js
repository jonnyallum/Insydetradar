const postgres = require('postgres');
require('dotenv').config();

async function verifyRLS() {
    const url = process.env.DATABASE_URL;
    const sql = postgres(url, { ssl: 'require' });
    try {
        const policies = await sql`
            SELECT policyname, tablename, cmd 
            FROM pg_policies 
            WHERE schemaname = 'public'
            ORDER BY tablename, policyname;
        `;
        console.log('--- Applied RLS Policies ---');
        console.table(policies);

        const rlsStatus = await sql`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND rowsecurity = true;
        `;
        console.log('\n--- Tables with RLS Enabled ---');
        console.table(rlsStatus);

    } catch (err) {
        console.error('❌ VERIFICATION FAILED:', err.message);
    } finally {
        await sql.end();
    }
}

verifyRLS();
