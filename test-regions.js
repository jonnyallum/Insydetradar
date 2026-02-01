const postgres = require('postgres');

const ref = 'kerqqobkiziadwtkpprx';
const pass = 'Aprilia100!69.';
const regions = ['eu-west-2', 'us-east-1', 'us-west-2', 'ap-southeast-1'];

async function testRegions() {
    for (const region of regions) {
        const url = `postgresql://postgres.${ref}:${pass}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
        console.log(`Testing ${region}...`);
        const sql = postgres(url, { connect_timeout: 5 });
        try {
            const result = await sql`SELECT 1 as connected`;
            console.log(`✅ Success in ${region}:`, result);
            process.exit(0);
        } catch (err) {
            console.log(`❌ Failed in ${region}:`, err.message);
        } finally {
            await sql.end();
        }
    }
}

testRegions();
