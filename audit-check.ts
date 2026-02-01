import 'dotenv/config';
import { getDb } from './server/db';
import { auditLogs, trades, tradingSignals } from './drizzle/schema';

async function checkData() {
    try {
        const db = await getDb();
        if (!db) {
            console.error('DB unavailable');
            return;
        }

        const logCount = await db.query.auditLogs.findMany();
        const tradeCount = await db.query.trades.findMany();
        const signalCount = await db.query.tradingSignals.findMany();

        console.log('--- Insydetradar Tactical Audit ---');
        console.log(`Audit Logs: ${logCount.length}`);
        console.log(`Trades: ${tradeCount.length}`);
        console.log(`Signals: ${signalCount.length}`);

        if (logCount.length > 0) {
            console.log('\nLatest Logs:');
            logCount.slice(0, 5).forEach(log => {
                console.log(`[${log.category}] ${log.action} (${log.createdAt})`);
            });
        }
    } catch (err) {
        console.error('Audit failed:', err);
    }
}

checkData();
