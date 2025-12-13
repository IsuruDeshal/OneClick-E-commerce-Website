// C:\xampp\htdocs\oneclick\public\js\cart-manager.js
// Cart state management with persistence - Fixes Issues #1, #5, #9
// Handles localStorage sync + Supabase sync for authenticated users

import { supabase } from './supabaseClient.js';

class CartManager {
    constructor() {
        this.cart = [];
        this.isLoaded = false;
        this.loadCart();
    }

    /**
     * Load cart from localStorage or Supabase (Issue #1)
     */
    async loadCart() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                // Load from Supabase for authenticated users
                const { data: items, error } = await supabase
                    .from('cart_items')
                    .select('*')
                    .eq('user_id', session.user.id);
                
                if (error) {
                    console.warn('Supabase cart load failed:', error.message);
                    this.cart = this.getLocalCart();
                } else {
                    this.cart = items || [];
                }
            } else {
                // Load from localStorage for guests
                this.cart = this.getLocalCart();
            }
            
            this.isLoaded = true;
            console.log('✓ Cart loaded:', this.cart.length, 'items');
            this.notifyUpdate();
        } catch (error) {
            console.error('Cart load error:', error);
            this.cart = this.getLocalCart();
        }
    }

    /**
     * Get cart from localStorage
     */
    getLocalCart() {
        try {
            return JSON.parse(localStorage.getItem('cart') || '[]');
        } catch (e) {
            console.error('Invalid localStorage cart:', e);
            return [];
        }
    }

    /**
     * Persist cart to localStorage (Issue #1)
     */
    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
        console.log('✓ Cart saved to localStorage');
    }

    /**
     * Add item to cart
     */
    async addItem(productId, quantity = 1, details = {}) {
        const existing = this.cart.find(item => item.product_id === productId);
        
        if (existing) {
            existing.quantity += quantity;
        } else {
            this.cart.push({ 
                product_id: productId, 
                quantity,
                ...details 
            });
        }
        
        this.saveCart();
        this.notifyUpdate();
        console.log('✓ Added to cart:', productId, 'qty:', quantity);
    }

    /**
     * Remove item from cart
     */
    async removeItem(productId) {
        const initialLength = this.cart.length;
        this.cart = this.cart.filter(item => item.product_id !== productId);
        
        if (this.cart.length < initialLength) {
            this.saveCart();
            this.notifyUpdate();
            console.log('✓ Removed from cart:', productId);
        }
    }

    /**
     * Get cart total count
     */
    getCount() {
        return this.cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    }

    /**
     * Get cart total price
     */
    getTotal() {
        return this.cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    }

    /**
     * Clear cart
     */
    clear() {
        this.cart = [];
        localStorage.removeItem('cart');
        this.notifyUpdate();
        console.log('✓ Cart cleared');
    }

    /**
     * Merge guest cart with user account on login (Issue #1)
     */
    async mergeOnLogin(userId) {
        if (this.cart.length === 0) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch('/oneclick/api/user/cart.php?action=merge', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ items: this.cart })
            });

            const result = await response.json();
            if (result.success) {
                this.clear();
                console.log('✓ Cart merged on login');
            }
        } catch (error) {
            console.error('Cart merge failed:', error);
        }
    }

    /**
     * Sync cart with API before checkout (Issue #1)
     */
    async syncBeforeCheckout() {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            alert('Please log in before checkout');
            window.location.href = '/oneclick/account.html?redirect=checkout';
            return false;
        }

        try {
            const response = await fetch('/oneclick/api/user/cart.php?action=get', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const result = await response.json();
            
            if (result.success) {
                this.cart = result.data || [];
                console.log('✓ Cart synced from server');
                return true;
            }
        } catch (error) {
            console.error('Cart sync failed:', error);
        }
        return false;
    }

    /**
     * Notify listeners of cart update
     */
    notifyUpdate() {
        const event = new CustomEvent('cartUpdated', { 
            detail: { count: this.getCount(), total: this.getTotal(), items: this.cart } 
        });
        window.dispatchEvent(event);
    }
}

export const cartManager = new CartManager();

// Listen for cart updates globally
window.addEventListener('cartUpdated', (event) => {
    const icon = document.querySelector('[data-cart-count]');
    if (icon) {
        icon.textContent = event.detail.count || '0';
    }
});
