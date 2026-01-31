/**
 * Alpaca WebSocket Streaming Client
 * Real-time market data and trade updates
 * 
 * @author Jonny AI (The Architect)
 * @version 1.0.0
 */

import type {
    StreamBar,
    StreamTrade,
    StreamQuote,
    TradeUpdate,
} from './types';

// ============================================
// WEBSOCKET URLS
// ============================================

const WS_PAPER_TRADING = 'wss://paper-api.alpaca.markets/stream';
const WS_LIVE_TRADING = 'wss://api.alpaca.markets/stream';
const WS_DATA_STOCKS = 'wss://stream.data.alpaca.markets/v2/iex';
const WS_DATA_CRYPTO = 'wss://stream.data.alpaca.markets/v1beta3/crypto/us';

// ============================================
// EVENT TYPES
// ============================================

type MarketDataHandler = (data: StreamBar | StreamTrade | StreamQuote) => void;
type TradeUpdateHandler = (update: TradeUpdate) => void;
type ErrorHandler = (error: Error) => void;
type StatusHandler = (status: 'connected' | 'disconnected' | 'authenticated') => void;

interface StreamSubscriptions {
    trades: Set<string>;
    quotes: Set<string>;
    bars: Set<string>;
}

// ============================================
// MARKET DATA STREAM CLASS
// ============================================

export class MarketDataStream {
    private ws: WebSocket | null = null;
    private keyId: string;
    private secretKey: string;
    private streamUrl: string;
    private subscriptions: StreamSubscriptions;
    private authenticated = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    // Event handlers
    private onBar: MarketDataHandler | null = null;
    private onTrade: MarketDataHandler | null = null;
    private onQuote: MarketDataHandler | null = null;
    private onError: ErrorHandler | null = null;
    private onStatus: StatusHandler | null = null;

    constructor(keyId: string, secretKey: string, crypto = false) {
        this.keyId = keyId;
        this.secretKey = secretKey;
        this.streamUrl = crypto ? WS_DATA_CRYPTO : WS_DATA_STOCKS;
        this.subscriptions = {
            trades: new Set(),
            quotes: new Set(),
            bars: new Set(),
        };
    }

    // ============================================
    // CONNECTION MANAGEMENT
    // ============================================

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.streamUrl);

                this.ws.onopen = () => {
                    console.log('[MarketDataStream] Connected to', this.streamUrl);
                    this.authenticate();
                    this.reconnectAttempts = 0;
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };

                this.ws.onerror = (error) => {
                    console.error('[MarketDataStream] WebSocket error:', error);
                    this.onError?.(new Error('WebSocket connection error'));
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('[MarketDataStream] Connection closed');
                    this.authenticated = false;
                    this.onStatus?.('disconnected');
                    this.handleReconnect();
                };

                // Resolve when authenticated
                const checkAuth = setInterval(() => {
                    if (this.authenticated) {
                        clearInterval(checkAuth);
                        resolve();
                    }
                }, 100);

                // Timeout after 10 seconds
                setTimeout(() => {
                    clearInterval(checkAuth);
                    if (!this.authenticated) {
                        reject(new Error('Authentication timeout'));
                    }
                }, 10000);
            } catch (error) {
                reject(error);
            }
        });
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.authenticated = false;
        }
    }

    private authenticate(): void {
        if (!this.ws) return;

        this.ws.send(JSON.stringify({
            action: 'auth',
            key: this.keyId,
            secret: this.secretKey,
        }));
    }

    private handleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[MarketDataStream] Max reconnect attempts reached');
            this.onError?.(new Error('Max reconnection attempts reached'));
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`[MarketDataStream] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect().then(() => {
                // Re-subscribe to previous subscriptions
                this.resubscribe();
            }).catch((error) => {
                console.error('[MarketDataStream] Reconnection failed:', error);
            });
        }, delay);
    }

    private resubscribe(): void {
        if (this.subscriptions.trades.size > 0) {
            this.subscribe('trades', Array.from(this.subscriptions.trades));
        }
        if (this.subscriptions.quotes.size > 0) {
            this.subscribe('quotes', Array.from(this.subscriptions.quotes));
        }
        if (this.subscriptions.bars.size > 0) {
            this.subscribe('bars', Array.from(this.subscriptions.bars));
        }
    }

    // ============================================
    // MESSAGE HANDLING
    // ============================================

    private handleMessage(messages: unknown[]): void {
        for (const msg of messages) {
            const message = msg as Record<string, unknown>;
            const type = message.T as string;

            switch (type) {
                case 'success':
                    if (message.msg === 'authenticated') {
                        console.log('[MarketDataStream] Authenticated successfully');
                        this.authenticated = true;
                        this.onStatus?.('authenticated');
                    } else if (message.msg === 'connected') {
                        this.onStatus?.('connected');
                    }
                    break;

                case 'error':
                    console.error('[MarketDataStream] Error:', message.msg);
                    this.onError?.(new Error(message.msg as string));
                    break;

                case 'subscription':
                    console.log('[MarketDataStream] Subscription updated:', message);
                    break;

                case 't': // Trade
                    this.onTrade?.(message as unknown as StreamTrade);
                    break;

                case 'q': // Quote
                    this.onQuote?.(message as unknown as StreamQuote);
                    break;

                case 'b': // Bar
                    this.onBar?.(message as unknown as StreamBar);
                    break;

                default:
                    console.log('[MarketDataStream] Unknown message type:', type);
            }
        }
    }

    // ============================================
    // SUBSCRIPTIONS
    // ============================================

    subscribe(type: 'trades' | 'quotes' | 'bars', symbols: string[]): void {
        if (!this.ws || !this.authenticated) {
            console.warn('[MarketDataStream] Cannot subscribe: not connected/authenticated');
            return;
        }

        // Track subscriptions
        symbols.forEach((s) => this.subscriptions[type].add(s));

        this.ws.send(JSON.stringify({
            action: 'subscribe',
            [type]: symbols,
        }));

        console.log(`[MarketDataStream] Subscribed to ${type}:`, symbols);
    }

    unsubscribe(type: 'trades' | 'quotes' | 'bars', symbols: string[]): void {
        if (!this.ws || !this.authenticated) return;

        // Remove from tracked subscriptions
        symbols.forEach((s) => this.subscriptions[type].delete(s));

        this.ws.send(JSON.stringify({
            action: 'unsubscribe',
            [type]: symbols,
        }));

        console.log(`[MarketDataStream] Unsubscribed from ${type}:`, symbols);
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    onBarUpdate(handler: MarketDataHandler): void {
        this.onBar = handler;
    }

    onTradeUpdate(handler: MarketDataHandler): void {
        this.onTrade = handler;
    }

    onQuoteUpdate(handler: MarketDataHandler): void {
        this.onQuote = handler;
    }

    onErrorEvent(handler: ErrorHandler): void {
        this.onError = handler;
    }

    onStatusChange(handler: StatusHandler): void {
        this.onStatus = handler;
    }

    // ============================================
    // STATUS
    // ============================================

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.authenticated;
    }

    getSubscriptions(): StreamSubscriptions {
        return {
            trades: new Set(this.subscriptions.trades),
            quotes: new Set(this.subscriptions.quotes),
            bars: new Set(this.subscriptions.bars),
        };
    }
}

// ============================================
// TRADING STREAM CLASS (Account Updates)
// ============================================

export class TradingStream {
    private ws: WebSocket | null = null;
    private keyId: string;
    private secretKey: string;
    private paper: boolean;
    private streamUrl: string;
    private authenticated = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    // Event handlers
    private onTradeUpdate: TradeUpdateHandler | null = null;
    private onError: ErrorHandler | null = null;
    private onStatus: StatusHandler | null = null;

    constructor(keyId: string, secretKey: string, paper = true) {
        this.keyId = keyId;
        this.secretKey = secretKey;
        this.paper = paper;
        this.streamUrl = paper ? WS_PAPER_TRADING : WS_LIVE_TRADING;
    }

    // ============================================
    // CONNECTION MANAGEMENT
    // ============================================

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.streamUrl);

                this.ws.onopen = () => {
                    console.log('[TradingStream] Connected to', this.streamUrl);
                    this.authenticate();
                    this.reconnectAttempts = 0;
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };

                this.ws.onerror = (error) => {
                    console.error('[TradingStream] WebSocket error:', error);
                    this.onError?.(new Error('WebSocket connection error'));
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('[TradingStream] Connection closed');
                    this.authenticated = false;
                    this.onStatus?.('disconnected');
                    this.handleReconnect();
                };

                // Resolve when authenticated
                const checkAuth = setInterval(() => {
                    if (this.authenticated) {
                        clearInterval(checkAuth);
                        resolve();
                    }
                }, 100);

                // Timeout after 10 seconds
                setTimeout(() => {
                    clearInterval(checkAuth);
                    if (!this.authenticated) {
                        reject(new Error('Authentication timeout'));
                    }
                }, 10000);
            } catch (error) {
                reject(error);
            }
        });
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.authenticated = false;
        }
    }

    private authenticate(): void {
        if (!this.ws) return;

        this.ws.send(JSON.stringify({
            action: 'authenticate',
            data: {
                key_id: this.keyId,
                secret_key: this.secretKey,
            },
        }));
    }

    private handleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[TradingStream] Max reconnect attempts reached');
            this.onError?.(new Error('Max reconnection attempts reached'));
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`[TradingStream] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect().then(() => {
                this.subscribeToTradeUpdates();
            }).catch((error) => {
                console.error('[TradingStream] Reconnection failed:', error);
            });
        }, delay);
    }

    // ============================================
    // MESSAGE HANDLING
    // ============================================

    private handleMessage(message: Record<string, unknown>): void {
        const stream = message.stream as string;
        const data = message.data as Record<string, unknown>;

        switch (stream) {
            case 'authorization':
                if (data?.status === 'authorized') {
                    console.log('[TradingStream] Authenticated successfully');
                    this.authenticated = true;
                    this.onStatus?.('authenticated');
                    this.subscribeToTradeUpdates();
                } else {
                    console.error('[TradingStream] Authentication failed:', data);
                    this.onError?.(new Error('Authentication failed'));
                }
                break;

            case 'listening':
                console.log('[TradingStream] Listening to:', data?.streams);
                break;

            case 'trade_updates':
                this.onTradeUpdate?.(data as unknown as TradeUpdate);
                break;

            default:
                console.log('[TradingStream] Unknown stream:', stream);
        }
    }

    // ============================================
    // SUBSCRIPTIONS
    // ============================================

    private subscribeToTradeUpdates(): void {
        if (!this.ws || !this.authenticated) return;

        this.ws.send(JSON.stringify({
            action: 'listen',
            data: {
                streams: ['trade_updates'],
            },
        }));
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    onTradeUpdateEvent(handler: TradeUpdateHandler): void {
        this.onTradeUpdate = handler;
    }

    onErrorEvent(handler: ErrorHandler): void {
        this.onError = handler;
    }

    onStatusChange(handler: StatusHandler): void {
        this.onStatus = handler;
    }

    // ============================================
    // STATUS
    // ============================================

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.authenticated;
    }

    isPaper(): boolean {
        return this.paper;
    }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

let marketDataStream: MarketDataStream | null = null;
let tradingStream: TradingStream | null = null;

/**
 * Initialize and connect to the market data stream
 */
export async function initMarketDataStream(
    keyId: string,
    secretKey: string,
    crypto = false
): Promise<MarketDataStream> {
    if (marketDataStream) {
        marketDataStream.disconnect();
    }

    marketDataStream = new MarketDataStream(keyId, secretKey, crypto);
    await marketDataStream.connect();
    return marketDataStream;
}

/**
 * Get the market data stream instance
 */
export function getMarketDataStream(): MarketDataStream | null {
    return marketDataStream;
}

/**
 * Initialize and connect to the trading stream
 */
export async function initTradingStream(
    keyId: string,
    secretKey: string,
    paper = true
): Promise<TradingStream> {
    if (tradingStream) {
        tradingStream.disconnect();
    }

    tradingStream = new TradingStream(keyId, secretKey, paper);
    await tradingStream.connect();
    return tradingStream;
}

/**
 * Get the trading stream instance
 */
export function getTradingStream(): TradingStream | null {
    return tradingStream;
}

/**
 * Disconnect all streams
 */
export function disconnectAllStreams(): void {
    marketDataStream?.disconnect();
    tradingStream?.disconnect();
    marketDataStream = null;
    tradingStream = null;
}
