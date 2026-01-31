import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  bigint,
  index,
} from "drizzle-orm/mysql-core";

// ============================================
// USERS TABLE (Existing)
// ============================================

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================
// TRADING ACCOUNTS TABLE
// ============================================

export const tradingAccounts = mysqlTable("trading_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  // Alpaca Account Details
  alpacaAccountId: varchar("alpacaAccountId", { length: 64 }).unique(),
  accountNumber: varchar("accountNumber", { length: 32 }),
  accountStatus: varchar("accountStatus", { length: 32 }),

  // Mode: paper or live
  isPaper: boolean("isPaper").default(true).notNull(),

  // Encrypted API credentials (stored securely)
  encryptedApiKey: text("encryptedApiKey"),
  encryptedSecretKey: text("encryptedSecretKey"),

  // Account Balances (synced from Alpaca)
  portfolioValue: decimal("portfolioValue", { precision: 18, scale: 4 }).default("0"),
  buyingPower: decimal("buyingPower", { precision: 18, scale: 4 }).default("0"),
  cash: decimal("cash", { precision: 18, scale: 4 }).default("0"),
  equity: decimal("equity", { precision: 18, scale: 4 }).default("0"),

  // Trading Settings
  tradingEnabled: boolean("tradingEnabled").default(false).notNull(),
  riskLevel: mysqlEnum("riskLevel", ["conservative", "moderate", "aggressive"]).default("moderate").notNull(),
  maxDailyLossPercent: decimal("maxDailyLossPercent", { precision: 5, scale: 2 }).default("5.00"),
  maxDrawdownPercent: decimal("maxDrawdownPercent", { precision: 5, scale: 2 }).default("10.00"),
  maxPositions: int("maxPositions").default(5),

  // Sync timestamps
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("trading_accounts_userId_idx").on(table.userId),
}));

export type TradingAccount = typeof tradingAccounts.$inferSelect;
export type InsertTradingAccount = typeof tradingAccounts.$inferInsert;

// ============================================
// TRADES TABLE
// ============================================

export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),

  // Order/Trade Identification
  alpacaOrderId: varchar("alpacaOrderId", { length: 64 }).unique(),
  clientOrderId: varchar("clientOrderId", { length: 64 }),

  // Asset Details
  symbol: varchar("symbol", { length: 16 }).notNull(),
  assetClass: mysqlEnum("assetClass", ["us_equity", "crypto"]).default("us_equity"),

  // Order Details
  side: mysqlEnum("side", ["buy", "sell"]).notNull(),
  orderType: mysqlEnum("orderType", ["market", "limit", "stop", "stop_limit", "trailing_stop"]).notNull(),
  timeInForce: varchar("timeInForce", { length: 8 }),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  filledQuantity: decimal("filledQuantity", { precision: 18, scale: 8 }).default("0"),

  // Prices
  limitPrice: decimal("limitPrice", { precision: 18, scale: 4 }),
  stopPrice: decimal("stopPrice", { precision: 18, scale: 4 }),
  filledAvgPrice: decimal("filledAvgPrice", { precision: 18, scale: 4 }),

  // Status
  status: varchar("status", { length: 32 }).notNull(),

  // Signal/Strategy Info
  signalConfidence: decimal("signalConfidence", { precision: 5, scale: 4 }),
  signalReason: text("signalReason"),
  strategyId: varchar("strategyId", { length: 64 }),

  // P&L (calculated after close)
  realizedPnl: decimal("realizedPnl", { precision: 18, scale: 4 }),
  realizedPnlPercent: decimal("realizedPnlPercent", { precision: 8, scale: 4 }),

  // Timestamps
  submittedAt: timestamp("submittedAt"),
  filledAt: timestamp("filledAt"),
  canceledAt: timestamp("canceledAt"),
  expiredAt: timestamp("expiredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("trades_userId_idx").on(table.userId),
  accountIdIdx: index("trades_accountId_idx").on(table.accountId),
  symbolIdx: index("trades_symbol_idx").on(table.symbol),
  statusIdx: index("trades_status_idx").on(table.status),
  createdAtIdx: index("trades_createdAt_idx").on(table.createdAt),
}));

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

// ============================================
// POSITIONS TABLE
// ============================================

export const positions = mysqlTable("positions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),

  // Asset Details
  symbol: varchar("symbol", { length: 16 }).notNull(),
  assetId: varchar("assetId", { length: 64 }),
  assetClass: mysqlEnum("assetClass", ["us_equity", "crypto"]).default("us_equity"),
  exchange: varchar("exchange", { length: 16 }),

  // Position Details
  side: mysqlEnum("side", ["long", "short"]).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  quantityAvailable: decimal("quantityAvailable", { precision: 18, scale: 8 }).notNull(),
  avgEntryPrice: decimal("avgEntryPrice", { precision: 18, scale: 4 }).notNull(),
  currentPrice: decimal("currentPrice", { precision: 18, scale: 4 }),
  marketValue: decimal("marketValue", { precision: 18, scale: 4 }),
  costBasis: decimal("costBasis", { precision: 18, scale: 4 }),

  // P&L
  unrealizedPnl: decimal("unrealizedPnl", { precision: 18, scale: 4 }).default("0"),
  unrealizedPnlPercent: decimal("unrealizedPnlPercent", { precision: 8, scale: 4 }).default("0"),
  intradayPnl: decimal("intradayPnl", { precision: 18, scale: 4 }).default("0"),

  // Risk Management
  stopLossPrice: decimal("stopLossPrice", { precision: 18, scale: 4 }),
  takeProfitPrice: decimal("takeProfitPrice", { precision: 18, scale: 4 }),
  stopLossOrderId: varchar("stopLossOrderId", { length: 64 }),
  takeProfitOrderId: varchar("takeProfitOrderId", { length: 64 }),

  // Status
  isOpen: boolean("isOpen").default(true).notNull(),

  // Timestamps
  openedAt: timestamp("openedAt").notNull(),
  closedAt: timestamp("closedAt"),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("positions_userId_idx").on(table.userId),
  accountIdIdx: index("positions_accountId_idx").on(table.accountId),
  symbolIdx: index("positions_symbol_idx").on(table.symbol),
  isOpenIdx: index("positions_isOpen_idx").on(table.isOpen),
}));

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

// ============================================
// MARKET DATA (Historical Bars)
// ============================================

export const marketBars = mysqlTable("market_bars", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),

  symbol: varchar("symbol", { length: 16 }).notNull(),
  timeframe: mysqlEnum("timeframe", ["1Min", "5Min", "15Min", "1Hour", "1Day"]).notNull(),

  open: decimal("open", { precision: 18, scale: 4 }).notNull(),
  high: decimal("high", { precision: 18, scale: 4 }).notNull(),
  low: decimal("low", { precision: 18, scale: 4 }).notNull(),
  close: decimal("close", { precision: 18, scale: 4 }).notNull(),
  volume: bigint("volume", { mode: "number" }).notNull(),
  vwap: decimal("vwap", { precision: 18, scale: 4 }),
  tradeCount: int("tradeCount"),

  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  symbolTimeframeIdx: index("market_bars_symbol_timeframe_idx").on(table.symbol, table.timeframe),
  timestampIdx: index("market_bars_timestamp_idx").on(table.timestamp),
}));

export type MarketBar = typeof marketBars.$inferSelect;
export type InsertMarketBar = typeof marketBars.$inferInsert;

// ============================================
// TRADING SIGNALS
// ============================================

export const tradingSignals = mysqlTable("trading_signals", {
  id: int("id").autoincrement().primaryKey(),

  symbol: varchar("symbol", { length: 16 }).notNull(),
  assetClass: mysqlEnum("assetClass", ["us_equity", "crypto"]).default("us_equity"),

  // Signal Details
  signalType: mysqlEnum("signalType", ["entry_long", "entry_short", "exit", "hold"]).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
  strength: mysqlEnum("strength", ["weak", "moderate", "strong"]).default("moderate"),

  // Technical Analysis Data
  indicators: json("indicators"), // RSI, MACD, Bollinger, etc.
  reason: text("reason"),

  // Entry/Exit Targets
  targetPrice: decimal("targetPrice", { precision: 18, scale: 4 }),
  stopLossPrice: decimal("stopLossPrice", { precision: 18, scale: 4 }),
  takeProfitPrice: decimal("takeProfitPrice", { precision: 18, scale: 4 }),

  // Strategy
  strategyId: varchar("strategyId", { length: 64 }),
  strategyName: varchar("strategyName", { length: 128 }),

  // Execution Status
  wasExecuted: boolean("wasExecuted").default(false),
  executedAt: timestamp("executedAt"),
  tradeId: int("tradeId"),

  // Validity
  validUntil: timestamp("validUntil"),
  isActive: boolean("isActive").default(true),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  symbolIdx: index("trading_signals_symbol_idx").on(table.symbol),
  createdAtIdx: index("trading_signals_createdAt_idx").on(table.createdAt),
  isActiveIdx: index("trading_signals_isActive_idx").on(table.isActive),
}));

export type TradingSignal = typeof tradingSignals.$inferSelect;
export type InsertTradingSignal = typeof tradingSignals.$inferInsert;

// ============================================
// PORTFOLIO SNAPSHOTS (Daily Performance)
// ============================================

export const portfolioSnapshots = mysqlTable("portfolio_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),

  // Snapshot Date
  snapshotDate: timestamp("snapshotDate").notNull(),

  // Values
  portfolioValue: decimal("portfolioValue", { precision: 18, scale: 4 }).notNull(),
  cash: decimal("cash", { precision: 18, scale: 4 }).notNull(),
  equity: decimal("equity", { precision: 18, scale: 4 }).notNull(),
  buyingPower: decimal("buyingPower", { precision: 18, scale: 4 }).notNull(),

  // Daily P&L
  dailyPnl: decimal("dailyPnl", { precision: 18, scale: 4 }).default("0"),
  dailyPnlPercent: decimal("dailyPnlPercent", { precision: 8, scale: 4 }).default("0"),

  // Cumulative Stats
  totalPnl: decimal("totalPnl", { precision: 18, scale: 4 }).default("0"),
  totalPnlPercent: decimal("totalPnlPercent", { precision: 8, scale: 4 }).default("0"),

  // Performance Metrics
  winRate: decimal("winRate", { precision: 5, scale: 2 }),
  sharpeRatio: decimal("sharpeRatio", { precision: 8, scale: 4 }),
  maxDrawdown: decimal("maxDrawdown", { precision: 8, scale: 4 }),

  // Position Counts
  openPositions: int("openPositions").default(0),
  tradesExecuted: int("tradesExecuted").default(0),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("portfolio_snapshots_userId_idx").on(table.userId),
  snapshotDateIdx: index("portfolio_snapshots_date_idx").on(table.snapshotDate),
}));

export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;
export type InsertPortfolioSnapshot = typeof portfolioSnapshots.$inferInsert;

// ============================================
// AUDIT LOGS
// ============================================

export const auditLogs = mysqlTable("audit_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  userId: int("userId"),
  accountId: int("accountId"),

  // Action Details
  action: varchar("action", { length: 64 }).notNull(),
  category: mysqlEnum("category", [
    "auth",
    "account",
    "order",
    "position",
    "system",
    "risk",
    "error",
  ]).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "error", "critical"]).default("info"),

  // Payload
  details: json("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),

  // Related Entities
  orderId: varchar("orderId", { length: 64 }),
  symbol: varchar("symbol", { length: 16 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("audit_logs_userId_idx").on(table.userId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  categoryIdx: index("audit_logs_category_idx").on(table.category),
  createdAtIdx: index("audit_logs_createdAt_idx").on(table.createdAt),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================
// WATCHLISTS
// ============================================

export const watchlists = mysqlTable("watchlists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  name: varchar("name", { length: 64 }).notNull(),
  symbols: json("symbols").$type<string[]>().default([]),
  isDefault: boolean("isDefault").default(false),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("watchlists_userId_idx").on(table.userId),
}));

export type Watchlist = typeof watchlists.$inferSelect;
export type InsertWatchlist = typeof watchlists.$inferInsert;

// ============================================
// RISK ALERTS
// ============================================

export const riskAlerts = mysqlTable("risk_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),

  // Alert Type
  alertType: mysqlEnum("alertType", [
    "daily_loss_limit",
    "max_drawdown",
    "position_limit",
    "volatility_spike",
    "margin_call",
    "system_error",
    "circuit_breaker",
  ]).notNull(),

  severity: mysqlEnum("severity", ["warning", "critical"]).notNull(),
  message: text("message").notNull(),

  // Action Taken
  actionTaken: mysqlEnum("actionTaken", [
    "none",
    "notified_user",
    "paused_trading",
    "closed_positions",
    "emergency_stop",
  ]).default("none"),

  // Status
  isResolved: boolean("isResolved").default(false),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: varchar("resolvedBy", { length: 64 }),

  // Metadata
  metadata: json("metadata"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("risk_alerts_userId_idx").on(table.userId),
  alertTypeIdx: index("risk_alerts_alertType_idx").on(table.alertType),
  isResolvedIdx: index("risk_alerts_isResolved_idx").on(table.isResolved),
}));

export type RiskAlert = typeof riskAlerts.$inferSelect;
export type InsertRiskAlert = typeof riskAlerts.$inferInsert;

// ============================================
// TRADING STRATEGIES
// ============================================

export const strategies = mysqlTable("strategies", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId"),

  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),

  // Configuration
  config: json("config").$type<{
    indicators: string[];
    entryConditions: Record<string, unknown>;
    exitConditions: Record<string, unknown>;
    riskParams: Record<string, unknown>;
  }>(),

  // Backtest Results
  backtestResults: json("backtestResults").$type<{
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;
    totalTrades: number;
    startDate: string;
    endDate: string;
  }>(),

  // Status
  isActive: boolean("isActive").default(true),
  isPublic: boolean("isPublic").default(false),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("strategies_userId_idx").on(table.userId),
  isActiveIdx: index("strategies_isActive_idx").on(table.isActive),
}));

export type Strategy = typeof strategies.$inferSelect;
export type InsertStrategy = typeof strategies.$inferInsert;

// ============================================
// NOTIFICATIONS
// ============================================

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  type: mysqlEnum("type", [
    "trade_executed",
    "trade_filled",
    "trade_canceled",
    "position_closed",
    "risk_alert",
    "daily_summary",
    "deposit_received",
    "withdrawal_processed",
    "system_announcement",
  ]).notNull(),

  title: varchar("title", { length: 128 }).notNull(),
  message: text("message").notNull(),
  data: json("data"),

  isRead: boolean("isRead").default(false),
  readAt: timestamp("readAt"),

  // Push notification tracking
  isPushed: boolean("isPushed").default(false),
  pushedAt: timestamp("pushedAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("notifications_userId_idx").on(table.userId),
  isReadIdx: index("notifications_isRead_idx").on(table.isRead),
  createdAtIdx: index("notifications_createdAt_idx").on(table.createdAt),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
