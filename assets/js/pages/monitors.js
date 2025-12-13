/**
 * ========================================
 * MONITORS PAGE LOADER
 * ========================================
 */

(async function() {
  'use strict';

  await window.ensureFirebase();

  const waitForLoader = () => {
    return new Promise((resolve) => {
      const check = () => {
        if (window.ProductLoader && window.ProductRenderer) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
  };

  await waitForLoader();

  const loader = new window.ProductLoader();
  const renderer = new window.ProductRenderer();

  const sections = [
    {
      sectionSelector: 'section:nth-of-type(1)',
      filters: { category: 'Monitors', tags: ['gaming'], status: 'in_stock', limitCount: 12 }
    },
    {
      sectionSelector: 'section:nth-of-type(2)',
      filters: { category: 'Monitors', tags: ['professional'], status: 'in_stock', limitCount: 9 }
    },
    {
      sectionSelector: 'section:nth-of-type(3)',
      filters: { category: 'Monitors', tags: ['budget'], status: 'in_stock', limitCount: 9 }
    }
  ];

  for (const section of sections) {
    const container = document.querySelector(section.sectionSelector + ' .product-grid-vertical');
    if (!container) continue;

    renderer.showLoading(container.id);
    
    try {
      const result = await loader.loadProducts(section.filters);
      if (result.success && result.products.length > 0) {
        container.innerHTML = result.products.map(p => renderer.renderProductCard(p)).join('');
      } else {
        container.innerHTML = '<div class="no-products"><p>No products available yet.</p></div>';
      }
    } catch (error) {
      console.error('Error:', error);
      renderer.showError(container.id, error.message);
    }
  }

})();
