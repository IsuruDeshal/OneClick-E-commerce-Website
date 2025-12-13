/**
 * ═══════════════════════════════════════════════════════════════
 * AUTOMATIC PRODUCT COLLECTION SYSTEM
 * ═══════════════════════════════════════════════════════════════
 * 
 * This script automatically collects all product cards from any page
 * and sends them to the backend API for storage.
 * 
 * Features:
 * - Auto-detects all product cards on page load
 * - Extracts: ID, name, price, image, category, brand, specs
 * - Sends to backend API /api/products/collect
 * - Handles duplicates and updates
 * - Batch processing for performance
 * - Error handling and retry logic
 */

(function() {
  'use strict';

  const CONFIG = {
    // Use Supabase REST API instead of localhost
    API_BASE_URL: 'https://pvnlavcuswjxhywbsodm.supabase.co/rest/v1',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bmxhdmN1c3dqeGh5d2Jzb2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNTkyOTYsImV4cCI6MjA3NzczNTI5Nn0.pddR-mTtvaELNeK_F1HDwZfjs29xj__k9z-WFOqZbFA',
    ENABLE_AUTO_COLLECT: false, // Disabled - products are in Supabase, collected manually
    BATCH_SIZE: 10,
    RETRY_ATTEMPTS: 3,
    DEBUG: false // set to true for debugging
  };

  // ═══════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  
  function debug(message, data) {
    if (CONFIG.DEBUG) {
      console.log(`🔍 [Product Collector] ${message}`, data || '');
    }
  }

  function error(message, err) {
    console.error(`❌ [Product Collector] ${message}`, err || '');
  }

  // ═══════════════════════════════════════════════════════════════
  // PRODUCT DATA EXTRACTION
  // ═══════════════════════════════════════════════════════════════
  
  function extractProductData(card, index) {
    try {
      const product = {
        id: null,
        name: '',
        price: 0,
        originalPrice: 0,
        discount: 0,
        currency: 'Rs',
        image: '',
        images: [],
        category: '',
        brand: '',
        description: '',
        specs: {},
        highlights: [],
        stock: 10,
        availability: 'in-stock',
        featured: false,
        pageUrl: window.location.pathname,
        createdAt: new Date().toISOString()
      };

      // Extract ID
      product.id = card.getAttribute('data-product-id') || 
                   card.getAttribute('data-id') ||
                   card.getAttribute('id');

      // Extract name/title
      const titleElement = card.querySelector('.title, .product-title, h3, h4, .name, .product-name');
      if (titleElement) {
        product.name = titleElement.textContent.trim();
      }

      // Auto-generate ID from name if missing
      if (!product.id && product.name) {
        product.id = product.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 50) + `-${index}`;
        card.setAttribute('data-product-id', product.id);
      }

      // Extract price
      const priceElement = card.querySelector('.price .now, .current-price, .price-now, [class*="price"]');
      if (priceElement) {
        const priceText = priceElement.textContent.trim();
        const priceMatch = priceText.match(/[\d,]+/);
        if (priceMatch) {
          product.price = parseInt(priceMatch[0].replace(/,/g, ''));
        }
      }

      // Extract original price
      const oldPriceElement = card.querySelector('.price .old, .original-price, .price-old');
      if (oldPriceElement) {
        const oldPriceText = oldPriceElement.textContent.trim();
        const oldPriceMatch = oldPriceText.match(/[\d,]+/);
        if (oldPriceMatch) {
          product.originalPrice = parseInt(oldPriceMatch[0].replace(/,/g, ''));
          if (product.originalPrice > product.price) {
            product.discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
          }
        }
      }

      // Extract image
      const imgElement = card.querySelector('img, .media img, .product-image img');
      if (imgElement) {
        const imgSrc = imgElement.src || imgElement.getAttribute('data-src') || '';
        product.image = imgSrc.replace(window.location.origin, ''); // Store relative path
        product.images = [product.image];
      }

      // Extract description/meta
      const metaElement = card.querySelector('.meta, .description, .product-meta, .specs');
      if (metaElement) {
        product.description = metaElement.textContent.trim();
        
        // Parse highlights from description
        const highlights = product.description.split('•').map(s => s.trim()).filter(s => s);
        if (highlights.length > 0) {
          product.highlights = highlights;
          highlights.forEach((spec, idx) => {
            product.specs[`Spec ${idx + 1}`] = spec;
          });
        }
      }

      // Extract stock status
      const stockBadge = card.querySelector('.stock-badge, .availability, [class*="stock"]');
      if (stockBadge) {
        const stockText = stockBadge.textContent.toLowerCase();
        if (stockText.includes('in stock')) {
          product.availability = 'in-stock';
          product.stock = 15;
        } else if (stockText.includes('low stock')) {
          product.availability = 'low-stock';
          product.stock = 3;
        } else if (stockText.includes('out')) {
          product.availability = 'out-of-stock';
          product.stock = 0;
        }
      }

      // Extract category
      product.category = card.getAttribute('data-category') || 
                        card.getAttribute('data-type') ||
                        getPageCategory();

      // Extract brand
      product.brand = card.getAttribute('data-brand') || 
                     card.getAttribute('data-manufacturer') ||
                     (product.name ? product.name.split(' ')[0] : 'Generic');

      // Check if featured
      product.featured = card.classList.contains('featured') || 
                        card.hasAttribute('data-featured');

      debug(`Extracted product #${index}`, product);
      return product;

    } catch (err) {
      error(`Failed to extract product data from card #${index}`, err);
      return null;
    }
  }

  function getPageCategory() {
    const pageTitle = document.title.split('|')[0].trim();
    const pathname = window.location.pathname;
    
    if (pathname.includes('laptop')) return 'Laptops';
    if (pathname.includes('desktop')) return 'Desktops';
    if (pathname.includes('monitor')) return 'Monitors';
    if (pathname.includes('printer')) return 'Printers';
    if (pathname.includes('graphics-card')) return 'Graphics Cards';
    if (pathname.includes('keyboard')) return 'Keyboards';
    if (pathname.includes('mouse')) return 'Mouse';
    if (pathname.includes('mousepad')) return 'Mousepads';
    if (pathname.includes('headset')) return 'Headsets';
    if (pathname.includes('controller')) return 'Controllers';
    if (pathname.includes('cabinet')) return 'Cabinets';
    if (pathname.includes('case-fan')) return 'Case Fans';
    if (pathname.includes('power-supply')) return 'Power Supplies';
    if (pathname.includes('custom-cable')) return 'Custom Cables';
    if (pathname.includes('hard-drive')) return 'Hard Drives';
    if (pathname.includes('internal-ssd')) return 'Internal SSDs';
    if (pathname.includes('external-ssd')) return 'External SSDs';
    if (pathname.includes('vertical-gpu')) return 'GPU Brackets';
    if (pathname.includes('usb-device')) return 'USB Devices';
    if (pathname.includes('ups')) return 'UPS';
    if (pathname.includes('power-strip')) return 'Power Strips';
    
    return pageTitle || 'Products';
  }

  // ═══════════════════════════════════════════════════════════════
  // API COMMUNICATION
  // ═══════════════════════════════════════════════════════════════
  
  async function sendProductsToBackend(products) {
    debug(`Sending ${products.length} products to backend...`);

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/products/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ products })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      debug('✅ Products sent successfully', result);
      return result;

    } catch (err) {
      error('Failed to send products to backend', err);
      
      // Store locally as backup
      try {
        const existing = JSON.parse(localStorage.getItem('products_backup') || '[]');
        const merged = [...existing, ...products];
        localStorage.setItem('products_backup', JSON.stringify(merged));
        debug('💾 Products saved to localStorage as backup');
      } catch (storageErr) {
        error('Failed to save to localStorage', storageErr);
      }
      
      return { success: false, error: err.message };
    }
  }

  async function sendProductsBatch(products, batchSize = CONFIG.BATCH_SIZE) {
    const batches = [];
    for (let i = 0; i < products.length; i += batchSize) {
      batches.push(products.slice(i, i + batchSize));
    }

    debug(`Processing ${batches.length} batches...`);

    const results = [];
    for (let i = 0; i < batches.length; i++) {
      debug(`Sending batch ${i + 1}/${batches.length}`);
      const result = await sendProductsToBackend(batches[i]);
      results.push(result);
      
      // Small delay between batches to avoid overwhelming the server
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN COLLECTION PROCESS
  // ═══════════════════════════════════════════════════════════════
  
  async function collectAndSendProducts() {
    if (!CONFIG.ENABLE_AUTO_COLLECT) {
      debug('Auto-collection is disabled');
      return;
    }

    debug('🚀 Starting product collection...');

    // Find all product cards
    const productCards = document.querySelectorAll('.p-card, .product-card, [data-product-id], [class*="product"]');
    debug(`Found ${productCards.length} potential product cards`);

    if (productCards.length === 0) {
      debug('No product cards found on this page');
      return;
    }

    // Extract data from all cards
    const products = [];
    productCards.forEach((card, index) => {
      const product = extractProductData(card, index);
      if (product && product.id && product.name && product.price > 0) {
        products.push(product);
      }
    });

    debug(`✅ Successfully extracted ${products.length} valid products`);

    if (products.length === 0) {
      debug('No valid products to send');
      return;
    }

    // Send to backend in batches
    const results = await sendProductsBatch(products);
    
    const successCount = results.filter(r => r.success).length;
    debug(`🎉 Collection complete: ${successCount}/${results.length} batches successful`);

    // Store metadata about this collection
    const metadata = {
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
      productsCount: products.length,
      category: getPageCategory()
    };
    
    const collections = JSON.parse(localStorage.getItem('collection_history') || '[]');
    collections.push(metadata);
    localStorage.setItem('collection_history', JSON.stringify(collections.slice(-50))); // Keep last 50
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  
  window.ProductCollector = {
    collect: collectAndSendProducts,
    
    getCollectionHistory() {
      return JSON.parse(localStorage.getItem('collection_history') || '[]');
    },
    
    getBackupProducts() {
      return JSON.parse(localStorage.getItem('products_backup') || '[]');
    },
    
    clearBackup() {
      localStorage.removeItem('products_backup');
      debug('Backup cleared');
    },
    
    enable() {
      CONFIG.ENABLE_AUTO_COLLECT = true;
      debug('Auto-collection enabled');
    },
    
    disable() {
      CONFIG.ENABLE_AUTO_COLLECT = false;
      debug('Auto-collection disabled');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // AUTO-INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(collectAndSendProducts, 1000); // Wait 1s for dynamic content
    });
  } else {
    setTimeout(collectAndSendProducts, 1000);
  }

  debug('📦 Product Auto-Collector loaded');

})();
