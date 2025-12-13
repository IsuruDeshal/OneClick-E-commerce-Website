/**
 * Payment Gateway Configuration
 * Configure your payment providers here
 */

// Auto-detect environment
const isLocalhost = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';

// PayHere Configuration
window.PAYHERE_CONFIG = {
  // Get these from https://www.payhere.lk/merchant
  merchant_id: isLocalhost ? '1221149' : 'YOUR_LIVE_MERCHANT_ID', // Sandbox merchant ID
  merchant_secret: 'YOUR_MERCHANT_SECRET', // Keep this secret!

  // Mode
  mode: isLocalhost ? 'sandbox' : 'live',

  // Currency
  currency: 'LKR',

  // URLs
  return_url: isLocalhost
    ? 'http://localhost/oneclick/payment-success.html'
    : 'https://yourdomain.com/payment-success.html',

  cancel_url: isLocalhost
    ? 'http://localhost/oneclick/payment-failed.html'
    : 'https://yourdomain.com/payment-failed.html',

  notify_url: isLocalhost
    ? 'http://localhost/oneclick/api/payhere-notify.php'
    : 'https://yourdomain.com/api/payhere-notify.php'
};

// Stripe Configuration (Optional)
window.STRIPE_CONFIG = {
  publishable_key: isLocalhost
    ? 'pk_test_YOUR_TEST_KEY'
    : 'pk_live_YOUR_LIVE_KEY',
  mode: isLocalhost ? 'test' : 'live'
};

// PayPal Configuration (Optional)
window.PAYPAL_CONFIG = {
  client_id: isLocalhost
    ? 'YOUR_SANDBOX_CLIENT_ID'
    : 'YOUR_LIVE_CLIENT_ID',
  mode: isLocalhost ? 'sandbox' : 'live',
  currency: 'USD'
};

// Cash on Delivery Configuration
window.COD_CONFIG = {
  enabled: true,
  fee: 500, // Rs 500 COD fee
  min_order: 0, // No minimum
  max_order: 100000 // Max Rs 100,000 for COD
};

// Payment Method Status
window.PAYMENT_METHODS = {
  payhere: {
    enabled: true,
    name: 'PayHere',
    description: 'Credit/Debit Cards, Mobile Money, Banking',
    icon: '💳',
    fees: '2.9% + Rs 10',
    supported_methods: [
      'Visa',
      'Mastercard',
      'American Express',
      'eZ Cash',
      'mCash',
      'Genie'
    ]
  },

  stripe: {
    enabled: false, // Enable when you have Stripe account
    name: 'Stripe',
    description: 'International Payments',
    icon: '🌍',
    fees: '3.9% + $0.30'
  },

  paypal: {
    enabled: false, // Enable when you have PayPal account
    name: 'PayPal',
    description: 'PayPal Account or Card',
    icon: '🅿️',
    fees: '4.4% + fixed fee'
  },

  cod: {
    enabled: true,
    name: 'Cash on Delivery',
    description: 'Pay when you receive',
    icon: '💵',
    fees: 'Rs 500 COD fee'
  }
};

// Get active payment methods
function getActivePaymentMethods() {
  return Object.entries(PAYMENT_METHODS)
    .filter(([key, method]) => method.enabled)
    .map(([key, method]) => ({ id: key, ...method }));
}

// Check if payment method is available
function isPaymentMethodAvailable(methodId) {
  return PAYMENT_METHODS[methodId]?.enabled || false;
}

console.log('✅ Payment Configuration loaded');
console.log('💳 Active payment methods:', getActivePaymentMethods().map(m => m.name).join(', '));

