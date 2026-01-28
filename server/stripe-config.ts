/**
 * Stripe Configuration
 * Keys are loaded from environment variables
 * 
 * Required environment variables:
 * - Stripe_secret_key: Your Stripe secret key (sk_test_... or sk_live_...)
 * - Stripe_publishable_key: Your Stripe publishable key (pk_test_... or pk_live_...)
 */

export const STRIPE_CONFIG = {
  // Support both naming conventions for environment variables
  secretKey: process.env.STRIPE_SECRET_KEY || process.env.Stripe_secret_key || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || process.env.Stripe_publishable_key || '',
  
  // Currency for transactions
  currency: 'usd',
  
  // Webhook secret (to be configured later)
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
};

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return !!(STRIPE_CONFIG.secretKey && STRIPE_CONFIG.publishableKey);
}

/**
 * Check if using live keys (vs test keys)
 */
export function isLiveMode(): boolean {
  return STRIPE_CONFIG.secretKey.startsWith('sk_live_');
}
