// Admin-only database seeding using Firebase Modular SDK
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, setDoc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const config = window.FIREBASE_CONFIG;
const app = getApps().length ? getApp() : initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

// Dummy categories and products derived from current HTML structure
const categories = [
  { id: 'processors', name: 'Processor', slug: 'processor', parent: 'components', order: 10 },
  { id: 'motherboards', name: 'Motherboard', slug: 'motherboard', parent: 'components', order: 20 },
  { id: 'cpu-coolers', name: 'CPU Cooler', slug: 'cpu-cooler', parent: 'components', order: 30 },
  { id: 'ram', name: 'RAM', slug: 'ram', parent: 'components', order: 40 },
  { id: 'graphics-card', name: 'Graphics Card', slug: 'graphics-card', parent: 'components', order: 50 },
  { id: 'internal-ssd', name: 'Internal SSD', slug: 'internal-ssd', parent: 'storage', order: 60 },
  { id: 'hard-drive', name: 'Hard Drive', slug: 'hard-drive', parent: 'storage', order: 70 },
  { id: 'power-supply', name: 'Power Supply', slug: 'power-supply', parent: 'components', order: 80 },
  { id: 'cabinets', name: 'Cabinets', slug: 'cabinets', parent: 'components', order: 90 },
  { id: 'case-fans', name: 'Case Fans', slug: 'case-fans', parent: 'components', order: 100 },
  { id: 'monitors', name: 'Monitors', slug: 'monitors', parent: 'peripherals', order: 110, tags:['gaming','4k','ultrawide'] },
  { id: 'keyboard', name: 'Keyboard', slug: 'keyboard', parent: 'peripherals', order: 120 },
  { id: 'mouse', name: 'Mouse', slug: 'mouse', parent: 'peripherals', order: 130 },
  { id: 'mousepad', name: 'Mousepad', slug: 'mousepad', parent: 'peripherals', order: 140 },
  { id: 'headset', name: 'Headset', slug: 'headset', parent: 'peripherals', order: 150 },
  { id: 'controller', name: 'Controller', slug: 'controller', parent: 'peripherals', order: 160 },
  { id: 'printers', name: 'Printers', slug: 'printers', parent: 'printer', order: 170 },
  { id: 'custom-cables', name: 'Custom Cables', slug: 'custom-cables', parent: 'accessories', order: 180 },
  { id: 'ups', name: 'UPS', slug: 'ups', parent: 'accessories', order: 190 },
  { id: 'external-ssd', name: 'External SSD', slug: 'external-ssd', parent: 'storage', order: 200 },
  { id: 'power-strip', name: 'Power Strip', slug: 'power-strip', parent: 'accessories', order: 210 },
  { id: 'usb-devices', name: 'USB Devices', slug: 'usb-devices', parent: 'accessories', order: 220 },
  { id: 'vertical-gpu-bracket', name: 'Vertical GPU Bracket', slug: 'vertical-gpu-bracket', parent: 'accessories', order: 230 }
];

// Minimal product schema for demo
// Each product has categories: ["monitors"], subTags like ["gaming"|"4k"] to drive sections
const products = [
  {
    id: 'asus-rog-swift-pg279qm',
    title: 'ASUS ROG Swift PG279QM',
    price: 185000,
    oldPrice: 205000,
    brand: 'ASUS',
    stock: 'in-stock',
    categories: ['monitors'],
    tags: ['gaming'],
    specs: ['27" QHD IPS', '240Hz', '1ms', 'G-SYNC'],
    image: '/assets/img/pc-case.svg'
  },
  {
    id: 'lg-24gn650-b',
    title: 'LG 24GN650-B UltraGear',
    price: 68500,
    brand: 'LG',
    stock: 'in-stock',
    categories: ['monitors'],
    tags: ['gaming'],
    specs: ['24" FHD IPS', '144Hz', '1ms', 'FreeSync'],
    image: '/assets/img/pc-case.svg'
  },
  {
    id: 'samsung-odyssey-g7-c32g75t',
    title: 'Samsung Odyssey G7 C32G75T',
    price: 145000,
    brand: 'Samsung',
    stock: 'low-stock',
    categories: ['monitors'],
    tags: ['gaming'],
    specs: ['32" QHD VA', '240Hz', '1ms', '1000R Curve'],
    image: '/assets/img/pc-case.svg'
  },
  {
    id: 'dell-ultrasharp-u2723qe',
    title: 'Dell UltraSharp U2723QE',
    price: 235000,
    brand: 'Dell',
    stock: 'in-stock',
    categories: ['monitors'],
    tags: ['4k'],
    specs: ['27" 4K IPS Black', 'USB-C Hub'],
    image: '/assets/img/pc-case.svg'
  }
  ,
  // GPUs
  {
    id: 'nvidia-rtx-4090',
    title: 'NVIDIA RTX 4090',
    price: 450000,
    brand: 'NVIDIA',
    stock: 'in-stock',
    categories: ['graphics-card'],
    tags: ['nvidia'],
    specs: ['24GB GDDR6X', 'DLSS 3', 'Ray Tracing'],
    image: '/assets/img/pc-case.svg'
  },
  {
    id: 'nvidia-rtx-4080',
    title: 'NVIDIA RTX 4080',
    price: 320000,
    brand: 'NVIDIA',
    stock: 'in-stock',
    categories: ['graphics-card'],
    tags: ['nvidia'],
    specs: ['16GB GDDR6X', 'DLSS 3', 'Ray Tracing'],
    image: '/assets/img/pc-case.svg'
  },
  {
    id: 'amd-rx-7900-xtx',
    title: 'AMD Radeon RX 7900 XTX',
    price: 280000,
    brand: 'AMD',
    stock: 'in-stock',
    categories: ['graphics-card'],
    tags: ['amd'],
    specs: ['24GB GDDR6', 'FSR 3', 'RDNA 3'],
    image: '/assets/img/pc-case.svg'
  },
  // Printers
  {
    id: 'canon-pixma-g3730',
    title: 'Canon PIXMA G3730',
    price: 42500,
    brand: 'Canon',
    stock: 'in-stock',
    categories: ['printers'],
    tags: ['inkjet'],
    specs: ['Wireless AIO', 'Refillable Tank', 'Borderless'],
    image: '/assets/img/pc-case.svg'
  },
  {
    id: 'epson-ecotank-l3250',
    title: 'Epson EcoTank L3250',
    price: 39500,
    brand: 'Epson',
    stock: 'in-stock',
    categories: ['printers'],
    tags: ['inkjet'],
    specs: ['Wi-Fi', 'EcoTank'],
    image: '/assets/img/pc-case.svg'
  }
];

async function seedCategories(){
  const batch = writeBatch(db);
  const now = serverTimestamp();
  categories.forEach(c => {
    batch.set(doc(db, 'categories', c.id), { ...c, createdAt: now, updatedAt: now });
  });
  await batch.commit();
}

async function seedProducts(){
  const batch = writeBatch(db);
  const now = serverTimestamp();
  products.forEach(p => {
    batch.set(doc(db, 'products', p.id), { ...p, createdAt: now, updatedAt: now });
  });
  await batch.commit();
}

export async function runSeed(){
  return new Promise((resolve, reject)=>{
    onAuthStateChanged(auth, async (user)=>{
      if(!user){ reject(new Error('Sign in as admin to seed.')); return; }
      try{
        await seedCategories();
        await seedProducts();
        resolve({ ok: true });
      }catch(err){ reject(err); }
    });
  });
}

// If loaded directly on seed page, wire button
document.addEventListener('DOMContentLoaded', ()=>{
  const btn = document.getElementById('seedBtn');
  if(!btn) return;
  btn.addEventListener('click', async ()=>{
    btn.disabled = true; btn.textContent = 'Seeding...';
    const out = document.getElementById('seedOut');
    try{
      await runSeed();
      btn.textContent = 'Seeded ✔';
      out.textContent = 'Categories and products created.';
    }catch(err){
      btn.textContent = 'Seed Failed';
      out.textContent = err.message || String(err);
    }finally{ btn.disabled = false; }
  });
});
