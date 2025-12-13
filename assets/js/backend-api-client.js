/**
 * Backend API Client for One Click Computers
 * This file provides methods to interact with the backend API
 * Can be used alongside or instead of direct Firebase calls
 */

class BackendAPI {
  constructor() {
    // Use auto-detected API config or fallback to Supabase
    this.baseURL = (window.API_CONFIG && window.API_CONFIG.apiUrl)
      ? window.API_CONFIG.apiUrl
      : 'https://pvnlavcuswjxhywbsodm.supabase.co/rest/v1';
    this.token = null;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    this.token = token;
  }

  /**
   * Get headers with authentication
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Generic request method
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // ============================================================
  // PRODUCT ENDPOINTS
  // ============================================================

  /**
   * Get all products with optional filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Products response
   */
  async getProducts(filters = {}) {
    const queryParams = new URLSearchParams();

    // Add filters to query params
    if (filters.category) queryParams.append('category', filters.category);
    // Guard brand: only include if explicitly present AND backend supports it
    if (filters.brand && window.__PRODUCTS_SUPPORT_BRAND__) queryParams.append('brand', filters.brand);
    if (filters.minPrice) queryParams.append('minPrice', filters.minPrice);
    if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice);
    if (filters.availability) queryParams.append('availability', filters.availability);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
    if (filters.order) queryParams.append('order', filters.order);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.page) queryParams.append('page', filters.page);

    const query = queryParams.toString();
    const endpoint = query ? `/products?${query}` : '/products';
    const data = await this.request(endpoint);
    return this.normalizeProducts(data);
  }

  normalizeProducts(data){
    if (!data) return data;
    // If backend lacks brand column, ensure UI doesn't crash expecting it
    if (!window.__PRODUCTS_SUPPORT_BRAND__) {
      if (Array.isArray(data.products)) {
        data.products = data.products.map(p => { if (p && 'brand' in p && p.brand === undefined) { delete p.brand; } return p; });
      } else if (Array.isArray(data)) {
        data = data.map(p => { if (p && p.brand === undefined) { delete p.brand; } return p; });
      }
    }
    return data;
  }

  /**
   * Get single product by ID
   * @param {string} id - Product ID
   * @returns {Promise<Object>} Product data
   */
  async getProductById(id) {
    return await this.request(`/products/${id}`);
  }

  /**
   * Get products by category
   * @param {string} category - Category name
   * @param {number} limit - Max number of products
   * @returns {Promise<Object>} Products response
   */
  async getProductsByCategory(category, limit = 20) {
    return await this.request(`/products/category/${category}?limit=${limit}`);
  }

  /**
   * Get featured products
   * @param {number} limit - Max number of products
   * @returns {Promise<Object>} Featured products
   */
  async getFeaturedProducts(limit = 10) {
    return await this.request(`/products/featured?limit=${limit}`);
  }

  /**
   * Create new product (Admin only)
   * @param {Object} productData - Product information
   * @returns {Promise<Object>} Created product
   */
  async createProduct(productData) {
    return await this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  }

  /**
   * Update existing product (Admin only)
   * @param {string} id - Product ID
   * @param {Object} updateData - Updated product information
   * @returns {Promise<Object>} Updated product
   */
  async updateProduct(id, updateData) {
    return await this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  /**
   * Delete product (Admin only)
   * @param {string} id - Product ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteProduct(id) {
    return await this.request(`/products/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Bulk create products (Admin only)
   * @param {Array} products - Array of product objects
   * @returns {Promise<Object>} Bulk creation result
   */
  async bulkCreateProducts(products) {
    return await this.request('/products/bulk', {
      method: 'POST',
      body: JSON.stringify({ products })
    });
  }

  // ============================================================
  // CATEGORY ENDPOINTS (if you have them)
  // ============================================================

  /**
   * Get all categories
   * @returns {Promise<Object>} Categories list
   */
  async getCategories() {
    return await this.request('/categories');
  }

  /**
   * Create new category (Admin only)
   * @param {Object} categoryData - Category information
   * @returns {Promise<Object>} Created category
   */
  async createCategory(categoryData) {
    return await this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    });
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Search products
   * @param {string} query - Search query
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Search results
   */
  async searchProducts(query, options = {}) {
    return await this.getProducts({
      search: query,
      ...options
    });
  }

  /**
   * Get products by price range
   * @param {number} minPrice - Minimum price
   * @param {number} maxPrice - Maximum price
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Filtered products
   */
  async getProductsByPriceRange(minPrice, maxPrice, options = {}) {
    return await this.getProducts({
      minPrice,
      maxPrice,
      ...options
    });
  }

  /**
   * Get products by brand
   * @param {string} brand - Brand name
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Filtered products
   */
  async getProductsByBrand(brand, options = {}) {
    return await this.getProducts({
      brand,
      ...options
    });
  }
}

// Create global instance
window.BackendAPI = new BackendAPI();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BackendAPI;
}

// ============================================================
// USAGE EXAMPLES
// ============================================================

/*

// Initialize (if needed, set backend URL)
window.BackendAPI.baseURL = 'https://your-api-url.com/api/v1';

// Example 1: Get all products
const allProducts = await window.BackendAPI.getProducts();
console.log(allProducts.data); // Array of products

// Example 2: Get products with filters
const laptops = await window.BackendAPI.getProducts({
  category: 'laptops',
  minPrice: 500,
  maxPrice: 2000,
  sortBy: 'price',
  order: 'asc',
  limit: 20
});

// Example 3: Search products
const searchResults = await window.BackendAPI.searchProducts('gaming');

// Example 4: Get single product
const product = await window.BackendAPI.getProductById('abc123');
console.log(product.data);

// Example 5: Get products by category
const monitors = await window.BackendAPI.getProductsByCategory('monitors', 15);

// Example 6: Get featured products
const featured = await window.BackendAPI.getFeaturedProducts(8);

// Example 7: Create product (Admin only - requires auth token)
window.BackendAPI.setAuthToken('your-firebase-auth-token');
const newProduct = await window.BackendAPI.createProduct({
  name: 'New Gaming Laptop',
  price: 1299.99,
  category: 'laptops',
  stock: 10
  // ... other fields
});

// Example 8: Update product (Admin only)
const updated = await window.BackendAPI.updateProduct('product-id', {
  price: 1199.99,
  stock: 15
});

// Example 9: Delete product (Admin only)
await window.BackendAPI.deleteProduct('product-id');

// Example 10: Bulk create (Admin only)
await window.BackendAPI.bulkCreateProducts([
  { name: 'Product 1', price: 99.99, category: 'test' },
  { name: 'Product 2', price: 149.99, category: 'test' }
]);

*/
