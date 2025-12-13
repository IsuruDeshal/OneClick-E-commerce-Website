/**
 * ========================================
 * PRODUCT CARD CLICK HANDLER
 * ========================================
 * Makes all product cards clickable and redirects to product details page
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductClickHandlers);
  } else {
    initProductClickHandlers();
  }

  function initProductClickHandlers() {
    // Add click handlers to all product cards
    makeProductCardsClickable();

    // Re-initialize when new products are loaded dynamically
    observeProductCards();
  }

  /**
   * Make all product cards clickable
   */
  function makeProductCardsClickable() {
    const productCards = document.querySelectorAll('.product-card, .product-item, [data-product-id]');

    productCards.forEach(card => {
      // Skip if already clickable
      if (card.classList.contains('clickable-initialized')) {
        return;
      }

      // Mark as initialized
      card.classList.add('clickable-initialized');

      // Add pointer cursor
      card.style.cursor = 'pointer';

      // Add hover effect
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px)';
        card.style.transition = 'all 0.3s ease';
        card.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '';
      });

      // Add touch effect for mobile
      card.addEventListener('touchstart', () => {
        card.style.transform = 'scale(0.98)';
      });

      card.addEventListener('touchend', () => {
        card.style.transform = 'scale(1)';
      });

      // Handle clicks
      card.addEventListener('click', function(e) {
        // Don't trigger if clicking on buttons inside the card
        if (
          e.target.closest('button') ||
          e.target.closest('.btn') ||
          e.target.closest('a') ||
          e.target.closest('[data-action]')
        ) {
          return;
        }

        // Get product ID
        const productId = getProductId(card);

        if (productId) {
          // Redirect to product details page
          window.location.href = `/product-details.html?id=${productId}`;
        }
      });

      // Add visual indicator that card is clickable
      addClickableIndicator(card);
    });
  }

  /**
   * Get product ID from card
   */
  function getProductId(card) {
    // Try different attributes
    return card.dataset.productId ||
           card.dataset.id ||
           card.dataset.sku ||
           card.getAttribute('data-product-id') ||
           card.id;
  }

  /**
   * Add visual indicator that card is clickable
   */
  function addClickableIndicator(card) {
    // Check if indicator already exists
    if (card.querySelector('.click-indicator')) {
      return;
    }

    // Create indicator
    const indicator = document.createElement('div');
    indicator.className = 'click-indicator';
    indicator.innerHTML = '<i class="fas fa-eye"></i> Click to view details';
    indicator.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 107, 53, 0.95);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 10;
      white-space: nowrap;
    `;

    // Show indicator on hover
    card.addEventListener('mouseenter', () => {
      indicator.style.opacity = '1';
    });

    card.addEventListener('mouseleave', () => {
      indicator.style.opacity = '0';
    });

    // Append indicator
    card.style.position = 'relative';
    card.appendChild(indicator);
  }

  /**
   * Observe for dynamically added product cards
   */
  function observeProductCards() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              // Check if the node itself is a product card
              if (isProductCard(node)) {
                makeProductCardsClickable();
              }
              // Check if any children are product cards
              if (node.querySelectorAll) {
                const cards = node.querySelectorAll('.product-card, .product-item, [data-product-id]');
                if (cards.length > 0) {
                  makeProductCardsClickable();
                }
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Check if element is a product card
   */
  function isProductCard(element) {
    return element.classList?.contains('product-card') ||
           element.classList?.contains('product-item') ||
           element.hasAttribute?.('data-product-id');
  }

  /**
   * Utility: Add keyboard navigation for accessibility
   */
  function addKeyboardNavigation() {
    const productCards = document.querySelectorAll('.product-card, .product-item');

    productCards.forEach(card => {
      // Make focusable
      if (!card.hasAttribute('tabindex')) {
        card.setAttribute('tabindex', '0');
      }

      // Handle Enter key
      card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });

      // Focus styles
      card.addEventListener('focus', () => {
        card.style.outline = '2px solid #ff6b35';
        card.style.outlineOffset = '4px';
      });

      card.addEventListener('blur', () => {
        card.style.outline = '';
        card.style.outlineOffset = '';
      });
    });
  }

  // Add keyboard navigation after cards are initialized
  setTimeout(addKeyboardNavigation, 500);

  // Re-add keyboard navigation when new products load
  document.addEventListener('productsLoaded', addKeyboardNavigation);

  console.log('✅ Product card click handlers initialized');

})();

