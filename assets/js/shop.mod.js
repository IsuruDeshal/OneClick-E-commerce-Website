// Modular Firebase shopping helpers: cart, wishlist, and order creation
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const cfg = window.FIREBASE_CONFIG;
const app = getApps().length ? getApp() : initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);

const CART_KEY = 'oc_cart';
const WISHLIST_KEY = 'oc_wishlist';

function readLS(key){ try { return JSON.parse(localStorage.getItem(key)||'[]'); } catch { return []; } }
function writeLS(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

async function getUser(){ return new Promise(resolve => onAuthStateChanged(auth, u => resolve(u), { once:true })); }

// CART
export async function addToCart(product){
  const user = await getUser();
  if(!user){
    const cart = readLS(CART_KEY);
    const idx = cart.findIndex(i => i.id === product.id);
    if(idx>=0) cart[idx].qty += 1; else cart.push({ id: product.id, title: product.title, price: product.price, image: product.image, qty:1 });
    writeLS(CART_KEY, cart);
    updateCartBadge(cart.reduce((n,i)=>n+i.qty,0));
    return;
  }
  const ref = doc(db, 'carts', user.uid);
  const snap = await getDoc(ref);
  const items = snap.exists() ? (snap.data().items || []) : [];
  const idx = items.findIndex(i => i.id === product.id);
  if(idx>=0) items[idx].qty += 1; else items.push({ id: product.id, title: product.title, price: product.price, image: product.image, qty:1 });
  await setDoc(ref, { items }, { merge:true });
  updateCartBadge(items.reduce((n,i)=>n+i.qty,0));
}

export async function removeFromCart(productId){
  const user = await getUser();
  if(!user){
    const cart = readLS(CART_KEY).filter(i => i.id !== productId);
    writeLS(CART_KEY, cart);
    updateCartBadge(cart.reduce((n,i)=>n+i.qty,0));
    return;
  }
  const ref = doc(db, 'carts', user.uid);
  const snap = await getDoc(ref);
  const items = (snap.exists()? snap.data().items : []).filter(i => i.id !== productId);
  await setDoc(ref, { items }, { merge:true });
  updateCartBadge(items.reduce((n,i)=>n+i.qty,0));
}

export async function readCart(){
  const user = await getUser();
  if(!user) return readLS(CART_KEY);
  const ref = doc(db, 'carts', user.uid);
  const snap = await getDoc(ref);
  return (snap.exists()? snap.data().items : []);
}

function updateCartBadge(count){
  document.querySelectorAll('.icon-btn[title="Cart"] .badge').forEach(b => b.textContent = String(count||0));
}

// WISHLIST
export async function toggleWishlist(product){
  const user = await getUser();
  if(!user){
    const list = readLS(WISHLIST_KEY);
    const exists = list.some(i => i.id === product.id);
    const next = exists ? list.filter(i => i.id !== product.id) : list.concat([{ id: product.id, title: product.title, price: product.price, image: product.image }]);
    writeLS(WISHLIST_KEY, next);
    return !exists;
  }
  const ref = doc(db, 'wishlists', user.uid);
  const snap = await getDoc(ref);
  const items = snap.exists()? (snap.data().items||[]) : [];
  const exists = items.some(i => i.id === product.id);
  const next = exists ? items.filter(i => i.id !== product.id) : items.concat([{ id: product.id, title: product.title, price: product.price, image: product.image }]);
  await setDoc(ref, { items: next }, { merge:true });
  return !exists;
}

export async function readWishlist(){
  const user = await getUser();
  if(!user) return readLS(WISHLIST_KEY);
  const ref = doc(db, 'wishlists', user.uid);
  const snap = await getDoc(ref);
  return snap.exists()? (snap.data().items||[]) : [];
}

// ORDERS
export async function placeOrder({ items, total, address, payment }){
  // Require login for checkout to satisfy Firestore security rules
  const user = await getUser();
  if(!user){
    try{
      // Remember where to return after login
      sessionStorage.setItem('postLoginRedirect', location.pathname + location.search);
    }catch{}
    // Redirect to login page; user will return and retry
    location.href = '/login.html?reason=checkout';
    return;
  }
  if(!Array.isArray(items) || items.length === 0){
    alert('Your cart is empty.');
    return;
  }
  const ordersRef = collection(db, 'orders');
  const res = await addDoc(ordersRef, {
    userId: user.uid,
    items, total, address, payment,
    status: 'paid', createdAt: serverTimestamp()
  });
  // Clear cart in Firestore and update badge
  await setDoc(doc(db, 'carts', user.uid), { items: [] }, { merge:true });
  updateCartBadge(0);
  // Redirect to success
  const params = new URLSearchParams({ id: res.id });
  location.href = `/order-success.html?${params.toString()}`;
}

// Wiring reusable buttons across the site
function wireGlobalButtons(){
  document.addEventListener('click', async (e)=>{
    const addBtn = e.target.closest('[data-add-to-cart]');
    if(addBtn){
      e.preventDefault();
      const payload = addBtn.dataset.payload ? JSON.parse(addBtn.dataset.payload) : { id: addBtn.dataset.id, title: addBtn.dataset.title, price: Number(addBtn.dataset.price||0), image: addBtn.dataset.image||'' };
      await addToCart(payload);
      return;
    }
    const wishBtn = e.target.closest('[data-toggle-wishlist]');
    if(wishBtn){
      e.preventDefault();
      const payload = wishBtn.dataset.payload ? JSON.parse(wishBtn.dataset.payload) : { id: wishBtn.dataset.id, title: wishBtn.dataset.title, price: Number(wishBtn.dataset.price||0), image: wishBtn.dataset.image||'' };
      const fav = await toggleWishlist(payload);
      wishBtn.classList.toggle('active', !!fav);
      return;
    }
  });
}

async function initBadges(){
  const items = await readCart();
  updateCartBadge(items.reduce((n,i)=>n+i.qty,0));
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', ()=>{ wireGlobalButtons(); initBadges(); });
} else { wireGlobalButtons(); initBadges(); }
