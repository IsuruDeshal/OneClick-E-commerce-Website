/**
 * ========================================
 * BACKEND PRODUCTS CONNECTION SCRIPT
 * ========================================
 * Automatically loads products from PHP/MySQL backend
 * and displays them in product cards on all pages
 */

(function() {
  'use strict';

  // Auto-detect environment
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const API_BASE_URL = isLocalhost ? 'api' : 'https://oneclickmatara.42web.io/api';

  console.log('🚀 Backend Products Connection initialized');
  console.log('📡 API URL:', API_BASE_URL);

  /**
   * Fetch products from backend
   */
  async function fetchProducts(category = null) {
    try {
      let url = `${API_BASE_URL}/get-products.php`;

      if (category) {
        url += `?category=${encodeURIComponent(category)}`;
      }

      console.log('📥 Fetching products from:', url);

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to load products');
      }

      console.log(`✅ Loaded ${data.products.length} products from backend`);
      return data.products;

    } catch (error) {
      console.error('❌ Error fetching products:', error);
      return [];
    }
  }

  /**
   * Render product card HTML
   */
  function renderProductCard(product) {
    const price = parseFloat(product.price || 0);
    const offerPrice = product.offer_price ? parseFloat(product.offer_price) : null;
    const discount = offerPrice ? Math.round(((price - offerPrice) / price) * 100) : 0;
    const finalPrice = offerPrice || price;
    const imageUrl = product.image_url || 'assets/img/placeholder.png';
    const stock = parseInt(product.stock || 0);

    const stockBadgeClass = stock > 10 ? 'in-stock' :
                            stock > 0 ? 'low-stock' : 'out-of-stock';
    const stockBadgeText = stock > 10 ? 'In Stock' :
                           stock > 0 ? 'Low Stock' : 'Out of Stock';

    return `
      <article class="p-card" data-product-id="${product.id}">
        <a href="product-details.html?id=${product.id}" class="media">
          <span class="stock-badge ${stockBadgeClass}">${stockBadgeText}</span>
          ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
          <img src="${imageUrl}" alt="${product.name || 'Product'}" loading="lazy" />
        </a>
        <div class="body">
          <a class="title" href="product-details.html?id=${product.id}">${product.name || 'Unnamed Product'}</a>
          <div class="meta">${product.description ? product.description.substring(0, 60) + '...' : product.category || 'View details'}</div>
          <div class="price">
            ${discount > 0 ? `<span class="old">Rs ${price.toLocaleString()}</span>` : ''}
            <span class="now">Rs ${finalPrice.toLocaleString()}</span>
          </div>
          <div class="cta">
            <button class="btn small" onclick="window.location.href='product-details.html?id=${product.id}'">View</button>
            <button class="btn small cart-btn" 
                    data-product-id="${product.id}" 
                    data-name="${product.name}" 
                    data-price="${finalPrice}" 
                    data-image="${imageUrl}"
                    data-sku="${product.sku || product.id}"
                    data-add-to-cart>
              <i class="fas fa-shopping-cart"></i> Add to Cart
            </button>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Load products into container
   */
  async function loadProductsIntoContainer(container, category = null, limit = null) {
    if (!container) return;

    // Show loading
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #00d4ff; margin-bottom: 1rem;"></i>
        <p style="color: #999;">Loading products from database...</p>
      </div>
    `;

    try {
      let products = await fetchProducts(category);

      if (limit && products.length > limit) {
        products = products.slice(0, limit);
      }

      if (products.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
            <i class="fas fa-box-open" style="font-size: 3rem; color: #666; margin-bottom: 1rem; display: block;"></i>
            <p style="color: #999;">No products available yet.</p>
          </div>
        `;
      container.querySelectorAll('.cart-btn, [data-add-to-cart]').forEach(btn => {
      }

          e.stopPropagation();

          e.stopPropagation();
            id: this.dataset.productId || this.dataset.id,
            name: this.dataset.name || this.getAttribute('data-name'),
            price: parseFloat(this.dataset.price || this.getAttribute('data-price')) || 0,
            image: this.dataset.image || this.getAttribute('data-image'),
            sku: this.dataset.sku || this.getAttribute('data-sku') || this.dataset.productId
            price: parseFloat(this.dataset.price || this.getAttribute('data-price')) || 0,

          // Disable button temporarily
          const originalText = this.innerHTML;
          this.disabled = true;
          this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

          if (addToCart(productData)) {
            this.innerHTML = '<i class="fas fa-check"></i> Added!';
            setTimeout(() => {
              this.innerHTML = originalText;
              this.disabled = false;
            }, 1500);
          } else {
            this.innerHTML = originalText;
            this.disabled = false;
          }
            sku: this.dataset.sku || this.getAttribute('data-sku') || this.dataset.productId
          e.preventDefault();

          // Disable button temporarily
          const originalText = this.innerHTML;
          this.disabled = true;
          this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

          if (addToCart(productData)) {
            this.innerHTML = '<i class="fas fa-check"></i> Added!';
            setTimeout(() => {
              this.innerHTML = originalText;
              this.disabled = false;
            }, 1500);
          } else {
            this.innerHTML = originalText;
            this.disabled = false;
          }
        });
      });

    } catch (error) {
      console.error('Error loading products:', error);
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #ff4444; grid-column: 1 / -1;">
          <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
          <p>Failed to load products</p>
          <button class="btn small" onclick="location.reload()" style="margin-top: 1rem;">Retry</button>
        </div>
      `;
    }
  }

  /**
   * Simple add to cart function
   */
  function addToCart(product) {
    console.log('Adding to cart:', product);

    // Get existing cart
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');

    // Check if product already in cart
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
      cart.push({
        ...product,
        quantity: 1
      });
    }

    // Save cart
    localStorage.setItem('cart', JSON.stringify(cart));

    // Update cart badge
    updateCartBadge();

    // Show notification
    showNotification(`${product.name} added to cart!`);
  }

  /**
   * Update cart badge
   */
  function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  function showNotification(message, type = 'success') {
      const parent = badge.closest('[href="cart.html"]');
      if (parent) {
    const bgColor = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#22c55e';
    const icon = type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle';

        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'block' : 'none';
      }
    });
      background: ${bgColor};

  /**
   * Show notification
   */
  function showNotification(message) {
    // Create notification element
      display: flex;
      align-items: center;
      gap: 0.5rem;
    const notification = document.createElement('div');
    notification.style.cssText = `
      <i class="fas ${icon}"></i> <span>${message}</span>
      top: 20px;

    // Add animation styles if not already present
    if (!document.getElementById('notification-animations')) {
      const style = document.createElement('style');
      style.id = 'notification-animations';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(400px); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Auto-load products on page load
   */
  document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Auto-loading products from backend...');
    
    // Update cart badge on page load
    updateCartBadge();
    
    // Also update on storage change (when cart updated in another tab)
    window.addEventListener('storage', function(e) {
      if (e.key === 'cart') {
        updateCartBadge();
      }
    });
    
    // Find all product containers with data attributes
    const containers = document.querySelectorAll('[data-products-grid], [data-auto-load], .product-grid-vertical');
    
    containers.forEach(container => {
      const category = container.getAttribute('data-category');
      const limit = parseInt(container.getAttribute('data-limit')) || null;
      const autoLoad = container.getAttribute('data-auto-load');

      // Only load if it's marked for auto-load or has data-products-grid
      if (autoLoad !== null || container.hasAttribute('data-products-grid')) {
        console.log(`📦 Loading products for container:`, container.className, 'Category:', category || 'All');
        loadProductsIntoContainer(container, category, limit);
      }
    });

    // Special handling for homepage featured products
    const featuredContainer = document.querySelector('.product-row');
    if (featuredContainer && window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
      console.log('🏠 Loading featured products for homepage');
      // Don't auto-load homepage product-row as it has static content
      // Users can manually trigger this if needed
    }
  });

  // Export functions for global use
  window.BackendProducts = {
    fetch: fetchProducts,
    render: renderProductCard,
    loadInto: loadProductsIntoContainer,
    addToCart: addToCart
  };

  console.log('✅ Backend Products Connection ready!');

})();

