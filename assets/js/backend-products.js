/**
 * ========================================
 * BACKEND PRODUCTS CONNECTION SCRIPT (Supabase-first)
 * ========================================
 * Loads products from Supabase (v2 JS) and renders them
 * - Filters status = 'active'
 * - Auto-detects category from page (or container data attributes)
 * - Replaces static HTML cards at runtime
 * - Realtime auto-refresh on changes
 * - Fallback to PHP API if Supabase not available
 */

(function() {
  'use strict';

  // Environment helpers
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const API_BASE_URL = (() => {
    if (window.API_CONFIG && window.API_CONFIG.apiUrl) return window.API_CONFIG.apiUrl;
    if (isLocalhost) return 'api';
    if (window.location && window.location.origin) {
      return `${window.location.origin.replace(/\/$/, '')}/api`;
    }
    return 'api';
  })();

  // Supabase client holder
  let supabase = null;
  let supabaseReadyPromise = null;
  let realtimeChannel = null;

  // Ensure Supabase scripts are loaded and client initialized once
  async function ensureSupabaseClient() {
    if (supabase) return supabase;
    if (window.supabase) {
      supabase = window.supabase;
      return supabase;
    }
    if (supabaseReadyPromise) return supabaseReadyPromise;

    const ensureScript = (src, test) => {
      if (test()) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-supabase-loader="${src}"]`);
        if (existing) {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', () => reject(new Error('Failed to load ' + src)), { once: true });
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.dataset.supabaseLoader = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load ' + src));
        document.head.appendChild(script);
      });
    };

    supabaseReadyPromise = (async () => {
      try { await ensureScript('assets/js/supabase-config.js', () => !!window.SUPABASE_CONFIG); } catch (_) {}
      try { await ensureScript('assets/js/supabase-init.js', () => typeof window.ensureSupabase === 'function'); } catch (_) {}

      if (typeof window.ensureSupabase !== 'function') {
        throw new Error('Supabase init helper missing. Include assets/js/supabase-init.js before backend-products.js.');
      }

      const client = await window.ensureSupabase();
      if (!client) throw new Error('Supabase client unavailable');

      if (!window.supabase) window.supabase = client;
      supabase = client;
      return client;
    })();

    try {
      return await supabaseReadyPromise;
    } catch (error) {
      supabaseReadyPromise = null;
      throw error;
    }
  }

  // Category detection by page path or container attributes
  function derivePageCategory() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('laptop')) return 'Laptops';
    if (path.includes('desktop')) return 'Desktops';
    if (path.includes('monitor')) return 'Monitors';
    if (path.includes('printer')) return 'Printers';
    if (path.includes('graphics-card')) return 'Graphics Cards';
    if (path.includes('keyboard')) return 'Keyboards';
    if (path.includes('mousepad')) return 'Mousepads';
    if (path.includes('mouse')) return 'Mouse';
    if (path.includes('headset')) return 'Headsets';
    if (path.includes('controller')) return 'Controllers';
    if (path.includes('cabinets')) return 'Cabinets';
    if (path.includes('case-fans')) return 'Case Fans';
    if (path.includes('power-supply')) return 'Power Supply';
    if (path.includes('internal-ssd')) return 'Internal SSD';
    if (path.includes('external-ssd')) return 'External SSD';
    if (path.includes('hard-drive')) return 'Hard Drive';
    if (path.includes('usb-devices')) return 'USB Devices';
    if (path.includes('vertical-gpu-bracket')) return 'GPU Brackets';
    if (path.includes('ups')) return 'UPS';
    if (path.includes('power-strip')) return 'Power Strip';

    // Homepage -> use featured
    if (path.endsWith('/') || path.endsWith('/index.html') || /index\.html$/.test(path)) return '__FEATURED__';

    return null; // no specific category -> show all active
  }

  // Simple cache with TTL
  const CACHE_TTL_MS = 60 * 1000; // 1 min
  function cacheKey(category) { return `supabase_products_${category || 'all'}`; }
  function readCache(category) {
    try {
      const raw = localStorage.getItem(cacheKey(category));
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL_MS) return null;
      return Array.isArray(data) ? data : null;
    } catch { return null; }
  }
  function writeCache(category, data) {
    try { localStorage.setItem(cacheKey(category), JSON.stringify({ ts: Date.now(), data })); } catch {}
  }
  function clearProductsCache() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(k => { if (k.startsWith('supabase_products_')) localStorage.removeItem(k); });
    } catch {}
  }

  // Fetch products from Supabase with filters
  async function fetchProductsSupabase(category = null, limit = null, tag = null) {
    try {
      const client = await ensureSupabaseClient();
      if (!client) return { ok: false, data: [], error: 'Supabase not available' };

      // cache first
      const cached = readCache(category || (tag ? `tag_${tag}` : null));
      if (cached) {
        console.log(`✅ Using cached ${category || 'all'}: ${cached.length} items`);
        return { ok: true, data: limit ? cached.slice(0, limit) : cached };
      }

      let q = client
        .from('products')
        .select('id, name, price, offer_price, stock, category, description, image_url, status, featured, tags')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (category && category !== '__FEATURED__') {
        // Check if multiple categories (comma-separated)
        if (category.includes(',')) {
          const cats = category.split(',').map(c => c.trim());
          q = q.in('category', cats);
        } else {
          // Single category - case-insensitive match
          if (typeof q.ilike === 'function') {
            q = q.ilike('category', category);
          } else {
            q = q.eq('category', category);
          }
        }
      }
      if (category === '__FEATURED__') {
        q = q.eq('featured', true);
      }
      if (tag) {
        q = q.contains('tags', [tag]);
      }
      if (limit && Number.isFinite(limit)) {
        q = q.limit(limit);
      }

      const { data, error } = await q;
      
      if (error) {
        console.error('Supabase query error:', error);
        return { ok: false, data: [], error: error.message };
      }

      if (!data) {
        console.warn('Supabase returned null data');
        return { ok: false, data: [], error: 'No data returned' };
      }

      // write cache
      writeCache(category || (tag ? `tag_${tag}` : null), data || []);
      console.log(`✅ Fetched ${(data || []).length} products from Supabase for ${category || 'all'}`);

      return { ok: true, data: data || [] };
    } catch (e) {
      console.error('Supabase fetch exception:', e);
      return { ok: false, data: [], error: e.message };
    }
  }

  // Fallback to PHP API
  async function fetchProductsPHP(category = null, limit = null) {
    try {
      let url = `${API_BASE_URL}/get-products.php`;
      const params = new URLSearchParams();
      if (category && category !== '__FEATURED__') params.append('category', category);
      if (limit) params.append('limit', String(limit));
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      const json = await response.json();
      if (!json.success) {
        console.warn('Products PHP endpoint returned failure:', json.message);
        return { ok: false, data: [], error: json.message || 'Failed to load products' };
      }
      return { ok: true, data: json.products || [] };
    } catch (e) {
      return { ok: false, data: [], error: e.message };
    }
  }

  // Public fetch function (Supabase first)
  async function fetchProducts(category = null, limit = null, tag = null) {
    const supa = await fetchProductsSupabase(category, limit, tag);
    if (supa.ok && supa.data.length >= 0) return supa.data; // even 0-length is valid

    // fallback
    const php = await fetchProductsPHP(category, limit);
    return php.data;
  }

  // Render product card HTML (preserve existing design)
  function renderProductCard(product) {
    const price = parseFloat(product.price || 0);
    const offerPrice = product.offer_price ? parseFloat(product.offer_price) : null;
    const discount = offerPrice ? Math.round(((price - offerPrice) / Math.max(price, 1)) * 100) : 0;
    const finalPrice = Number.isFinite(offerPrice) ? offerPrice : price;
    let imageUrl = product.image_url || product.image || product.images && product.images[0] || 'assets/img/placeholder.png';

    // Normalize leading slash
    if (typeof imageUrl === 'string' && imageUrl.startsWith('/')) imageUrl = imageUrl.substring(1);

    const stock = parseInt(product.stock || 0);

    const stockBadgeClass = stock > 10 ? 'in-stock' : stock > 0 ? 'low-stock' : 'out-of-stock';
    const stockBadgeText = stock > 10 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock';

    // Ensure safe escaping for attributes
    const safeName = (product.name || 'Product').replace(/"/g, '&quot;');

    return `
      <article class="p-card" data-product-id="${product.id}">
        <a href="product-details.html?id=${product.id}" class="media">
          <span class="stock-badge ${stockBadgeClass}">${stockBadgeText}</span>
          ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
          <img src="${imageUrl}" alt="${safeName}" loading="lazy" class="product-img-fallback" />
        </a>
        <div class="body">
          <a class="title" href="product-details.html?id=${product.id}">${product.name || 'Unnamed Product'}</a>
          <div class="meta">${product.description ? (product.description.length > 60 ? product.description.substring(0, 57) + '...' : product.description) : (product.category || 'View details')}</div>
          <div class="price">
            ${discount > 0 ? `<span class="old">Rs ${Number(price).toLocaleString()}</span>` : ''}
            <span class="now">Rs ${Number(finalPrice).toLocaleString()}</span>
          </div>
          <div class="cta">
            <button class="btn small view-btn" data-product-id="${product.id}">View</button>
            <button class="btn small cart-btn" data-product-id="${product.id}" data-name="${safeName}" data-price="${finalPrice}" data-image="${imageUrl}" data-sku="${product.sku || product.id}" data-add-to-cart>
              <i class="fas fa-shopping-cart"></i> Add to Cart
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // Attach cart handlers for a container
  function wireCartButtons(container) {
    // select both new and old style selectors
    const selectors = container.querySelectorAll('.cart-btn, [data-add-to-cart], button[data-product-id]');
    selectors.forEach(btn => {
      // avoid adding duplicate listeners
      if (btn.__wired) return; btn.__wired = true;
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        // If it's view button, navigate
        if (this.classList.contains('view-btn')) {
          const pid = this.dataset.productId || this.getAttribute('data-product-id');
          if (pid) window.location.href = `product-details.html?id=${pid}`;
          return;
        }
        const productData = {
          id: this.dataset.productId || this.dataset.id,
          name: this.dataset.name,
          price: parseFloat(this.dataset.price || 0),
          image: this.dataset.image,
          sku: this.dataset.sku || this.dataset.productId
        };
        const originalText = this.innerHTML;
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        const ok = addToCart(productData);
        this.innerHTML = ok ? '<i class="fas fa-check"></i> Added!' : originalText;
        setTimeout(() => { this.innerHTML = originalText; this.disabled = false; }, 1200);
      });
    });
  }

  // Minimal cart helpers (prefer CartManager)
  function addToCart(product) {
    if (!product || !product.id) return false;
    try {
      if (window.CartManager && typeof window.CartManager.addItem === 'function') {
        window.CartManager.addItem({ id: product.id, title: product.name, name: product.name, price: product.price, image: product.image });
        return true;
      }
      const KEY = 'oneclick_cart';
      const cart = JSON.parse(localStorage.getItem(KEY) || '[]');
      const existing = cart.find(i => i.id === product.id || i.sku === product.sku);
      if (existing) { existing.qty = (existing.qty || 1) + 1; }
      else { cart.push({ id: product.id, title: product.name, price: product.price, image: product.image, qty: 1 }); }
      localStorage.setItem(KEY, JSON.stringify(cart));
      updateCartBadge();
      return true;
    } catch { return false; }
  }

  function updateCartBadge() {
    let total = 0;
    if (window.CartManager) { total = window.CartManager.getCount(); }
    else {
      const KEY = 'oneclick_cart';
      const cart = JSON.parse(localStorage.getItem(KEY) || '[]');
      total = cart.reduce((s, i) => s + (i.qty || i.quantity || 1), 0);
    }
    document.querySelectorAll('.icon-btn .badge').forEach(badge => {
      const parent = badge.closest('[href="cart.html"]');
      if (parent) { badge.textContent = total; badge.style.display = total > 0 ? 'block' : 'none'; }
    });
  }

  // Load products into a given container
  async function loadProductsIntoContainer(container) {
    if (!container) return;
    const explicitCategory = container.getAttribute('data-category') || container.getAttribute('data-cat') || container.getAttribute('cat') || null;
    const tag = container.getAttribute('data-tag') || container.getAttribute('tag') || null;
    const pageCategory = derivePageCategory();
    const category = explicitCategory || pageCategory;
    const limitAttr = container.getAttribute('data-limit');
    const limit = limitAttr ? parseInt(limitAttr) : null;
    
    container.style.minHeight = container.style.minHeight || '320px';
    container.innerHTML = `
      <div style="text-align:center;padding:3rem;grid-column:1/-1;">
        <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#00d4ff;margin-bottom:1rem;"></i>
        <p style="color:#999;">Loading products...</p>
      </div>
    `;
    
    try {
      const products = await fetchProducts(category, limit, tag);
      
      if (!products) {
        throw new Error('fetchProducts returned null');
      }
      
      if (!Array.isArray(products)) {
        console.error('Products is not an array:', typeof products, products);
        throw new Error('Products response is not an array');
      }
      
      if (products.length === 0) {
        container.innerHTML = `
          <div style="text-align:center;padding:3rem;grid-column:1/-1;">
            <i class="fas fa-box-open" style="font-size:3rem;color:#666;margin-bottom:1rem;display:block;"></i>
            <p style="color:#999;">No products found${category && category !== '__FEATURED__' ? ` in ${category}` : ''}.</p>
          </div>
        `;
        return;
      }
      
      const html = products.map(renderProductCard).join('');
      container.innerHTML = html;
      wireCartButtons(container);
      attachImageFallback(container);
      console.log(`✅ Rendered ${products.length} products in container for ${category || 'all'}`);
    } catch (e) {
      console.error('Error loading products into container:', e);
      container.innerHTML = `
        <div style="text-align:center;padding:3rem;grid-column:1/-1;">
          <i class="fas fa-exclamation-circle" style="font-size:3rem;color:#ef4444;margin-bottom:1rem;display:block;"></i>
          <p style="color:#999;">Error loading products: ${e.message}</p>
          <p style="color:#666;font-size:0.9rem;">Check browser console for details</p>
        </div>
      `;
    }
  }

  function attachImageFallback(container){
    if (!container) return;
    container.querySelectorAll('img.product-img-fallback').forEach(img => {
      if (img.__fallbackBound) return; img.__fallbackBound = true;
      img.addEventListener('error', () => {
        img.src = 'assets/img/placeholder.png';
      }, { passive: true });
    });
  }

  async function initAutoLoad() {
    try {
      const containers = Array.from(document.querySelectorAll('[data-products-grid]'));
      if (containers.length === 0) {
        console.warn('No [data-products-grid] containers found on page');
        return;
      }
      console.log(`🔄 Found ${containers.length} product grid(s) to populate`);
      
      // Add timeout to prevent infinite wait
      const loadTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Product loading timeout (30s)')), 30000)
      );
      
      try {
        await Promise.race([
          Promise.all(containers.map(loadProductsIntoContainer)),
          loadTimeout
        ]);
      } catch (timeoutErr) {
        console.error('⏱️ Loading timeout:', timeoutErr);
        // Still try to continue
      }
      
      updateCartBadge();
      console.log('✅ Product grid initialization complete');
      
      // Setup realtime ONLY if Supabase is available (non-blocking)
      try {
        const client = await ensureSupabaseClient();
        if (client && !realtimeChannel) {
          // Start realtime in background, don't block page load
          setTimeout(() => {
            try {
              realtimeChannel = client.channel('products-realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
                  console.log('🔄 Product change detected, refreshing...');
                  clearProductsCache();
                  await Promise.all(containers.map(loadProductsIntoContainer));
                  updateCartBadge();
                })
                .subscribe((status) => {
                  console.log('📡 Realtime subscription status:', status);
                });
            } catch (rtErr) {
              console.warn('⚠️ Realtime subscription failed (non-blocking):', rtErr);
            }
          }, 2000); // Delay 2 seconds after page load
        }
      } catch (realtimeInitErr) {
        console.warn('⚠️ Realtime init skipped:', realtimeInitErr);
      }
    } catch (e) {
      console.error('❌ Auto-load init error:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoLoad);
  } else {
    initAutoLoad();
  }

})();
