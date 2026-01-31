/**
 * Trading Signal Generator
 * ML-inspired signal generation using technical analysis
 * 
 * @author Jonny AI (The Architect)
 * @version 1.0.0
 */

import {
    SMA,
    EMA,
    RSI,
    MACD,
    BollingerBands,
    ATR,
    ADX,
    Stochastic,
    getLastValid,
    historicalVolatility,
    type OHLCV,
} from './indicators';

// ============================================
// TYPES
// ============================================

export type SignalType = 'entry_long' | 'entry_short' | 'exit' | 'hold';
export type SignalStrength = 'weak' | 'moderate' | 'strong';

export interface TradingSignal {
    symbol: string;
    signalType: SignalType;
    confidence: number; // 0-1
    strength: SignalStrength;
    targetPrice: number | null;
    stopLossPrice: number | null;
    takeProfitPrice: number | null;
    reason: string;
    indicators: IndicatorSnapshot;
    timestamp: Date;
}

export interface IndicatorSnapshot {
    rsi: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    sma20: number;
    sma50: number;
    sma200: number;
    ema12: number;
    ema26: number;
    bollingerUpper: number;
    bollingerMiddle: number;
    bollingerLower: number;
    atr: number;
    adx: number;
    stochK: number;
    stochD: number;
    volatility: number;
    price: number;
}

export interface SignalResult {
    signal: TradingSignal;
    rawScores: {
        momentum: number;
        trend: number;
        volatility: number;
        volume: number;
        overall: number;
    };
}

// ============================================
// SIGNAL GENERATOR CLASS
// ============================================

export class SignalGenerator {
    private minimumBars = 200;
    private overboughtRSI = 70;
    private oversoldRSI = 30;
    private strongTrendADX = 25;

    /**
     * Generate trading signal from OHLCV data
     */
    generateSignal(symbol: string, bars: OHLCV[]): SignalResult | null {
        if (bars.length < this.minimumBars) {
            console.warn(`[SignalGenerator] Insufficient data for ${symbol}: ${bars.length}/${this.minimumBars} bars`);
            return null;
        }

        // Extract price arrays
        const opens = bars.map(b => b.open);
        const highs = bars.map(b => b.high);
        const lows = bars.map(b => b.low);
        const closes = bars.map(b => b.close);
        const volumes = bars.map(b => b.volume);

        // Calculate indicators
        const indicators = this.calculateIndicators(opens, highs, lows, closes, volumes);

        // Score each component
        const scores = this.calculateScores(indicators, closes);

        // Determine signal
        const signal = this.determineSignal(symbol, indicators, scores);

        return {
            signal,
            rawScores: scores,
        };
    }

    /**
     * Calculate all technical indicators
     */
    private calculateIndicators(
        opens: number[],
        highs: number[],
        lows: number[],
        closes: number[],
        volumes: number[]
    ): IndicatorSnapshot {
        const currentPrice = closes[closes.length - 1];

        // Moving Averages
        const sma20 = getLastValid(SMA(closes, 20)) || currentPrice;
        const sma50 = getLastValid(SMA(closes, 50)) || currentPrice;
        const sma200 = getLastValid(SMA(closes, 200)) || currentPrice;
        const ema12 = getLastValid(EMA(closes, 12)) || currentPrice;
        const ema26 = getLastValid(EMA(closes, 26)) || currentPrice;

        // RSI
        const rsiValues = RSI(closes, 14);
        const rsi = getLastValid(rsiValues) || 50;

        // MACD
        const macdResult = MACD(closes, 12, 26, 9);
        const macd = getLastValid(macdResult.macd) || 0;
        const macdSignal = getLastValid(macdResult.signal) || 0;
        const macdHistogram = getLastValid(macdResult.histogram) || 0;

        // Bollinger Bands
        const bb = BollingerBands(closes, 20, 2);
        const bollingerUpper = getLastValid(bb.upper) || currentPrice * 1.02;
        const bollingerMiddle = getLastValid(bb.middle) || currentPrice;
        const bollingerLower = getLastValid(bb.lower) || currentPrice * 0.98;

        // ATR
        const atrValues = ATR(highs, lows, closes, 14);
        const atr = getLastValid(atrValues) || currentPrice * 0.02;

        // ADX
        const adxResult = ADX(highs, lows, closes, 14);
        const adx = getLastValid(adxResult.adx) || 20;

        // Stochastic
        const stoch = Stochastic(highs, lows, closes, 14, 3);
        const stochK = getLastValid(stoch.k) || 50;
        const stochD = getLastValid(stoch.d) || 50;

        // Volatility
        const volatility = historicalVolatility(closes, 20);

        return {
            price: currentPrice,
            rsi,
            macd,
            macdSignal,
            macdHistogram,
            sma20,
            sma50,
            sma200,
            ema12,
            ema26,
            bollingerUpper,
            bollingerMiddle,
            bollingerLower,
            atr,
            adx,
            stochK,
            stochD,
            volatility,
        };
    }

    /**
     * Calculate component scores
     */
    private calculateScores(
        indicators: IndicatorSnapshot,
        closes: number[]
    ): { momentum: number; trend: number; volatility: number; volume: number; overall: number } {
        const { price, rsi, macd, macdSignal, macdHistogram, sma20, sma50, sma200, adx, stochK, bollingerUpper, bollingerLower } = indicators;

        // Momentum Score (-1 to 1)
        let momentumScore = 0;

        // RSI contribution
        if (rsi < this.oversoldRSI) {
            momentumScore += 0.3 * (1 - rsi / this.oversoldRSI); // Bullish
        } else if (rsi > this.overboughtRSI) {
            momentumScore -= 0.3 * ((rsi - this.overboughtRSI) / (100 - this.overboughtRSI)); // Bearish
        }

        // MACD contribution
        if (macd > macdSignal && macdHistogram > 0) {
            momentumScore += 0.25;
        } else if (macd < macdSignal && macdHistogram < 0) {
            momentumScore -= 0.25;
        }

        // MACD histogram trend
        if (macdHistogram > 0) {
            momentumScore += 0.15;
        } else {
            momentumScore -= 0.15;
        }

        // Stochastic contribution
        if (stochK < 20) {
            momentumScore += 0.2;
        } else if (stochK > 80) {
            momentumScore -= 0.2;
        }

        // Trend Score (-1 to 1)
        let trendScore = 0;

        // Price vs SMAs
        if (price > sma20) trendScore += 0.15;
        else trendScore -= 0.15;

        if (price > sma50) trendScore += 0.2;
        else trendScore -= 0.2;

        if (price > sma200) trendScore += 0.25;
        else trendScore -= 0.25;

        // SMA alignment (Golden/Death Cross area)
        if (sma20 > sma50 && sma50 > sma200) {
            trendScore += 0.3; // Strong uptrend
        } else if (sma20 < sma50 && sma50 < sma200) {
            trendScore -= 0.3; // Strong downtrend
        }

        // ADX strength modifier
        if (adx > this.strongTrendADX) {
            trendScore *= 1.2; // Amplify score in strong trends
        }

        // Volatility Score (-1 to 1, lower volatility is safer for entries)
        let volatilityScore = 0;

        // Bollinger Band position
        const bbWidth = (bollingerUpper - bollingerLower) / indicators.bollingerMiddle;
        if (price < bollingerLower) {
            volatilityScore += 0.4; // Oversold
        } else if (price > bollingerUpper) {
            volatilityScore -= 0.4; // Overbought
        }

        // BB width (squeeze indicator)
        if (bbWidth < 0.04) {
            volatilityScore += 0.2; // Squeeze forming
        }

        // Volume Score (placeholder - would need OBV/volume analysis)
        const volumeScore = 0; // Neutral for now

        // Overall Score (weighted average)
        const overall = (
            momentumScore * 0.35 +
            trendScore * 0.35 +
            volatilityScore * 0.20 +
            volumeScore * 0.10
        );

        return {
            momentum: Math.max(-1, Math.min(1, momentumScore)),
            trend: Math.max(-1, Math.min(1, trendScore)),
            volatility: Math.max(-1, Math.min(1, volatilityScore)),
            volume: volumeScore,
            overall: Math.max(-1, Math.min(1, overall)),
        };
    }

    /**
     * Determine the final signal based on scores
     */
    private determineSignal(
        symbol: string,
        indicators: IndicatorSnapshot,
        scores: { momentum: number; trend: number; volatility: number; volume: number; overall: number }
    ): TradingSignal {
        const { price, atr, bollingerLower, bollingerUpper } = indicators;
        const { overall, momentum, trend } = scores;

        let signalType: SignalType;
        let strength: SignalStrength;
        let confidence: number;
        let targetPrice: number | null = null;
        let stopLossPrice: number | null = null;
        let takeProfitPrice: number | null = null;
        let reason: string;

        // Convert overall score to confidence (0-1)
        confidence = (Math.abs(overall) + 1) / 2;

        // Determine signal type and strength
        if (overall > 0.4) {
            signalType = 'entry_long';
            strength = overall > 0.6 ? 'strong' : overall > 0.5 ? 'moderate' : 'weak';

            // Calculate targets for long
            stopLossPrice = price - 2 * atr;
            takeProfitPrice = price + 3 * atr;
            targetPrice = takeProfitPrice;

            reason = this.generateLongReason(indicators, scores);
        } else if (overall < -0.4) {
            signalType = 'entry_short';
            strength = overall < -0.6 ? 'strong' : overall < -0.5 ? 'moderate' : 'weak';

            // Calculate targets for short
            stopLossPrice = price + 2 * atr;
            takeProfitPrice = price - 3 * atr;
            targetPrice = takeProfitPrice;

            reason = this.generateShortReason(indicators, scores);
        } else {
            signalType = 'hold';
            strength = 'weak';
            confidence = 0.5;
            reason = 'No clear trend or opportunity. Waiting for better setup.';
        }

        return {
            symbol,
            signalType,
            confidence: parseFloat(confidence.toFixed(4)),
            strength,
            targetPrice: targetPrice ? parseFloat(targetPrice.toFixed(2)) : null,
            stopLossPrice: stopLossPrice ? parseFloat(stopLossPrice.toFixed(2)) : null,
            takeProfitPrice: takeProfitPrice ? parseFloat(takeProfitPrice.toFixed(2)) : null,
            reason,
            indicators,
            timestamp: new Date(),
        };
    }

    /**
     * Generate explanation for long signal
     */
    private generateLongReason(indicators: IndicatorSnapshot, scores: { momentum: number; trend: number }): string {
        const reasons: string[] = [];

        if (indicators.rsi < 35) {
            reasons.push(`RSI oversold at ${indicators.rsi.toFixed(1)}`);
        }

        if (indicators.macdHistogram > 0 && indicators.macd > indicators.macdSignal) {
            reasons.push('MACD bullish crossover');
        }

        if (indicators.price > indicators.sma200) {
            reasons.push('Price above 200 SMA (long-term uptrend)');
        }

        if (indicators.price < indicators.bollingerLower) {
            reasons.push('Price below lower Bollinger Band (oversold)');
        }

        if (indicators.stochK < 25) {
            reasons.push(`Stochastic oversold at ${indicators.stochK.toFixed(1)}`);
        }

        if (scores.trend > 0.3) {
            reasons.push('Strong upward trend alignment');
        }

        return reasons.length > 0
            ? `LONG SIGNAL: ${reasons.join('. ')}.`
            : 'LONG SIGNAL: Multiple bullish indicators aligned.';
    }

    /**
     * Generate explanation for short signal
     */
    private generateShortReason(indicators: IndicatorSnapshot, scores: { momentum: number; trend: number }): string {
        const reasons: string[] = [];

        if (indicators.rsi > 65) {
            reasons.push(`RSI overbought at ${indicators.rsi.toFixed(1)}`);
        }

        if (indicators.macdHistogram < 0 && indicators.macd < indicators.macdSignal) {
            reasons.push('MACD bearish crossover');
        }

        if (indicators.price < indicators.sma200) {
            reasons.push('Price below 200 SMA (long-term downtrend)');
        }

        if (indicators.price > indicators.bollingerUpper) {
            reasons.push('Price above upper Bollinger Band (overbought)');
        }

        if (indicators.stochK > 75) {
            reasons.push(`Stochastic overbought at ${indicators.stochK.toFixed(1)}`);
        }

        if (scores.trend < -0.3) {
            reasons.push('Strong downward trend alignment');
        }

        return reasons.length > 0
            ? `SHORT SIGNAL: ${reasons.join('. ')}.`
            : 'SHORT SIGNAL: Multiple bearish indicators aligned.';
    }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let signalGeneratorInstance: SignalGenerator | null = null;

export function getSignalGenerator(): SignalGenerator {
    if (!signalGeneratorInstance) {
        signalGeneratorInstance = new SignalGenerator();
    }
    return signalGeneratorInstance;
}
