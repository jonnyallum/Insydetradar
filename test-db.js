const postgres = require('postgres');
require('dotenv').config();

async function testPooler() {
    const url = process.env.DATABASE_URL;
    console.log(`Testing Pooler: ${url?.replace(/:[^:@]+@/, ':****@')}`);

    if (!url) {
        console.error("DATABASE_URL not found");
        return;
    }

    const sql = postgres(url, { ssl: 'require', connect_timeout: 10 });
    try {
        const result = await sql`SELECT 1 as connected`;
        console.log('✅ DATABASE CONNECTED SUCCESSFULLY!');
        console.log('Result:', result);
    } catch (err) {
        console.error('❌ CONNECTION FAILED:', err.message);
    } finally {
        await sql.end();
    }
}

testPooler();
