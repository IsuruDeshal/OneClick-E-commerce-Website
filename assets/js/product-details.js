                        /**
 * ═══════════════════════════════════════════════════════════════
 * DYNAMIC PRODUCT DETAILS PAGE
 * ═══════════════════════════════════════════════════════════════
 * 
 * Fetches product data from backend and displays it dynamically
 * URL format: product-details.html?id=product-id
 */

(function() {
  'use strict';

  // Use auto-detected API config or fallback to Supabase
  const getApiBase = () => {
    if (window.API_CONFIG && window.API_CONFIG.apiUrl) {
      return window.API_CONFIG.apiUrl;
    }
    return 'https://pvnlavcuswjxhywbsodm.supabase.co/rest/v1';
  };

  const API_BASE_URL = getApiBase();
  const USE_AI_DESCRIPTIONS = false; // Set to true if you have OpenAI API key

  // ═══════════════════════════════════════════════════════════════
  // GET PRODUCT ID FROM URL
  // ═══════════════════════════════════════════════════════════════
  
  function getProductIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
  }

  // ═══════════════════════════════════════════════════════════════
  // FETCH PRODUCT DATA
  // ═══════════════════════════════════════════════════════════════
  
  async function fetchProductData(productId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
      
      if (!response.ok) {
        throw new Error('Product not found');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FETCH AI-GENERATED DESCRIPTION
  // ═══════════════════════════════════════════════════════════════
  
  async function fetchAIDescription(product) {
    if (!USE_AI_DESCRIPTIONS) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: product.name,
          category: product.category,
          brand: product.brand,
          specs: product.specs,
          highlights: product.highlights
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.description;
      }
    } catch (error) {
      console.warn('AI description generation failed:', error);
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════
  // FETCH RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════
  
  async function fetchRecommendations(product) {
    try {
      // First, get all products
      const response = await fetch(`${API_BASE_URL}/api/products`);
      if (!response.ok) return [];

      const result = await response.json();
      const allProducts = result.data || [];

      // Get recommendations from AI endpoint
      const recResponse = await fetch(`${API_BASE_URL}/api/ai/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          category: product.category,
          price: product.price,
          allProducts
        })
      });

      if (recResponse.ok) {
        const recResult = await recResponse.json();
        return recResult.recommendations || [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER PRODUCT DETAILS
  // ═══════════════════════════════════════════════════════════════
  
  function renderProductDetails(product, aiDescription = null) {
    const description = aiDescription || product.description || 'No description available.';
    const discount = product.discount || 0;
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;

    const stockClass = getStockClass(product.availability);
    const stockText = getStockText(product.availability, product.stock);

    const html = `
      <div class="product-details">
        <!-- Gallery -->
        <div class="product-gallery">
          <img 
            src="${product.image || 'assets/img/pc-case.svg'}" 
            alt="${product.name}"
            class="main-product-image"
            id="mainImage"
            onerror="this.src='assets/img/pc-case.svg'"
          />
          ${product.images && product.images.length > 1 ? `
            <div class="thumbnail-gallery">
              ${product.images.map((img, idx) => `
                <img 
                  src="${img}" 
                  alt="${product.name} view ${idx + 1}"
                  class="thumbnail ${idx === 0 ? 'active' : ''}"
                  onclick="changeMainImage('${img}', this)"
                />
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Product Info -->
        <div class="product-info">
          <div class="product-meta">
            ${product.category ? `<span class="meta-badge">${product.category}</span>` : ''}
            ${product.brand ? `<span class="meta-badge">${product.brand}</span>` : ''}
            ${product.sku ? `<span class="meta-badge">SKU: ${product.sku}</span>` : ''}
          </div>

          <h1>${product.name}</h1>

          <div class="price-section">
            <div class="current-price">${product.currency || 'Rs'} ${product.price.toLocaleString()}</div>
            ${hasDiscount ? `
              <div>
                <span class="original-price">${product.currency || 'Rs'} ${product.originalPrice.toLocaleString()}</span>
                <span class="discount-badge">Save ${discount}%</span>
              </div>
            ` : ''}
            
            <div class="stock-indicator ${stockClass}">
              <span class="stock-dot"></span>
              <span>${stockText}</span>
            </div>
          </div>

          <div class="product-description">
            <p>${description}</p>
          </div>

          ${product.highlights && product.highlights.length > 0 ? `
            <div class="features-section">
              <h2>Key Features</h2>
              <ul class="features-list">
                ${product.highlights.map(feature => `
                  <li>
                    <svg width="20" height="20" fill="none" stroke="#ff6b35" stroke-width="2">
                      <path d="M5 13l4 4L19 7"/>
                    </svg>
                    <span>${feature}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

          ${product.specs && Object.keys(product.specs).length > 0 ? `
            <div class="specs-section">
              <h2>Specifications</h2>
              <div class="specs-grid">
                ${Object.entries(product.specs).map(([key, value]) => `
                  <div class="spec-item">
                    <span class="spec-label">${key}</span>
                    <span class="spec-value">${value}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="action-buttons">
            <button class="btn-primary" onclick="addToCart('${product.id}')">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
              </svg>
              Add to Cart
            </button>
            <button class="btn-secondary" onclick="buyNow('${product.id}')">
              Buy Now
            </button>
            <button class="btn-icon" onclick="addToWishlist('${product.id}')" title="Add to Wishlist">
              <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </button>
          </div>

          ${product.warranty ? `
            <div style="margin-top: 2rem; color: rgba(255,255,255,0.7);">
              <svg width="18" height="18" fill="none" stroke="#4CAF50" stroke-width="2" style="display: inline; vertical-align: middle;">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span style="margin-left: 0.5rem;">${product.warranty}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    document.getElementById('productContent').innerHTML = html;
    document.getElementById('productContent').style.display = 'block';
    document.getElementById('loadingState').style.display = 'none';

    // Update page meta
    document.getElementById('page-title').textContent = `${product.name} | One Computers`;
    document.getElementById('page-description').setAttribute('content', description.substring(0, 160));
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════
  
  function renderRecommendations(recommendations) {
    if (!recommendations || recommendations.length === 0) return;

    const html = recommendations.map(product => `
      <div class="p-card" onclick="window.location.href='product-details.html?id=${product.id}'">
        <div class="media">
          <img src="${product.image || 'assets/img/pc-case.svg'}" alt="${product.name}" onerror="this.src='assets/img/pc-case.svg'">
          ${product.discount ? `<span class="sale-badge">${product.discount}% OFF</span>` : ''}
        </div>
        <div class="content">
          <h4 class="title">${product.name}</h4>
          <div class="price">
            <span class="now">${product.currency || 'Rs'} ${product.price.toLocaleString()}</span>
            ${product.originalPrice ? `<span class="old">${product.currency || 'Rs'} ${product.originalPrice.toLocaleString()}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');

    document.getElementById('recommendationsGrid').innerHTML = html;
    document.getElementById('recommendationsSection').style.display = 'block';
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  
  function getStockClass(availability) {
    switch (availability) {
      case 'in-stock': return 'in-stock';
      case 'low-stock': return 'low-stock';
      case 'out-of-stock': return 'out-of-stock';
      default: return 'in-stock';
    }
  }

  function getStockText(availability, stock) {
    switch (availability) {
      case 'in-stock': return 'In Stock';
      case 'low-stock': return `Only ${stock || 'few'} left!`;
      case 'out-of-stock': return 'Out of Stock';
      default: return 'In Stock';
    }
  }

  window.changeMainImage = function(src, element) {
    document.getElementById('mainImage').src = src;
    document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
    element.classList.add('active');
  };

  window.addToCart = function(productId) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(item => item.id === productId);
    
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      cart.push({ id: productId, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    if (typeof updateCartCount === 'function') updateCartCount();
    
    showNotification('✅ Added to cart!');
  };

  window.buyNow = function(productId) {
    addToCart(productId);
    setTimeout(() => window.location.href = 'checkout.html', 300);
  };

  window.addToWishlist = function(productId) {
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    if (!wishlist.includes(productId)) {
      wishlist.push(productId);
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
      showNotification('❤️ Added to wishlist!');
    } else {
      showNotification('ℹ️ Already in wishlist');
    }
  };

  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'product-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: #ff6b35;
      color: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  
  async function init() {
    const productId = getProductIdFromURL();

    if (!productId) {
      console.error('No product ID in URL');
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('errorState').style.display = 'block';
      return;
    }

    try {
      // Fetch product data
      console.log('Fetching product:', productId);
      const product = await fetchProductData(productId);

      // Optionally fetch AI description
      let aiDescription = null;
      if (USE_AI_DESCRIPTIONS) {
        aiDescription = await fetchAIDescription(product);
      }

      // Render product
      renderProductDetails(product, aiDescription);

      // Fetch and render recommendations
      const recommendations = await fetchRecommendations(product);
      renderRecommendations(recommendations);

    } catch (error) {
      console.error('Error loading product:', error);
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('errorState').style.display = 'block';
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
