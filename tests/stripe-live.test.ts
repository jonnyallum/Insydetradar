import { describe, it, expect } from 'vitest';
// Import from config - keys come from environment variables
import { STRIPE_CONFIG, isStripeConfigured, isLiveMode } from '../server/stripe-config';

/**
 * Stripe Live Integration Test
 * Verifies the Stripe API keys are valid and working
 */

describe('Stripe Live Integration', () => {
  it('should have Stripe configured', () => {
    expect(isStripeConfigured()).toBe(true);
    expect(STRIPE_CONFIG.secretKey).toBeDefined();
    expect(STRIPE_CONFIG.publishableKey).toBeDefined();
  });

  it('should detect live mode correctly', () => {
    const isLive = isLiveMode();
    console.log(`Stripe mode: ${isLive ? 'LIVE' : 'TEST'}`);
    // We expect live keys based on what was provided
    expect(isLive).toBe(true);
  });

  it('should be able to connect to Stripe API and fetch balance', async () => {
    const response = await fetch('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRIPE_CONFIG.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.object).toBe('balance');
    expect(data.available).toBeDefined();
    
    console.log('✅ Stripe API connection successful!');
    console.log(`   Mode: LIVE`);
    console.log(`   Available balance: ${data.available.map((b: any) => `${(b.amount / 100).toFixed(2)} ${b.currency.toUpperCase()}`).join(', ')}`);
    console.log(`   Pending balance: ${data.pending.map((b: any) => `${(b.amount / 100).toFixed(2)} ${b.currency.toUpperCase()}`).join(', ')}`);
  });

  it('should be able to list recent customers', { timeout: 15000 }, async () => {
    const response = await fetch('https://api.stripe.com/v1/customers?limit=3', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRIPE_CONFIG.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.object).toBe('list');
    
    console.log(`   Total customers retrieved: ${data.data.length}`);
  });
});
