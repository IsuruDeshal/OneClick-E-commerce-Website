/**
 * API Configuration and Router
 * Central configuration for all backend API endpoints
 * Automatically uses Supabase-powered PHP APIs
 */

(function() {
  'use strict';

  // Detect environment
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  
  // Base API URL
  const API_BASE = isLocalhost 
    ? '/oneclick/api'  // XAMPP localhost path
    : '/api';          // Production EC2 path

  // API Endpoints Configuration
  const API_ENDPOINTS = {
    // Products
    products: {
      getAll: `${API_BASE}/get-products-v2.php`,
      getById: (id) => `${API_BASE}/get-products-v2.php?id=${id}`,
      save: `${API_BASE}/admin-save-product.php`,
      delete: `${API_BASE}/admin-delete-product.php`,
      upload: `${API_BASE}/admin-upload-image.php`,
    },
    
    // Categories
    categories: {
      getAll: `${API_BASE}/get-categories-supabase.php`,
    },
    
    // Orders
    orders: {
      getAll: (userId) => `${API_BASE}/get-orders-supabase.php?user_id=${userId}`,
      getAllAdmin: `${API_BASE}/get-orders-supabase.php?admin=true`,
      create: `${API_BASE}/create-order-supabase.php`,
      updateStatus: `${API_BASE}/update-order-status-supabase.php`,
    },
    
    // Cart
    cart: {
      get: (userId) => `${API_BASE}/cart/get-cart-supabase.php?user_id=${userId}`,
      add: `${API_BASE}/cart/add-to-cart-supabase.php`,
      remove: `${API_BASE}/cart/remove-from-cart-supabase.php`,
    },
    
    // Wishlist
    wishlist: {
      get: (userId) => `${API_BASE}/wishlist/get-wishlist-supabase.php?user_id=${userId}`,
      add: `${API_BASE}/wishlist/add-to-wishlist-supabase.php`,
      remove: `${API_BASE}/wishlist/remove-from-wishlist-supabase.php`,
    },
    
    // Settings
    settings: {
      get: (key) => `${API_BASE}/get-settings-supabase.php?key=${key}`,
      save: `${API_BASE}/save-settings-supabase.php`,
    },
    
    // Stock
    stock: {
      check: (productId) => `${API_BASE}/check-stock-supabase.php?product_id=${productId}`,
    },
    
    // Authentication
    auth: {
      adminLogin: `${API_BASE}/admin-login-supabase.php`,
      adminLogout: `${API_BASE}/admin-logout.php`,
      checkAdminSession: `${API_BASE}/check-admin-session.php`,
      userLogin: `${API_BASE}/user-login.php`,
      userRegister: `${API_BASE}/user-register.php`,
      userLogout: `${API_BASE}/user-logout.php`,
      checkUserSession: `${API_BASE}/check-user-session.php`,
    },
    
    // Payment
    payment: {
      payhereNotify: `${API_BASE}/payhere-notify.php`,
    }
  };

  // Helper function to make API requests
  async function apiRequest(url, options = {}) {
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Helper function for GET requests
  async function get(url) {
    return apiRequest(url, { method: 'GET' });
  }

  // Helper function for POST requests
  async function post(url, body) {
    return apiRequest(url, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // Helper function for DELETE requests
  async function del(url, body = null) {
    const options = { method: 'DELETE' };
    if (body) {
      options.body = JSON.stringify(body);
    }
    return apiRequest(url, options);
  }

  // Expose to global scope
  window.API_CONFIG = {
    baseUrl: API_BASE,
    endpoints: API_ENDPOINTS,
    apiUrl: API_BASE, // Legacy compatibility
    environment: isLocalhost ? 'development' : 'production',
    features: {
      useSupabaseProducts: true,
      useSupabaseAuth: true,
    }
  };

  window.API = {
    request: apiRequest,
    get: get,
    post: post,
    delete: del,
    endpoints: API_ENDPOINTS
  };

  console.log('[API Config] Initialized with base:', API_BASE);
})();


