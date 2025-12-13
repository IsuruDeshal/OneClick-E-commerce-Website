/**
 * ========================================
 * PRODUCT GRID LOADER - Client-side limiting
 * ========================================
 * Loads ALL products from API, then applies data-limit in browser
 *
 * Usage in HTML:
 * <div data-products-grid data-category="Laptops,Monitors" data-limit="4"></div>
 */

(function() {
  'use strict';

  const SUPABASE_URL = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) 
    ? window.SUPABASE_CONFIG.url.replace(/\/$/, '')
    : 'https://pvnlavcuswjxhywbsodm.supabase.co';
  const SUPABASE_REST_URL = `${SUPABASE_URL}/rest/v1`;

  // Get API configuration
  const getApiUrl = () => {
    // Always use Supabase REST API in production
    return SUPABASE_REST_URL;
  };

  const API_BASE = getApiUrl();
  const SUPABASE_KEY = window.SUPABASE_CONFIG?.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bmxhdmN1c3dqeGh5d2Jzb2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNTkyOTYsImV4cCI6MjA3NzczNTI5Nn0.pddR-mTtvaELNeK_F1HDwZfjs29xj__k9z-WFOqZbFA';

  console.log('🔗 Product Grid Loader using Supabase API:', API_BASE);

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  /**
   * Render a single product card
   */
  function renderProductCard(product) {
    const price = parseFloat(product.offer_price || product.price || 0);
    const originalPrice = parseFloat(product.price || 0);
    const discount = (product.offer_price && originalPrice > price)
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

    const stock = parseInt(product.stock || 0);
    const stockClass = stock > 10 ? 'in-stock' : stock > 0 ? 'low-stock' : 'out-of-stock';
    const stockText = stock > 10 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock';

    const imageUrl = product.image_url || 'assets/img/placeholder.png';
    const productId = product.id || product.sku || '';
    const productName = escapeHtml(product.name || 'Product');
    const category = escapeHtml(product.category || '');
    const description = product.description
      ? (product.description.length > 60 ? escapeHtml(product.description.substring(0, 57)) + '...' : escapeHtml(product.description))
      : category;

    const condition = product.condition || 'Brand New';
    let conditionBadge = '';
    if (condition === 'Used') {
      conditionBadge = '<span class="badge" style="position:absolute;top:10px;left:10px;background:#92400e;color:#fbbf24;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;">Used</span>';
    } else if (condition === 'Refurbished') {
      conditionBadge = '<span class="badge" style="position:absolute;top:10px;left:10px;background:#4c1d95;color:#c4b5fd;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;">Refurbished</span>';
    }

    return `
      <article class="p-card" data-product-id="${productId}">
        <a href="product-details.html?id=${productId}" class="media">
          ${conditionBadge}
          <span class="stock-badge ${stockClass}">${stockText}</span>
          ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
          <img src="${imageUrl}" alt="${productName}" loading="lazy" onerror="this.src='assets/img/placeholder.png'" />
        </a>
        <div class="body">
          <a class="title" href="product-details.html?id=${productId}">${productName}</a>
          <div class="meta">${description}</div>
          <div class="price">
            ${discount > 0 ? `<span class="old">Rs ${originalPrice.toLocaleString()}</span>` : ''}
            <span class="now">Rs ${price.toLocaleString()}</span>
          </div>
          <div class="cta">
            <button class="btn small view-btn" onclick="window.location.href='product-details.html?id=${productId}'">View</button>
            <button class="btn small cart-btn" 
              data-product-id="${productId}"
              data-name="${productName}"
              data-price="${price}"
              data-image="${imageUrl}"
              data-sku="${product.sku || productId}">
              <i class="fas fa-shopping-cart"></i> Add to Cart
            </button>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Wire up cart buttons for a container
   */
  function wireCartButtons(container) {
    const buttons = container.querySelectorAll('.cart-btn');
    buttons.forEach(btn => {
      if (btn.__cartWired) return;
      btn.__cartWired = true;

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const productData = {
          id: btn.dataset.productId,
          name: btn.dataset.name,
          title: btn.dataset.name,
          price: parseFloat(btn.dataset.price || 0),
          image: btn.dataset.image,
          sku: btn.dataset.sku,
          qty: 1,
          quantity: 1
        };

        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

        try {
          // Try CartManager first
          if (window.CartManager && typeof window.CartManager.addItem === 'function') {
            await window.CartManager.addItem(productData);
          } else {
            // Fallback to localStorage
            const KEY = 'oneclick_cart';
            const cart = JSON.parse(localStorage.getItem(KEY) || '[]');
            const existing = cart.find(item => item.id === productData.id || item.sku === productData.sku);

            if (existing) {
              existing.qty = (existing.qty || 1) + 1;
              existing.quantity = existing.qty;
            } else {
              cart.push(productData);
            }

            localStorage.setItem(KEY, JSON.stringify(cart));

            // Update badge
            const badges = document.querySelectorAll('.icon-btn .badge');
            badges.forEach(badge => {
              const total = cart.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0);
              badge.textContent = total;
              badge.style.display = total > 0 ? 'block' : 'none';
            });
          }

          btn.innerHTML = '<i class="fas fa-check"></i> Added!';
        } catch (error) {
          console.error('Error adding to cart:', error);
          btn.innerHTML = originalHtml;
        }

        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.disabled = false;
        }, 1500);
      });
    });
  }

  /**
   * Load products for a single grid
   */
  async function loadProductsForGrid(grid) {
    // Get categories from data attribute
    const categoryAttr = grid.dataset.category || grid.getAttribute('data-category') || '';

    // Special handling for Gaming Peripherals
    let categories = [];
    if (categoryAttr === 'Gaming Peripherals' || categoryAttr === 'Peripherals') {
      categories = ['Mouse', 'Keyboard', 'Headset', 'Mousepad', 'Accessory'];
    } else if (categoryAttr === '__ALL__') {
      categories = []; // force no category filter
    } else if (categoryAttr) {
      categories = categoryAttr
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);
    }

    // Get limit (0 = no limit)
    const limitAttr = grid.dataset.limit || grid.getAttribute('data-limit') || '0';
    const limit = parseInt(limitAttr, 10);

    // Show loading state
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #00d4ff; margin-bottom: 1rem;"></i>
        <p style="color: #999;">Loading products...</p>
      </div>
    `;

    try {
      // Build API URL
      const params = new URLSearchParams();

      if (categories.length > 0) {
        params.set('categories', categories.join(','));
      }
      // __ALL__ means no categories param at all
      if (categoryAttr === '__ALL__') {
        params.delete('categories');
      }

      // Build Supabase REST API query
      let supabaseUrl = `${API_BASE}/products?select=*&status=eq.active`;

      // Add category filter
      if (categories.length > 0) {
        if (categoryAttr === '__FEATURED__' || categoryAttr === 'featured') {
          supabaseUrl += '&featured=eq.true';
        } else {
          // Filter by multiple categories
          const categoryFilter = categories.map(c => `category.eq.${encodeURIComponent(c)}`).join(',');
          supabaseUrl += `&or=(${categoryFilter})`;
        }
      }

      // Add ordering
      supabaseUrl += '&order=featured.desc,created_at.desc';

      const url = supabaseUrl;

      // Check cache first (5 minute TTL)
      const cacheKey = `products_cache_${url}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const cacheData = JSON.parse(cached);
          if (Date.now() - cacheData.timestamp < 300000) { // 5 minutes
            let products = cacheData.data || [];

            // Apply client-side limit
            if (limit > 0 && products.length > limit) {
              products = products.slice(0, limit);
            }

            // Render products
            if (products.length === 0) {
              grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem;"><i class="fas fa-box-open" style="font-size: 3rem; color: #666; margin-bottom: 1rem; display: block;"></i><p style="color: #999;">No products found${categories.length > 0 ? ' in ' + categories.join(', ') : ''}.</p></div>`;
              return;
            }

            grid.innerHTML = products.map(renderProductCard).join('');
            wireCartButtons(grid);
            return;
          }
        } catch(e) {}
      }

      // Fetch products from Supabase REST API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Supabase returns array directly, not wrapped in { success: true, products: [] }
      let products = Array.isArray(data) ? data : (data.products || []);

      // Cache successful response
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: products,
          timestamp: Date.now()
        }));
      } catch(e) {}

      // Optional tag filtering
      const tagAttr = grid.dataset.tag || grid.getAttribute('data-tag');
      if (tagAttr) {
        const tagLower = tagAttr.toLowerCase();
        products = products.filter(p => {
          // Match tags array if present
          if (Array.isArray(p.tags) && p.tags.some(t => String(t).toLowerCase() === tagLower)) return true;
          // Fallback: try specifications or description text contains tag
          if (p.description && p.description.toLowerCase().includes(tagLower)) return true;
          if (p.specifications && typeof p.specifications === 'object') {
            try {
              const specStr = JSON.stringify(p.specifications).toLowerCase();
              if (specStr.includes(tagLower)) return true;
            } catch(_) {}
          }
          return false;
        });
      }

      // Apply client-side limit
      if (limit > 0 && products.length > limit) {
        products = products.slice(0, limit);
      }

      // Render products
      if (products.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <i class="fas fa-box-open" style="font-size: 3rem; color: #666; margin-bottom: 1rem; display: block;"></i>
            <p style="color: #999;">No products found${categories.length > 0 ? ' in ' + categories.join(', ') : ''}.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = products.map(renderProductCard).join('');

      // Wire up cart buttons
      wireCartButtons(grid);

    } catch (error) {
      console.error('Error loading products for grid:', error);
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem; display: block;"></i>
          <p style="color: #ef4444;">Failed to load products</p>
          <p style="color: #999; font-size: 0.9rem; margin-top: 0.5rem;">${error.message}</p>
        </div>
      `;
    }
  }

  // Keep a registry of grids and their filters for realtime refresh
  const GridRegistry = [];
  const debounceTimers = new Map();
  function debounce(key, fn, wait = 400){
    clearTimeout(debounceTimers.get(key));
    const t = setTimeout(fn, wait);
    debounceTimers.set(key, t);
  }

  function recordGrid(grid){
    const categoryAttr = grid.dataset.category || '';
    let cats = [];
    if (categoryAttr === 'Gaming Peripherals' || categoryAttr === 'Peripherals') cats = ['Mouse','Keyboard','Headset','Mousepad','Accessory'];
    else if (categoryAttr && categoryAttr !== '__FEATURED__' && categoryAttr !== '__ALL__') cats = categoryAttr.split(',').map(s=>s.trim()).filter(Boolean);
    const entry = {
      el: grid,
      categoryAttr,
      cats,
      featured: (categoryAttr === '__FEATURED__' || categoryAttr === 'featured'),
      all: (categoryAttr === '__ALL__')
    };
    GridRegistry.push(entry);
    return entry;
  }

  function shouldRefresh(entry, row){
    // Only active products are displayed
    const isActive = (row.new?.status || row.old?.status || 'active') === 'active';
    const cat = (row.new?.category || row.old?.category || '') || '';
    const featured = (row.new?.featured ?? row.old?.featured) === true;

    if (entry.all) return true;
    if (entry.featured) return featured && isActive;
    if (entry.cats && entry.cats.length>0) return entry.cats.includes(cat) && isActive;
    return false;
  }

  async function setupRealtime(){
    try{
      if (!window.ensureSupabase) return; // Supabase not loaded; skip realtime
      const supabase = await window.ensureSupabase();
      if (!supabase || !supabase.channel) return;

      const channel = supabase
        .channel('public:products')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          (payload) => {
            // Find affected grids and debounce-refresh
            GridRegistry.forEach(entry => {
              if (shouldRefresh(entry, payload)) {
                debounce(entry.categoryAttr || 'all', () => {
                  if (document.body.contains(entry.el)) {
                    loadProductsForGrid(entry.el);
                  }
                }, 500);
              }
            });
          }
        )
        .subscribe((status)=>{
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] Subscribed to products changes');
          }
        });

      // Expose for debugging
      window.__ProductsRealtimeChannel = channel;
    }catch(err){
      console.warn('[Realtime] setup failed:', err);
    }
  }

  /**
   * Initialize all product grids on page
   */
  function initProductGrids() {
    const grids = document.querySelectorAll('[data-products-grid]');

    if (grids.length === 0) {
      console.warn('[Product Grid Loader] No grids found with [data-products-grid] attribute');
      return;
    }

    console.log(`[Product Grid Loader] Found ${grids.length} grid(s) to populate`);

    grids.forEach((grid, index) => {
      const category = grid.dataset.category || 'all';
      const limit = grid.dataset.limit || 'unlimited';
      console.log(`[Product Grid Loader] Grid ${index + 1}: category="${category}", limit=${limit}`);
      recordGrid(grid);
      loadProductsForGrid(grid);
    });

    // Start realtime once per page
    setupRealtime();
  }

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductGrids);
  } else {
    initProductGrids();
  }

  // Expose for manual refresh
  window.ProductGridLoader = {
    init: initProductGrids,
    loadGrid: loadProductsForGrid
  };

})();
