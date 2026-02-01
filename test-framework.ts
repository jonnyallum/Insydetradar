import 'dotenv/config';
import { emailSync } from './server/services/email-sync';
import { neuralCore } from './server/services/neural-core';
import { supabase } from './lib/supabase';

/**
 * Insydetradar Testing Framework
 * @Sentinel - Comprehensive system validation
 */

interface TestResult {
    name: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    message: string;
    duration?: number;
}

const results: TestResult[] = [];

function logTest(result: TestResult) {
    results.push(result);
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.name}: ${result.message}`);
}

async function testSupabaseConnection() {
    const start = Date.now();
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        logTest({
            name: 'Supabase Connection',
            status: 'PASS',
            message: 'Successfully connected to Supabase',
            duration: Date.now() - start
        });
    } catch (error: any) {
        logTest({
            name: 'Supabase Connection',
            status: 'FAIL',
            message: error.message
        });
    }
}

async function testLoopsSync() {
    const start = Date.now();
    try {
        await emailSync.syncUser({
            email: 'test_sentinel@insydetradar.com',
            name: 'Sentinel Test',
            metadata: {
                source: 'Testing Framework',
                userId: 'test_sentinel_001'
            }
        });

        logTest({
            name: 'Loops Audience Sync',
            status: 'PASS',
            message: 'Contact successfully synced to Loops',
            duration: Date.now() - start
        });
    } catch (error: any) {
        logTest({
            name: 'Loops Audience Sync',
            status: 'FAIL',
            message: error.message
        });
    }
}

async function testResendEmail() {
    const start = Date.now();
    try {
        await emailSync.sendWelcome('jonnyallum@gmail.com', 'Jonny Allum');

        logTest({
            name: 'Resend Welcome Email',
            status: 'PASS',
            message: 'Welcome email sent successfully',
            duration: Date.now() - start
        });
    } catch (error: any) {
        logTest({
            name: 'Resend Welcome Email',
            status: 'FAIL',
            message: error.message
        });
    }
}

async function testNeuralCore() {
    const start = Date.now();
    try {
        const result = await neuralCore.refineSignal('BTC/USD', {
            rsi: 72,
            macd: 'bullish_cross',
            volume_delta: '+25%',
            price_action: 'breakout'
        });

        if (result.score > 0 && result.conviction) {
            logTest({
                name: 'Neural Core (Gemini AI)',
                status: 'PASS',
                message: `Signal analyzed. Conviction: ${result.score}/100`,
                duration: Date.now() - start
            });
        } else {
            logTest({
                name: 'Neural Core (Gemini AI)',
                status: 'WARN',
                message: 'Fallback mode active (API issue)',
                duration: Date.now() - start
            });
        }
    } catch (error: any) {
        logTest({
            name: 'Neural Core (Gemini AI)',
            status: 'FAIL',
            message: error.message
        });
    }
}

async function testEnvironmentVariables() {
    const requiredVars = [
        'DATABASE_URL',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GEMINI_API_KEY',
        'LOOPS_API_KEY',
        'RESEND_API_KEY'
    ];

    const missing = requiredVars.filter(v => !process.env[v]);

    if (missing.length === 0) {
        logTest({
            name: 'Environment Variables',
            status: 'PASS',
            message: 'All required environment variables present'
        });
    } else {
        logTest({
            name: 'Environment Variables',
            status: 'FAIL',
            message: `Missing: ${missing.join(', ')}`
        });
    }
}

async function runAllTests() {
    console.log('\n🛡️ SENTINEL TESTING FRAMEWORK');
    console.log('═'.repeat(50));
    console.log('Project: Insydetradar');
    console.log('Timestamp:', new Date().toISOString());
    console.log('═'.repeat(50));
    console.log('\n📋 Running System Tests...\n');

    // Run all tests
    await testEnvironmentVariables();
    await testSupabaseConnection();
    await testLoopsSync();
    await testResendEmail();
    await testNeuralCore();

    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('═'.repeat(50));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warned = results.filter(r => r.status === 'WARN').length;

    console.log(`Total Tests: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warned}`);

    const avgDuration = results
        .filter(r => r.duration)
        .reduce((sum, r) => sum + (r.duration || 0), 0) / results.filter(r => r.duration).length;

    console.log(`⏱️  Avg Duration: ${avgDuration.toFixed(0)}ms`);

    console.log('\n' + '═'.repeat(50));

    if (failed === 0) {
        console.log('🚀 ALL SYSTEMS OPERATIONAL - READY FOR DEPLOYMENT');
    } else {
        console.log('⚠️  CRITICAL FAILURES DETECTED - REVIEW REQUIRED');
    }

    console.log('═'.repeat(50) + '\n');

    process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(console.error);
