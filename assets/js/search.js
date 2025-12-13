/**
 * ========================================
 * ENHANCED PRODUCT SEARCH SYSTEM (Supabase)
 * ========================================
 * Real-time product search across all categories
 * Searches: name, description, brand, tags, category
 * Supabase-based, no Firebase
 */

// Ensure Supabase client
async function ensureClient(){
  if (typeof window.ensureSupabase === 'function') return await window.ensureSupabase();
  await inject('assets/js/supabase-config.js');
  await inject('assets/js/supabase-init.js');
  return await window.ensureSupabase();
}
function inject(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('Fail '+src)); document.head.appendChild(s); }); }

let PRODUCTS = []; let isLoading = false;
function normalize(s){ return (s||'').toString().toLowerCase().trim(); }

function matches(p, q, cat){
  const fields = [p.name,p.title,p.description,p.brand,p.category, ...(Array.isArray(p.tags)?p.tags:[]) , JSON.stringify(p.specifications||{}), JSON.stringify(p.features||[])];
  const hay = fields.map(normalize).join(' ');
  const mq = !q || hay.includes(normalize(q));
  const mc = !cat || normalize(p.category)===normalize(cat);
  return mq && mc;
}

function grid(){ return document.querySelector('[data-products-grid]') || document.getElementById('product-grid') || document.querySelector('.product-grid'); }

function render(results, q=''){
  const g = grid(); if (!g) return;
  if (isLoading){ g.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;"><i class=\"fas fa-spinner fa-spin\" style=\"font-size:2rem;color:#e44d61\"></i><p style=\"color:#888\">Searching products...</p></div>`; return; }
  if (results.length===0 && q){ g.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;"><i class="fas fa-search" style="font-size:3rem;color:#555;margin-bottom:1rem;"></i><h3 style="color:#888;margin-bottom:.5rem;">No products found</h3><p style="color:#666;">Try different keywords</p><p style="color:#666;margin-top:1rem;">Searched for: "<strong>${q}</strong>"</p></div>`; return; }
  g.innerHTML = '';
  if (q && results.length>0){ const c=document.createElement('div'); c.style.cssText='grid-column:1/-1;margin-bottom:1rem;color:#888;'; c.innerHTML=`Found ${results.length} product${results.length!==1?'s':''} for "<strong>${q}</strong>"`; g.appendChild(c); }
  results.forEach(p=> g.insertAdjacentHTML('beforeend', card(p)));
}

function card(p){
  const price = Number(p.offer_price ?? p.price ?? 0);
  const base  = Number(p.price ?? price);
  const hasDisc = p.offer_price!=null && base>0 && price<base;
  const img = p.image_url || (Array.isArray(p.image_urls)&&p.image_urls[0]) || 'assets/img/placeholder.png';
  const stock = Number(p.stock||0);
  const out = stock<=0;
  return `
    <a class=\"card product-card\" href=\"product-details.html?id=${p.id}\" data-product-id=\"${p.id}\">\n      <div class=\"card-image\">\n        <img src=\"${img}\" alt=\"${p.name||'Product'}\" />\n        ${hasDisc?`<span class=\"badge-discount\">-${Math.round(((base-price)/base)*100)}%</span>`:''}\n        ${out?`<span class=\"badge-stock\">Out of Stock</span>`:''}\n      </div>\n      <div class=\"card-content\">\n        ${p.brand?`<div class=\"product-brand\">${p.brand}</div>`:''}\n        <h3 class=\"product-name\">${p.name||'Untitled Product'}</h3>\n        <div class=\"product-price\">\n          <span class=\"price-current\">Rs ${Number(price).toLocaleString()}</span>\n          ${hasDisc?`<span class=\"price-original\">Rs ${Number(base).toLocaleString()}</span>`:''}\n        </div>\n        ${p.category?`<div class=\"product-category\"><i class=\"fas fa-tag\"></i> ${p.category}</div>`:''}\n        <button class=\"btn-add-cart\" data-id=\"${p.id}\" data-title=\"${p.name||''}\" data-price=\"${price}\" data-image=\"${img}\"><i class=\"fas fa-shopping-cart\"></i> Add to Cart</button>\n      </div>\n    </a>`;
}

// Touch exports removed to avoid unused warnings
// if (!window.__searchInitTouched){ window.__searchInitTouched = true; window.__searchExports = {onSearch, loadProducts: fetchAll}; }

async function fetchAll(){
  isLoading = true; render([], '');
  const supabase = await ensureClient();
  // Fetch active products
  const { data, error } = await supabase.from('products').select('*').eq('status','active');
  if (error) { console.error('Search fetch error:', error); PRODUCTS=[]; isLoading=false; render([], ''); return; }
  PRODUCTS = Array.isArray(data)? data : [];
  isLoading = false; render(PRODUCTS, '');
}

function currentQuery(){
  // Prefer #searchInput; fallback to any search input
  const inputs = document.querySelectorAll('#searchInput, input[type="search"]');
  for (const i of inputs){ if (i.value && i.value.trim()) return i.value.trim(); }
  return '';
}

function onSearch(){
  const q = currentQuery();
  const category = document.getElementById('searchCategory')?.value || '';
  const results = PRODUCTS.filter(p => matches(p, q, category));
  render(results, q);
  if (q){ const url = new URL(location.href); url.searchParams.set('search', q); if (category) url.searchParams.set('category', category); history.replaceState({}, '', url); }
  const section = grid()?.closest('section'); if (section && q){ section.style.display = 'block'; section.scrollIntoView({behavior:'smooth', block:'start'}); }
}

function debounce(fn, delay){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(null,a), delay); }; }

async function initSearch(){
  await fetchAll();
  const inputs = document.querySelectorAll('#searchInput, input[type="search"]');
  const handler = debounce(onSearch, 300);
  inputs.forEach(input => {
    input.addEventListener('input', (e)=>{ const v = e.target.value; inputs.forEach(o=>{ if(o!==e.target) o.value=v; }); handler(); });
    input.addEventListener('keypress', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); onSearch(); } });
  });
  const categorySelect = document.getElementById('searchCategory'); if (categorySelect) categorySelect.addEventListener('change', onSearch);
  const searchButtons = document.querySelectorAll('button[type="submit"], .search button'); searchButtons.forEach(btn=> btn.addEventListener('click', (e)=>{ e.preventDefault(); onSearch(); }));

  // Initial search from URL
  const urlParams = new URLSearchParams(location.search); const initial = urlParams.get('search'); if (initial){ inputs.forEach(i=> i.value = initial); onSearch(); }
}

// Expose for other modules
window.onSearch = onSearch; // compatibility for search-init.js

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSearch); else initSearch();
