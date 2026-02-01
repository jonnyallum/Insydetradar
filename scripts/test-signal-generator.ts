/**
 * Signal Generator Sanity Check
 * Tests the technical indicator calculations and signal logic.
 */

import "dotenv/config";
import { initAlpacaClient, getAlpacaClient } from "../server/alpaca/client";
import { SignalGenerator } from "../server/trading/signal-generator";
import { ENV } from "../server/_core/env";

async function testSignals() {
    console.log("--- Signal Generation Sanity Check ---");

    const apiKey = ENV.alpacaApiKey;
    const secretKey = ENV.alpacaSecretKey;

    if (!apiKey || !secretKey) {
        console.error("❌ ERROR: Need Alpaca keys to fetch historical data for testing.");
        process.exit(1);
    }

    try {
        initAlpacaClient({
            keyId: apiKey,
            secretKey: secretKey,
            paper: true
        });

        const client = getAlpacaClient();
        const generator = new SignalGenerator();
        const symbol = "AAPL";

        console.log(`Fetching 250 bars for ${symbol}...`);
        const bars = await client.getBars(symbol, "1Day", { limit: 250 });

        const ohlcv = bars.map(b => ({
            open: b.o,
            high: b.h,
            low: b.l,
            close: b.c,
            volume: b.v,
            timestamp: b.t
        }));

        console.log("Generating signal...");
        const result = generator.generateSignal(symbol, ohlcv);

        if (!result) {
            console.error("❌ Signal generation failed (check bar length or indicator logic)");
            return;
        }

        const { signal, rawScores } = result;
        console.log(`✅ Signal Generated for ${symbol}:`);
        console.log(`   - Type: ${signal.signalType.toUpperCase()}`);
        console.log(`   - Confidence: ${(signal.confidence * 100).toFixed(2)}%`);
        console.log(`   - Reason: ${signal.reason}`);
        console.log("   - Indicators:");
        console.log(`     - RSI: ${signal.indicators.rsi?.toFixed(2)}`);
        console.log(`     - MACD Histogram: ${signal.indicators.macdHistogram?.toFixed(4)}`);
        console.log(`     - ATR: ${signal.indicators.atr?.toFixed(2)}`);

    } catch (error) {
        console.error("❌ TEST FAILED:");
        console.error(error);
    }
}

testSignals();
