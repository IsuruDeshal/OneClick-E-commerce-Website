// New Checkout System - One Click Computers
// Uses localStorage for cart and Supabase/PHP API for orders

// Global state
let currentUser = null;
let cartItems = [];
let savedAddresses = [];
let selectedAddress = null;
let selectedShippingMethod = 'standard';
let selectedPaymentMethod = 'cod';
let currentStep = 1;
let shippingCost = 500;
let taxRate = 0; // 0% tax, can be changed
let discount = 0;

// Utility functions
const formatPrice = (price) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0
  }).format(Number(price) || 0);
};

const showToast = (message, type = 'success') => {
  // Use existing toast system if available
  if (window.showToast) {
    window.showToast(message, type);
  } else {
    alert(message);
  }
};

// Cart Management
const loadCart = async () => {
  try {
    // Use CartManager if available
    if (window.CartManager) {
      cartItems = await window.CartManager.getCart();
    } else {
      // Fallback to localStorage
      const cartData = localStorage.getItem('oc_cart');
      cartItems = cartData ? JSON.parse(cartData) : [];
    }
    
    if (cartItems.length === 0) {
      showEmptyCart();
    } else {
      renderOrderSummary();
      updateCartBadges();
    }
  } catch (error) {
    console.error('Error loading cart:', error);
    cartItems = [];
  }
};

const showEmptyCart = () => {
  const container = document.querySelector('.checkout-container');
  container.innerHTML = `
    <div class="checkout-section" style="grid-column: 1 / -1;">
      <div class="empty-cart-message">
        <i class="fas fa-shopping-cart"></i>
        <h2>Your cart is empty</h2>
        <p>Add some items to your cart before checkout</p>
        <button class="btn btn-primary" onclick="window.location.href='shop.html'" style="margin-top: 1rem;">
          <i class="fas fa-shopping-bag"></i> Continue Shopping
        </button>
      </div>
    </div>
  `;
};

const renderOrderSummary = () => {
  const summaryItemsEl = document.getElementById('summaryItems');
  if (!summaryItemsEl) return;
  
  if (cartItems.length === 0) {
    summaryItemsEl.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 2rem;">No items in cart</p>';
    return;
  }
  
  let html = '';
  let subtotal = 0;
  
  cartItems.forEach(item => {
    const itemTotal = (item.price || 0) * (item.quantity || 1);
    subtotal += itemTotal;
    
    html += `
      <div class="summary-item">
        <div class="summary-item-image">
          <img src="${item.image || 'assets/img/placeholder.jpg'}" alt="${item.title || item.name || 'Product'}">
        </div>
        <div class="summary-item-details">
          <div class="summary-item-title">${item.title || item.name || 'Product'}</div>
          <div class="summary-item-qty">Qty: ${item.quantity || 1}</div>
        </div>
        <div class="summary-item-price">${formatPrice(itemTotal)}</div>
      </div>
    `;
  });
  
  summaryItemsEl.innerHTML = html;
  
  // Calculate totals
  const tax = subtotal * taxRate;
  const total = subtotal + shippingCost + tax - discount;
  
  document.getElementById('summarySubtotal').textContent = formatPrice(subtotal);
  document.getElementById('summaryShipping').textContent = shippingCost === 0 ? 'FREE' : formatPrice(shippingCost);
  document.getElementById('summaryTax').textContent = formatPrice(tax);
  document.getElementById('summaryTotal').textContent = formatPrice(total);
  
  // Update shipping label based on method
  const shippingLabel = document.getElementById('shippingLabel');
  if (shippingLabel) {
    const labels = {
      'standard': 'Standard Shipping',
      'express': 'Express Shipping',
      'pickup': 'Store Pickup'
    };
    shippingLabel.textContent = labels[selectedShippingMethod] || 'Shipping';
  }
};

const updateCartBadges = () => {
  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const badges = document.querySelectorAll('.badge');
  badges.forEach(badge => {
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'flex' : 'none';
  });
};

// Address Management
const loadSavedAddresses = async () => {
  try {
    // Load from localStorage (user must be logged in to save addresses)
    const storedAddresses = localStorage.getItem('saved_addresses');
    savedAddresses = storedAddresses ? JSON.parse(storedAddresses) : [];
    renderSavedAddresses();
  } catch (error) {
    console.error('Error loading addresses:', error);
    savedAddresses = [];
  }
};

const renderSavedAddresses = () => {
  const listEl = document.getElementById('savedAddressesList');
  if (!listEl) return;
  
  if (savedAddresses.length === 0) {
    listEl.innerHTML = '<p style="color: var(--muted); font-style: italic;">No saved addresses</p>';
    return;
  }
  
  let html = '';
  savedAddresses.forEach(address => {
    const isSelected = selectedAddress && selectedAddress.id === address.id;
    html += `
      <div class="address-option ${isSelected ? 'selected' : ''}" data-address-id="${address.id}">
        <div class="address-option-header">
          <span class="address-name">${address.fullName || 'No Name'}</span>
          ${address.isDefault ? '<span class="address-badge">Default</span>' : ''}
        </div>
        <div class="address-details">
          ${address.line1 || ''}${address.line2 ? ', ' + address.line2 : ''}<br>
          ${address.city || ''}, ${address.postal || ''}<br>
          ${address.country || ''}<br>
          ${address.phone || ''}
        </div>
      </div>
    `;
  });
  
  listEl.innerHTML = html;
  
  // Add click handlers
  document.querySelectorAll('.address-option').forEach(option => {
    option.addEventListener('click', () => {
      const addressId = option.dataset.addressId;
      selectAddress(addressId);
    });
  });
};

const selectAddress = (addressId) => {
  selectedAddress = savedAddresses.find(addr => addr.id === addressId);
  
  // Update UI
  document.querySelectorAll('.address-option').forEach(option => {
    option.classList.toggle('selected', option.dataset.addressId === addressId);
  });
  
  // Hide new address form
  document.getElementById('newAddressForm').classList.remove('active');
};

const toggleNewAddressForm = () => {
  const form = document.getElementById('newAddressForm');
  form.classList.toggle('active');
  
  if (form.classList.contains('active')) {
    // Deselect saved addresses
    document.querySelectorAll('.address-option').forEach(option => {
      option.classList.remove('selected');
    });
    selectedAddress = null;
    
    // Prefill email if available
    if (currentUser && currentUser.email) {
      document.getElementById('email').value = currentUser.email;
    }
  }
};

const getAddressFromForm = () => {
  return {
    fullName: document.getElementById('fullName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    line1: document.getElementById('line1').value.trim(),
    line2: document.getElementById('line2').value.trim(),
    city: document.getElementById('city').value.trim(),
    postal: document.getElementById('postal').value.trim(),
    country: document.getElementById('country').value
  };
};

const validateAddress = (address) => {
  if (!address.fullName) return 'Full name is required';
  if (!address.email) return 'Email is required';
  if (!address.phone) return 'Phone is required';
  if (!address.line1) return 'Address line 1 is required';
  if (!address.city) return 'City is required';
  if (!address.postal) return 'Postal code is required';
  if (!address.country) return 'Country is required';
  return null;
};

// Shipping Method Selection
const selectShippingMethod = (method) => {
  selectedShippingMethod = method;
  
  // Update shipping cost
  const shippingCosts = {
    'standard': 500,
    'express': 1000,
    'pickup': 0
  };
  shippingCost = shippingCosts[method] || 500;
  
  // Update UI
  document.querySelectorAll('#shippingOptions .payment-option').forEach(option => {
    option.classList.toggle('selected', option.dataset.method === method);
  });
  
  // Update radio button
  const radio = document.querySelector(`input[name="shipping"][value="${method}"]`);
  if (radio) radio.checked = true;
  
  // Recalculate totals
  renderOrderSummary();
};

// Stock Validation
const validateStock = async () => {
  try {
    // Basic validation: check cart is not empty
    if (cartItems.length === 0) {
      throw new Error('Your cart is empty');
    }

    // In a real implementation, you would query your inventory API
    // For now, just ensure all items have quantities
    for (const item of cartItems) {
      if (!item.quantity || item.quantity < 1) {
        throw new Error(`Invalid quantity for ${item.title || 'Product'}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Stock validation error:', error);
    throw error;
  }
};

// Step Navigation
const goToStep = (step) => {
  // Hide all steps
  document.getElementById('step1')?.style.setProperty('display', 'none');
  document.getElementById('step2')?.style.setProperty('display', 'none');
  document.getElementById('step3')?.style.setProperty('display', 'none');
  document.getElementById('step4')?.style.setProperty('display', 'none');
  
  // Update step indicators
  [1, 2, 3, 4].forEach(i => {
    const indicator = document.getElementById(`step${i}Indicator`);
    if (indicator) {
      indicator.classList.remove('active', 'completed');
      if (i < step) indicator.classList.add('completed');
      if (i === step) indicator.classList.add('active');
    }
  });
  
  // Show current step
  const stepEl = document.getElementById(`step${step}`);
  if (stepEl) stepEl.style.display = 'block';
  
  currentStep = step;
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const goToStep1 = () => goToStep(1);

const goToStep2 = async () => {
  // Validate address
  let addressToValidate;
  
  if (selectedAddress) {
    addressToValidate = selectedAddress;
  } else {
    addressToValidate = getAddressFromForm();
    const error = validateAddress(addressToValidate);
    if (error) {
      showToast(error, 'error');
      return;
    }
  }
  
  goToStep(2);
};

const goToStep3 = () => {
  // Shipping method selected, move to payment
  updateReviewSection();
  goToStep(3);
};

const goToStep4 = () => {
  // Update review section with all details
  updateReviewSection();
  goToStep(4);
};

const updateReviewSection = () => {
  // Update address review
  const addressReview = document.getElementById('reviewAddress');
  if (addressReview) {
    let address = selectedAddress || getAddressFromForm();
    
    addressReview.innerHTML = `
      <strong>${address.fullName}</strong><br>
      ${address.line1}${address.line2 ? ', ' + address.line2 : ''}<br>
      ${address.city}, ${address.postal}<br>
      ${address.country}<br>
      <br>
      <strong>Email:</strong> ${address.email}<br>
      <strong>Phone:</strong> ${address.phone}
    `;
  }
  
  // Update shipping review
  const shippingReview = document.getElementById('reviewShipping');
  if (shippingReview) {
    const shippingNames = {
      'standard': 'Standard Shipping (3-5 business days) - LKR 500',
      'express': 'Express Shipping (1-2 business days) - LKR 1,000',
      'pickup': 'Store Pickup (FREE) - Matara Store'
    };
    
    shippingReview.innerHTML = `
      <strong>${shippingNames[selectedShippingMethod] || 'Standard Shipping'}</strong>
    `;
  }
  
  // Update payment review
  const paymentReview = document.getElementById('reviewPayment');
  if (paymentReview) {
    const paymentNames = {
      'cod': 'Cash on Delivery',
      'bank': 'Bank Transfer',
      'card': 'Credit/Debit Card (PayHere)'
    };
    
    const paymentDescriptions = {
      'cod': 'Pay with cash when your order is delivered',
      'bank': 'Transfer payment to our bank account',
      'card': 'Pay securely via PayHere payment gateway'
    };
    
    paymentReview.innerHTML = `
      <strong>${paymentNames[selectedPaymentMethod] || 'Cash on Delivery'}</strong><br>
      ${paymentDescriptions[selectedPaymentMethod] || ''}
    `;
  }
};

// Payment Method Selection
const selectPaymentMethod = (method) => {
  selectedPaymentMethod = method;
  
  // Update UI
  document.querySelectorAll('#paymentOptions .payment-option').forEach(option => {
    option.classList.toggle('selected', option.dataset.method === method);
  });
  
  // Update radio button
  const radio = document.querySelector(`input[name="payment"][value="${method}"]`);
  if (radio) radio.checked = true;
};

// Order Placement
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
};

// Backend helpers
const API_BASE = `${window.location.origin.replace(/\/$/,'')}/api`;
async function postJSON(path, body){
  const res = await fetch(`${API_BASE}/${path}`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(()=>({ success:false, error:'Invalid JSON'}));
  if(!res.ok || data.success === false){ throw new Error(data.error || data.message || `Request failed: ${path}`); }
  return data;
}
async function updateOrderStatusAPI(orderNumber, status, payment_status){
  try{ return await postJSON('update-order-status.php', { order_number: orderNumber, status, payment_status }); }
  catch(e){ console.error('updateOrderStatusAPI failed:', e); return { success:false, error:e.message }; }
}
async function createOrderViaAPI(orderData){
  const payload = {
    user_id: (currentUser && currentUser.uid) ? String(currentUser.uid) : 'guest',
    user_email: orderData.userEmail,
    items: cartItems.map(i=>({
      productId: i.id || null,
      name: i.title || i.name || 'Product',
      sku: i.sku || '',
      quantity: Number(i.quantity||1),
      price: Number(i.price||0),
      subtotal: Number((i.price||0) * (i.quantity||1))
    })),
    shipping_address: orderData.shippingAddress,
    shipping_method: orderData.shippingMethod,
    shipping_cost: Number(orderData.shipping),
    payment_method: orderData.paymentMethod === 'card' ? 'card' : orderData.paymentMethod,
    subtotal: Number(orderData.subtotal || 0),
    tax: Number(orderData.tax || 0),
    discount: Number(orderData.discount || 0),
    total: Number(orderData.total || 0)
  };
  const resp = await postJSON('create-order.php', payload);
  return resp.order; // { id, order_number, status, total }
}

const placeOrder = async () => {
  const placeOrderBtn = document.getElementById('placeOrderBtn');
  placeOrderBtn.disabled = true;
  placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  try {
    await validateStock();
    let shippingAddress = selectedAddress || getAddressFromForm();
    const error = validateAddress(shippingAddress); if (error) throw new Error(error);
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    const tax = subtotal * taxRate; const total = subtotal + shippingCost + tax - discount;
    const orderData = {
      userId: currentUser ? currentUser.uid : 'guest',
      userEmail: (currentUser && currentUser.email) ? currentUser.email : shippingAddress.email,
      orderNumber: generateOrderNumber(),
      items: cartItems.map(item => ({ id:item.id, title:item.title||item.name, price:item.price, quantity:item.quantity||1, image:item.image||'', sku:item.sku||'' })),
      shippingAddress: { fullName: shippingAddress.fullName, email: shippingAddress.email, phone: shippingAddress.phone, line1: shippingAddress.line1, line2: shippingAddress.line2 || '', city: shippingAddress.city, postal: shippingAddress.postal, country: shippingAddress.country },
      shippingMethod: selectedShippingMethod,
      paymentMethod: selectedPaymentMethod,
      subtotal, shipping: shippingCost, tax, discount, total,
      status: selectedPaymentMethod === 'card' ? 'payment_pending' : 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    // Create order in backend DB
    const backendOrder = await createOrderViaAPI(orderData);
    const backendOrderNumber = backendOrder.order_number;
    console.log('Backend order created:', backendOrderNumber);
    if (selectedPaymentMethod === 'card') {
      // Start PayHere using backend order number
      initiatePayHerePayment(backendOrderNumber, orderData);
    } else {
      // COD or Bank: mark pending and redirect
      await updateOrderStatusAPI(backendOrderNumber, 'pending', 'pending');
      await clearCartAndRedirect(backendOrderNumber, backendOrderNumber);
    }
  } catch (error) {
    console.error('Error placing order:', error);
    showToast(error.message || 'Failed to place order. Please try again.', 'error');
    placeOrderBtn.disabled = false; placeOrderBtn.innerHTML = '<i class="fas fa-lock"></i> Place Order';
  }
};

const initiatePayHerePayment = (orderId, orderData) => {
  // PayHere Sandbox Integration
  const merchantId = '1228097'; // PayHere Test Merchant ID
  const payment = {
    sandbox: true,
    merchant_id: merchantId,
    return_url: `${window.location.origin}/order-success.html?orderNumber=${orderId}`,
    cancel_url: `${window.location.origin}/checkout.html?cancelled=1`,
    notify_url: `${window.location.origin}/api/payhere-notify.php`,
    order_id: orderId,
    items: orderData.items.map(i => i.title).join(', '),
    amount: orderData.total.toFixed(2),
    currency: 'LKR',
    first_name: (orderData.shippingAddress.fullName || 'Customer').split(' ')[0],
    last_name: (orderData.shippingAddress.fullName || '').split(' ').slice(1).join(' '),
    email: orderData.shippingAddress.email,
    phone: orderData.shippingAddress.phone,
    address: orderData.shippingAddress.line1,
    city: orderData.shippingAddress.city,
    country: orderData.shippingAddress.country
  };
  if (window.payhere) {
    window.payhere.onCompleted = async function(completedOrderId) {
      console.log('Payment completed:', completedOrderId);
      await updateOrderStatusAPI(orderId, 'confirmed', 'completed');
      await clearCartAndRedirect(orderId, orderId);
    };
    window.payhere.onDismissed = function() {
      console.log('Payment dismissed');
      const btn = document.getElementById('placeOrderBtn'); if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-lock"></i> Place Order'; }
      showToast('Payment was cancelled. You can try again or choose another payment method.', 'info');
    };
    window.payhere.onError = async function(error) {
      console.error('PayHere error:', error);
      await updateOrderStatusAPI(orderId, 'payment_failed', 'failed');
      const btn = document.getElementById('placeOrderBtn'); if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-lock"></i> Place Order'; }
      showToast('Payment failed. Please try again or choose Cash on Delivery.', 'error');
    };
    window.payhere.startPayment(payment);
  } else {
    console.error('PayHere SDK not loaded');
    showToast('Payment gateway not available. Please try Cash on Delivery.', 'error');
    const btn = document.getElementById('placeOrderBtn'); if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-lock"></i> Place Order'; }
  }
};

const clearCartAndRedirect = async (orderNumber, orderId) => {
  try {
    // Clear cart
    localStorage.removeItem('oc_cart');
    if (window.CartManager) {
      await window.CartManager.clearCart();
    }

    // Redirect to order success page
    setTimeout(() => {
      window.location.href = `order-success.html?orderNumber=${orderNumber}`;
    }, 1000);
  } catch (error) {
    console.error('Error clearing cart:', error);
    // Still redirect even if clearing fails
    setTimeout(() => {
      window.location.href = `order-success.html?orderNumber=${orderNumber}`;
    }, 1000);
  }
};

// Event Listeners
const setupEventListeners = () => {
  // New address toggle
  const newAddressToggle = document.getElementById('newAddressToggle');
  if (newAddressToggle) {
    newAddressToggle.addEventListener('click', toggleNewAddressForm);
  }
  
  // Step 1 -> Step 2 (Address -> Shipping)
  const continueToShipping = document.getElementById('continueToShipping');
  if (continueToShipping) {
    continueToShipping.addEventListener('click', goToStep2);
  }
  
  // Step 2 -> Step 1 (Back to Address)
  const backToAddress = document.getElementById('backToAddress');
  if (backToAddress) {
    backToAddress.addEventListener('click', goToStep1);
  }
  
  // Step 2 -> Step 3 (Shipping -> Payment)
  const continueToPaymentMethod = document.getElementById('continueToPaymentMethod');
  if (continueToPaymentMethod) {
    continueToPaymentMethod.addEventListener('click', goToStep3);
  }
  
  // Step 3 -> Step 2 (Back to Shipping)
  const backToShipping = document.getElementById('backToShipping');
  if (backToShipping) {
    backToShipping.addEventListener('click', () => goToStep(2));
  }
  
  // Step 3 -> Step 4 (Payment -> Review)
  const continueToReview = document.getElementById('continueToReview');
  if (continueToReview) {
    continueToReview.addEventListener('click', goToStep4);
  }
  
  // Step 4 -> Step 3 (Back to Payment)
  const backToPayment = document.getElementById('backToPayment');
  if (backToPayment) {
    backToPayment.addEventListener('click', () => goToStep(3));
  }
  
  // Place order
  const placeOrderBtn = document.getElementById('placeOrderBtn');
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', placeOrder);
  }
  
  // Shipping option selection
  document.querySelectorAll('#shippingOptions .payment-option').forEach(option => {
    option.addEventListener('click', () => {
      const method = option.dataset.method;
      selectShippingMethod(method);
    });
  });
  
  // Shipping radio buttons
  document.querySelectorAll('input[name="shipping"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectShippingMethod(e.target.value);
    });
  });
  
  // Payment option selection
  document.querySelectorAll('#paymentOptions .payment-option').forEach(option => {
    option.addEventListener('click', () => {
      const method = option.dataset.method;
      selectPaymentMethod(method);
    });
  });
  
  // Payment radio buttons
  document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectPaymentMethod(e.target.value);
    });
  });
};

// ============================================
// EXPOSE FUNCTIONS TO WINDOW (for onclick handlers)
// ============================================
window.toggleNewAddressForm = toggleNewAddressForm;
window.selectShippingMethod = selectShippingMethod;
window.selectPaymentMethod = selectPaymentMethod;
window.goToStep = goToStep;
window.goToStep1 = goToStep1;
window.goToStep2 = goToStep2;
window.goToStep3 = goToStep3;
window.goToStep4 = goToStep4;
window.placeOrder = placeOrder;

// Initialize
const init = async () => {
  try {
    // Load cart immediately
    await loadCart();

    // Setup event listeners
    setupEventListeners();
    
    // Start at step 1
    goToStep(1);
  } catch (error) {
    console.error('Checkout init error:', error);
    showToast('Error loading checkout page', 'error');
  }
};

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
