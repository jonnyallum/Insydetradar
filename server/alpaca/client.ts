/**
 * Alpaca Markets API Client
 * Production-ready broker adapter for autonomous trading
 * 
 * @author Jonny AI (The Architect)
 * @version 1.0.0
 */

import type {
    AlpacaAccount,
    AlpacaOrder,
    AlpacaPosition,
    AlpacaAsset,
    AlpacaBar,
    AlpacaSnapshot,
    CreateOrderRequest,
    BrokerCredentials,
} from './types';

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================

const ALPACA_PAPER_URL = 'https://paper-api.alpaca.markets';
const ALPACA_LIVE_URL = 'https://api.alpaca.markets';
const ALPACA_DATA_URL = 'https://data.alpaca.markets';

// ============================================
// ALPACA CLIENT CLASS
// ============================================

export class AlpacaClient {
    private keyId: string;
    private secretKey: string;
    private paper: boolean;
    private baseUrl: string;
    private dataUrl: string;

    constructor(credentials: BrokerCredentials) {
        this.keyId = credentials.keyId;
        this.secretKey = credentials.secretKey;
        this.paper = credentials.paper;
        this.baseUrl = credentials.paper ? ALPACA_PAPER_URL : ALPACA_LIVE_URL;
        this.dataUrl = ALPACA_DATA_URL;
    }

    // ============================================
    // HTTP HELPERS
    // ============================================

    private get headers(): Record<string, string> {
        return {
            'APCA-API-KEY-ID': this.keyId,
            'APCA-API-SECRET-KEY': this.secretKey,
            'Content-Type': 'application/json',
        };
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {},
        useDataApi = false
    ): Promise<T> {
        const baseUrl = useDataApi ? this.dataUrl : this.baseUrl;
        const url = `${baseUrl}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.headers,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Alpaca API Error (${response.status}): ${error}`);
        }

        return response.json() as Promise<T>;
    }

    // ============================================
    // ACCOUNT OPERATIONS
    // ============================================

    /**
     * Get the current account information
     */
    async getAccount(): Promise<AlpacaAccount> {
        return this.request<AlpacaAccount>('/v2/account');
    }

    /**
     * Check if the account is ready for trading
     */
    async isAccountReady(): Promise<{ ready: boolean; reason?: string }> {
        const account = await this.getAccount();

        if (account.status !== 'ACTIVE') {
            return { ready: false, reason: `Account status: ${account.status}` };
        }

        if (account.trading_blocked) {
            return { ready: false, reason: 'Trading is blocked on this account' };
        }

        if (account.account_blocked) {
            return { ready: false, reason: 'Account is blocked' };
        }

        if (account.trade_suspended_by_user) {
            return { ready: false, reason: 'Trading suspended by user' };
        }

        return { ready: true };
    }

    /**
     * Get account buying power (available funds for trading)
     */
    async getBuyingPower(): Promise<number> {
        const account = await this.getAccount();
        return parseFloat(account.buying_power);
    }

    /**
     * Get portfolio value
     */
    async getPortfolioValue(): Promise<number> {
        const account = await this.getAccount();
        return parseFloat(account.portfolio_value);
    }

    /**
     * Get portfolio history (equity and profit/loss over time)
     */
    async getPortfolioHistory(options: {
        period?: '1D' | '1W' | '1M' | '3M' | '1Y' | 'all';
        timeframe?: '1Min' | '5Min' | '15Min' | '1H' | '1D';
        date_end?: string;
        extended_hours?: boolean;
    } = {}): Promise<{
        timestamp: number[];
        equity: (number | null)[];
        profit_loss: (number | null)[];
        profit_loss_pct: (number | null)[];
        base_value: number;
        timeframe: string;
    }> {
        const params = new URLSearchParams();
        if (options.period) params.set('period', options.period);
        if (options.timeframe) params.set('timeframe', options.timeframe);
        if (options.date_end) params.set('date_end', options.date_end);
        if (options.extended_hours !== undefined) params.set('extended_hours', options.extended_hours.toString());

        const query = params.toString();
        return this.request(`/v2/account/portfolio/history${query ? `?${query}` : ''}`);
    }

    // ============================================
    // ORDER OPERATIONS
    // ============================================

    /**
     * Submit a new order
     */
    async createOrder(order: CreateOrderRequest): Promise<AlpacaOrder> {
        // Validate order before submission
        this.validateOrder(order);

        return this.request<AlpacaOrder>('/v2/orders', {
            method: 'POST',
            body: JSON.stringify(order),
        });
    }

    /**
     * Submit a market buy order
     */
    async marketBuy(symbol: string, qty: number): Promise<AlpacaOrder> {
        return this.createOrder({
            symbol,
            qty,
            side: 'buy',
            type: 'market',
            time_in_force: 'day',
        });
    }

    /**
     * Submit a market sell order
     */
    async marketSell(symbol: string, qty: number): Promise<AlpacaOrder> {
        return this.createOrder({
            symbol,
            qty,
            side: 'sell',
            type: 'market',
            time_in_force: 'day',
        });
    }

    /**
     * Submit a limit buy order
     */
    async limitBuy(symbol: string, qty: number, limitPrice: number): Promise<AlpacaOrder> {
        return this.createOrder({
            symbol,
            qty,
            side: 'buy',
            type: 'limit',
            time_in_force: 'gtc',
            limit_price: limitPrice,
        });
    }

    /**
     * Submit a limit sell order
     */
    async limitSell(symbol: string, qty: number, limitPrice: number): Promise<AlpacaOrder> {
        return this.createOrder({
            symbol,
            qty,
            side: 'sell',
            type: 'limit',
            time_in_force: 'gtc',
            limit_price: limitPrice,
        });
    }

    /**
     * Submit a bracket order (entry with stop-loss and take-profit)
     */
    async bracketOrder(
        symbol: string,
        qty: number,
        side: 'buy' | 'sell',
        takeProfitPrice: number,
        stopLossPrice: number,
        type: 'market' | 'limit' = 'market',
        limitPrice?: number
    ): Promise<AlpacaOrder> {
        return this.createOrder({
            symbol,
            qty,
            side,
            type,
            time_in_force: 'gtc',
            limit_price: type === 'limit' ? limitPrice : undefined,
            order_class: 'bracket',
            take_profit: { limit_price: takeProfitPrice },
            stop_loss: { stop_price: stopLossPrice },
        });
    }

    /**
     * Get an order by ID
     */
    async getOrder(orderId: string): Promise<AlpacaOrder> {
        return this.request<AlpacaOrder>(`/v2/orders/${orderId}`);
    }

    /**
     * Get all orders (open by default)
     */
    async getOrders(options: {
        status?: 'open' | 'closed' | 'all';
        limit?: number;
        after?: string;
        until?: string;
        direction?: 'asc' | 'desc';
    } = {}): Promise<AlpacaOrder[]> {
        const params = new URLSearchParams();
        if (options.status) params.set('status', options.status);
        if (options.limit) params.set('limit', options.limit.toString());
        if (options.after) params.set('after', options.after);
        if (options.until) params.set('until', options.until);
        if (options.direction) params.set('direction', options.direction);

        const query = params.toString();
        return this.request<AlpacaOrder[]>(`/v2/orders${query ? `?${query}` : ''}`);
    }

    /**
     * Cancel an order
     */
    async cancelOrder(orderId: string): Promise<void> {
        await this.request(`/v2/orders/${orderId}`, {
            method: 'DELETE',
        });
    }

    /**
     * Cancel all open orders
     */
    async cancelAllOrders(): Promise<{ id: string; status: number }[]> {
        return this.request('/v2/orders', {
            method: 'DELETE',
        });
    }

    /**
     * Replace an order (modify qty, limit price, stop price, etc.)
     */
    async replaceOrder(
        orderId: string,
        changes: {
            qty?: number;
            time_in_force?: string;
            limit_price?: number;
            stop_price?: number;
            trail?: number;
            client_order_id?: string;
        }
    ): Promise<AlpacaOrder> {
        return this.request<AlpacaOrder>(`/v2/orders/${orderId}`, {
            method: 'PATCH',
            body: JSON.stringify(changes),
        });
    }

    // ============================================
    // POSITION OPERATIONS
    // ============================================

    /**
     * Get all open positions
     */
    async getPositions(): Promise<AlpacaPosition[]> {
        return this.request<AlpacaPosition[]>('/v2/positions');
    }

    /**
     * Get a specific position by symbol
     */
    async getPosition(symbol: string): Promise<AlpacaPosition | null> {
        try {
            return await this.request<AlpacaPosition>(`/v2/positions/${symbol}`);
        } catch (error) {
            // Position doesn't exist
            if ((error as Error).message.includes('404')) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Close a position (sell all shares)
     */
    async closePosition(symbol: string, percentage?: number): Promise<AlpacaOrder> {
        const params = percentage ? `?percentage=${percentage}` : '';
        return this.request<AlpacaOrder>(`/v2/positions/${symbol}${params}`, {
            method: 'DELETE',
        });
    }

    /**
     * Close all positions (liquidate portfolio)
     */
    async closeAllPositions(cancelOrders = true): Promise<{ symbol: string; status: number }[]> {
        const params = cancelOrders ? '?cancel_orders=true' : '';
        return this.request(`/v2/positions${params}`, {
            method: 'DELETE',
        });
    }

    // ============================================
    // ASSET OPERATIONS
    // ============================================

    /**
     * Get all tradable assets
     */
    async getAssets(options: {
        status?: 'active' | 'inactive';
        asset_class?: 'us_equity' | 'crypto';
    } = {}): Promise<AlpacaAsset[]> {
        const params = new URLSearchParams();
        if (options.status) params.set('status', options.status);
        if (options.asset_class) params.set('asset_class', options.asset_class);

        const query = params.toString();
        return this.request<AlpacaAsset[]>(`/v2/assets${query ? `?${query}` : ''}`);
    }

    /**
     * Get a specific asset by symbol
     */
    async getAsset(symbol: string): Promise<AlpacaAsset> {
        return this.request<AlpacaAsset>(`/v2/assets/${symbol}`);
    }

    /**
     * Check if an asset is tradable
     */
    async isTradable(symbol: string): Promise<boolean> {
        try {
            const asset = await this.getAsset(symbol);
            return asset.tradable && asset.status === 'active';
        } catch {
            return false;
        }
    }

    // ============================================
    // MARKET DATA OPERATIONS
    // ============================================

    /**
     * Get historical bars (OHLCV data)
     */
    async getBars(
        symbol: string,
        timeframe: '1Min' | '5Min' | '15Min' | '1Hour' | '1Day',
        options: {
            start?: string;
            end?: string;
            limit?: number;
            adjustment?: 'raw' | 'split' | 'dividend' | 'all';
        } = {}
    ): Promise<AlpacaBar[]> {
        const params = new URLSearchParams({ timeframe });
        if (options.start) params.set('start', options.start);
        if (options.end) params.set('end', options.end);
        if (options.limit) params.set('limit', options.limit.toString());
        if (options.adjustment) params.set('adjustment', options.adjustment);

        const response = await this.request<{ bars: AlpacaBar[] }>(
            `/v2/stocks/${symbol}/bars?${params.toString()}`,
            {},
            true // Use data API
        );

        return response.bars || [];
    }

    /**
     * Get latest snapshot (last trade, quote, minute bar, daily bar)
     */
    async getSnapshot(symbol: string): Promise<AlpacaSnapshot> {
        return this.request<AlpacaSnapshot>(
            `/v2/stocks/${symbol}/snapshot`,
            {},
            true // Use data API
        );
    }

    /**
     * Get snapshots for multiple symbols
     */
    async getSnapshots(symbols: string[]): Promise<Record<string, AlpacaSnapshot>> {
        const params = new URLSearchParams({ symbols: symbols.join(',') });
        return this.request<Record<string, AlpacaSnapshot>>(
            `/v2/stocks/snapshots?${params.toString()}`,
            {},
            true // Use data API
        );
    }

    /**
     * Get the current price of a symbol
     */
    async getCurrentPrice(symbol: string): Promise<number> {
        const snapshot = await this.getSnapshot(symbol);
        return snapshot.latestTrade?.p || snapshot.minuteBar?.c || 0;
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Check if the market is currently open
     */
    async isMarketOpen(): Promise<boolean> {
        const clock = await this.request<{
            timestamp: string;
            is_open: boolean;
            next_open: string;
            next_close: string;
        }>('/v2/clock');
        return clock.is_open;
    }

    /**
     * Get market calendar
     */
    async getCalendar(start?: string, end?: string): Promise<{
        date: string;
        open: string;
        close: string;
    }[]> {
        const params = new URLSearchParams();
        if (start) params.set('start', start);
        if (end) params.set('end', end);

        const query = params.toString();
        return this.request(`/v2/calendar${query ? `?${query}` : ''}`);
    }

    /**
     * Validate an order before submission
     */
    private validateOrder(order: CreateOrderRequest): void {
        if (!order.symbol) {
            throw new Error('Order validation failed: symbol is required');
        }

        if (!order.qty && !order.notional) {
            throw new Error('Order validation failed: qty or notional is required');
        }

        if (order.type === 'limit' && !order.limit_price) {
            throw new Error('Order validation failed: limit_price is required for limit orders');
        }

        if (order.type === 'stop' && !order.stop_price) {
            throw new Error('Order validation failed: stop_price is required for stop orders');
        }

        if (order.type === 'stop_limit' && (!order.stop_price || !order.limit_price)) {
            throw new Error('Order validation failed: stop_price and limit_price required for stop_limit orders');
        }
    }

    /**
     * Get connection status information
     */
    getConnectionInfo(): { paper: boolean; baseUrl: string } {
        return {
            paper: this.paper,
            baseUrl: this.baseUrl,
        };
    }
}

// ============================================
// SINGLETON FACTORY
// ============================================

let clientInstance: AlpacaClient | null = null;

/**
 * Initialize the Alpaca client with credentials
 */
export function initAlpacaClient(credentials: BrokerCredentials): AlpacaClient {
    clientInstance = new AlpacaClient(credentials);
    return clientInstance;
}

/**
 * Get the current Alpaca client instance
 */
export function getAlpacaClient(): AlpacaClient {
    if (!clientInstance) {
        throw new Error('Alpaca client not initialized. Call initAlpacaClient first.');
    }
    return clientInstance;
}

/**
 * Check if the Alpaca client is initialized
 */
export function isAlpacaClientInitialized(): boolean {
    return clientInstance !== null;
}
