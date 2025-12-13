import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { addToCart, toggleWishlist } from '/assets/js/shop.mod.js';

const cfg = window.FIREBASE_CONFIG;
const app = getApps().length ? getApp() : initializeApp(cfg);
const db = getFirestore(app);

async function loadProduct() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const elLoading = document.getElementById('loading');
  const elError = document.getElementById('error');
  const elProduct = document.getElementById('product');

  if (!id) {
    elLoading?.classList.add('hidden');
    if(elError){ elError.textContent = 'Missing product id'; elError.classList.remove('hidden'); }
    return;
  }

  try {
    const snap = await getDoc(doc(db, 'products', id));
    if (!snap.exists()) throw new Error('Product not found');
    const p = { id: snap.id, ...snap.data() };

    document.getElementById('title').textContent = p.title || p.name || 'Untitled';
    document.getElementById('price').textContent = p.price ? `Rs ${Number(p.price).toLocaleString()}` : '';
    const mainImage = document.getElementById('mainImage');
    const images = Array.isArray(p.images) && p.images.length ? p.images : [p.image].filter(Boolean);
    mainImage.src = images[0] || '/assets/img/placeholder.png';
    mainImage.alt = p.title || 'Product';

    const thumbs = document.getElementById('thumbs');
    thumbs.innerHTML = '';
    images.slice(0,4).forEach((src, i) => {
      const img = document.createElement('img');
      img.src = src; img.alt = `Image ${i+1}`;
      img.className = 'h-20 w-20 rounded object-cover cursor-pointer ring-1 ring-gray-700';
      img.addEventListener('click', ()=>{ mainImage.src = src; });
      thumbs.appendChild(img);
    });

    const specs = document.getElementById('specs');
    specs.innerHTML = '';
    const entries = Array.isArray(p.specs)
      ? p.specs.map(s => [s.label || s.key, s.value])
      : Object.entries(p.specs || {});
    entries.slice(0, 12).forEach(([k, v]) => {
      const row = document.createElement('div');
      row.innerHTML = `<span class="text-gray-400">${k}:</span> <span>${v}</span>`;
      specs.appendChild(row);
    });

    const payload = { id: p.id, title: p.title, price: Number(p.price||0), image: images[0]||'' };
    document.getElementById('btnAddToCart').addEventListener('click', ()=> addToCart(payload));
    document.getElementById('btnWishlist').addEventListener('click', async (e)=>{
      const active = await toggleWishlist(payload);
      e.currentTarget.classList.toggle('active', !!active);
    });

    elLoading?.classList.add('hidden');
    elProduct?.classList.remove('hidden');
    document.title = `${p.title} • One Computers`;
  } catch (err) {
    elLoading?.classList.add('hidden');
    if(elError){ elError.textContent = err.message || 'Unable to load product'; elError.classList.remove('hidden'); }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadProduct);
} else loadProduct();
