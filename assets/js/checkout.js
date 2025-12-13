// Checkout flow using Firebase v9+ Modular SDK and PayHere sandbox
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const cfg = window.FIREBASE_CONFIG;
const app = getApps().length ? getApp() : initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);

const fmt = (v)=> new Intl.NumberFormat('en-LK', { style:'currency', currency:'LKR', maximumFractionDigits:0 }).format(Number(v)||0);

function readLS(key){ try { return JSON.parse(localStorage.getItem(key)||'[]'); } catch { return []; } }
function writeLS(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

async function getCart(){
  return new Promise(resolve=>{
    onAuthStateChanged(auth, async (u)=>{
      if(!u){
        resolve(readLS('oc_cart'));
        return;
      }
      const ref = doc(db, 'carts', u.uid);
      const snap = await getDoc(ref);
      resolve(snap.exists()? (snap.data().items||[]) : []);
    }, { once:true });
  });
}

function renderSummary(items){
  const wrap = document.getElementById('summaryItems');
  if(!wrap) return;
  if(!items.length){ wrap.innerHTML = '<div class="note">Your cart is empty.</div>'; }
  else {
    wrap.innerHTML = items.map(i=> `
      <div class="row" style="justify-content:space-between">
        <div>${i.title} × ${i.qty||1}</div>
        <div>${fmt((i.price||0)*(i.qty||1))}</div>
      </div>`).join('');
  }
  const total = items.reduce((n,i)=> n + (Number(i.price||0)*Number(i.qty||1)), 0);
  document.getElementById('summaryTotal').textContent = fmt(total);
  return total;
}

function setLoading(loading){
  const btn = document.getElementById('placeOrderBtn');
  if(!btn) return;
  btn.disabled = !!loading; btn.classList.toggle('loading', !!loading);
  btn.textContent = loading ? 'Processing…' : 'Place Order';
}

function showError(msg){
  const el = document.getElementById('formError');
  if(!el) return; el.style.display='block'; el.textContent = msg;
}

function guardAuth(){
  return new Promise((resolve)=>{
    onAuthStateChanged(auth, (u)=>{
      if(u) return resolve(u);
      try{ sessionStorage.setItem('postLoginRedirect', location.pathname + location.search); }catch{}
      location.href = '/login.html?reason=checkout';
    }, { once:true });
  });
}

async function createOrder({ user, items, total, method, address }){
  // PHP Backend API URL
  const PHP_API_URL = 'https://YOUR-EC2-IP/api'; // Replace YOUR-EC2-IP with actual EC2 public IP or domain
  const USE_PHP_BACKEND = true; // Set to true to use PHP backend
  
  try {
    if (USE_PHP_BACKEND) {
      // Create order via PHP Backend
      const response = await fetch(`${PHP_API_URL}/create-order.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_name: address.name,
          customer_email: user.email || address.email,
          customer_phone: address.phone,
          shipping_address: `${address.address}, ${address.city}`,
          items: items.map(i => ({
            product_id: i.id,
            quantity: i.qty || 1,
            price: Number(i.price || 0)
          })),
          total_amount: Number(total || 0),
          payment_method: method
        })
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to create order');
      }
      
      return { 
        id: result.order_id, 
        status: method === 'payhere' ? 'payment_pending' : 'paid',
        total: total
      };
    } else {
      // Fallback to Firestore
      const payload = {
        userId: user.uid,
        userEmail: user.email || null,
        items: items.map(i=>({ id:i.id, title:i.title, price:Number(i.price||0), qty:Number(i.qty||1), image:i.image||'' })),
        address: { name: address.name, email: address.email, phone: address.phone, city: address.city, line1: address.address },
        total: Number(total||0),
        payment: { method },
        status: method === 'payhere' ? 'payment_pending' : 'paid',
        createdAt: serverTimestamp()
      };
      const ref = await addDoc(collection(db, 'orders'), payload);
      return { id: ref.id, ...payload };
    }
  } catch (error) {
    console.error('Order creation error:', error);
    showError('Failed to create order: ' + error.message);
    throw error;
  }
}

async function clearCart(user){
  if(user){ await setDoc(doc(db, 'carts', user.uid), { items: [] }, { merge:true }); }
  else { writeLS('oc_cart', []); }
}

function initPayHere(order){
  // PayHere sandbox credentials
  // NOTE: Replace with your sandbox merchant id in firebase-config or env; demo here uses placeholders
  const merchantId = (window.PAYHERE && window.PAYHERE.MERCHANT_ID) || '1211149'; // example sandbox id
  const amount = order.total;
  const itemTitle = `Order ${order.id}`;

  const payment = {
    sandbox: true,
    merchant_id: merchantId,
    return_url: `${location.origin}/order-success.html?id=${order.id}`,
    cancel_url: `${location.origin}/checkout.html?cancelled=1` ,
    notify_url: `${location.origin}/payhere-notify`, // optional endpoint if you have a backend
    order_id: order.id,
    items: itemTitle,
    amount: amount,
    currency: 'LKR',
    first_name: order.address?.name?.split(' ')?.[0] || 'Customer',
    last_name: order.address?.name?.split(' ')?.slice(1).join(' ') || 'One',
    email: order.address?.email || 'customer@example.com',
    phone: order.address?.phone || '0700000000',
    address: order.address?.line1 || 'Address',
    city: order.address?.city || 'City',
    country: 'Sri Lanka'
  };

  // Callbacks
  window.payhere.onCompleted = async function onCompleted(orderId){
    try{
      await setDoc(doc(db, 'orders', order.id), { status:'paid', paidAt: serverTimestamp() }, { merge:true });
      location.href = `/order-success.html?id=${order.id}`;
    }catch(e){ console.error('Failed to mark paid', e); }
  };
  window.payhere.onDismissed = function onDismissed(){
    // user closed the modal; keep status as pending
    setLoading(false);
  };
  window.payhere.onError = async function onError(err){
    console.error('PayHere error', err);
    showError('Payment failed. Please try again or choose Cash on Delivery.');
    try{ await setDoc(doc(db, 'orders', order.id), { status:'payment_failed', error: String(err) }, { merge:true }); }catch{}
    setLoading(false);
  };

  window.payhere.startPayment(payment);
}

function readForm(){
  const form = document.getElementById('checkoutForm');
  const data = new FormData(form);
  const name = (data.get('name')||'').toString().trim();
  const email = (data.get('email')||'').toString().trim();
  const phone = (data.get('phone')||'').toString().trim();
  const address = (data.get('address')||'').toString().trim();
  const city = (data.get('city')||'').toString().trim();
  const payment = (data.get('payment')||'cod').toString();
  if(!name || !email || !phone || !address || !city){ throw new Error('Please fill all required fields.'); }
  return { name, email, phone, address, city, payment };
}

async function main(){
  const user = await guardAuth();
  // Prefill email
  const email = document.getElementById('email');
  if(email && user?.email) email.value = user.email;
  // Load cart
  const items = await getCart();
  const total = renderSummary(items);
  // Submit
  document.getElementById('checkoutForm').addEventListener('submit', async (e)=>{
    e.preventDefault(); showError(''); setLoading(true);
    try{
      const f = readForm();
      const order = await createOrder({ user, items, total, method: f.payment === 'payhere' ? 'payhere' : 'cod', address: f });
      if(f.payment === 'payhere'){
        initPayHere(order);
      } else {
        // COD flow
        await clearCart(user);
        location.href = `/order-success.html?id=${order.id}`;
      }
    }catch(err){ showError(err.message||'Unable to place order.'); setLoading(false); }
  });
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', main);
} else { main(); }
