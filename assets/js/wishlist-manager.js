/**
 * ========================================
 * WISHLIST MANAGER - One Click Computers
 * ========================================
 * Manages wishlist with Supabase + LocalStorage fallback
 */

class WishlistManager {
  constructor() {
    this.wishlist = [];
    this.user = null;
    this.API_URL = 'https://YOUR-EC2-IP/api';
  }

  /**
   * Initialize wishlist
   */
  async init() {
    this.user = window.authManager?.getCurrentUser();

    if (this.user) {
      await this.loadFromServer();
    } else {
      this.loadFromLocalStorage();
    }

    this.updateWishlistBadge();
    this.wireEventListeners();
  }

  /**
   * Load from localStorage
   */
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('oneclick_wishlist');
      this.wishlist = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading wishlist:', error);
      this.wishlist = [];
    }
  }

  /**
   * Save to localStorage
   */
  saveToLocalStorage() {
    try {
      localStorage.setItem('oneclick_wishlist', JSON.stringify(this.wishlist));
    } catch (error) {
      console.error('Error saving wishlist:', error);
    }
  }

  /**
   * Load from server
   */
  async loadFromServer() {
    if (!this.user) {
      this.loadFromLocalStorage();
      return;
    }

    try {
      const response = await fetch(`${this.API_URL}/wishlist/get-wishlist.php`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        this.wishlist = data.items || [];
      } else {
        this.loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading wishlist from server:', error);
      this.loadFromLocalStorage();
    }
  }

  /**
   * Add item to wishlist
   */
  async addItem(product) {
    try {
      // Check if already in wishlist
      if (this.isInWishlist(product.id)) {
        this.showNotification(`${product.name} is already in your wishlist`, 'info');
        return false;
      }

      // Add to wishlist
      this.wishlist.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image_url || product.image,
        sku: product.sku
      });

      // Save
      if (this.user) {
        await this.syncToServer();
      } else {
        this.saveToLocalStorage();
      }

      this.updateWishlistBadge();
      this.updateWishlistButtons();
      this.showNotification(`${product.name} added to wishlist!`, 'success');

      return true;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      this.showNotification('Failed to add to wishlist', 'error');
      return false;
    }
  }

  /**
   * Remove item from wishlist
   */
  async removeItem(itemId) {
    try {
      this.wishlist = this.wishlist.filter(item => item.id !== itemId);

      if (this.user) {
        await this.syncToServer();
      } else {
        this.saveToLocalStorage();
      }

      this.updateWishlistBadge();
      this.updateWishlistButtons();
      this.updateWishlistPage();
      this.showNotification('Item removed from wishlist', 'info');

      return true;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      return false;
    }
  }

  /**
   * Check if item is in wishlist
   */
  isInWishlist(itemId) {
    return this.wishlist.some(item => item.id == itemId);
  }

  /**
   * Sync to server
   */
  async syncToServer() {
    if (!this.user) return;

    try {
      const response = await fetch(`${this.API_URL}/wishlist/sync-wishlist.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          items: this.wishlist
        })
      });

      const data = await response.json();
      if (!data.success) {
        console.error('Failed to sync wishlist');
      }
    } catch (error) {
      console.error('Error syncing wishlist:', error);
    }
  }

  /**
   * Get wishlist items
   */
  getItems() {
    return this.wishlist;
  }

  /**
   * Get wishlist count
   */
  getCount() {
    return this.wishlist.length;
  }

  /**
   * Update wishlist badge
   */
  updateWishlistBadge() {
    const badges = document.querySelectorAll('.wishlist-badge, .wishlist-count');
    const count = this.getCount();

    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  /**
   * Update wishlist buttons
   */
  updateWishlistButtons() {
    const buttons = document.querySelectorAll('[data-action="add-to-wishlist"]');

    buttons.forEach(btn => {
      const productId = btn.dataset.productId || btn.closest('[data-product-id]')?.dataset.productId;

      if (productId && this.isInWishlist(productId)) {
        btn.classList.add('in-wishlist');
        btn.innerHTML = '<i class="fas fa-heart"></i>';
        btn.title = 'Remove from wishlist';
      } else {
        btn.classList.remove('in-wishlist');
        btn.innerHTML = '<i class="far fa-heart"></i>';
        btn.title = 'Add to wishlist';
      }
    });
  }

  /**
   * Update wishlist page
   */
  updateWishlistPage() {
    const container = document.getElementById('wishlistItems');
    const emptyWishlist = document.getElementById('emptyWishlist');

    if (!container) return;

    if (this.wishlist.length === 0) {
      if (container) container.style.display = 'none';
      if (emptyWishlist) emptyWishlist.style.display = 'block';
      return;
    }

    if (container) container.style.display = 'grid';
    if (emptyWishlist) emptyWishlist.style.display = 'none';

    const itemsHTML = this.wishlist.map(item => `
      <div class="wishlist-item" data-item-id="${item.id}">
        <button class="remove-btn" onclick="wishlistManager.removeItem(${item.id})">
          <i class="fas fa-times"></i>
        </button>
        <img src="${item.image || 'assets/img/product.svg'}" alt="${item.name}">
        <h3>${item.name}</h3>
        <p class="price">LKR ${parseFloat(item.price).toLocaleString()}</p>
        <button class="btn btn-primary" onclick="addToCartFromWishlist(${item.id})">
          <i class="fas fa-shopping-cart"></i> Add to Cart
        </button>
      </div>
    `).join('');

    container.innerHTML = itemsHTML;
  }

  /**
   * Wire event listeners
   */
  wireEventListeners() {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action="add-to-wishlist"], .wishlist-btn');
      if (!btn) return;

      e.preventDefault();

      // Check if user is logged in (optional requirement)
      if (!window.authManager?.isLoggedIn()) {
        // Allow wishlist for guests using localStorage
        // Or uncomment below to require login:
        // return window.authManager.redirectToLogin();
      }

      const productId = btn.dataset.productId || btn.closest('[data-product-id]')?.dataset.productId;

      if (this.isInWishlist(productId)) {
        await this.removeItem(productId);
      } else {
        const productData = this.extractProductData(btn);
        if (productData) {
          await this.addItem(productData);
        }
      }
    });
  }

  /**
   * Extract product data
   */
  extractProductData(btn) {
    try {
      if (btn.dataset.product) {
        return JSON.parse(btn.dataset.product);
      }

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
window.wishlistManager = new WishlistManager();

// Initialize when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.wishlistManager.init());
} else {
  window.wishlistManager.init();
}

// Helper function to add to cart from wishlist
window.addToCartFromWishlist = async (itemId) => {
  const item = window.wishlistManager.getItems().find(i => i.id == itemId);
  if (item && window.cartManager) {
    await window.cartManager.addItem(item);
  }
};

