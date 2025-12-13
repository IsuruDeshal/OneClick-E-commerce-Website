// Frontend data loader using Supabase
// This replaces Firebase with Supabase REST API

const SUPABASE_URL = 'https://pvnlavcuswjxhywbsodm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bmxhdmN1c3dqeGh5d2Jzb2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNTkyOTYsImV4cCI6MjA3NzczNTI5Nn0.pddR-mTtvaELNeK_F1HDwZfjs29xj__k9z-WFOqZbFA';

let CACHED_CATEGORIES = [];

async function fetchCategories(){
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/categories?select=*&order=display_order`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    if (response.ok) {
      CACHED_CATEGORIES = await response.json();
    }
  } catch (err) {
    console.warn('Failed to fetch categories:', err);
  }
  return CACHED_CATEGORIES;
}

async function fetchProductsByCategory(cat, tag){
  try {
    let url = `${SUPABASE_URL}/rest/v1/products?select=*&status=eq.active&category=eq.${encodeURIComponent(cat)}`;
    if (tag) {
      url += `&tags=cs.{"${tag}"}`;
    }
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json'
      }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn(`Failed to fetch products for ${cat}:`, err);
  }
  return [];
}

function renderMega(categories){
  // Render basic mega links for top-level categories into elements with [data-mega-dynamic]
  document.querySelectorAll('[data-mega-dynamic]')?.forEach(container =>{
    container.innerHTML = '';
    categories.forEach(c =>{
      const a = document.createElement('a');
      a.className = 'mega-link';
      a.href = `/${c.slug}.html`;
      a.textContent = c.name;
      container.appendChild(a);
    });
  });
}

function productCard(p){
  const price = new Intl.NumberFormat('en-LK', { style:'currency', currency:'LKR', maximumFractionDigits:0 }).format(p.price || 0);
  const old = p.offer_price && p.offer_price < p.price ? `<span class="old">${new Intl.NumberFormat('en-LK', { style:'currency', currency:'LKR', maximumFractionDigits:0 }).format(p.offer_price)}</span>` : '';
  const stockClass = p.stock > 10 ? 'in-stock' : (p.stock > 0 ? 'low-stock' : 'out-stock');
  return `
    <article class="p-card" data-category="${(p.category||'').toLowerCase()}" data-brand="${(p.brand||'').toLowerCase()}">
      <a href="/product-details.html?id=${p.id}" class="media">
        <span class="stock-badge ${stockClass}">${p.stock > 10 ? 'In Stock' : (p.stock > 0 ? 'Low Stock' : 'Out of Stock')}</span>
        <img src="${p.image_url || '/assets/img/placeholder.png'}" alt="${p.name}">
      </a>
      <div class="body">
        <a class="title" href="/product-details.html?id=${p.id}">${p.name}</a>
        <div class="meta">${p.category || ''}</div>
        <div class="price"><span class="now">${price}</span> ${old}</div>
        <div class="cta">
          <a class="btn small" href="/product-details.html?id=${p.id}">View</a>
          <button class="btn small cart-btn" data-add-to-cart data-id="${p.id}" data-title="${p.title}" data-price="${p.price}" data-image="${p.image||''}">🛒 Add to Cart</button>
          <button class="btn small" data-toggle-wishlist data-id="${p.id}" data-title="${p.title}" data-price="${p.price}" data-image="${p.image||''}">❤ Wishlist</button>
        </div>
      </div>
    </article>`;
}

async function hydrateSections(){
  // Declarative containers: <div data-products cat="monitors" tag="gaming"></div>
  const containers = document.querySelectorAll('[data-products]');
  for(const el of containers){
    const cat = el.getAttribute('cat');
    const tag = el.getAttribute('tag');
    const items = await fetchProductsByCategory(cat, tag);
    el.innerHTML = items.map(productCard).join('');
  }
}

function slugFromPath(){
  const path = (location.pathname || '').split('/').pop() || '';
  const slug = path.toLowerCase().replace(/\.html$/, '');
  return slug;
}

async function hydrateByPageSlug(){
  const hasExplicit = document.querySelector('[data-products]');
  if (hasExplicit) return; // explicit sections already handled
  const slug = slugFromPath();
  if (!slug || slug === 'index') return;
  const cat = CACHED_CATEGORIES.find(c => c.slug === slug || c.id === slug);
  if (!cat) return;
  const grids = document.querySelectorAll('.product-grid-vertical');
  if (!grids.length) return;
  const items = await fetchProductsByCategory(cat.id, null);
  const html = items.map(productCard).join('');
  grids.forEach(g => { g.innerHTML = html; });
}

async function main(){
  try{
    const cats = await fetchCategories();
    renderMega(cats);
    await hydrateSections();
    await hydrateByPageSlug();
  }catch(err){ console.error('Catalog load failed', err); }
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', main);
} else { main(); }
