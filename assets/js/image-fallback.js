/**
 * Image Fallback Handler
 * Automatically replaces broken product images with placeholder
 */

(function() {
  'use strict';

  const FALLBACK_IMAGE = 'assets/img/pc-case.svg';
  const PLACEHOLDER_IMAGES = {
    'laptop': 'assets/img/pc-case.svg',
    'desktop': 'assets/img/pc-case.svg',
    'monitor': 'assets/img/pc-case.svg',
    'keyboard': 'assets/img/pc-case.svg',
    'mouse': 'assets/img/pc-case.svg',
    'printer': 'assets/img/pc-case.svg',
    'graphics': 'assets/img/pc-case.svg',
    'default': 'assets/img/pc-case.svg'
  };

  function handleImageError(img) {
    // Prevent infinite loop if fallback also fails
    if (img.src.includes('pc-case.svg')) {
      console.warn('Fallback image also missing:', img.src);
      return;
    }

    console.log('Image failed to load, using fallback:', img.src);
    
    // Detect product type from page URL or parent elements
    const category = detectImageCategory(img);
    const fallback = PLACEHOLDER_IMAGES[category] || FALLBACK_IMAGE;
    
    img.src = fallback;
    img.alt = 'Product Image';
    img.style.opacity = '0.6'; // Indicate it's a placeholder
  }

  function detectImageCategory(img) {
    const url = window.location.pathname.toLowerCase();
    const parent = img.closest('.p-card, .product-card');
    
    // Check URL
    for (const cat in PLACEHOLDER_IMAGES) {
      if (url.includes(cat)) return cat;
    }
    
    // Check parent attributes
    if (parent) {
      const category = parent.getAttribute('data-category');
      if (category) return category.toLowerCase();
    }
    
    return 'default';
  }

  function initImageFallbacks() {
    // Add error handlers to all product images
    const productImages = document.querySelectorAll('.p-card img, .product-card img, [data-product-id] img');
    
    productImages.forEach(img => {
      img.addEventListener('error', function() {
        handleImageError(this);
      });
      
      // Also add onerror attribute as backup
      if (!img.hasAttribute('onerror')) {
        img.setAttribute('onerror', `this.src='${FALLBACK_IMAGE}'; this.style.opacity='0.6';`);
      }
    });

    console.log(`✅ Image fallback handlers added to ${productImages.length} images`);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageFallbacks);
  } else {
    initImageFallbacks();
  }

  // Re-initialize if new images are added dynamically
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.tagName === 'IMG') {
          if (node.closest('.p-card, .product-card')) {
            node.addEventListener('error', function() {
              handleImageError(this);
            });
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();
