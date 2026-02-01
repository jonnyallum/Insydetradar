/**
 * Trading Engine - Core Execution Module
 * Autonomous trading orchestration connecting signals, risk, and broker
 * 
 * @author Jonny AI (The Architect)
 * @version 1.0.0
 */

import { AlpacaClient, getAlpacaClient, isAlpacaClientInitialized } from '../alpaca/client';
import { getMarketDataStream, getTradingStream } from '../alpaca/stream';
import type { AlpacaBar, AlpacaOrder, CreateOrderRequest } from '../alpaca/types';
import { SignalGenerator, getSignalGenerator, type TradingSignal } from './signal-generator';
import { RiskManager, getRiskManager, type PortfolioState, type PositionInfo } from './risk-manager';
import type { OHLCV } from './indicators';
import { notificationService } from '../notification-service';

// ============================================
// TYPES
// ============================================

export interface TradingEngineConfig {
    symbols: string[];
    enabled: boolean;
    demoMode: boolean;
    checkIntervalMs: number;
    maxConcurrentOrders: number;
    ownerId?: string;
}

export interface EngineState {
    isRunning: boolean;
    lastCheck: Date | null;
    activeOrders: number;
    positionCount: number;
    todayTrades: number;
    todayPnL: number;
    errors: string[];
}

export interface TradeExecution {
    orderId: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    type: 'market' | 'limit' | 'bracket';
    status: 'pending' | 'submitted' | 'filled' | 'failed';
    signal: TradingSignal;
    timestamp: Date;
}

// ============================================
// TRADING ENGINE CLASS
// ============================================

export class TradingEngine {
    private config: TradingEngineConfig;
    private signalGenerator: SignalGenerator;
    private riskManager: RiskManager;
    private client: AlpacaClient | null = null;

    private isRunning = false;
    private checkInterval: NodeJS.Timeout | null = null;
    private lastCheck: Date | null = null;
    private todayTrades = 0;
    private todayPnL = 0;
    private errors: string[] = [];
    private pendingOrders: Map<string, TradeExecution> = new Map();

    // Historical data cache
    private barCache: Map<string, OHLCV[]> = new Map();
    private cacheExpiry: Map<string, Date> = new Map();
    private cacheDurationMs = 5 * 60 * 1000; // 5 minutes

    constructor(config: Partial<TradingEngineConfig> = {}) {
        this.config = {
            symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'SPY', 'QQQ'],
            enabled: false,
            demoMode: true,
            checkIntervalMs: 60000, // 1 minute
            maxConcurrentOrders: 3,
            ...config,
        };

        this.signalGenerator = getSignalGenerator();
        this.riskManager = getRiskManager();
    }

    // ============================================
    // ENGINE CONTROL
    // ============================================

    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('[TradingEngine] Already running');
            return;
        }

        // Verify Alpaca connection
        if (!isAlpacaClientInitialized()) {
            throw new Error('Alpaca client not initialized. Cannot start trading engine.');
        }

        this.client = getAlpacaClient();

        // Check account status
        const accountReady = await this.client.isAccountReady();
        if (!accountReady.ready) {
            throw new Error(`Account not ready: ${accountReady.reason}`);
        }

        // Check if market is open (for stocks)
        const marketOpen = await this.client.isMarketOpen();
        if (!marketOpen) {
            console.log('[TradingEngine] Market is closed. Engine will wait for market open.');
        }

        this.isRunning = true;
        this.config.enabled = true;
        this.errors = [];

        console.log('[TradingEngine] 🚀 Starting autonomous trading engine');
        console.log(`[TradingEngine] Mode: ${this.config.demoMode ? 'DEMO (Paper)' : '⚠️ LIVE'}`);
        console.log(`[TradingEngine] Symbols: ${this.config.symbols.join(', ')}`);

        // Start the main trading loop
        this.checkInterval = setInterval(() => this.runTradingCycle(), this.config.checkIntervalMs) as any;

        // Run immediately
        await this.runTradingCycle();
    }

    async stop(): Promise<void> {
        if (!this.isRunning) return;

        console.log('[TradingEngine] 🛑 Stopping trading engine');

        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        this.isRunning = false;
        this.config.enabled = false;
    }

    async emergencyStop(): Promise<{ success: boolean; closedPositions: string[] }> {
        console.error('[TradingEngine] ⚠️ EMERGENCY STOP INITIATED');

        // Stop the engine
        await this.stop();

        // Trip circuit breaker
        this.riskManager.tripCircuitBreaker('Emergency stop triggered by user');

        if (!this.client) {
            return { success: false, closedPositions: [] };
        }

        // Cancel all pending orders
        try {
            await this.client.cancelAllOrders();
        } catch (error) {
            this.addError(`Failed to cancel orders: ${error}`);
        }

        // Close all positions
        const closedPositions: string[] = [];
        try {
            const positions = await this.client.getPositions();
            for (const pos of positions) {
                try {
                    await this.client.closePosition(pos.symbol);
                    closedPositions.push(pos.symbol);
                } catch (error) {
                    this.addError(`Failed to close ${pos.symbol}: ${error}`);
                }
            }
        } catch (error) {
            this.addError(`Failed to get positions: ${error}`);
        }

        console.log(`[TradingEngine] Emergency stop complete. Closed ${closedPositions.length} positions`);

        // Notify owner
        if (this.config.ownerId) {
            notificationService.sendToUser(
                this.config.ownerId,
                '🚨 Emergency Stop Triggered',
                `Automated trading has been halted and ${closedPositions.length} positions closed.`
            );
        }

        return {
            success: true,
            closedPositions,
        };
    }

    // ============================================
    // MAIN TRADING CYCLE
    // ============================================

    private async runTradingCycle(): Promise<void> {
        if (!this.config.enabled || !this.client) return;

        this.lastCheck = new Date();

        try {
            // 1. Check circuit breaker
            if (this.riskManager.isCircuitBreakerTripped()) {
                console.log('[TradingEngine] Circuit breaker tripped. Skipping cycle.');
                return;
            }

            // 2. Check if market is open
            const marketOpen = await this.client.isMarketOpen();
            if (!marketOpen) {
                console.log('[TradingEngine] Market closed. Skipping cycle.');
                return;
            }

            // 3. Get current portfolio state
            const portfolio = await this.getPortfolioState();

            // 4. Check for emergency liquidation
            const emergencyCheck = this.riskManager.shouldEmergencyLiquidate(portfolio);
            if (emergencyCheck.shouldLiquidate) {
                console.error(`[TradingEngine] Emergency liquidation triggered: ${emergencyCheck.reason}`);
                await this.emergencyStop();
                return;
            }

            // 5. Monitor existing positions
            await this.monitorPositions(portfolio);

            // 6. Scan for new opportunities (if not at max positions)
            if (portfolio.positions.length < this.riskManager.getStatus().limits.maxPositions) {
                await this.scanForOpportunities(portfolio);
            }

        } catch (error) {
            this.addError(`Trading cycle error: ${error}`);
            console.error('[TradingEngine] Cycle error:', error);
        }
    }

    // ============================================
    // PORTFOLIO STATE
    // ============================================

    private async getPortfolioState(): Promise<PortfolioState> {
        if (!this.client) throw new Error('Client not initialized');

        const account = await this.client.getAccount();
        const positions = await this.client.getPositions();

        const portfolioValue = parseFloat(account.portfolio_value);
        const lastEquity = parseFloat(account.last_equity);
        const unrealizedPnL = positions.reduce(
            (sum, p) => sum + parseFloat(p.unrealized_pl),
            0
        );

        const positionInfos: PositionInfo[] = positions.map(p => ({
            symbol: p.symbol,
            quantity: parseFloat(p.qty),
            marketValue: parseFloat(p.market_value),
            costBasis: parseFloat(p.cost_basis),
            unrealizedPnL: parseFloat(p.unrealized_pl),
            unrealizedPnLPercent: parseFloat(p.unrealized_plpc) * 100,
            side: p.side,
            weight: (parseFloat(p.market_value) / portfolioValue) * 100,
        }));

        return {
            portfolioValue,
            cash: parseFloat(account.cash),
            buyingPower: parseFloat(account.buying_power),
            positions: positionInfos,
            dailyPnL: portfolioValue - lastEquity,
            realizedPnL: this.todayPnL,
            unrealizedPnL,
            startOfDayValue: lastEquity,
        };
    }

    // ============================================
    // POSITION MONITORING
    // ============================================

    private async monitorPositions(portfolio: PortfolioState): Promise<void> {
        if (!this.client || portfolio.positions.length === 0) return;

        // Get current prices
        const symbols = portfolio.positions.map(p => p.symbol);
        const snapshots = await this.client.getSnapshots(symbols);

        const currentPrices: Record<string, number> = {};
        const stopLosses: Record<string, number> = {};
        const takeProfits: Record<string, number> = {};

        for (const symbol of symbols) {
            const snapshot = snapshots[symbol];
            if (snapshot) {
                currentPrices[symbol] = snapshot.latestTrade?.p || snapshot.minuteBar?.c || 0;

                // Dynamic stop-loss/take-profit based on position entry
                const position = portfolio.positions.find(p => p.symbol === symbol);
                if (position) {
                    const entryPrice = position.costBasis / position.quantity;
                    const atr = currentPrices[symbol] * 0.02; // Estimate 2% ATR

                    if (position.side === 'long') {
                        stopLosses[symbol] = entryPrice - atr * 2;
                        takeProfits[symbol] = entryPrice + atr * 3;
                    } else {
                        stopLosses[symbol] = entryPrice + atr * 2;
                        takeProfits[symbol] = entryPrice - atr * 3;
                    }
                }
            }
        }

        // Check for exits
        const { toClose, reasons } = this.riskManager.checkPositionExits(
            portfolio.positions,
            currentPrices,
            stopLosses,
            takeProfits
        );

        // Execute exits
        for (const symbol of toClose) {
            console.log(`[TradingEngine] Closing ${symbol}: ${reasons[symbol]}`);
            try {
                await this.client.closePosition(symbol);
                this.todayTrades++;
            } catch (error) {
                this.addError(`Failed to close ${symbol}: ${error}`);
            }
        }
    }

    // ============================================
    // OPPORTUNITY SCANNING
    // ============================================

    private async scanForOpportunities(portfolio: PortfolioState): Promise<void> {
        if (!this.client) return;

        console.log(`[TradingEngine] Scanning ${this.config.symbols.length} symbols for opportunities...`);

        for (const symbol of this.config.symbols) {
            // Skip if we already have a position
            if (portfolio.positions.some(p => p.symbol === symbol)) continue;

            // Skip if we have too many pending orders
            if (this.pendingOrders.size >= this.config.maxConcurrentOrders) break;

            try {
                // Get historical data
                const bars = await this.getHistoricalBars(symbol);
                if (!bars || bars.length < 200) continue;

                // Generate signal
                const result = this.signalGenerator.generateSignal(symbol, bars);
                if (!result) continue;

                const { signal, rawScores } = result;

                // Only act on entry signals
                if (signal.signalType === 'neutral') continue;

                console.log(`[TradingEngine] ${symbol}: ${signal.signalType.toUpperCase()} signal (${(signal.confidence * 100).toFixed(1)}%)`);

                // Get current price
                const snapshot = await this.client.getSnapshot(symbol);
                const currentPrice = snapshot.latestTrade?.p || snapshot.minuteBar?.c;
                if (!currentPrice) continue;

                // Risk check
                const atr = signal.indicators.atr || currentPrice * 0.02;
                const riskCheck = this.riskManager.checkTradeRisk(
                    portfolio,
                    symbol,
                    ['buy', 'strong_buy'].includes(signal.signalType) ? 'buy' : 'sell',
                    1, // Will be calculated by position sizing
                    currentPrice,
                    signal.confidence,
                    atr
                );

                if (!riskCheck.approved) {
                    console.log(`[TradingEngine] ${symbol}: Trade rejected - ${riskCheck.reason}`);
                    continue;
                }

                // Calculate position size
                const positionSize = this.riskManager.calculatePositionSize(
                    portfolio.portfolioValue,
                    portfolio.buyingPower,
                    currentPrice,
                    signal.confidence,
                    atr
                );

                if (positionSize.quantity < 1) {
                    console.log(`[TradingEngine] ${symbol}: Position size too small`);
                    continue;
                }

                // Execute trade
                await this.executeTrade(
                    symbol,
                    signal,
                    positionSize.quantity,
                    currentPrice,
                    riskCheck.suggestedStopLoss!,
                    riskCheck.suggestedTakeProfit!
                );

            } catch (error) {
                this.addError(`Error scanning ${symbol}: ${error}`);
            }
        }
    }

    // ============================================
    // TRADE EXECUTION
    // ============================================

    private async executeTrade(
        symbol: string,
        signal: TradingSignal,
        quantity: number,
        price: number,
        stopLoss: number,
        takeProfit: number
    ): Promise<void> {
        if (!this.client) return;

        const side = ['buy', 'strong_buy'].includes(signal.signalType) ? 'buy' : 'sell';

        console.log(`[TradingEngine] Executing ${side.toUpperCase()} ${quantity} ${symbol} @ ~${price}`);
        console.log(`[TradingEngine] SL: ${stopLoss}, TP: ${takeProfit}`);

        try {
            // Use bracket order for built-in stop-loss and take-profit
            const order = await this.client.bracketOrder(
                symbol,
                quantity,
                side,
                takeProfit,
                stopLoss,
                'market'
            );

            const execution: TradeExecution = {
                orderId: order.id,
                symbol,
                side,
                quantity,
                type: 'bracket',
                status: order.status === 'filled' ? 'filled' : 'submitted',
                signal,
                timestamp: new Date(),
            };

            this.pendingOrders.set(order.id, execution);
            this.todayTrades++;

            console.log(`[TradingEngine] ✅ Order submitted: ${order.id}`);

            // Notify owner
            if (this.config.ownerId) {
                notificationService.sendToUser(
                    this.config.ownerId,
                    `💰 Trade Executed: ${symbol}`,
                    `${side.toUpperCase()} ${quantity} shares at $${price.toFixed(2)}`
                );
            }

        } catch (error) {
            this.addError(`Failed to execute ${symbol} trade: ${error}`);
            console.error(`[TradingEngine] ❌ Order failed:`, error);
        }
    }

    // ============================================
    // DATA FETCHING
    // ============================================

    private async getHistoricalBars(symbol: string): Promise<OHLCV[] | null> {
        // Check cache
        const cached = this.barCache.get(symbol);
        const expiry = this.cacheExpiry.get(symbol);

        if (cached && expiry && new Date() < expiry) {
            return cached;
        }

        if (!this.client) return null;

        try {
            // Fetch last 250 daily bars (about 1 year)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 365);

            const bars = await this.client.getBars(symbol, '1Day', {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                limit: 250,
            });

            const ohlcvBars: OHLCV[] = bars.map(bar => ({
                open: bar.o,
                high: bar.h,
                low: bar.l,
                close: bar.c,
                volume: bar.v,
                timestamp: bar.t,
            }));

            // Cache
            this.barCache.set(symbol, ohlcvBars);
            this.cacheExpiry.set(symbol, new Date(Date.now() + this.cacheDurationMs));

            return ohlcvBars;

        } catch (error) {
            this.addError(`Failed to fetch bars for ${symbol}: ${error}`);
            return null;
        }
    }

    // ============================================
    // UTILITIES
    // ============================================

    private addError(error: string): void {
        this.errors.push(`${new Date().toISOString()}: ${error}`);
        if (this.errors.length > 100) {
            this.errors = this.errors.slice(-50);
        }
    }

    // ============================================
    // STATUS
    // ============================================

    getState(): EngineState {
        return {
            isRunning: this.isRunning,
            lastCheck: this.lastCheck,
            activeOrders: this.pendingOrders.size,
            positionCount: 0, // Updated externally
            todayTrades: this.todayTrades,
            todayPnL: this.todayPnL,
            errors: [...this.errors],
        };
    }

    getConfig(): TradingEngineConfig {
        return { ...this.config };
    }

    updateConfig(updates: Partial<TradingEngineConfig>): void {
        this.config = { ...this.config, ...updates };
    }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let engineInstance: TradingEngine | null = null;

export function getTradingEngine(): TradingEngine {
    if (!engineInstance) {
        engineInstance = new TradingEngine();
    }
    return engineInstance;
}

export function initTradingEngine(config: Partial<TradingEngineConfig>): TradingEngine {
    engineInstance = new TradingEngine(config);
    return engineInstance;
}
