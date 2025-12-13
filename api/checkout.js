// C:\xampp\htdocs\oneclick\api\checkout.js
// Checkout functionality - Fixes Issues #2, #3 (no debugger, proper cart loading)

// Wait for supabase to be initialized globally
let supabase = null;

async function ensureSupabase() {
    if (!supabase) {
        supabase = await window.ensureSupabase();
    }
    return supabase;
}

/**
 * Load cart on checkout page
 * Issue #2: Cart was empty because not loaded from localStorage/Supabase
 */
async function loadCart() {
    try {
        supabase = await ensureSupabase();
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        let cartItems = [];
        
        if (session) {
            // Try to load from Supabase first (if user is logged in)
            const { data, error } = await supabase
                .from('cart_items')
                .select('*, products(*)')
                .eq('user_id', session.user.id);
            
            if (error) {
                console.warn('Failed to load cart from Supabase:', error);
                // Fall back to localStorage
                cartItems = JSON.parse(localStorage.getItem('checkout-cart') || '[]');
            } else {
                cartItems = data || [];
            }
        } else {
            // Load from localStorage for guests
            cartItems = JSON.parse(localStorage.getItem('checkout-cart') || '[]');
        }
        
        console.log('✓ Cart loaded:', cartItems.length, 'items');
        
        // If cart is empty, show message
        if (cartItems.length === 0) {
            showEmptyCart();
            return;
        }
        
        // Display cart items
        displayCart(cartItems);
        
    } catch (error) {
        console.error('Error loading cart:', error);
        showError('Failed to load cart: ' + error.message);
    }
}

/**
 * Display cart items and calculate totals
 */
function displayCart(items) {
    const cartContainer = document.getElementById('cart-items');
    if (!cartContainer) return;
    
    let subtotal = 0;
    let html = '';
    
    items.forEach((item, idx) => {
        const price = parseFloat(item.price || item.products?.price || 0);
        const quantity = parseInt(item.quantity || 1);
        const itemTotal = price * quantity;
        subtotal += itemTotal;
        
        html += `
            <div class="cart-item" data-item-index="${idx}">
                <div class="item-info">
                    <h4>${item.name || item.products?.name || 'Unknown Product'}</h4>
                    <p>Qty: ${quantity} × LKR ${price.toFixed(2)}</p>
                </div>
                <div class="item-price">
                    LKR ${itemTotal.toFixed(2)}
                </div>
                <button class="btn-remove" onclick="removeFromCart(${idx})">
                    ✕
                </button>
            </div>
        `;
    });
    
    cartContainer.innerHTML = html;
    
    // Update totals
    const shippingCost = 500; // Default shipping
    const tax = 0;
    const total = subtotal + shippingCost + tax;
    
    document.getElementById('subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('shipping').textContent = shippingCost.toFixed(2);
    document.getElementById('tax').textContent = tax.toFixed(2);
    document.getElementById('total').textContent = total.toFixed(2);
    
    console.log(`✓ Cart displayed: Subtotal=LKR${subtotal.toFixed(2)}, Total=LKR${total.toFixed(2)}`);
}

/**
 * Show empty cart message
 */
function showEmptyCart() {
    const cartContainer = document.getElementById('cart-items');
    if (cartContainer) {
        cartContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <h3>Your cart is empty</h3>
                <p><a href="shop.html">Continue shopping</a></p>
            </div>
        `;
    }
    
    // Hide checkout form
    const form = document.getElementById('checkout-form');
    if (form) form.style.display = 'none';
}

/**
 * Remove item from cart
 */
function removeFromCart(index) {
    const cartItems = JSON.parse(localStorage.getItem('checkout-cart') || '[]');
    cartItems.splice(index, 1);
    localStorage.setItem('checkout-cart', JSON.stringify(cartItems));
    
    // Reload display
    if (cartItems.length === 0) {
        showEmptyCart();
    } else {
        displayCart(cartItems);
    }
}

/**
 * Show error message
 */
function showError(msg) {
    const errorContainer = document.getElementById('error-message');
    if (errorContainer) {
        errorContainer.innerHTML = `<div class="error-alert">${msg}</div>`;
        setTimeout(() => {
            errorContainer.innerHTML = '';
        }, 5000);
    } else {
        console.error('ERROR:', msg);
    }
}

/**
 * Submit checkout form
 */
async function submitCheckout() {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            alert('Please log in to checkout');
            window.location.href = '/oneclick/account.html?redirect=checkout';
            return;
        }
        
        // Get form data
        const formData = new FormData(document.getElementById('checkout-form'));
        const cartItems = JSON.parse(localStorage.getItem('checkout-cart') || '[]');
        
        // Create order
        const response = await fetch('/oneclick/api/user/orders.php?action=create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: cartItems,
                shipping_address: Object.fromEntries(formData),
                payment_method: formData.get('payment_method')
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Clear cart
            localStorage.removeItem('checkout-cart');
            alert('Order placed successfully!');
            window.location.href = `/oneclick/account.html?order=${result.data.order_id}`;
        } else {
            showError('Checkout failed: ' + (result.message || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Checkout error:', error);
        showError('Error: ' + error.message);
    }
}

// Export functions
window.loadCart = loadCart;
window.removeFromCart = removeFromCart;
window.submitCheckout = submitCheckout;

// Load cart when page loads (Issue #2 - Fix)
document.addEventListener('DOMContentLoaded', loadCart);
