/**
 * Product Card Click Handler
 * Makes all product cards clickable and navigates to product detail page
 * Add this script to category pages (laptops.html, desktops.html, etc.)
 */

(function() {
  'use strict';
  
  // Function to make product cards clickable
  function initProductCardLinks() {
    // Find all product cards
    const productCards = document.querySelectorAll('.p-card, .product-card, [data-product-id]');
    
    productCards.forEach(card => {
      // Get product ID from data attribute
      let productId = card.getAttribute('data-product-id') || 
                      card.getAttribute('data-id') ||
                      card.getAttribute('id');
      
      // If no ID found, try to extract from title or other elements
      if (!productId) {
        const titleElement = card.querySelector('.title, .product-title, h3, h4');
        if (titleElement) {
          // Generate ID from title (you should use actual database IDs)
          productId = titleElement.textContent.trim().toLowerCase().replace(/\s+/g, '-');
        }
      }
      
      if (!productId) return; // Skip if no ID found
      
      // Make card clickable (but not buttons inside)
      card.style.cursor = 'pointer';
      
      card.addEventListener('click', (e) => {
        // Don't navigate if user clicked on a button or link
        if (e.target.closest('button, a, .cart-btn, .compare-btn, .wishlist-btn')) {
          return;
        }
        
        // Navigate to product detail page
        window.location.href = `product-details.html?id=${productId}`;
      });
      
      // Add hover effect
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px)';
        card.style.transition = 'transform 0.3s ease';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
      });
    });
  }
  
  // Function to add "View Details" links to product cards
  function addViewDetailsLinks() {
    const productCards = document.querySelectorAll('.p-card, .product-card');
    
    productCards.forEach(card => {
      // Check if already has view details link
      if (card.querySelector('.view-details-link')) return;
      
      const productId = card.getAttribute('data-product-id') || 
                        card.getAttribute('data-id') ||
                        card.getAttribute('id');
      
      if (!productId) return;
      
      // Find the button container or create one
      let btnContainer = card.querySelector('.card-actions, .product-actions, .btn-row');
      
      if (!btnContainer) {
        // Create button container
        btnContainer = document.createElement('div');
        btnContainer.className = 'card-actions';
        btnContainer.style.cssText = 'display: flex; gap: 0.5rem; margin-top: 0.75rem;';
        
        const priceElement = card.querySelector('.price, .product-price');
        if (priceElement && priceElement.parentNode) {
          priceElement.parentNode.insertBefore(btnContainer, priceElement.nextSibling);
        } else {
          card.appendChild(btnContainer);
        }
      }
      
      // Add "View Details" button
      const viewBtn = document.createElement('a');
      viewBtn.href = `product-details.html?id=${productId}`;
      viewBtn.className = 'btn btn-sm btn-outline view-details-link';
      viewBtn.textContent = 'View Details';
      viewBtn.style.cssText = `
        padding: 0.5rem 1rem;
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 6px;
        text-decoration: none;
        color: #fff;
        font-size: 0.875rem;
        transition: all 0.2s;
        display: inline-block;
      `;
      
      viewBtn.addEventListener('mouseenter', () => {
        viewBtn.style.borderColor = '#ff6b35';
        viewBtn.style.color = '#ff6b35';
      });
      
      viewBtn.addEventListener('mouseleave', () => {
        viewBtn.style.borderColor = 'rgba(255,255,255,0.2)';
        viewBtn.style.color = '#fff';
      });
      
      btnContainer.appendChild(viewBtn);
    });
  }
  
  // Function to convert Firebase data to product cards
  function renderProductCards(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    products.forEach(product => {
      const card = createProductCard(product);
      container.appendChild(card);
    });
    
    // Initialize click handlers
    initProductCardLinks();
  }
  
  // Create a product card element
  function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'p-card';
    card.setAttribute('data-product-id', product.id || product._id);
    
    const image = Array.isArray(product.images) ? product.images[0] : product.image || 'assets/img/placeholder.png';
    const price = parseFloat(product.price) || 0;
    const currency = product.currency || 'LKR';
    
    card.innerHTML = `
      <div class="card-image">
        <img src="${image}" alt="${product.name || product.title}" loading="lazy">
        ${product.stock <= 0 ? '<div class="badge badge-danger">Out of Stock</div>' : ''}
        ${product.featured ? '<div class="badge badge-success">Featured</div>' : ''}
      </div>
      <div class="card-content">
        ${product.brand ? `<div class="brand">${product.brand}</div>` : ''}
        <h3 class="title">${product.name || product.title}</h3>
        <div class="price">
          <span class="currency">${currency}</span>
          <span class="amount">${price.toLocaleString()}</span>
        </div>
        <div class="card-actions">
          <a href="product-details.html?id=${product.id || product._id}" class="btn btn-primary btn-sm">View Details</a>
          <button class="btn btn-secondary btn-sm cart-btn" data-product-id="${product.id || product._id}">
            Add to Cart
          </button>
        </div>
      </div>
    `;
    
    return card;
  }
  
  // Load products by category from Firebase
  async function loadProductsByCategory(category, containerId) {
    try {
      if (!window.Firebase || !window.Firebase.db) {
        console.error('Firebase not initialized');
        return;
      }
      
      const { db } = window.Firebase;
      const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      
      const q = query(
        collection(db, 'products'),
        where('category', '==', category),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      renderProductCards(products, containerId);
      
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }
  
  // Load products from backend API
  async function loadProductsFromAPI(category, containerId) {
    try {
      // Use auto-detected API config or fallback to Supabase
      const apiBase = (window.API_CONFIG && window.API_CONFIG.apiUrl)
        ? window.API_CONFIG.apiUrl
        : 'https://pvnlavcuswjxhywbsodm.supabase.co/rest/v1';

      const response = await fetch(`${apiBase}/products?category=eq.${category}&status=eq.active`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bmxhdmN1c3dqeGh5d2Jzb2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNTkyOTYsImV4cCI6MjA3NzczNTI5Nn0.pddR-mTtvaELNeK_F1HDwZfjs29xj__k9z-WFOqZbFA',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bmxhdmN1c3dqeGh5d2Jzb2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNTkyOTYsImV4cCI6MjA3NzczNTI5Nn0.pddR-mTtvaELNeK_F1HDwZfjs29xj__k9z-WFOqZbFA'
        }
      });
      const products = await response.json();
      
      renderProductCards(products, containerId);
      
    } catch (error) {
      console.error('Error loading products from API:', error);
    }
  }
  
  // Initialize on page load
  function init() {
    // Make existing product cards clickable
    initProductCardLinks();
    
    // Optionally add "View Details" buttons to existing cards
    // addViewDetailsLinks();
  }
  
  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Export functions for external use
  window.ProductCardHandler = {
    init,
    initProductCardLinks,
    addViewDetailsLinks,
    renderProductCards,
    loadProductsByCategory,
    loadProductsFromAPI,
    createProductCard
  };
  
})();
