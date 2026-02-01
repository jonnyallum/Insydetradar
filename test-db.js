const postgres = require('postgres');

const ref = 'kerqqobkiziadwtkpprx';
const pass = encodeURIComponent('Aprilia100!69');
const url = `postgresql://postgres.${ref}:${pass}@aws-0-eu-west-2.pooler.supabase.com:5432/postgres`;

async function test() {
    console.log('Testing connection to pooler...');
    const sql = postgres(url);
    try {
        const result = await sql`SELECT 1 as connected`;
        console.log('Connection successful:', result);
    } catch (err) {
        console.error('Connection failed:', err);
    } finally {
        await sql.end();
    }
}

test();
