// Order Success Page Script
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Initialize Firebase
const cfg = window.FIREBASE_CONFIG;
const app = getApps().length ? getApp() : initializeApp(cfg);
const db = getFirestore(app);

// Utility functions
const formatPrice = (price) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0
  }).format(Number(price) || 0);
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const getStatusBadge = (status) => {
  const statusMap = {
    'pending': { icon: 'clock', text: 'Pending', color: '#f59e0b' },
    'processing': { icon: 'cog', text: 'Processing', color: '#3b82f6' },
    'shipped': { icon: 'truck', text: 'Shipped', color: '#8b5cf6' },
    'delivered': { icon: 'check-circle', text: 'Delivered', color: '#10b981' },
    'cancelled': { icon: 'times-circle', text: 'Cancelled', color: '#ef4444' }
  };
  
  const statusInfo = statusMap[status] || statusMap['pending'];
  
  return `
    <span class="status-badge" style="border-color: ${statusInfo.color}; color: ${statusInfo.color}; background: ${statusInfo.color}20;">
      <i class="fas fa-${statusInfo.icon}"></i> ${statusInfo.text}
    </span>
  `;
};

const getPaymentMethodName = (method) => {
  const methods = {
    'cod': 'Cash on Delivery',
    'bank': 'Bank Transfer',
    'card': 'Credit/Debit Card',
    'payhere': 'PayHere Payment Gateway'
  };
  return methods[method] || 'Unknown';
};

// Load order details
const loadOrderDetails = async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    const orderNumber = params.get('orderNumber');
    
    if (!orderId) {
      showError('Order ID not found');
      return;
    }
    
    // Update order number display
    if (orderNumber) {
      document.getElementById('orderNumberDisplay').innerHTML = `
        <i class="fas fa-receipt"></i> Order #${orderNumber}
      `;
    }
    
    // Fetch order from Firebase
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    
    if (!orderDoc.exists()) {
      showError('Order not found');
      return;
    }
    
    const order = { id: orderDoc.id, ...orderDoc.data() };
    renderOrderDetails(order);
    
  } catch (error) {
    console.error('Error loading order:', error);
    showError('Failed to load order details');
  }
};

const renderOrderDetails = (order) => {
  const detailsContainer = document.getElementById('orderDetails');
  
  let html = '';
  
  // Order Status
  html += `
    <div class="order-section">
      <h3 class="section-title">
        <i class="fas fa-info-circle"></i>
        Order Status
      </h3>
      <div class="info-row">
        <span>Status</span>
        <span>${getStatusBadge(order.status || 'pending')}</span>
      </div>
      <div class="info-row">
        <span>Order Date</span>
        <strong>${formatDate(order.createdAt)}</strong>
      </div>
      <div class="info-row">
        <span>Order Number</span>
        <strong>${order.orderNumber || order.id}</strong>
      </div>
    </div>
  `;
  
  // Items
  html += `
    <div class="order-section">
      <h3 class="section-title">
        <i class="fas fa-box"></i>
        Order Items
      </h3>
  `;
  
  if (order.items && order.items.length > 0) {
    order.items.forEach(item => {
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      html += `
        <div class="order-item">
          <div class="order-item-image">
            <img src="${item.image || 'assets/img/placeholder.jpg'}" alt="${item.title}">
          </div>
          <div class="order-item-details">
            <div class="order-item-title">${item.title}</div>
            <div class="order-item-qty">Quantity: ${item.quantity || 1}</div>
          </div>
          <div class="order-item-price">${formatPrice(itemTotal)}</div>
        </div>
      `;
    });
  } else {
    html += '<p style="color: var(--muted);">No items found</p>';
  }
  
  html += '</div>';
  
  // Shipping Address
  if (order.shippingAddress) {
    const addr = order.shippingAddress;
    html += `
      <div class="order-section">
        <h3 class="section-title">
          <i class="fas fa-map-marker-alt"></i>
          Shipping Address
        </h3>
        <div class="info-row">
          <span>Name</span>
          <strong>${addr.fullName || 'N/A'}</strong>
        </div>
        <div class="info-row">
          <span>Address</span>
          <strong>${addr.line1 || ''}${addr.line2 ? ', ' + addr.line2 : ''}</strong>
        </div>
        <div class="info-row">
          <span>City</span>
          <strong>${addr.city || ''}, ${addr.postal || ''}</strong>
        </div>
        <div class="info-row">
          <span>Country</span>
          <strong>${addr.country || ''}</strong>
        </div>
        <div class="info-row">
          <span>Phone</span>
          <strong>${addr.phone || 'N/A'}</strong>
        </div>
        <div class="info-row">
          <span>Email</span>
          <strong>${addr.email || 'N/A'}</strong>
        </div>
      </div>
    `;
  }
  
  // Payment & Total
  html += `
    <div class="order-section">
      <h3 class="section-title">
        <i class="fas fa-credit-card"></i>
        Payment Information
      </h3>
      <div class="info-row">
        <span>Payment Method</span>
        <strong>${getPaymentMethodName(order.paymentMethod)}</strong>
      </div>
      <div class="info-row">
        <span>Subtotal</span>
        <span>${formatPrice(order.subtotal || 0)}</span>
      </div>
      <div class="info-row">
        <span>Shipping</span>
        <span>${formatPrice(order.shipping || 0)}</span>
      </div>
      <div class="total-row">
        <span>Total Amount</span>
        <span class="total-amount">${formatPrice(order.total || 0)}</span>
      </div>
    </div>
  `;
  
  detailsContainer.innerHTML = html;
};

const showError = (message) => {
  document.getElementById('orderNumberDisplay').innerHTML = `
    <i class="fas fa-exclamation-triangle"></i> ${message}
  `;
  document.getElementById('orderDetails').innerHTML = `
    <div class="order-section" style="text-align: center; padding: 3rem;">
      <p style="color: var(--muted); margin-bottom: 1.5rem;">
        ${message}. Please check your order history or contact support.
      </p>
      <div class="action-buttons">
        <a href="orders.html" class="btn btn-primary">
          <i class="fas fa-list"></i> View Order History
        </a>
        <a href="contact.html" class="btn btn-outline">
          <i class="fas fa-envelope"></i> Contact Support
        </a>
      </div>
    </div>
  `;
};

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadOrderDetails);
} else {
  loadOrderDetails();
}
