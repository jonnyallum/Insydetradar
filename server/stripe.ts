/**
 * Stripe Payment Service
 * Handles payment intents, checkout sessions, and customer management
 */

import { STRIPE_CONFIG, isLiveMode } from './stripe-config';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

function getHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${STRIPE_CONFIG.secretKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

/**
 * Create a payment intent for deposits
 */
export async function createPaymentIntent(params: {
  amount: number; // Amount in cents
  currency?: string;
  customerId?: string;
  metadata?: Record<string, string>;
}): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}> {
  const body = new URLSearchParams({
    amount: params.amount.toString(),
    currency: params.currency || STRIPE_CONFIG.currency,
    'automatic_payment_methods[enabled]': 'true',
  });

  if (params.customerId) {
    body.append('customer', params.customerId);
  }

  if (params.metadata) {
    Object.entries(params.metadata).forEach(([key, value]) => {
      body.append(`metadata[${key}]`, value);
    });
  }

  const response = await fetch(`${STRIPE_API_BASE}/payment_intents`, {
    method: 'POST',
    headers: getHeaders(),
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create payment intent');
  }

  const data = await response.json();

  return {
    clientSecret: data.client_secret,
    paymentIntentId: data.id,
    amount: data.amount,
    currency: data.currency,
  };
}

/**
 * Create a checkout session for one-time deposits
 */
export async function createCheckoutSession(params: {
  amount: number; // Amount in cents
  currency?: string;
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<{
  sessionId: string;
  url: string;
}> {
  const body = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price_data][currency]': params.currency || STRIPE_CONFIG.currency,
    'line_items[0][price_data][product_data][name]': 'Account Deposit',
    'line_items[0][price_data][product_data][description]': 'Deposit funds to your Insydetradar trading account',
    'line_items[0][price_data][unit_amount]': params.amount.toString(),
    'line_items[0][quantity]': '1',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  if (params.customerId) {
    body.append('customer', params.customerId);
  } else if (params.customerEmail) {
    body.append('customer_email', params.customerEmail);
  }

  if (params.metadata) {
    Object.entries(params.metadata).forEach(([key, value]) => {
      body.append(`metadata[${key}]`, value);
    });
  }

  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: getHeaders(),
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create checkout session');
  }

  const data = await response.json();

  return {
    sessionId: data.id,
    url: data.url,
  };
}

/**
 * Retrieve a checkout session
 */
export async function getCheckoutSession(sessionId: string): Promise<{
  id: string;
  status: string;
  paymentStatus: string;
  amountTotal: number;
  currency: string;
  customerEmail: string | null;
}> {
  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions/${sessionId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to retrieve checkout session');
  }

  const data = await response.json();

  return {
    id: data.id,
    status: data.status,
    paymentStatus: data.payment_status,
    amountTotal: data.amount_total,
    currency: data.currency,
    customerEmail: data.customer_email,
  };
}

/**
 * Create or get a Stripe customer
 */
export async function createOrGetCustomer(params: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}): Promise<{
  customerId: string;
  email: string;
  name: string | null;
}> {
  // First, search for existing customer
  const searchResponse = await fetch(
    `${STRIPE_API_BASE}/customers/search?query=email:'${params.email}'`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    if (searchData.data && searchData.data.length > 0) {
      const existing = searchData.data[0];
      return {
        customerId: existing.id,
        email: existing.email,
        name: existing.name,
      };
    }
  }

  // Create new customer
  const body = new URLSearchParams({
    email: params.email,
  });

  if (params.name) {
    body.append('name', params.name);
  }

  if (params.metadata) {
    Object.entries(params.metadata).forEach(([key, value]) => {
      body.append(`metadata[${key}]`, value);
    });
  }

  const response = await fetch(`${STRIPE_API_BASE}/customers`, {
    method: 'POST',
    headers: getHeaders(),
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create customer');
  }

  const data = await response.json();

  return {
    customerId: data.id,
    email: data.email,
    name: data.name,
  };
}

/**
 * Get account balance (for admin/debugging)
 */
export async function getAccountBalance(): Promise<{
  available: { amount: number; currency: string }[];
  pending: { amount: number; currency: string }[];
}> {
  const response = await fetch(`${STRIPE_API_BASE}/balance`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get balance');
  }

  const data = await response.json();

  return {
    available: data.available.map((b: any) => ({
      amount: b.amount / 100,
      currency: b.currency.toUpperCase(),
    })),
    pending: data.pending.map((b: any) => ({
      amount: b.amount / 100,
      currency: b.currency.toUpperCase(),
    })),
  };
}

/**
 * Check if we're in live mode
 */
export { isLiveMode };

/**
 * Get publishable key for client-side
 */
export function getPublishableKey(): string {
  return STRIPE_CONFIG.publishableKey;
}
