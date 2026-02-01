import 'dotenv/config';
import { getDb } from './server/db';
import { trades, portfolioSnapshots } from './drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';

async function generatePerformanceReport() {
    console.log('--- Insydetradar Tactical Performance Report ---');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('------------------------------------------------');

    try {
        const db = await getDb();
        if (!db) {
            console.error('❌ Database unavailable');
            return;
        }

        // 1. Trade Statistics
        const allTrades = await db.query.trades.findMany();
        const closedTrades = allTrades.filter(t => t.status === 'filled' && t.realizedPnl !== null);

        const totalTrades = closedTrades.length;
        const winningTrades = closedTrades.filter(t => parseFloat(t.realizedPnl || '0') > 0).length;
        const losingTrades = totalTrades - winningTrades;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

        const totalRealizedPnl = closedTrades.reduce((sum, t) => sum + parseFloat(t.realizedPnl || '0'), 0);

        console.log('\n[TRADE METRICS]');
        console.log(`Total Closed Trades: ${totalTrades}`);
        console.log(`Win Rate: ${winRate.toFixed(2)}%`);
        console.log(`Winners: ${winningTrades}`);
        console.log(`Losers: ${losingTrades}`);
        console.log(`Total Realized P&L: $${totalRealizedPnl.toFixed(2)}`);

        // 2. Portfolio Health
        const latestSnapshots = await db.query.portfolioSnapshots.findMany({
            orderBy: desc(portfolioSnapshots.snapshotDate),
            limit: 2
        });

        if (latestSnapshots.length > 0) {
            const current = latestSnapshots[0];
            const previous = latestSnapshots[1];

            console.log('\n[PORTFOLIO HEALTH]');
            console.log(`Current Equity: $${parseFloat(current.equity).toFixed(2)}`);
            console.log(`Available Cash: $${parseFloat(current.cash).toFixed(2)}`);

            if (previous) {
                const change = parseFloat(current.equity) - parseFloat(previous.equity);
                const pctChange = (change / parseFloat(previous.equity)) * 100;
                console.log(`24h Delta: $${change.toFixed(2)} (${pctChange.toFixed(2)}%)`);
            }
        } else {
            console.log('\n[PORTFOLIO HEALTH] No snapshots recorded yet.');
        }

        // 3. Asset Exposure
        const activeTrades = allTrades.filter(t => t.status === 'filled' && t.realizedPnl === null);
        const symbols = [...new Set(activeTrades.map(t => t.symbol))];

        console.log('\n[ACTIVE EXPOSURE]');
        if (symbols.length > 0) {
            console.log(`Symbols: ${symbols.join(', ')}`);
        } else {
            console.log('No active tactical exposure.');
        }

    } catch (err) {
        console.error('❌ Report generation failed:', err);
    }

    console.log('\n------------------------------------------------');
}

generatePerformanceReport();
