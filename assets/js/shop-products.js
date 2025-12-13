import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Prefer central config if present
const fromConfig = window?.SUPABASE_CONFIG || {};
const SUPABASE_URL = fromConfig.url || "https://pvnlavcuswjxhywbsodm.supabase.co";
const SUPABASE_ANON_KEY = fromConfig.anonKey || ""; // if empty, we'll fallback to PHP

const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function cardHtml(p) {
  const price = Number(p.offer_price ?? p.price ?? 0);
  const base = Number(p.price ?? price);
  const hasDiscount = p.offer_price != null && !isNaN(base) && base > price;
  return `
    <article class="p-card" data-product-id="${p.id}" onclick="window.location.href='product-details.html?id=${p.id}'">
      <a class="media" href="product-details.html?id=${p.id}">
        ${hasDiscount ? `<span class=\"discount-badge\">-${Math.round(((base-price)/base)*100)}%</span>` : ''}
        <img src="${p.image_url || 'assets/img/placeholder.png'}" alt="${p.name}" loading="lazy"/>
      </a>
      <div class="body">
        <a class="title" href="product-details.html?id=${p.id}">${p.name}</a>
        <div class="meta">${p.description ? (p.description.length>60?p.description.slice(0,57)+'...':p.description) : (p.category||'View details')}</div>
        <div class="price">
          ${hasDiscount ? `<span class=\"old\">Rs ${base.toLocaleString()}</span>` : ''}
          <span class="now">Rs ${price.toLocaleString()}</span>
        </div>
        <div class="cta">
          <button class="btn small" onclick="window.location.href='product-details.html?id=${p.id}'">View</button>
          <button class="btn small cart-btn" 
                  data-product-id="${p.id}"
                  data-name="${p.name}"
                  data-price="${price}"
                  data-image="${p.image_url || ''}"
                  data-sku="${p.sku || p.id}">
            <i class="fas fa-shopping-cart"></i> Add to Cart
          </button>
        </div>
      </div>
    </article>`;
}

function wireCartButtons(container){
  container.querySelectorAll('.cart-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();
      const data = {
        id: btn.dataset.productId,
        name: btn.dataset.name,
        price: Number(btn.dataset.price||0),
        image: btn.dataset.image,
        sku: btn.dataset.sku || btn.dataset.productId,
        quantity: 1
      };
      const original = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
      try{
        const cart = JSON.parse(localStorage.getItem('cart')||'[]');
        const existing = cart.find(i=>i.id===data.id||i.sku===data.sku);
        if(existing){ existing.quantity=(existing.quantity||1)+1; }
        else { cart.push(data); }
        localStorage.setItem('cart', JSON.stringify(cart));
        btn.innerHTML = '<i class="fas fa-check"></i> Added!';
        setTimeout(()=>{ btn.innerHTML = original; btn.disabled = false; }, 1200);
      }catch(err){
        console.error('Cart error', err);
        btn.innerHTML = original; btn.disabled = false;
      }
    });
  });
}

async function phpFallback(container){
  try{
    const res = await fetch('api/get-products.php?active=1');
    const json = await res.json();
    const items = Array.isArray(json.products) ? json.products : [];
    if (items.length === 0) {
      container.innerHTML = `<p class="empty">No products found.</p>`;
      return;
    }
    container.innerHTML = items.map(cardHtml).join('');
    wireCartButtons(container);
  }catch(e){
    console.error('PHP fallback error:', e);
    container.innerHTML = `<p class="error">⚠️ Unable to load products.</p>`;
  }
}

async function loadAllProducts() {
  const container = document.getElementById('product-list');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center;padding:2rem;">
    <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:#00d4ff"></i>
    <p style="color:#999">Loading products...</p>
  </div>`;

  // Try Supabase when configured; else PHP
  if (!supabase) { await phpFallback(container); return; }

  try{
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!products || products.length === 0) {
      // fallback to PHP API
      await phpFallback(container);
      return;
    }

    container.innerHTML = products.map(cardHtml).join('');
    wireCartButtons(container);
  }catch(err){
    console.warn('Supabase failed, using PHP fallback:', err);
    await phpFallback(container);
  }
}

// Initial load
document.addEventListener('DOMContentLoaded', loadAllProducts);

// Realtime updates (optional)
try {
  if (supabase) {
    supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadAllProducts();
      })
      .subscribe();
  }
} catch (_) {}
