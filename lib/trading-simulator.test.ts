import { describe, it, expect } from 'vitest';
import {
  createSimulatedTrade,
  updatePositions,
  checkPositionExits,
  calculateMetrics,
  SimulatedTrade,
} from './trading-simulator';

describe('Trading Simulator', () => {
  describe('createSimulatedTrade', () => {
    it('should create a trade with valid properties when signal is generated', () => {
      // Run multiple times since signal generation is probabilistic
      let trade: SimulatedTrade | null = null;
      for (let i = 0; i < 10; i++) {
        trade = createSimulatedTrade(100000, 'moderate');
        if (trade) break;
      }
      
      // May or may not generate a trade based on confidence threshold
      if (trade) {
        expect(trade.id).toBeDefined();
        expect(trade.symbol).toBeDefined();
        expect(['crypto', 'stock', 'forex']).toContain(trade.type);
        expect(['long', 'short']).toContain(trade.side);
        expect(trade.quantity).toBeGreaterThan(0);
        expect(trade.entryPrice).toBeGreaterThan(0);
        expect(trade.confidence).toBeGreaterThanOrEqual(0.6);
        expect(trade.confidence).toBeLessThanOrEqual(0.95);
      }
    });

    it('should respect risk level position sizing', () => {
      const balance = 100000;
      
      // Conservative should have smaller positions
      let conservativeTrade: SimulatedTrade | null = null;
      let aggressiveTrade: SimulatedTrade | null = null;
      
      for (let i = 0; i < 20; i++) {
        if (!conservativeTrade) {
          conservativeTrade = createSimulatedTrade(balance, 'conservative');
        }
        if (!aggressiveTrade) {
          aggressiveTrade = createSimulatedTrade(balance, 'aggressive');
        }
        if (conservativeTrade && aggressiveTrade) break;
      }
      
      // Both should be valid if generated
      if (conservativeTrade) {
        const conservativeValue = conservativeTrade.quantity * conservativeTrade.entryPrice;
        expect(conservativeValue).toBeLessThanOrEqual(balance * 0.06); // 5% max + rounding tolerance
      }
      
      if (aggressiveTrade) {
        const aggressiveValue = aggressiveTrade.quantity * aggressiveTrade.entryPrice;
        expect(aggressiveValue).toBeLessThanOrEqual(balance * 0.16); // 15% max + rounding tolerance
      }
    });
  });

  describe('updatePositions', () => {
    it('should update position prices and calculate P&L', () => {
      const mockPosition: SimulatedTrade = {
        id: 'test_1',
        symbol: 'BTC/USD',
        type: 'crypto',
        side: 'long',
        quantity: 1,
        entryPrice: 43250,
        currentPrice: 43250,
        pnl: 0,
        pnlPercent: 0,
        openedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        confidence: 0.8,
      };

      const updated = updatePositions([mockPosition]);
      
      expect(updated).toHaveLength(1);
      expect(updated[0].currentPrice).toBeDefined();
      expect(typeof updated[0].pnl).toBe('number');
      expect(typeof updated[0].pnlPercent).toBe('number');
    });

    it('should handle empty positions array', () => {
      const updated = updatePositions([]);
      expect(updated).toHaveLength(0);
    });
  });

  describe('checkPositionExits', () => {
    it('should close positions that hit stop-loss', () => {
      const losingPosition: SimulatedTrade = {
        id: 'test_loss',
        symbol: 'BTC/USD',
        type: 'crypto',
        side: 'long',
        quantity: 1,
        entryPrice: 43250,
        currentPrice: 40000,
        pnl: -3250,
        pnlPercent: -7.5, // Beyond moderate stop-loss of 5%
        openedAt: new Date().toISOString(),
        confidence: 0.8,
      };

      const result = checkPositionExits([losingPosition], 'moderate');
      
      expect(result.toClose).toHaveLength(1);
      expect(result.remaining).toHaveLength(0);
    });

    it('should close positions that hit take-profit', () => {
      const winningPosition: SimulatedTrade = {
        id: 'test_win',
        symbol: 'BTC/USD',
        type: 'crypto',
        side: 'long',
        quantity: 1,
        entryPrice: 43250,
        currentPrice: 47000,
        pnl: 3750,
        pnlPercent: 8.7, // Beyond moderate take-profit of 8%
        openedAt: new Date().toISOString(),
        confidence: 0.8,
      };

      const result = checkPositionExits([winningPosition], 'moderate');
      
      expect(result.toClose).toHaveLength(1);
      expect(result.remaining).toHaveLength(0);
    });

    it('should keep positions within thresholds', () => {
      const normalPosition: SimulatedTrade = {
        id: 'test_normal',
        symbol: 'BTC/USD',
        type: 'crypto',
        side: 'long',
        quantity: 1,
        entryPrice: 43250,
        currentPrice: 44000,
        pnl: 750,
        pnlPercent: 1.7, // Within thresholds
        openedAt: new Date().toISOString(),
        confidence: 0.8,
      };

      const result = checkPositionExits([normalPosition], 'moderate');
      
      expect(result.toClose).toHaveLength(0);
      expect(result.remaining).toHaveLength(1);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate correct metrics for winning trades', () => {
      const winningTrades: SimulatedTrade[] = [
        { id: '1', symbol: 'BTC/USD', type: 'crypto', side: 'long', quantity: 1, entryPrice: 43000, currentPrice: 44000, pnl: 1000, pnlPercent: 2.3, openedAt: new Date().toISOString(), confidence: 0.8 },
        { id: '2', symbol: 'ETH/USD', type: 'crypto', side: 'long', quantity: 10, entryPrice: 2200, currentPrice: 2300, pnl: 1000, pnlPercent: 4.5, openedAt: new Date().toISOString(), confidence: 0.75 },
      ];

      const metrics = calculateMetrics(winningTrades, []);
      
      expect(metrics.totalPnl).toBe(2000);
      expect(metrics.winRate).toBe(100);
      expect(metrics.sharpeRatio).toBeGreaterThan(0);
    });

    it('should calculate correct win rate with mixed trades', () => {
      const mixedTrades: SimulatedTrade[] = [
        { id: '1', symbol: 'BTC/USD', type: 'crypto', side: 'long', quantity: 1, entryPrice: 43000, currentPrice: 44000, pnl: 1000, pnlPercent: 2.3, openedAt: new Date().toISOString(), confidence: 0.8 },
        { id: '2', symbol: 'ETH/USD', type: 'crypto', side: 'long', quantity: 10, entryPrice: 2200, currentPrice: 2100, pnl: -1000, pnlPercent: -4.5, openedAt: new Date().toISOString(), confidence: 0.75 },
      ];

      const metrics = calculateMetrics(mixedTrades, []);
      
      expect(metrics.totalPnl).toBe(0);
      expect(metrics.winRate).toBe(50);
    });

    it('should handle empty trades array', () => {
      const metrics = calculateMetrics([], []);
      
      expect(metrics.totalPnl).toBe(0);
      expect(metrics.winRate).toBe(0);
      expect(metrics.sharpeRatio).toBe(0);
    });
  });
});
