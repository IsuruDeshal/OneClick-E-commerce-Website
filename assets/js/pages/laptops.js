/**
 * ========================================
 * LAPTOPS PAGE LOADER
 * ========================================
 * Dynamic product loading for laptops.html
 */

(async function() {
  'use strict';

  // Wait for Firebase and ProductLoader to be ready
  await window.ensureFirebase();

  // Wait for ProductLoader to be available
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

  // Load products for different sections
  const sections = [
    {
      containerId: 'gaming-laptops',
      selector: '.product-grid-vertical',
      sectionSelector: 'section:nth-of-type(1)',
      filters: {
        category: 'Laptops',
        tags: ['gaming'],
        status: 'in_stock',
        limitCount: 12,
        sortBy: 'price',
        sortOrder: 'desc'
      }
    },
    {
      containerId: 'business-laptops',
      selector: '.product-grid-vertical',
      sectionSelector: 'section:nth-of-type(2)',
      filters: {
        category: 'Laptops',
        tags: ['business'],
        status: 'in_stock',
        limitCount: 9,
        sortBy: 'created_at',
        sortOrder: 'desc'
      }
    },
    {
      containerId: 'budget-laptops',
      selector: '.product-grid-vertical',
      sectionSelector: 'section:nth-of-type(3)',
      filters: {
        category: 'Laptops',
        maxPrice: 200000,
        status: 'in_stock',
        limitCount: 9,
        sortBy: 'price',
        sortOrder: 'asc'
      }
    }
  ];

  // Load each section
  for (const section of sections) {
    const container = document.querySelector(section.sectionSelector + ' ' + section.selector);
    
    if (!container) {
      console.warn(`Container not found for section: ${section.containerId}`);
      continue;
    }

    // Show loading
    container.innerHTML = `
      <div class="loading-spinner" style="text-align: center; padding: 2rem;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #00d4ff;"></i>
        <p style="margin-top: 1rem; color: #999;">Loading products...</p>
      </div>
    `;

    try {
      const result = await loader.loadProducts(section.filters);

      if (result.success && result.products.length > 0) {
        container.innerHTML = result.products.map(p => renderer.renderProductCard(p)).join('');
      } else {
        container.innerHTML = `
          <div class="no-products" style="text-align: center; padding: 3rem; color: #999;">
            <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
            <p>No products available in this category yet.</p>
            <p style="font-size: 0.9rem; margin-top: 0.5rem;">Check back soon!</p>
          </div>
        `;
      }
    } catch (error) {
      console.error(`Error loading section ${section.containerId}:`, error);
      container.innerHTML = `
        <div class="error-message" style="text-align: center; padding: 2rem; color: #ff4444;">
          <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
          <p>Failed to load products</p>
          <button class="btn small" onclick="location.reload()" style="margin-top: 1rem;">Retry</button>
        </div>
      `;
    }
  }

  // Apply filters when user selects them
  const applyFilters = async () => {
    const selectedBrands = Array.from(document.querySelectorAll('input[name="brand"]:checked')).map(cb => cb.value);
    const selectedCategories = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);
    const priceRange = document.getElementById('priceRange')?.value;

    const filters = {
      category: 'Laptops',
      status: 'in_stock',
      limitCount: 50
    };

    if (selectedBrands.length > 0) {
      // For multiple brands, we'll need to load all and filter client-side
      filters.brands = selectedBrands;
    }

    // Load and filter
    const result = await loader.loadProducts(filters);
    
    if (result.success) {
      let products = result.products;

      // Client-side filtering for multiple brands
      if (selectedBrands.length > 0) {
        products = products.filter(p => p && typeof p.brand !== 'undefined' && selectedBrands.includes(p.brand));
      }

      // Render all in first section
      const mainContainer = document.querySelector('section:nth-of-type(1) .product-grid-vertical');
      if (mainContainer) {
        renderer.renderProducts(products, mainContainer);
      }

      // Hide other sections when filtering
      document.querySelectorAll('section').forEach((sec, idx) => {
        if (idx > 0) {
          sec.style.display = selectedBrands.length > 0 || selectedCategories.length > 0 ? 'none' : '';
        }
      });
    }
  };

  // Attach filter event listeners
  document.querySelectorAll('input[name="brand"], input[name="category"]').forEach(input => {
    input.addEventListener('change', applyFilters);
  });

  console.log('Laptops page loaded successfully');

})();
