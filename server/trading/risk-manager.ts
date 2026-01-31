/**
 * Risk Management Engine
 * Production-grade risk controls for autonomous trading
 * 
 * @author Sentinel (Sam Blackwood) + Jonny AI
 * @version 1.0.0
 */

import type { RiskLevel, RiskParameters, AlpacaPosition } from '../alpaca/types';
import { RISK_PRESETS } from '../alpaca/types';

// ============================================
// TYPES
// ============================================

export interface PortfolioState {
    portfolioValue: number;
    cash: number;
    buyingPower: number;
    positions: PositionInfo[];
    dailyPnL: number;
    realizedPnL: number;
    unrealizedPnL: number;
    startOfDayValue: number;
}

export interface PositionInfo {
    symbol: string;
    quantity: number;
    marketValue: number;
    costBasis: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    side: 'long' | 'short';
    weight: number; // % of portfolio
}

export interface RiskCheckResult {
    approved: boolean;
    reason?: string;
    warnings: string[];
    adjustedQuantity?: number;
    suggestedStopLoss?: number;
    suggestedTakeProfit?: number;
}

export interface RiskLimits {
    maxPositions: number;
    maxPositionValuePercent: number;
    maxDailyLossPercent: number;
    maxDrawdownPercent: number;
    maxSingleTradeRiskPercent: number;
    minConfidence: number;
    stopLossMultiplier: number;
    takeProfitMultiplier: number;
}

export interface CircuitBreakerState {
    isTripped: boolean;
    reason?: string;
    trippedAt?: Date;
    autoResetAt?: Date;
}

// ============================================
// RISK MANAGER CLASS
// ============================================

export class RiskManager {
    private riskLevel: RiskLevel;
    private limits: RiskLimits;
    private params: RiskParameters;
    private circuitBreaker: CircuitBreakerState = { isTripped: false };
    private peakPortfolioValue = 0;

    constructor(riskLevel: RiskLevel = 'moderate') {
        this.riskLevel = riskLevel;
        this.params = RISK_PRESETS[riskLevel];
        this.limits = this.calculateLimits(riskLevel);
    }

    // ============================================
    // CONFIGURATION
    // ============================================

    private calculateLimits(level: RiskLevel): RiskLimits {
        switch (level) {
            case 'conservative':
                return {
                    maxPositions: 3,
                    maxPositionValuePercent: 5,
                    maxDailyLossPercent: 2,
                    maxDrawdownPercent: 5,
                    maxSingleTradeRiskPercent: 1,
                    minConfidence: 0.75,
                    stopLossMultiplier: 1.5,
                    takeProfitMultiplier: 2,
                };
            case 'moderate':
                return {
                    maxPositions: 5,
                    maxPositionValuePercent: 10,
                    maxDailyLossPercent: 5,
                    maxDrawdownPercent: 10,
                    maxSingleTradeRiskPercent: 2,
                    minConfidence: 0.65,
                    stopLossMultiplier: 2,
                    takeProfitMultiplier: 3,
                };
            case 'aggressive':
                return {
                    maxPositions: 8,
                    maxPositionValuePercent: 15,
                    maxDailyLossPercent: 10,
                    maxDrawdownPercent: 20,
                    maxSingleTradeRiskPercent: 3,
                    minConfidence: 0.55,
                    stopLossMultiplier: 2.5,
                    takeProfitMultiplier: 4,
                };
        }
    }

    setRiskLevel(level: RiskLevel): void {
        this.riskLevel = level;
        this.params = RISK_PRESETS[level];
        this.limits = this.calculateLimits(level);
    }

    // ============================================
    // PRE-TRADE RISK CHECKS
    // ============================================

    /**
     * Main risk check before executing a trade
     */
    checkTradeRisk(
        portfolio: PortfolioState,
        symbol: string,
        side: 'buy' | 'sell',
        quantity: number,
        price: number,
        confidence: number,
        atr: number
    ): RiskCheckResult {
        const warnings: string[] = [];

        // Check circuit breaker first
        if (this.circuitBreaker.isTripped) {
            return {
                approved: false,
                reason: `Circuit breaker tripped: ${this.circuitBreaker.reason}`,
                warnings,
            };
        }

        // 1. Confidence threshold
        if (confidence < this.limits.minConfidence) {
            return {
                approved: false,
                reason: `Signal confidence ${(confidence * 100).toFixed(1)}% below minimum ${(this.limits.minConfidence * 100).toFixed(0)}%`,
                warnings,
            };
        }

        // 2. Position count limit
        if (side === 'buy' && portfolio.positions.length >= this.limits.maxPositions) {
            const existingPosition = portfolio.positions.find(p => p.symbol === symbol);
            if (!existingPosition) {
                return {
                    approved: false,
                    reason: `Maximum ${this.limits.maxPositions} positions reached`,
                    warnings,
                };
            }
        }

        // 3. Daily loss limit check
        const dailyLossPercent = Math.abs(portfolio.dailyPnL / portfolio.startOfDayValue) * 100;
        if (portfolio.dailyPnL < 0 && dailyLossPercent >= this.limits.maxDailyLossPercent) {
            this.tripCircuitBreaker(`Daily loss limit ${this.limits.maxDailyLossPercent}% exceeded`);
            return {
                approved: false,
                reason: `Daily loss limit exceeded: -${dailyLossPercent.toFixed(2)}%`,
                warnings,
            };
        }

        // Warn if approaching daily loss limit
        if (portfolio.dailyPnL < 0 && dailyLossPercent >= this.limits.maxDailyLossPercent * 0.75) {
            warnings.push(`Approaching daily loss limit: -${dailyLossPercent.toFixed(2)}%`);
        }

        // 4. Drawdown check
        if (portfolio.portfolioValue > this.peakPortfolioValue) {
            this.peakPortfolioValue = portfolio.portfolioValue;
        }

        const drawdownPercent = ((this.peakPortfolioValue - portfolio.portfolioValue) / this.peakPortfolioValue) * 100;
        if (drawdownPercent >= this.limits.maxDrawdownPercent) {
            this.tripCircuitBreaker(`Max drawdown ${this.limits.maxDrawdownPercent}% exceeded`);
            return {
                approved: false,
                reason: `Max drawdown exceeded: -${drawdownPercent.toFixed(2)}%`,
                warnings,
            };
        }

        // Warn if approaching drawdown limit
        if (drawdownPercent >= this.limits.maxDrawdownPercent * 0.75) {
            warnings.push(`Approaching max drawdown: -${drawdownPercent.toFixed(2)}%`);
        }

        // 5. Position size check
        const tradeValue = quantity * price;
        const positionPercent = (tradeValue / portfolio.portfolioValue) * 100;

        let adjustedQuantity = quantity;

        if (positionPercent > this.limits.maxPositionValuePercent) {
            // Adjust quantity to fit within limits
            const maxValue = portfolio.portfolioValue * (this.limits.maxPositionValuePercent / 100);
            adjustedQuantity = Math.floor(maxValue / price);

            warnings.push(`Position size reduced from ${quantity} to ${adjustedQuantity} shares`);
        }

        // 6. Buying power check
        const requiredBuyingPower = adjustedQuantity * price;
        if (side === 'buy' && requiredBuyingPower > portfolio.buyingPower) {
            // Try to adjust quantity to available buying power
            const affordableQty = Math.floor(portfolio.buyingPower * 0.95 / price); // Leave 5% buffer

            if (affordableQty < 1) {
                return {
                    approved: false,
                    reason: 'Insufficient buying power',
                    warnings,
                };
            }

            adjustedQuantity = Math.min(adjustedQuantity, affordableQty);
            warnings.push(`Quantity adjusted to ${adjustedQuantity} based on available buying power`);
        }

        // 7. Check for correlated positions (basic implementation)
        // In production, this would check sector/asset class correlation
        const sameAssetPositions = portfolio.positions.filter(p =>
            p.symbol.includes(symbol.substring(0, 3)) || symbol.includes(p.symbol.substring(0, 3))
        );
        if (sameAssetPositions.length > 2) {
            warnings.push('Multiple correlated positions detected');
        }

        // 8. Calculate risk-adjusted stop loss and take profit
        const stopLossDistance = atr * this.limits.stopLossMultiplier;
        const takeProfitDistance = atr * this.limits.takeProfitMultiplier;

        const suggestedStopLoss = side === 'buy'
            ? price - stopLossDistance
            : price + stopLossDistance;

        const suggestedTakeProfit = side === 'buy'
            ? price + takeProfitDistance
            : price - takeProfitDistance;

        // Final approval
        if (adjustedQuantity < 1) {
            return {
                approved: false,
                reason: 'Adjusted quantity less than minimum (1 share)',
                warnings,
            };
        }

        return {
            approved: true,
            warnings,
            adjustedQuantity,
            suggestedStopLoss: parseFloat(suggestedStopLoss.toFixed(2)),
            suggestedTakeProfit: parseFloat(suggestedTakeProfit.toFixed(2)),
        };
    }

    // ============================================
    // POSITION SIZING (KELLY CRITERION)
    // ============================================

    /**
     * Calculate optimal position size using Kelly Criterion
     */
    calculatePositionSize(
        portfolioValue: number,
        buyingPower: number,
        price: number,
        confidence: number,
        atr: number
    ): { quantity: number; value: number; riskPercent: number } {
        // Base Kelly fraction: f* = (bp - q) / b
        // Where: b = odds (reward/risk), p = probability of win, q = probability of loss
        const winProbability = confidence;
        const lossProbability = 1 - confidence;

        // Estimate reward/risk ratio based on ATR
        const expectedReward = atr * this.limits.takeProfitMultiplier;
        const expectedLoss = atr * this.limits.stopLossMultiplier;
        const odds = expectedReward / expectedLoss;

        // Full Kelly
        let kellyFraction = (odds * winProbability - lossProbability) / odds;

        // Use fractional Kelly (25-50% of full Kelly for safety)
        const kellyMultiplier = this.riskLevel === 'aggressive' ? 0.5 :
            this.riskLevel === 'moderate' ? 0.35 : 0.25;
        kellyFraction = Math.max(0, kellyFraction * kellyMultiplier);

        // Apply position size limits
        const maxPositionFraction = this.limits.maxPositionValuePercent / 100;
        const positionFraction = Math.min(kellyFraction, maxPositionFraction);

        // Calculate actual position
        const positionValue = portfolioValue * positionFraction;
        const maxAffordable = buyingPower * 0.95; // Leave 5% buffer
        const finalValue = Math.min(positionValue, maxAffordable);
        const quantity = Math.floor(finalValue / price);

        return {
            quantity,
            value: quantity * price,
            riskPercent: (quantity * price / portfolioValue) * 100,
        };
    }

    // ============================================
    // CIRCUIT BREAKER
    // ============================================

    tripCircuitBreaker(reason: string): void {
        this.circuitBreaker = {
            isTripped: true,
            reason,
            trippedAt: new Date(),
            autoResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset after 24 hours
        };

        console.error(`[RiskManager] ⚠️ CIRCUIT BREAKER TRIPPED: ${reason}`);
    }

    resetCircuitBreaker(manual = false): void {
        if (manual || (this.circuitBreaker.autoResetAt && new Date() >= this.circuitBreaker.autoResetAt)) {
            this.circuitBreaker = { isTripped: false };
            console.log('[RiskManager] Circuit breaker reset');
        }
    }

    getCircuitBreakerState(): CircuitBreakerState {
        return { ...this.circuitBreaker };
    }

    isCircuitBreakerTripped(): boolean {
        // Check for auto-reset
        if (this.circuitBreaker.autoResetAt && new Date() >= this.circuitBreaker.autoResetAt) {
            this.resetCircuitBreaker();
        }
        return this.circuitBreaker.isTripped;
    }

    // ============================================
    // POSITION MONITORING
    // ============================================

    /**
     * Check if any positions need to be closed (hit stop-loss or take-profit)
     */
    checkPositionExits(
        positions: PositionInfo[],
        currentPrices: Record<string, number>,
        stopLosses: Record<string, number>,
        takeProfits: Record<string, number>
    ): { toClose: string[]; reasons: Record<string, string> } {
        const toClose: string[] = [];
        const reasons: Record<string, string> = {};

        for (const position of positions) {
            const currentPrice = currentPrices[position.symbol];
            if (!currentPrice) continue;

            const stopLoss = stopLosses[position.symbol];
            const takeProfit = takeProfits[position.symbol];

            if (position.side === 'long') {
                if (stopLoss && currentPrice <= stopLoss) {
                    toClose.push(position.symbol);
                    reasons[position.symbol] = `Stop-loss triggered at ${currentPrice}`;
                } else if (takeProfit && currentPrice >= takeProfit) {
                    toClose.push(position.symbol);
                    reasons[position.symbol] = `Take-profit reached at ${currentPrice}`;
                }
            } else {
                // Short position
                if (stopLoss && currentPrice >= stopLoss) {
                    toClose.push(position.symbol);
                    reasons[position.symbol] = `Stop-loss triggered at ${currentPrice}`;
                } else if (takeProfit && currentPrice <= takeProfit) {
                    toClose.push(position.symbol);
                    reasons[position.symbol] = `Take-profit reached at ${currentPrice}`;
                }
            }

            // Check for extreme individual position loss
            if (position.unrealizedPnLPercent < -this.limits.maxDailyLossPercent * 2) {
                toClose.push(position.symbol);
                reasons[position.symbol] = `Extreme loss: ${position.unrealizedPnLPercent.toFixed(2)}%`;
            }
        }

        return { toClose, reasons };
    }

    /**
     * Emergency liquidation check
     */
    shouldEmergencyLiquidate(portfolio: PortfolioState): { shouldLiquidate: boolean; reason?: string } {
        // Check for catastrophic loss
        const totalPnLPercent = (portfolio.dailyPnL / portfolio.startOfDayValue) * 100;

        if (totalPnLPercent < -this.limits.maxDailyLossPercent * 2) {
            return {
                shouldLiquidate: true,
                reason: `Catastrophic daily loss: ${totalPnLPercent.toFixed(2)}%`,
            };
        }

        // Check drawdown
        const drawdown = ((this.peakPortfolioValue - portfolio.portfolioValue) / this.peakPortfolioValue) * 100;
        if (drawdown > this.limits.maxDrawdownPercent * 1.5) {
            return {
                shouldLiquidate: true,
                reason: `Severe drawdown: ${drawdown.toFixed(2)}%`,
            };
        }

        return { shouldLiquidate: false };
    }

    // ============================================
    // PORTFOLIO METRICS
    // ============================================

    calculateRiskMetrics(portfolio: PortfolioState): {
        drawdown: number;
        dailyPnLPercent: number;
        totalExposure: number;
        largestPosition: { symbol: string; weight: number } | null;
        riskScore: number; // 0-100, higher = more risky
    } {
        const drawdown = this.peakPortfolioValue > 0
            ? ((this.peakPortfolioValue - portfolio.portfolioValue) / this.peakPortfolioValue) * 100
            : 0;

        const dailyPnLPercent = portfolio.startOfDayValue > 0
            ? (portfolio.dailyPnL / portfolio.startOfDayValue) * 100
            : 0;

        const totalExposure = portfolio.positions.reduce((sum, p) => sum + Math.abs(p.marketValue), 0);
        const exposurePercent = (totalExposure / portfolio.portfolioValue) * 100;

        // Find largest position
        const sortedPositions = [...portfolio.positions].sort((a, b) => b.weight - a.weight);
        const largestPosition = sortedPositions.length > 0
            ? { symbol: sortedPositions[0].symbol, weight: sortedPositions[0].weight }
            : null;

        // Calculate overall risk score
        let riskScore = 0;

        // Drawdown contribution (0-30 points)
        riskScore += Math.min(30, (drawdown / this.limits.maxDrawdownPercent) * 30);

        // Daily loss contribution (0-30 points)
        if (dailyPnLPercent < 0) {
            riskScore += Math.min(30, (Math.abs(dailyPnLPercent) / this.limits.maxDailyLossPercent) * 30);
        }

        // Exposure/concentration contribution (0-20 points)
        riskScore += Math.min(20, (exposurePercent / 100) * 20);

        // Position concentration (0-20 points)
        if (largestPosition && largestPosition.weight > this.limits.maxPositionValuePercent) {
            riskScore += 20;
        } else if (largestPosition) {
            riskScore += (largestPosition.weight / this.limits.maxPositionValuePercent) * 20;
        }

        return {
            drawdown: parseFloat(drawdown.toFixed(2)),
            dailyPnLPercent: parseFloat(dailyPnLPercent.toFixed(2)),
            totalExposure: parseFloat(exposurePercent.toFixed(2)),
            largestPosition,
            riskScore: Math.min(100, Math.round(riskScore)),
        };
    }

    // ============================================
    // STATUS
    // ============================================

    getStatus(): {
        riskLevel: RiskLevel;
        limits: RiskLimits;
        circuitBreaker: CircuitBreakerState;
        peakValue: number;
    } {
        return {
            riskLevel: this.riskLevel,
            limits: { ...this.limits },
            circuitBreaker: { ...this.circuitBreaker },
            peakValue: this.peakPortfolioValue,
        };
    }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let riskManagerInstance: RiskManager | null = null;

export function getRiskManager(): RiskManager {
    if (!riskManagerInstance) {
        riskManagerInstance = new RiskManager('moderate');
    }
    return riskManagerInstance;
}

export function initRiskManager(level: RiskLevel): RiskManager {
    riskManagerInstance = new RiskManager(level);
    return riskManagerInstance;
}
