import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, query, where, orderBy, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app = getApps().length ? getApp() : initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

async function loadOrders(u){
  const qref = query(collection(db, 'orders'), where('userId','==',u.uid), orderBy('createdAt','desc'));
  const snap = await getDocs(qref);
  const list = snap.docs.map(d=>({ id: d.id, ...d.data() }));
  render(list);
}

function render(orders){
  const root = document.getElementById('ordersRoot');
  root.innerHTML = orders.map(o=>`
    <div class="card p-4">
      <div class="flex justify-between">
        <div class="text-white">Order #${o.id}</div>
        <div class="text-${o.status==='paid'?'green':'yellow'}-400 capitalize">${o.status||'pending'}</div>
      </div>
      <div class="mt-2 text-gray-300">Items: ${o.items?.reduce((n,i)=>n+(i.qty||1),0)||0}</div>
      <div class="text-green-400">Total: Rs ${Number(o.total||0).toLocaleString()}</div>
      <div class="mt-2 flex gap-3">
        <a class="link" href="/order-success.html?id=${o.id}">View</a>
        <button class="btn btn-secondary" data-invoice="${o.id}">Download Invoice</button>
      </div>
    </div>
  `).join('') || '<div class="text-gray-400">No orders yet.</div>';

  // Attach invoice buttons
  root.querySelectorAll('[data-invoice]').forEach(btn=>{
    btn.addEventListener('click', ()=> downloadInvoice(btn.dataset.invoice));
  });
}

async function downloadInvoice(orderId){
  const snap = await getDoc(doc(db, 'orders', orderId));
  if(!snap.exists()) return alert('Order not found');
  const o = { id:snap.id, ...snap.data() };
  const { jsPDF } = window.jspdf || {};
  if(!jsPDF){
    alert('PDF generator not loaded');
    return;
  }
  const docPdf = new jsPDF();
  let y = 10;
  docPdf.setFontSize(14); docPdf.text(`Invoice #${o.id}`, 10, y); y+=8;
  docPdf.setFontSize(11);
  docPdf.text(`Date: ${new Date().toLocaleString()}`, 10, y); y+=8;
  docPdf.text(`Status: ${o.status||'pending'}`, 10, y); y+=10;
  docPdf.text('Items:', 10, y); y+=6;
  (o.items||[]).forEach(i=>{ docPdf.text(`${i.title||i.name}  x${i.qty||1}  - Rs ${Number(i.price||0).toLocaleString()}`, 12, y); y+=6; });
  y+=4; docPdf.setFontSize(12); docPdf.text(`Total: Rs ${Number(o.total||0).toLocaleString()}`, 10, y);
  docPdf.save(`invoice-${o.id}.pdf`);
}

function init(){
  onAuthStateChanged(auth, user=> {
    if(!user) return (location.href='/login.html?return=/orders.html');
    loadOrders(user);
  });
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
else init();
