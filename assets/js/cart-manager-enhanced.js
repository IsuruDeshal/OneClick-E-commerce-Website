/**
 * ========================================
 * ENHANCED CART MANAGER - One Click Computers
 * ========================================
 * Works with Supabase PostgreSQL + LocalStorage fallback
 * No Firebase dependency
 */

class CartManager {
  constructor() {
    this.cart = [];
    this.user = null;
    this.API_URL = 'https://YOUR-EC2-IP/api'; // Will be replaced during deployment
  }

  /**
   * Initialize cart
   */
  async init() {
    // Check if user is logged in
    this.user = this.getStoredUser();

    // Load cart from appropriate source
    if (this.user) {
      await this.loadFromServer();
    } else {
      this.loadFromLocalStorage();
    }

    // Update UI
    this.updateCartBadge();

    // Wire up event listeners
    this.wireEventListeners();
  }

  /**
   * Get stored user from sessionStorage
   */
  getStoredUser() {
    try {
      const userData = sessionStorage.getItem('oneclick_user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Load cart from localStorage
   */
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('oneclick_cart');
      this.cart = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading cart:', error);
      this.cart = [];
    }
  }

  /**
   * Save cart to localStorage
   */
  saveToLocalStorage() {
    try {
      localStorage.setItem('oneclick_cart', JSON.stringify(this.cart));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }

  /**
   * Load cart from server (Supabase)
   */
  async loadFromServer() {
    if (!this.user) {
      this.loadFromLocalStorage();
      return;
    }

    try {
      const response = await fetch(`${this.API_URL}/cart/get-cart.php`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        this.cart = data.items || [];
      } else {
        this.loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading cart from server:', error);
      this.loadFromLocalStorage();
    }
  }

  /**
   * Add item to cart
   */
  async addItem(product) {
    try {
      // Check if item already in cart
      const existingIndex = this.cart.findIndex(item => item.id === product.id);

      if (existingIndex !== -1) {
        // Increase quantity
        this.cart[existingIndex].quantity += 1;
      } else {
        // Add new item
        this.cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image_url || product.image,
          quantity: 1,
          sku: product.sku
        });
      }

      // Save to appropriate storage
      if (this.user) {
        await this.syncToServer();
      } else {
        this.saveToLocalStorage();
      }

      // Update UI
      this.updateCartBadge();
      this.showNotification(`${product.name} added to cart!`, 'success');

      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      this.showNotification('Failed to add item to cart', 'error');
      return false;
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId) {
    try {
      this.cart = this.cart.filter(item => item.id !== itemId);

      if (this.user) {
        await this.syncToServer();
      } else {
        this.saveToLocalStorage();
      }

      this.updateCartBadge();
      this.updateCartPage();
      this.showNotification('Item removed from cart', 'info');

      return true;
    } catch (error) {
      console.error('Error removing item:', error);
      return false;
    }
  }

  /**
   * Update item quantity
   */
  async updateQuantity(itemId, quantity) {
    try {
      if (quantity <= 0) {
        return this.removeItem(itemId);
      }

      const item = this.cart.find(item => item.id === itemId);
      if (item) {
        item.quantity = quantity;

        if (this.user) {
          await this.syncToServer();
        } else {
          this.saveToLocalStorage();
        }

        this.updateCartPage();
      }

      return true;
    } catch (error) {
      console.error('Error updating quantity:', error);
      return false;
    }
  }

  /**
   * Clear cart
   */
  async clearCart() {
    try {
      this.cart = [];

      if (this.user) {
        await this.syncToServer();
      } else {
        this.saveToLocalStorage();
      }

      this.updateCartBadge();
      this.updateCartPage();

      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  }

  /**
   * Sync cart to server
   */
  async syncToServer() {
    if (!this.user) return;

    try {
      const response = await fetch(`${this.API_URL}/cart/sync-cart.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          items: this.cart
        })
      });

      const data = await response.json();
      if (!data.success) {
        console.error('Failed to sync cart to server');
      }
    } catch (error) {
      console.error('Error syncing cart:', error);
    }
  }

  /**
   * Get cart items
   */
  getItems() {
    return this.cart;
  }

  /**
   * Get cart count
   */
  getCount() {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Get cart total
   */
  getTotal() {
    return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  /**
   * Update cart badge
   */
  updateCartBadge() {
    const badges = document.querySelectorAll('.cart-badge, .cart-count');
    const count = this.getCount();

    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  /**
   * Update cart page UI
   */
  updateCartPage() {
    const cartContainer = document.getElementById('cartItems');
    const emptyCart = document.getElementById('emptyCart');
    const cartSummary = document.getElementById('cartSummary');

    if (!cartContainer) return;

    if (this.cart.length === 0) {
      if (cartContainer) cartContainer.style.display = 'none';
      if (emptyCart) emptyCart.style.display = 'block';
      if (cartSummary) cartSummary.style.display = 'none';
      return;
    }

    if (cartContainer) cartContainer.style.display = 'block';
    if (emptyCart) emptyCart.style.display = 'none';
    if (cartSummary) cartSummary.style.display = 'block';

    // Render cart items
    const itemsHTML = this.cart.map(item => `
      <div class="cart-item" data-item-id="${item.id}">
        <img src="${item.image || 'assets/img/product.svg'}" alt="${item.name}" class="cart-item-image">
        <div class="cart-item-details">
          <h3 class="cart-item-name">${item.name}</h3>
          <p class="cart-item-price">LKR ${parseFloat(item.price).toLocaleString()}</p>
        </div>
        <div class="cart-item-actions">
          <div class="quantity-controls">
            <button class="qty-btn" onclick="cartManager.updateQuantity(${item.id}, ${item.quantity - 1})">
              <i class="fas fa-minus"></i>
            </button>
            <input type="number" value="${item.quantity}" min="1" class="qty-input" 
                   onchange="cartManager.updateQuantity(${item.id}, parseInt(this.value))">
            <button class="qty-btn" onclick="cartManager.updateQuantity(${item.id}, ${item.quantity + 1})">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <p class="cart-item-subtotal">LKR ${(item.price * item.quantity).toLocaleString()}</p>
          <button class="btn-remove" onclick="cartManager.removeItem(${item.id})">
            <i class="fas fa-trash"></i> Remove
          </button>
        </div>
      </div>
    `).join('');

    cartContainer.innerHTML = itemsHTML;

    // Update summary
    const subtotalEl = document.getElementById('cartSubtotal');
    const totalEl = document.getElementById('cartTotal');

    if (subtotalEl) subtotalEl.textContent = `LKR ${this.getTotal().toLocaleString()}`;
    if (totalEl) totalEl.textContent = `LKR ${this.getTotal().toLocaleString()}`;
  }

  /**
   * Wire up event listeners
   */
  wireEventListeners() {
    // Add to cart buttons
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.add-to-cart-btn, [data-action="add-to-cart"]');
      if (!btn) return;

      e.preventDefault();

      const productData = this.extractProductData(btn);
      if (productData) {
        await this.addItem(productData);
      }
    });
  }

  /**
   * Extract product data from button
   */
  extractProductData(btn) {
    try {
      // Try data attributes first
      if (btn.dataset.product) {
        return JSON.parse(btn.dataset.product);
      }

      // Try to find product card
      const card = btn.closest('.product-card, .product-item, [data-product-id]');
      if (card) {
        return {
          id: card.dataset.productId || card.dataset.id,
          name: card.querySelector('.product-name, .product-title')?.textContent?.trim(),
          price: parseFloat(card.querySelector('.product-price, .price')?.textContent?.replace(/[^0-9.]/g, '')),
          image: card.querySelector('.product-image, img')?.src,
          sku: card.dataset.sku || `SKU-${card.dataset.productId}`
        };
      }

      return null;
    } catch (error) {
      console.error('Error extracting product data:', error);
      return null;
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Create global instance
window.cartManager = new CartManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.cartManager.init());
} else {
  window.cartManager.init();
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

