/**
 * Trading Module Index
 * Export all trading components
 */

// Indicators
export * from './indicators';

// Signal Generation
export {
    SignalGenerator,
    getSignalGenerator,
    type TradingSignal,
    type SignalType,
    type SignalStrength,
    type IndicatorSnapshot,
    type SignalResult,
} from './signal-generator';

// Risk Management
export {
    RiskManager,
    getRiskManager,
    initRiskManager,
    type PortfolioState,
    type PositionInfo,
    type RiskCheckResult,
    type RiskLimits,
    type CircuitBreakerState,
} from './risk-manager';

// Trading Engine
export {
    TradingEngine,
    getTradingEngine,
    initTradingEngine,
    type TradingEngineConfig,
    type EngineState,
    type TradeExecution,
} from './engine';
