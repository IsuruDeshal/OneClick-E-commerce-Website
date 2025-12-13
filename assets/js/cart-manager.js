/**
 * ========================================
 * CART MANAGER - One Click Computers (Firebase removed)
 * ========================================
 * Unified cart management system
 * Features:
 * - Instant cart count update
 * - LocalStorage primary storage
 * - Optional future Supabase sync (placeholder)
 * - Real-time UI updates
 */

class CartManager {
  constructor() {
    this.cart = [];
    this.listeners = [];
    this.initialized = false;
    this.user = null; // reserved for future Supabase user
    this.STORAGE_KEY = 'oneclick_cart';
  }

  /** Initialize cart manager */
  async init() {
    if (this.initialized) return;
    // Load from local storage immediately
    this.loadFromLocalStorage();
    this.updateAllBadges();
    this.wireAddToCartButtons();
    this.initialized = true;
  }

  /** Load cart from localStorage */
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      this.cart = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      this.cart = [];
    }
  }

  /** Save cart to localStorage */
  saveToLocalStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cart));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }

  /** Add item to cart */
  async addItem(product) {
    try {
      if (!product || !product.id) {
        console.error('Invalid product:', product);
        return false;
      }
      const id = String(product.id);
      const price = parseFloat(product.price) || 0;
      const title = product.title || product.name || 'Product';
      const image = product.image || product.image_url || 'assets/img/placeholder.png';

      const existingIndex = this.cart.findIndex(item => String(item.id) === id);
      if (existingIndex !== -1) {
        this.cart[existingIndex].qty = (this.cart[existingIndex].qty || 1) + 1;
      } else {
        this.cart.push({ id, title, price, image, qty: 1, addedAt: new Date().toISOString() });
      }

      this.saveToLocalStorage();
      this.updateAllBadges();
      this.notifyListeners();
      this.showNotification('✓ Added to cart', 'success');
      return true;
    } catch (error) {
      console.error('Error adding item to cart:', error);
      this.showNotification('✗ Failed to add to cart', 'error');
      return false;
    }
  }

  /** Remove item from cart */
  async removeItem(productId) {
    try {
      const id = String(productId);
      this.cart = this.cart.filter(item => String(item.id) !== id);
      this.saveToLocalStorage();
      this.updateAllBadges();
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Error removing item from cart:', error);
      return false;
    }
  }

  /** Update item quantity */
  async updateQuantity(productId, qty) {
    try {
      const id = String(productId);
      const item = this.cart.find(item => String(item.id) === id);
      if (!item) return false;
      if (qty <= 0) return await this.removeItem(id);
      item.qty = parseInt(qty);
      this.saveToLocalStorage();
      this.updateAllBadges();
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Error updating quantity:', error);
      return false;
    }
  }

  /** Clear cart */
  async clear() {
    try {
      this.cart = [];
      this.saveToLocalStorage();
      this.updateAllBadges();
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  }

  /** Getters */
  getItems() { return [...this.cart]; }
  getCount() { return this.cart.reduce((t,i)=> t + (i.qty||1), 0); }
  getTotal() { return this.cart.reduce((t,i)=> t + (parseFloat(i.price)||0)*(parseInt(i.qty)||1), 0); }

  /** Update cart badges */
  updateAllBadges() {
    const count = this.getCount();
    const badges = document.querySelectorAll('.icon-btn[title="Cart"] .badge, .icon-btn[href*="cart"] .badge, .cart-count, .cart-badge');
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.transform = 'scale(1.2)';
      setTimeout(() => { badge.style.transform = 'scale(1)'; }, 200);
    });
  }

  /** Wire up add-to-cart triggers */
  wireAddToCartButtons() {
    document.addEventListener('click', async (e) => {
      const addBtn = e.target.closest('[data-add-to-cart], .btn-add-cart, .cart-btn');
      if (!addBtn) return;
      e.preventDefault(); e.stopPropagation();
      const original = addBtn.innerHTML; addBtn.disabled = true;
      addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
      try {
        const product = {
          id: addBtn.dataset.id || addBtn.dataset.productId,
          title: addBtn.dataset.title || addBtn.dataset.name,
          name: addBtn.dataset.name,
          price: addBtn.dataset.price,
          image: addBtn.dataset.image
        };
        const ok = await this.addItem(product);
        addBtn.innerHTML = ok ? '<i class="fas fa-check"></i> Added!' : original;
      } catch (err) {
        console.error('Add to cart error:', err);
        addBtn.innerHTML = original;
      } finally {
        setTimeout(()=>{ addBtn.innerHTML = original; addBtn.disabled = false; }, 1200);
      }
    });
  }

  /** Subscribe to changes */
  onChange(callback) { this.listeners.push(callback); }
  notifyListeners() { this.listeners.forEach(cb => { try { cb(this.cart); } catch(e){ console.error(e); } }); }

  /** Toast */
  showNotification(message, type = 'info') {
    let container = document.getElementById('cart-notifications');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cart-notifications';
      container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `cart-notification cart-notification-${type}`;
    el.innerHTML = message;
    el.style.cssText = `background:${type==='success'?'#10b981':type==='error'?'#ef4444':'#3b82f6'};color:#fff;padding:12px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-size:14px;font-weight:500;animation:slideIn .3s ease-out;cursor:pointer;`;
    container.appendChild(el);
    setTimeout(()=>{ el.style.animation = 'slideOut .3s ease-out'; setTimeout(()=> el.remove(), 300); }, 3000);
    el.addEventListener('click', ()=> el.remove());
  }
}

// Animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn { from { transform: translateX(400px); opacity:0;} to { transform: translateX(0); opacity:1;} }
  @keyframes slideOut { from { transform: translateX(0); opacity:1;} to { transform: translateX(400px); opacity:0;} }
`;
document.head.appendChild(style);

// Global instance
window.CartManager = new CartManager();

document.addEventListener('DOMContentLoaded', () => { window.CartManager.init(); });

// CommonJS export (no-op in browser)
if (typeof module !== 'undefined' && module.exports) { module.exports = CartManager; }
