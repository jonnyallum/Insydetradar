import { Client } from 'pg';

const ref = 'kerqqobkiziadwtkpprx';
const pass = 'Aprilia100!69.';
const host = '18.135.253.94';

async function scan() {
    const users = [
        `postgres.${ref}`,
        `${ref}`,
        `postgres`,
        `${ref}.postgres`
    ];
    const ports = [6543, 5432];

    for (const port of ports) {
        for (const user of users) {
            console.log(`Connecting Port:${port} User:${user}...`);
            const client = new Client({
                host, port, user, password: pass,
                database: 'postgres',
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 5000
            });

            try {
                await client.connect();
                console.log(`✅ SUCCESS! Port:${port} User:${user}`);
                await client.end();
                process.exit(0);
            } catch (err) {
                console.log(`❌ Failed: ${err.message}`);
            } finally {
                try { await client.end(); } catch { }
            }
        }
    }
}

scan();
