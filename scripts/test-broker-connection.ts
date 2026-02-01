/**
 * Broker Connection Test Script
 * Verifies that the Alpaca API keys are valid and the account is ready.
 */

import "dotenv/config";
import { initAlpacaClient } from "../server/alpaca/client";
import { ENV } from "../server/_core/env";

async function testConnection() {
    console.log("--- Broker Connection Protocol ---");

    const apiKey = ENV.alpacaApiKey;
    const secretKey = ENV.alpacaSecretKey;
    const paper = ENV.alpacaPaper;

    if (!apiKey || !secretKey) {
        console.error("❌ ERROR: ALPACA_API_KEY or ALPACA_SECRET_KEY missing in .env");
        process.exit(1);
    }

    console.log(`Connecting to Alpaca (${paper ? "PAPER" : "LIVE"})...`);

    try {
        const client = initAlpacaClient({
            keyId: apiKey,
            secretKey: secretKey,
            paper: paper
        });

        // 1. Get Account
        const account = await client.getAccount();
        console.log("✅ Identity Verified:");
        console.log(`   - Account ID: ${account.id}`);
        console.log(`   - Status: ${account.status}`);
        console.log(`   - Portfolio Value: $${account.portfolio_value}`);
        console.log(`   - Buying Power: $${account.buying_power}`);

        // 2. Check Readiness
        const ready = await client.isAccountReady();
        if (ready.ready) {
            console.log("🚀 Protocol Status: READY FOR COMBAT");
        } else {
            console.warn(`⚠️ Protocol Status: RESTRICTED - ${ready.reason}`);
        }

        // 3. Test Market Data
        console.log("Fetching market snapshot for SPY...");
        const spy = await client.getSnapshot("SPY");
        console.log(`   - SPY Last Price: $${spy.latestTrade?.p || spy.minuteBar?.c}`);

    } catch (error) {
        console.error("❌ CONNECTION FAILED:");
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

testConnection();
