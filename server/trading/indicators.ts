/**
 * Technical Analysis Indicators Library
 * Production-ready calculations for trading signals
 * 
 * @author Jonny AI (The Architect)
 * @version 1.0.0
 */

export interface OHLCV {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp?: string | Date;
}

// ============================================
// MOVING AVERAGES
// ============================================

/**
 * Simple Moving Average
 */
export function SMA(data: number[], period: number): number[] {
    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(NaN);
            continue;
        }

        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
    }

    return result;
}

/**
 * Exponential Moving Average
 */
export function EMA(data: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);

    // First EMA is just the SMA
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(NaN);
            continue;
        }

        if (i === period - 1) {
            result.push(ema);
            continue;
        }

        ema = (data[i] - ema) * multiplier + ema;
        result.push(ema);
    }

    return result;
}

/**
 * Weighted Moving Average
 */
export function WMA(data: number[], period: number): number[] {
    const result: number[] = [];
    const weights = Array.from({ length: period }, (_, i) => i + 1);
    const weightSum = weights.reduce((a, b) => a + b, 0);

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(NaN);
            continue;
        }

        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - period + 1 + j] * weights[j];
        }
        result.push(sum / weightSum);
    }

    return result;
}

// ============================================
// MOMENTUM INDICATORS
// ============================================

/**
 * Relative Strength Index (RSI)
 */
export function RSI(data: number[], period = 14): number[] {
    const result: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate gains and losses
    for (let i = 1; i < data.length; i++) {
        const change = data[i] - data[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate RSI
    for (let i = 0; i < data.length; i++) {
        if (i < period) {
            result.push(NaN);
            continue;
        }

        const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;

        if (avgLoss === 0) {
            result.push(100);
        } else {
            const rs = avgGain / avgLoss;
            result.push(100 - (100 / (1 + rs)));
        }
    }

    return result;
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
export function MACD(
    data: number[],
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
    const fastEMA = EMA(data, fastPeriod);
    const slowEMA = EMA(data, slowPeriod);

    // MACD line
    const macdLine = fastEMA.map((fast, i) => {
        if (isNaN(fast) || isNaN(slowEMA[i])) return NaN;
        return fast - slowEMA[i];
    });

    // Signal line (EMA of MACD)
    const validMacd = macdLine.filter(v => !isNaN(v));
    const signalEMA = EMA(validMacd, signalPeriod);

    const signal: number[] = [];
    let signalIdx = 0;
    for (let i = 0; i < macdLine.length; i++) {
        if (isNaN(macdLine[i])) {
            signal.push(NaN);
        } else {
            signal.push(signalEMA[signalIdx] || NaN);
            signalIdx++;
        }
    }

    // Histogram
    const histogram = macdLine.map((macd, i) => {
        if (isNaN(macd) || isNaN(signal[i])) return NaN;
        return macd - signal[i];
    });

    return { macd: macdLine, signal, histogram };
}

/**
 * Stochastic Oscillator
 */
export function Stochastic(
    highs: number[],
    lows: number[],
    closes: number[],
    kPeriod = 14,
    dPeriod = 3
): { k: number[]; d: number[] } {
    const k: number[] = [];

    for (let i = 0; i < closes.length; i++) {
        if (i < kPeriod - 1) {
            k.push(NaN);
            continue;
        }

        const highSlice = highs.slice(i - kPeriod + 1, i + 1);
        const lowSlice = lows.slice(i - kPeriod + 1, i + 1);

        const highestHigh = Math.max(...highSlice);
        const lowestLow = Math.min(...lowSlice);

        if (highestHigh === lowestLow) {
            k.push(50);
        } else {
            k.push(((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100);
        }
    }

    const d = SMA(k.map(v => isNaN(v) ? 0 : v), dPeriod);

    return { k, d };
}

// ============================================
// VOLATILITY INDICATORS
// ============================================

/**
 * Bollinger Bands
 */
export function BollingerBands(
    data: number[],
    period = 20,
    stdDevMultiplier = 2
): { upper: number[]; middle: number[]; lower: number[] } {
    const middle = SMA(data, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            upper.push(NaN);
            lower.push(NaN);
            continue;
        }

        const slice = data.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
        const stdDev = Math.sqrt(variance);

        upper.push(middle[i] + stdDevMultiplier * stdDev);
        lower.push(middle[i] - stdDevMultiplier * stdDev);
    }

    return { upper, middle, lower };
}

/**
 * Average True Range (ATR)
 */
export function ATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period = 14
): number[] {
    const trueRanges: number[] = [];

    for (let i = 0; i < closes.length; i++) {
        if (i === 0) {
            trueRanges.push(highs[i] - lows[i]);
            continue;
        }

        const tr = Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        );
        trueRanges.push(tr);
    }

    return EMA(trueRanges, period);
}

/**
 * Standard Deviation
 */
export function StdDev(data: number[], period = 20): number[] {
    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(NaN);
            continue;
        }

        const slice = data.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
        result.push(Math.sqrt(variance));
    }

    return result;
}

// ============================================
// VOLUME INDICATORS
// ============================================

/**
 * On-Balance Volume (OBV)
 */
export function OBV(closes: number[], volumes: number[]): number[] {
    const result: number[] = [0];

    for (let i = 1; i < closes.length; i++) {
        if (closes[i] > closes[i - 1]) {
            result.push(result[i - 1] + volumes[i]);
        } else if (closes[i] < closes[i - 1]) {
            result.push(result[i - 1] - volumes[i]);
        } else {
            result.push(result[i - 1]);
        }
    }

    return result;
}

/**
 * Volume Weighted Average Price (VWAP)
 */
export function VWAP(
    highs: number[],
    lows: number[],
    closes: number[],
    volumes: number[]
): number[] {
    const result: number[] = [];
    let cumulativeTPV = 0;
    let cumulativeVolume = 0;

    for (let i = 0; i < closes.length; i++) {
        const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
        cumulativeTPV += typicalPrice * volumes[i];
        cumulativeVolume += volumes[i];

        result.push(cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : 0);
    }

    return result;
}

// ============================================
// TREND INDICATORS
// ============================================

/**
 * Average Directional Index (ADX)
 */
export function ADX(
    highs: number[],
    lows: number[],
    closes: number[],
    period = 14
): { adx: number[]; plusDI: number[]; minusDI: number[] } {
    const plusDM: number[] = [];
    const minusDM: number[] = [];
    const tr: number[] = [];

    for (let i = 1; i < closes.length; i++) {
        const upMove = highs[i] - highs[i - 1];
        const downMove = lows[i - 1] - lows[i];

        plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
        minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

        tr.push(Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        ));
    }

    const smoothedTR = EMA(tr, period);
    const smoothedPlusDM = EMA(plusDM, period);
    const smoothedMinusDM = EMA(minusDM, period);

    const plusDI: number[] = [NaN];
    const minusDI: number[] = [NaN];
    const dx: number[] = [];

    for (let i = 0; i < smoothedTR.length; i++) {
        if (isNaN(smoothedTR[i]) || smoothedTR[i] === 0) {
            plusDI.push(NaN);
            minusDI.push(NaN);
            continue;
        }

        const pdi = (smoothedPlusDM[i] / smoothedTR[i]) * 100;
        const mdi = (smoothedMinusDM[i] / smoothedTR[i]) * 100;

        plusDI.push(pdi);
        minusDI.push(mdi);

        const diSum = pdi + mdi;
        dx.push(diSum > 0 ? (Math.abs(pdi - mdi) / diSum) * 100 : 0);
    }

    const adx = EMA(dx, period);

    return {
        adx: [NaN, ...adx],
        plusDI,
        minusDI,
    };
}

/**
 * Parabolic SAR
 */
export function ParabolicSAR(
    highs: number[],
    lows: number[],
    afStart = 0.02,
    afIncrement = 0.02,
    afMax = 0.2
): { sar: number[]; trend: ('up' | 'down')[] } {
    const sar: number[] = [];
    const trend: ('up' | 'down')[] = [];

    let isUptrend = true;
    let af = afStart;
    let ep = highs[0];
    let sarValue = lows[0];

    for (let i = 0; i < highs.length; i++) {
        if (i === 0) {
            sar.push(sarValue);
            trend.push('up');
            continue;
        }

        // Calculate new SAR
        sarValue = sarValue + af * (ep - sarValue);

        // Check for trend reversal
        if (isUptrend) {
            if (lows[i] < sarValue) {
                isUptrend = false;
                sarValue = ep;
                af = afStart;
                ep = lows[i];
            } else {
                if (highs[i] > ep) {
                    ep = highs[i];
                    af = Math.min(af + afIncrement, afMax);
                }
                sarValue = Math.min(sarValue, lows[i - 1], i > 1 ? lows[i - 2] : lows[i - 1]);
            }
        } else {
            if (highs[i] > sarValue) {
                isUptrend = true;
                sarValue = ep;
                af = afStart;
                ep = highs[i];
            } else {
                if (lows[i] < ep) {
                    ep = lows[i];
                    af = Math.min(af + afIncrement, afMax);
                }
                sarValue = Math.max(sarValue, highs[i - 1], i > 1 ? highs[i - 2] : highs[i - 1]);
            }
        }

        sar.push(sarValue);
        trend.push(isUptrend ? 'up' : 'down');
    }

    return { sar, trend };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the last valid (non-NaN) value from an array
 */
export function getLastValid(arr: number[]): number | null {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (!isNaN(arr[i])) return arr[i];
    }
    return null;
}

/**
 * Calculate percent change between two values
 */
export function percentChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Calculate correlation between two data series
 */
export function correlation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let sumXSq = 0;
    let sumYSq = 0;

    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        numerator += dx * dy;
        sumXSq += dx * dx;
        sumYSq += dy * dy;
    }

    const denominator = Math.sqrt(sumXSq * sumYSq);
    return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate historical volatility (annualized)
 */
export function historicalVolatility(closes: number[], period = 20): number {
    const returns: number[] = [];

    for (let i = 1; i < closes.length; i++) {
        returns.push(Math.log(closes[i] / closes[i - 1]));
    }

    const recentReturns = returns.slice(-period);
    const mean = recentReturns.reduce((a, b) => a + b, 0) / period;
    const variance = recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / period;

    // Annualize (assuming daily data, 252 trading days)
    return Math.sqrt(variance * 252) * 100;
}
