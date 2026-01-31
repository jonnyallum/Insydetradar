/**
 * Alpaca Module Index
 * Export all Alpaca integration components
 */

// Client
export { AlpacaClient, initAlpacaClient, getAlpacaClient, isAlpacaClientInitialized } from './client';

// Streaming
export {
    MarketDataStream,
    TradingStream,
    initMarketDataStream,
    getMarketDataStream,
    initTradingStream,
    getTradingStream,
    disconnectAllStreams,
} from './stream';

// Types
export type {
    AlpacaAccount,
    AlpacaOrder,
    AlpacaPosition,
    AlpacaAsset,
    AlpacaBar,
    AlpacaTrade,
    AlpacaQuote,
    AlpacaSnapshot,
    CreateOrderRequest,
    OrderSide,
    OrderType,
    OrderStatus,
    TimeInForce,
    BrokerCredentials,
    TradingConfig,
    RiskLevel,
    RiskParameters,
    TradeUpdate,
    StreamBar,
    StreamTrade,
    StreamQuote,
} from './types';

export { RISK_PRESETS } from './types';
