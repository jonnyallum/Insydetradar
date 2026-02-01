import 'dotenv/config';
import { neuralCore } from './server/services/neural-core';

async function testNeuralConviction() {
    console.log('--- Insydetradar Neural Core Test ---');

    const symbol = 'BTC/USD';
    const indicators = {
        rsi: 65,
        macd: 'bullish_cross',
        volume_delta: '+15%',
        price_action: 'testing_resistance'
    };

    console.log(`[Input] Symbol: ${symbol}`);
    console.log(`[Input] Technicals: ${JSON.stringify(indicators)}`);
    console.log('Synchronizing with Gemini Neural Core...');

    const result = await neuralCore.refineSignal(symbol, indicators);

    console.log('\n[NEURAL OUTPUT]');
    console.log(`Score: ${result.score}/100`);
    console.log(`Conviction: "${result.conviction}"`);
    console.log('-------------------------------------');
}

testNeuralConviction().catch(console.error);
