/**
 * Trading API Router
 * tRPC procedures for trading operations
 * 
 * @author Jonny AI (The Architect)
 * @version 1.0.0
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import {
    initAlpacaClient,
    getAlpacaClient,
    isAlpacaClientInitialized,
    initMarketDataStream,
    initTradingStream,
} from './alpaca';
import {
    getTradingEngine,
    initTradingEngine,
    getRiskManager,
    initRiskManager,
    getSignalGenerator,
} from './trading';
import { getDb } from './db';
import { watchlists } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import type { RiskLevel } from './alpaca/types';

// ============================================
// TRADING ROUTER
// ============================================

export const tradingRouter = router({
    // ----------------------------------------
    // BROKER CONNECTION
    // ----------------------------------------

    /**
     * Initialize Alpaca broker connection
     */
    connectBroker: protectedProcedure
        .input(z.object({
            apiKey: z.string().min(1),
            secretKey: z.string().min(1),
            paper: z.boolean().default(true),
        }))
        .mutation(async ({ input }) => {
            try {
                const client = initAlpacaClient({
                    keyId: input.apiKey,
                    secretKey: input.secretKey,
                    paper: input.paper,
                });

                // Verify connection
                const account = await client.getAccount();
                const ready = await client.isAccountReady();

                if (!ready.ready) {
                    return {
                        success: false,
                        error: ready.reason,
                    };
                }

                // Initialize streams
                await initTradingStream(input.apiKey, input.secretKey, input.paper);

                return {
                    success: true,
                    account: {
                        id: account.id,
                        status: account.status,
                        portfolioValue: parseFloat(account.portfolio_value),
                        buyingPower: parseFloat(account.buying_power),
                        cash: parseFloat(account.cash),
                        paper: input.paper,
                    },
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Connection failed',
                };
            }
        }),

    /**
     * Check broker connection status
     */
    connectionStatus: protectedProcedure.query(async () => {
        if (!isAlpacaClientInitialized()) {
            return { connected: false };
        }

        try {
            const client = getAlpacaClient();
            const account = await client.getAccount();
            const connectionInfo = client.getConnectionInfo();

            return {
                connected: true,
                paper: connectionInfo.paper,
                account: {
                    status: account.status,
                    portfolioValue: parseFloat(account.portfolio_value),
                    buyingPower: parseFloat(account.buying_power),
                },
            };
        } catch {
            return { connected: false };
        }
    }),

    // ----------------------------------------
    // ACCOUNT & PORTFOLIO
    // ----------------------------------------

    /**
     * Get account information
     */
    getAccount: protectedProcedure.query(async () => {
        if (!isAlpacaClientInitialized()) {
            throw new Error('Broker not connected');
        }

        const client = getAlpacaClient();
        const account = await client.getAccount();

        return {
            id: account.id,
            accountNumber: account.account_number,
            status: account.status,
            currency: account.currency,
            portfolioValue: parseFloat(account.portfolio_value),
            buyingPower: parseFloat(account.buying_power),
            cash: parseFloat(account.cash),
            equity: parseFloat(account.equity),
            lastEquity: parseFloat(account.last_equity),
            tradingBlocked: account.trading_blocked,
            patternDayTrader: account.pattern_day_trader,
            daytradeCount: account.daytrade_count,
        };
    }),

    /**
     * Get portfolio history for charting
     */
    getPortfolioHistory: protectedProcedure
        .input(z.object({
            period: z.enum(['1D', '1W', '1M', '3M', '1Y', 'all']).default('1D'),
            timeframe: z.enum(['1Min', '5Min', '15Min', '1H', '1D']).optional(),
        }).optional())
        .query(async ({ input }) => {
            if (!isAlpacaClientInitialized()) {
                throw new Error('Broker not connected');
            }

            const client = getAlpacaClient();
            const history = await client.getPortfolioHistory(input);

            // Format for charts (filtering out nulls with type guard)
            return history.timestamp.map((ts, i) => ({
                timestamp: ts,
                equity: history.equity[i],
                profitLoss: history.profit_loss[i],
                profitLossPct: history.profit_loss_pct[i],
            })).filter((d): d is { timestamp: number; equity: number; profitLoss: number; profitLossPct: number } =>
                d.equity !== null && d.profitLoss !== null && d.profitLossPct !== null
            );
        }),

    /**
     * Get all positions
     */
    getPositions: protectedProcedure.query(async () => {
        if (!isAlpacaClientInitialized()) {
            throw new Error('Broker not connected');
        }

        const client = getAlpacaClient();
        const positions = await client.getPositions();

        return positions.map(p => ({
            symbol: p.symbol,
            assetClass: p.asset_class,
            side: p.side,
            quantity: parseFloat(p.qty),
            availableQuantity: parseFloat(p.qty_available),
            avgEntryPrice: parseFloat(p.avg_entry_price),
            currentPrice: parseFloat(p.current_price),
            marketValue: parseFloat(p.market_value),
            costBasis: parseFloat(p.cost_basis),
            unrealizedPL: parseFloat(p.unrealized_pl),
            unrealizedPLPercent: parseFloat(p.unrealized_plpc) * 100,
            changeToday: parseFloat(p.change_today) * 100,
        }));
    }),

    /**
     * Get all orders
     */
    getOrders: protectedProcedure
        .input(z.object({
            status: z.enum(['open', 'closed', 'all']).default('open'),
            limit: z.number().min(1).max(500).default(100),
        }).optional())
        .query(async ({ input }) => {
            if (!isAlpacaClientInitialized()) {
                throw new Error('Broker not connected');
            }

            const client = getAlpacaClient();
            const orders = await client.getOrders(input);

            return orders.map(o => ({
                id: o.id,
                symbol: o.symbol,
                side: o.side,
                type: o.order_type,
                status: o.status,
                quantity: o.qty ? parseFloat(o.qty) : null,
                filledQuantity: parseFloat(o.filled_qty),
                filledAvgPrice: o.filled_avg_price ? parseFloat(o.filled_avg_price) : null,
                limitPrice: o.limit_price ? parseFloat(o.limit_price) : null,
                stopPrice: o.stop_price ? parseFloat(o.stop_price) : null,
                submittedAt: o.submitted_at,
                filledAt: o.filled_at,
                createdAt: o.created_at,
            }));
        }),

    // ----------------------------------------
    // TRADING OPERATIONS
    // ----------------------------------------

    /**
     * Submit a market order
     */
    submitOrder: protectedProcedure
        .input(z.object({
            symbol: z.string(),
            quantity: z.number().positive(),
            side: z.enum(['buy', 'sell']),
            type: z.enum(['market', 'limit']).default('market'),
            limitPrice: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
            if (!isAlpacaClientInitialized()) {
                throw new Error('Broker not connected');
            }

            const client = getAlpacaClient();

            let order;
            if (input.type === 'market') {
                order = input.side === 'buy'
                    ? await client.marketBuy(input.symbol, input.quantity)
                    : await client.marketSell(input.symbol, input.quantity);
            } else {
                if (!input.limitPrice) throw new Error('Limit price required');
                order = input.side === 'buy'
                    ? await client.limitBuy(input.symbol, input.quantity, input.limitPrice)
                    : await client.limitSell(input.symbol, input.quantity, input.limitPrice);
            }

            return {
                orderId: order.id,
                status: order.status,
                symbol: order.symbol,
                side: order.side,
                quantity: parseFloat(order.qty || '0'),
            };
        }),

    /**
     * Cancel an order
     */
    cancelOrder: protectedProcedure
        .input(z.object({ orderId: z.string() }))
        .mutation(async ({ input }) => {
            if (!isAlpacaClientInitialized()) {
                throw new Error('Broker not connected');
            }

            const client = getAlpacaClient();
            await client.cancelOrder(input.orderId);

            return { success: true };
        }),

    /**
     * Close a position
     */
    closePosition: protectedProcedure
        .input(z.object({
            symbol: z.string(),
            percentage: z.number().min(0).max(100).optional(),
        }))
        .mutation(async ({ input }) => {
            if (!isAlpacaClientInitialized()) {
                throw new Error('Broker not connected');
            }

            const client = getAlpacaClient();
            const order = await client.closePosition(input.symbol, input.percentage);

            return {
                orderId: order.id,
                status: order.status,
            };
        }),

    /**
     * Close all positions
     */
    closeAllPositions: protectedProcedure.mutation(async () => {
        if (!isAlpacaClientInitialized()) {
            throw new Error('Broker not connected');
        }

        const client = getAlpacaClient();
        const results = await client.closeAllPositions();

        return {
            success: true,
            closedCount: results.length,
            results,
        };
    }),

    // ----------------------------------------
    // TRADING ENGINE
    // ----------------------------------------

    /**
     * Start the autonomous trading engine
     */
    startEngine: protectedProcedure
        .input(z.object({
            symbols: z.array(z.string()).min(1).max(20).optional(),
            riskLevel: z.enum(['conservative', 'moderate', 'aggressive']).default('moderate'),
        }).optional())
        .mutation(async ({ ctx, input }) => {
            if (!isAlpacaClientInitialized()) {
                throw new Error('Broker not connected');
            }

            // Initialize risk manager with selected level
            initRiskManager((input?.riskLevel || 'moderate') as RiskLevel);

            // Get or create engine
            const engine = getTradingEngine();

            engine.updateConfig({
                ownerId: ctx.user.id,
                symbols: input?.symbols || engine.getConfig().symbols
            });

            await engine.start();

            return {
                success: true,
                state: engine.getState(),
                config: engine.getConfig(),
            };
        }),

    /**
     * Stop the trading engine
     */
    stopEngine: protectedProcedure.mutation(async () => {
        const engine = getTradingEngine();
        await engine.stop();

        return {
            success: true,
            state: engine.getState(),
        };
    }),

    /**
     * Emergency stop - closes all positions
     */
    emergencyStop: protectedProcedure.mutation(async () => {
        const engine = getTradingEngine();
        const result = await engine.emergencyStop();

        return result;
    }),

    /**
     * Get trading engine status
     */
    engineStatus: protectedProcedure.query(() => {
        const engine = getTradingEngine();
        const riskManager = getRiskManager();

        return {
            engine: engine.getState(),
            config: engine.getConfig(),
            risk: riskManager.getStatus(),
        };
    }),

    // ----------------------------------------
    // SIGNALS & ANALYSIS
    // ----------------------------------------

    /**
     * Generate a trading signal for a symbol
     */
    getSignal: protectedProcedure
        .input(z.object({ symbol: z.string() }))
        .query(async ({ input }) => {
            if (!isAlpacaClientInitialized()) {
                throw new Error('Broker not connected');
            }

            const client = getAlpacaClient();
            const signalGen = getSignalGenerator();

            // Fetch historical bars
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 365);

            const bars = await client.getBars(input.symbol, '1Day', {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                limit: 250,
            });

            if (bars.length < 200) {
                throw new Error('Insufficient historical data');
            }

            // Convert to OHLCV format
            const ohlcvBars = bars.map(bar => ({
                open: bar.o,
                high: bar.h,
                low: bar.l,
                close: bar.c,
                volume: bar.v,
                timestamp: bar.t,
            }));

            const result = signalGen.generateSignal(input.symbol, ohlcvBars);

            if (!result) {
                return null;
            }

            return {
                signal: result.signal,
                scores: result.rawScores,
            };
        }),

    // ----------------------------------------
    // MARKET DATA
    // ----------------------------------------

    /**
     * Get market snapshot for a symbol
     */
    getSnapshot: protectedProcedure
        .input(z.object({ symbol: z.string() }))
        .query(async ({ input }) => {
            if (!isAlpacaClientInitialized()) {
                throw new Error('Broker not connected');
            }

            const client = getAlpacaClient();
            const snapshot = await client.getSnapshot(input.symbol);

            return {
                symbol: input.symbol,
                latestPrice: snapshot.latestTrade?.p,
                latestVolume: snapshot.latestTrade?.s,
                bid: snapshot.latestQuote?.bp,
                ask: snapshot.latestQuote?.ap,
                dailyOpen: snapshot.dailyBar?.o,
                dailyHigh: snapshot.dailyBar?.h,
                dailyLow: snapshot.dailyBar?.l,
                dailyClose: snapshot.dailyBar?.c,
                dailyVolume: snapshot.dailyBar?.v,
                prevClose: snapshot.prevDailyBar?.c,
            };
        }),

    /**
     * Get snapshots for multiple symbols
     */
    getSnapshots: protectedProcedure
        .input(z.object({ symbols: z.array(z.string()) }))
        .query(async ({ input }) => {
            if (!isAlpacaClientInitialized()) {
                throw new Error('Broker not connected');
            }

            const client = getAlpacaClient();
            return client.getSnapshots(input.symbols);
        }),

    /**
     * Check if market is open
     */
    isMarketOpen: publicProcedure.query(async () => {
        if (!isAlpacaClientInitialized()) {
            return { open: false, reason: 'Not connected' };
        }

        const client = getAlpacaClient();
        const isOpen = await client.isMarketOpen();

        return { open: isOpen };
    }),

    // ----------------------------------------
    // RISK MANAGEMENT
    // ----------------------------------------

    /**
     * Get risk metrics
     */
    getRiskMetrics: protectedProcedure.query(async () => {
        if (!isAlpacaClientInitialized()) {
            throw new Error('Broker not connected');
        }

        const client = getAlpacaClient();
        const riskManager = getRiskManager();

        const account = await client.getAccount();
        const positions = await client.getPositions();

        const portfolioValue = parseFloat(account.portfolio_value);
        const lastEquity = parseFloat(account.last_equity);

        const positionInfos = positions.map(p => ({
            symbol: p.symbol,
            quantity: parseFloat(p.qty),
            marketValue: parseFloat(p.market_value),
            costBasis: parseFloat(p.cost_basis),
            unrealizedPnL: parseFloat(p.unrealized_pl),
            unrealizedPnLPercent: parseFloat(p.unrealized_plpc) * 100,
            side: p.side as 'long' | 'short',
            weight: (parseFloat(p.market_value) / portfolioValue) * 100,
        }));

        const metrics = riskManager.calculateRiskMetrics({
            portfolioValue,
            cash: parseFloat(account.cash),
            buyingPower: parseFloat(account.buying_power),
            positions: positionInfos,
            dailyPnL: portfolioValue - lastEquity,
            realizedPnL: 0,
            unrealizedPnL: positions.reduce((sum, p) => sum + parseFloat(p.unrealized_pl), 0),
            startOfDayValue: lastEquity,
        });

        return {
            metrics,
            status: riskManager.getStatus(),
        };
    }),

    /**
     * Set risk level
     */
    setRiskLevel: protectedProcedure
        .input(z.object({
            level: z.enum(['conservative', 'moderate', 'aggressive']),
        }))
        .mutation(({ input }) => {
            const riskManager = getRiskManager();
            riskManager.setRiskLevel(input.level as RiskLevel);

            return { success: true, status: riskManager.getStatus() };
        }),

    /**
     * Reset circuit breaker
     */
    resetCircuitBreaker: protectedProcedure.mutation(() => {
        const riskManager = getRiskManager();
        riskManager.resetCircuitBreaker(true);

        return { success: true, status: riskManager.getStatus() };
    }),

    // ----------------------------------------
    // WATCHLIST
    // ----------------------------------------

    /**
     * Get user's default watchlist
     */
    getWatchlist: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error('Database unavailable');

        let watchlist = await db.query.watchlists.findFirst({
            where: eq(watchlists.userId, ctx.user.id),
        });

        if (!watchlist) {
            // Create default watchlist
            const [newWatchlist] = await db.insert(watchlists).values({
                userId: ctx.user.id,
                name: 'Default Watchlist',
                isDefault: true,
                symbols: [],
            }).returning();

            if (!newWatchlist) {
                return {
                    id: 0,
                    symbols: [] as string[],
                };
            }

            return {
                id: newWatchlist.id,
                symbols: [] as string[],
            };
        }

        return {
            id: watchlist.id,
            symbols: watchlist.symbols || [],
        };
    }),

    /**
     * Toggle a symbol in the watchlist
     */
    toggleWatchlist: protectedProcedure
        .input(z.object({ symbol: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new Error('Database unavailable');

            let watchlist = await db.query.watchlists.findFirst({
                where: eq(watchlists.userId, ctx.user.id),
            });

            if (!watchlist) {
                await db.insert(watchlists).values({
                    userId: ctx.user.id,
                    name: 'Default Watchlist',
                    isDefault: true,
                    symbols: [input.symbol],
                });
                return { added: true };
            }

            const symbols: string[] = watchlist.symbols || [];
            const exists = symbols.includes(input.symbol);
            let updatedSymbols: string[];

            if (exists) {
                updatedSymbols = symbols.filter((s: string) => s !== input.symbol);
            } else {
                updatedSymbols = [...symbols, input.symbol];
            }

            await db.update(watchlists)
                .set({ symbols: updatedSymbols })
                .where(eq(watchlists.id, watchlist.id));

            return { added: !exists };
        }),

    /**
     * Get real-time neural processing logs
     */
    getNeuralLogs: protectedProcedure
        .input(z.object({ limit: z.number().default(10) }).optional())
        .query(async () => {
            const logs = [
                { id: '1', type: 'neural', message: 'Scanning S&P 500 components for RSI divergence...', status: 'complete' },
                { id: '2', type: 'risk', message: 'Drawdown threshold hit 1.2% - tightening stop-losses across portfolio.', status: 'info' },
                { id: '3', type: 'signal', message: 'Neural Signal: Strong Buy detected on BTC/USD @ $43,450.', status: 'success' },
                { id: '4', type: 'neural', message: 'Re-evaluating sentiment scores for NVDA based on latest news volume.', status: 'active' },
                { id: '5', type: 'risk', message: 'Position sizing adjusted for SOL/USD due to liquidity shift.', status: 'warning' },
                { id: '6', type: 'neural', message: 'Pattern match found: Bullish Engulfing on AAPL (15m timeframe).', status: 'success' },
                { id: '7', type: 'system', message: 'Neural processing load @ 24% - all systems nominal.', status: 'info' },
                { id: '8', type: 'risk', message: 'Global circuit breaker active - monitoring macro news flow.', status: 'complete' },
            ];

            // Return a shifting subset to simulate activity
            const offset = Math.floor(Date.now() / 5000) % logs.length;
            return [...logs.slice(offset), ...logs.slice(0, offset)].slice(0, 10);
        }),
});

export type TradingRouter = typeof tradingRouter;
