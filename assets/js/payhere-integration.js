/**
 * PayHere Payment Integration
 * Sri Lanka's Leading Payment Gateway
 * https://www.payhere.lk
 */

class PayHerePayment {
  constructor(config) {
    this.config = {
      merchant_id: config.merchant_id || '',
      merchant_secret: config.merchant_secret || '',
      mode: config.mode || 'sandbox', // 'sandbox' or 'live'
      currency: config.currency || 'LKR',
      return_url: config.return_url || window.location.origin + '/payment-success.html',
      cancel_url: config.cancel_url || window.location.origin + '/payment-failed.html',
      notify_url: config.notify_url || window.location.origin + '/api/payhere-notify.php'
    };

    this.loadPayHereScript();
  }

  /**
   * Load PayHere JavaScript library
   */
  loadPayHereScript() {
    if (window.payhere) {
      console.log('✅ PayHere already loaded');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://www.payhere.lk/lib/payhere.js';
      script.onload = () => {
        console.log('✅ PayHere library loaded');
        this.setupCallbacks();
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load PayHere'));
      document.head.appendChild(script);
    });
  }

  /**
   * Setup PayHere callbacks
   */
  setupCallbacks() {
    if (!window.payhere) return;

    // Payment completed
    window.payhere.onCompleted = (orderId) => {
      console.log('✅ Payment completed:', orderId);
      this.onPaymentComplete(orderId);
    };

    // Payment dismissed
    window.payhere.onDismissed = () => {
      console.log('⚠️ Payment dismissed');
      this.onPaymentDismissed();
    };

    // Payment error
    window.payhere.onError = (error) => {
      console.error('❌ Payment error:', error);
      this.onPaymentError(error);
    };
  }

  /**
   * Initiate payment
   */
  async initiatePayment(orderData) {
    try {
      await this.loadPayHereScript();

      const payment = {
        sandbox: this.config.mode === 'sandbox',
        merchant_id: this.config.merchant_id,
        return_url: this.config.return_url,
        cancel_url: this.config.cancel_url,
        notify_url: this.config.notify_url,

        // Order details
        order_id: orderData.order_id || 'ORDER-' + Date.now(),
        items: orderData.items_description || 'Products from One Click Computers',
        amount: parseFloat(orderData.total).toFixed(2),
        currency: this.config.currency,

        // Customer details
        first_name: this.getFirstName(orderData.customer_name),
        last_name: this.getLastName(orderData.customer_name),
        email: orderData.customer_email,
        phone: orderData.customer_phone,
        address: orderData.shipping_address || '',
        city: orderData.shipping_city || '',
        country: orderData.shipping_country || 'Sri Lanka',

        // Optional
        delivery_address: orderData.shipping_address || '',
        delivery_city: orderData.shipping_city || '',
        delivery_country: orderData.shipping_country || 'Sri Lanka',

        // Custom fields (optional)
        custom_1: orderData.custom_1 || '',
        custom_2: orderData.custom_2 || ''
      };

      console.log('💳 Initiating PayHere payment:', payment);

      // Start payment
      window.payhere.startPayment(payment);

      return { success: true };
    } catch (error) {
      console.error('❌ Payment initiation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Payment completed callback
   */
  onPaymentComplete(orderId) {
    // Update order status
    this.updateOrderStatus(orderId, 'paid');

    // Show success message
    this.showNotification('Payment successful! Redirecting...', 'success');

    // Redirect to success page
    setTimeout(() => {
      window.location.href = `${this.config.return_url}?order=${orderId}`;
    }, 2000);
  }

  /**
   * Payment dismissed callback
   */
  onPaymentDismissed() {
    this.showNotification('Payment cancelled', 'warning');
  }

  /**
   * Payment error callback
   */
  onPaymentError(error) {
    this.showNotification('Payment failed: ' + error, 'error');
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status) {
    try {
  const isLocalhost = window.location.hostname === 'localhost';
  const configuredApi = window.API_CONFIG && window.API_CONFIG.apiUrl ? window.API_CONFIG.apiUrl : null;
  const apiUrl = configuredApi || (isLocalhost ? 'api' : `${window.location.origin.replace(/\/$/, '')}/api`);

      const response = await fetch(`${apiUrl}/update-order-status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          status: status,
          payment_status: 'paid'
        })
      });

      const data = await response.json();
      console.log('Order status updated:', data);
      return data;
    } catch (error) {
      console.error('Error updating order:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Get first name
   */
  getFirstName(fullName) {
    if (!fullName) return 'Customer';
    const parts = fullName.trim().split(' ');
    return parts[0];
  }

  /**
   * Helper: Get last name
   */
  getLastName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#f59e0b'};
      color: white;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  /**
   * Get payment methods info
   */
  getPaymentMethods() {
    return [
      { name: 'Visa', supported: true },
      { name: 'Mastercard', supported: true },
      { name: 'American Express', supported: true },
      { name: 'eZ Cash', supported: true },
      { name: 'mCash', supported: true },
      { name: 'Genie', supported: true },
      { name: 'Bank Transfer', supported: true },
      { name: 'QR Payment', supported: true }
    ];
  }
}

// Export for global use
window.PayHerePayment = PayHerePayment;

// Example usage:
/*
const payhere = new PayHerePayment({
  merchant_id: 'YOUR_MERCHANT_ID',
  merchant_secret: 'YOUR_MERCHANT_SECRET',
  mode: 'sandbox' // or 'live'
});

// Initiate payment
payhere.initiatePayment({
  order_id: 'ORDER-12345',
  items_description: 'Gaming Laptop + Keyboard',
  total: 130000,
  customer_name: 'Kasun Perera',
  customer_email: 'kasun@example.com',
  customer_phone: '0771234567',
  shipping_address: '123 Main Street',
  shipping_city: 'Colombo',
  shipping_country: 'Sri Lanka'
});
*/

console.log('✅ PayHere Payment Integration loaded');

