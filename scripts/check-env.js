// Check available environment variables
const keys = Object.keys(process.env).filter(k => k.includes('STRIPE') || k.includes('stripe'));
console.log('Stripe-related env vars:', keys.length > 0 ? keys : 'None found');
console.log('---');

// Check for payment-related keys
const paymentKeys = Object.keys(process.env).filter(k => 
  k.toLowerCase().includes('payment') || 
  k.toLowerCase().includes('pay') ||
  k.toLowerCase().includes('key') ||
  k.toLowerCase().includes('secret')
);
console.log('Payment/Key-related env vars:', paymentKeys.filter(k => !k.startsWith('npm_')));
