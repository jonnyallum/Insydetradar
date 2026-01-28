/**
 * Trading Simulator Service
 * Simulates AI trading activity for demo mode
 * Based on the Insydetradar ML engine concepts
 */

export interface SimulatedTrade {
  id: string;
  symbol: string;
  type: 'crypto' | 'stock' | 'forex';
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  openedAt: string;
  confidence: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volatility: number;
}

// Simulated market data
const MARKET_PRICES: Record<string, MarketData> = {
  'BTC/USD': { symbol: 'BTC/USD', price: 43250, change24h: 2.45, volatility: 0.03 },
  'ETH/USD': { symbol: 'ETH/USD', price: 2285, change24h: 3.12, volatility: 0.04 },
  'SOL/USD': { symbol: 'SOL/USD', price: 98.75, change24h: -1.23, volatility: 0.05 },
  'AAPL': { symbol: 'AAPL', price: 178.50, change24h: 1.25, volatility: 0.02 },
  'MSFT': { symbol: 'MSFT', price: 378.90, change24h: 0.95, volatility: 0.015 },
  'NVDA': { symbol: 'NVDA', price: 495.20, change24h: 3.85, volatility: 0.04 },
  'EUR/USD': { symbol: 'EUR/USD', price: 1.0875, change24h: 0.15, volatility: 0.005 },
  'GBP/USD': { symbol: 'GBP/USD', price: 1.2695, change24h: -0.22, volatility: 0.006 },
  'USD/JPY': { symbol: 'USD/JPY', price: 148.25, change24h: 0.35, volatility: 0.004 },
};

type RiskLevel = 'conservative' | 'moderate' | 'aggressive';

// Risk parameters based on level
const RISK_PARAMS: Record<RiskLevel, { maxPositions: number; positionSizePercent: number; stopLossPercent: number; takeProfitPercent: number }> = {
  conservative: { maxPositions: 3, positionSizePercent: 0.05, stopLossPercent: 0.02, takeProfitPercent: 0.03 },
  moderate: { maxPositions: 5, positionSizePercent: 0.10, stopLossPercent: 0.05, takeProfitPercent: 0.08 },
  aggressive: { maxPositions: 8, positionSizePercent: 0.15, stopLossPercent: 0.10, takeProfitPercent: 0.15 },
};

/**
 * Generate a random trade signal based on ML-like analysis
 */
function generateTradeSignal(riskLevel: RiskLevel): { symbol: string; side: 'long' | 'short'; confidence: number } | null {
  const symbols = Object.keys(MARKET_PRICES);
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const market = MARKET_PRICES[symbol];
  
  // Simulate ML confidence (60-95% for demo)
  const baseConfidence = 0.6 + Math.random() * 0.35;
  
  // Adjust confidence based on volatility and risk level
  const riskMultiplier = riskLevel === 'aggressive' ? 1.1 : riskLevel === 'moderate' ? 1.0 : 0.9;
  const confidence = Math.min(baseConfidence * riskMultiplier, 0.95);
  
  // Determine side based on market momentum
  const side = market.change24h > 0 ? 'long' : 'short';
  
  // Only generate signal if confidence is high enough
  const minConfidence = riskLevel === 'aggressive' ? 0.65 : riskLevel === 'moderate' ? 0.70 : 0.75;
  
  if (confidence >= minConfidence) {
    return { symbol, side, confidence };
  }
  
  return null;
}

/**
 * Calculate position size using Kelly Criterion (simplified)
 */
function calculatePositionSize(
  balance: number,
  confidence: number,
  riskLevel: RiskLevel
): number {
  const params = RISK_PARAMS[riskLevel];
  
  // Kelly fraction = (bp - q) / b where b = odds, p = win prob, q = loss prob
  // Simplified: use confidence as win probability
  const kellyFraction = confidence - (1 - confidence);
  
  // Apply risk level position size limit
  const maxSize = balance * params.positionSizePercent;
  const kellySize = balance * kellyFraction * 0.25; // Use 25% Kelly for safety
  
  return Math.min(maxSize, Math.max(kellySize, 100));
}

/**
 * Simulate price movement for a position
 */
function simulatePriceMovement(
  entryPrice: number,
  volatility: number,
  side: 'long' | 'short',
  hoursHeld: number
): number {
  // Random walk with drift
  const drift = (Math.random() - 0.48) * volatility * Math.sqrt(hoursHeld);
  const newPrice = entryPrice * (1 + drift);
  
  // Add slight bias toward profitable trades (65% win rate simulation)
  const profitBias = side === 'long' ? 0.002 : -0.002;
  
  return newPrice * (1 + profitBias);
}

/**
 * Create a new simulated trade
 */
export function createSimulatedTrade(
  balance: number,
  riskLevel: RiskLevel
): SimulatedTrade | null {
  const signal = generateTradeSignal(riskLevel);
  if (!signal) return null;
  
  const market = MARKET_PRICES[signal.symbol];
  const positionSize = calculatePositionSize(balance, signal.confidence, riskLevel);
  const quantity = positionSize / market.price;
  
  const type = signal.symbol.includes('/') 
    ? (signal.symbol.includes('USD') && signal.symbol.length > 7 ? 'forex' : 'crypto')
    : 'stock';
  
  return {
    id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    symbol: signal.symbol,
    type,
    side: signal.side,
    quantity: parseFloat(quantity.toFixed(type === 'forex' ? 0 : 4)),
    entryPrice: market.price,
    currentPrice: market.price,
    pnl: 0,
    pnlPercent: 0,
    openedAt: new Date().toISOString(),
    confidence: signal.confidence,
  };
}

/**
 * Update positions with simulated price movements
 */
export function updatePositions(positions: SimulatedTrade[]): SimulatedTrade[] {
  return positions.map(position => {
    const market = MARKET_PRICES[position.symbol];
    if (!market) return position;
    
    const hoursHeld = (Date.now() - new Date(position.openedAt).getTime()) / (1000 * 60 * 60);
    const newPrice = simulatePriceMovement(position.entryPrice, market.volatility, position.side, hoursHeld);
    
    const priceDiff = position.side === 'long' 
      ? newPrice - position.entryPrice 
      : position.entryPrice - newPrice;
    
    const pnl = priceDiff * position.quantity;
    const pnlPercent = (priceDiff / position.entryPrice) * 100;
    
    return {
      ...position,
      currentPrice: parseFloat(newPrice.toFixed(position.type === 'forex' ? 4 : 2)),
      pnl: parseFloat(pnl.toFixed(2)),
      pnlPercent: parseFloat(pnlPercent.toFixed(2)),
    };
  });
}

/**
 * Check if any positions should be closed (hit stop-loss or take-profit)
 */
export function checkPositionExits(
  positions: SimulatedTrade[],
  riskLevel: RiskLevel
): { toClose: SimulatedTrade[]; remaining: SimulatedTrade[] } {
  const params = RISK_PARAMS[riskLevel];
  const toClose: SimulatedTrade[] = [];
  const remaining: SimulatedTrade[] = [];
  
  positions.forEach(position => {
    const pnlPercent = Math.abs(position.pnlPercent) / 100;
    
    // Check stop-loss
    if (position.pnl < 0 && pnlPercent >= params.stopLossPercent) {
      toClose.push(position);
    }
    // Check take-profit
    else if (position.pnl > 0 && pnlPercent >= params.takeProfitPercent) {
      toClose.push(position);
    }
    else {
      remaining.push(position);
    }
  });
  
  return { toClose, remaining };
}

/**
 * Calculate portfolio metrics
 */
export function calculateMetrics(positions: SimulatedTrade[], closedTrades: SimulatedTrade[]): {
  totalPnl: number;
  totalPnlPercent: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
} {
  const allTrades = [...positions, ...closedTrades];
  
  if (allTrades.length === 0) {
    return { totalPnl: 0, totalPnlPercent: 0, winRate: 0, sharpeRatio: 0, maxDrawdown: 0 };
  }
  
  const totalPnl = allTrades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = allTrades.filter(t => t.pnl > 0).length;
  const winRate = (winningTrades / allTrades.length) * 100;
  
  // Simplified Sharpe ratio calculation
  const returns = allTrades.map(t => t.pnlPercent);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
  
  // Simplified max drawdown
  const maxDrawdown = Math.min(...returns.filter(r => r < 0), 0);
  
  return {
    totalPnl: parseFloat(totalPnl.toFixed(2)),
    totalPnlPercent: parseFloat((totalPnl / 100000 * 100).toFixed(2)), // Assuming 100k starting balance
    winRate: parseFloat(winRate.toFixed(1)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
  };
}
