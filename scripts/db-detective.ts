const postgres = require('postgres');

const ref = 'kerqqobkiziadwtkpprx';
const passWithDot = 'Aprilia100!69.';
const passWithoutDot = 'Aprilia100!69';
const hostIp = '18.135.253.94'; // London Pooler

async function detective() {
    const configs = [
        { port: 6543, user: `postgres.${ref}`, pass: passWithDot },
        { port: 6543, user: `postgres.${ref}`, pass: passWithoutDot },
        { port: 5432, user: `postgres.${ref}`, pass: passWithDot },
        { port: 5432, user: `postgres.${ref}`, pass: passWithoutDot },
        { port: 6543, user: `postgres`, pass: passWithDot },
        { port: 6543, user: `postgres`, pass: passWithoutDot },
        { port: 5432, user: `postgres`, pass: passWithDot },
        { port: 5432, user: `postgres`, pass: passWithoutDot },
    ];

    for (const config of configs) {
        console.log(`Trying IP:${hostIp} Port:${config.port} User:${config.user} Pass:${config.pass}`);
        const sql = postgres({
            host: hostIp,
            port: config.port,
            user: config.user,
            password: config.pass,
            database: 'postgres',
            ssl: 'require',
            connect_timeout: 5
        });

        try {
            const res = await sql`SELECT true as connected`;
            console.log('✅ SUCCESS!', res);
            process.exit(0);
        } catch (err) {
            console.log('❌ Failed:', err.message);
        } finally {
            await sql.end();
        }
    }
}

detective();
