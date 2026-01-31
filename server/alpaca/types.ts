/**
 * Alpaca Markets API Types
 * Type definitions for broker integration
 */

// ============================================
// ACCOUNT TYPES
// ============================================

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: 'ONBOARDING' | 'SUBMISSION_FAILED' | 'SUBMITTED' | 'ACCOUNT_UPDATED' | 'APPROVAL_PENDING' | 'ACTIVE' | 'REJECTED';
  currency: string;
  buying_power: string;
  regt_buying_power: string;
  daytrading_buying_power: string;
  cash: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  trade_suspended_by_user: boolean;
  equity: string;
  last_equity: string;
  multiplier: string;
  shorting_enabled: boolean;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  last_maintenance_margin: string;
  sma: string;
  daytrade_count: number;
}

// ============================================
// ORDER TYPES
// ============================================

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
export type TimeInForce = 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok';
export type OrderStatus = 
  | 'new'
  | 'partially_filled'
  | 'filled'
  | 'done_for_day'
  | 'canceled'
  | 'expired'
  | 'replaced'
  | 'pending_cancel'
  | 'pending_replace'
  | 'pending_new'
  | 'accepted'
  | 'stopped'
  | 'rejected'
  | 'suspended'
  | 'calculated';

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  replaced_at: string | null;
  replaced_by: string | null;
  replaces: string | null;
  asset_id: string;
  symbol: string;
  asset_class: 'us_equity' | 'crypto';
  notional: string | null;
  qty: string | null;
  filled_qty: string;
  filled_avg_price: string | null;
  order_class: 'simple' | 'bracket' | 'oco' | 'oto';
  order_type: OrderType;
  type: OrderType; // alias
  side: OrderSide;
  time_in_force: TimeInForce;
  limit_price: string | null;
  stop_price: string | null;
  status: OrderStatus;
  extended_hours: boolean;
  legs: AlpacaOrder[] | null;
  trail_percent: string | null;
  trail_price: string | null;
  hwm: string | null;
}

export interface CreateOrderRequest {
  symbol: string;
  qty?: number;
  notional?: number;
  side: OrderSide;
  type: OrderType;
  time_in_force: TimeInForce;
  limit_price?: number;
  stop_price?: number;
  trail_price?: number;
  trail_percent?: number;
  extended_hours?: boolean;
  client_order_id?: string;
  order_class?: 'simple' | 'bracket' | 'oco' | 'oto';
  take_profit?: { limit_price: number };
  stop_loss?: { stop_price: number; limit_price?: number };
}

// ============================================
// POSITION TYPES
// ============================================

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: 'us_equity' | 'crypto';
  asset_marginable: boolean;
  avg_entry_price: string;
  qty: string;
  qty_available: string;
  side: 'long' | 'short';
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

// ============================================
// ASSET TYPES
// ============================================

export interface AlpacaAsset {
  id: string;
  class: 'us_equity' | 'crypto';
  exchange: string;
  symbol: string;
  name: string;
  status: 'active' | 'inactive';
  tradable: boolean;
  marginable: boolean;
  shortable: boolean;
  easy_to_borrow: boolean;
  fractionable: boolean;
  min_order_size?: string;
  min_trade_increment?: string;
  price_increment?: string;
}

// ============================================
// MARKET DATA TYPES
// ============================================

export interface AlpacaBar {
  t: string; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  n: number; // number of trades
  vw: number; // volume weighted average price
}

export interface AlpacaTrade {
  t: string; // timestamp
  x: string; // exchange
  p: number; // price
  s: number; // size
  c: string[]; // conditions
  i: number; // trade ID
  z: string; // tape
}

export interface AlpacaQuote {
  t: string; // timestamp
  ax: string; // ask exchange
  ap: number; // ask price
  as: number; // ask size
  bx: string; // bid exchange
  bp: number; // bid price
  bs: number; // bid size
  c: string[]; // conditions
  z: string; // tape
}

export interface AlpacaSnapshot {
  latestTrade: AlpacaTrade;
  latestQuote: AlpacaQuote;
  minuteBar: AlpacaBar;
  dailyBar: AlpacaBar;
  prevDailyBar: AlpacaBar;
}

// ============================================
// WEBSOCKET TYPES
// ============================================

export interface TradeUpdate {
  event: 'new' | 'fill' | 'partial_fill' | 'canceled' | 'expired' | 'rejected' | 'replaced' | 'pending_new' | 'pending_cancel' | 'pending_replace';
  order: AlpacaOrder;
  timestamp: string;
  position_qty?: string;
  price?: string;
  qty?: string;
}

export interface StreamBar {
  T: 'b'; // type
  S: string; // symbol
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  t: string;
  n: number;
  vw: number;
}

export interface StreamTrade {
  T: 't';
  S: string;
  p: number;
  s: number;
  t: string;
  c: string[];
  i: number;
  x: string;
  z: string;
}

export interface StreamQuote {
  T: 'q';
  S: string;
  ap: number;
  as: number;
  bp: number;
  bs: number;
  t: string;
  ax: string;
  bx: string;
  c: string[];
  z: string;
}

// ============================================
// INTERNAL TYPES
// ============================================

export interface BrokerCredentials {
  keyId: string;
  secretKey: string;
  paper: boolean;
}

export interface TradingConfig {
  maxPositions: number;
  maxPositionSizePercent: number;
  maxDailyLossPercent: number;
  maxDrawdownPercent: number;
  defaultTimeInForce: TimeInForce;
  enableCrypto: boolean;
  enableStocks: boolean;
  tradingHoursOnly: boolean;
}

export type RiskLevel = 'conservative' | 'moderate' | 'aggressive';

export interface RiskParameters {
  maxPositionSize: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxCorrelation: number;
  maxSectorExposure: number;
}

export const RISK_PRESETS: Record<RiskLevel, RiskParameters> = {
  conservative: {
    maxPositionSize: 0.05,
    stopLossPercent: 0.02,
    takeProfitPercent: 0.03,
    maxCorrelation: 0.3,
    maxSectorExposure: 0.15,
  },
  moderate: {
    maxPositionSize: 0.10,
    stopLossPercent: 0.05,
    takeProfitPercent: 0.08,
    maxCorrelation: 0.5,
    maxSectorExposure: 0.25,
  },
  aggressive: {
    maxPositionSize: 0.15,
    stopLossPercent: 0.10,
    takeProfitPercent: 0.15,
    maxCorrelation: 0.7,
    maxSectorExposure: 0.40,
  },
};
