/**
 * ========================================
 * INDEX PAGE LOADER
 * ========================================
 * Dynamic product loading for home page
 */

(async function() {
  'use strict';

  // Wait for Firebase and ProductLoader
  await window.ensureFirebase();

  const waitForLoader = () => {
    return new Promise((resolve) => {
      const check = () => {
        if (window.ProductLoader && window.ProductRenderer) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  };

  await waitForLoader();

  const loader = new window.ProductLoader();
  const renderer = new window.ProductRenderer();

  /**
   * Load featured products for home page
   */
  const loadFeaturedProducts = async () => {
    const container = document.querySelector('[data-products-grid]') || 
                     document.querySelector('.product-grid-vertical');
    
    if (!container) {
      console.warn('Featured products container not found');
      return;
    }

    // Show loading
    renderer.showLoading('featured-products');

    try {
      // Load featured products
      const result = await loader.loadFeaturedProducts(12);

      if (result.success && result.products.length > 0) {
        renderer.renderProducts(result.products, container);
      } else {
        // If no featured products, load latest products
        const latestResult = await loader.loadProducts({
          status: 'in_stock',
          sortBy: 'created_at',
          sortOrder: 'desc',
          limitCount: 12
        });

        if (latestResult.success) {
          renderer.renderProducts(latestResult.products, container);
        } else {
          renderer.showError(container, 'No products available');
        }
      }
    } catch (error) {
      console.error('Error loading featured products:', error);
      renderer.showError(container, error.message);
    }
  };

  /**
   * Load products by category sections
   */
  const loadCategorySections = async () => {
    const categories = [
      { name: 'Laptops', selector: '[data-category="laptops"]', limit: 8 },
      { name: 'Desktops', selector: '[data-category="desktops"]', limit: 8 },
      { name: 'Monitors', selector: '[data-category="monitors"]', limit: 6 },
      { name: 'Accessories', selector: '[data-category="accessories"]', limit: 8 }
    ];

    for (const cat of categories) {
      const container = document.querySelector(cat.selector);
      if (!container) continue;

      try {
        const result = await loader.loadProductsByCategory(cat.name, cat.limit);
        
        if (result.success && result.products.length > 0) {
          renderer.renderProducts(result.products, container);
        }
      } catch (error) {
        console.error(`Error loading ${cat.name}:`, error);
      }
    }
  };

  // Initialize based on page content
  const featuredContainer = document.querySelector('[data-products-grid]');
  if (featuredContainer) {
    await loadFeaturedProducts();
  }

  await loadCategorySections();

  console.log('Home page loaded successfully');

})();
