import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  jsonb,
  bigint,
  index,
  uuid,
  serial,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const riskLevelEnum = pgEnum("risk_level", ["conservative", "moderate", "aggressive"]);
export const assetClassEnum = pgEnum("asset_class", ["us_equity", "crypto"]);
export const sideEnum = pgEnum("side", ["buy", "sell"]);
export const positionSideEnum = pgEnum("position_side", ["long", "short"]);
export const orderTypeEnum = pgEnum("order_type", ["market", "limit", "stop", "stop_limit", "trailing_stop"]);
export const timeframeEnum = pgEnum("timeframe", ["1Min", "5Min", "15Min", "1Hour", "1Day"]);
export const signalTypeEnum = pgEnum("signal_type", ["entry_long", "entry_short", "exit", "hold"]);
export const signalStrengthEnum = pgEnum("signal_strength", ["weak", "moderate", "strong"]);
export const auditCategoryEnum = pgEnum("audit_category", ["auth", "account", "order", "position", "system", "risk", "error"]);
export const severityEnum = pgEnum("severity", ["info", "warning", "error", "critical"]);
export const alertTypeEnum = pgEnum("alert_type", ["daily_loss_limit", "max_drawdown", "position_limit", "volatility_spike", "margin_call", "system_error", "circuit_breaker"]);
export const riskSeverityEnum = pgEnum("risk_severity", ["warning", "critical"]);
export const actionTakenEnum = pgEnum("action_taken", ["none", "notified_user", "paused_trading", "closed_positions", "emergency_stop"]);
export const notificationTypeEnum = pgEnum("notification_type", ["trade_executed", "trade_filled", "trade_canceled", "position_closed", "risk_alert", "daily_summary", "deposit_received", "withdrawal_processed", "system_announcement"]);

// ============================================
// USERS TABLE (PostgreSQL)
// ============================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  password: text("password"),
  loginMethod: varchar("login_method", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  isEmailVerified: boolean("is_email_verified").default(false).notNull(),
  verificationCode: varchar("verification_code", { length: 6 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
  pushToken: text("push_token"),
  marketingOptIn: boolean("marketing_opt_in").default(false).notNull(),
  metadata: jsonb("metadata").$type<{
    lastLoginIp?: string;
    campaign?: string;
    source?: string;
    referral?: string;
    emailListId?: string;
  }>(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================
// TRADING ACCOUNTS TABLE
// ============================================

export const tradingAccounts = pgTable("trading_accounts", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),

  // Alpaca Account Details
  alpacaAccountId: varchar("alpaca_account_id", { length: 64 }).unique(),
  accountNumber: varchar("account_number", { length: 32 }),
  accountStatus: varchar("account_status", { length: 32 }),

  // Mode: paper or live
  isPaper: boolean("is_paper").default(true).notNull(),

  // Encrypted API credentials (stored securely)
  encryptedApiKey: text("encrypted_api_key"),
  encryptedSecretKey: text("encrypted_secret_key"),

  // Account Balances (synced from Alpaca)
  portfolioValue: decimal("portfolio_value", { precision: 18, scale: 4 }).default("0"),
  buyingPower: decimal("buying_power", { precision: 18, scale: 4 }).default("0"),
  cash: decimal("cash", { precision: 18, scale: 4 }).default("0"),
  equity: decimal("equity", { precision: 18, scale: 4 }).default("0"),

  // Trading Settings
  tradingEnabled: boolean("trading_enabled").default(false).notNull(),
  riskLevel: riskLevelEnum("risk_level").default("moderate").notNull(),
  maxDailyLossPercent: decimal("max_daily_loss_percent", { precision: 5, scale: 2 }).default("5.00"),
  maxDrawdownPercent: decimal("max_drawdown_percent", { precision: 5, scale: 2 }).default("10.00"),
  maxPositions: integer("max_positions").default(5),

  // Sync timestamps
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [{
  userIdIdx: index("trading_accounts_user_id_idx").on(table.userId),
}]);

export type TradingAccount = typeof tradingAccounts.$inferSelect;
export type InsertTradingAccount = typeof tradingAccounts.$inferInsert;

// ============================================
// TRADES TABLE
// ============================================

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  accountId: integer("account_id").notNull(),

  // Order/Trade Identification
  alpacaOrderId: varchar("alpaca_order_id", { length: 64 }).unique(),
  clientOrderId: varchar("client_order_id", { length: 64 }),

  // Asset Details
  symbol: varchar("symbol", { length: 16 }).notNull(),
  assetClass: assetClassEnum("asset_class").default("us_equity"),

  // Order Details
  side: sideEnum("side").notNull(),
  orderType: orderTypeEnum("order_type").notNull(),
  timeInForce: varchar("time_in_force", { length: 8 }),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  filledQuantity: decimal("filled_quantity", { precision: 18, scale: 8 }).default("0"),

  // Prices
  limitPrice: decimal("limit_price", { precision: 18, scale: 4 }),
  stopPrice: decimal("stop_price", { precision: 18, scale: 4 }),
  filledAvgPrice: decimal("filled_avg_price", { precision: 18, scale: 4 }),

  // Status
  status: varchar("status", { length: 32 }).notNull(),

  // Signal/Strategy Info
  signalConfidence: decimal("signal_confidence", { precision: 5, scale: 4 }),
  signalReason: text("signal_reason"),
  strategyId: varchar("strategy_id", { length: 64 }),

  // P&L (calculated after close)
  realizedPnl: decimal("realized_pnl", { precision: 18, scale: 4 }),
  realizedPnlPercent: decimal("realized_pnl_percent", { precision: 8, scale: 4 }),

  // Timestamps
  submittedAt: timestamp("submitted_at"),
  filledAt: timestamp("filled_at"),
  canceledAt: timestamp("canceled_at"),
  expiredAt: timestamp("expired_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [{
  userIdIdx: index("trades_user_id_idx").on(table.userId),
  accountIdIdx: index("trades_account_id_idx").on(table.accountId),
  symbolIdx: index("trades_symbol_idx").on(table.symbol),
  statusIdx: index("trades_status_idx").on(table.status),
  createdAtIdx: index("trades_created_at_idx").on(table.createdAt),
}]);

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

// ============================================
// POSITIONS TABLE
// ============================================

export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  accountId: integer("account_id").notNull(),

  // Asset Details
  symbol: varchar("symbol", { length: 16 }).notNull(),
  assetId: varchar("asset_id", { length: 64 }),
  assetClass: assetClassEnum("asset_class").default("us_equity"),
  exchange: varchar("exchange", { length: 16 }),

  // Position Details
  side: positionSideEnum("side").notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  quantityAvailable: decimal("quantity_available", { precision: 18, scale: 8 }).notNull(),
  avgEntryPrice: decimal("avg_entry_price", { precision: 18, scale: 4 }).notNull(),
  currentPrice: decimal("current_price", { precision: 18, scale: 4 }),
  marketValue: decimal("market_value", { precision: 18, scale: 4 }),
  costBasis: decimal("cost_basis", { precision: 18, scale: 4 }),

  // P&L
  unrealizedPnl: decimal("unrealized_pnl", { precision: 18, scale: 4 }).default("0"),
  unrealizedPnlPercent: decimal("unrealized_pnl_percent", { precision: 8, scale: 4 }).default("0"),
  intradayPnl: decimal("intraday_pnl", { precision: 18, scale: 4 }).default("0"),

  // Risk Management
  stopLossPrice: decimal("stop_loss_price", { precision: 18, scale: 4 }),
  takeProfitPrice: decimal("take_profit_price", { precision: 18, scale: 4 }),
  stopLossOrderId: varchar("stop_loss_order_id", { length: 64 }),
  takeProfitOrderId: varchar("take_profit_order_id", { length: 64 }),

  // Status
  isOpen: boolean("is_open").default(true).notNull(),

  // Timestamps
  openedAt: timestamp("opened_at").notNull(),
  closedAt: timestamp("closed_at"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [{
  userIdIdx: index("positions_user_id_idx").on(table.userId),
  accountIdIdx: index("positions_account_id_idx").on(table.accountId),
  symbolIdx: index("positions_symbol_idx").on(table.symbol),
  isOpenIdx: index("positions_is_open_idx").on(table.isOpen),
}]);

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

// ============================================
// MARKET DATA (Historical Bars)
// ============================================

export const marketBars = pgTable("market_bars", {
  id: serial("id").primaryKey(),

  symbol: varchar("symbol", { length: 16 }).notNull(),
  timeframe: timeframeEnum("timeframe").notNull(),

  open: decimal("open", { precision: 18, scale: 4 }).notNull(),
  high: decimal("high", { precision: 18, scale: 4 }).notNull(),
  low: decimal("low", { precision: 18, scale: 4 }).notNull(),
  close: decimal("close", { precision: 18, scale: 4 }).notNull(),
  volume: bigint("volume", { mode: "number" }).notNull(),
  vwap: decimal("vwap", { precision: 18, scale: 4 }),
  tradeCount: integer("trade_count"),

  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [{
  symbolTimeframeIdx: index("market_bars_symbol_timeframe_idx").on(table.symbol, table.timeframe),
  timestampIdx: index("market_bars_timestamp_idx").on(table.timestamp),
}]);

export type MarketBar = typeof marketBars.$inferSelect;
export type InsertMarketBar = typeof marketBars.$inferInsert;

// ============================================
// TRADING SIGNALS
// ============================================

export const tradingSignals = pgTable("trading_signals", {
  id: serial("id").primaryKey(),

  symbol: varchar("symbol", { length: 16 }).notNull(),
  assetClass: assetClassEnum("asset_class").default("us_equity"),

  // Signal Details
  signalType: signalTypeEnum("signal_type").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
  strength: signalStrengthEnum("strength").default("moderate"),

  // Technical Analysis Data
  indicators: jsonb("indicators"), // RSI, MACD, Bollinger, etc.
  reason: text("reason"),

  // Entry/Exit Targets
  targetPrice: decimal("target_price", { precision: 18, scale: 4 }),
  stopLossPrice: decimal("stop_loss_price", { precision: 18, scale: 4 }),
  takeProfitPrice: decimal("take_profit_price", { precision: 18, scale: 4 }),

  // Strategy
  strategyId: varchar("strategy_id", { length: 64 }),
  strategyName: varchar("strategy_name", { length: 128 }),

  // Execution Status
  wasExecuted: boolean("was_executed").default(false),
  executedAt: timestamp("executed_at"),
  tradeId: integer("trade_id"),

  // Validity
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [{
  symbolIdx: index("trading_signals_symbol_idx").on(table.symbol),
  createdAtIdx: index("trading_signals_created_at_idx").on(table.createdAt),
  isActiveIdx: index("trading_signals_is_active_idx").on(table.isActive),
}]);

export type TradingSignal = typeof tradingSignals.$inferSelect;
export type InsertTradingSignal = typeof tradingSignals.$inferInsert;

// ============================================
// PORTFOLIO SNAPSHOTS (Daily Performance)
// ============================================

export const portfolioSnapshots = pgTable("portfolio_snapshots", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  accountId: integer("account_id").notNull(),

  // Snapshot Date
  snapshotDate: timestamp("snapshot_date").notNull(),

  // Values
  portfolioValue: decimal("portfolio_value", { precision: 18, scale: 4 }).notNull(),
  cash: decimal("cash", { precision: 18, scale: 4 }).notNull(),
  equity: decimal("equity", { precision: 18, scale: 4 }).notNull(),
  buyingPower: decimal("buying_power", { precision: 18, scale: 4 }).notNull(),

  // Daily P&L
  dailyPnl: decimal("daily_pnl", { precision: 18, scale: 4 }).default("0"),
  dailyPnlPercent: decimal("daily_pnl_percent", { precision: 8, scale: 4 }).default("0"),

  // Cumulative Stats
  totalPnl: decimal("total_pnl", { precision: 18, scale: 4 }).default("0"),
  totalPnlPercent: decimal("total_pnl_percent", { precision: 8, scale: 4 }).default("0"),

  // Performance Metrics
  winRate: decimal("win_rate", { precision: 5, scale: 2 }),
  sharpeRatio: decimal("sharpe_ratio", { precision: 8, scale: 4 }),
  maxDrawdown: decimal("max_drawdown", { precision: 8, scale: 4 }),

  // Position Counts
  openPositions: integer("open_positions").default(0),
  tradesExecuted: integer("trades_executed").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [{
  userIdIdx: index("portfolio_snapshots_user_id_idx").on(table.userId),
  snapshotDateIdx: index("portfolio_snapshots_date_idx").on(table.snapshotDate),
}]);

export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;
export type InsertPortfolioSnapshot = typeof portfolioSnapshots.$inferInsert;

// ============================================
// AUDIT LOGS
// ============================================

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),
  accountId: integer("account_id"),

  // Action Details
  action: varchar("action", { length: 64 }).notNull(),
  category: auditCategoryEnum("category").notNull(),
  severity: severityEnum("severity").default("info"),

  // Payload
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),

  // Related Entities
  orderId: varchar("order_id", { length: 64 }),
  symbol: varchar("symbol", { length: 16 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [{
  userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  categoryIdx: index("audit_logs_category_idx").on(table.category),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
}]);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================
// WATCHLISTS
// ============================================

export const watchlists = pgTable("watchlists", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),

  name: varchar("name", { length: 64 }).notNull(),
  symbols: jsonb("symbols").$type<string[]>().default([]),
  isDefault: boolean("is_default").default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [{
  userIdIdx: index("watchlists_user_id_idx").on(table.userId),
}]);

export type Watchlist = typeof watchlists.$inferSelect;
export type InsertWatchlist = typeof watchlists.$inferInsert;

// ============================================
// RISK ALERTS
// ============================================

export const riskAlerts = pgTable("risk_alerts", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  accountId: integer("account_id").notNull(),

  // Alert Type
  alertType: alertTypeEnum("alert_type").notNull(),

  severity: riskSeverityEnum("severity").notNull(),
  message: text("message").notNull(),

  // Action Taken
  actionTaken: actionTakenEnum("action_taken").default("none"),

  // Status
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by", { length: 64 }),

  // Metadata
  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [{
  userIdIdx: index("risk_alerts_user_id_idx").on(table.userId),
  alertTypeIdx: index("risk_alerts_alert_type_idx").on(table.alertType),
  isResolvedIdx: index("risk_alerts_is_resolved_idx").on(table.isResolved),
}]);

export type RiskAlert = typeof riskAlerts.$inferSelect;
export type InsertRiskAlert = typeof riskAlerts.$inferInsert;

// ============================================
// TRADING STRATEGIES
// ============================================

export const strategies = pgTable("strategies", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: uuid("user_id"),

  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),

  // Configuration
  config: jsonb("config").$type<{
    indicators: string[];
    entryConditions: Record<string, unknown>;
    exitConditions: Record<string, unknown>;
    riskParams: Record<string, unknown>;
  }>(),

  // Backtest Results
  backtestResults: jsonb("backtestResults").$type<{
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;
    totalTrades: number;
    startDate: string;
    endDate: string;
  }>(),

  // Status
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [{
  userIdIdx: index("strategies_user_id_idx").on(table.userId),
  isActiveIdx: index("strategies_is_active_idx").on(table.isActive),
}]);

export type Strategy = typeof strategies.$inferSelect;
export type InsertStrategy = typeof strategies.$inferInsert;

// ============================================
// NOTIFICATIONS
// ============================================

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),

  type: notificationTypeEnum("type").notNull(),

  title: varchar("title", { length: 128 }).notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),

  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),

  // Push notification tracking
  isPushed: boolean("is_pushed").default(false),
  pushedAt: timestamp("pushed_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [{
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  isReadIdx: index("notifications_is_read_idx").on(table.isRead),
  createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
}]);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
