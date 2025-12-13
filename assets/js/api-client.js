/**
 * ========================================
 * ONE CLICK COMPUTERS - API CLIENT
 * ========================================
 * Central API service for all frontend-backend communication
 * Handles products, categories, cart, orders, and user data
 */

const API_CONFIG = {
  // Backend API URL - Auto-detect or use Supabase
  BASE_URL: (window.API_CONFIG && window.API_CONFIG.apiUrl)
    ? window.API_CONFIG.apiUrl
    : 'https://pvnlavcuswjxhywbsodm.supabase.co/rest/v1',

  // Request timeout
  TIMEOUT: 10000,
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

class APIClient {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.authToken = this.getAuthToken();
  }

  /**
   * Get authentication token from localStorage
   */
  getAuthToken() {
    return localStorage.getItem('authToken') || null;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    if (token) {
      localStorage.setItem('authToken', token);
      this.authToken = token;
    } else {
      localStorage.removeItem('authToken');
      this.authToken = null;
    }
  }

  /**
   * Make HTTP request with error handling and retry logic
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json'
    };

    // Add auth token if available
    if (this.authToken) {
      defaultHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    // Retry logic
    for (let attempt = 1; attempt <= API_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, config);
        
        // Handle different HTTP status codes
        if (response.ok) {
          const data = await response.json();
          return data;
        }

        // Handle errors
        const errorData = await response.json().catch(() => ({
          message: 'An error occurred'
        }));

        throw {
          status: response.status,
          message: errorData.message || response.statusText,
          data: errorData
        };

      } catch (error) {
        // Retry on network errors
        if (attempt < API_CONFIG.MAX_RETRIES && this.shouldRetry(error)) {
          await this.delay(API_CONFIG.RETRY_DELAY * attempt);
          continue;
        }
        
        throw error;
      }
    }
  }

  /**
   * Check if error should trigger a retry
   */
  shouldRetry(error) {
    return !error.status || error.status >= 500;
  }

  /**
   * Delay helper for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================
  // PRODUCT ENDPOINTS
  // ============================================

  /**
   * Get all products with filtering and pagination
   */
  async getProducts(filters = {}) {
    const queryParams = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        queryParams.append(key, filters[key]);
      }
    });

    const queryString = queryParams.toString();
    const endpoint = `/products${queryString ? '?' + queryString : ''}`;
    
    return this.request(endpoint);
  }

  /**
   * Get single product by ID
   */
  async getProduct(id) {
    return this.request(`/products/${id}`);
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category, limit = 20) {
    return this.request(`/products/category/${category}?limit=${limit}`);
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit = 10) {
    return this.request(`/products/featured?limit=${limit}`);
  }

  /**
   * Search products
   */
  async searchProducts(searchTerm, filters = {}) {
    const params = {
      search: searchTerm,
      ...filters
    };
    return this.getProducts(params);
  }

  /**
   * Create product (Admin only)
   */
  async createProduct(productData) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  }

  /**
   * Update product (Admin only)
   */
  async updateProduct(id, productData) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  }

  /**
   * Delete product (Admin only)
   */
  async deleteProduct(id) {
    return this.request(`/products/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Bulk create products (Admin only)
   */
  async bulkCreateProducts(products) {
    return this.request('/products/bulk', {
      method: 'POST',
      body: JSON.stringify({ products })
    });
  }

  // ============================================
  // CATEGORY ENDPOINTS
  // ============================================

  /**
   * Get all categories
   */
  async getCategories() {
    return this.request('/categories');
  }

  /**
   * Get single category
   */
  async getCategory(id) {
    return this.request(`/categories/${id}`);
  }

  /**
   * Create category (Admin only)
   */
  async createCategory(categoryData) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    });
  }

  /**
   * Update category (Admin only)
   */
  async updateCategory(id, categoryData) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData)
    });
  }

  /**
   * Delete category (Admin only)
   */
  async deleteCategory(id) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE'
    });
  }

  // ============================================
  // USER/AUTH ENDPOINTS
  // ============================================

  /**
   * Login user
   */
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.success && response.token) {
      this.setAuthToken(response.token);
    }

    return response;
  }

  /**
   * Register user
   */
  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    if (response.success && response.token) {
      this.setAuthToken(response.token);
    }

    return response;
  }

  /**
   * Logout user
   */
  logout() {
    this.setAuthToken(null);
  }

  /**
   * Get current user profile
   */
  async getProfile() {
    return this.request('/auth/profile');
  }

  // ============================================
  // CART ENDPOINTS
  // ============================================

  /**
   * Get user's cart
   */
  async getCart() {
    return this.request('/cart');
  }

  /**
   * Add item to cart
   */
  async addToCart(productId, quantity = 1) {
    return this.request('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity })
    });
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(productId, quantity) {
    return this.request('/cart/update', {
      method: 'PUT',
      body: JSON.stringify({ productId, quantity })
    });
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(productId) {
    return this.request('/cart/remove', {
      method: 'DELETE',
      body: JSON.stringify({ productId })
    });
  }

  /**
   * Clear entire cart
   */
  async clearCart() {
    return this.request('/cart/clear', {
      method: 'DELETE'
    });
  }

  // ============================================
  // ORDER ENDPOINTS
  // ============================================

  /**
   * Create order
   */
  async createOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  /**
   * Get user's orders
   */
  async getOrders() {
    return this.request('/orders');
  }

  /**
   * Get single order
   */
  async getOrder(id) {
    return this.request(`/orders/${id}`);
  }
}

// Create singleton instance
const api = new APIClient();

// Export for use in other files
window.api = api;

// Also export as module if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
