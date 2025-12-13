// Universal Product Loader (Supabase-first)
// Usage:
//  - Add a container: <div id="product-grid" class="product-grid"></div>
//  - Include scripts at end of <body>:
//      <script src="assets/js/supabase-config.js"></script>
//      <script src="assets/js/supabase-init.js"></script>
//      <script type="module" src="assets/js/product-loader.js"></script>
//  - This file uses window.ensureSupabase() provided by supabase-init.js

(function(){
  'use strict';

  // Helper: get Supabase client from existing initializer
  async function getClient() {
    if (typeof window.ensureSupabase === 'function') {
      return await window.ensureSupabase();
    }
    // Lazy-load init if not present
    await injectScript('assets/js/supabase-config.js');
    await injectScript('assets/js/supabase-init.js');
    if (typeof window.ensureSupabase !== 'function') {
      throw new Error('Supabase init not available');
    }
    return await window.ensureSupabase();
  }

  function injectScript(src){
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Failed to load '+src));
      document.head.appendChild(s);
    });
  }

  // Card renderer matching site UI (.p-card)
  function renderCard(p){
    const price = Number(p.offer_price ?? p.price ?? 0);
    const base = Number(p.price ?? price);
    const discount = (p.offer_price != null && base > 0) ? Math.round(((base-price)/base)*100) : 0;
    const stock = Number(p.stock ?? 0);
    const stockClass = stock > 10 ? 'in-stock' : stock > 0 ? 'low-stock' : 'out-of-stock';
    const stockText  = stock > 10 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock';
    const img = p.image_url || 'assets/img/placeholder.png';
    const cond = (p.condition||'Brand New');
    const condBadge = cond==='Brand New'
      ? '<span class="badge" style="position:absolute;top:10px;left:10px;background:#134e4a;color:#34d399;border:none">Brand New</span>'
      : cond==='Used'
      ? '<span class="badge" style="position:absolute;top:10px;left:10px;background:#4a2f12;color:#f59e0b;border:none">Used</span>'
      : '<span class="badge" style="position:absolute;top:10px;left:10px;background:#312e81;color:#a78bfa;border:none">Refurb</span>';
    return `
      <article class="p-card" data-product-id="${p.id}">
        <a href="product-details.html?id=${p.id}" class="media">
          ${condBadge}
          <span class="stock-badge ${stockClass}">${stockText}</span>
          ${discount>0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
          <img src="${img}" alt="${p.name || 'Product'}" loading="lazy" />
        </a>
        <div class="body">
          <a class="title" href="product-details.html?id=${p.id}">${p.name || 'Product'}</a>
          <div class="meta">${p.description ? (p.description.length>60?p.description.slice(0,57)+'...':p.description) : (p.category || '')}</div>
          <div class="price">
            ${discount>0 ? `<span class="old">Rs ${Number(base).toLocaleString()}</span>` : ''}
            <span class="now">Rs ${Number(price).toLocaleString()}</span>
          </div>
          <div class="cta">
            <button class="btn small" onclick="window.location.href='product-details.html?id=${p.id}'">View</button>
            <button class="btn small cart-btn"
              data-product-id="${p.id}"
              data-name="${p.name || ''}"
              data-price="${price}"
              data-image="${img}"
              data-sku="${p.sku || p.id}">
              <i class="fas fa-shopping-cart"></i> Add to Cart
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function containerFallback(){
    // Prefer #product-grid; else try common grids already in site
    return document.getElementById('product-grid')
        || document.querySelector('.product-grid')
        || document.querySelector('.product-grid-vertical')
        || document.querySelector('.product-row');
  }

  function pageCategory(){
    // New: prefer explicit data-category attribute
    const explicit = document.body && document.body.dataset && document.body.dataset.category;
    if (explicit) return explicit;

    const path = (location.pathname || '').toLowerCase();
    if (path.includes('laptop')) return 'Laptops';
    if (path.includes('desktop')) return 'Desktops';
    if (path.includes('monitor')) return 'Monitors';
    if (path.includes('keyboard')) return 'Keyboards';
    if (path.includes('printer')) return 'Printers';
    if (path.includes('graphics-card')) return 'Graphics Cards';
    if (path.includes('mousepad')) return 'Mousepads';
    if (path.includes('mouse')) return 'Mouse';
    if (path.includes('headset')) return 'Headsets';
    return null; // homepage or generic listings
  }

  async function loadProducts(category=null){
    const container = containerFallback();
    if (!container) return;

    container.innerHTML = `
      <div style="text-align:center;padding:2rem;grid-column:1/-1;">
        <i class="fas fa-spinner fa-spin" style="font-size:1.6rem;color:#00d4ff"></i>
        <p style="color:#999">Loading products...</p>
      </div>`;

    const apiBase = (window.API_CONFIG && window.API_CONFIG.apiUrl) ? window.API_CONFIG.apiUrl.replace(/\/$/,'') : '';
    const apiUrl = apiBase ? `${apiBase}/get-products-v2.php` : 'api/get-products-v2.php';

    try{
      // Use PHP API that calls Supabase REST
      const params = new URLSearchParams({ status:'active' }); 
      if (category) params.set('category', category);
      
      const res = await fetch(`${apiUrl}?${params.toString()}`, { credentials:'include' });
      const json = await res.json().catch(()=>({}));
      
      if (!json.success) {
        throw new Error(json.error || 'Failed to load products');
      }
      
      const items = Array.isArray(json.products) ? json.products : [];
      
      if (items.length === 0){
        container.innerHTML = `<p class="empty" style="text-align:center;color:#999;padding:2rem;">No products found${category?` in ${category}`:''}.</p>`;
        return;
      }
      
      container.innerHTML = items.map(renderCard).join('');
      wireCart(container);

    }catch(err){
      console.error('Error loading products:', err && (err.message||err));
      container.innerHTML = `<p class="error" style="color:#ff7777;text-align:center;padding:2rem;">⚠️ Couldn't load products. Try again later.</p>`;
    }
  }

  async function loadFeatured(){
    const container = document.querySelector('#featured-grid') || containerFallback();
    if(!container) return; container.innerHTML = '<p class="loading" style="text-align:center;padding:1rem">Loading featured...</p>';
    try{
      const apiBase = (window.API_CONFIG && window.API_CONFIG.apiUrl) ? window.API_CONFIG.apiUrl.replace(/\/$/,'') : '';
      const apiUrl = apiBase ? `${apiBase}/get-products-v2.php` : 'api/get-products-v2.php';
      
      const res = await fetch(`${apiUrl}?featured=1&status=active`);
      const json = await res.json();
      
      if (!json.success) {
        throw new Error(json.error || 'Failed to load featured');
      }
      
      const data = (json && json.products) || [];
      container.innerHTML = data.map(renderCard).join('');
      wireCart(container);
    }catch(e){ 
      console.error('Featured load error:', e);
      container.innerHTML = '<p class="error" style="color:#ff7777;text-align:center;padding:1rem">Failed to load featured.</p>'; 
    }
  }

  async function loadUsed(category=null){
    const container = document.querySelector('#used-grid');
    if(!container) return; container.innerHTML = '<p class="loading" style="text-align:center;padding:1rem">Loading pre-owned...</p>';
    try{
      const apiBase = (window.API_CONFIG && window.API_CONFIG.apiUrl) ? window.API_CONFIG.apiUrl.replace(/\/$/,'') : '';
      const apiUrl = apiBase ? `${apiBase}/get-products-v2.php` : 'api/get-products-v2.php';
      
      const params = new URLSearchParams({ condition:'Used', status:'active' }); 
      if(category) params.set('category', category);
      
      const res = await fetch(`${apiUrl}?`+params.toString());
      const json = await res.json();
      
      if (!json.success) {
        throw new Error(json.error || 'Failed to load used products');
      }
      
      const items = (json && json.products) || [];
      container.innerHTML = items.map(renderCard).join('');
      wireCart(container);
    }catch(e){ 
      console.error('Used products load error:', e);
      container.innerHTML = '<p class="error" style="color:#ff7777;text-align:center;padding:1rem">Failed to load pre-owned.</p>'; 
    }
  }

  function wireCart(container){
    container.querySelectorAll('.cart-btn').forEach(btn => {
      btn.addEventListener('click', async (e)=>{
        e.preventDefault(); e.stopPropagation();
        const product = {
          id: btn.dataset.productId,
          name: btn.dataset.name,
          title: btn.dataset.name,
          price: Number(btn.dataset.price||0),
          image: btn.dataset.image,
          sku: btn.dataset.sku || btn.dataset.productId,
          quantity: 1
        };
        const orig = btn.innerHTML; btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        try{
          if (window.CartManager && typeof window.CartManager.addItem === 'function') {
            await window.CartManager.addItem(product);
          } else {
            // Fallback to localStorage using unified key
            const KEY = 'oneclick_cart';
            const cart = JSON.parse(localStorage.getItem(KEY)||'[]');
            const ex = cart.find(i=> i.id===product.id || i.sku===product.sku);
            if (ex) ex.qty = (ex.qty||1) + 1; else cart.push({
              id: product.id,
              title: product.title || product.name || 'Product',
              price: product.price,
              image: product.image,
              qty: 1
            });
            localStorage.setItem(KEY, JSON.stringify(cart));
          }
          btn.innerHTML = '<i class="fas fa-check"></i> Added!';
        }catch(_){ btn.innerHTML = orig; }
        setTimeout(()=>{ btn.innerHTML = orig; btn.disabled=false; }, 1200);
      });
    });
  }

  // Auto-init on DOM ready
  document.addEventListener('DOMContentLoaded', ()=>{
    const cat = pageCategory();
    loadProducts(cat);
    // expose for manual refresh
    window.loadProducts = loadProducts;
  });

  // expose utilities
  window.ProductFeed = { loadProducts, loadFeatured, loadUsed };

  // Legacy compatibility layer for pages expecting ProductLoader/ProductRenderer (Firebase-era)
  if (!window.ProductLoader) {
    class LegacyProductLoader {
      async loadProducts(filters={}) {
        // Translate legacy filters to current approach
        const category = filters.category || null;
        const maxPrice = filters.maxPrice || null;
        const limitCount = filters.limitCount || 50;
        const brandFilter = filters.brands || filters.brand || null;

        try {
          const apiBase = (window.API_CONFIG && window.API_CONFIG.apiUrl) ? window.API_CONFIG.apiUrl.replace(/\/$/,'') : '';
          const apiUrl = apiBase ? `${apiBase}/get-products-v2.php` : 'api/get-products-v2.php';
          
          const params = new URLSearchParams({ status:'active' });
          if (category) params.set('category', category);
          
          const res = await fetch(`${apiUrl}?`+params.toString(), { credentials:'include' });
          const json = await res.json().catch(()=>({}));
          
          if (!json.success) {
            return { success:false, error: json.error || 'Load failed', products:[] };
          }
          
          let items = Array.isArray(json.products)?json.products:[];
          if (maxPrice) items = items.filter(p => Number(p.price||0) <= maxPrice);
          if (brandFilter && Array.isArray(brandFilter) && brandFilter.length) {
            items = items.filter(p => brandFilter.map(b=>String(b).toLowerCase()).includes(String(p.brand||'').toLowerCase()));
          }
          return { success:true, products: items.slice(0, limitCount) };
        } catch(e2){
          return { success:false, error:e2.message || 'Load failed', products:[] };
        }
      }
    }
    window.ProductLoader = LegacyProductLoader;
  }
  if (!window.ProductRenderer) {
    class LegacyProductRenderer {
      renderProductCard(p){ return renderCard(p); }
      renderProducts(arr, container){ if (!container) return; container.innerHTML = arr.map(renderCard).join(''); wireCart(container); }
      showLoading(id){ const el = document.getElementById(id) || containerFallback(); if(el) el.innerHTML = '<p style="text-align:center;padding:2rem;color:#999">Loading...</p>'; }
      showError(id,msg){ const el = document.getElementById(id) || containerFallback(); if(el) el.innerHTML = `<p style="text-align:center;padding:2rem;color:#ff7777">${msg||'Failed to load.'}</p>`; }
    }
    window.ProductRenderer = LegacyProductRenderer;
  }
})();
